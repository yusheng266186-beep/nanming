"""Export the static release the student page reads.

Reads `data/quality-huixi/quality-huixi.sqlite` (never the workbook) and writes
`data/quality-huixi/release/`:

  manifest.json   release identity, parser commit, source hash, counts, per-file SHA-256
  index.json      everything shared by all students: exam list, lines, grade and class
                  aggregates, knowledge summaries, data health. No names, no codes.
  shards/<id>.json  one file per student, named by the SHA-256 prefix of their 6-digit code.

A shard carries only that student's own rows plus the anonymous aggregates needed to draw
comparisons. Class-critical lists stay in the database: a shard must never name classmates.

Code strength is a known, documented limit: a 6-digit space can be brute-forced offline by anyone
who holds this release, so the enhanced mode must not be exposed to the internet as-is. The page
treats a shard's presence as proof of the code, which is exactly why this stays local.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

APP = Path(__file__).resolve().parents[2]
DATABASE = APP / "data/quality-huixi/quality-huixi.sqlite"
RELEASE = APP / "data/quality-huixi/release"
SCHEMA_VERSION = "1.0.0"
RELEASE_PREFIX = "RX-2024"
CHUNK = 400


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def code_shard_id(code6_sha256: str) -> str:
    """Shard file name for one student.

    Only the code hash is published; the page hashes what the student typed and requests the
    matching name. The mapping cannot be reversed from the release alone without enumerating the
    6-digit space, which is why this stays a local-only deployment.
    """
    return code6_sha256[:40]


def rows_as_dicts(connection: sqlite3.Connection, query: str, params: tuple = ()) -> list[dict]:
    cursor = connection.execute(query, params)
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def rank_within(entries: list[tuple[int, float]]) -> dict[int, int]:
    """Competition ranking on total, descending; ties share the best rank."""
    ordered = sorted(entries, key=lambda item: -item[1])
    ranks: dict[int, int] = {}
    for index, (person_pk_value, total) in enumerate(ordered):
        if index and total == ordered[index - 1][1]:
            ranks[person_pk_value] = ranks[ordered[index - 1][0]]
        else:
            ranks[person_pk_value] = index + 1
    return ranks


def masker(connection: sqlite3.Connection):
    """Build a name→masked map so published issue text cannot expose a classmate's name."""
    names = [row[0] for row in connection.execute(
        "SELECT DISTINCT display_name FROM person WHERE LENGTH(display_name) >= 2")]
    names.sort(key=len, reverse=True)
    table = {name: name[0] + "＊" * (len(name) - 1) for name in names}

    def mask(value: str | None) -> str | None:
        if not value:
            return value
        for name in names:
            if name in value:
                value = value.replace(name, table[name])
        return value

    return mask


def redact_conflicts(rows: list[dict], mask) -> list[dict]:
    """Conflict rows keep the count and the resolution; the key is a name-bearing string."""
    return [{"resolution": row["resolution"], "candidates": row["candidates"],
             "note": mask(row["note"])} for row in rows]


