"""Independently verify the admissions database against the original workbooks.

Re-reads the source XLSX cells directly and checks that the database agrees, without
reusing the build pipeline's row objects. Checks structure, cleaning rules, totals and
the historical-fact isolation rules the project specification requires.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

APP = Path(__file__).resolve().parents[2]
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
RNS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
INPUTS = [
    ("PHYSICS", "物理", "物理类 四川2026年高考填报数据招生考试报+近三年22-25年历史录取数据.xlsx"),
    ("HISTORY", "历史", "历史类 四川2026年高考填报数据招生考试报+近三年22-25年历史录取数据.xlsx"),
]


def shared_strings(archive):
    values = []
    if "xl/sharedStrings.xml" in archive.namelist():
        with archive.open("xl/sharedStrings.xml") as stream:
            for _, item in ET.iterparse(stream, events=("end",)):
                if item.tag == NS + "si":
                    values.append("".join(node.text or "" for node in item.iter(NS + "t")))
                    item.clear()
    return values


def sheet_member(archive, sheet_name):
    relationships = {node.get("Id"): node.get("Target")
                     for node in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))}
    for sheet in ET.fromstring(archive.read("xl/workbook.xml")).findall(NS + "sheets/" + NS + "sheet"):
        if sheet.get("name") == sheet_name:
            target = relationships[sheet.get(RNS + "id")]
            return target.lstrip("/") if target.startswith("/") else "xl/" + target
    raise KeyError(sheet_name)


def scan(path, sheet):
    """Return header letters and a generator over (row_number, {column: (value, type)})."""
    archive = zipfile.ZipFile(path)
    strings = shared_strings(archive)
    member = sheet_member(archive, sheet)

    def rows():
        with archive.open(member) as stream:
            for _, element in ET.iterparse(stream, events=("end",)):
                if element.tag != NS + "row":
                    continue
                cells = {}
                for cell in element.findall(NS + "c"):
                    ref = cell.get("r")
                    column = "".join(ch for ch in ref if ch.isalpha())
                    value_node = cell.find(NS + "v")
                    kind = cell.get("t", "n")
                    value = value_node.text if value_node is not None else None
                    if kind == "s" and value is not None:
                        value = strings[int(value)]
                    elif kind == "inlineStr":
                        value = "".join(node.text or "" for node in cell.iter(NS + "t"))
                    cells[column] = (value, kind, cell.find(NS + "f") is not None)
                yield int(element.get("r")), cells
                element.clear()

    return archive, rows()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook-root", type=Path, default=APP.parent)
    parser.add_argument("--db", type=Path, default=APP / "data/admissions/admissions.sqlite")
    parser.add_argument("--manifest", type=Path, default=APP / "data/admissions/build-manifest.json")
    args = parser.parse_args()
    failures: list[str] = []
    checks = 0

    def expect(condition, message):
        nonlocal checks
        checks += 1
        if not condition:
            failures.append(message)

    connection = sqlite3.connect(f"file:{args.db}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row

    # 1. Structural integrity.
    expect(connection.execute("PRAGMA integrity_check").fetchone()[0] == "ok", "integrity_check")
    expect(connection.execute("PRAGMA foreign_key_check").fetchall() == [], "foreign_key_check")

    # 2. Source hashes still match the manifest and the database metadata.
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    metadata = {row["key"]: row["value"] for row in connection.execute("SELECT * FROM meta")}
    for name, expected in manifest["source_sha256"].items():
        path = args.workbook_root / name
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        expect(actual == expected, f"workbook changed since build: {name}")
        expect(metadata.get(f"source_sha256:{name}") == actual, f"database source hash: {name}")
        expect(manifest["database_sha256"] == hashlib.sha256(args.db.read_bytes()).hexdigest(),
               "database file hash differs from the build manifest")

    # 3. Independently re-count the source rows and re-check each stored row's plan facts.
    for track, sheet, name in INPUTS:
        path = args.workbook_root / name
        archive, rows = scan(path, sheet)
        try:
            headers, header_row = {}, None
            letters: dict[str, str] = {}
            for row_number, cells in rows:
                candidate = {column: value for column, (value, _kind, _formula) in cells.items()
                             if value is not None and str(value).strip()}
                labels = {str(value).strip() for value in candidate.values()}
                if not headers and {"院校代码", "专业名称"}.issubset(labels):
                    header_row = row_number
                    headers = {str(value).strip(): column for column, value in candidate.items()}
                    letters = headers
                    break
            expect(header_row == 1, f"{name}: header row is {header_row}, expected 1")

            source_row_count = 0
            plan_count_sum = 0
            sample = []
            for row_number, cells in rows:
                major = cells.get(headers["专业名称"], (None, None, None))[0]
                if major is None or not str(major).strip():
                    continue
                source_row_count += 1
                plan_count = cells.get(headers["26计划人数"], (None, None, None))
                if plan_count[0] is not None and not plan_count[2]:
                    text = str(plan_count[0]).strip()
                    if text.isdigit():
                        plan_count_sum += int(text)
                if len(sample) < 25:
                    sample.append((row_number, cells))

            stored = connection.execute(
                "SELECT COUNT(*), SUM(plan_count) FROM plan_record p "
                "JOIN source_document s ON s.source_pk = p.source_pk WHERE s.track = ?",
                (track,)).fetchone()
            expect(stored[0] == source_row_count,
                   f"{name}: stored {stored[0]} plan rows, source has {source_row_count}")
            expect(stored[1] == plan_count_sum,
                   f"{name}: stored plan_count sum {stored[1]}, source sum {plan_count_sum}")

            # Spot-check plan facts and history for the first rows of the sheet.
            for row_number, cells in sample:
                institution = str(cells.get(headers["院校代码"], ("",))[0] or "").strip()
                group_code = str(cells.get(headers["专业组代码"], ("",))[0] or "").strip()
                major_code = str(cells.get(headers["专业代码"], ("",))[0] or "").strip()
                stored_row = connection.execute(
                    "SELECT p.source_row, p.plan_count, p.tuition_raw, o.major_code, g.group_code, "
                    "i.institution_code, f.tuition_comparable "
                    "FROM plan_record p JOIN offering o ON o.offering_pk = p.offering_pk "
                    "JOIN admission_group g ON g.group_pk = o.group_pk "
                    "JOIN institution i ON i.institution_pk = g.institution_pk "
                    "JOIN v_offering_full f ON f.offering_id = o.offering_id "
                    "JOIN source_document s ON s.source_pk = p.source_pk "
                    "WHERE s.track = ? AND p.source_row = ?", (track, row_number)).fetchone()
                expect(stored_row is not None, f"{name} row {row_number}: missing in database")
                if stored_row is None:
                    continue
                expect(stored_row["institution_code"] == institution,
                       f"{name} row {row_number}: institution code differs")
                expect(stored_row["group_code"] == group_code,
                       f"{name} row {row_number}: group code differs")
                expect(stored_row["major_code"] == major_code,
                       f"{name} row {row_number}: major code differs (leading zeros?)")
                expect(stored_row["tuition_comparable"] == 0,
                       f"{name} row {row_number}: tuition_comparable must stay 0")

                for year, score_column, rank_column, metric in (
                        (2025, "25最低分", "25最低位次", "major_admission_min"),
                        (2024, "24最低分", "24最低位次", "major_admission_min"),
                        (2023, "23最低分", "23最低位次", "major_admission_min")):
                    cell_score = cells.get(headers[score_column], (None,))[0]
                    cell_rank = cells.get(headers[rank_column], (None,))[0]
                    observation = connection.execute(
                        "SELECT score, rank, rank_is_valid FROM admission_observation ob "
                        "JOIN offering o ON o.offering_pk = ob.offering_pk "
                        "JOIN source_document s ON s.source_pk = ob.source_pk "
                        "WHERE s.track = ? AND ob.source_row = ? AND ob.source_year = ? "
                        "AND ob.metric_type = ?", (track, row_number, year, metric)).fetchone()
                    if cell_score is None and cell_rank is None:
                        expect(observation is None,
                               f"{name} row {row_number} {year}: unexpected observation")
                        continue
                    expect(observation is not None, f"{name} row {row_number} {year}: missing observation")
                    if observation is None:
                        continue
                    expected_score = None
                    if cell_score is not None:
                        text = str(cell_score).strip()
                        expected_score = float(text) if text.replace(".", "", 1).isdigit() else None
                    expect(observation["score"] == expected_score,
                           f"{name} row {row_number} {year}: score {observation['score']} != {expected_score}")
                    if str(cell_rank).strip() == "0":
                        expect(observation["rank"] is None and observation["rank_is_valid"] == 0,
                               f"{name} row {row_number} {year}: rank 0 must be stored invalid")
        finally:
            archive.close()

    # 4. The rules the specification calls out explicitly.
    expect(connection.execute(
        "SELECT COUNT(*) FROM admission_observation WHERE observed_track IS NOT NULL "
        "OR observed_batch IS NOT NULL OR observed_admission_type IS NOT NULL "
        "OR score_basis IS NOT NULL").fetchone()[0] == 0,
        "historical observations must not carry plan-row track/batch/admission type/score basis")
    expect(connection.execute(
        "SELECT COUNT(*) FROM admission_observation WHERE rank = 0 AND rank_is_valid = 1").fetchone()[0] == 0,
        "rank 0 must never be a valid rank")
    expect(connection.execute(
        "SELECT COUNT(*) FROM plan_record WHERE tuition_currency IS NOT NULL "
        "OR tuition_period IS NOT NULL OR tuition_comparable <> 0").fetchone()[0] == 0,
        "tuition currency and period must stay unknown")
    expect(connection.execute("SELECT COUNT(*) FROM plan_record WHERE plan_count < 0").fetchone()[0] == 0,
           "plan count must not be negative")
    expect(connection.execute(
        "SELECT COUNT(*) FROM offering o LEFT JOIN plan_record p ON p.offering_pk = o.offering_pk "
        "WHERE p.plan_pk IS NULL").fetchone()[0] == 0, "offering without plan_record")
    expect(connection.execute(
        "SELECT COUNT(*) FROM admission_observation WHERE subject_type = 'group' AND group_pk IS NULL "
        "OR subject_type = 'major' AND offering_pk IS NULL").fetchone()[0] == 0,
        "observation subject owner missing")
    expect(connection.execute(
        "SELECT COUNT(*) FROM requirement WHERE rule_kind = 'all_of' AND subjects = ''").fetchone()[0] == 0,
        "all_of rule without subjects")

    # 5. Publication state: nothing here may claim to be released.
    expect(metadata["publication_status"] == "NOT_PUBLISHED", "publication_status must stay NOT_PUBLISHED")
    expect(connection.execute(
        "SELECT COUNT(*) FROM release WHERE publication_status = 'PUBLISHED'").fetchone()[0] == 0,
        "no release may be marked PUBLISHED")

    # 5b. Score-distribution tables: re-check the published arithmetic against the stored rows.
    # Every registered year is checked, and each table must carry the curriculum system its
    # publication states, so a 理科 row can never be read as if it were a 物理类 row.
    distribution_json = APP / "data/task03/score-distribution/score-distribution.json"
    if distribution_json.exists():
        distribution_payload = json.loads(distribution_json.read_text(encoding="utf-8"))
        tables = distribution_payload.get("distributions")
        if tables is None:  # version 1 payload held a single year under "tracks"
            tables = [{"track": track, "year": distribution_payload["year"], **data}
                      for track, data in distribution_payload.get("tracks", {}).items()]
        for data in tables:
            distribution_id = data.get("distribution_id") or                 f"SCORE-DIST-SC-{data['year']}-{data['track']}"
            stored = connection.execute(
                "SELECT * FROM v_score_distribution_row WHERE distribution_id = ? "
                "ORDER BY score DESC", (distribution_id,)).fetchall()
            expect(len(stored) == len(data["rows"]),
                   f"{distribution_id}: stored {len(stored)} score rows, "
                   f"extracted {len(data['rows'])}")
            by_score = {row["score"]: row for row in stored}
            for row in data["rows"]:
                saved = by_score.get(row["score"])
                expect(saved is not None, f"{distribution_id} score {row['score']}: not stored")
                if saved is None:
                    continue
                expect(saved["count"] == row["count"],
                       f"{distribution_id} score {row['score']}: count differs from extraction")
                expect(saved["cumulative"] == row["cumulative"],
                       f"{distribution_id} score {row['score']}: cumulative differs from extraction")
                if row["count"] is not None:
                    expect(saved["rank_best"] == row["cumulative"] - row["count"] + 1
                           and saved["rank_worst"] == row["cumulative"],
                           f"{distribution_id} score {row['score']}: rank interval not derived "
                           f"from the counts")
            for above, below in zip(stored, stored[1:]):
                if None in (above["cumulative"], below["cumulative"], below["count"]):
                    continue
                expect(below["cumulative"] - above["cumulative"] == below["count"],
                       f"{distribution_id} score {below['score']}: count does not close "
                       f"the cumulative")
            if stored:
                total = sum(row["count"] for row in stored if row["count"] is not None)
                head = stored[0]["cumulative"] - stored[0]["count"]
                expect(head >= 0,
                       f"{distribution_id}: the above-range head group cannot be negative")
                expect(total + head == stored[-1]["cumulative"],
                       f"{distribution_id}: population does not reconcile: {total} + {head} != "
                       f"{stored[-1]['cumulative']}")
            expect(connection.execute(
                "SELECT verification_status FROM score_distribution WHERE distribution_id = ?",
                (distribution_id,)).fetchone()[0] == "VERIFIED",
                f"{distribution_id}: score distribution must be recorded as VERIFIED")
            expect(connection.execute(
                "SELECT curriculum_system FROM score_distribution WHERE distribution_id = ?",
                (distribution_id,)).fetchone()[0] == data.get("curriculum_system"),
                f"{distribution_id}: curriculum_system must match the publication's system")
        expect(connection.execute(
            "SELECT COUNT(*) FROM score_distribution_row").fetchone()[0]
            == sum(len(data["rows"]) for data in tables),
            "score_distribution_row count does not match the extracted tables")

    # 5c. Cross-year comparability: every history year with a published table must carry a
    # decision, an established comparison must name its reviewer, and the per-row status must
    # agree with the link. A row marked COMPARABLE with no VERIFIED link is the silent upgrade
    # this check exists to catch.
    published_systems = {(row["year"], row["track"]): row["curriculum_system"]
                         for row in connection.execute(
                             "SELECT year, track, curriculum_system FROM score_distribution")}
    links = [dict(row) for row in connection.execute("SELECT * FROM comparability_link")]
    expect(len(links) > 0, "comparability links must be recorded")
    for link in links:
        expect(link["status"] in ("VERIFIED", "NOT_ESTABLISHED", "QUARANTINED"),
               f"{link['link_id']}: invalid status")
        expect(bool(link["basis"]), f"{link['link_id']}: basis must be stated")
        if link["status"] == "VERIFIED":
            expect(bool(link["reviewer"]) and bool(link["review_date"]),
                   f"{link['link_id']}: an established comparison must name reviewer and date")
            expect(bool(link["examined"]),
                   f"{link['link_id']}: an established comparison must state what was examined")
            expect(bool(link["not_examined"]),
                   f"{link['link_id']}: an established comparison must state what was NOT examined")
            expect(bool(link["evidence_ids"]),
                   f"{link['link_id']}: an established comparison must cite its evidence")
            expect(published_systems.get((link["history_year"], link["history_track"])) is not None,
                   f"{link['link_id']}: links a year/track with no published table")
        else:
            expect(link["reviewer"] is None,
                   f"{link['link_id']}: a link that is not established must not name a reviewer")

    # Every plan track must have a decision for each year that has a table, so no year is left
    # ambiguous between "comparable" and "not established".
    for plan_track, history in (("PHYSICS", {2025: "PHYSICS", 2024: "SCIENCE", 2023: "SCIENCE"}),
                                ("HISTORY", {2025: "HISTORY", 2024: "ARTS", 2023: "ARTS"})):
        for history_year, history_track in history.items():
            if (history_year, history_track) not in published_systems:
                continue
            found = [link for link in links if link["plan_track"] == plan_track
                     and link["history_year"] == history_year
                     and link["history_track"] == history_track]
            expect(len(found) == 1,
                   f"{plan_track} {history_year}: exactly one comparability decision required")

    # The per-row status must follow the link, not an independent default.
    for row in connection.execute(
            "SELECT DISTINCT source_year, comparability FROM admission_observation"):
        year, status = row["source_year"], row["comparability"]
        if status == "COMPARABLE":
            expect(any(link["history_year"] == year and link["status"] == "VERIFIED"
                       for link in links),
                   f"{year}: rows marked COMPARABLE without a VERIFIED comparability link")
        else:
            expect(status in ("NOT_ESTABLISHED", "GROUP_CHANGED", "SOURCE_CONFLICT"),
                   f"{year}: unexpected comparability value {status}")
    for year in (2023, 2024):
        expect(connection.execute(
            "SELECT COUNT(*) FROM admission_observation WHERE source_year = ? "
            "AND comparability = 'COMPARABLE'", (year,)).fetchone()[0] == 0,
            f"{year} is 文理分科 and must not be marked COMPARABLE")

    # 6. Matching views must answer without touching fact tables.
    pool = connection.execute("SELECT COUNT(*) FROM match_pool").fetchone()[0]
    expect(pool == connection.execute("SELECT COUNT(*) FROM offering").fetchone()[0],
           "match_pool must expose every offering")
    expect(connection.execute("SELECT COUNT(*) FROM match_pool WHERE plan_count IS NULL").fetchone()[0]
           == connection.execute("SELECT COUNT(*) FROM plan_record WHERE plan_count IS NULL").fetchone()[0],
           "match_pool must carry the plan count through unchanged")
    expect(connection.execute("SELECT COUNT(*) FROM v_observation").fetchone()[0]
           == connection.execute("SELECT COUNT(*) FROM admission_observation").fetchone()[0],
           "v_observation must expose every observation")

    connection.close()
    result = {"status": "failed" if failures else "passed", "checks": checks,
              "failures": failures}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
