"""Independently compare stored XLSX field evidence to original XML cells."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import zipfile
import xml.etree.ElementTree as ET

APP = Path(__file__).resolve().parents[2]
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook-root", type=Path, default=APP.parent)
    args = parser.parse_args()
    data = json.loads((APP / "data/task03/workbooks/workbook-samples.json").read_text(encoding="utf-8"))
    assert data["publication_status"] == "NOT_PUBLISHED" and data["human_review_performed"] is False
    checked, seen = 0, set()
    for source in data["inputs"]:
        path = args.workbook_root / source["path"]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == source["sha256"], path.name
        expectations = {}
        for record in data["records"]:
            if record["source"]["workbook_sha256"] != source["sha256"]:
                continue
            assert record["sample_id"] not in seen
            seen.add(record["sample_id"])
            assert record["publication_status"] == "VALIDATED_NOT_VERIFIED"
            assert record["human_review_status"] == "PENDING"
            assert record["source"]["worksheet"] == source["selected_sheet"]
            evidence = list(record["field_evidence"].values())
            for h in record["historical_observations"]:
                assert h["historical_track"] is None and h["historical_batch"] is None
                assert h["score_basis"] is None and h["comparability"] == "NOT_ESTABLISHED"
                evidence.extend(h["evidence"].values())
            for cell in evidence:
                if cell is None:
                    continue
                ref = cell.get("merged_anchor", cell["cell"])
                expected = (cell["raw_value"], cell["cell_type"], cell["formula"], cell["value"])
                if ref in expectations:
                    assert expectations[ref] == expected, ref
                expectations[ref] = expected
        matched = set()
        with zipfile.ZipFile(path) as book:
            shared = []
            if "xl/sharedStrings.xml" in book.namelist():
                with book.open("xl/sharedStrings.xml") as stream:
                    for _, item in ET.iterparse(stream, events=("end",)):
                        if item.tag == NS + "si":
                            shared.append("".join(n.text or "" for n in item.iter(NS + "t")))
                            item.clear()
            # Resolve relationships independently, instead of trusting the stored member path.
            rns = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
            relationships = {e.get("Id"): e.get("Target") for e in ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))}
            sheet = next(s for s in ET.fromstring(book.read("xl/workbook.xml")).findall(NS + "sheets/" + NS + "sheet") if s.get("name") == source["selected_sheet"])
            target = relationships[sheet.get(rns + "id")]
            member = target.lstrip("/") if target.startswith("/") else "xl/" + target
            with book.open(member) as stream:
                for _, el in ET.iterparse(stream, events=("end",)):
                    if el.tag == NS + "c" and el.get("r") in expectations:
                        ref = el.get("r")
                        value, formula = el.find(NS + "v"), el.find(NS + "f")
                        raw = value.text if value is not None else None
                        kind = el.get("t", "n")
                        decoded = shared[int(raw)] if kind == "s" and raw is not None else "".join(n.text or "" for n in el.iter(NS + "t")) if kind == "inlineStr" else raw
                        actual = (raw, kind, None if formula is None else (formula.text or ""), decoded)
                        assert actual == expectations[ref], f"{path.name}:{ref}"
                        matched.add(ref)
                    elif el.tag == NS + "row":
                        el.clear()
                        if len(matched) == len(expectations):
                            break
            assert matched == expectations.keys(), "Missing original evidence cells"
            checked += len(matched)
    assert len(seen) == len(data["records"])
    print(json.dumps({"status": "passed", "workbooks_hashed": len(data["inputs"]), "samples": len(seen),
        "original_cells_compared": checked, "human_verified": 0, "published": 0}, ensure_ascii=False))


if __name__ == "__main__":
    main()
