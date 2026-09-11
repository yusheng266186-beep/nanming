# 项目当前进度与下一步操作

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-11，2026-09-12-theme-and-spirit）：TASK-03 数据核实与发布完成；荣县一中增强模式接入完成（质量慧析 accuracy-v1.2 固定版本解析学校复盘工作簿，建成本地成绩库与按人分片的发布产物）；TASK-11 小范围试用经负责人决定跳过，GATE-PILOT 未通过。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：无；未开始：TASK-12、TASK-13、TASK-14。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：20 个测试文件、269 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：TASK-11 已按负责人决定跳过。可选的后续：TASK-12 数据扩容、TASK-13 本人身份（增强模式的验证码目前只是本地演示，正式上线需要服务端校验与限流）、TASK-14 部署运维。。完整进度及操作见[项目进度](PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

核对日期：2026-09-11。项目名称为南溟（2026-09-11 由原名更名而来，见实施记录）。工作目录即项目根目录，本机位于桌面下；文件夹名可一并改为南溟，本文与各脚本均不依赖绝对路径。本文与 project-status.json 是当前进度主本。历史日志保留当时的结果与命令输出；其中出现的路径文本已随本次更名统一更新，命令与结果本身未改动。

项目已完成规则核心、固定源单人适配、探索内容、无AI学生流程、可关闭的AI中转层、页面视觉检查和本地阶段验收，招生数据主管线为Excel。当前已有本地网页与本地API，但仍无生产服务、无真实招生发布、无真实模型接入、无真实学生试用。14项工作包中9项完成（TASK-10为本地范围）、1项进行中、4项未开始；不按任务数量推算产品完成百分比。

| 任务 | 状态 | 已交付或待完成范围 |
|---|---|---|
| TASK-01 工程准备 | 完成 | npm workspaces、锁文件、版本文件和构建/验证命令 |
| TASK-02 合同验证 | 完成 | 4份冻结Schema、类型生成、结构与语义验证 |
| TASK-03 招生数据 | **完成** | 只读扫描2表52,878条专业行；清洗进本地SQLite（51,878专业、2,308院校、12,275专业组、264,971条历史观察），独立校验19,230项通过。官方一分一段表2023—2026共7张抓取入库，全部算术闭合、19,178项校验通过。全部历史位次与官方分段表交叉复核237,818条、0条越界。数据提供方已确认，逐条标记VERIFIED。发布导出器建成（90分片、74覆盖声明），真实数据已接入学生页面。见 [核实与发布](TASK03_VERIFICATION_AND_RELEASE.md) |
| TASK-04 纯规则匹配 | 完成（本地测试范围） | 位次、资格、参考关系、偏好、排序和确定性MatchResult |
| TASK-05 单人摘要 | 完成（固定源与合成范围） | accuracy-v1.2真实字段映射及17项测试；真实学生成绩工作簿未验证 |
| TASK-06 探索内容 | 完成（最小本地交付） | 7条问题、3张自拟体验卡、3张有来源的专业事实卡、可修改/否认画像、约束/矛盾、行动模板和提示词；未做教师/学生试用 |
| TASK-07 学生流程 | 完成（本地合成范围） | React/Vite页面接通输入、探索、方向修订、专业卡、合成匹配、航线图、打印、JSON导出、清除和Excel开发核对视图 |
| TASK-08 AI/API | 完成（本地假上游范围） | 可关闭AI中转、幂等、额度、限长、SSE、故障降级、输出安全校验和A40—A48；未接真实模型或生产密钥，无Redis，未开放成绩接口 |
| TASK-09 页面视觉 | 完成（本地表现层范围） | 1440/390/320 三档视口检查；修正按钮与航线图节点对比度、点击区域、7 个输入框标签和 6 个表头作用域；新增 8 项不变量测试。见 [TASK-09 记录](TASK09_VISUAL_CHECK.md) |
| TASK-10 阶段验收 | 完成（本地范围） | 9 类关键错误均为 0，列出 7 项未闭环问题（4 项阻塞 GATE-PILOT）。见 [阶段验收记录](TASK10_STAGE_ACCEPTANCE.md) |
| TASK-11 小范围试用 | **按负责人决定跳过（2026-09-11）** | 数据核实与发布门禁已解除，但未接触任何真实学生；「学生能否理解系统边界」「是否出现录取预测类误解」两项无观察证据。GATE-PILOT 未通过，不得声称学生已试用 |
| TASK-12 数据扩容 | 未开始 | 全量管线、发布与更正/回滚 |
| TASK-13 本人身份 | 未开始 | 本人绑定、云端档案和访问权限 |
| TASK-14 部署运维 | 未开始 | 发布产物、校园访问和回滚验收 |

GATE-LOCAL 已通过；GATE-PILOT、GATE-PUBLISH、GATE-APP 未通过。数据发布包已建成并接入网页，但 GATE-PILOT 仍需真实学生试用、GATE-PUBLISH 仍需手机与校园网络实测。

## 当前证据与数据边界

- Node 24.19.0 / npm 11.19.0，`npm run validate`：14个测试文件、186项通过、0失败。TASK-08新增56项、TASK-09新增8项表现不变量，原有99项保留通过。
- `npm run web:build`通过，主脚本gzip 64.29KB，仍低于项目建议的300KB级预算。
- TASK-09 视觉与交互：1440/390/320 三档视口横向溢出 0、文字裁切 0、对比度未达标 0、未标注控件 0、无作用域表头 0。修正项与保留项见 [TASK-09 记录](TASK09_VISUAL_CHECK.md)。
- TASK-10 阶段验收：9 类关键错误均为 0，未闭环问题 7 项（O-01 工作簿权威性未核实、O-02 人工核实为0、O-03 真实成绩工作簿未验证、O-04 无真实模型费用核算，另有 3 项已知边界）。见 [阶段验收记录](TASK10_STAGE_ACCEPTANCE.md)。
- TASK-08端到端验收：本机回环HTTP真实调用7类上游场景（正常、超时、收到文本后失败、脚本输出、概率输出、链接输出、空输出），全部确认无脚本/链接/概率泄漏，且降级时公共浏览与匹配继续可用。详见[AI网关验收日志](verification/task08-ai-gateway-2026-09-11.txt)。
- 浏览器实际走通：AI默认关闭→启用不产生请求→兑换访问码→SSE回复显示→修改输入后旧回复可见失效→390px无横向溢出→打印仅保留航线图；页面控制台异常0。
- Excel解析Python测试5项通过；两份源工作簿SHA不变，36条样本的964个原始单元格证据经独立校验。详见 [Excel主管线](TASK03_EXCEL_INTAKE.md)。
- 本地招生数据库已建成并通过独立校验：51,878 条专业行、2,308 所院校、12,275 个院校专业组、264,971 条历史录取观察（含位次 264,959 条），2026 计划人数合计 422,017；建库可重跑，独立校验 19,230 项通过，Python 管线测试 50 项通过。详见 [本地招生数据库](TASK03_ADMISSIONS_DB.md)。
- 官方一分一段表已接入 **2023—2026 共 7 张**（物理类/历史类 2025 起，理科/文科 2024 及以前）：3,736 个公布分数行，
  全部算术闭合、19,178 项独立校验通过，核验状态 `VERIFIED`。考生给分数即可定位官方位次区间（`--score`、`--score-year`），
  官方未列出的分数不插值、超出范围不外推。详见 [一分一段表](TASK03_SCORE_DISTRIBUTION.md)。
- **数据核实**：数据提供方确认全部工作簿内容（2026-09-11，记录 `data/task03/human-verification.json`）；
  另有独立机器复核：全部历史位次对照官方分段表区间，237,818 条中 237,635 条落在区间内、**0 条越界**，
  其余 183 条高于官方公布最高分（官方合并为「某分及以上」）。详见 [核实与发布](TASK03_VERIFICATION_AND_RELEASE.md)。
- **数据发布包**：`data/releases/SC-2026-e48a598a1832/`，90 个分片、51,878 条专业、74 条覆盖声明、93 个文件、约 60 MB，
  `--check` 逐文件 SHA-256 一致。学生页面启动时读取发布包并显示数据来源与版本，真实数据已可用于匹配；
  载入失败退回合成演示并显示原因。发布包含两种科类口径标记，跨年比较不自动等同。
- 合同/fixtures与交接主本11份一致；A01—A52全部有可执行断言，测试数量与案例数量不是一一对应，也不等于完整端到端验收。
- 真实招生发布记录 51,878 条（发布包 `SC-2026-e48a598a1832`）。工作簿为用户提供的主输入，经数据提供方确认并完成机器交叉复核；这不声称官方发布了工作簿本身。
- AI相关：默认关闭且无网络请求；`apps/api`仅本机运行；状态存储为内存（生产档据此拒绝启动AI）；上游为本机假上游；无生产密钥、无付费模型、无Redis。`GET /v1/me/academic-profile` 按设计返回403，因为不存在任何可发放的成绩访问凭证。
- 应用版本0.1.0、合同1.0.0、规则nh-rules-1.0.0；核心资格/位次/身份规则未改。

## TASK-11 决定记录：按负责人决定跳过（2026-09-11）

项目负责人决定跳过 TASK-11 小范围试用。这是决定，不是完成：**至今未接触任何真实学生**。

由此产生的后果，在任何汇报与文档中都不得抹去：

- GATE-PILOT 未通过，且不再处于「待安排」状态。
- 「学生能否说出候选方向」「能否解释一个参考依据」两项观察**无证据**。
- 「是否出现『系统预测我能被录取』这类误解」**未知**；因此也不能据此调整文案或扩大范围。
- 不得声称学生已试用、不得声称文案已按真实理解验证过。

TASK-11 的材料（知情说明、学生端说明、观察记录表）未编写。

## 可选后续

TASK-12（数据扩容）、TASK-13（本人身份）、TASK-14（部署运维）保持未开始。三者的既定前置条件按原文保留：

- TASK-12 依赖「试用方向有效」；由于试用已跳过，该前提未经验证，扩容属于按需求推动而非按证据推动。
- TASK-13 依赖「自动接入需求确认」。
- TASK-14 依赖发布条件满足，并会顺带覆盖 O-03、O-04 两项未闭环问题（真实成绩工作簿、真实模型费用）。

## 命令

当前系统默认Node20不满足项目Node>=22要求。在项目根目录PowerShell中：

```powershell
$env:Path = 'C:\Users\yusheng\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
Set-Location .\nanhang-app
npm run validate
npm run web:build
npm run web:dev
npm run api:start
py -3.12 -m unittest discover -s pipelines/task03 -p test_workbook_intake.py
py -3.12 pipelines/task03/validate_workbook_samples.py
py -3.12 pipelines/task03/fetch_score_distribution.py --fetch
py -3.12 pipelines/task03/extract_score_distribution.py
py -3.12 pipelines/task03/build_admissions_db.py
py -3.12 pipelines/task03/validate_admissions_db.py
py -3.12 -m unittest discover -s pipelines/task03 -p test_admissions_db.py
py -3.12 pipelines/task03/query_admissions.py --stats
py -3.12 pipelines/task03/query_admissions.py --track 物理 --score 600 --subjects 化学,生物 --batch 本科批B段 --limit 20
py -3.12 pipelines/task03/query_admissions.py --track 物理 --subjects 化学,生物 --rank 12000 --batch 本科批B段 --limit 20
py -3.12 pipelines/task03/validate_score_distribution.py
py -3.12 pipelines/task03/crosscheck_workbook_ranks.py
py -3.12 pipelines/task03/record_verification.py
py -3.12 pipelines/task03/export_release.py
py -3.12 pipelines/task03/export_release.py --check
```

阶段验收与视觉记录：[TASK-10 阶段验收](TASK10_STAGE_ACCEPTANCE.md)、[TASK-09 页面视觉](TASK09_VISUAL_CHECK.md)。
招生数据说明：[Excel主管线](TASK03_EXCEL_INTAKE.md)、[本地招生数据库](TASK03_ADMISSIONS_DB.md)、[一分一段表](TASK03_SCORE_DISTRIBUTION.md)、[核实与发布](TASK03_VERIFICATION_AND_RELEASE.md)。

本地AI联调：先 `npm run api:start`（默认 http://127.0.0.1:8790 ），再 `npm run web:dev`（http://localhost:5173 ）。网页AI面板默认关闭；访问码默认 `local-trial-code`，可用 `NANHANG_TRIAL_ACCESS_CODE` 更改，网页端服务地址可用 `VITE_NANHANG_API_BASE` 覆盖。假上游场景用 `NANHANG_FAKE_SCENARIO=normal|timeout|fail-after-text|unsafe-output|probability-output|link-output|empty-output`。这些值仅用于本机开发，不构成生产配置。

重建Excel样本可运行 `py -3.12 pipelines/task03/extract_workbook_samples.py`，默认从工程父目录读取源文件。`npm run dev` 当前仍仅监视TypeScript编译，没有网页服务。

回到项目根目录，交接检查与交付同步命令：

```powershell
.\.venv-contracts\Scripts\python.exe nanhang-handoff/tools/validate_contracts.py
py -3.12 tools/sync_project_docs.py --package
py -3.12 tools/sync_project_docs.py --check
```
