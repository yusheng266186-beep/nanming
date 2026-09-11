"""Fetch the bounded TASK-03 official-source sample and register byte hashes.

This is deliberately not a crawler.  ``--fetch`` downloads the five selected
representative assets plus their entry pages into a new timestamped directory;
``--verify-local`` only re-hashes the latest registered run.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import ssl
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


APP_ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = APP_ROOT / "data" / "task03"
SNAPSHOT_ROOT = DATA_ROOT / "source-snapshots"
LATEST_REGISTER = DATA_ROOT / "source-snapshot-register.json"

USER_AGENT = "NanhangTask03EvidenceSampler/1.0 (+bounded-official-source-validation)"

ENTRY_PAGES = (
    {
        "source_id": "SC-PLAN-P-2026",
        "url": "https://plan.sceea.cn/lkjh.html",
        "filename": "sc-plan-physics-2026.html",
        "publisher": "四川省教育考试院",
        "source_type": "plans",
    },
    {
        "source_id": "SC-PLAN-H-2026",
        "url": "https://plan.sceea.cn/wkjh.html",
        "filename": "sc-plan-history-2026.html",
        "publisher": "四川省教育考试院",
        "source_type": "plans",
    },
    {
        "source_id": "SC-RANK-P-2026",
        "url": "https://www.sceea.cn/Html/202606/Newsdetail_4857.html",
        "filename": "sc-rank-physics-2026.html",
        "publisher": "四川省教育考试院",
        "source_type": "score_distribution",
    },
    {
        "source_id": "SC-RANK-H-2026",
        "url": "https://www.sceea.cn/Html/202606/Newsdetail_4858.html",
        "filename": "sc-rank-history-2026.html",
        "publisher": "四川省教育考试院",
        "source_type": "score_distribution",
    },
    {
        "source_id": "SICAU-REFERENCE-2026",
        "url": "https://zs.sicau.edu.cn/info/1062/7302.htm",
        "filename": "sicau-reference-2026.html",
        "publisher": "四川农业大学",
        "source_type": "major_history_candidate",
    },
)

REPRESENTATIVE_ASSETS = (
    {
        "asset_id": "SC-PLAN-P-2026-P005",
        "parent_source_id": "SC-PLAN-P-2026",
        "url": "https://plan.sceea.cn/img/wl/tu/wl%20(5).png",
        "filename": "sc-plan-physics-2026-p005.png",
        "locator": "物理类招生计划图片第 5 页",
        "selection_reason": "普通本科开始页，用于检查院校与专业组表头及跨行继承",
    },
    {
        "asset_id": "SC-PLAN-H-2026-P005",
        "parent_source_id": "SC-PLAN-H-2026",
        "url": "https://plan.sceea.cn/img/ls/tu/ls%20(5).png",
        "filename": "sc-plan-history-2026-p005.png",
        "locator": "历史类招生计划图片第 5 页",
        "selection_reason": "普通本科开始页，用于检查专业组继承与备注",
    },
    {
        "asset_id": "SC-RANK-P-2026-I001",
        "parent_source_id": "SC-RANK-P-2026",
        "url": "https://www.sceea.cn/Upload/image/20260625/20260625185749_8488.jpg",
        "filename": "sc-rank-physics-2026-i001.jpg",
        "locator": "物理类分段表发布页第 1 张正文图片",
        "selection_reason": "高分段节选，验证分数、本段人数和累计人数",
    },
    {
        "asset_id": "SC-RANK-H-2026-I001",
        "parent_source_id": "SC-RANK-H-2026",
        "url": "https://www.sceea.cn/Upload/image/20260625/20260625185907_7467.jpg",
        "filename": "sc-rank-history-2026-i001.jpg",
        "locator": "历史类分段表发布页第 1 张正文图片",
        "selection_reason": "高分段节选，验证分数、本段人数和累计人数",
    },
    {
        "asset_id": "SICAU-REFERENCE-2026-I001",
        "parent_source_id": "SICAU-REFERENCE-2026",
        "url": "https://zs.sicau.edu.cn/__local/5/D9/34/4B2997C0AD4DA3FE12C1E358EA3_35661899_195FF4.jpg",
        "filename": "sicau-plan-history-2026-i001.jpg",
        "locator": "文章正文唯一大图",
        "selection_reason": "同图含 2026 专业组与近三年专业录取数据，用于核对年份列和指标口径",
    },
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch(url: str) -> tuple[bytes, dict[str, str | int | None]]:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    context = ssl.create_default_context()
    with urlopen(request, timeout=45, context=context) as response:
        data = response.read()
        return data, {
            "http_status": response.status,
            "content_type": response.headers.get_content_type(),
            "etag": response.headers.get("ETag"),
            "last_modified": response.headers.get("Last-Modified"),
        }


def safe_run_id(value: str) -> str:
    return re.sub(r"[^0-9A-Za-z_-]", "", value)


def relative(path: Path) -> str:
    return path.relative_to(APP_ROOT).as_posix()


def fetch_run() -> int:
    retrieved_at = datetime.now(timezone.utc).replace(microsecond=0)
    run_id = safe_run_id(retrieved_at.strftime("%Y%m%dT%H%M%SZ"))
    run_dir = SNAPSHOT_ROOT / run_id
    if run_dir.exists():
        raise RuntimeError(f"snapshot run already exists: {run_dir}")
    run_dir.mkdir(parents=True)

    entries: list[dict[str, object]] = []
    for item in (*ENTRY_PAGES, *REPRESENTATIVE_ASSETS):
        data, response = fetch(str(item["url"]))
        path = run_dir / str(item["filename"])
        path.write_bytes(data)
        record = dict(item)
        record.update(response)
        record.update(
            {
                "retrieved_at": retrieved_at.isoformat().replace("+00:00", "Z"),
                "snapshot_path": relative(path),
                "sha256": sha256(data),
                "size_bytes": len(data),
            }
        )
        entries.append(record)

    register = {
        "version": "1.0.0",
        "run_id": run_id,
        "retrieved_at": retrieved_at.isoformat().replace("+00:00", "Z"),
        "scope": "TASK-03 bounded official-source sample; not a published data release",
        "entry_page_count": len(ENTRY_PAGES),
        "representative_asset_count": len(REPRESENTATIVE_ASSETS),
        "entries": entries,
    }
    register_path = run_dir / "snapshot-register.json"
    register_path.write_text(json.dumps(register, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    LATEST_REGISTER.parent.mkdir(parents=True, exist_ok=True)
    LATEST_REGISTER.write_text(
        json.dumps(
            {
                "version": "1.0.0",
                "latest_run_id": run_id,
                "latest_register_path": relative(register_path),
                "representative_asset_count": len(REPRESENTATIVE_ASSETS),
                "publication_status": "NOT_PUBLISHED",
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps(register, ensure_ascii=False, indent=2))
    return 0


def verify_local() -> int:
    latest = json.loads(LATEST_REGISTER.read_text(encoding="utf-8"))
    register_path = APP_ROOT / latest["latest_register_path"]
    register = json.loads(register_path.read_text(encoding="utf-8"))
    failures: list[str] = []
    for entry in register["entries"]:
        path = APP_ROOT / entry["snapshot_path"]
        if not path.is_file():
            failures.append(f"missing: {entry['snapshot_path']}")
            continue
        data = path.read_bytes()
        if sha256(data) != entry["sha256"]:
            failures.append(f"sha256 mismatch: {entry['snapshot_path']}")
        if len(data) != entry["size_bytes"]:
            failures.append(f"size mismatch: {entry['snapshot_path']}")
    print(
        json.dumps(
            {
                "status": "failed" if failures else "passed",
                "run_id": register["run_id"],
                "checked_files": len(register["entries"]),
                "failures": failures,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--fetch", action="store_true", help="create a fresh immutable retrieval run")
    mode.add_argument("--verify-local", action="store_true", help="verify the latest registered local run")
    args = parser.parse_args()
    try:
        return fetch_run() if args.fetch else verify_local()
    except (HTTPError, URLError, TimeoutError, OSError, RuntimeError, ValueError) as exc:
        print(json.dumps({"status": "failed", "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
