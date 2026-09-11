# Part 02 (source lines 191-380)

- [L191] exec: `Get-Content nanhang-app/docs/verification/npm-validate-task05-2026-09-10.txt -Tail 20; py -3.12 tools/sync_project_docs.py --check; Get-Content -Raw nanhang-handoff/evidence/source-register.json`
- [L193] exec result: validation log shows 73 tests passed (4 files), sync check `{"status": "passed", "frozen_copies_equal": 11, "baseline_files": 24, "errors": []}`, source-register.json lists SC-POLICY-2026 (四川省教育考试院) etc. with status `SOURCE_INSPECTED_NOT_PUBLISHED`

## [L199] ASSISTANT (final)
**下一步做 TASK-03：官方招生数据小样本提取与核实。** 可以继续交给上一阶段的 **Sol，High 推理强度**。

我已核对更新后的文件：TASK-05 已记录完成，验证日志为 **73 项测试通过**，文档与源码包一致性检查通过。但目前仍只有合成测试数据，真实工作簿也尚未验证。

接下来的顺序是：

1. **TASK-03 数据样本**：验证官方资料能否准确提取，并建立来源、证据和覆盖记录。
2. **TASK-06 探索内容**：完成问题库、专业卡、可修改画像和行动模板。
3. **TASK-07 学生页面**：贯通无 AI 的完整流程，达到 GATE-LOCAL。

当前先把 TASK-03 做成一个小闭环。真实工作簿属于 TASK-05 后续实数据验证，可以单独补，不应替代官方招生数据样本工作。

把下面这段提示词交给它：

```text
继续南航项目，本轮完成 TASK-03 的最小官方来源样本与提取验证。直接执行并交付文件，不要只写方案。

工作目录：
C:\Users\yusheng\Desktop\南航Agent交接包

先读取：
- nanhang-app/docs/PROJECT_STATUS.md
- nanhang-app/docs/VALIDATION_RESULT.md
- nanhang-handoff/DATA_AND_MATCHING_SPEC.md
- nanhang-handoff/DELIVERY_AND_ACCEPTANCE.md
- nanhang-handoff/EVIDENCE_AND_REUSE.md
- nanhang-handoff/evidence/source-register.json
- 现有合同、数据验证和匹配接口

当前状态：
TASK-01、02、04、05 已完成；现有验证为73项测试通过。
TASK-05完成范围是固定源码字段映射与合成测试，真实工作簿尚未验证。
真实招生发布记录为0，四个阶段门禁均未通过。

本轮目标：
用少量官方资料验证“取得原文 → 提取字段 → 对照核实 → 结构化样本 → 覆盖与问题记录”的完整过程。

具体要求：
1. 从已有来源登记出发，重新访问官方来源并保存实际取得的快照，记录URL、获取时间和SHA-256。旧登记不等于本次取得成功。
2. 建议选取3—5个代表页面或图片，覆盖招生计划、分段表及可取得的历史录取资料。优先包含专业组继承、脚注或跨行等不同结构；来源不足时缩小范围并记录缺口。
3. 根据实际文件选择文字层提取或OCR，保留原始图片/文档、页码或图片序号、字段定位及提取结果。
4. 建立少量结构化样本，建议10—20条，不追求数量。严格区分年度、类别、批次、招生类型，以及组投档最低、组录取最低和专业录取最低。
5. 对照原文核对关键字段，逐条记录一致、冲突、缺失和待确认状态。需要人工确认的项目列为待人工核实，不把模型自检写成人工验收完成。
6. 分段表节选明确标记覆盖范围，不冒充完整表；组线不得填作专业线，未知字段不得猜测。
7. 提供可重跑的提取/校验命令、最小回归样例、覆盖表和问题清单。复用现有合同与规则，避免为了样本放宽验证。
8. 本轮不进行全量抓取，不发布正式数据，不接生产密钥、付费模型或学生私有数据。

交付：
- 官方来源快照及哈希登记；
- 提取脚本与结构化样本；
- 字段证据定位、核对记录和覆盖缺口；
- TASK-03验证报告，说明哪些环节完成、哪些仍待人工核实；
- TASK-06和TASK-07可以使用的接口说明或明确的缺口清单。

验证与同步：
使用Node >=22运行 npm run validate，另运行本轮数据检查。
根据实际证据更新进度、实施记录和验证文档，不因脚本运行成功就把TASK-03全部标记完成。
在工作区根目录运行：
py -3.12 tools/sync_project_docs.py --package
py -3.12 tools/sync_project_docs.py  […TRUNCATED IN SOURCE READ]

- [L202] (task_complete, same message, duplicate) — skipped

## [L206] USER
我是应该给他官方数据吗，比如招生考试报的pdf


## [L209] ASSISTANT (final)
**是的，招生考试报的官方 PDF 很适合提供给它，正好用于下一步 TASK-03。** 有原始文件，就能直接验证表格提取、专业组关系和脚注，减少寻找来源的工作。

建议先提供：

- **招生计划 PDF**：注明年份、物理类或历史类、完整文件还是节选。
- **来源信息**：官方下载链接；如果是购买的电子版或纸质扫描件，如实说明即可。
- 如果已有，也可附上同年度**一分一段表**，以及高校官方发布的**历史录取资料**。不用等资料全部齐全再开始。

招生计划通常用于提取招生人数、选科要求、学费等，**不能代替历史录取分数或位次数据**，这两类资料需要分别核实。

把 PDF 放进项目根目录新建的 `incoming/` 文件夹，再把下面这段补充到上一条提示词：

```text
我已在 incoming/ 中提供招生考试报 PDF，请先盘点文件并阅读实际内容。

