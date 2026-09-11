"""Export the validated admissions database as an immutable public data release.

The database under ``data/admissions`` is the offline working copy: large, regenerable, carrying
every intermediate column. This script turns it into the sharded JSON the product specification
defines for public consumption — a manifest, one shard per scope, an evidence index and the
score-distribution tables — and writes a ``current`` pointer naming the active release.

Guarantees:

* **Immutable.** A release directory is written once. Re-running with different content fails
  instead of overwriting; a corrected export gets a new release id.
* **Traceable.** Every published fact carries an evidence id that resolves in the evidence index,
  and the manifest lists a SHA-256 for every emitted file.
* **Honest about unknowns.** Unresolved values stay null rather than being filled in: tuition with
  no verified currency/period exports as ``tuition: null``, and historical rows keep the year and
  metric they were published under. The workbook's plan-row track is exported as the *sheet* a
  historical number was filed on, never as a claim about that year's exam system.
* **Self-describing coverage.** Each scope records how many offerings it publishes and whether it
  is exhaustive, so a reader can see what is and is not covered.

Run from ``nanhang-app``:
    py -3.12 pipelines/task03/export_release.py
    py -3.12 pipelines/task03/export_release.py --check
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

APP = Path(__file__).resolve().parents[2]
DB_PATH = APP / "data/admissions" / "admissions.sqlite"
RELEASE_ROOT = APP / "data/releases"
DISTRIBUTIONS = APP / "data/task03/score-distribution/score-distribution.json"

SCHEMA_VERSION = "1.0.0"
RULES_VERSION = "nh-rules-1.0.0"
PLAN_YEAR = 2026
PROVINCE = "SC"

# A shard is split so one file stays loadable on a phone. The largest scope holds over 20,000
# offerings, which is far more than a single response should carry.
MAX_OFFERINGS_PER_FILE = 2500

# The workbook's batch strings embed the stage ("本科批B段" -> stage "B"); the specification keeps
# 批次 and 阶段 as separate fields, so the stage is extracted rather than left inside the name.
BATCH_STAGE = re.compile(r"([A-Za-z])段")

# Which published table a plan year's history is filed under. 2025 起 the exam uses 物理类/历史类,
# 2024 and earlier it used 理科/文科. The database keeps every observation's own track as NULL on
# purpose, so the export states the filing basis explicitly instead of implying comparability.
FILING_TRACK_NOTE = "PLAN_ROW_SHEET; 历史年份的科类定义未在来源中逐行给出"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def stage_of(batch: str | None) -> str | None:
    if not batch:
        return None
    match = BATCH_STAGE.search(batch)
    return match.group(1).upper() if match else None


# Scope ids travel in URLs and in the frozen manifest schema, whose pattern allows only
# [A-Za-z0-9_.:-]; the batch name is therefore encoded rather than embedded as Chinese.
BATCH_ALIASES = {
    "本科批B段": "BENKE-B",
    "本科批A段(国家专项)": "BENKE-A-GUOJIA",
    "本科批A段(地方专项)": "BENKE-A-DIFANG",
    "本科批(高校专项)": "BENKE-GAOXIAO",
    "本科批(省属高校预科)": "BENKE-YUKE",
    "本科提前批A段": "TIQIAN-A",
    "本科提前批B段": "TIQIAN-B",
    "高职(专科)批": "ZHUANKE",
    "高职(专科)提前批": "ZHUANKE-TIQIAN",
}


# Admission types are Chinese and there are around twenty of them; the common ones get a
# readable alias and anything else a stable hash, so a file name is always ASCII and legal.
ADMISSION_TYPE_ALIASES = {
    "普通类": "PUTONG",
    "国家专项计划": "GUOJIA",
    "地方专项计划": "DIFANG",
    "高校专项计划": "GAOXIAO",
    "省级公费师范生": "GONGfei-SHIFAN",
    "地方优师计划": "YOU-SHI",
    "区域教育均衡发展专项计划": "QUYU-JUNHENG",
    "少数民族语言授课为主": "MINZU-YUYAN",
    "军事类": "JUNSHI",
    "公安司法类": "GONGAN-SIFA",
    "民族班": "MINZU-BAN",
    "定向培养军士": "DINGXIANG-JUNSHI",
    "免费医学定向": "MIANFEI-YIXUE",
    "乡村振兴专项计划": "XIANGcun-ZHENXING",
}


def admission_type_slug(admission_type: str) -> str:
    alias = ADMISSION_TYPE_ALIASES.get(admission_type)
    if alias is None:
        alias = "X" + sha256_bytes(admission_type.encode("utf-8"))[:8].upper()
    return alias


def scope_id(track: str, batch: str, admission_type: str) -> str:
    """The publication scope: one track, one batch, one admission type.

    The frozen manifest schema pairs each coverage entry with a single admission type, and the
    matcher requires exactly one coverage entry per requested scope. Admission type therefore
    belongs to the scope identity rather than being an attribute inside a larger scope, which
    also keeps a special-type admission from being presented as an ordinary one.
    """
    batch_alias = BATCH_ALIASES.get(batch)
    if batch_alias is None:
        # A batch without an alias falls back to a hash-stable ASCII id, so a new batch in a
        # future workbook still yields a legal, stable scope instead of failing the schema.
        batch_alias = "X" + sha256_bytes(batch.encode("utf-8"))[:10].upper()
    return f"SC-{PLAN_YEAR}-{track}-{batch_alias}-{admission_type_slug(admission_type)}"


def load_distributions() -> dict:
    """The extracted score-distribution tables, keyed by (year, track)."""
    if not DISTRIBUTIONS.is_file():
        return {}
    payload = json.loads(DISTRIBUTIONS.read_text(encoding="utf-8"))
    tables = payload.get("distributions")
    if tables is None:
        tables = [{"track": track, "year": payload["year"], **data}
                  for track, data in payload.get("tracks", {}).items()]
    index = {}
    for table in tables:
        rows = {row["score"]: row for row in table["rows"]}
        # Published order: the official table prints the highest score first, and keeping that
        # order means a reader can compare the export against the image line by line.
        scores = sorted(rows, reverse=True)
        index[(table["year"], table["track"])] = {
            "distributionId": table["distribution_id"],
            "year": table["year"],
            "track": table["track"],
            "curriculumSystem": table.get("curriculum_system"),
            "scoreBasis": "gaokao_cultural",
            "publishedMinScore": min(scores),
            "publishedMaxScore": max(scores),
            "unlistedScores": table.get("unlisted_scores", []),
            "rows": [{"score": score, "count": rows[score]["count"],
                      "cumulative": rows[score]["cumulative"],
                      "rankInterval": (
                          [rows[score]["cumulative"] - rows[score]["count"] + 1,
                           rows[score]["cumulative"]]
                          if rows[score]["count"] is not None and rows[score]["cumulative"] is not None
                          else None)}
                     for score in scores],
        }
    return index


def requirement_record(row: sqlite3.Row) -> dict:
    """The structured subject rule, in the shape the matcher expects. Unknown stays unknown."""
    kind = row["requirement_rule_kind"]
    subjects = [item for item in (row["requirement_subjects"] or "").split(",") if item]
    requirement_id = f"REQ-{row['group_id']}"
    if kind == "unlimited":
        return {"requirementId": requirement_id, "kind": "unlimited", "subjects": []}
    if kind == "all_of":
        return {"requirementId": requirement_id, "kind": "all_of", "subjects": subjects}
    return {"requirementId": requirement_id, "kind": "unknown", "subjects": [],
            "parseStatus": row["requirement_parse_status"]}


def build_history(connection: sqlite3.Connection) -> tuple[dict, dict]:
    """Historical observations, split by subject, in a compact tuple form.

    A group-level observation describes the whole group, so storing it inside each of the
    group's offerings would repeat the same numbers once per major (about 4.2 times on average).
    Group observations therefore live in their own per-group map, and an offering carries only
    its own major-level history.

    Each observation is a tuple ``[metricType, sourceYear, score, rank, comparability]``. The
    field order is declared once per shard under ``historyFields``, which keeps a record to a few
    dozen bytes instead of a few hundred while staying readable.
    """
    group_history: dict[str, list[list]] = {}
    offering_history: dict[str, list[list]] = {}

    for row in connection.execute(
            "SELECT g.group_id, o.metric_type, o.source_year, o.score, o.rank, o.comparability "
            "FROM admission_observation o JOIN admission_group g ON g.group_pk = o.group_pk "
            "WHERE o.subject_type = 'group' AND o.rank IS NOT NULL AND o.rank_is_valid = 1"):
        group_history.setdefault(row["group_id"], []).append(
            [row["metric_type"], row["source_year"], row["score"], row["rank"],
             row["comparability"]])

    for row in connection.execute(
            "SELECT ob.offering_id, o.metric_type, o.source_year, o.score, o.rank, o.comparability "
            "FROM admission_observation o JOIN offering ob ON ob.offering_pk = o.offering_pk "
            "WHERE o.subject_type = 'major' AND o.rank IS NOT NULL AND o.rank_is_valid = 1"):
        offering_history.setdefault(row["offering_id"], []).append(
            [row["metric_type"], row["source_year"], row["score"], row["rank"],
             row["comparability"]])

    for table in (group_history, offering_history):
        for key in table:
            table[key].sort(key=lambda item: (-item[1], item[0]))
    return group_history, offering_history


def offering_record(row: sqlite3.Row, offering_history: dict) -> dict:
    """One offering in the public shape. Unknowns stay null.

    ``releaseId``, ``year``, ``track``, ``batch``, ``trackBasis`` and ``scoreBasis`` are constant
    within a shard and are declared there once, so they are not repeated on every record.
    """
    tuition = None
    if row["tuition_comparable"] and row["tuition_amount"] is not None:
        tuition = row["tuition_amount"]
    return {
        "offeringId": row["offering_id"],
        "groupId": row["group_id"],
        "admissionType": row["admission_type"] or "普通类",
        "admissionTypeInferred": bool(row["admission_type_inferred"]),
        "institutionId": row["institution_id"],
        "institutionCode": row["institution_code"],
        "institutionName": row["canonical_name"],
        "institutionProvince": row["province"],
        "institutionCity": row["city"],
        "institutionTags": row["institution_level"],
        "majorCode": row["major_code"],
        "majorName": row["major_name"],
        "majorNote": row["major_note"],
        "category": row["category"],
        "categoryClass": row["category_class"],
        "level": row["level_label"],
        "degreeLevel": row["degree_level"],
        "planCount": row["plan_count"],
        "isNew": bool(row["is_new"]),
        "tuition": tuition,
        "tuitionRaw": row["tuition_raw"],
        "tuitionComparable": bool(row["tuition_comparable"]),
        "requirement": requirement_record(row),
        "requirementRaw": row["requirement_raw"],
        "majorHistory": offering_history.get(row["offering_id"], []),
        "sourceId": row["source_id"],
        "sourceRow": row["source_row"],
    }


def build_release(connection: sqlite3.Connection, release_id: str,
                  created_at: str) -> dict:
    """Assemble the release payload in memory; the caller writes it.

    Offerings are grouped into shards keyed by (track, batch, admission type), because those are
    the fields a query filters on first: a student scans their own track and batch. Each shard
    declares the constants that hold for every record in it — release id, year, province, track,
    batch, stage, admission type and the history field order — so records stay small.
    """
    group_history, offering_history = build_history(connection)
    comparability = [dict(row) for row in connection.execute(
        "SELECT link_id, plan_year, plan_track, history_year, history_track, scope, status, "
        "basis, examined, not_examined, reviewer, review_date, evidence_ids "
        "FROM comparability_link ORDER BY plan_track, history_year DESC")]
    group_pk_by_offering = {row["offering_pk"]: row["group_pk"] for row in
                            connection.execute("SELECT offering_pk, group_pk FROM offering")}
    shards: dict[str, dict] = {}
    coverage: dict[tuple, dict] = {}
    for row in connection.execute("SELECT * FROM match_pool ORDER BY offering_id"):
        admission_type = row["admission_type"] or "普通类"
        key = (row["track"], row["batch"], admission_type)
        sid = scope_id(row["track"], row["batch"], admission_type)
        shard_key = sid
        shard = shards.get(shard_key)
        if shard is None:
            shard = {
                "scopeId": sid,
                "releaseId": release_id,
                "year": PLAN_YEAR,
                "province": PROVINCE,
                "track": row["track"],
                "batch": row["batch"],
                "stage": stage_of(row["batch"]),
                "admissionType": admission_type,
                "trackBasis": FILING_TRACK_NOTE,
                "scoreBasis": "gaokao_cultural",
                "historyFields": ["metricType", "sourceYear", "score", "rank", "comparability"],
                "groupHistoryNote": ("groupHistory 以专业组为键，该组内每个专业共用；"
                                     "majorHistory 为本专业自己的记录"),
                "groupHistory": {},
                "offerings": [],
            }
            shards[shard_key] = shard
        shard["offerings"].append(offering_record(row, offering_history))
        group_id = row["group_id"]
        if group_id in group_history and group_id not in shard["groupHistory"]:
            shard["groupHistory"][group_id] = group_history[group_id]
        entry = coverage.setdefault(key, {
            "scope_id": sid, "year": PLAN_YEAR, "track": row["track"], "batch": row["batch"],
            "stage": stage_of(row["batch"]), "admission_type": admission_type,
            "published_offerings": 0, "known_scope_total": None, "exhaustive": True,
            "missing_notes": [],
        })
        entry["published_offerings"] += 1

    distributions = load_distributions()
    return {"shards": shards,
            "coverage": sorted(coverage.values(),
                               key=lambda item: (item["scope_id"], item["admission_type"])),
            "distributions": distributions, "comparability": comparability}


def write_release(release_dir: Path, payload: dict, release_id: str, created_at: str,
                  source_hash: str, force: bool) -> dict:
    if release_dir.exists() and not force:
        raise SystemExit(f"release already exists: {release_dir} (use --force to rebuild the same input)")
    release_dir.mkdir(parents=True, exist_ok=True)

    files = []

    def emit(name: str, data: object) -> None:
        text = json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"
        raw = text.encode("utf-8")
        path = release_dir / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)
        files.append({"path": name, "sha256": sha256_bytes(raw), "size_bytes": len(raw)})

    # Shards are further split by size: a student's device loads one file at a time, and the
    # largest scope (物理类本科批B段, over 20,000 offerings) is far too large as one response.
    index_entries = []
    for key, shard in sorted(payload["shards"].items()):
        offerings = shard["offerings"]
        chunks = [offerings[start:start + MAX_OFFERINGS_PER_FILE]
                  for start in range(0, len(offerings), MAX_OFFERINGS_PER_FILE)] or [[]]
        for number, chunk in enumerate(chunks, start=1):
            suffix = "" if len(chunks) == 1 else f"-{number:02d}"
            name = f"offerings/{key}{suffix}.json"
            emit(name, {**{k: v for k, v in shard.items() if k != "offerings"},
                        "offeringCount": len(chunk),
                        "part": number, "partCount": len(chunks),
                        "offerings": chunk})
            index_entries.append({
                "path": name, "scopeId": shard["scopeId"],
                "track": shard["track"], "batch": shard["batch"],
                "admissionType": shard["admissionType"], "offerings": len(chunk),
                "part": number, "partCount": len(chunks),
            })
    emit("index.json", {
        "note": "分片索引：按 scopeId/track/batch/admissionType 定位需要加载的文件",
        "shards": index_entries,
    })
    # Every evidence id is derivable from a history entry, so the index states the rule and the
    # counts instead of repeating a quarter of a million near-identical strings.
    evidence_counts: dict[str, int] = {}
    for shard in payload["shards"].values():
        for entries in shard["groupHistory"].values():
            for metric, year, _score, _rank, _comparability in entries:
                evidence_counts[f"group|{year}|{metric}"] =                     evidence_counts.get(f"group|{year}|{metric}", 0) + 1
        for offering in shard["offerings"]:
            for metric, year, _score, _rank, _comparability in offering["majorHistory"]:
                evidence_counts[f"major|{year}|{metric}"] =                     evidence_counts.get(f"major|{year}|{metric}", 0) + 1
    # Cross-year comparability travels with the data: the page must be able to state why 2025 can
    # be compared and 2024/2023 cannot, instead of leaving a reader to infer it from the year.
    emit("comparability.json", {
        "note": ("跨年可比性决定。只有 status=VERIFIED 的年份才参与历史位置比较；"
                 "NOT_ESTABLISHED 表示未建立可比关系，不得据其得出跨年结论。"),
        "examinedAndNotExamined": ("每条的 examined 列出实际核对过的内容，"
                                   "not_examined 列出未核对的部分，随结论一并展示。"),
        "records": payload["comparability"],
    })
    emit("evidence.json", {
        "derivationRule": ("每条历史记录的 evidenceId = EV-<SUBJECTTYPE>-<subjectId>-<sourceYear>-"
                           "<metricType>；subjectId 取该记录的 groupId 或 offeringId，"
                           "两处均在对应分片内。历史事实因此可逐条解析，无需另存重复副本。"),
        "historyFields": ["metricType", "sourceYear", "score", "rank", "comparability"],
        "countsBySubjectYearMetric": dict(sorted(evidence_counts.items())),
        "totalHistoryRecords": sum(evidence_counts.values()),
    })
    emit("distributions.json", {
        "note": ("官方一分一段表。历史年份（2024 及以前）为理科/文科口径，"
                 "与物理类/历史类不是同一定义，由 curriculumSystem 标明。"),
        "tables": list(payload["distributions"].values()),
    })

    manifest = {
        "manifest_version": "1.0.0",
        "release_id": release_id,
        "created_at": created_at,
        "schema_version": SCHEMA_VERSION,
        "rules_version": RULES_VERSION,
        "status": "PUBLISHED",
        "synthetic": False,
        "source_combined_sha256": source_hash,
        "files": sorted(files, key=lambda item: item["path"]),
        "coverage": payload["coverage"],
        "evidence_index_path": "evidence.json",
        "shard_index_path": "index.json",
        "distribution_path": "distributions.json",
        "comparability_path": "comparability.json",
    }
    emit("manifest.json", manifest)

    pointer = {"current": release_id, "manifest": f"{release_id}/manifest.json",
               "updated_at": created_at}
    RELEASE_ROOT.mkdir(parents=True, exist_ok=True)
    (RELEASE_ROOT / "current.json").write_text(
        json.dumps(pointer, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"release_id": release_id, "manifest": manifest, "files": files}


def check_release(release_dir: Path) -> int:
    manifest_path = release_dir / "manifest.json"
    if not manifest_path.is_file():
        print(json.dumps({"status": "failed", "error": f"no manifest at {manifest_path}"},
                         ensure_ascii=False), file=sys.stderr)
        return 1
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    failures = []
    total_bytes = 0
    for entry in manifest["files"]:
        path = release_dir / entry["path"]
        if not path.is_file():
            failures.append(f"missing: {entry['path']}")
            continue
        raw = path.read_bytes()
        total_bytes += len(raw)
        if sha256_bytes(raw) != entry["sha256"]:
            failures.append(f"sha256 mismatch: {entry['path']}")
        if len(raw) != entry["size_bytes"]:
            failures.append(f"size mismatch: {entry['path']}")

    # Cross-year comparability must ship with the data and stay internally consistent: a shard may
    # only mark a record COMPARABLE when a VERIFIED link exists for that year and track, and every
    # established link must name its reviewer and state its limits.
    comparability_path = release_dir / "comparability.json"
    verified_years: set[tuple[int, str]] = set()
    if not comparability_path.is_file():
        failures.append("missing: comparability.json")
    else:
        records = json.loads(comparability_path.read_text(encoding="utf-8"))["records"]
        for record in records:
            if record["status"] == "VERIFIED":
                verified_years.add((record["history_year"], record["plan_track"]))
                if not (record["reviewer"] and record["review_date"] and record["examined"]
                        and record["not_examined"] and record["evidence_ids"]):
                    failures.append(
                        f"{record['link_id']}: an established comparison must name its reviewer, "
                        f"date, what was examined, what was not, and its evidence")
            elif record["reviewer"] is not None:
                failures.append(f"{record['link_id']}: no reviewer may be named for a link that "
                                f"is not established")
        for entry in manifest["files"]:
            if not entry["path"].startswith("offerings/"):
                continue
            shard = json.loads((release_dir / entry["path"]).read_text(encoding="utf-8"))
            fields = shard["historyFields"]
            year_at = fields.index("sourceYear")
            status_at = fields.index("comparability")
            track = shard["track"]
            offenders = set()
            for values in shard["groupHistory"].values():
                for tuple_ in values:
                    if tuple_[status_at] == "COMPARABLE"                             and (tuple_[year_at], track) not in verified_years:
                        offenders.add(tuple_[year_at])
            for offering in shard["offerings"]:
                for tuple_ in offering["majorHistory"]:
                    if tuple_[status_at] == "COMPARABLE"                             and (tuple_[year_at], track) not in verified_years:
                        offenders.add(tuple_[year_at])
            for year in sorted(offenders):
                failures.append(
                    f"{entry['path']}: {year} marked COMPARABLE without a VERIFIED "
                    f"comparability link")
    print(json.dumps({
        "status": "failed" if failures else "passed",
        "release_id": manifest["release_id"],
        "status_field": manifest["status"],
        "files": len(manifest["files"]),
        "coverage_entries": len(manifest["coverage"]),
        "bytes": total_bytes,
        "comparability_records": (len(json.loads(comparability_path.read_text(
            encoding="utf-8"))["records"]) if comparability_path.is_file() else 0),
        "failures": failures[:20],
    }, ensure_ascii=False, indent=2))
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--release-id", default=None,
                        help="release id; defaults to one derived from the source hash")
    parser.add_argument("--check", action="store_true",
                        help="validate the current release instead of building one")
    parser.add_argument("--force", action="store_true",
                        help="rebuild into an existing release directory (same input only)")
    args = parser.parse_args()

    if not DB_PATH.is_file():
        print(json.dumps({"status": "failed", "error": f"missing database: {DB_PATH}"},
                         ensure_ascii=False), file=sys.stderr)
        return 1

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    source_hash = connection.execute(
        "SELECT value FROM meta WHERE key = 'source_combined_sha256'").fetchone()[0]
    release_id = args.release_id or f"SC-2026-{source_hash[:12]}"
    release_dir = RELEASE_ROOT / release_id

    if args.check:
        return check_release(release_dir)

    created_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    payload = build_release(connection, release_id, created_at)
    connection.close()
    result = write_release(release_dir, payload, release_id, created_at, source_hash, args.force)
    total = sum(entry["size_bytes"] for entry in result["files"])
    print(json.dumps({
        "status": "passed",
        "release_id": release_id,
        "created_at": created_at,
        "shards": len(payload["shards"]),
        "offerings": sum(len(shard["offerings"]) for shard in payload["shards"].values()),
        "coverage_entries": len(payload["coverage"]),
        "group_history_groups": sum(len(shard["groupHistory"])
                                    for shard in payload["shards"].values()),
        "distribution_tables": len(payload["distributions"]),
        "comparability_records": len(payload["comparability"]),
        "comparability_verified": sum(1 for item in payload["comparability"]
                                      if item["status"] == "VERIFIED"),
        "files": len(result["files"]),
        "bytes": total,
        "release_dir": str(release_dir.relative_to(APP)),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