def build_index(connection: sqlite3.Connection, meta: dict, meta_rows: dict,
                created_at: str) -> dict:
    exams = rows_as_dicts(connection, """
        SELECT e.exam_pk, e.exam_code, e.ordinal, e.raw_labels, e.is_order_known, e.student_rows,
               t.track, t.students, t.top_eligible, t.undergraduate_eligible, t.top_count,
               t.top_rate, t.undergraduate_count, t.undergraduate_rate
        FROM exam e LEFT JOIN exam_track_summary t ON t.exam_pk = e.exam_pk
        ORDER BY e.ordinal, t.track""")
    thresholds = rows_as_dicts(connection, """
        SELECT e.exam_code, t.track, t.top_total, t.undergraduate_total
        FROM threshold t JOIN exam e ON e.exam_pk = t.exam_pk ORDER BY e.ordinal, t.track""")
    threshold_subjects = rows_as_dicts(connection, """
        SELECT e.exam_code, s.track, s.tier, s.subject, s.line
        FROM threshold_subject s JOIN exam e ON e.exam_pk = s.exam_pk
        ORDER BY e.ordinal, s.track, s.tier, s.subject""")
    trend = rows_as_dicts(connection, """
        SELECT e.exam_code, t.students, t.average, t.top_count, t.undergraduate_count
        FROM trend_point t JOIN exam e ON e.exam_pk = t.exam_pk ORDER BY e.ordinal""")
    classes = rows_as_dicts(connection, """
        SELECT e.exam_code, c.class_no, c.label, c.track, c.class_type, c.students, c.average,
               c.top_count, c.top_rate, c.top_metric_status, c.undergraduate_count,
               c.undergraduate_rate, c.undergraduate_metric_status, c.subject_averages
        FROM class_summary c JOIN exam e ON e.exam_pk = c.exam_pk
        ORDER BY e.ordinal, c.class_no""")
    benchmarks = rows_as_dicts(connection, """
        SELECT e.exam_code, b.class_no, b.peer_group, b.peer_average, b.average_delta,
               b.peer_top_rate, b.top_rate_delta, b.peer_undergraduate_rate,
               b.undergraduate_rate_delta, b.peer_rank, b.peer_size
        FROM class_benchmark b JOIN exam e ON e.exam_pk = b.exam_pk
        ORDER BY e.ordinal, b.class_no""")
    class_subjects = rows_as_dicts(connection, """
        SELECT e.exam_code, s.class_no, s.subject, s.students, s.average, s.max,
               s.top_effective_count, s.top_effective_rate, s.undergraduate_effective_count,
               s.undergraduate_effective_rate, s.effective_line, s.effective_rate
        FROM class_subject_summary s JOIN exam e ON e.exam_pk = s.exam_pk
        ORDER BY e.ordinal, s.class_no, s.subject""")
    subjects = rows_as_dicts(connection, """
        SELECT e.exam_code, s.subject, s.students, s.average, s.max, s.top_eligible,
               s.undergraduate_eligible, s.top_effective_count, s.top_effective_rate,
               s.undergraduate_effective_count, s.undergraduate_effective_rate,
               s.effective_line, s.effective_rate
        FROM subject_summary s JOIN exam e ON e.exam_pk = s.exam_pk
        ORDER BY e.ordinal, s.subject""")
    segments = rows_as_dicts(connection, """
        SELECT e.exam_code, s.segment_id, s.label, s.intent, s.student_count, s.rate, s.average
        FROM score_segment s JOIN exam e ON e.exam_pk = s.exam_pk
        ORDER BY e.ordinal, s.segment_id""")
    distributions = rows_as_dicts(connection, """
        SELECT e.exam_code, d.bin_label, d.start, d.end, d.student_count, d.rate
        FROM exam_distribution d JOIN exam e ON e.exam_pk = d.exam_pk
        ORDER BY e.ordinal, d.start""")
    knowledge = rows_as_dicts(connection, """
        SELECT e.exam_code, k.subject, k.knowledge, k.question_count, k.response_count,
               k.earned, k.possible, k.rate, k.priority
        FROM knowledge_summary k JOIN exam e ON e.exam_pk = k.exam_pk
        ORDER BY e.ordinal, k.subject, k.rate""")
    insights = rows_as_dicts(connection, """
        SELECT e.exam_code, i.insight_id, i.tone, i.title, i.finding, i.action
        FROM insight i JOIN exam e ON e.exam_pk = i.exam_pk ORDER BY e.ordinal, i.insight_id""")
    recommendations = rows_as_dicts(connection, """
        SELECT e.exam_code, r.ordinal, r.text FROM recommendation r JOIN exam e ON e.exam_pk = r.exam_pk
        ORDER BY e.ordinal, r.ordinal""")
    methodology = [row["text"] for row in rows_as_dicts(
        connection, "SELECT text FROM methodology ORDER BY ordinal")]
    fields = rows_as_dicts(connection, """
        SELECT field, column_index, header, strategy, confidence FROM field_match ORDER BY rowid""")
    capabilities = rows_as_dicts(connection, """
        SELECT capability_id, label, available, confidence, reason FROM capability ORDER BY rowid""")
    profile = rows_as_dicts(connection, "SELECT * FROM data_profile")[0]
    mask = masker(connection)
    issues = [dict(row, message=mask(row["message"]), raw_value=mask(row["raw_value"]))
              for row in rows_as_dicts(connection, """
        SELECT issue_code, level, module, exam_code, field, state, raw_value, message,
               affected_count FROM data_issue ORDER BY issue_pk""")]
    conflicts = redact_conflicts(rows_as_dicts(connection, """
        SELECT conflict_key, resolution, candidates, note FROM score_conflict
        ORDER BY conflict_pk"""), mask)
    class_profiles = []
    seen = set()
    for row in rows_as_dicts(connection, """
            SELECT class_no, class_label, track, combination, class_type,
                   COUNT(*) AS students FROM person GROUP BY class_no
            ORDER BY class_no"""):
        if row["class_no"] in seen:
            continue
        seen.add(row["class_no"])
        class_profiles.append(row)

    issue_counts: dict[str, int] = {}
    for issue in issues:
        issue_counts[issue["issue_code"]] = issue_counts.get(issue["issue_code"], 0) + 1

    return {
        "element": "nanming-quality-huixi-index",
        "schemaVersion": SCHEMA_VERSION,
        "releaseId": meta["releaseId"],
        "createdAt": created_at,
        "school": meta["school"],
        "parserRepo": meta["parserRepo"],
        "parserCommit": meta["parserCommit"],
        "sourceWorkbook": meta["sourceWorkbook"],
        "sourceWorkbookBytes": meta["sourceWorkbookBytes"],
        "datasetSha256": meta["datasetSha256"],
        "identityRule": meta_rows.get("identity_rule", ""),
        "counts": {
            "persons": connection.execute("SELECT COUNT(*) FROM person").fetchone()[0],
            "observations": connection.execute("SELECT COUNT(*) FROM score_observation").fetchone()[0],
            "itemResponses": connection.execute("SELECT COUNT(*) FROM item_response").fetchone()[0],
            "questions": connection.execute("SELECT COUNT(*) FROM question").fetchone()[0],
            "knowledgeRows": connection.execute("SELECT COUNT(*) FROM knowledge_student").fetchone()[0],
            "exams": connection.execute("SELECT COUNT(*) FROM exam").fetchone()[0],
        },
        "scoreBasis": {
            "total": "赋分总分（学生基础表「总分/赋分」）",
            "subject": "语数外为原分；物理/历史为原分；化学/生物/政治/地理为赋分",
            "lines": "一本（特控）/本科线按考试与科类取自学生基础表",
            "rank": "页面位次按本数据重算：同一考试、同一科类内按赋分总分降序，并列同名次。"
                    "工作簿自带的校赋名在不同考试语义不一致（21/33/51 为年级位次，"
                    "4册/41/43/2册/3册/4半 为班内位次，入口/1册/4月 两者都不是），"
                    "因此不直接展示；源位次保留在库内并在 data_issue 中记录差异。",
        },
        "exams": exams,
        "thresholds": thresholds,
        "thresholdSubjects": threshold_subjects,
        "trend": trend,
        "classes": classes,
        "classBenchmarks": benchmarks,
        "classSubjects": class_subjects,
        "subjects": subjects,
        "segments": segments,
        "distributions": distributions,
        "knowledge": knowledge,
        "insights": insights,
        "recommendations": recommendations,
        "methodology": methodology,
        "dataProfile": profile,
        "fieldMatches": fields,
        "capabilities": capabilities,
        "issueCounts": issue_counts,
        "issues": issues,
        "conflicts": conflicts,
        "classProfiles": class_profiles,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Export the 荣县一中 student release.")
    parser.add_argument("--database", type=Path, default=DATABASE)
    parser.add_argument("--release", type=Path, default=RELEASE)
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    connection = sqlite3.connect(args.database)
    connection.row_factory = sqlite3.Row
    meta_rows = {row["key"]: row["value"] for row in connection.execute("SELECT key, value FROM meta")}
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    person_count = connection.execute("SELECT COUNT(*) FROM person").fetchone()[0]
    dataset_sha = meta_rows["dataset_sha256"]
    meta = {
        "releaseId": f"{RELEASE_PREFIX}-{dataset_sha[:10]}",
        "school": meta_rows["school"],
        "parserRepo": meta_rows["parser_repo"],
        "parserCommit": meta_rows["parser_commit"],
        "sourceWorkbook": meta_rows["source_workbook"],
        "sourceWorkbookBytes": int(meta_rows["source_workbook_bytes"]),
        "datasetSha256": dataset_sha,
    }

    index = build_index(connection, meta, meta_rows, created_at)

    # Grade and class ranks per exam, keyed by person so a shard can read them directly.
    rank_by_exam: dict[str, dict[int, dict[str, int]]] = {}
    for exam_row in connection.execute("SELECT exam_pk, exam_code FROM exam ORDER BY ordinal"):
        exam_pk, exam_code = exam_row["exam_pk"], exam_row["exam_code"]
        rows = connection.execute(
            "SELECT person_pk, total, class_no, track FROM score_observation "
            "WHERE exam_pk = ?", (exam_pk,)).fetchall()
        per_track: dict[str, list[tuple[int, float]]] = {}
        per_class: dict[tuple[str, int], list[tuple[int, float]]] = {}
        for row in rows:
            per_track.setdefault(row["track"], []).append((row["person_pk"], row["total"]))
            per_class.setdefault((row["track"], row["class_no"]), []).append(
                (row["person_pk"], row["total"]))
        ranks: dict[int, dict[str, int]] = {}
        for entries in per_track.values():
            for person_pk_value, rank in rank_within(entries).items():
                ranks.setdefault(person_pk_value, {})["grade"] = rank
                ranks[person_pk_value]["gradeSize"] = len(entries)
        for entries in per_class.values():
            for person_pk_value, rank in rank_within(entries).items():
                ranks.setdefault(person_pk_value, {})["class"] = rank
                ranks[person_pk_value]["classSize"] = len(entries)
        rank_by_exam[exam_code] = ranks

    threshold_by_exam_track: dict[tuple[str, str], dict] = {
        (row["exam_code"], row["track"]): {"topTotal": row["top_total"],
                                          "undergraduateTotal": row["undergraduate_total"]}
        for row in connection.execute("""
            SELECT e.exam_code, t.track, t.top_total, t.undergraduate_total
            FROM threshold t JOIN exam e ON e.exam_pk = t.exam_pk""")
    }
    subject_line: dict[tuple[str, str, str, str], float] = {
        (row["exam_code"], row["track"], row["tier"], row["subject"]): row["line"]
        for row in connection.execute("""
            SELECT e.exam_code, s.track, s.tier, s.subject, s.line
            FROM threshold_subject s JOIN exam e ON e.exam_pk = s.exam_pk""")
    }
    grade_knowledge: dict[tuple[str, str, str], dict] = {
        (row["exam_code"], row["subject"], row["knowledge"]): {
            "rate": row["rate"], "priority": row["priority"], "responseCount": row["response_count"]}
        for row in connection.execute("""
            SELECT e.exam_code, k.subject, k.knowledge, k.rate, k.priority, k.response_count
            FROM knowledge_summary k JOIN exam e ON e.exam_pk = k.exam_pk""")
    }
    class_subject_average: dict[tuple[str, int, str], dict] = {
        (row["exam_code"], row["class_no"], row["subject"]): {
            "average": row["average"], "effectiveRate": row["effective_rate"],
            "undergraduateEffectiveRate": row["undergraduate_effective_rate"]}
        for row in connection.execute("""
            SELECT e.exam_code, s.class_no, s.subject, s.average, s.effective_rate,
                   s.undergraduate_effective_rate
            FROM class_subject_summary s JOIN exam e ON e.exam_pk = s.exam_pk""")
    }
    grade_subject_average: dict[tuple[str, str], dict] = {
        (row["exam_code"], row["subject"]): {
            "average": row["average"], "effectiveRate": row["effective_rate"],
            "undergraduateEffectiveRate": row["undergraduate_effective_rate"],
            "students": row["students"]}
        for row in connection.execute("""
            SELECT e.exam_code, s.subject, s.average, s.effective_rate,
                   s.undergraduate_effective_rate, s.students
            FROM subject_summary s JOIN exam e ON e.exam_pk = s.exam_pk""")
    }
    exam_order = {row["exam_code"]: row["ordinal"] for row in connection.execute(
        "SELECT exam_code, ordinal FROM exam")}
    exam_raw = {row["exam_code"]: row["raw_labels"] for row in connection.execute(
        "SELECT exam_code, raw_labels FROM exam")}

    shard_dir = args.release / "shards"
    if shard_dir.exists():
        for old in shard_dir.glob("*.json"):
            old.unlink()
    shard_dir.mkdir(parents=True, exist_ok=True)
    shard_index: dict[str, str] = {}

    persons = connection.execute("""
        SELECT p.person_pk, p.public_id, p.display_name, p.track, p.combination, p.class_no,
               p.class_label, p.class_type, p.exam_count, c.code6_sha256
        FROM person p JOIN person_code c ON c.person_pk = p.person_pk ORDER BY p.person_pk""").fetchall()
    for person in persons:
        person_pk_value = person["person_pk"]
        observations = connection.execute("""
            SELECT e.exam_code, o.class_no, o.track, o.total, o.city_rank, o.school_rank,
                   o.subject_present, o.subject_expected
            FROM score_observation o JOIN exam e ON e.exam_pk = o.exam_pk
            WHERE o.person_pk = ? ORDER BY e.ordinal""", (person_pk_value,)).fetchall()
        subjects = connection.execute("""
            SELECT e.exam_code, s.subject, s.value, s.state
            FROM subject_score s
            JOIN score_observation o ON o.observation_pk = s.observation_pk
            JOIN exam e ON e.exam_pk = o.exam_pk
            WHERE o.person_pk = ? ORDER BY e.ordinal, s.subject""", (person_pk_value,)).fetchall()
        knowledge = connection.execute("""
            SELECT e.exam_code, k.subject, k.knowledge, k.earned, k.possible, k.rate,
                   k.question_responses
            FROM knowledge_student k JOIN exam e ON e.exam_pk = k.exam_pk
            WHERE k.person_pk = ? ORDER BY e.ordinal, k.subject, k.rate""",
            (person_pk_value,)).fetchall()
        by_exam_subject: dict[tuple[str, str], list[dict]] = {}
        subjects_by_exam: dict[str, list[dict]] = {}
        track_by_exam = {row["exam_code"]: row["track"] for row in observations}
        for row in subjects:
            track = track_by_exam.get(row["exam_code"], person["track"])
            subjects_by_exam.setdefault(row["exam_code"], []).append({
                "subject": row["subject"],
                "value": row["value"],
                "state": row["state"],
                "topLine": subject_line.get((row["exam_code"], track, "top", row["subject"])),
                "undergraduateLine": subject_line.get(
                    (row["exam_code"], track, "undergraduate", row["subject"])),
                "gradeAverage": (grade_subject_average.get((row["exam_code"], row["subject"])) or {}).get("average"),
                "classAverage": (class_subject_average.get(
                    (row["exam_code"], person["class_no"], row["subject"])) or {}).get("average"),
            })
        for row in knowledge:
            track = track_by_exam.get(row["exam_code"], person["track"])
            baseline = grade_knowledge.get((row["exam_code"], row["subject"], row["knowledge"])) or {}
            by_exam_subject.setdefault((row["exam_code"], row["subject"]), []).append({
                "knowledge": row["knowledge"],
                "earned": row["earned"],
                "possible": row["possible"],
                "rate": row["rate"],
                "questionResponses": row["question_responses"],
                "gradeRate": baseline.get("rate"),
                "priority": baseline.get("priority"),
            })
        exam_rows = []
        for observation in observations:
            exam_code = observation["exam_code"]
            ranks = (rank_by_exam.get(exam_code) or {}).get(person_pk_value, {})
            row_track = observation["track"]
            lines = threshold_by_exam_track.get((exam_code, row_track), {})
            exam_rows.append({
                "exam": exam_code,
                "rawLabel": exam_raw.get(exam_code, exam_code),
                "ordinal": exam_order.get(exam_code),
                "classNo": observation["class_no"],
                "track": row_track,
                "trackDiffersFromHome": row_track != person["track"],
                "total": observation["total"],
                "cityRank": observation["city_rank"],
                "schoolRank": observation["school_rank"],
                "classRank": ranks.get("class"),
                "classSize": ranks.get("classSize"),
                "gradeRank": ranks.get("grade"),
                "gradeSize": ranks.get("gradeSize"),
                "sourceSchoolRank": observation["school_rank"],
                "sourceCityRank": observation["city_rank"],
                "sourceRankNote": ("工作簿自带的校赋名在不同考试语义不一致，"
                                   "以 gradeRank（本数据重算）为准。"),
                "topTotal": lines.get("topTotal"),
                "undergraduateTotal": lines.get("undergraduateTotal"),
                "topDiff": (observation["total"] - lines["topTotal"]
                            if lines.get("topTotal") is not None else None),
                "undergraduateDiff": (observation["total"] - lines["undergraduateTotal"]
                                      if lines.get("undergraduateTotal") is not None else None),
                "subjectPresent": observation["subject_present"],
                "subjectExpected": observation["subject_expected"],
                "subjects": subjects_by_exam.get(exam_code, []),
                "knowledge": [
                    {"subject": key[1], "areas": areas}
                    for key, areas in sorted(by_exam_subject.items()) if key[0] == exam_code
                ],
            })
        shard = {
            "element": "nanming-quality-huixi-student",
            "schemaVersion": SCHEMA_VERSION,
            "releaseId": meta["releaseId"],
            "createdAt": created_at,
            "school": meta["school"],
            "person": {
                "publicId": person["public_id"],
                "name": person["display_name"],
                "track": person["track"],
                "combination": person["combination"],
                "classNo": person["class_no"],
                "classLabel": person["class_label"],
                "classType": person["class_type"],
                "examCount": person["exam_count"],
            },
            "exams": exam_rows,
            "notes": [
                "本页只包含你本人的成绩行与班级、年级的匿名汇总；不包含任何同学姓名。",
                "总分口径为赋分总分；语数外与物理/历史为原分，化学/生物/政治/地理为赋分。",
                "历年原始均分不等于教学增值；考试难度、满分与赋分规则未确认一致时不做趋势结论。",
                "位次与线差只描述你在本校范围内的相对位置，不是录取概率。",
            ],
        }
        target = shard_dir / f"{code_shard_id(person['code6_sha256'])}.json"
        target.write_text(json.dumps(shard, ensure_ascii=False, separators=(",", ":")),
                          encoding="utf-8")
        shard_index[person["public_id"]] = target.name

    args.release.mkdir(parents=True, exist_ok=True)
    (args.release / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    files = ["index.json"] + [f"shards/{name}" for name in sorted(shard_index.values())]
    manifest = {
        "element": "nanming-quality-huixi-release",
        "schemaVersion": SCHEMA_VERSION,
        "releaseId": meta["releaseId"],
        "createdAt": created_at,
        "school": meta["school"],
        "parserCommit": meta["parserCommit"],
        "sourceWorkbook": meta["sourceWorkbook"],
        "datasetSha256": meta["datasetSha256"],
        "counts": index["counts"],
        "shardCount": len(shard_index),
        "shardNaming": "shards/<sha256(6位验证码)[:40]>.json",
        "codeStrength": "6位数字可被离线穷举；仅限本机/校内演示，上线前必须改为服务端校验与限流",
        "sha256": {name: sha256_file(args.release / name) for name in files},
    }
    (args.release / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    # Cleanup: shard_index is only for the manifest's counts; it must never be published.
    payload = {
        "release": str(args.release),
        "releaseId": meta["releaseId"],
        "persons": person_count,
        "shards": len(shard_index),
        "index_bytes": (args.release / "index.json").stat().st_size,
        "manifest_entries": len(files),
    }
    if not args.quiet:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    connection.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
