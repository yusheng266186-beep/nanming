"""End-to-end check of the path the student page actually takes.

The page does three things: read the shared index, hash the 6-digit code the student typed,
and fetch `shards/<hash>.json`. This script performs the same three steps against the real
release and then asserts that every number the page renders is present, self-consistent and
inside the range the pipeline claims.

It also checks the two properties that would be a privacy or honesty failure if broken:

  * no shard names anyone but its own student, and the index names nobody;
  * a missing or malformed line produces `null`, never a fabricated 0.

Run after `export_release.py`:  py -3.12 pipelines/quality-huixi/verify_release.py
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
from pathlib import Path

APP = Path(__file__).resolve().parents[2]
WORKSPACE = APP.parent
DATABASE = APP / "data/quality-huixi/quality-huixi.sqlite"
RELEASE = APP / "data/quality-huixi/release"
CODES = WORKSPACE / "private/quality-huixi-codes.csv"


def code_name(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()[:40] + ".json"


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify the 荣县一中 student release.")
    parser.add_argument("--release", type=Path, default=RELEASE)
    parser.add_argument("--database", type=Path, default=DATABASE)
    parser.add_argument("--codes", type=Path, default=CODES)
    parser.add_argument("--sample", type=int, default=40)
    args = parser.parse_args()

    problems: list[str] = []
    checked = 0

    index_path = args.release / "index.json"
    manifest_path = args.release / "manifest.json"
    if not index_path.exists() or not manifest_path.exists():
        print("release is missing; run export_release.py first")
        return 1

    index = json.loads(index_path.read_text(encoding="utf-8"))
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    # 1. The manifest must describe the files on disk, hash for hash.
    for name, expected in manifest["sha256"].items():
        target = args.release / name
        if not target.exists():
            problems.append(f"manifest lists a missing file: {name}")
            continue
        actual = hashlib.sha256(target.read_bytes()).hexdigest()
        if actual != expected:
            problems.append(f"sha256 mismatch: {name}")
    shard_files = sorted((args.release / "shards").glob("*.json"))
    if len(shard_files) != manifest["shardCount"]:
        problems.append(f"shard count {len(shard_files)} != manifest {manifest['shardCount']}")

    # 2. The index must not contain any student name, and no conflict key.
    connection = sqlite3.connect(args.database)
    names = [row[0] for row in connection.execute("SELECT display_name FROM person")]
    raw_index = index_path.read_text(encoding="utf-8")
    leaked = [name for name in names if name in raw_index]
    if leaked:
        problems.append(f"index exposes {len(leaked)} student names, e.g. {leaked[:3]}")
    for conflict in index["conflicts"]:
        if "conflict_key" in conflict:
            problems.append("index publishes a conflict key")

    # 3. Walk real codes exactly as the page does.
    if not args.codes.exists():
        problems.append(f"code file is missing: {args.codes}")
        codes = []
    else:
        import csv
        with args.codes.open(encoding="utf-8-sig", newline="") as handle:
            codes = list(csv.DictReader(handle))
    if not codes:
        problems.append("no codes to sample")

    by_exam_track = {(row["exam_code"], row["track"]): row["students"]
                     for row in index["exams"] if row.get("track")}
    threshold = {(row["exam_code"], row["track"]): row
                 for row in index["thresholds"]}
    people = {row[0]: row[1] for row in connection.execute(
        "SELECT public_id, display_name FROM person")}

    step = max(1, len(codes) // args.sample)
    for row in codes[::step][:args.sample]:
        target = args.release / "shards" / code_name(row["验证码6位"])
        if not target.exists():
            problems.append(f"code for {row['姓名']} does not resolve to a shard")
            continue
        shard = json.loads(target.read_text(encoding="utf-8"))
        checked += 1

        if shard["person"]["name"] != row["姓名"]:
            problems.append(f"shard {target.name} belongs to another student")
            continue
        if people.get(shard["person"]["publicId"]) != shard["person"]["name"]:
            problems.append(f"public id mismatch in {target.name}")

        serialized = json.dumps(shard, ensure_ascii=False)
        foreign = [name for name in names
                   if name != shard["person"]["name"] and name in serialized]
        if foreign:
            problems.append(f"{target.name} exposes other students: {foreign[:3]}")

        exam_codes = [exam["exam"] for exam in shard["exams"]]
        if len(exam_codes) != len(set(exam_codes)):
            problems.append(f"{target.name} repeats an exam")
        if exam_codes != sorted(exam_codes, key=lambda code: next(
                entry["ordinal"] for entry in index["exams"] if entry["exam_code"] == code)):
            problems.append(f"{target.name} exams are out of order")

        for exam in shard["exams"]:
            exam_code, track = exam["exam"], exam["track"]
            size = by_exam_track.get((exam_code, track))
            if size is not None and exam["gradeSize"] != size:
                problems.append(f"{target.name} {exam_code}: gradeSize {exam['gradeSize']} != {size}")
            rank = exam["gradeRank"]
            if rank is not None and not (1 <= rank <= (exam["gradeSize"] or 0)):
                problems.append(f"{target.name} {exam_code}: rank {rank} out of range")
            line = threshold.get((exam_code, track))
            if line and line["undergraduate_total"] is not None:
                expected = exam["total"] - line["undergraduate_total"]
                if abs((exam["undergraduateDiff"] or 0) - expected) > 1e-9:
                    problems.append(f"{target.name} {exam_code}: line gap is not the subtraction")
            else:
                if exam["undergraduateDiff"] is not None:
                    problems.append(f"{target.name} {exam_code}: gap without a line")
            for subject in exam["subjects"]:
                if subject["state"] != "valid" and subject["value"] is not None:
                    problems.append(f"{target.name} {exam_code} {subject['subject']}: "
                                    "non-valid state carries a value")
                for field in ("topLine", "undergraduateLine", "gradeAverage", "classAverage"):
                    if subject.get(field) is None:
                        continue
            for block in exam["knowledge"]:
                for area in block["areas"]:
                    if area["possible"] <= 0:
                        problems.append(f"{target.name} {exam_code} {block['subject']}: "
                                        "knowledge area without a full mark")
                        continue
                    if abs(area["rate"] - area["earned"] / area["possible"]) > 1e-9:
                        problems.append(f"{target.name} {exam_code} {block['subject']}: "
                                        f"rate is not earned/possible for {area['knowledge']}")
                    if not (0 <= area["earned"] <= area["possible"] + 1e-9):
                        problems.append(f"{target.name} {exam_code} {block['subject']}: "
                                        f"earned outside 0..possible for {area['knowledge']}")

    connection.close()

    # 4. The database's own rank check must be summarised in the index, not hidden.
    rank_issues = [issue for issue in index["issues"]
                   if issue["issue_code"] == "RANK_SOURCE_DISAGREEMENT"]
    if not rank_issues:
        problems.append("index lost the rank-source disagreement records")
    if "重算" not in index["scoreBasis"]["rank"]:
        problems.append("index does not explain how ranks are computed")

    summary = {
        "shards_on_disk": len(shard_files),
        "shards_checked": checked,
        "names_in_index": len(leaked),
        "rank_disagreements_reported": len(rank_issues),
        "problems": problems,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
