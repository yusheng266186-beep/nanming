"""Synchronize progress notices, reference copies, file index and delivery hashes.

Run from the workspace root with Python 3.12+: python tools/sync_project_docs.py
Verify without writing: python tools/sync_project_docs.py --check
Rebuild the source ZIP: python tools/sync_project_docs.py --package
Historical archives are immutable and excluded from progress synchronization.
"""
from pathlib import Path
import argparse
import hashlib
import json
import os
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "nanhang-app"
HANDOFF = ROOT / "nanhang-handoff"
BASELINE = APP / "docs/baseline"
EXCLUDED = {"node_modules", "dist", ".git", "__pycache__", ".venv-contracts", "coverage", "dist-scf", ".zcode"}
# Regenerable build outputs that are too large for the index, manifest and release ZIP.
GENERATED_SUFFIXES = (".tsbuildinfo", ".sqlite", ".sqlite-journal", ".sqlite-wal")
# Paths the owner asked to leave alone: not synced, not indexed, not hashed. They stay on disk
# exactly as they are; the consistency check skips them rather than reporting them as drift.
# 南溟.html is the owner's own frontend artifact and is still being iterated on.
#
# data/quality-huixi/ holds real 荣县一中 student scores, names and code hashes. It must never be
# indexed, hashed into a manifest or packed into a distributable ZIP: the source pack is shared,
# and a student's record is not part of the deliverable. The generated file is reproducible from
# the pipeline plus the private salt, so excluding it loses nothing.
#
# private/ holds the same school's plaintext code table and the salt that derives those codes, plus
# the local browser-verification scripts and screenshots. It lives inside the workspace root, so
# without this entry the index and manifest would publish its filenames and hashes — the hash of a
# code table is one step away from the codes, and the salt decides every student's code. Excluded
# entirely: not synced, not indexed, not hashed, not packed.
UNMANAGED = ("南溟.html", "nanhang-app/data/releases/", "nanhang-app/data/quality-huixi/",
             "private/")
START = "<!-- PROJECT-STATUS:START -->"
END = "<!-- PROJECT-STATUS:END -->"
STATUS = json.loads((APP / "docs/project-status.json").read_text(encoding="utf-8"))
ERRORS = []


def files(root):
    result = []
    for base, dirs, names in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in EXCLUDED)
        for name in sorted(names):
            path = Path(base) / name
            relative = path.relative_to(ROOT).as_posix()
            if name.endswith(GENERATED_SUFFIXES) or relative.startswith(UNMANAGED):
                continue
            if any(relative == entry or relative.startswith(entry) for entry in UNMANAGED):
                continue
            result.append(path)
    return sorted(result)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def put(path, content, check):
    data = content.encode("utf-8") if isinstance(content, str) else content
    if not path.exists() or path.read_bytes() != data:
        if check:
            ERRORS.append(str(path.relative_to(ROOT)))
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)


def notice(path):
    target = APP / "docs/PROJECT_STATUS.md"
    relative = os.path.relpath(target, path.parent).replace("\\", "/")
    s = STATUS
    completed = "、".join(s["completed"]) or "无"
    in_progress = "、".join(s["in_progress"]) or "无"
    not_started = "、".join(s["not_started"]) or "无"
    gates = "四个阶段门禁均未通过" if not s["gates_passed"] else f"已通过：{'、'.join(s['gates_passed'])}"
    # A task the owner set aside must stay visible. Listing it under none of the three states
    # would read as "not started", and folding it into "completed" would claim work that never
    # happened; either way the reader could not tell a decision was made.
    skipped = s.get("skipped_by_owner") or []
    skipped_line = ""
    if skipped:
        described = "、".join(f"{item['task']}（{item.get('decided_by', '负责人')}决定）"
                              for item in skipped)
        skipped_line = f"> 已跳过：{described}；相应门禁未通过，不得按已完成或待办处理。\n"
    return (
        f"{START}\n"
        f"> 统一进度（{s['as_of']}，{s['revision']}）：{s['stage']}。\n"
        f"> 已完成：{completed}；进行中：{in_progress}；未开始：{not_started}。\n"
        f"{skipped_line}"
        f"> 本次验证：{s['tests']['files']} 个测试文件、{s['tests']['passed']} 项通过、{s['tests']['failed']} 失败；真实招生发布记录为 {s['published_admission_records']}；{gates}。\n"
        f"> 下一步：{s['next_task'].rstrip('。')}。完整进度及操作见[项目进度]({relative})。历史验证记录不代表当前状态。\n"
        f"{END}"
    )


