"""Query the offline admissions database: match offerings against a student's input.

Deterministic rules only, aligned with nanhang-handoff/DATA_AND_MATCHING_SPEC.md and
packages/domain. No probabilities, no score-to-rank conversion, no invented precision.

Rank comparison needs a rank, which comes from either --rank (the student's own) or
--score/--score-year (looked up in the official 一分一段表). The distribution tables are loaded
for 2023-2026; 2025 起 track names match the workbook sheets, while 2024 and earlier are the
old 理科/文科 tables, selected through DISTRIBUTION_TRACK_BY_YEAR. A score the published table
does not list yields no rank, and nothing is interpolated or extrapolated.

Examples
--------
  py -3.12 pipelines/task03/query_admissions.py --stats
  py -3.12 pipelines/task03/query_admissions.py --track 物理 --subjects 化学,生物 --rank 12000
  py -3.12 pipelines/task03/query_admissions.py --track 历史 --subjects 政治,地理 --rank 3000 \
      --batch 本科批B段 --level 本科 --limit 20
  py -3.12 pipelines/task03/query_admissions.py --track 物理 --rank 20000 \
      --budget 7000 --assume-tuition-rmb-per-year --format csv --output result.csv
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import sqlite3
import sys
from pathlib import Path

APP = Path(__file__).resolve().parents[2]
DEFAULT_DB = APP / "data/admissions/admissions.sqlite"

TRACKS = {"物理": "PHYSICS", "PHYSICS": "PHYSICS", "历史": "HISTORY", "HISTORY": "HISTORY"}
SUBJECT_CODES = {"CHEMISTRY": "化学", "BIOLOGY": "生物", "POLITICS": "政治", "GEOGRAPHY": "地理"}
REASON_ORDER = [
    "INCOMPLETE_SUBJECTS", "SUBJECT_REQUIREMENT_FAILED", "UNKNOWN_REQUIREMENT",
    "UNSUPPORTED_SCOPE", "NO_OBSERVED_SCORE", "OUT_OF_DISTRIBUTION_COVERAGE",
    "MAJOR_HISTORY_MISSING", "GROUP_HISTORY_MISSING", "SOURCE_CONFLICT",
    "TARGET_YEAR_PLAN_MISSING", "TUITION_UNKNOWN", "HARD_PREFERENCE_EXCLUDED",
    "NO_ACADEMIC_INPUT", "ADMISSION_TYPE_INFERRED",
]
# The three earlier years are reported one by one; they are never averaged and the most
# favourable one is never picked automatically.
REFERENCE_YEARS = (2025, 2024, 2023)

# Which published table a plan-year track's history is filed under, per year.
#
# The workbook keeps 2023/2024 history on the same sheet as the plan year, so a 物理类 sheet
# carries 理科 numbers for those years and a 历史类 sheet carries 文科 numbers. Sichuan ran the
# old 文理分科 system until 2024 and the 3+1+2 system from 2025, and the two tables are
# different definitions of "track" — the official 2024 理科 table is what those columns were
# produced from. Mapping the years explicitly keeps that visible instead of comparing a 物理类
# plan against a 理科 table as though the names matched.
DISTRIBUTION_TRACK_BY_YEAR = {
    "PHYSICS": {2026: "PHYSICS", 2025: "PHYSICS", 2024: "SCIENCE", 2023: "SCIENCE"},
    "HISTORY": {2026: "HISTORY", 2025: "HISTORY", 2024: "ARTS", 2023: "ARTS"},
}


def format_rank_lookup_note(lookup: dict | None, args) -> str:
    if lookup is None:
        return "未进行分数换算。"
    status = lookup["status"]
    if status == "located":
        low, high = lookup["rank_interval"]
        derived = "（该分数人数由累计差推得）" if lookup.get("count_derived") else ""
        return (f"{args.score_year} 年{args.track} {args.score} 分：官方分段表该分数 "
                f"{lookup['count']} 人{derived}，累计 {lookup['cumulative']} 人，"
                f"位次区间 [{low}, {high}]，来源 {lookup['distribution_id']}"
                f"（{lookup['verification_status']}）。比较时使用区间下界 {low}。")
    reason = lookup["reason"]
    if reason == "OUT_OF_DISTRIBUTION_COVERAGE":
        return (f"{args.score_year} 年{args.track} {args.score} 分低于官方分段表公布的最低分 "
                f"{lookup['published_min_score']}，不在覆盖范围内（OUT_OF_DISTRIBUTION_COVERAGE），"
                "不外推位次。")
    if reason == "ABOVE_PUBLISHED_RANGE":
        return (f"{args.score_year} 年{args.track} {args.score} 分高于官方分段表公布的最高分 "
                f"{lookup['published_max_score']}；该分数段未逐分公布，不制造精确位次。")
    if reason == "NO_OBSERVED_SCORE":
        return (f"{args.score_year} 年{args.track} {args.score} 分不在官方分段表列出的分数中："
                "该分数无人达到，因此没有该分数的位次（NO_OBSERVED_SCORE），不做插值。")
    return f"分数换算不可用：{reason}。"


def locate_rank(connection: sqlite3.Connection, track: str, score: int,
                year: int) -> dict:
    """Turn a published score into the rank interval the official table supports.

    Follows the project matching spec: only an exact published row yields an interval,
    rank_best = cumulative - count + 1 and rank_worst = cumulative. A score the table does
    not list means nobody attained it, so no individual rank is produced; scores below the
    published minimum are out of coverage. Nothing is interpolated.

    ``track`` is the plan-year track (PHYSICS/HISTORY). The published table for the requested
    year may use a different definition — 2024 and earlier are 理科/文科 — so the year's table
    is selected through DISTRIBUTION_TRACK_BY_YEAR, never by assuming the names match.
    """
    connection.row_factory = sqlite3.Row
    distribution_track = DISTRIBUTION_TRACK_BY_YEAR.get(track, {}).get(year, track)
    row = connection.execute(
        "SELECT d.distribution_id, d.verification_status, d.score_basis, d.score_min, d.score_max, "
        "d.curriculum_system, d.head_group_above_max, r.score, r.count, r.cumulative, "
        "r.rank_best, r.rank_worst, "
        "r.count_derived, r.evidence_image, r.score_x, r.score_y, r.count_x, r.count_y, "
        "r.cumulative_x, r.cumulative_y "
        "FROM score_distribution d LEFT JOIN score_distribution_row r "
        "  ON r.distribution_pk = d.distribution_pk AND r.score = ? "
        "WHERE d.year = ? AND d.province = 'SC' AND d.track = ?",
        (score, year, distribution_track)).fetchone()
    if row is None:
        return {"status": "unavailable", "reason": "NO_DISTRIBUTION_FOR_YEAR", "rank_interval": None}
    if row["score"] is None:
        if row["score_min"] is not None and score < row["score_min"]:
            return {"status": "unavailable", "reason": "OUT_OF_DISTRIBUTION_COVERAGE",
                    "rank_interval": None, "distribution_id": row["distribution_id"],
                    "published_min_score": row["score_min"]}
        if row["score_max"] is not None and score > row["score_max"]:
            return {"status": "unavailable", "reason": "ABOVE_PUBLISHED_RANGE",
                    "rank_interval": None, "distribution_id": row["distribution_id"],
                    "published_max_score": row["score_max"]}
        return {"status": "unavailable", "reason": "NO_OBSERVED_SCORE", "rank_interval": None,
                "distribution_id": row["distribution_id"]}
    return {
        "status": "located",
        "precision": "exact_score",
        "distribution_id": row["distribution_id"],
        "verification_status": row["verification_status"],
        "curriculum_system": row["curriculum_system"],
        "score_basis": row["score_basis"],
        "score": row["score"],
        "count": row["count"],
        "cumulative": row["cumulative"],
        "rank_interval": [row["rank_best"], row["rank_worst"]],
        "count_derived": bool(row["count_derived"]),
        "evidence": {
            "image": row["evidence_image"],
            "score_box": {"x": row["score_x"], "y": row["score_y"]},
            "count_box": {"x": row["count_x"], "y": row["count_y"]},
            "cumulative_box": {"x": row["cumulative_x"], "y": row["cumulative_y"]},
        },
    }


def empty_reference(reason: str) -> dict:
    return {"relation": "NOT_COMPARABLE", "reference_year": None, "reference_rank": None,
            "reference_score": None, "reason_codes": [reason]}


def compare_rank(candidate: int | None, reference: int | None) -> str:
    """Closed-interval comparison. A single rank is its own interval [r, r]."""
    if candidate is None:
        return "NOT_COMPARABLE"
    if reference is None:
        return "NOT_COMPARABLE"
    if candidate < reference:
        return "AHEAD_OF_REFERENCE"
    if candidate > reference:
        return "BEHIND_REFERENCE"
    return "OVERLAPS_REFERENCE"


def evaluate_subjects(rule_kind: str, subjects: list[str], selection: set[str],
                      selection_complete: bool) -> tuple[str, list[str]]:
    """Three-valued subject check. UNKNOWN is never merged into PASS or FAIL."""
    if rule_kind == "unlimited":
        return "PASS", []
    if rule_kind == "unknown":
        return "UNKNOWN", ["UNKNOWN_REQUIREMENT"]
    if not selection_complete:
        return "UNKNOWN", ["INCOMPLETE_SUBJECTS"]
    if not subjects:
        return "UNKNOWN", ["UNKNOWN_REQUIREMENT"]
    if set(subjects).issubset(selection):
        return "PASS", []
    return "FAIL", ["SUBJECT_REQUIREMENT_FAILED"]


def combine(statuses: list[str]) -> str:
    if "FAIL" in statuses:
        return "FAIL"
    if "UNKNOWN" in statuses:
        return "UNKNOWN"
    return "PASS"


def unique_reasons(reasons: list[str]) -> list[str]:
    present = set(reasons)
    return [code for code in REASON_ORDER if code in present]


def parse_subjects(raw: str | None) -> tuple[set[str], bool]:
    if not raw:
        return set(), False
    parts = [part.strip() for part in raw.replace("，", ",").split(",") if part.strip()]
    codes = set()
    for part in parts:
        code = part if part in SUBJECT_CODES else next(
            (key for key, name in SUBJECT_CODES.items() if name == part), None)
        if code is None:
            raise SystemExit(f"Unknown subject: {part}. Use one of 化学, 生物, 政治, 地理.")
        codes.add(code)
    return codes, len(codes) == 2


def load_rows(connection: sqlite3.Connection, track: str, args) -> list[sqlite3.Row]:
    """Fetch the candidate pool, letting SQLite apply the indexed hard filters first."""
    clauses = ["track = ?"]
    params: list = [track]
    for column, values in (("batch", args.batch), ("level_label", args.level),
                           ("category", args.category), ("province", args.institution_province),
                           ("admission_type", args.admission_type)):
        if values:
            clauses.append(f"{column} IN ({','.join('?' * len(values))})")
            params.extend(values)
    if args.exclude_inferred_admission_type:
        clauses.append("admission_type_inferred = 0")
    if args.min_plan_count is not None:
        clauses.append("plan_count IS NOT NULL AND plan_count >= ?")
        params.append(args.min_plan_count)
    if args.max_plan_count is not None:
        clauses.append("plan_count IS NOT NULL AND plan_count <= ?")
        params.append(args.max_plan_count)
    if args.exclude_new:
        clauses.append("is_new = 0")
    if args.has_history:
        clauses.append("(major_rank_2025 IS NOT NULL OR major_score_2025 IS NOT NULL "
                       "OR major_rank_2024 IS NOT NULL OR major_score_2024 IS NOT NULL "
                       "OR major_rank_2023 IS NOT NULL OR major_score_2023 IS NOT NULL)")
    if args.budget is not None and args.assume_tuition_rmb_per_year:
        # Only enforceable under the explicit assumption. Unknown amounts stay in the pool
        # so they are reported as TUITION_UNKNOWN instead of being silently dropped.
        clauses.append("(tuition_amount IS NULL OR tuition_amount <= ?)")
        params.append(args.budget)
    connection.row_factory = sqlite3.Row
    return connection.execute(
        f"SELECT * FROM match_pool WHERE {' AND '.join(clauses)} "
        "ORDER BY institution_code, batch, group_code, major_code", params).fetchall()


def build_candidate(row: sqlite3.Row, args, selection: set[str], selection_complete: bool) -> dict:
    subjects = [item for item in (row["requirement_subjects"] or "").split(",") if item]
    reasons: list[str] = []

    eligibility, subject_reasons = evaluate_subjects(
        row["requirement_rule_kind"], subjects, selection, selection_complete)
    reasons += subject_reasons
    if row["admission_type_inferred"]:
        reasons.append("ADMISSION_TYPE_INFERRED")

    # Hard budget is only enforceable once the tuition unit is settled. Until then the
    # amount is displayed but never excludes or passes an offering silently.
    preference = "PASS"
    if args.budget is not None:
        if not args.assume_tuition_rmb_per_year or row["tuition_amount"] is None:
            preference = "UNKNOWN"
            reasons.append("TUITION_UNKNOWN")
        elif row["tuition_amount"] > args.budget:
            preference = "FAIL"
            reasons.append("HARD_PREFERENCE_EXCLUDED")

    academic_reason = None
    if args.rank is None:
        academic_reason = "NO_OBSERVED_SCORE"
    else:
        academic_reason = None

    references = {}
    for year in REFERENCE_YEARS:
        rank = row[f"major_rank_{year}"]
        score = row[f"major_score_{year}"]
        if rank is None and score is None:
            references[year] = empty_reference("MAJOR_HISTORY_MISSING")
            continue
        if rank is None:
            references[year] = {"relation": "NOT_COMPARABLE", "reference_year": year,
                                "reference_rank": None, "reference_score": score,
                                "reason_codes": ["NO_OBSERVED_SCORE"]}
            continue
        if academic_reason:
            references[year] = {"relation": "NOT_COMPARABLE", "reference_year": year,
                                "reference_rank": rank, "reference_score": score,
                                "reason_codes": [academic_reason]}
            continue
        if row["history_source_conflict"]:
            references[year] = {"relation": "NOT_COMPARABLE", "reference_year": year,
                                "reference_rank": rank, "reference_score": score,
                                "reason_codes": ["SOURCE_CONFLICT"]}
            continue
        references[year] = {"relation": compare_rank(args.rank, rank), "reference_year": year,
                            "reference_rank": rank, "reference_score": score, "reason_codes": []}

    return {
        "offering_id": row["offering_id"],
        "institution_code": row["institution_code"],
        "institution_name": row["canonical_name"],
        "province": row["province"], "city": row["city"], "city_tier": row["city_tier"],
        "institution_type": row["institution_type"], "ownership": row["ownership"],
        "institution_ranking": row["institution_ranking"], "academic_grade": row["academic_grade"],
        "group_code": row["group_code"], "batch": row["batch"],
        "admission_type": row["admission_type"], "admission_type_inferred": row["admission_type_inferred"],
        "major_code": row["major_code"], "major_name": row["major_name"],
        "major_note": row["major_note"],
        "category": row["category"], "category_class": row["category_class"],
        "degree_level": row["degree_level"], "level_label": row["level_label"],
        "is_new": bool(row["is_new"]), "plan_count": row["plan_count"],
        "tuition_amount": row["tuition_amount"], "tuition_raw": row["tuition_raw"],
        "tuition_note": row["tuition_note"], "tuition_comparable": bool(row["tuition_comparable"]),
        "requirement_raw": row["requirement_raw"],
        "requirement_rule_kind": row["requirement_rule_kind"],
        "requirement_subjects": [SUBJECT_CODES.get(item, item) for item in subjects],
        "requirement_parse_status": row["requirement_parse_status"],
        "eligibility": eligibility,
        "preference_status": preference,
        "reference_2025": references[2025],
        "reference_2024": references[2024],
        "reference_2023": references[2023],
        "major_rank_2025": row["major_rank_2025"], "major_rank_2024": row["major_rank_2024"],
        "major_rank_2023": row["major_rank_2023"],
        "source_id": row["source_id"], "source_row": row["source_row"],
        "reason_codes": unique_reasons(reasons),
    }


def history_position(candidate: dict) -> float | None:
    """Signed distance to the nearest earlier-year boundary; used only for ordering."""
    best = None
    for year in REFERENCE_YEARS:
        reference = candidate[f"reference_{year}"]
        rank = reference["reference_rank"]
        if reference["relation"] == "NOT_COMPARABLE" or rank is None:
            continue
        distance = abs(candidate["_rank"] - rank)
        best = distance if best is None else min(best, distance)
    return best


def sort_candidates(candidates: list[dict], args) -> list[dict]:
    eligibility_order = {"PASS": 0, "UNKNOWN": 1}

    def key(candidate: dict):
        category_priority = 0
        if args.prefer_category:
            try:
                category_priority = args.prefer_category.index(candidate["category"])
            except ValueError:
                category_priority = len(args.prefer_category)
        selected = None
        if args.sort == "history_position":
            selected = history_position(candidate)
        return (
            eligibility_order[candidate["eligibility"]],
            category_priority,
            selected is None,  # entries without a comparable boundary go last
            selected if selected is not None else 0,
            candidate["offering_id"],
        )

    return sorted(candidates, key=key)


def format_text(candidates: list[dict], args, notes: list[str]) -> str:
    lines = []
    for note in notes:
        lines.append(f"注：{note}")
    if lines:
        lines.append("")
    lines.append(f"共 {len(candidates)} 条候选（显示前 {min(len(candidates), args.limit)} 条）")
    lines.append("")
    for index, item in enumerate(candidates[: args.limit], start=1):
        references = []
        for year in REFERENCE_YEARS:
            reference = item[f"reference_{year}"]
            if reference["relation"] == "NOT_COMPARABLE":
                label = "无法比较"
            elif reference["relation"] == "AHEAD_OF_REFERENCE":
                label = "高于参考"
            elif reference["relation"] == "BEHIND_REFERENCE":
                label = "低于参考"
            else:
                label = "接近参考"
            boundary = reference["reference_rank"]
            visible = f"{label}({boundary})" if boundary is not None else label
            references.append(f"{year}:{visible}")
        tuition = item["tuition_raw"] if item["tuition_raw"] is not None else "未知"
        plan = item["plan_count"] if item["plan_count"] is not None else "未知"
        lines.append(
            f"{index:>3}. [{item['eligibility']}] {item['institution_name']}"
            f"（{item['institution_code']}）专业组{item['group_code']} {item['major_name']}"
            f"（{item['major_code']}）")
        lines.append(
            f"      {item['batch']} / {item['admission_type']} / {item['level_label']}"
            f" / {item['category'] or '未标门类'}"
            f" | 计划{plan}人 | 学费{tuition}"
            + ("（口径未核实）" if not item["tuition_comparable"] else "")
            + f" | 选科：{item['requirement_raw'] or '未标'}")
        lines.append(f"      历史最低位次 {'  '.join(references)}"
                     + (f" | 提示 {','.join(item['reason_codes'])}" if item["reason_codes"] else ""))
    return "\n".join(lines)


def format_csv(candidates: list[dict], args) -> str:
    buffer = io.StringIO()
    fieldnames = ["institution_code", "institution_name", "province", "city", "batch", "group_code",
                  "major_code", "major_name", "category", "category_class", "level_label",
                  "plan_count", "tuition_raw", "requirement_raw", "eligibility",
                  "preference_status", "major_rank_2025", "major_rank_2024", "major_rank_2023",
                  "relation_2025", "relation_2024", "relation_2023", "reason_codes",
                  "source_id", "source_row", "offering_id"]
    writer = csv.DictWriter(buffer, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for item in candidates[: args.limit]:
        writer.writerow({
            **item,
            "relation_2025": item["reference_2025"]["relation"],
            "relation_2024": item["reference_2024"]["relation"],
            "relation_2023": item["reference_2023"]["relation"],
            "reason_codes": ",".join(item["reason_codes"]),
            "requirement_raw": item["requirement_raw"] or "",
        })
    return buffer.getvalue()


def show_stats(connection: sqlite3.Connection) -> int:
    connection.row_factory = sqlite3.Row
    stats = {key: value for key, value in connection.execute("SELECT key, value FROM meta")}
    counts = {}
    for table in ("source_document", "institution", "admission_group", "offering",
                  "plan_record", "admission_observation", "requirement", "data_issue",
                  "score_distribution", "score_distribution_row"):
        counts[table] = connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    by_track = dict(connection.execute(
        "SELECT track, COUNT(*) FROM admission_group GROUP BY track"))
    by_metric = dict(connection.execute(
        "SELECT metric_type, COUNT(*) FROM admission_observation GROUP BY metric_type"))
    issues = dict(connection.execute(
        "SELECT issue_code, COUNT(*) FROM data_issue GROUP BY issue_code ORDER BY issue_code"))
    distributions = [dict(row) for row in connection.execute(
        "SELECT distribution_id, year, track, curriculum_system, score_min, score_max, row_count, "
        "cumulative_at_lowest, head_group_above_max, verification_status, score_basis, "
        "score_basis_status, extraction_method, source_id, source_url, retrieved_at "
        "FROM score_distribution ORDER BY year DESC, track")]
    payload = {"meta": stats, "counts": counts, "groups_by_track": by_track,
               "observations_by_metric": by_metric, "issue_codes": issues,
               "score_distributions": distributions}
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--stats", action="store_true", help="print database summary and exit")
    parser.add_argument("--track", help="物理 or 历史")
    parser.add_argument("--subjects", help="two of 化学,生物,政治,地理, e.g. 化学,生物")
    parser.add_argument("--rank", type=int, help="student province rank (positive integer)")
    parser.add_argument("--score", type=int,
                        help="student score as a whole number; resolved to a rank interval "
                             "through the official 2026 score-distribution table")
    parser.add_argument("--score-year", type=int, default=2026,
                        help="year of the score-distribution table used for --score (default 2026)")
    parser.add_argument("--batch", action="append", help="filter by batch (repeatable)")
    parser.add_argument("--level", action="append", help="filter by 本科/专科/职教本科 (repeatable)")
    parser.add_argument("--category", action="append", help="filter by 门类 (repeatable)")
    parser.add_argument("--institution-province", action="append", help="filter by 院校所在省")
    parser.add_argument("--admission-type", action="append", help="filter by 计划类别")
    parser.add_argument("--exclude-inferred-admission-type", action="store_true",
                        help="drop rows whose 计划类别 was blank and inferred as 普通类")
    parser.add_argument("--budget", type=float, help="hard tuition budget")
    parser.add_argument("--assume-tuition-rmb-per-year", action="store_true",
                        help="treat tuition amounts as RMB per year so --budget can exclude; "
                             "this assumption is unverified and is labelled in the output")
    parser.add_argument("--prefer-category", action="append",
                        help="user direction priority by 门类; earlier is preferred")
    parser.add_argument("--min-plan-count", type=int)
    parser.add_argument("--max-plan-count", type=int)
    parser.add_argument("--exclude-new", action="store_true", help="drop rows marked 新增")
    parser.add_argument("--has-history", action="store_true",
                        help="keep only offerings with at least one earlier-year rank or score")
    parser.add_argument("--sort", choices=["default", "history_position"], default="default")
    parser.add_argument("--limit", type=int, default=30)
    parser.add_argument("--format", choices=["text", "json", "csv"], default="text")
    parser.add_argument("--output", type=Path, help="write the result to this file")
    args = parser.parse_args()

    if not args.db.exists():
        raise SystemExit(
            f"Database not found: {args.db}\n"
            "Build it first: py -3.12 pipelines/task03/build_admissions_db.py")
    if args.rank is not None and args.rank < 1:
        raise SystemExit("--rank must be a positive integer")
    if args.limit < 1:
        raise SystemExit("--limit must be at least 1")

    connection = sqlite3.connect(f"file:{args.db}?mode=ro", uri=True)
    try:
        if args.stats:
            return show_stats(connection)
        if not args.track:
            raise SystemExit("--track is required (物理 or 历史). Use --stats for a summary.")
        track = TRACKS.get(args.track)
        if track is None:
            raise SystemExit(f"Unknown track: {args.track}. Use 物理 or 历史.")
        selection, selection_complete = parse_subjects(args.subjects)

        # A supplied score is resolved through the official score-distribution table; the
        # student's own rank, when given, is never overwritten by it.
        rank_lookup = None
        if args.score is not None:
            rank_lookup = locate_rank(connection, track, args.score, args.score_year)
        effective_rank = args.rank
        if effective_rank is None and rank_lookup and rank_lookup["status"] == "located":
            # Use the interior of the interval so a comparison is not biased by either edge.
            effective_rank = rank_lookup["rank_interval"][0]
        compare_args = argparse.Namespace(**{**vars(args), "rank": effective_rank})

        notes = []
        if args.score is not None:
            notes.append(format_rank_lookup_note(rank_lookup, args))
        if args.rank is not None:
            notes.append(f"使用考生提供的位次 {args.rank} 进行比较。")
        if effective_rank is None:
            notes.append("未提供可用位次，历史关系一律为“无法比较”（NO_OBSERVED_SCORE）。")
        elif not selection_complete:
            notes.append("未提供完整选科（物理/历史 + 两门），资格判定保持 UNKNOWN。")
        if args.budget is not None and not args.assume_tuition_rmb_per_year:
            notes.append("学费币种与计费周期未核实，--budget 不作为排除条件，仅标记 TUITION_UNKNOWN。")
        elif args.budget is not None:
            notes.append("已假定学费为人民币/学年；该假定未经来源核实，结果按此假定标注。")

        rows = load_rows(connection, track, args)
        candidates = []
        for row in rows:
            candidate = build_candidate(row, compare_args, selection, selection_complete)
            candidate["_rank"] = effective_rank
            if candidate["eligibility"] == "FAIL" or candidate["preference_status"] == "FAIL":
                continue
            candidates.append(candidate)
        candidates = sort_candidates(candidates, args)

        if args.format == "json":
            payload = {
                "query": {
                    "track": args.track, "subjects": args.subjects, "rank": args.rank,
                    "score": args.score, "score_year": args.score_year,
                    "batch": args.batch, "level": args.level,
                    "category": args.category, "budget": args.budget,
                    "budget_enforced": bool(args.budget and args.assume_tuition_rmb_per_year),
                    "prefer_category": args.prefer_category, "sort": args.sort,
                    "effective_rank": effective_rank,
                    "rank_source": ("user_provided_rank" if args.rank is not None
                                    else "score_distribution_table" if effective_rank is not None
                                    else "none"),
                },
                "score_to_rank": rank_lookup,
                "notes": notes,
                "matched_count": len(candidates),
                "candidates": [{key: value for key, value in item.items() if key != "_rank"}
                               for item in candidates[: args.limit]],
            }
            text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
        elif args.format == "csv":
            text = format_csv(candidates, args)
        else:
            text = format_text(candidates, args, notes) + "\n"

        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(text, encoding="utf-8")
            print(f"Wrote {min(len(candidates), args.limit)} of {len(candidates)} candidates "
                  f"to {args.output}")
        else:
            sys.stdout.write(text)
        return 0
    finally:
        connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