首先确认每份文件的年份、类别、招生范围、完整性，以及是否有可用文字层。保留原始文件，记录来源信息与 SHA-256；来源不清楚的项目列为待确认。

先选3—5个有代表性的页面进行提取试验，包括普通表格、专业组跨页或续行、脚注和特殊要求。向我展示原文位置与提取结果的对照，以及需要我核实的具体字段，再据此确定后续提取方式。

完整PDF可以作为输入，但本轮先完成小样本验证，不直接全量提取或发布。不要把模型自检记录为人工验收。
```

**你现在先准备招生计划 PDF 就可以。** 年份不同的资料分别标注，扫描版也可以，先让它检查清晰度和提取效果。

- [L215] developer message (skills_instructions boilerplate) — skipped
- [L216] user message (environment_context boilerplate) — skipped

## [L219] USER
项目目录我改名字为南航了，文件内容都没有变动。我把招生信息换成了excel表格不再是pdf，所以后续针对数据的处理方式你需要统一调整一下。刚才的任务已完成，接下来你直接指挥codex里的DeepSeek子代理来完成接下来的任务，你负责规划操作和完成验收，尽量节省自己的token


## [L222] ASSISTANT (commentary)
我会先核对新目录、Excel 数据和最新任务进度，统一调整数据处理要求，再把下一项实施任务交给 DeepSeek 子代理；我负责范围控制和最终验收。

- [L223] exec: `Get-ChildItem -Force`; `rg --files` for AGENTS.md/STATUS/LOG/*.xlsx/*.csv/*VALIDATION*; read `nanhang-app/docs/project-status.json`, `PROJECT_STATUS.md`, and the spreadsheets SKILL.md; also filtered the tool list for deepseek/agent tools
- [L225] exec result: workspace root now `C:\Users\yusheng\Desktop\南航` containing `物理类 四川2026年高考填报数据招生考试报+近三年22-25年历史录取数据.xlsx` and `历史类 ...xlsx`; project-status.json shows TASK-01/02/04/05 completed, TASK-03 in progress, 79 tests passed, 17 official samples, human_verified=0
- [L231] spawn_agent: started collaboration subagent `deepseek_excel_task06` (agent_type `commandcode_deepseek`, fork_turns all) — task payload encrypted
- [L234] subagent activity: `deepseek_excel_task06` started (agent path `/root/deepseek_excel_task06`, named "Tesla")
- [L237] exec: `rg --files` over pipelines/packages/docs/tools; read `TASK03_VALIDATION_REPORT.md`, `nanhang-app/package.json`, `tools/sync_project_docs.py`, list `~/.codex/agents`, tail of spreadsheets SKILL.md
- [L240] exec result: existing task03 pipeline files listed (`fetch_official_samples.py`, `extract_official_samples.py`, `validate_task03_samples.py`, `windows_ocr.ps1`), plus baseline docs and `packages/contracts/test/task03-data.test.ts`
- [L244] exec: list `~/.codex/agents`, grep commandcode/deepseek in `config.toml`, grep structure of `extract_official_samples.py`, read tsconfig files, read spreadsheets `read_only_qna.md`
- [L247] exec result: extract script already handles both PDF/OCR path and XLSX rows (APP_ROOT/data/task03, workbook_prefix 物理类/历史类, `read_selected_workbook_rows`)
- [L252] exec: read `~/.codex/agents/commandcode-deepseek.toml`, rest of extract script, `TASK03_SOURCE_MAPPING.md`, vitest/tsconfig
- [L254] exec result: agent def = "Read-only relay to the direct CommandCode CLI using DeepSeek V4.1 Flash (Max)", sandbox_mode read-only, launcher `C:\Users\yusheng\.codex\bin\commandcode-deepseek.ps1`
- [L262] exec: read `commandcode-deepseek.ps1` launcher, list `nanhang-app/data/task03`, list `*.xlsx`
- [L264] exec result: launcher runs command-code CLI with `--no-session --skip-onboarding --no-auto-update --trust --print <Prompt> --model commandcode-direct/deepseek/deepseek-v4.1-flash --effort max --permission-mode plan --max-turns 20 --output-format text`
- [L276] exec: inline Python (zipfile + ElementTree) to dump sheet names/row counts/merges/previews of both xlsx workbooks
- [L278] exec result: empty output (session id 21539, still running)
- [L286] subagent final answer: `Agent errored: You've hit your usage limit. Upgrade to Pro ... or try again at 9:45 PM.` — subagent turn failed
- [L288] (task_complete with `usage_limit_exceeded`) — skipped

