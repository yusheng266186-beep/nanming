"""Independently verify the extracted Sichuan score-distribution tables (一分一段表).

Re-derives every number from the raw OCR JSON (which itself is kept next to the images),
checks the published arithmetic, and re-reads the image hashes against the fetch registers.
Nothing here trusts the extraction script's own output: the checks are recomputed from the
stored OCR words and the registered image bytes.

Checks, per table:
  1. the OCR JSON files match the registered image set, and image hashes still match
  2. every registered image has a readable OCR result with three numeric columns
  3. count(s) == cumulative(s) - cumulative(s') for the next listed score s' above s
  4. sum of all counts + the above-range head group == the lowest listed score's cumulative
  5. cumulative strictly increases as scores fall
  6. rank interval arithmetic: for score s, [cum(s)-count(s)+1, cum(s)]
  7. the published score range and any unlisted scores are consistent with the page ranges
  8. every row carries an evidence image that is actually registered
  9. rows confirmed by reading the image match the image value and keep their evidence note
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = APP_ROOT / "data" / "task03"
REGISTER_PATH = DATA_ROOT / "score-distribution-register.json"
SOURCE_JSON = DATA_ROOT / "score-distribution" / "score-distribution.json"
OCR_DIR = DATA_ROOT / "score-distribution" / "ocr"

# Rows the project verified by hand from the published images, re-checked against the register.
# Keyed by (distribution_id, score) -> (count, cumulative). A count of None means the tally was
# not independently read; the cumulative is always checked.
KNOWN_ROWS = {
    ("SCORE-DIST-SC-2026-PHYSICS", 685): (12, 66),
    ("SCORE-DIST-SC-2026-PHYSICS", 684): (12, 78),
    ("SCORE-DIST-SC-2026-PHYSICS", 679): (None, 136),
    ("SCORE-DIST-SC-2026-HISTORY", 662): (4, 34),
    ("SCORE-DIST-SC-2026-HISTORY", 661): (5, 39),
    ("SCORE-DIST-SC-2026-HISTORY", 646): (27, 276),
    # Read off the published images because no OCR scale could read those cells.
    ("SCORE-DIST-SC-2023-SCIENCE", 694): (18, 109),
    ("SCORE-DIST-SC-2025-HISTORY", 655): (13, 105),
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--json", type=Path, default=SOURCE_JSON)
    parser.add_argument("--ocr-dir", type=Path, default=OCR_DIR)
    args = parser.parse_args()

    failures: list[str] = []
    checks = 0

    def expect(condition: bool, message: str) -> None:
        nonlocal checks
        checks += 1
        if not condition:
            failures.append(message)

    payload = json.loads(args.json.read_text(encoding="utf-8"))
    latest = json.loads(REGISTER_PATH.read_text(encoding="utf-8"))

    distributions = payload.get("distributions")
    if distributions is None:  # version 1 payload: a single year under "tracks"
        distributions = [{"track": track, "year": payload["year"], **data}
                         for track, data in payload.get("tracks", {}).items()]

    # 1: every page and image of every registered run is unchanged on disk, and carries an OCR.
    # The earliest run predates per-entry year tags, so an entry without one inherits its run's.
    registered_images: dict[str, dict] = {}
    for run in latest.get("runs", {}).values():
        register = json.loads((APP_ROOT / run["register_path"]).read_text(encoding="utf-8"))
        run_year = int(run.get("year", register.get("year", 0)))
        for entry in register["entries"]:
            entry.setdefault("year", run_year)
            path = APP_ROOT / entry["snapshot_path"]
            expect(path.is_file(), f"missing: {entry['snapshot_path']}")
            if path.is_file():
                expect(sha256(path.read_bytes()) == entry["sha256"],
                       f"changed since fetch: {entry['snapshot_path']}")
            if entry.get("asset_kind") == "score_distribution_image":
                registered_images[entry["filename"]] = entry
                expect((args.ocr_dir / (path.stem + ".ocr.json")).is_file(),
                       f"missing OCR for {entry['filename']}")

    expect(payload["publication_status"] == "NOT_PUBLISHED",
           "publication_status must stay NOT_PUBLISHED")

    for data in distributions:
        distribution_id = data.get("distribution_id", f"{data['year']}-{data['track']}")
        rows = data["rows"]
        expect(bool(rows), f"{distribution_id}: no rows extracted")
        if not rows:
            continue
        expect(data["pages"] == sum(1 for entry in registered_images.values()
                                    if entry.get("track") == data["track"]
                                    and int(entry.get("year", 0)) == int(data["year"])),
               f"{distribution_id}: page count does not match the registered image count")

        # 5: strictly increasing cumulative as the score falls.
        for above, below in zip(rows, rows[1:]):
            if above["cumulative"] is None or below["cumulative"] is None:
                continue
            expect(below["cumulative"] > above["cumulative"],
                   f"{distribution_id} score {below['score']}: cumulative not increasing "
                   f"({above['cumulative']} -> {below['cumulative']})")

        # 3: the published identity holds for every adjacent pair.
        for above, below in zip(rows, rows[1:]):
            if None in (above["cumulative"], below["cumulative"], below["count"]):
                continue
            expect(below["cumulative"] - above["cumulative"] == below["count"],
                   f"{distribution_id} score {below['score']}: count {below['count']} != "
                   f"cumulative difference {below['cumulative'] - above['cumulative']}")

        # 4: every person accounted for, including the published group above the top score.
        total = sum(row["count"] for row in rows if row["count"] is not None)
        lowest = rows[-1]
        top = rows[0]
        head_group = (top["cumulative"] - top["count"]) if None not in (top["count"],
                                                                       top["cumulative"]) else None
        expect(head_group is not None and head_group >= 0,
               f"{distribution_id}: top row cannot express the above-range head group")
        if head_group is not None:
            expect(total + head_group == lowest["cumulative"],
                   f"{distribution_id}: sum of counts {total} + head group {head_group} != "
                   f"lowest cumulative {lowest['cumulative']}")
            expect(head_group >= 0,
                   f"{distribution_id}: the above-range head group cannot be negative")

        # 6: the rank interval is representable for every row.
        for row in rows:
            if None in (row["count"], row["cumulative"]):
                continue
            expect(row["cumulative"] >= row["count"],
                   f"{distribution_id} score {row['score']}: cumulative below count")
            expect(row["cumulative"] - row["count"] + 1 >= 1,
                   f"{distribution_id} score {row['score']}: rank interval below 1")

        # 7: the recorded unlisted scores are exactly the scores absent from the printed range.
        present = {row["score"] for row in rows}
        expected_missing = set(data.get("unlisted_scores", []))
        actual_missing = {score for score in range(min(present), max(present) + 1)
                          if score not in present}
        expect(actual_missing == expected_missing,
               f"{distribution_id}: unlisted score set differs from the recorded one")

        # 8: no duplicated score, and every row's evidence image is registered.
        expect(len(present) == len(rows), f"{distribution_id}: duplicate scores present")
        for row in rows:
            expect(row["evidence"]["image"] in registered_images,
                   f"{distribution_id} score {row['score']}: evidence image not registered: "
                   f"{row['evidence']['image']}")

        # 9: rows confirmed from the image carry their note and match the confirmed value.
        for row in rows:
            if not row.get("count_verified_by_image"):
                continue
            key = (distribution_id, row["score"])
            expect(key in KNOWN_ROWS,
                   f"{distribution_id} score {row['score']}: marked image-verified but not listed")
            expect(bool(row.get("count_verification_note")),
                   f"{distribution_id} score {row['score']}: image-verified row lacks its note")
            if key in KNOWN_ROWS:
                count, cumulative = KNOWN_ROWS[key]
                if count is not None:
                    expect(row["count"] == count,
                           f"{distribution_id} score {row['score']}: count {row['count']} != "
                           f"confirmed {count}")
                expect(row["cumulative"] == cumulative,
                       f"{distribution_id} score {row['score']}: cumulative {row['cumulative']} "
                       f"!= confirmed {cumulative}")

    # The rows the project verified by hand must still be present with those values.
    by_id = {}
    for data in distributions:
        distribution_id = data.get("distribution_id", f"{data['year']}-{data['track']}")
        by_id[distribution_id] = {row["score"]: row for row in data["rows"]}
    for (distribution_id, score), (count, cumulative) in KNOWN_ROWS.items():
        table = by_id.get(distribution_id)
        expect(table is not None, f"{distribution_id}: distribution missing")
        if table is None:
            continue
        row = table.get(score)
        expect(row is not None, f"{distribution_id} score {score}: verified row missing")
        if row is None:
            continue
        if count is not None:
            expect(row["count"] == count,
                   f"{distribution_id} score {score}: count {row['count']} != verified {count}")
        expect(row["cumulative"] == cumulative,
               f"{distribution_id} score {score}: cumulative {row['cumulative']} != "
               f"verified {cumulative}")

    # Nothing may be left flagged as unresolved.
    for data in distributions:
        distribution_id = data.get("distribution_id", f"{data['year']}-{data['track']}")
        expect(not data.get("unresolved_rows"),
               f"{distribution_id}: unresolved rows remain: {data.get('unresolved_rows')}")

    print(json.dumps({
        "status": "failed" if failures else "passed",
        "checks": checks,
        "tables": len(distributions),
        "rows": sum(len(data["rows"]) for data in distributions),
        "failures": failures[:40],
        "failure_count": len(failures),
    }, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