def sync_notices(check):
    for path in files(ROOT):
        relative = path.relative_to(ROOT)
        if path.suffix != ".md" or relative.parts[0] == "archives" or BASELINE in path.parents:
            continue
        body = path.read_text(encoding="utf-8")
        block = notice(path)
        if START in body:
            body = re.sub(re.escape(START) + r".*?" + re.escape(END), lambda _: block, body, flags=re.S)
        else:
            title, sep, rest = body.partition("\n")
            body = title + "\n\n" + block + "\n" + rest
        put(path, body, check)


def manifest(root, name, check):
    lines = []
    for p in files(root):
        if p.name == name and p.parent == root:
            continue
        lines.append(f"{digest(p.read_bytes())}  {p.relative_to(root).as_posix()}")
    put(root / name, "\n".join(lines) + "\n", check)


def reference_copy(path):
    data = path.read_bytes()
    if path.suffix != ".md":
        return data
    destination = BASELINE / path.relative_to(HANDOFF)

    def link(match):
        href = match.group(2)
        if re.match(r"[a-zA-Z]+:", href) or href.startswith("#"):
            return match.group(0)
        name, sep, anchor = href.partition("#")
        target = (path.parent / name).resolve()
        if target.is_relative_to(HANDOFF):
            target = BASELINE / target.relative_to(HANDOFF)
        relative = os.path.relpath(target, destination.parent).replace("\\", "/")
        return f"[{match.group(1)}]({relative}{sep}{anchor})"

    return re.sub(r"\[([^\]]+)\]\(([^)]+)\)", link, data.decode("utf-8")).encode("utf-8")


def verify_links():
    for path in files(ROOT):
        if path.suffix != ".md" or path.relative_to(ROOT).parts[0] == "archives":
            continue
        for href in re.findall(r"\[[^\]]+\]\(([^)]+)\)", path.read_text(encoding="utf-8")):
            if re.match(r"[a-zA-Z]+:", href) or href.startswith("#"):
                continue
            target = path.parent / href.split("#", 1)[0]
            if not target.exists():
                ERRORS.append(f"失效文件链接：{path.relative_to(ROOT)} -> {href}")


def category(path):
    p = path.relative_to(ROOT).as_posix()
    if path.suffix.lower() in {".xlsx", ".xls"}: return "用户提供的只读招生主输入；核实与发布见 TASK-03 记录"
    if p.startswith("nanhang-app/pipelines/"): return "招生数据管线与历史来源工具"
    if p.startswith("nanhang-app/apps/web/"): return "TASK-07无AI学生页面与TASK-08 AI面板"
    if p.startswith("nanhang-app/apps/api/"): return "TASK-08 AI HTTP 适配与 SCF 入口（线上验收另记）"
    if p.startswith("nanhang-app/packages/ai-gateway/"): return "TASK-08 AI中转纯核（幂等/额度/SSE/安全）"
    if p.startswith("nanhang-app/data/task03/workbooks/"): return "Excel 已核实证据样本（全量发布另见 data/releases）"
    if p.startswith("nanhang-app/data/task03/source-snapshots/"): return "官方来源快照（不可变，含一分一段表全量图）"
    if "/score-distribution/ocr/" in p: return "一分一段表OCR原始输出（可重算）"
    if "/score-distribution/" in p: return "一分一段表抽取结果（官方来源，已核实）"
    if p.startswith("nanhang-app/data/admissions/"): return "本地招生数据库构建产物（可重跑，非发布）"
    if p.startswith("nanhang-app/data/task06/"): return "专业卡官方来源快照与登记"
    if p.startswith("archives/"): return "历史归档（不作为当前进度）"
    if p.startswith("releases/"): return "当前源码分发与哈希"
    if p.startswith("tools/"): return "目录与文档维护工具"
    if p.startswith("nanhang-handoff/"): return "交接规范、结构合同、案例与来源登记"
    if "/docs/baseline/" in p: return "交接包同步参考副本"
    if "/docs/verification/task09-screenshots/" in p: return "TASK-09页面视觉核对截图"
    if "/docs/verification/" in p: return "本次验证原始日志"
    if "/docs/" in p: return "实施进度与记录"
    if "/test/" in p: return "自动测试"
    if "/generated/" in p: return "Schema 生成类型"
    if "/schema/" in p or "/fixtures/" in p: return "冻结合同或合成案例"
    if "/src/" in p: return "业务源码"
    return "工程配置或总入口"