## [L294] USER
继续


## [L299] ASSISTANT (commentary)
继续。上次 DeepSeek 子代理被用量限制中断，尚未交付改动。我会重试一次，同时继续核对 Excel 结构，推进可独立完成的迁移工作。

- [L300] followup_task: re-sent task to subagent `deepseek_excel_task06`
- [L306] exec: `write_stdin` to session 21539 (poll the xlsx-parsing python job)
- [L308] exec result: failed — `write_stdin failed: Unknown process id 21539`
- [L312] exec: list `*.xlsx` sizes; read `project-status.json`; tail of `tools/sync_project_docs.py`; grep for 南航Agent交接包 / PDF主工程 / OCR keywords in README.md, tools, handoff, app docs, pipelines
- [L314] exec result: 历史类 xlsx 8,000,918 bytes; 物理类 xlsx 14,350,431 bytes; status json as before (17 official samples, 0 human-verified, next_task = complete TASK-03 manual verification)
- [L319] exec: inline Python preview of xlsx headers
- [L322] exec result: exit code 1, output mojibake (GBK console encoding) — column headers unreadable
- [L329] exec: same Python xlsx header preview with `$env:PYTHONIOENCODING='utf-8'`
- [L332] exec result: headers recovered, e.g. 科类/批次/计划类别/院校代码/院校名称/所在省/城市/院校标签/公私性质/院校专业组代码/专业组代码/专业代码/专业名称/专业备注/其他备注/选科要求/专业层次/26计划人数/26学费/26学制/26组内专业/26专业组计划人数/26组内专业数/门类/专业类/新增/25专业组录取人数/25专业组最低分/…/23最高位次/城市水平标签/院校水平/更名合并转设/隶属单位

## [L336] ASSISTANT (commentary)
两份 Excel 都有招生计划和分年度历史数据列，可直接按“工作簿哈希＋工作表＋单元格”追溯，不必先做 OCR。物理表的“科类”表头为空，历史列也包含不同年份和组／专业层级；我会显式记录这些映射，避免凭文件名或列位置猜测。

- [L338] exec: `npm run validate` in nanhang-app (with runtime node on PATH) AND a Python step creating backup `archives/workspace-before-excel-task06-2026-09-10.zip` of nanhang-app/nanhang-handoff/tools + README/FILE_INDEX/MANIFEST
- [L342] exec result: validate → 5 test files, 79 tests passed, exit 0; backup → `backup created`
- [L346] edit: added `nanhang-app/pipelines/task03/extract_workbook_samples.py` (read-only XLSX intake; no OCR/network/Excel execution/publication; PLAN column mapping 院校代码/院校名称/专业组代码/专业代码/专业名称/批次/计划类别/所在省/选科要求/专业层次/26计划人数/26学费/26学制/26专业组计划人数/专业备注/其他备注; INPUTS = PHYSICS 物理类 xlsx, HISTORY 历史类 xlsx; SHA-256 helper; `--workbook-root` arg)
- [L349] edit result: `{}` (patch applied, no errors)
- [L357] exec: `py -3.12 pipelines/task03/extract_workbook_samples.py` in nanhang-app
- [L359] exec result: no output within 10s, moved to background session 97324
- [L361] send_message: message to subagent `deepseek_excel_task06`
- [L368] (see next commentary)

## [L369] ASSISTANT (commentary)
Excel 主解析脚本已落地，正在读取两份工作簿生成可追溯样本。DeepSeek 也已返回 TASK-06 代码草案；其中一项测试预期和证据校验有问题，我会修正后再验收。新数据不会自动取得“官方已核实”状态。

- [L370] exec: web search (`site.ustb.edu.cn 计算机科学与技术 专业介绍 核心课程`, `site.ustb.edu.cn 机械工程 专业介绍 核心课程`, `site.ustb.edu.cn 经济学 专业介绍 核心课程`) + `write_stdin` poll of session 97324
- [L372] web result: 北京科技大学 pages returned course/brief snippets (机械工程系专业简介、计算机科学与技术专业-人工智能学院、招生网计算机类介绍); python extraction job still produced no output
- [L377] exec: web open of 北科大专业介绍页 + 机械学院页, search `site.nankai.edu.cn 经济学 本科 专业介绍 主要课程`; also `Get-ChildItem nanhang-app/data/task03/workbooks` and `Get-Process python`
- [L379] exec result: `data/task03/workbooks` empty (no output for it); three python processes still running (PIDs 5980/14224/23072) — extraction job still in progress
