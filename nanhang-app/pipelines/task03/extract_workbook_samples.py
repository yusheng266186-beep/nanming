"""Read-only XLSX intake. No OCR, network, Excel execution, or publication.

Source paths are relative to --workbook-root. Output is an explicitly bounded,
unverified development sample, never a data-release manifest.
"""
from pathlib import Path, PurePosixPath
import argparse
import collections
from bisect import bisect_right
import hashlib
import json
import math
import posixpath
import re
import zipfile
import xml.etree.ElementTree as ET

APP = Path(__file__).resolve().parents[2]
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
INPUTS = [
    ("PHYSICS", "物理", "物理类 四川2026年高考填报数据招生考试报+近三年22-25年历史录取数据.xlsx"),
    ("HISTORY", "历史", "历史类 四川2026年高考填报数据招生考试报+近三年22-25年历史录取数据.xlsx"),
]
PLAN = {
    "institution_code": "院校代码", "institution_name": "院校名称",
    "group_code": "专业组代码", "major_code": "专业代码", "major_name": "专业名称",
    "batch_source": "批次", "admission_type_source": "计划类别", "region": "所在省",
    "subject_requirement_source": "选科要求", "degree_level_source": "专业层次",
    "plan_count": "26计划人数", "tuition_source": "26学费", "study_years": "26学制",
    "group_plan_count": "26专业组计划人数", "major_notes": "专业备注", "other_notes": "其他备注",
}
NUMBERS = {"plan_count", "tuition_source", "study_years", "group_plan_count"}


