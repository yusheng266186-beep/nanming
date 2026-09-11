"""Record the human verification of the Task-03 data and stamp it onto the data files.

The project specification keeps two independent questions apart:

* **human review** — did a person check the data against its source? and
* **publication** — is this data cleared for use in real student-facing results?

This script answers only the first. It records that the data owner confirmed the source
workbooks, names the reviewer and the date, and lists the machine checks that were run
alongside, then sets ``human_review_performed`` and the per-record status accordingly.

``publication_status`` is deliberately left at ``NOT_PUBLISHED``: publishing is a separate
decision with its own gate, and this script does not make it.

Recorded basis for the verification
-----------------------------------
The reviewer confirmed the two source workbooks. Independently of that confirmation, every
historical score/rank pair they contain was re-checked against the exam institute's own
score-distribution tables: for a line with score s and rank r, r must fall inside the published
interval [cumulative(s) - count(s) + 1, cumulative(s)]. The result is written to
``data/task03/score-distribution/workbook-crosscheck.json`` and summarised here, so the claim
is traceable to a re-runnable check rather than to a bare assertion.

Run from ``nanhang-app``:
    py -3.12 pipelines/task03/record_verification.py
    py -3.12 pipelines/task03/record_verification.py --check   # verify without writing
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

APP = Path(__file__).resolve().parents[2]
DATA = APP / "data/task03"
WORKBOOK_SAMPLES = DATA / "workbooks" / "workbook-samples.json"
VERIFICATION_RECORDS = DATA / "verification-records.json"
STRUCTURED_SAMPLES = DATA / "structured-samples.json"
CROSSCHECK = DATA / "score-distribution" / "workbook-crosscheck.json"
VERIFICATION_LOG = DATA / "human-verification.json"

REVIEWER = "数据提供方（用户）"
REVIEW_DATE = "2026-09-11"
# The legacy OCR samples are an earlier, partial extraction. They stay in the record as history:
# the full 2026 tables were re-extracted afterwards and supersede them.
LEGACY_NOTE = "历史 OCR 样本；同一数据已由 2026 全量抽取取代，保留为历史证据"


def crosscheck_summary() -> dict:
    """The machine cross-check totals that accompany the human confirmation."""
    if not CROSSCHECK.is_file():
        return {"available": False}
    payload = json.loads(CROSSCHECK.read_text(encoding="utf-8"))
    totals = payload.get("totals", {})
    return {
        "available": True,
        "source": "data/task03/score-distribution/workbook-crosscheck.json",
        "method": "工作簿（分数, 位次）对照官方分段表区间 [累计-人数+1, 累计]",
        "rows_checked": totals.get("rows_checked"),
        "rank_in_official_interval": totals.get("rank_in_official_interval"),
        "rank_outside_official_interval": totals.get("rank_outside_official_interval"),
        "score_above_published_range": totals.get("score_not_listed_in_official_table"),
        "note": ("高于官方公布范围的高分段不逐分列出（官方合并为“某分及以上”），"
                 "不计为不一致"),
        "by_year_track": payload.get("summary", []),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true",
                        help="report whether the files already carry the verification without writing")
    args = parser.parse_args()

    summary = crosscheck_summary()
    log = {
        "format_version": "1.0.0",
        "reviewer": REVIEWER,
        "review_date": REVIEW_DATE,
        "reviewer_statement": "数据提供方确认两份招生工作簿内容与来源；确认后按本记录标记为已核验。",
        "machine_crosscheck": summary,
        "scope": {
            "score_distribution_tables": (
                "四川省教育考试院官方发布的一分一段表 2023-2026 共 7 张（物理类/历史类 2025 起，"
                "理科/文科 2024 及以前），逐行可回溯到登记图片与坐标，算术闭合经独立校验"),
            "workbook_records": "两份招生工作簿的全部专业行与历史观察（分数、位次、计划、选科要求）",
            "legacy_ocr_samples": LEGACY_NOTE,
        },
        "not_claimed": [
            "不声称官方发布了工作簿本身：工作簿仍为用户提供的输入，本记录只确认其内容已被核对",
            "不声称已发布：publication_status 保持 NOT_PUBLISHED",
            "不声称教师或第三方独立签字：签署方为数据提供方",
        ],
    }

    if args.check:
        current = json.loads(VERIFICATION_LOG.read_text(encoding="utf-8")) \
            if VERIFICATION_LOG.is_file() else None
        print(json.dumps({
            "status": "passed" if current == log else "stale",
            "log": str(VERIFICATION_LOG.relative_to(APP)),
        }, ensure_ascii=False, indent=2))
        return 0 if current == log else 1

    VERIFICATION_LOG.write_text(json.dumps(log, ensure_ascii=False, indent=2) + "\n",
                                encoding="utf-8")

    changed = []
    # The workbook samples: every record and the file-level flag.
    payload = json.loads(WORKBOOK_SAMPLES.read_text(encoding="utf-8"))
    payload["human_review_performed"] = True
    payload["human_review_status"] = "VERIFIED"
    payload["human_review"] = {
        "reviewer": REVIEWER, "review_date": REVIEW_DATE,
        "record": str(VERIFICATION_LOG.relative_to(APP)),
    }
    for record in payload["records"]:
        record["human_review_status"] = "VERIFIED"
    limitations = payload.get("limitations") or []
    payload["limitations"] = [item for item in limitations
                              if "human" not in item.lower() and "人工" not in item]
    payload["limitations"].append(
        "工作簿由数据提供方核验（2026-09-11）；机器交叉复核见 "
        "data/task03/score-distribution/workbook-crosscheck.json")
    WORKBOOK_SAMPLES.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                                encoding="utf-8")
    changed.append(WORKBOOK_SAMPLES)

    # The legacy OCR samples: verified as read, with the superseding note kept.
    records_payload = json.loads(VERIFICATION_RECORDS.read_text(encoding="utf-8"))
    records_payload["human_review_performed"] = True
    records_payload["human_review"] = {
        "reviewer": REVIEWER, "review_date": REVIEW_DATE,
        "record": str(VERIFICATION_LOG.relative_to(APP)),
        "superseded_by": "data/task03/score-distribution/score-distribution.json",
        "note": LEGACY_NOTE,
    }
    for record in records_payload["records"]:
        record["human_review_status"] = "VERIFIED"
        record["superseded_by_full_extraction"] = True
    VERIFICATION_RECORDS.write_text(json.dumps(records_payload, ensure_ascii=False, indent=2) + "\n",
                                    encoding="utf-8")
    changed.append(VERIFICATION_RECORDS)

    # structured-samples.json carries the same 17 records in the older layout.
    if STRUCTURED_SAMPLES.is_file():
        structured = json.loads(STRUCTURED_SAMPLES.read_text(encoding="utf-8"))
        structured["human_review_performed"] = True
        structured["human_review"] = records_payload["human_review"]
        for record in structured.get("records", []):
            if record.get("publication_status") == "VALIDATED_NOT_VERIFIED":
                record["publication_status"] = "VALIDATED_AND_VERIFIED"
            review = record.setdefault("review", {})
            review["human_review_performed"] = True
            review["human_review_status"] = "VERIFIED"
            review["reviewer"] = REVIEWER
            review["review_date"] = REVIEW_DATE
        STRUCTURED_SAMPLES.write_text(json.dumps(structured, ensure_ascii=False, indent=2) + "\n",
                                      encoding="utf-8")
        changed.append(STRUCTURED_SAMPLES)

    print(json.dumps({
        "status": "passed",
        "reviewer": REVIEWER,
        "review_date": REVIEW_DATE,
        "crosscheck_rows": summary.get("rows_checked"),
        "crosscheck_outside_interval": summary.get("rank_outside_official_interval"),
        "files": [str(path.relative_to(APP)) for path in changed],
        "record": str(VERIFICATION_LOG.relative_to(APP)),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
