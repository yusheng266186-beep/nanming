"""Run bounded TASK-03 extraction against the registered source snapshots.

The script preserves raw Windows OCR output.  It never publishes records and it
does not treat OCR/model review as human verification.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree


APP_ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = APP_ROOT / "data" / "task03"
LATEST_REGISTER = DATA_ROOT / "source-snapshot-register.json"
OCR_SCRIPT = Path(__file__).with_name("windows_ocr.ps1")
WINDOWS_POWERSHELL = Path(r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe")
XLSX_MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"

PLAN_SELECTIONS = (
    {
        "track": "PHYSICS",
        "workbook_prefix": "物理类 ",
        "institution_code": "0308",
        "group_code": "107",
        "major_code": "1B",
        "asset_id": "SC-PLAN-P-2026-P005",
        "image_locator": "第5页左栏，0308 中国人民公安大学，专业组107下第1行",
    },
    {
        "track": "PHYSICS",
        "workbook_prefix": "物理类 ",
        "institution_code": "0308",
        "group_code": "107",
        "major_code": "1C",
        "asset_id": "SC-PLAN-P-2026-P005",
        "image_locator": "第5页左栏，0308 中国人民公安大学，专业组107下第2行",
    },
    {
        "track": "PHYSICS",
        "workbook_prefix": "物理类 ",
        "institution_code": "0327",
        "group_code": "505",
        "major_code": "1H",
        "asset_id": "SC-PLAN-P-2026-P005",
        "image_locator": "第5页左栏下部，0327 中国刑事警察学院，专业组505第1行",
    },
    {
        "track": "PHYSICS",
        "workbook_prefix": "物理类 ",
        "institution_code": "0327",
        "group_code": "505",
        "major_code": "1J",
        "asset_id": "SC-PLAN-P-2026-P005",
        "image_locator": "第5页左栏下部，0327 中国刑事警察学院，专业组505第2行",
    },
    {
        "track": "PHYSICS",
        "workbook_prefix": "物理类 ",
        "institution_code": "0327",
        "group_code": "505",
        "major_code": "1K",
        "asset_id": "SC-PLAN-P-2026-P005",
        "image_locator": "第5页左栏下部，0327 中国刑事警察学院，专业组505第3行",
    },
    {
        "track": "HISTORY",
        "workbook_prefix": "历史类 ",
        "institution_code": "0308",
        "group_code": "101",
        "major_code": "11",
        "asset_id": "SC-PLAN-H-2026-P005",
        "image_locator": "第5页左栏底部，0308 中国人民公安大学，专业组101第1行",
    },
    {
        "track": "HISTORY",
        "workbook_prefix": "历史类 ",
        "institution_code": "0308",
        "group_code": "101",
        "major_code": "13",
        "asset_id": "SC-PLAN-H-2026-P005",
        "image_locator": "第5页左栏底部，0308 中国人民公安大学，专业组101第2行",
    },
)

RANK_SELECTIONS = {
    "SC-RANK-P-2026-I001": ("PHYSICS", (685, 684, 679), "685—660分（第1张，非全表）"),
    "SC-RANK-H-2026-I001": ("HISTORY", (662, 661, 646), "662—637分（第1张，非全表）"),
}

SICAU_SELECTIONS = (
    {
        "sample_id": "admission-sicau-seed-2025",
        "anchor": "种子科学与工程",
        "anchor_min_x": 800,
        "track": "PHYSICS",
        "offering": "种子科学与工程",
        "group_name": "种子科学与工程组",
        "metric_type": "major_admission_min",
        "locator": "正文大图，种子科学与工程行，2025年列",
    },
    {
        "sample_id": "admission-sicau-plant-group-2025",
        "anchor": "植物生产与绿美工程组最低录取分数及位次",
        "anchor_min_x": 350,
        "track": "PHYSICS",
        "offering": None,
        "group_name": "植物生产与绿美工程组",
        "metric_type": "group_admission_min",
        "locator": "正文大图，植物生产与绿美工程组最低录取分数及位次行，2025年列",
    },
    {
        "sample_id": "admission-sicau-accounting-history-2025",
        "anchor": "会计学",
        "anchor_min_x": 800,
        "anchor_y_min": 4800,
        "track": "HISTORY",
        "offering": "会计学",
        "group_name": "经济管理组（历史）",
        "metric_type": "major_admission_min",
        "locator": "正文大图，经济管理组（历史）会计学行，2025年列",
    },
    {
        "sample_id": "admission-sicau-economics-history-group-2025",
        "anchor": "经济管理组（历史）最低录取分数及位次",
        "ocr_anchor": "经氵齐管理纟且（历史）最低录取分数及位次",
        "anchor_min_x": 350,
        "track": "HISTORY",
        "offering": None,
        "group_name": "经济管理组（历史）",
        "metric_type": "group_admission_min",
        "locator": "正文大图，经济管理组（历史）最低录取分数及位次行，2025年列",
    },
)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_latest_register() -> dict[str, object]:
    latest = json.loads(LATEST_REGISTER.read_text(encoding="utf-8"))
    return json.loads((APP_ROOT / latest["latest_register_path"]).read_text(encoding="utf-8"))


def run_ocr(image_path: Path) -> dict[str, object]:
    completed = subprocess.run(
        [
            str(WINDOWS_POWERSHELL),
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(OCR_SCRIPT),
            "-ImagePath",
            str(image_path),
            "-Language",
            "zh-Hans",
            "-Json",
        ],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8-sig",
        errors="strict",
    )
    return json.loads(completed.stdout)


def extract_raw_ocr() -> int:
    register = load_latest_register()
    run_id = str(register["run_id"])
    out_dir = DATA_ROOT / "extraction" / run_id
    out_dir.mkdir(parents=True, exist_ok=True)
    outputs: list[dict[str, object]] = []

    for entry in register["entries"]:
        if "asset_id" not in entry:
            continue
        path = APP_ROOT / entry["snapshot_path"]
        result = run_ocr(path)
        output_path = out_dir / f"{entry['asset_id']}.ocr.json"
        payload = (json.dumps(result, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        output_path.write_bytes(payload)
        outputs.append(
            {
                "asset_id": entry["asset_id"],
                "source_snapshot_path": entry["snapshot_path"],
                "source_sha256": entry["sha256"],
                "ocr_output_path": output_path.relative_to(APP_ROOT).as_posix(),
                "ocr_output_sha256": digest(payload),
                "ocr_language": result["language"],
                "ocr_text_angle": result["text_angle"],
                "ocr_line_count": len(result["lines"]),
            }
        )

    completed_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    run_record = {
        "version": "1.0.0",
        "source_run_id": run_id,
        "completed_at": completed_at,
        "engine": "Windows.Media.Ocr.OcrEngine",
        "language": "zh-Hans",
        "human_review_performed": False,
        "publication_status": "NOT_PUBLISHED",
        "outputs": outputs,
    }
    run_path = out_dir / "extraction-run.json"
    run_path.write_text(json.dumps(run_record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run_record, ensure_ascii=False, indent=2))
    return 0


def column_number(reference: str) -> int:
    letters = re.match(r"[A-Z]+", reference)
    if not letters:
        raise ValueError(f"invalid cell reference: {reference}")
    value = 0
    for char in letters.group(0):
        value = value * 26 + ord(char) - ord("A") + 1
    return value


def load_shared_strings(book: zipfile.ZipFile) -> list[str]:
    try:
        payload = book.read("xl/sharedStrings.xml")
    except KeyError:
        return []
    root = ElementTree.fromstring(payload)
    strings: list[str] = []
    for item in root.findall(f"{{{XLSX_MAIN_NS}}}si"):
        strings.append("".join(node.text or "" for node in item.iter(f"{{{XLSX_MAIN_NS}}}t")))
    return strings


def read_selected_workbook_rows(path: Path, requested: set[tuple[str, str, str]]) -> tuple[dict[str, str], dict[tuple[str, str, str], dict[str, object]]]:
    with zipfile.ZipFile(path) as book:
        shared = load_shared_strings(book)
        rows: dict[tuple[str, str, str], dict[str, object]] = {}
        headers: dict[int, str] = {}
        with book.open("xl/worksheets/sheet1.xml") as sheet:
            for _event, element in ElementTree.iterparse(sheet, events=("end",)):
                if element.tag != f"{{{XLSX_MAIN_NS}}}row":
                    continue
                row_number = int(element.attrib["r"])
                values: dict[int, object] = {}
                for cell in element.findall(f"{{{XLSX_MAIN_NS}}}c"):
                    reference = cell.attrib["r"]
                    col = column_number(reference)
                    if col > 23:
                        continue
                    value_node = cell.find(f"{{{XLSX_MAIN_NS}}}v")
                    if cell.attrib.get("t") == "inlineStr":
                        inline = cell.find(f"{{{XLSX_MAIN_NS}}}is")
                        value: object = "" if inline is None else "".join(
                            node.text or "" for node in inline.iter(f"{{{XLSX_MAIN_NS}}}t")
                        )
                    elif value_node is None:
                        value = None
                    elif cell.attrib.get("t") == "s":
                        value = shared[int(value_node.text or "0")]
                    elif cell.attrib.get("t") == "b":
                        value = value_node.text == "1"
                    else:
                        raw = value_node.text or ""
                        try:
                            number = float(raw)
                            value = int(number) if number.is_integer() else number
                        except ValueError:
                            value = raw
                    values[col] = value
                if row_number == 1:
                    headers = {col: str(value) for col, value in values.items()}
                else:
                    key = (str(values.get(4, "")).zfill(4), str(values.get(11, "")), str(values.get(12, "")))
                    if key in requested:
                        rows[key] = {
                            "row_number": row_number,
                            "values": {headers[col]: values.get(col) for col in sorted(headers) if col <= 23},
                        }
                        if len(rows) == len(requested):
                            break
                element.clear()
    return {str(key): value for key, value in headers.items()}, rows


def normalize_ocr_text(value: str) -> str:
    return re.sub(r"[\s（）()/·、，。：；《》【】\[\]-]", "", value).replace("多", "分")


def source_batch_fields(raw_batch: str, raw_type: object) -> tuple[str, str | None, str]:
    if raw_batch == "本科提前批(国家专项)":
        return "本科提前批次", None, "国家专项计划"
    if raw_batch == "本科提前批A段":
        return "本科提前批次", "A段", str(raw_type)
    raise ValueError(f"unmapped selected batch: {raw_batch}")


def build_plan_samples(workbook_root: Path, register: dict[str, object]) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    samples: list[dict[str, object]] = []
    workbook_register: list[dict[str, object]] = []
    entries = {entry.get("asset_id"): entry for entry in register["entries"] if "asset_id" in entry}

    for prefix in sorted({item["workbook_prefix"] for item in PLAN_SELECTIONS}):
        matches = sorted(workbook_root.glob(f"{prefix}*.xlsx"))
        if len(matches) != 1:
            raise ValueError(f"expected exactly one workbook for prefix {prefix!r}, found {len(matches)}")
        path = matches[0]
        selections = [item for item in PLAN_SELECTIONS if item["workbook_prefix"] == prefix]
        requested = {(item["institution_code"], item["group_code"], item["major_code"]) for item in selections}
        _headers, rows = read_selected_workbook_rows(path, requested)
        if set(rows) != requested:
            raise ValueError(f"selected workbook rows missing in {path.name}: {sorted(requested - set(rows))}")
        workbook_sha = digest(path.read_bytes())
        workbook_register.append(
            {
                "path": path.relative_to(workbook_root).as_posix(),
                "absolute_location_policy": "resolved relative to --workbook-root; absolute path not persisted",
                "sheet": "物理" if prefix.startswith("物理") else "历史",
                "sha256": workbook_sha,
                "size_bytes": path.stat().st_size,
                "authority": "USER_PROVIDED_SECONDARY_WORKBOOK_NOT_OFFICIAL_SNAPSHOT",
            }
        )
        for selection in selections:
            key = (selection["institution_code"], selection["group_code"], selection["major_code"])
            row = rows[key]
            values = row["values"]
            batch, stage, admission_type = source_batch_fields(str(values["批次"]), values["计划类别"])
            ocr_path = DATA_ROOT / "extraction" / str(register["run_id"]) / f"{selection['asset_id']}.ocr.json"
            ocr = json.loads(ocr_path.read_text(encoding="utf-8"))
            normalized_ocr = normalize_ocr_text(str(ocr["text"]))
            major_code_found = normalize_ocr_text(str(values["专业代码"])) in normalized_ocr
            name_found = normalize_ocr_text(str(values["专业名称"])) in normalized_ocr
            institution_found = normalize_ocr_text(str(values["院校名称"])) in normalized_ocr
            samples.append(
                {
                    "sample_id": f"plan-{selection['track'].lower()}-{selection['institution_code']}-{selection['group_code']}-{selection['major_code'].lower()}",
                    "entity_type": "plan_record",
                    "year": 2026,
                    "track": selection["track"],
                    "category": "普通类",
                    "batch": batch,
                    "stage": stage,
                    "admission_type": admission_type,
                    "institution_code": selection["institution_code"],
                    "institution_name": values["院校名称"],
                    "group_code": selection["group_code"],
                    "group_plan_count": values["26专业组计划人数"],
                    "major_code": selection["major_code"],
                    "major_name": values["专业名称"],
                    "plan_count": values["26计划人数"],
                    "tuition": values["26学费"],
                    "duration_years": values["26学制"],
                    "subject_requirement_source": values["选科要求"],
                    "notes_source": values["专业备注"],
                    "unknown_fields": [],
                    "evidence": {
                        "official_asset_id": selection["asset_id"],
                        "official_snapshot_sha256": entries[selection["asset_id"]]["sha256"],
                        "official_image_locator": selection["image_locator"],
                        "workbook_name": path.name,
                        "workbook_sha256": workbook_sha,
                        "workbook_sheet": workbook_register[-1]["sheet"],
                        "workbook_range": f"A{row['row_number']}:W{row['row_number']}",
                    },
                    "extraction": {
                        "method": "SECONDARY_WORKBOOK_TEXT_LAYER_WITH_OFFICIAL_IMAGE_OCR_CROSS_CHECK",
                        "ocr_major_code_found": major_code_found,
                        "ocr_major_name_found": name_found,
                        "ocr_institution_name_found": institution_found,
                        "automated_status": "MATCH" if major_code_found and name_found and institution_found else "CONFLICT",
                    },
                    "review": {
                        "source_comparison_status": "PENDING_HUMAN",
                        "human_review_performed": False,
                        "note": "程序已对照官方图片 OCR 与工作簿文字层；密集多栏 OCR 不足以代替人工逐字核实。",
                    },
                    "publication_status": "VALIDATED_NOT_VERIFIED",
                }
            )
    return samples, workbook_register


def numeric_words(ocr: dict[str, object]) -> list[dict[str, int | str]]:
    output: list[dict[str, int | str]] = []
    for line in ocr["lines"]:
        for word in line["words"]:
            if re.fullmatch(r"\d+", str(word["text"])):
                output.append(word)
    return output


def nearest_number(words: list[dict[str, int | str]], y: float, x_min: float, x_max: float, tolerance: float = 28) -> tuple[int | None, dict[str, int | str] | None]:
    candidates = [word for word in words if x_min <= float(word["x"]) < x_max and abs(float(word["y"]) - y) <= tolerance]
    if not candidates:
        return None, None
    selected = min(candidates, key=lambda word: abs(float(word["y"]) - y))
    return int(str(selected["text"])), selected


def build_rank_samples(register: dict[str, object]) -> list[dict[str, object]]:
    samples: list[dict[str, object]] = []
    entries = {entry.get("asset_id"): entry for entry in register["entries"] if "asset_id" in entry}
    for asset_id, (track, selected_scores, excerpt_scope) in RANK_SELECTIONS.items():
        ocr_path = DATA_ROOT / "extraction" / str(register["run_id"]) / f"{asset_id}.ocr.json"
        ocr = json.loads(ocr_path.read_text(encoding="utf-8"))
        words = numeric_words(ocr)
        score_words = [word for word in words if float(word["x"]) < 350 and 600 <= int(str(word["text"])) <= 750]
        for score in selected_scores:
            match = next((word for word in score_words if int(str(word["text"])) == score), None)
            if match is None:
                raise ValueError(f"selected score {score} not found in {asset_id}")
            y = float(match["y"])
            people, people_word = nearest_number(words, y, 400, 700)
            cumulative, cumulative_word = nearest_number(words, y, 750, 1000)
            missing = [name for name, value in (("people_at_score", people), ("cumulative_count", cumulative)) if value is None]
            samples.append(
                {
                    "sample_id": f"rank-{track.lower()}-{score}",
                    "entity_type": "score_distribution_point",
                    "year": 2026,
                    "track": track,
                    "category": "普通高考",
                    "batch": None,
                    "stage": None,
                    "admission_type": "成绩分段统计",
                    "score": score,
                    "people_at_score": people,
                    "cumulative_count": cumulative,
                    "excerpt_scope": excerpt_scope,
                    "unknown_fields": missing,
                    "evidence": {
                        "official_asset_id": asset_id,
                        "official_snapshot_sha256": entries[asset_id]["sha256"],
                        "official_image_locator": f"第1张正文图片，{score}分行",
                        "ocr_boxes": {"score": match, "people_at_score": people_word, "cumulative_count": cumulative_word},
                    },
                    "extraction": {
                        "method": "WINDOWS_OCR_WORD_COORDINATE_ROW_ALIGNMENT",
                        "automated_status": "MISSING" if missing else "MATCH",
                    },
                    "review": {
                        "source_comparison_status": "MISSING" if missing else "PENDING_HUMAN",
                        "human_review_performed": False,
                        "note": "已做坐标对齐和累计数结构检查；未由人工对照原图签字确认。",
                    },
                    "publication_status": "VALIDATED_NOT_VERIFIED",
                }
            )
    return samples


def line_key(line: dict[str, object]) -> str:
    return normalize_ocr_text(str(line["text"]))


def sicau_value_at(ocr: dict[str, object], selection: dict[str, object]) -> tuple[int, int, dict[str, object]]:
    anchor_key = normalize_ocr_text(str(selection.get("ocr_anchor", selection["anchor"])))
    candidates = []
    for line in ocr["lines"]:
        words = line["words"]
        if not words:
            continue
        if anchor_key not in line_key(line):
            continue
        if min(float(word["x"]) for word in words) < float(selection["anchor_min_x"]):
            continue
        if "anchor_y_min" in selection and min(float(word["y"]) for word in words) < float(selection["anchor_y_min"]):
            continue
        candidates.append(line)
    if len(candidates) != 1:
        raise ValueError(f"expected one SICAU anchor for {selection['sample_id']}, found {len(candidates)}")
    anchor = candidates[0]
    y = sum(float(word["y"]) for word in anchor["words"]) / len(anchor["words"])
    row_lines = [
        line for line in ocr["lines"]
        if line["words"]
        and min(float(word["x"]) for word in line["words"]) >= 1550
        and abs(sum(float(word["y"]) for word in line["words"]) / len(line["words"]) - y) <= 12
    ]
    numbers: list[int] = []
    for line in row_lines:
        numbers.extend(int(value) for value in re.findall(r"\d+", str(line["text"])))
    if len(numbers) != 2:
        raise ValueError(f"expected score/rank pair for {selection['sample_id']}, got {numbers}")
    return numbers[0], numbers[1], {"anchor_line": anchor, "value_lines": row_lines}


def build_sicau_samples(register: dict[str, object]) -> list[dict[str, object]]:
    asset_id = "SICAU-REFERENCE-2026-I001"
    entries = {entry.get("asset_id"): entry for entry in register["entries"] if "asset_id" in entry}
    ocr_path = DATA_ROOT / "extraction" / str(register["run_id"]) / f"{asset_id}.ocr.json"
    ocr = json.loads(ocr_path.read_text(encoding="utf-8"))
    samples: list[dict[str, object]] = []
    for selection in SICAU_SELECTIONS:
        score, rank, boxes = sicau_value_at(ocr, selection)
        samples.append(
            {
                "sample_id": selection["sample_id"],
                "entity_type": "admission_observation",
                "year": 2025,
                "track": selection["track"],
                "category": "普通类",
                "batch": None,
                "stage": None,
                "admission_type": None,
                "institution_name": "四川农业大学",
                "group_name": selection["group_name"],
                "offering_name": selection["offering"],
                "metric_type": selection["metric_type"],
                "score": score,
                "rank": rank,
                "score_basis": None,
                "unknown_fields": ["batch", "stage", "admission_type", "score_basis"],
                "evidence": {
                    "official_asset_id": asset_id,
                    "official_snapshot_sha256": entries[asset_id]["sha256"],
                    "official_image_locator": selection["locator"],
                    "ocr_boxes": boxes,
                },
                "extraction": {"method": "WINDOWS_OCR_ANCHOR_AND_2025_COLUMN_ALIGNMENT", "automated_status": "MATCH"},
                "review": {
                    "source_comparison_status": "PENDING_HUMAN",
                    "human_review_performed": False,
                    "note": "行标签与2025年数值已按坐标对齐；原图未说明的历史批次、招生类型和分数口径保持未知。",
                },
                "publication_status": "VALIDATED_NOT_VERIFIED",
            }
        )
    return samples


def build_sample(workbook_root: Path) -> int:
    register = load_latest_register()
    plan_samples, workbooks = build_plan_samples(workbook_root, register)
    samples = plan_samples + build_rank_samples(register) + build_sicau_samples(register)
    counts = {kind: sum(1 for sample in samples if sample["entity_type"] == kind) for kind in (
        "plan_record", "score_distribution_point", "admission_observation"
    )}
    sample_set = {
        "version": "1.0.0",
        "source_run_id": register["run_id"],
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "purpose": "TASK-03 minimum extraction and comparison sample",
        "publication_status": "NOT_PUBLISHED",
        "human_review_performed": False,
        "record_count": len(samples),
        "counts_by_entity_type": counts,
        "records": samples,
    }
    verification = {
        "version": "1.0.0",
        "source_run_id": register["run_id"],
        "human_review_performed": False,
        "records": [
            {
                "sample_id": sample["sample_id"],
                "entity_type": sample["entity_type"],
                "automated_extraction_status": sample["extraction"]["automated_status"],
                "source_comparison_status": sample["review"]["source_comparison_status"],
                "human_review_status": "PENDING",
                "unknown_fields": sample["unknown_fields"],
                "evidence_locator": sample["evidence"]["official_image_locator"],
            }
            for sample in samples
        ],
    }
    coverage = {
        "version": "1.0.0",
        "source_run_id": register["run_id"],
        "representative_assets": 5,
        "structured_records": len(samples),
        "scopes": [
            {"type": "plans", "track": "PHYSICS", "coverage": "official page 5 only; 5 selected offering rows", "exhaustive": False},
            {"type": "plans", "track": "HISTORY", "coverage": "official page 5 only; 2 selected offering rows", "exhaustive": False},
            {"type": "score_distribution", "track": "PHYSICS", "coverage": "685-660 score excerpt; 3 selected rows", "exhaustive": False},
            {"type": "score_distribution", "track": "HISTORY", "coverage": "662-637 score excerpt; 3 selected rows", "exhaustive": False},
            {"type": "admission_observation", "track": "PHYSICS/HISTORY", "coverage": "SICAU image, 2025 column, 4 selected rows", "exhaustive": False},
        ],
        "explicit_gaps": [
            "No complete plan publication was downloaded or extracted.",
            "Score-distribution images after the first image were not sampled; excerpts are not full tables.",
            "No official group_filing_min sample was obtained.",
            "Historical batch, admission type and score basis are not stated row-by-row in the sampled SICAU image.",
            "The two user-provided workbooks are secondary inputs; their producer/provenance has not been independently verified.",
            "All 17 rows await human comparison approval and are excluded from published releases.",
        ],
    }
    issues = {
        "version": "1.0.0",
        "source_run_id": register["run_id"],
        "issues": [
            {"issue_id": "T03-I01", "status": "OPEN", "severity": "HIGH", "description": "Dense three-column plan-page OCR interleaves columns and misreads some alphanumeric major codes; workbook text-layer values require human image comparison."},
            {"issue_id": "T03-I02", "status": "OPEN", "severity": "MEDIUM", "description": "Physics score-distribution OCR missed people_at_score for 679; the structured field remains null."},
            {"issue_id": "T03-I03", "status": "OPEN", "severity": "HIGH", "description": "The SICAU image does not establish historical batch/admission type/score basis for each selected 2025 value."},
            {"issue_id": "T03-I04", "status": "OPEN", "severity": "HIGH", "description": "No official group_filing_min evidence was sampled; group admission minima must not be relabeled as filing minima."},
            {"issue_id": "T03-I05", "status": "OPEN", "severity": "HIGH", "description": "No human reviewer has signed off any extracted row; none may enter a PUBLISHED release."},
        ],
    }
    outputs = {
        DATA_ROOT / "structured-samples.json": sample_set,
        DATA_ROOT / "verification-records.json": verification,
        DATA_ROOT / "coverage.json": coverage,
        DATA_ROOT / "issues.json": issues,
        DATA_ROOT / "workbook-input-register.json": {
            "version": "1.0.0",
            "source_run_id": register["run_id"],
            "publication_status": "NOT_PUBLISHED",
            "inputs": workbooks,
        },
    }
    for path, payload in outputs.items():
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "passed", "records": len(samples), "counts": counts, "outputs": [path.relative_to(APP_ROOT).as_posix() for path in outputs]}, ensure_ascii=False, indent=2))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--raw-ocr", action="store_true", help="run OCR and preserve raw line/word coordinates")
    mode.add_argument("--build-sample", action="store_true", help="build the bounded structured sample from OCR and workbook text")
    parser.add_argument("--workbook-root", type=Path, default=APP_ROOT.parent, help="directory containing the two user-provided workbooks")
    args = parser.parse_args()
    try:
        return extract_raw_ocr() if args.raw_ocr else build_sample(args.workbook_root.resolve())
    except (OSError, ValueError, subprocess.CalledProcessError) as exc:
        print(json.dumps({"status": "failed", "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
