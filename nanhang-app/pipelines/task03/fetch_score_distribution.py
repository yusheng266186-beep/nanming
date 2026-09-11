"""Fetch Sichuan score-distribution tables (一分一段表) from the exam institute.

This is a bounded fetch of exactly the official publication pages listed in
``PUBLICATIONS`` and the table images they embed: no crawling, no third-party mirrors.
Every asset is stored in a new immutable timestamped run directory with its SHA-256, so the
extracted numbers can be re-verified against the same bytes later.

Each publication states the curriculum system its table belongs to:

* ``new_gaokao``  2025 起 物理类 / 历史类（3+1+2 首选科目）
* ``old_system``  2024 及以前 理科 / 文科（文理分科）

The two systems are different track definitions. They are fetched and stored separately and
are never compared with each other; the tag is carried through extraction and the database so
a reader can tell which system a row belongs to.

Modes:
  --fetch                    download the pages + table images for one year into a new run
  --fetch-all                download every year that has no registered run yet
  --verify-local             re-hash every registered run without touching the network
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
from urllib.parse import urljoin
from urllib.request import Request, urlopen

APP_ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = APP_ROOT / "data" / "task03"
SNAPSHOT_ROOT = DATA_ROOT / "source-snapshots"
REGISTER_PATH = DATA_ROOT / "score-distribution-register.json"

USER_AGENT = "NanhangTask03EvidenceSampler/1.0 (+bounded-official-source-validation)"

NEW_GAOKAO = "new_gaokao"
OLD_SYSTEM = "old_system"

# (year, track, curriculum_system, source_id, url, page filename, image prefix, title)
PUBLICATIONS = (
    (2026, "PHYSICS", NEW_GAOKAO, "SC-RANK-P-2026",
     "https://www.sceea.cn/Html/202606/Newsdetail_4857.html",
     "sc-rank-physics-2026-full.html", "sc-rank-physics-2026-p",
     "官方发布！四川省2026年普通高考物理类成绩分段统计表出炉"),
    (2026, "HISTORY", NEW_GAOKAO, "SC-RANK-H-2026",
     "https://www.sceea.cn/Html/202606/Newsdetail_4858.html",
     "sc-rank-history-2026-full.html", "sc-rank-history-2026-p",
     "官方发布！四川省2026年普通高考历史类成绩分段统计表出炉"),
    (2025, "PHYSICS", NEW_GAOKAO, "SC-RANK-P-2025",
     "https://www.sceea.cn/Html/202506/Newsdetail_4335.html",
     "sc-rank-physics-2025-full.html", "sc-rank-physics-2025-p",
     "官方发布！四川省2025年普通高考物理类成绩分段统计表出炉"),
    (2025, "HISTORY", NEW_GAOKAO, "SC-RANK-H-2025",
     "https://www.sceea.cn/Html/202506/Newsdetail_4334.html",
     "sc-rank-history-2025-full.html", "sc-rank-history-2025-p",
     "官方发布！四川省2025年普通高考历史类成绩分段统计表出炉"),
    (2024, "SCIENCE", OLD_SYSTEM, "SC-RANK-S-2024",
     "https://www.sceea.cn/Html/202406/Newsdetail_3742.html",
     "sc-rank-science-2024-full.html", "sc-rank-science-2024-p",
     "官方发布！四川省2024年普通高考理科成绩分段统计表出炉"),
    (2024, "ARTS", OLD_SYSTEM, "SC-RANK-A-2024",
     "https://www.sceea.cn/Html/202406/Newsdetail_3743.html",
     "sc-rank-arts-2024-full.html", "sc-rank-arts-2024-p",
     "官方发布！四川省2024年普通高考文科成绩分段统计表出炉"),
    (2023, "SCIENCE", OLD_SYSTEM, "SC-RANK-S-2023",
     "https://www.sceea.cn/Html/202306/Newsdetail_3245.html",
     "sc-rank-science-2023-full.html", "sc-rank-science-2023-p",
     "四川省2023年普通高考理科成绩分段统计表"),
)

PUBLISHER = "四川省教育考试院"
IMAGE_PATTERN = re.compile(r'<img[^>]+src=["\']([^"\']*Upload/image/[^"\']+)["\']', re.I)
YEARS = sorted({item[0] for item in PUBLICATIONS})


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch(url: str) -> tuple[bytes, dict]:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    with urlopen(request, timeout=60, context=ssl.create_default_context()) as response:
        return response.read(), {
            "http_status": response.status,
            "content_type": response.headers.get_content_type(),
            "etag": response.headers.get("ETag"),
            "last_modified": response.headers.get("Last-Modified"),
        }


def safe_run_id(value: str) -> str:
    return re.sub(r"[^0-9A-Za-z_-]", "", value)


def relative(path: Path) -> str:
    return path.relative_to(APP_ROOT).as_posix()


def table_image_urls(html: str, page_url: str) -> list[str]:
    """Absolute URLs of the table images embedded in the article body, in page order."""
    seen: list[str] = []
    for match in IMAGE_PATTERN.findall(html):
        absolute = urljoin(page_url, match)
        if absolute not in seen:
            seen.append(absolute)
    return seen


def load_register() -> dict:
    if REGISTER_PATH.exists():
        return json.loads(REGISTER_PATH.read_text(encoding="utf-8"))
    return {"version": "2.0.0", "scope": SCOPE, "source_authority": PUBLISHER, "runs": {}}


SCOPE = ("四川普通高考成绩分段统计表（一分一段表）全量图片：2025 起物理类/历史类，"
         "2024 及以前理科/文科；非发布数据包")


def save_register(register: dict) -> None:
    register["version"] = "2.0.0"
    register["scope"] = SCOPE
    register["source_authority"] = PUBLISHER
    REGISTER_PATH.write_text(
        json.dumps(register, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def runs_for_year(register: dict, year: int) -> list[dict]:
    """Registered runs for one year, oldest first. A year may hold more than one run when a
    publication page changed and was re-fetched; extraction uses the latest."""
    return [run for run in register["runs"].values() if int(run["year"]) == year]


def fetch_year(year: int, register: dict) -> dict:
    publications = [item for item in PUBLICATIONS if item[0] == year]
    if not publications:
        raise RuntimeError(f"no registered publication for year {year}")
    retrieved_at = datetime.now(timezone.utc).replace(microsecond=0)
    run_id = safe_run_id(retrieved_at.strftime("%Y%m%dT%H%M%SZ"))
    run_dir = SNAPSHOT_ROOT / run_id
    if run_dir.exists():
        raise RuntimeError(f"snapshot run already exists: {run_dir}")
    run_dir.mkdir(parents=True)

    entries: list[dict] = []
    for (year_, track, system, source_id, url, page_filename, image_prefix,
         title) in publications:
        page_bytes, response = fetch(url)
        page_path = run_dir / page_filename
        page_path.write_bytes(page_bytes)
        html = page_bytes.decode("utf-8", "replace")
        entries.append({
            "source_id": source_id, "track": track, "curriculum_system": system,
            "year": year_, "publisher": PUBLISHER, "title": title,
            "asset_kind": "publication_page", "url": url,
            **response,
            "retrieved_at": retrieved_at.isoformat().replace("+00:00", "Z"),
            "snapshot_path": relative(page_path),
            "sha256": sha256(page_bytes),
            "size_bytes": len(page_bytes),
        })
        urls = table_image_urls(html, url)
        if not urls:
            raise RuntimeError(f"no table images found on {url}")
        for index, image_url in enumerate(urls, start=1):
            data, image_response = fetch(image_url)
            filename = f"{image_prefix}{index:03d}.jpg"
            path = run_dir / filename
            path.write_bytes(data)
            entries.append({
                "source_id": source_id, "track": track, "curriculum_system": system,
                "year": year_, "publisher": PUBLISHER,
                "asset_kind": "score_distribution_image",
                "parent_source_id": source_id,
                "url": image_url,
                "filename": filename,
                "locator": f"成绩分段统计表第 {index} 张（共 {len(urls)} 张）",
                "page_number": index,
                **image_response,
                "retrieved_at": retrieved_at.isoformat().replace("+00:00", "Z"),
                "snapshot_path": relative(path),
                "sha256": sha256(data),
                "size_bytes": len(data),
            })

    run_register = {
        "version": "2.0.0",
        "run_id": run_id,
        "year": year,
        "retrieved_at": retrieved_at.isoformat().replace("+00:00", "Z"),
        "scope": f"{year} 四川普通高考成绩分段统计表全量图片；非发布数据包",
        "source_authority": PUBLISHER,
        "entry_count": len(entries),
        "entries": entries,
    }
    (run_dir / "snapshot-register.json").write_text(
        json.dumps(run_register, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tracks = {}
    for item in publications:
        tracks[item[1]] = {
            "source_id": item[3],
            "curriculum_system": item[2],
            "images": sum(1 for entry in entries
                          if entry.get("track") == item[1]
                          and entry["asset_kind"] == "score_distribution_image"),
        }
    register["runs"][run_id] = {
        "run_id": run_id,
        "year": year,
        "register_path": relative(run_dir / "snapshot-register.json"),
        "retrieved_at": run_register["retrieved_at"],
        "entry_count": len(entries),
        "tracks": tracks,
    }
    return {"run_id": run_id, "year": year, "entries": len(entries),
            "register": relative(run_dir / "snapshot-register.json"), "tracks": tracks}


def verify_local() -> int:
    register = load_register()
    failures: list[str] = []
    checked = 0
    runs = 0
    for run in register["runs"].values():
        runs += 1
        run_register = json.loads((APP_ROOT / run["register_path"]).read_text(encoding="utf-8"))
        for entry in run_register["entries"]:
            checked += 1
            path = APP_ROOT / entry["snapshot_path"]
            if not path.is_file():
                failures.append(f"missing: {entry['snapshot_path']}")
                continue
            data = path.read_bytes()
            if sha256(data) != entry["sha256"]:
                failures.append(f"sha256 mismatch: {entry['snapshot_path']}")
            if len(data) != entry["size_bytes"]:
                failures.append(f"size mismatch: {entry['snapshot_path']}")
    print(json.dumps({
        "status": "failed" if failures else "passed",
        "runs": runs,
        "years": sorted({int(run["year"]) for run in register["runs"].values()}),
        "checked_files": checked,
        "failures": failures,
    }, ensure_ascii=False, indent=2))
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--fetch", type=int, metavar="YEAR",
                      help="fetch one year into a fresh immutable run directory")
    mode.add_argument("--fetch-all", action="store_true",
                      help="fetch every configured year that has no registered run yet")
    mode.add_argument("--verify-local", action="store_true",
                      help="re-hash every registered run without touching the network")
    args = parser.parse_args()
    try:
        if args.verify_local:
            return verify_local()
        register = load_register()
        if args.fetch:
            if runs_for_year(register, args.fetch):
                print(json.dumps({"status": "skipped", "year": args.fetch,
                                  "note": "a run is already registered for this year"},
                                 ensure_ascii=False, indent=2))
                return 0
            result = fetch_year(args.fetch, register)
            save_register(register)
            print(json.dumps({"status": "passed", **result}, ensure_ascii=False, indent=2))
            return 0
        fetched = []
        for year in YEARS:
            if runs_for_year(register, year):
                continue
            fetched.append(fetch_year(year, register))
        save_register(register)
        print(json.dumps({"status": "passed", "fetched": fetched,
                          "already_registered": [year for year in YEARS
                                                 if runs_for_year(register, year)
                                                 and year not in {item["year"] for item in fetched}]},
                         ensure_ascii=False, indent=2))
        return 0
    except (HTTPError, URLError, TimeoutError, OSError, RuntimeError, ValueError) as exc:
        print(json.dumps({"status": "failed", "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