def inventory(check):
    target = ROOT / "FILE_INDEX.md"
    paths = set(files(ROOT)) | {target, ROOT / "MANIFEST.sha256"}
    rows = ["# 文件总索引", "", notice(target), "",
            "本表逐项覆盖项目受管文件；node_modules、dist、dist-scf、.zcode、coverage、*.tsbuildinfo、Python 缓存与 .venv-contracts 是可再生成的依赖/构建目录，按类别保留，不列第三方文件。历史压缩包保持原样，内部旧文档仅用于追溯。", "",
            "| 文件 | 用途 |", "|---|---|"]
    for p in sorted(paths):
        name = p.relative_to(ROOT).as_posix()
        rows.append(f"| [{name}]({name}) | {category(p)} |")
    put(target, "\n".join(rows) + "\n", check)


def verify_contracts():
    count = 0
    for source, dest in [(HANDOFF / "contracts", APP / "packages/contracts/schema"),
                         (HANDOFF / "fixtures", APP / "fixtures")]:
        assert {p.name for p in source.iterdir()} == {p.name for p in dest.iterdir()}
        for p in files(source):
            assert p.read_bytes() == (dest / p.name).read_bytes(), p
            count += 1
    return count


def source_zip(check, package):
    path = ROOT / "releases/nanhang-app-source-2026-09-10.zip"
    expected = {p.relative_to(ROOT).as_posix(): p.read_bytes() for p in files(APP)}
    if package:
        path.parent.mkdir(exist_ok=True)
        with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
            for name, data in expected.items():
                info = zipfile.ZipInfo(name, (2026, 9, 10, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                z.writestr(info, data)
    if not path.exists():
        ERRORS.append("缺少当前源码包；请运行 --package")
        return
    with zipfile.ZipFile(path) as z:
        if set(z.namelist()) != set(expected) or any(z.read(n) != data for n, data in expected.items()):
            ERRORS.append("当前源码包与工程不一致；请运行 --package")
    put(path.with_suffix(".zip.sha256"), f"{digest(path.read_bytes())}  {path.name}\n", check)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--package", action="store_true")
    args = parser.parse_args()
    if args.check and args.package:
        parser.error("--check and --package cannot be combined")
    version = json.loads((APP / "VERSION.json").read_text())
    sources = json.loads((HANDOFF / "evidence/source-register.json").read_text(encoding="utf-8"))
    # The handoff package is the frozen design baseline and keeps the historical fact that no
    # admissions records had been published when it was written, so it is not compared against
    # the live status. What must hold instead: the live version file and the status agree, and a
    # release that claims published records must actually exist and pass its own check.
    assert version['data_release'] == STATUS.get('published_release', {}).get('release_id') \
        or version['data_release'] is None, \
        "VERSION.json 的 data_release 必须与项目状态中的发布版本一致"
    published = STATUS['published_admission_records']
    if published:
        release = STATUS.get('published_release') or {}
        release_dir = APP / 'data/releases' / str(release.get('release_id', ''))
        assert release.get('status') == 'PUBLISHED', "有发布记录时，发布状态必须为 PUBLISHED"
        assert release_dir.is_dir(), f"发布目录不存在：{release_dir}"
        release_manifest = json.loads((release_dir / 'manifest.json').read_text(encoding='utf-8'))
        assert release_manifest['status'] == 'PUBLISHED' \
            and release_manifest['synthetic'] is False, \
            "发布清单必须标记为已发布且非合成"
        assert release_manifest['release_id'] == release['release_id'], \
            "发布清单版本号与状态不一致"
    else:
        assert sources['published_admission_records'] == 0, \
            "无发布记录时，来源登记也必须是 0"
    sync_notices(args.check)
    manifest(HANDOFF, "MANIFEST.sha256", args.check)
    expected = {p.relative_to(HANDOFF) for p in files(HANDOFF)}
    for p in files(BASELINE):
        if p.relative_to(BASELINE) not in expected:
            ERRORS.append(f"参考副本多余文件：{p.relative_to(ROOT)}")
    for p in files(HANDOFF):
        if p.name == "MANIFEST.sha256" and p.parent == HANDOFF:
            continue
        # Only relative Markdown links change; rules, fixtures and evidence remain intact.
        put(BASELINE / p.relative_to(HANDOFF), reference_copy(p), args.check)
    manifest(BASELINE, "MANIFEST.sha256", args.check)
    source_zip(args.check, args.package)
    inventory(args.check)
    manifest(ROOT, "MANIFEST.sha256", args.check)
    count = verify_contracts()
    verify_links()
    print(json.dumps({"status": "failed" if ERRORS else "passed", "frozen_copies_equal": count,
                      "baseline_files": len(expected), "errors": ERRORS}, ensure_ascii=False, indent=2))
    return 1 if ERRORS else 0


if __name__ == "__main__":
    raise SystemExit(main())
