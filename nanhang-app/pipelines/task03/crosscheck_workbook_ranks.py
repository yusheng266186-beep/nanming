"""Cross-check the workbook's historical score/rank columns against the official tables.

The two workbooks carry, for every 2025/2024/2023 admission line, a score and a rank. Those
ranks were produced by the workbook author and cannot be checked against the workbook itself.
This script checks them against the exam institute's own score-distribution tables:

  for a line with score s and rank r in year y and track t, look up s in the official table for
  y/t and test whether r falls inside the published interval [cum(s)-count(s)+1, cum(s)]

A rank outside the interval means the workbook pair is not consistent with the official table
for that year. That is reported, never repaired: the workbook value stays as read, and the
finding is recorded so a human can decide which side is wrong.

The track mapping is the part that needs care across the 2021 curriculum reform:

  2025  new_gaokao  物理类 PHYSICS  / 历史类 HISTORY    — same definition as the workbook sheet
  2024  old_system  理科 SCIENCE    / 文科 ARTS         — different definition
  2023  old_system  理科 SCIENCE    / 文科 ARTS         — different definition

So the 物理类 workbook's 2025 column is checked against the 2025 物理类 table, while its
2024/2023 columns are checked against the 理科 table. The sheet-to-track assignment is the
workbook's own convention (理科 data filed under the 物理类 sheet); recording it here keeps
that assumption visible instead of silently treating 理科 and 物理类 as the same thing.

Output: data/task03/score-distribution/workbook-crosscheck.json
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = APP_ROOT / "data" / "admissions" / "admissions.sqlite"
OUTPUT_PATH = APP_ROOT / "data" / "task03" / "score-distribution" / "workbook-crosscheck.json"
SAMPLE_PATH = APP_ROOT / "data" / "task03" / "score-distribution" / "workbook-crosscheck-samples.json"

PROVINCE = "SC"

# workbook sheet -> {year: official track}. 2025 uses the same 3+1+2 definition as the sheet;
# 2024/2023 are the old 文理分科 tables, where the physics sheet's numbers are 理科 and the
# history sheet's are 文科.
SHEET_TRACK_MAP = {
    "physics": {2025: "PHYSICS", 2024: "SCIENCE", 2023: "SCIENCE"},
    "history": {2025: "HISTORY", 2024: "ARTS", 2023: "ARTS"},
}

# Sources that hold 理科/文科 rather than 物理类/历史类, recorded so the difference is explicit.
OLD_SYSTEM_TRACKS = {"SCIENCE", "ARTS"}


def load_distributions(path: Path) -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    index = {}
    for item in payload["distributions"]:
        rows = {row["score"]: row for row in item["rows"]}
        index[(item["year"], item["track"])] = {
            "distribution_id": item["distribution_id"],
            "curriculum_system": item.get("curriculum_system"),
            "rows": rows,
            "unlisted": set(item["unlisted_scores"]),
            "score_min": min(rows) if rows else None,
            "score_max": max(rows) if rows else None,
        }
    return index


def rank_interval(row: dict) -> tuple[int, int] | None:
    count, cumulative = row.get("count"), row.get("cumulative")
    if count is None or cumulative is None:
        return None
    return cumulative - count + 1, cumulative


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--db", type=Path, default=DB_PATH)
    parser.add_argument("--distributions", type=Path,
                        default=APP_ROOT / "data/task03/score-distribution/score-distribution.json")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    parser.add_argument("--samples-output", type=Path, default=SAMPLE_PATH)
    parser.add_argument("--sample-per-bucket", type=int, default=8,
                        help="how many rows to keep verbatim per (year, track, verdict) bucket")
    args = parser.parse_args()

    if not args.db.exists():
        raise SystemExit(f"missing database: {args.db} (run build_admissions_db.py first)")
    distributions = load_distributions(args.distributions)

    connection = sqlite3.connect(args.db)
    connection.row_factory = sqlite3.Row
    # Which workbook a group came from is what decides the sheet-to-track mapping.
    sheet_by_source = {row["source_pk"]: row["sheet_key"] for row in connection.execute(
        "SELECT s.source_pk, CASE WHEN s.source_id LIKE '%HISTORY%' THEN 'history' "
        "ELSE 'physics' END AS sheet_key FROM source_document s")}

    totals: dict[tuple[int, str], dict] = {}
    verdicts: dict[tuple, int] = {}
    samples: dict[tuple, list] = {}
    unmatched_examples: list[dict] = []

    cursor = connection.execute(
        "SELECT o.source_pk, o.source_year, o.metric_type, o.score, o.rank, o.subject_type, "
        "       o.rank_is_valid, i.canonical_name, off.major_name, g.group_code "
        "FROM admission_observation o "
        "LEFT JOIN admission_group g ON g.group_pk = o.group_pk "
        "LEFT JOIN institution i ON i.institution_pk = g.institution_pk "
        "LEFT JOIN offering off ON off.offering_pk = o.offering_pk "
        "WHERE o.score IS NOT NULL AND o.rank IS NOT NULL AND o.source_year IN (2025, 2024, 2023)")

    for record in cursor:
        sheet = sheet_by_source.get(record["source_pk"])
        if sheet is None:
            continue
        track = SHEET_TRACK_MAP[sheet].get(record["source_year"])
        if track is None:
            continue
        key = (record["source_year"], track)
        bucket = totals.setdefault(key, {
            "checked": 0, "in_interval": 0, "outside_interval": 0,
            "score_unlisted": 0, "out_of_coverage": 0, "no_row": 0,
            "max_distance": 0, "distance_sum": 0, "distance_count": 0,
        })
        distribution = distributions.get(key)
        if not distribution:
            bucket["no_row"] += 1
            continue
        bucket["checked"] += 1
        score = int(record["score"])
        row = distribution["rows"].get(score)
        if row is None:
            if score < (distribution["score_min"] or 0):
                verdict = "out_of_coverage"
            elif score > (distribution["score_max"] or 0):
                verdict = "above_published_range"
            else:
                verdict = "score_unlisted"
            bucket["out_of_coverage" if verdict == "out_of_coverage" else
                   "score_unlisted" if verdict == "score_unlisted" else "score_unlisted"] += 1
            verdicts[(record["source_year"], track, verdict)] = \
                verdicts.get((record["source_year"], track, verdict), 0) + 1
            if verdict != "score_unlisted" and len(unmatched_examples) < 20:
                unmatched_examples.append({
                    "year": record["source_year"], "track_key": track, "score": score,
                    "rank": record["rank"], "verdict": verdict,
                    "distribution_id": distribution["distribution_id"],
                })
            continue
        interval = rank_interval(row)
        if interval is None:
            bucket["no_row"] += 1
            continue
        low, high = interval
        rank = int(record["rank"])
        inside = low <= rank <= high
        verdict = "in_interval" if inside else "outside_interval"
        bucket["in_interval" if inside else "outside_interval"] += 1
        verdicts[(record["source_year"], track, verdict)] = \
            verdicts.get((record["source_year"], track, verdict), 0) + 1
        if not inside:
            distance = low - rank if rank < low else rank - high
            bucket["max_distance"] = max(bucket["max_distance"], distance)
            bucket["distance_sum"] += distance
            bucket["distance_count"] += 1
            verbatim = samples.setdefault((record["source_year"], track, verdict), [])
            if len(verbatim) < args.sample_per_bucket:
                verbatim.append({
                    "source_year": record["source_year"], "official_track": track,
                    "metric_type": record["metric_type"], "subject_type": record["subject_type"],
                    "institution": record["canonical_name"], "major": record["major_name"],
                    "group_code": record["group_code"], "score": score, "workbook_rank": rank,
                    "official_rank_interval": [low, high], "distance": distance,
                    "official_count": row["count"], "official_cumulative": row["cumulative"],
                })
        else:
            verbatim = samples.setdefault((record["source_year"], track, verdict), [])
            if len(verbatim) < args.sample_per_bucket:
                verbatim.append({
                    "source_year": record["source_year"], "official_track": track,
                    "metric_type": record["metric_type"], "subject_type": record["subject_type"],
                    "institution": record["canonical_name"], "major": record["major_name"],
                    "group_code": record["group_code"], "score": score, "workbook_rank": rank,
                    "official_rank_interval": [low, high],
                    "official_count": row["count"], "official_cumulative": row["cumulative"],
                })

    connection.close()

    summary = []
    for (year, track), bucket in sorted(totals.items()):
        checked = bucket["checked"]
        inside = bucket["in_interval"]
        outside = bucket["outside_interval"]
        comparable = inside + outside
        summary.append({
            "year": year,
            "track_key": track,
            "curriculum_system": distributions.get((year, track), {}).get("curriculum_system"),
            "official_track_is_old_system": track in OLD_SYSTEM_TRACKS,
            "rows_checked": checked,
            "rank_in_official_interval": inside,
            "rank_outside_official_interval": outside,
            "score_not_listed_in_official_table": bucket["score_unlisted"],
            "score_out_of_official_coverage": bucket["out_of_coverage"],
            "consistency_rate_of_comparable": (round(inside / comparable, 6)
                                               if comparable else None),
            "mean_abs_distance_when_outside": (round(bucket["distance_sum"] / bucket["distance_count"], 1)
                                               if bucket["distance_count"] else None),
            "max_abs_distance": bucket["max_distance"],
        })

    payload = {
        "format_version": "1.0.0",
        "province": PROVINCE,
        "method": ("工作簿分数→官方分段表区间；工作簿位次落在 [cum-count+1, cum] 内记为一致。"
                   "不一致只记录不修改。"),
        "track_mapping": {
            "physics_sheet": {"2025": "PHYSICS", "2024": "SCIENCE", "2023": "SCIENCE",
                              "note": "2024/2023 四川为文理分科，物理工作表的历史列按理科表核对"},
            "history_sheet": {"2025": "HISTORY", "2024": "ARTS", "2023": "ARTS",
                              "note": "2024/2023 四川为文理分科，历史工作表的历史列按文科表核对"},
        },
        "publication_status": "NOT_PUBLISHED",
        "summary": summary,
        "excluded_from_crosscheck": unmatched_examples,
        "totals": {
            "rows_checked": sum(item["rows_checked"] for item in summary),
            "rank_in_official_interval": sum(item["rank_in_official_interval"] for item in summary),
            "rank_outside_official_interval": sum(item["rank_outside_official_interval"] for item in summary),
            "score_not_listed_in_official_table": sum(item["score_not_listed_in_official_table"] for item in summary),
            "score_out_of_official_coverage": sum(item["score_out_of_official_coverage"] for item in summary),
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.samples_output.write_text(json.dumps(
        {f"{year}|{track}|{verdict}": rows
         for (year, track, verdict), rows in sorted(samples.items())},
        ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({
        "status": "passed",
        "output": str(args.output.relative_to(APP_ROOT)),
        "totals": payload["totals"],
        "by_year_track": summary,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
