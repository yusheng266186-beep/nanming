"""Independent semantic and hash validation for the bounded TASK-03 sample."""

from __future__ import annotations

import hashlib
import json
import sys
from collections import defaultdict
from pathlib import Path


APP_ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = APP_ROOT / "data" / "task03"
ALLOWED_ENTITIES = {"plan_record", "score_distribution_point", "admission_observation"}
ALLOWED_COMPARISON = {"PENDING_HUMAN", "MISSING", "CONFLICT", "MATCH"}


def read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition: bool, message: str, failures: list[str]) -> None:
    if not condition:
        failures.append(message)


def main() -> int:
    failures: list[str] = []
    checks = 0
    latest = read(DATA_ROOT / "source-snapshot-register.json")
    register = read(APP_ROOT / latest["latest_register_path"])
    sample_set = read(DATA_ROOT / "structured-samples.json")
    verification = read(DATA_ROOT / "verification-records.json")
    coverage = read(DATA_ROOT / "coverage.json")
    issues = read(DATA_ROOT / "issues.json")
    workbook_register = read(DATA_ROOT / "workbook-input-register.json")

    require(register["representative_asset_count"] == 5, "representative asset count must remain 5", failures)
    require(len(register["entries"]) == 10, "five entry HTML files and five representative assets are required", failures)
    for entry in register["entries"]:
        path = APP_ROOT / entry["snapshot_path"]
        require(path.is_file(), f"missing snapshot: {entry['snapshot_path']}", failures)
        if path.is_file():
            require(sha256(path) == entry["sha256"], f"snapshot hash mismatch: {entry['snapshot_path']}", failures)
            require(path.stat().st_size == entry["size_bytes"], f"snapshot size mismatch: {entry['snapshot_path']}", failures)
    checks += 1

    extraction = read(DATA_ROOT / "extraction" / register["run_id"] / "extraction-run.json")
    require(extraction["human_review_performed"] is False, "OCR run cannot claim human review", failures)
    require(len(extraction["outputs"]) == 5, "five OCR outputs are required", failures)
    for output in extraction["outputs"]:
        path = APP_ROOT / output["ocr_output_path"]
        require(path.is_file() and sha256(path) == output["ocr_output_sha256"], f"OCR hash mismatch: {output['asset_id']}", failures)
    checks += 1

    records = sample_set["records"]
    require(sample_set["publication_status"] == "NOT_PUBLISHED", "sample set must not be published", failures)
    require(sample_set["human_review_performed"] is False, "sample set cannot claim human review", failures)
    require(sample_set["record_count"] == len(records) == 17, "expected exactly 17 bounded sample rows", failures)
    require(len({row["sample_id"] for row in records}) == len(records), "sample ids must be unique", failures)
    require({row["entity_type"] for row in records} <= ALLOWED_ENTITIES, "unexpected entity type", failures)
    require(all(row["publication_status"] == "VALIDATED_NOT_VERIFIED" for row in records), "record publication state elevated", failures)
    require(all(row["review"]["human_review_performed"] is False for row in records), "record claims human review", failures)
    require(all(row["review"]["source_comparison_status"] in ALLOWED_COMPARISON for row in records), "invalid comparison state", failures)
    checks += 1

    plan_rows = [row for row in records if row["entity_type"] == "plan_record"]
    require(len(plan_rows) == 7, "expected seven plan rows", failures)
    group_totals: dict[tuple[str, str, str], set[int]] = defaultdict(set)
    group_selected: dict[tuple[str, str, str], int] = defaultdict(int)
    for row in plan_rows:
        key = (row["track"], row["institution_code"], row["group_code"])
        group_totals[key].add(row["group_plan_count"])
        group_selected[key] += row["plan_count"]
        require(row["year"] == 2026 and row["category"] == "普通类", f"plan scope drift: {row['sample_id']}", failures)
        require(row["plan_count"] > 0 and row["group_plan_count"] > 0, f"invalid plan count: {row['sample_id']}", failures)
    require(all(len(values) == 1 for values in group_totals.values()), "inherited group totals conflict", failures)
    for key, selected in group_selected.items():
        require(selected <= next(iter(group_totals[key])), f"selected plan rows exceed group total: {key}", failures)
    checks += 1

    rank_rows = [row for row in records if row["entity_type"] == "score_distribution_point"]
    require(len(rank_rows) == 6, "expected six score-distribution rows", failures)
    require(all("非全表" in row["excerpt_scope"] for row in rank_rows), "score excerpt presented as exhaustive", failures)
    missing_rank = next((row for row in rank_rows if row["sample_id"] == "rank-physics-679"), None)
    require(missing_rank is not None and missing_rank["people_at_score"] is None, "missing OCR count was reconstructed", failures)
    require(missing_rank is not None and "people_at_score" in missing_rank["unknown_fields"], "missing OCR count not declared", failures)
    checks += 1

    admission_rows = [row for row in records if row["entity_type"] == "admission_observation"]
    require(len(admission_rows) == 4, "expected four historical admission observations", failures)
    require(all(row["metric_type"] != "group_filing_min" for row in admission_rows), "group admission minimum mislabeled as filing minimum", failures)
    for row in admission_rows:
        require(row["metric_type"] in {"group_admission_min", "major_admission_min"}, f"invalid admission metric: {row['sample_id']}", failures)
        require((row["offering_name"] is None) == (row["metric_type"] == "group_admission_min"), f"group/major metric collision: {row['sample_id']}", failures)
        require(row["batch"] is None and "batch" in row["unknown_fields"], f"historical batch guessed: {row['sample_id']}", failures)
        require(row["admission_type"] is None and "admission_type" in row["unknown_fields"], f"historical admission type guessed: {row['sample_id']}", failures)
        require(row["score_basis"] is None and "score_basis" in row["unknown_fields"], f"score basis guessed: {row['sample_id']}", failures)
    checks += 1

    require(verification["human_review_performed"] is False, "verification ledger claims human review", failures)
    require(len(verification["records"]) == len(records), "verification ledger count mismatch", failures)
    require(all(row["human_review_status"] == "PENDING" for row in verification["records"]), "human approval fabricated", failures)
    require({row["sample_id"] for row in verification["records"]} == {row["sample_id"] for row in records}, "verification ledger ids mismatch", failures)
    checks += 1

    require(coverage["representative_assets"] == 5 and coverage["structured_records"] == 17, "coverage summary mismatch", failures)
    require(all(scope["exhaustive"] is False for scope in coverage["scopes"]), "partial scope marked exhaustive", failures)
    require(any("group_filing_min" in gap for gap in coverage["explicit_gaps"]), "filing-minimum gap omitted", failures)
    checks += 1

    require(len(issues["issues"]) >= 5, "issue list unexpectedly reduced", failures)
    require(all(issue["status"] == "OPEN" for issue in issues["issues"]), "unreviewed issue marked resolved", failures)
    checks += 1

    require(len(workbook_register["inputs"]) == 2, "workbook input register must list both files", failures)
    require(all(item["authority"] == "USER_PROVIDED_SECONDARY_WORKBOOK_NOT_OFFICIAL_SNAPSHOT" for item in workbook_register["inputs"]), "workbook authority elevated", failures)
    require(all(len(item["sha256"]) == 64 for item in workbook_register["inputs"]), "workbook hash missing", failures)
    checks += 1

    frozen = APP_ROOT / "packages" / "contracts" / "schema" / "data-release.schema.json"
    baseline = APP_ROOT / "docs" / "baseline" / "contracts" / "data-release.schema.json"
    require(frozen.read_bytes() == baseline.read_bytes(), "frozen data-release schema changed", failures)
    checks += 1

    result = {
        "status": "failed" if failures else "passed",
        "semantic_check_groups": checks,
        "representative_assets": 5,
        "snapshot_files_checked": len(register["entries"]),
        "ocr_outputs_checked": len(extraction["outputs"]),
        "structured_records_checked": len(records),
        "human_verified_records": 0,
        "published_records": 0,
        "failures": failures,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