def sha(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for data in iter(lambda: f.read(1024 * 1024), b""):
            h.update(data)
    return h.hexdigest()


def coordinate(ref):
    m = re.fullmatch(r"([A-Z]+)([1-9][0-9]*)", ref)
    if not m:
        raise ValueError(f"Invalid cell reference: {ref}")
    col = 0
    for c in m[1]:
        col = col * 26 + ord(c) - 64
    return col, int(m[2])


class Workbook:
    def __init__(self, path):
        self.path = path
        self.archive = zipfile.ZipFile(path)
        self.strings = []
        if "xl/sharedStrings.xml" in self.archive.namelist():
            with self.archive.open("xl/sharedStrings.xml") as f:
                for _, el in ET.iterparse(f, events=("end",)):
                    if el.tag == NS + "si":
                        self.strings.append("".join(t.text or "" for t in el.iter(NS + "t")))
                        el.clear()
        relations = {r.get("Id"): r for r in ET.fromstring(self.archive.read("xl/_rels/workbook.xml.rels"))}
        self.sheets = {}
        for sheet in ET.fromstring(self.archive.read("xl/workbook.xml")).findall(NS + "sheets/" + NS + "sheet"):
            relation = relations[sheet.get(REL + "id")]
            if relation.get("TargetMode") == "External":
                raise ValueError("External worksheet relationship is unsupported")
            target = relation.get("Target")
            member = posixpath.normpath(target.lstrip("/") if target.startswith("/") else "xl/" + target)
            if not member.startswith("xl/") or ".." in PurePosixPath(member).parts:
                raise ValueError("Worksheet path escapes workbook")
            self.sheets[sheet.get("name")] = {"member": member, "state": sheet.get("state", "visible")}
        self.formats = []
        if "xl/styles.xml" in self.archive.namelist():
            styles = ET.fromstring(self.archive.read("xl/styles.xml"))
            custom = {n.get("numFmtId"): n.get("formatCode") for n in styles.findall(NS + "numFmts/" + NS + "numFmt")}
            self.formats = [custom.get(x.get("numFmtId"), x.get("numFmtId")) for x in styles.findall(NS + "cellXfs/" + NS + "xf")]

    def close(self):
        self.archive.close()

    def cell(self, el):
        v = el.find(NS + "v")
        raw = v.text if v is not None else None
        kind = el.get("t", "n")
        value = raw
        if kind == "s" and raw is not None:
            value = self.strings[int(raw)]
        elif kind == "inlineStr":
            value = "".join(t.text or "" for t in el.iter(NS + "t"))
        formula = el.find(NS + "f")
        return {"cell": el.get("r"), "value": value, "raw_value": raw, "cell_type": kind,
                "formula": None if formula is None else (formula.text or ""),
                "number_format": self.formats[int(el.get("s", "0"))] if self.formats else None}

    def layout(self, name):
        merges, formulas, rows = [], 0, 0
        with self.archive.open(self.sheets[name]["member"]) as f:
            for _, el in ET.iterparse(f, events=("end",)):
                if el.tag == NS + "row":
                    rows += 1
                    formulas += len(el.findall(NS + "c/" + NS + "f"))
                    el.clear()
                elif el.tag == NS + "mergeCell":
                    merges.append(el.get("ref"))
        return {"name": name, **self.sheets[name], "xml_rows": rows, "formula_cells": formulas, "merged_ranges": merges}

    def rows(self, name):
        with self.archive.open(self.sheets[name]["member"]) as f:
            for _, el in ET.iterparse(f, events=("end",)):
                if el.tag == NS + "row":
                    row = {re.match(r"[A-Z]+", c.get("r"))[0]: self.cell(c) for c in el.findall(NS + "c")}
                    number = int(el.get("r"))
                    el.clear()
                    yield number, row


def text(cell):
    if not cell or cell["formula"] is not None or cell["cell_type"] == "e":
        return None
    value = cell["value"]
    if value is None or not str(value).strip():
        return None
    return str(value).strip()


def identifier(cell):
    value = text(cell)
    if value is not None and cell["cell_type"] == "n" and re.fullmatch(r"0+", cell["number_format"] or "") and value.isdigit():
        return value.zfill(len(cell["number_format"]))
    return value


def number(cell, integer=False):
    value = text(cell)
    if value is None or not re.fullmatch(r"\d+(?:\.\d+)?", value):
        return None
    value = float(value)
    if not math.isfinite(value):
        return None
    if integer and not value.is_integer():
        return None
    return int(value) if value.is_integer() else value


def resolve_cell(column, row_number, cells, merges, anchors):
    current = cells.get(column)
    if current and (current["value"] is not None or current["formula"] is not None):
        return dict(current)
    c, r = coordinate(f"{column}{row_number}")
    if isinstance(merges, dict):
        intervals = merges.get(column, [])
        i = bisect_right(intervals, (r, float("inf"))) - 1
        if i >= 0:
            r1, r2, start, merged = intervals[i]
            if r1 <= r <= r2 and start in anchors:
                return {**anchors[start], "cell": f"{column}{row_number}", "merged_anchor": start, "merged_range": merged}
        return current
    for merged in merges:
        start, end = merged.split(":") if ":" in merged else (merged, merged)
        c1, r1 = coordinate(start)
        c2, r2 = coordinate(end)
        if c1 <= c <= c2 and r1 <= r <= r2 and start in anchors:
            return {**anchors[start], "cell": f"{column}{row_number}", "merged_anchor": start, "merged_range": merged}
    return current


def merge_index(ranges, columns):
    result = {col: [] for col in columns}
    for merged in ranges:
        start, end = merged.split(":") if ":" in merged else (merged, merged)
        c1, r1 = coordinate(start)
        c2, r2 = coordinate(end)
        for col in columns:
            c, _ = coordinate(col + "1")
            if c1 <= c <= c2:
                result[col].append((r1, r2, start, merged))
    for values in result.values():
        values.sort()
        if any(a[1] >= b[0] for a, b in zip(values, values[1:])):
            raise ValueError("Overlapping merged ranges")
    return result


def normalized_row(track, sheet, row_number, fields, source_sha):
    warnings = []
    plan = {}
    evidence = {}
    for field, heading in PLAN.items():
        cell = fields.get(heading)
        evidence[field] = cell
        value = number(cell, field in {"plan_count", "group_plan_count"}) if field in NUMBERS else identifier(cell) if field.endswith("_code") else text(cell)
        plan[field] = value
        if cell and cell["formula"] is not None:
            warnings.append(f"FORMULA_NOT_EVALUATED:{heading}")
        elif cell and cell["cell_type"] == "e":
            warnings.append(f"EXCEL_ERROR:{heading}")
        elif field in NUMBERS and text(cell) is not None and value is None:
            warnings.append(f"NON_NUMERIC_OR_UNIT_UNRESOLVED:{heading}")
    declared_track = text(fields.get("科类"))
    # Source numbers are never a currency-normalized budget input.
    plan.update({"tuition_currency": None, "tuition_period": None, "tuition_comparable": False})
    if declared_track is not None and declared_track != sheet:
        warnings.append("TRACK_CONFLICT")
    if declared_track is None:
        warnings.append("TRACK_FROM_EXPLICIT_SHEET_MAPPING")
    history = []
    # Year expansion is an explicit template mapping, never based on the filename.
    for year in (2025, 2024, 2023):
        prefix = str(year)[2:]
        for subject, metric, score_label, rank_label in [
            ("group", "group_admission_min", f"{prefix}专业组最低分", f"{prefix}专业组最低位次"),
            ("major", "major_admission_min", f"{prefix}最低分", f"{prefix}最低位次"),
            ("major", "major_admission_mean", f"{prefix}平均分", f"{prefix}平均位次"),
            ("major", "major_admission_max", f"{prefix}最高分", f"{prefix}最高位次"),
        ]:
            score_cell, rank_cell = fields.get(score_label), fields.get(rank_label)
            if not any(c and (c["value"] is not None or c["formula"] is not None) for c in (score_cell, rank_cell)):
                continue
            score, rank = number(score_cell), number(rank_cell, True)
            if rank == 0:
                rank = None
                warnings.append(f"INVALID_ZERO_RANK:{rank_label}")
            history.append({"source_year": year, "subject_type": subject, "metric_type": metric,
                "metric_interpretation_status": "WORKBOOK_HEADERS_NOT_INDEPENDENTLY_VERIFIED",
                "score": score, "rank": rank, "score_basis": None, "historical_batch": None,
                "historical_track": None, "comparability": "NOT_ESTABLISHED",
                "unknown_fields": ["score_basis", "historical_batch", "historical_track", "cross_year_subject_identity"],
                "evidence": {"score": score_cell, "rank": rank_cell}})
    return {"sample_id": f"xlsx-{track.lower()}-{row_number}-{source_sha[:12]}", "track": track,
        "plan_year": 2026, "plan": plan, "historical_observations": history,
        "source": {"workbook_sha256": source_sha, "worksheet": sheet, "row": row_number},
        "field_evidence": evidence, "warnings": warnings,
        "publication_status": "VALIDATED_NOT_VERIFIED", "human_review_status": "PENDING",
        "unknown_fields": ["source_authority", "scope_completeness", "tuition_currency_and_period"]}


def extract(path, track, sheet, limit):
    source_sha = sha(path)
    book = Workbook(path)
    try:
        layouts = [book.layout(name) for name in book.sheets]
        layout = next(x for x in layouts if x["name"] == sheet)
        headers, anchors, samples, batches = {}, {}, [], collections.Counter()
        data_count, missing_identity, formulas_selected = 0, 0, 0
        logical_keys = collections.Counter()
        sampled_keys = {}
        required = {"院校代码", "专业代码", "专业名称", "批次", "26计划人数"}
        merged_starts = {x.split(":")[0] for x in layout["merged_ranges"]}
        for row_number, cells in book.rows(sheet):
            for cell in cells.values():
                if cell["cell"] in merged_starts:
                    anchors[cell["cell"]] = cell
            if not headers:
                candidate = {text(c): col for col, c in cells.items() if text(c)}
                if required.issubset(candidate):
                    if len(candidate) != len([c for c in cells.values() if text(c)]):
                        raise ValueError("Duplicate worksheet headers")
                    headers = candidate
                    header_row = row_number
                    indexed_merges = merge_index(layout["merged_ranges"], headers.values())
                elif row_number >= 20:
                    raise ValueError("Required header labels not found in first 20 rows")
                continue
            if not any(c["value"] is not None or c["formula"] is not None for c in cells.values()):
                continue
            fields = {h: resolve_cell(col, row_number, cells, indexed_merges, anchors) for h, col in headers.items()}
            if not text(fields.get("专业名称")):
                continue
            data_count += 1
            if not identifier(fields.get("院校代码")) or not identifier(fields.get("专业代码")):
                missing_identity += 1
            batch = text(fields.get("批次")) or "UNKNOWN"
            logical_key = (track, batch, text(fields.get("计划类别")), identifier(fields.get("院校代码")),
                           identifier(fields.get("专业组代码")), identifier(fields.get("专业代码")))
            logical_keys[logical_key] += 1
            batches[batch] += 1
            if len(samples) < limit and batches[batch] <= 3:
                sample = normalized_row(track, sheet, row_number, fields, source_sha)
                samples.append(sample)
                sampled_keys[sample["sample_id"]] = logical_key
                formulas_selected += sum(c is not None and c["formula"] is not None for c in fields.values())
        if not headers:
            raise ValueError("No compatible header found")
        if sha(path) != source_sha:
            raise ValueError("Source workbook changed during extraction")
        for sample in samples:
            if logical_keys[sampled_keys[sample["sample_id"]]] > 1:
                sample["warnings"].append("DUPLICATE_LOGICAL_KEY_REQUIRES_REVIEW")
        return {"path": path.name, "sha256": source_sha, "size_bytes": path.stat().st_size,
            "source_authority": "USER_PROVIDED_NOT_INDEPENDENTLY_VERIFIED", "selected_sheet": sheet,
            "track_mapping": track, "track_mapping_basis": "explicit configuration + worksheet name",
            "header_row": header_row, "headers": headers, "worksheets": layouts,
            "data_rows": data_count, "missing_identity_rows": missing_identity,
            "duplicate_logical_key_groups": sum(n > 1 for n in logical_keys.values()),
            "batches": dict(batches), "sample_count": len(samples), "sample_formula_cells": formulas_selected}, samples
    finally:
        book.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook-root", type=Path, default=APP.parent)
    parser.add_argument("--output", type=Path, default=APP / "data/task03/workbooks")
    parser.add_argument("--limit-per-workbook", type=int, default=18)
    args = parser.parse_args()
    if not 1 <= args.limit_per_workbook <= 100:
        parser.error("limit must be 1..100")
    inputs, records = [], []
    for track, sheet, name in INPUTS:
        source, samples = extract(args.workbook_root / name, track, sheet, args.limit_per_workbook)
        inputs.append(source)
        records.extend(samples)
    payload = {"format_version": "1.0.0", "ingestion_mode": "XLSX_CELLS_PRIMARY",
        "publication_status": "NOT_PUBLISHED", "human_review_performed": False,
        "sample_scope": "up to three rows per encountered batch, capped per workbook; not full coverage",
        "inputs": inputs, "records": records,
        "limitations": ["Spreadsheet provenance is unverified; filename is not proof of authority.",
            "Formula cells are not executed; cached values are evidence only.",
            "No score distribution table was provided in these configured sheets.",
            "Historical groups/tracks cannot be inferred from the current plan row."]}
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "workbook-samples.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "passed", "inputs": len(inputs), "samples": len(records),
        "data_rows": {i["selected_sheet"]: i["data_rows"] for i in inputs}, "publication_status": "NOT_PUBLISHED"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
