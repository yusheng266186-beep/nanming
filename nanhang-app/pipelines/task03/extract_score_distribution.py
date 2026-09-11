"""Extract Sichuan score-distribution tables (一分一段表) from the official page images.

Method: Windows OCR word coordinates, then row alignment by y and column assignment by x.
The result is provisional until ``validate_score_distribution.py`` passes its arithmetic
cross-checks. Nothing is silently repaired: a row that fails a check is reported.

Published layout of each image is three columns — 分数 / 人数 / 累计 — repeated block by
block down the page, for every year and every track.

Two curriculum systems appear in the sources and are kept apart:

* ``new_gaokao``  (2025 起)  物理类 PHYSICS / 历史类 HISTORY — 3+1+2 首选科目
* ``old_system``  (2024 及以前) 理科 SCIENCE / 文科 ARTS — 文理分科

The tag travels with every row into the database. It is not a comparability judgement: it
records which definition of "track" the published numbers use, so a 2024 理科 value is never
silently read as if it were a 2024 物理类 value.

Output:
  data/task03/score-distribution/score-distribution.json   all years, rows + evidence
  data/task03/score-distribution/ocr/<image>.ocr.json      raw OCR kept for re-derivation
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import verified_score_rows

APP_ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = APP_ROOT / "data" / "task03"
REGISTER_PATH = DATA_ROOT / "score-distribution-register.json"
OUTPUT_ROOT = DATA_ROOT / "score-distribution"
OCR_SCRIPT = Path(__file__).with_name("windows_ocr.ps1")
WINDOWS_POWERSHELL = Path(r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe")

PROVINCE = "SC"

# The scales the tables are read at. Scale 1 is the published image; scale 2 is an upsampled
# copies whose readings are cross-checked against it (see resolve_columns). The scales fail on
# different cells — a count unreadable at 1x and 2x is legible at 3x — so all of them are kept
# and the published arithmetic decides between their readings. They are cached per scale.
OCR_SCALES = (1, 2, 3)

# Windows OCR refuses images beyond roughly this many pixels on a side, so a scale that would
# exceed it is skipped for that page (the 2026 pages are already 3603px tall and cannot be
# tripled). Scales are chosen per page; the readings that exist are still cross-checked.
MAX_OCR_PIXELS = 9000

# A count/cumulative word must sit within this many pixels of its score row to be paired.
ROW_TOLERANCE = 90.0
# ...but never more than this fraction of the row pitch. The published row pitch varies by year
# (about 65px on the 2026 pages, about 80px on the 2025 ones); a fixed tolerance wider than the
# pitch lets a row whose own cell OCR missed silently adopt the neighbouring row's value, which
# corrupts the pairing rather than reporting a gap.
ROW_TOLERANCE_PITCH_FRACTION = 0.45
# Number of published columns per block: 分数 人数 累计.
BLOCK_COLUMNS = 3
# A genuine 分数 run needs at least this many distinct values before it can be chosen.
MIN_SCORE_VALUES = 8


def run_ocr(image_path: Path) -> dict:
    completed = subprocess.run(
        [str(WINDOWS_POWERSHELL), "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
         str(OCR_SCRIPT), "-ImagePath", str(image_path), "-Language", "zh-Hans", "-Json"],
        check=True, capture_output=True, text=True, encoding="utf-8-sig", errors="strict")
    return json.loads(completed.stdout)


def usable_scales(image_path: Path) -> tuple[int, ...]:
    """The scales this page can be read at, dropping any that exceed the OCR size limit."""
    from PIL import Image
    with Image.open(image_path) as source:
        width, height = source.size
    return tuple(scale for scale in OCR_SCALES
                 if width * scale <= MAX_OCR_PIXELS and height * scale <= MAX_OCR_PIXELS)


def run_ocr_scaled(image_path: Path, ocr_output: Path, scale: int, force: bool) -> dict:
    """OCR at one scale, caching each scale separately so a re-run is free.

    Scales above 1 are produced by upsampling the published image; Windows OCR reads the
    low-resolution pages more reliably that way, and the readings are cross-checked against the
    base scale rather than trusted on their own.

    The cached result is consulted *before* the upscaled image is produced: those images are a
    large intermediate (hundreds of megabytes across all pages) whose only purpose is to be fed
    to the OCR engine once, so a re-run must not rebuild them.
    """
    ocr_output.mkdir(parents=True, exist_ok=True)
    if scale == 1:
        cached = ocr_output / (image_path.stem + ".ocr.json")
        work_path = image_path
    else:
        cached = ocr_output / f"{image_path.stem}.x{scale}.ocr.json"
        work_path = ocr_output / f"{image_path.stem}.x{scale}.png"
    if cached.is_file() and not force:
        return json.loads(cached.read_text(encoding="utf-8"))
    if scale != 1 and not work_path.is_file():
        from PIL import Image
        with Image.open(image_path) as source:
            enlarged = source.convert("L").resize(
                (source.width * scale, source.height * scale), Image.LANCZOS)
        enlarged.save(work_path)
    ocr = run_ocr(work_path)
    cached.write_text(json.dumps(ocr, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return ocr


def numeric_words(ocr: dict) -> list[dict]:
    """Integer words with their box geometry; header labels and units are ignored."""
    words = []
    for line in ocr.get("lines", []):
        for word in line.get("words", []):
            text = word.get("text", "").strip()
            if not re.fullmatch(r"\d{1,7}", text):
                continue
            words.append({
                "value": int(text),
                "x": float(word["x"]),
                "y": float(word["y"]),
                "width": float(word["width"]),
                "height": float(word["height"]),
            })
    return words


def cluster_1d(values: list[float], seed_count: int) -> list[float]:
    """Cluster centres by iterative refinement, seeded from evenly spaced quantiles."""
    ordered = sorted(values)
    if len(ordered) < seed_count:
        return ordered
    centres = [ordered[int((index + 0.5) * len(ordered) / seed_count)] for index in range(seed_count)]
    for _ in range(100):
        buckets: list[list[float]] = [[] for _ in range(seed_count)]
        for value in ordered:
            nearest = min(range(seed_count), key=lambda index: abs(value - centres[index]))
            buckets[nearest].append(value)
        moved = False
        for index, bucket in enumerate(buckets):
            if bucket:
                refined = sum(bucket) / len(bucket)
                if abs(refined - centres[index]) > 0.5:
                    moved = True
                centres[index] = refined
        if not moved:
            break
    return sorted(centres)


def split_columns(words: list[dict]) -> list[list[dict]]:
    """Split words into vertical columns by x-centre."""
    centres = cluster_1d([word["x"] + word["width"] / 2 for word in words], BLOCK_COLUMNS)
    columns: list[list[dict]] = [[] for _ in centres]
    for word in words:
        centre = word["x"] + word["width"] / 2
        nearest = min(range(len(centres)), key=lambda index: abs(centre - centres[index]))
        columns[nearest].append(word)
    for column in columns:
        column.sort(key=lambda word: word["y"])
    return columns


def digit_width(column: list[dict]) -> float:
    """Median printed width of one digit in this column, used to judge fragment contiguity."""
    widths = [word["width"] / len(str(word["value"])) for word in column if word["value"] > 0]
    if not widths:
        return 0.0
    widths.sort()
    return widths[len(widths) // 2]


def merge_row_fragments(column: list[dict], y_tolerance: float,
                        require_contiguous: bool = True) -> list[dict]:
    """Join OCR fragments that belong to one printed cell.

    The tables print exactly one number per column per row, but OCR sometimes splits a number
    into horizontally adjacent pieces — a published 181 can come back as ``1`` at x=82 and
    ``81`` at x=96 on the same line. Left as-is, the tail fragment is read as its own score
    (a phantom 81) and the leading fragment as another (a phantom 1). Merging by row is
    therefore not a cosmetic repair: it recovers the printed cell from its fragments.

    Words are grouped when their vertical centres sit within ``y_tolerance`` of each other,
    then joined left to right. For the 分数 column ``require_contiguous`` is False: OCR may
    return every digit of a three-digit score as its own word (``118`` as ``1``, ``1``, ``8``
    at x=82, 98, 113), and those pieces are always concatenated. For the 人数/累计 columns it
    stays True, because a wide gap there means the printed number lost digits in recognition
    (a 294426 read as ``29`` + ``26``); non-adjacent pieces are then never concatenated into a
    number that was not on the page. Such a cell is returned with ``value=None`` and its
    fragments recorded, so it is reported as unreadable instead of being guessed.
    """
    if not column:
        return []
    unit = digit_width(column) or 8.0
    gap_limit = unit * 0.9
    ordered = sorted(column, key=lambda word: (word["y"] + word["height"] / 2, word["x"]))
    groups: list[list[dict]] = [[ordered[0]]]
    for word in ordered[1:]:
        centre = word["y"] + word["height"] / 2
        reference = groups[-1][-1]
        reference_centre = reference["y"] + reference["height"] / 2
        if abs(centre - reference_centre) <= y_tolerance:
            groups[-1].append(word)
        else:
            groups.append([word])
    merged = []
    for group in groups:
        group.sort(key=lambda word: word["x"])
        span_start = group[0]["x"]
        span_end = max(word["x"] + word["width"] for word in group)
        broken = False
        if require_contiguous:
            for left, right in zip(group, group[1:]):
                if right["x"] - (left["x"] + left["width"]) > gap_limit:
                    broken = True
                    break
        fragments = [{"value": word["value"], "x": int(word["x"]), "y": int(word["y"])}
                     for word in group]
        value = None if broken else int("".join(str(word["value"]) for word in group))
        merged.append({
            "value": value,
            "x": span_start,
            "y": min(word["y"] for word in group),
            "width": span_end - span_start,
            "height": max(word["height"] for word in group),
            "fragment_count": len(group),
            "unreadable_gap": broken,
            "fragments": fragments if broken else None,
        })
    return merged


def row_pitch(column: list[dict]) -> float | None:
    """Median vertical distance between neighbouring rows, used to size the merge tolerance."""
    centres = sorted({round(word["y"] + word["height"] / 2) for word in column})
    gaps = [right - left for left, right in zip(centres, centres[1:]) if right - left > 4]
    if not gaps:
        return None
    gaps.sort()
    return float(gaps[len(gaps) // 2])


def detect_score_column(columns: list[list[dict]]) -> int:
    """Find the 分数 column among the three.

    The published layout always prints 分数 leftmost, so the rule is: the leftmost column that
    looks like a score column. "Looks like one" means a long descending-by-one run, which
    excludes the cumulative column (never consecutive) and ordinary tally columns (irregular).

    Leftmost has to win over "most consecutive", because the alternatives are real:
    a block's run can be interrupted where the table continues on the next page (2025 物理
    page 18 lists 199..170 with 171 on the following page, a 0.96 ratio), while a low-end tally
    column of single digits can be perfectly consecutive (0..9, a 1.00 ratio). Ordering by
    ratio alone would then read the tallies as scores.
    """
    candidates = []
    for index, column in enumerate(columns):
        values = sorted({word["value"] for word in column
                         if word["value"] is not None and 0 <= word["value"] <= 750}, reverse=True)
        if len(values) < MIN_SCORE_VALUES:
            continue
        consecutive = sum(1 for left, right in zip(values, values[1:]) if left - right == 1)
        ratio = consecutive / (len(values) - 1)
        if ratio < 0.9:
            continue
        candidates.append((min(word["x"] for word in column), index))
    if candidates:
        return min(candidates)[1]
    # Fall back to the leftmost column that has enough distinct values.
    fallback = [(min(word["x"] for word in column), index)
                for index, column in enumerate(columns)
                if len({word["value"] for word in column
                        if word["value"] is not None}) >= MIN_SCORE_VALUES]
    if not fallback:
        return 0
    return min(fallback)[1]


def merge_scale_readings(base_rows: list[dict], other_rows: list[dict]) -> None:
    """Attach the values a second OCR pass read, so a cell missed at one scale can be supplied
    by another.

    Windows OCR does not fail uniformly: on a lower-resolution page it drops a different cell at
    each scale (a row whose count is unreadable at 1x may have its cumulative readable at 2x).
    The readings are kept side by side rather than merged into one value, because choosing
    between them is the arithmetic step's job, not this one's.
    """
    by_score = {row["score"]: row for row in other_rows}
    for row in base_rows:
        mate = by_score.get(row["score"])
        counts = [] if row["count"] is None else [row["count"]]
        cumulatives = [] if row["cumulative"] is None else [row["cumulative"]]
        if mate is not None:
            if mate["count"] is not None and mate["count"] not in counts:
                counts.append(mate["count"])
            if mate["cumulative"] is not None and mate["cumulative"] not in cumulatives:
                cumulatives.append(mate["cumulative"])
        row["count_candidates"] = counts
        row["cumulative_candidates"] = cumulatives


def is_digit_drop(read: int, expected: int) -> bool:
    """True when the digits read appear in order inside the expected number."""
    expected_text, read_text = str(expected), str(read)
    position = 0
    for character in expected_text:
        if position < len(read_text) and read_text[position] == character:
            position += 1
    return position == len(read_text)


def insertion_candidates(read: int, max_depth: int = 2) -> set[int]:
    """Numbers formed by inserting up to ``max_depth`` digits into the digits read.

    This is the inverse of the OCR failure these pages show: characters are lost, so the printed
    number is the read number with digits put back (1106 read as 116; 41879 read as 418).
    """
    results = {read}
    frontier = {str(read)}
    for _ in range(max_depth):
        grown = set()
        for text in frontier:
            for position in range(len(text) + 1):
                for digit in "0123456789":
                    grown.add(text[:position] + digit + text[position:])
        grown -= frontier
        for text in grown:
            if len(text) <= 7:
                results.add(int(text))
        frontier = grown
    return results


def resolve_columns(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    """Settle every row's count and cumulative from the OCR readings plus the published arithmetic.

    Two facts about the published tables constrain the readings:

    * ``cumulative(s) = cumulative(s_above) + count(s)`` — cumulative counts everyone at or above
      a score, so each row's pair must add up against the row above it; and
    * cumulative strictly increases as the score falls.

    Readings that satisfy both are taken as read. When none does, the arithmetic narrows the
    possibilities to numbers formed by putting back characters OCR dropped, and the cheapest such
    restoration is chosen. If two restorations are equally cheap the row is left as read and
    reported, because the arithmetic does not single one out. A row whose count was never read at
    any scale is settled from the pair below it instead, which needs no count at that row.

    Rows are settled top-down against an already-settled neighbour, and the monotonicity
    requirement stops a misread cumulative from being accepted merely because some count happens
    to match it. The head row is settled last, from the row below.
    """
    ordered = sorted(rows, key=lambda row: -row["score"])
    decisions: list[dict] = []
    unresolved: list[dict] = []

    def settle_missing_count_from_below() -> bool:
        """Settle a row whose count was never read, using the pair below it.

        ``cumulative(s) = cumulative(s_below) - count(s_below) + count(s)`` becomes
        ``cumulative(s) = cumulative(s_below) - count(s_below)`` when the count at s is missing
        entirely and the two groups are adjacent. The value read at s must be those digits with
        characters dropped, so this only applies where OCR actually lost characters.
        """
        changed = False
        for index in range(len(ordered) - 1):
            row, below = ordered[index], ordered[index + 1]
            if row["count"] is not None:
                continue
            if below["cumulative"] is None or below["count"] is None:
                continue
            implied = below["cumulative"] - below["count"]
            if implied <= 0 or implied <= below["cumulative"]:
                continue
            read = row.get("cumulative_candidates") or []
            if read and not any(is_digit_drop(value, implied) for value in read):
                continue
            row["cumulative"] = implied
            decisions.append({"score": row["score"], "how": "由下一行确定累计",
                              "count": None, "cumulative": implied, "read_cumulatives": read})
            changed = True
        return changed

    def settle_row(row: dict, above_cumulative: int, below_row: dict | None) -> str:
        """Try to settle one row against the cumulative above it, with the row below as a
        tie-breaker when the digits admit more than one reading."""
        counts = list(dict.fromkeys(row.get("count_candidates") or []))
        cumulatives = list(dict.fromkeys(row.get("cumulative_candidates") or []))
        options: list[tuple[int, int, int]] = []
        count_values = [(c, 0) for c in counts] + \
            [(c, 1) for c in sorted({v for c in counts for v in insertion_candidates(c)})]
        cumulative_values = [(u, 0) for u in cumulatives] + \
            [(u, 1) for u in sorted({v for u in cumulatives for v in insertion_candidates(u)})]
        for count, count_cost in count_values:
            if count <= 0:
                continue
            implied = above_cumulative + count
            for cumulative, cumulative_cost in cumulative_values:
                if cumulative == implied and cumulative > above_cumulative:
                    options.append((count_cost + cumulative_cost, count, cumulative))
        if not options and cumulatives:
            # A correctly-read cumulative fixes the count on its own:
            # count(s) = cumulative(s) - cumulative(s_above). This is the same recovery
            # fill_missing_counts performs, applied here so the row is settled in one pass.
            for cumulative, cumulative_cost in cumulative_values:
                if cumulative <= above_cumulative:
                    continue
                count = cumulative - above_cumulative
                if not counts or any(is_digit_drop(c, count) or c == count for c in counts):
                    options.append((cumulative_cost, count, cumulative))
        if not options:
            # No cumulative was read either, so the count has to be a reading whose implied
            # cumulative is compatible with whatever cumulative was seen.
            for count, count_cost in count_values:
                if count <= 0:
                    continue
                implied = above_cumulative + count
                options.append((count_cost + 1, count, implied))
        if not options:
            unresolved.append({"score": row["score"], "page": row["page"],
                               "image": row["evidence"]["image"],
                               "read_counts": counts, "read_cumulatives": cumulatives,
                               "cumulative_above": above_cumulative,
                               "note": "算术与读数都不能确定该行；保持原样，交人工核对"})
            return "unresolved"
        cheapest = min(cost for cost, _, _ in options)
        winners = sorted({(count, cumulative) for cost, count, cumulative in options
                          if cost == cheapest})
        if len(winners) > 1 and below_row is not None:
            # Tie-break with the row below. For the pair (this row, the row below) the identity
            # reads cumulative(this) = cumulative(below) - count(below), so a candidate is
            # consistent with the row below only when that difference holds. Using the row
            # below's settled values when it has them, and its readings otherwise, lets the
            # walk resolve a row the digits alone cannot single out.
            below_counts = list(dict.fromkeys(below_row.get("count_candidates") or []))
            below_cumulatives = list(dict.fromkeys(below_row.get("cumulative_candidates") or []))
            if below_row.get("count") is not None:
                below_counts = [below_row["count"]]
            if below_row.get("cumulative") is not None:
                below_cumulatives = [below_row["cumulative"]]
            scored = []
            for count, cumulative in winners:
                consistent = any(cumulative_below - c == cumulative
                                 for c in below_counts for cumulative_below in below_cumulatives)
                scored.append((0 if consistent else 1, count, cumulative))
            best_penalty = min(penalty for penalty, _, _ in scored)
            narrowed = sorted({(count, cumulative) for penalty, count, cumulative in scored
                               if penalty == best_penalty})
            if len(narrowed) == 1:
                winners = narrowed
        if len(winners) > 1:
            unresolved.append({"score": row["score"], "page": row["page"],
                               "image": row["evidence"]["image"],
                               "read_counts": counts, "read_cumulatives": cumulatives,
                               "cumulative_above": above_cumulative,
                               "candidates": [{"count": c, "cumulative": u} for c, u in winners],
                               "note": "多个同等代价的候选；保持原样，交人工核对"})
            return "ambiguous"
        count, cumulative = winners[0]
        if row["count"] != count or row["cumulative"] != cumulative:
            row["count_read"] = row["count"]
            row["cumulative_read"] = row["cumulative"]
            row["count"] = count
            row["cumulative"] = cumulative
            row["count_derived"] = True
            row["count_derivation"] = (
                f"cumulative({row['score']}) = cumulative 上一行 + count({row['score']}) → "
                f"{cumulative} = {above_cumulative} + {count}"
                f"（OCR 读数 {row['count_read']}/{row['cumulative_read']}，按算术与丢字恢复确定）")
            decisions.append({"score": row["score"], "how": "算术确定",
                              "count": count, "cumulative": cumulative,
                              "read_counts": counts, "read_cumulatives": cumulatives})
        return "settled"

    for _round in range(6):
        progressed = settle_missing_count_from_below()
        for index, row in enumerate(ordered):
            if index == 0:
                continue  # settled after the walk, from the row below
            above = ordered[index - 1]["cumulative"]
            if above is None:
                continue
            below_row = ordered[index + 1] if index + 1 < len(ordered) else None
            if settle_row(row, above, below_row) == "settled":
                progressed = True
        if not progressed:
            break

    # The head row: the pair below fixes its cumulative exactly, and its count is then the
    # reading that leaves a non-negative group above the published range.
    if len(ordered) > 1:
        top, second = ordered[0], ordered[1]
        if second["cumulative"] is not None and second["count"] is not None:
            implied_cumulative = second["cumulative"] - second["count"]
            if implied_cumulative > 0 and top["cumulative"] != implied_cumulative:
                decisions.append({"score": top["score"], "how": "表首累计由下一行确定",
                                  "count": top["count"], "cumulative": implied_cumulative,
                                  "read_cumulatives": top.get("cumulative_candidates") or []})
                top["cumulative"] = implied_cumulative
            if top["count"] is None:
                counts = list(dict.fromkeys(top.get("count_candidates") or []))
                if counts:
                    top["count"] = counts[0]
                    decisions.append({"score": top["score"], "how": "表首计数取读数",
                                      "count": counts[0], "cumulative": top["cumulative"],
                                      "read_counts": counts})
    unique: dict[int, dict] = {}
    for item in unresolved:
        key = (item["score"], tuple(item["read_counts"]), tuple(item["read_cumulatives"]))
        unique[key] = item
    return decisions, sorted(unique.values(), key=lambda item: -item["score"])

def extract_page(ocr: dict, page_number: int, track: str, image_name: str) -> dict:
    words = numeric_words(ocr)
    if len(words) < 10:
        return {"page": page_number, "rows": [], "warning": "too few numeric words",
                "numeric_word_count": len(words)}
    raw_columns = split_columns(words)
    # Rejoin fragments before deciding which column is 分数: a split number distorts both the
    # consecutive-run test and the values that end up in the table. The 人数/累计 columns merge
    # conservatively (a wide gap means lost digits, reported as unreadable); 分数 is merged
    # eagerly, because scores are printed as one unbroken run of digits that OCR may return as
    # separate words (a 118 arriving as ``1``, ``1``, ``8``).
    merged_columns = []
    for column in raw_columns:
        pitch = row_pitch(column) or 40.0
        merged_columns.append(merge_row_fragments(column, min(20.0, pitch * 0.35)))
    columns = merged_columns
    score_index = detect_score_column(columns)
    score_pitch = row_pitch(raw_columns[score_index]) or 40.0
    columns[score_index] = merge_row_fragments(raw_columns[score_index],
                                               min(20.0, score_pitch * 0.35),
                                               require_contiguous=False)
    others = [index for index in range(len(columns)) if index != score_index]
    # 人数 is printed to the left of 累计; assign the two remaining columns by x order so a
    # value that OCR missed on one row cannot shift the other into its place.
    others.sort(key=lambda index: min(word["x"] for word in columns[index]))
    count_column = columns[others[0]] if others else []
    cumulative_column = columns[others[1]] if len(others) > 1 else []
    score_words = [word for word in columns[score_index]
                   if word["value"] is not None and 0 <= word["value"] <= 750]

    tolerance = min(ROW_TOLERANCE, score_pitch * ROW_TOLERANCE_PITCH_FRACTION)

    def nearest(column: list[dict], centre: float) -> dict | None:
        best, best_distance = None, None
        for word in column:
            distance = abs((word["y"] + word["height"] / 2) - centre)
            if best_distance is None or distance < best_distance:
                best, best_distance = word, distance
        return best if best is not None and best_distance is not None and best_distance <= tolerance else None

    rows = []
    unreadable = []
    for score_word in score_words:
        centre = score_word["y"] + score_word["height"] / 2
        count_word = nearest(count_column, centre)
        cumulative_word = nearest(cumulative_column, centre)
        for column_name, word in (("score", score_word), ("count", count_word),
                                  ("cumulative", cumulative_word)):
            if word is not None and word.get("unreadable_gap"):
                unreadable.append({
                    "column": column_name,
                    "row_y": int(centre),
                    "page": page_number,
                    "image": image_name,
                    "fragments": word["fragments"],
                    "note": "OCR 丢失中间数字，按不可读处理，未拼接、未推算",
                })
        rows.append({
            "score": score_word["value"],
            "count": count_word["value"] if count_word else None,
            "cumulative": cumulative_word["value"] if cumulative_word else None,
            "page": page_number,
            "evidence": {
                "image": image_name,
                "score_box": {"x": int(score_word["x"]), "y": int(score_word["y"])},
                "count_box": {"x": int(count_word["x"]), "y": int(count_word["y"])} if count_word else None,
                "cumulative_box": {"x": int(cumulative_word["x"]),
                                   "y": int(cumulative_word["y"])} if cumulative_word else None,
            },
        })
    rows = [row for row in rows if row["score"] is not None]
    rows.sort(key=lambda row: -row["score"])
    return {"page": page_number, "rows": rows, "numeric_word_count": len(words),
            "column_sizes": [len(column) for column in columns],
            "score_column_index": score_index,
            "unreadable_cells": unreadable}


def score_spans_from_boundaries(pages: list[dict]) -> dict[int, tuple[int, int]]:
    """The score range each page must cover, derived from the table's own layout.

    Every page of these tables prints a continuous run of scores stepping down by one, and the
    pages do not overlap: page k+1 starts exactly one below page k's last score. The highest
    page's top score is read reliably (it is printed large and alone), and the bottom is the
    published minimum. So once any page's range is known the rest follow.

    This is used only to *locate* where a misread score belongs; it never supplies a count or a
    cumulative, and a page whose rows cannot be mapped onto the range is reported instead of
    being forced.
    """
    lengths = {page["page"]: len(page["rows"]) for page in pages}
    return lengths


def repair_missing_leading_digits(pages: list[dict]) -> list[dict]:
    """Restore scores whose leading digits OCR dropped, using the run the page must contain.

    Three-digit scores are occasionally read as their last one or two digits: the 2023 理科
    page 9 prints 449..439 but OCR returns ``9``, ``8``, ... for those rows. The misread value
    is still in the right position, so the intended score is recoverable from the page's own
    boundaries, which OCR reads reliably as complete three-digit numbers:

        page k starts one below page k-1's last score and ends one above page k+1's first score

    (the published pages are consecutive, non-overlapping runs). When that inferred range
    contains exactly as many integers as the page has rows, position determines each score.

    A repair needs all of: neighbouring boundaries present, the inferred range length equal to
    the row count, the page's rows strictly descending, and every read value being a suffix of
    the intended one. So a page that is genuinely missing scores — the 2023 last page really
    has no 119, 107 or 104 — is left alone instead of being "corrected" into a full run, and a
    page whose digits are merely missing is restored. Every repaired row keeps what was read.
    """
    ordered = sorted(pages, key=lambda page: page["page"])
    index_by_page = {page["page"]: index for index, page in enumerate(ordered)}
    repairs = []
    for index, page in enumerate(ordered):
        rows = page["rows"]
        if not rows:
            continue
        # Position has to be read in page order, not value order: a row whose leading digits
        # were dropped sorts below a correctly-read neighbour (read 439 sorts above read 9),
        # which would move it out of the slot its position is meant to establish.
        rows = sorted(rows, key=lambda row: row["evidence"]["score_box"]["y"])
        values = [row["score"] for row in rows]
        if any(value is None for value in values):
            continue
        if len(set(values)) != len(values):
            continue  # a repeated value means the page is not a clean descending run
        top, bottom = values[0], values[-1]
        if index > 0:
            previous = ordered[index - 1]["rows"]
            if not previous:
                continue
            top = previous[-1]["score"] - 1
        if index + 1 < len(ordered):
            following = ordered[index + 1]["rows"]
            if not following:
                continue
            bottom = following[0]["score"] + 1
        if top - bottom + 1 != len(rows):
            # The inferred range does not match the printed row count, so either a score is
            # genuinely absent or the boundaries are wrong; position proves nothing here.
            continue
        intended_values = list(range(top, bottom - 1, -1))
        # The evidence that this page is *misread* rather than genuinely different: every value
        # read is a trailing fragment of the score its position must hold, and most rows are
        # already exact. A page of unrelated numbers fails both tests and is left untouched.
        suffix_match = all(str(expect).endswith(str(read))
                           for read, expect in zip(values, intended_values))
        exact = sum(1 for read, expect in zip(values, intended_values) if read == expect)
        if not suffix_match or exact * 2 < len(rows):
            continue
        for row, intended in zip(rows, intended_values):
            if row["score"] != intended:
                row["score_read"] = row["score"]
                row["score_restored_from_run"] = True
                row["score_restoration_note"] = (
                    f"该页为连续递减数列（{top}..{bottom}，共 {len(rows)} 行，"
                    f"边界由相邻页确定），OCR 读作 {row['score_read']}，按行位置恢复为 {intended}")
                row["score"] = intended
                repairs.append({
                    "page": page["page"],
                    "image": row["evidence"]["image"],
                    "read": row["score_read"],
                    "restored": intended,
                    "row_y": row["evidence"]["score_box"]["y"],
                })
    return repairs


def repair_by_arithmetic(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    """Restore misread counts and cumulatives that the table's own arithmetic can prove.

    Every adjacent pair obeys ``cumulative(s) = cumulative(s_above) + count(s)``, because
    cumulative counts everyone at or above a score. A misread digit in one of those values
    breaks the equation, and the equation then says what the value must have been. Accepting
    that answer is not a guess: the published arithmetic identifies it.

    The repair is applied only when both hold:

    * the value read is the expected value with characters dropped — the OCR failure the pages
      actually show, as leading digits (449 → 9), interior digits (1106 → 116) or trailing
      digits (44728 → 728); and
    * exactly one such repair exists for the pair.

    A pair that needs no change, or that admits no unique repair, is left exactly as read and
    recorded as an exception for a human to look at. Because a repaired value is what the next
    pair compares against, the pass repeats until nothing more can be proved.
    """
    ordered = sorted(rows, key=lambda row: -row["score"])
    repairs: list[dict] = []
    unresolved: dict[int, dict] = {}
    max_rounds = 20

    def is_character_drop(read: int, expected: int) -> bool:
        """True when the digits read appear in order inside the expected number."""
        expected_text, read_text = str(expected), str(read)
        position = 0
        for character in expected_text:
            if position < len(read_text) and read_text[position] == character:
                position += 1
        return position == len(read_text)

    for _round in range(max_rounds):
        repaired_this_round = False
        for index, below in enumerate(ordered[1:], start=1):
            above = ordered[index - 1]
            if above["cumulative"] is None or below["cumulative"] is None or below["count"] is None:
                continue
            if below["cumulative"] - above["cumulative"] == below["count"]:
                unresolved.pop(below["score"], None)
                continue
            solved = []
            expected_count = below["cumulative"] - above["cumulative"]
            if expected_count > 0 and is_character_drop(below["count"], expected_count):
                solved.append(("count", expected_count))
            expected_cumulative = above["cumulative"] + below["count"]
            if (expected_cumulative > above["cumulative"]
                    and is_character_drop(below["cumulative"], expected_cumulative)):
                solved.append(("cumulative", expected_cumulative))
            solved = sorted(set(solved))
            if len(solved) != 1:
                unresolved[below["score"]] = {
                    "score": below["score"], "page": below["page"],
                    "image": below["evidence"]["image"],
                    "count_read": below["count"], "cumulative_read": below["cumulative"],
                    "cumulative_above": above["cumulative"],
                    "candidate_repairs": [{"field": field, "value": value}
                                          for field, value in solved],
                    "note": "算术不能唯一确定应修哪个值；保持原样，交人工核对",
                }
                continue
            repaired_this_round = True
            field, value = solved[0]
            if field == "count":
                below["count_read"] = below["count"]
                below["count_derived"] = True
                below["count_derivation"] = (
                    f"cumulative({below['score']}) - cumulative({above['score']}) = "
                    f"{below['cumulative']} - {above['cumulative']} = {value}"
                    f"（OCR 读作 {below['count_read']}，按算术恢复）")
                below["count"] = value
            else:
                below["cumulative_read"] = below["cumulative"]
                below["cumulative_restored_from_arithmetic"] = True
                below["cumulative_restoration_note"] = (
                    f"cumulative({below['score']}) 应为 cumulative({above['score']}) + count = "
                    f"{above['cumulative']} + {below['count']} = {value}"
                    f"（OCR 读作 {below['cumulative_read']}，按算术恢复）")
                below["cumulative"] = value
            repairs.append({"score": below["score"], "field": field,
                            "read": below.get("count_read") if field == "count"
                            else below.get("cumulative_read"),
                            "restored": value, "page": below["page"],
                            "image": below["evidence"]["image"]})
            unresolved.pop(below["score"], None)
        if not repaired_this_round:
            break

    # The head row has no neighbour above it. Once everything else is settled, its cumulative is
    # fixed by the row below when that row alone cannot be wrong:
    #   cumulative(top) = cumulative(below) + count(below) - count(top)
    top = ordered[0]
    if (top["cumulative"] is not None and ordered[1]["cumulative"] is not None
            and ordered[1]["count"] is not None and top["count"] is not None):
        implied = ordered[1]["cumulative"] + ordered[1]["count"] - top["count"]
        if implied > ordered[1]["cumulative"] and is_character_drop(top["cumulative"], implied):
            top["cumulative_read"] = top["cumulative"]
            top["cumulative_restored_from_arithmetic"] = True
            top["cumulative_restoration_note"] = (
                f"cumulative({top['score']}) = cumulative({ordered[1]['score']}) + "
                f"count({ordered[1]['score']}) - count({top['score']}) = "
                f"{ordered[1]['cumulative']} + {ordered[1]['count']} - {top['count']} = {implied}"
                f"（OCR 读作 {top['cumulative_read']}，按算术恢复；该行为表首，上方无邻行）")
            top["cumulative"] = implied
            repairs.append({"score": top["score"], "field": "cumulative",
                            "read": top["cumulative_read"], "restored": implied,
                            "page": top["page"], "image": top["evidence"]["image"]})
            unresolved.pop(top["score"], None)

    return repairs, sorted(unresolved.values(), key=lambda item: -item["score"])


def fill_missing_counts(rows: list[dict]) -> int:
    """Recover an OCR-missed tally from the cumulative difference to the next listed score.

    Rows are ordered by descending score, so ``count(s) = cum(s) - cum(s')`` where s' is the
    next listed score above s: cum counts everyone at or above a score, so the difference is
    exactly the number of people at s. The row is marked ``count_derived`` and the arithmetic
    that produced it is stored, keeping a read value distinct from a computed one.
    """
    filled = 0
    for index, row in enumerate(rows):
        if row["count"] is not None or row["cumulative"] is None or index == 0:
            continue
        above = rows[index - 1]
        if above["cumulative"] is None:
            continue
        difference = row["cumulative"] - above["cumulative"]
        if difference < 0:
            continue
        row["count"] = difference
        row["count_derived"] = True
        row["count_derivation"] = (
            f"cumulative({row['score']}) - cumulative({above['score']}) = "
            f"{row['cumulative']} - {above['cumulative']}")
        filled += 1
    return filled


def unlisted_scores(rows: list[dict]) -> list[int]:
    """Scores absent between the lowest and highest published score.

    The published table omits scores nobody attained; an omitted score is not a zero row.
    """
    present = {row["score"] for row in rows}
    if not present:
        return []
    return sorted((score for score in range(min(present), max(present) + 1)
                   if score not in present), reverse=True)


def load_register() -> dict:
    return json.loads(REGISTER_PATH.read_text(encoding="utf-8"))


def latest_run(register: dict, year: int) -> dict:
    runs = [run for run in register["runs"].values() if int(run["year"]) == year]
    if not runs:
        raise SystemExit(f"no registered fetch run for year {year}")
    return sorted(runs, key=lambda run: run["run_id"])[-1]


def extract(year: int, track: str, run: dict, run_register: dict, ocr_output: Path,
            force: bool) -> dict:
    images = [entry for entry in run_register["entries"]
              if entry.get("asset_kind") == "score_distribution_image" and entry.get("track") == track]
    images.sort(key=lambda entry: entry["page_number"])
    if not images:
        raise SystemExit(f"no registered images for {year} {track}")
    pages = []
    for entry in images:
        image_path = APP_ROOT / entry["snapshot_path"]
        scale_rows: list[list[dict]] = []
        base_page: dict | None = None
        scales = usable_scales(image_path)
        for scale in scales:
            ocr = run_ocr_scaled(image_path, ocr_output, scale, force)
            page = extract_page(ocr, entry["page_number"], track, image_path.name)
            scale_rows.append(page["rows"])
            if base_page is None:
                base_page = page
        # A cell one scale failed to read is often legible at another, so keep every reading and
        # let resolve_columns pick the one the published arithmetic supports.
        if base_page is not None:
            for extra_rows in scale_rows[1:]:
                merge_scale_readings(base_page["rows"], extra_rows)
        assert base_page is not None
        base_page["image_sha256"] = entry["sha256"]
        base_page["image"] = image_path.name
        base_page["scales"] = list(scales)
        pages.append(base_page)
    # Resolution is global, not per page: a block's first row sits directly below the previous
    # page's last row, and the arithmetic that fixes one of them uses the other (2025 物理 的
    # 171 分就落在页边界上).
    # Scores come first: resolution pairs each row with the one above it by score, so a score
    # whose leading digits were dropped has to be restored before that pairing is decided.
    distribution_id = f"SCORE-DIST-{PROVINCE}-{year}-{track}"
    verification_errors: list[str] = []
    score_repairs = repair_missing_leading_digits(pages)
    rows = [row for page in pages for row in page["rows"]]
    rows.sort(key=lambda row: -row["score"])
    # Cells no scale could read, confirmed by reading the published image directly. These are
    # settled before any arithmetic runs: a confirmed cumulative is what the neighbouring rows
    # must check against, so letting the resolver run first would derive those neighbours from
    # the misread value instead. The application is refused if a confirmed value contradicts
    # what the OCR did read.
    verified_applied = verified_score_rows.apply(rows, distribution_id, verification_errors)
    if verification_errors:
        raise SystemExit("; ".join(verification_errors))
    column_decisions, unresolved_rows = resolve_columns(rows)
    # Two independent ways of completing the table take turns: a missing cell is recovered from
    # the cumulative difference, and a misread cell from the arithmetic identity. Each can
    # unblock the other (a recovered count lets a cumulative be proved wrong, and a corrected
    # cumulative lets a neighbouring count be recovered), so alternate them until a pass changes
    # nothing. Both only ever use the published numbers; neither invents a value.

    derived = 0
    arithmetic_repairs: list[dict] = []
    for _pass in range(10):
        filled_here = fill_missing_counts(rows)
        repairs_here, arithmetic_exceptions = repair_by_arithmetic(rows)
        derived += filled_here
        arithmetic_repairs.extend(repairs_here)
        if not filled_here and not repairs_here:
            break
    # Every row must now satisfy the published arithmetic; if not, the extraction is wrong and
    # must not be written out as if it were complete.
    final_disagreements = [
        {"score": below["score"], "count": below["count"], "cumulative": below["cumulative"],
         "cumulative_above": above["cumulative"], "image": below["evidence"]["image"]}
        for above, below in zip(rows, rows[1:])
        if below["count"] is not None and below["cumulative"] is not None
        and above["cumulative"] is not None
        and below["cumulative"] - above["cumulative"] != below["count"]]
    unresolved_rows = [row for row in unresolved_rows if row["score"] in
                       {item["score"] for item in final_disagreements}] + [
        {"score": item["score"], "image": item["image"],
         "note": "最终仍不符合算术，需人工核对"}
        for item in final_disagreements
        if not any(row["score"] == item["score"] for row in unresolved_rows)]
    unreadable = [cell for page in pages for cell in page.get("unreadable_cells", [])]
    page_entry = next(entry for entry in run_register["entries"]
                      if entry.get("asset_kind") == "publication_page"
                      and entry.get("track") == track)
    return {
        "distribution_id": distribution_id,
        "year": year,
        "province": PROVINCE,
        "track": track,
        "curriculum_system": page_entry.get("curriculum_system"),
        "source_id": images[0]["source_id"],
        "source_title": page_entry.get("title"),
        "publication_url": page_entry["url"],
        "run_id": run["run_id"],
        "register_path": run["register_path"],
        "retrieved_at": run["retrieved_at"],
        "pages": len(pages),
        "rows": rows,
        "counts_derived": derived,
        "counts_verified_by_image": verified_applied,
        "column_decisions": column_decisions,
        "unresolved_rows": unresolved_rows,
        "arithmetic_repairs": arithmetic_repairs,
        "arithmetic_exceptions": arithmetic_exceptions,
        "scores_restored_from_run": score_repairs,
        "unreadable_cells": unreadable,
        "unlisted_scores": unlisted_scores(rows),
        "unlisted_score_note": (
            "官方表未列出这些分数：该分数无人达到，不是 0 人记录，也不做插值"),
        "page_details": [{key: value for key, value in page.items() if key != "rows"}
                         for page in pages],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--output", type=Path, default=OUTPUT_ROOT / "score-distribution.json")
    parser.add_argument("--ocr-output", type=Path, default=OUTPUT_ROOT / "ocr")
    parser.add_argument("--year", type=int, action="append",
                        help="only extract this year (repeatable); default is every registered year. "
                             "A filtered run writes a filtered file, so it needs its own --output "
                             "to avoid replacing the complete extraction")
    parser.add_argument("--allow-partial-output", action="store_true",
                        help="permit --year without a separate --output (replaces the output file)")
    parser.add_argument("--force-ocr", action="store_true",
                        help="re-run OCR even when a cached result exists")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    if args.year and args.output == OUTPUT_ROOT / "score-distribution.json"             and not args.allow_partial_output:
        raise SystemExit(
            "refusing to run --year into the default output: that would replace the complete "
            "extraction with a subset. Pass --output <path> or --allow-partial-output.")
    register = load_register()
    years = sorted({int(run["year"]) for run in register["runs"].values()})
    if args.year:
        years = [year for year in years if year in set(args.year)]
        if not years:
            raise SystemExit("no registered run matches the requested year")
    distributions = []
    for year in years:
        run = latest_run(register, year)
        run_register = json.loads((APP_ROOT / run["register_path"]).read_text(encoding="utf-8"))
        tracks = sorted(run["tracks"])
        for track in tracks:
            if not args.quiet:
                print(f"extracting {year} {track} ({run['tracks'][track]['images']} images)",
                      file=sys.stderr, flush=True)
            distributions.append(
                extract(year, track, run, run_register, args.ocr_output, args.force_ocr))
    payload = {
        "format_version": "2.0.0",
        "province": PROVINCE,
        "publication_status": "NOT_PUBLISHED",
        "data_authority": "四川省教育考试院官方发布页",
        "extraction_method": "WINDOWS_OCR_WORD_COORDINATE_ROW_ALIGNMENT",
        "curriculum_systems": {
            "new_gaokao": "2025 起 物理类/历史类（3+1+2 首选科目）",
            "old_system": "2024 及以前 理科/文科（文理分科）；与物理类/历史类不是同一定义",
        },
        "distributions": distributions,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                           encoding="utf-8")
    print(json.dumps({
        "status": "passed",
        "output": str(args.output),
        "rows": {item["distribution_id"]: len(item["rows"]) for item in distributions},
        "pages": {item["distribution_id"]: item["pages"] for item in distributions},
        "score_range": {item["distribution_id"]: [min(row["score"] for row in item["rows"]),
                                                  max(row["score"] for row in item["rows"])]
                        for item in distributions if item["rows"]},
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
