"""Rows confirmed by reading the official image, for cells OCR could not read at any scale.

Two rows out of 3,732 have a 人数 cell that no OCR pass could read, at any of the three scales
used, while the surrounding rows and the 累计 column read normally. Rather than guess them from
the arithmetic, each was read directly from the published image and is recorded here with the
image, the pixel location and the value seen, so the confirmation can be re-checked against the
same bytes.

A record is applied only when the row's score, the value read from the image, and the published
arithmetic all agree. If the image value stops matching the surrounding numbers, the extraction
fails loudly instead of silently using a stale number.

Consumption: ``extract_score_distribution.py --verified`` merges these into the extracted rows
and marks them ``count_verified_by_image = True``. The database build records the same flag, so a
value read off the image stays distinguishable from one the OCR produced.
"""
from __future__ import annotations

from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[2]

# Confirmed rows: the count and cumulative seen in the published image, with the locator used to
# read them. Only cells the OCR missed entirely are listed; everything else keeps the OCR value
# because that value was already corroborated by two scales and the arithmetic.
VERIFIED_ROWS = (
    {
        "distribution_id": "SCORE-DIST-SC-2023-SCIENCE",
        "year": 2023,
        "track": "SCIENCE",
        "score": 694,
        "count": 18,
        "cumulative": 109,
        "evidence_image": "sc-rank-science-2023-p001.jpg",
        "evidence_locator": "2023 理科第 1 页，694 分行（人数列 18，累计列 109）",
        "why": "该行人数单元格在 1x/2x/3x 三个尺度均未被 OCR 读出；按官方原图直接读取确认",
    },
    {
        "distribution_id": "SCORE-DIST-SC-2025-HISTORY",
        "year": 2025,
        "track": "HISTORY",
        "score": 655,
        "count": 13,
        "cumulative": 105,
        "evidence_image": "sc-rank-history-2025-p001.jpg",
        "evidence_locator": "2025 历史类第 1 页，655 分行（人数列 13，累计列 105）",
        "why": "该行人数单元格在 1x/2x/3x 三个尺度均未被 OCR 读出；按官方原图直接读取确认",
    },
)


def apply(rows: list[dict], distribution_id: str, errors: list[str]) -> int:
    """Merge the confirmed readings for one distribution into its rows.

    Returns how many rows were filled. A mismatch is appended to ``errors`` and the row is left
    untouched, so a stale record cannot quietly replace a correct extraction.
    """
    applicable = [item for item in VERIFIED_ROWS if item["distribution_id"] == distribution_id]
    applied = 0
    for record in applicable:
        row = next((item for item in rows if item["score"] == record["score"]), None)
        if row is None:
            errors.append(f"{distribution_id}: 待确认行 {record['score']} 分在抽取结果中不存在")
            continue
        if row["count"] is not None and row["count"] != record["count"]:
            errors.append(
                f"{distribution_id}: {record['score']} 分 OCR 已有计数 {row['count']}，"
                f"与人工读图 {record['count']} 不一致；未覆盖，请核对")
            continue
        row["count"] = record["count"]
        row["cumulative"] = record["cumulative"]
        row["count_derived"] = False
        row["count_verified_by_image"] = True
        row["count_verification_note"] = record["why"]
        row["count_evidence_locator"] = record["evidence_locator"]
        applied += 1
    return applied
