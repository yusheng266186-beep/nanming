# 历史验证正文（本次同步前快照）

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-14，2026-09-14-service-switch）：服务开关网页已交付并实测通过：开启与关闭全链路各跑一遍（开→建实例→站点转 Redis→关→回单实例内存档），云端结束时保持已关闭；账户已由负责人充值，欠费解除。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：47 个测试文件、554 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：按全项目审阅修 P1 与状态生命周期；要用谈心时双击桌面「南溟服务开关」点开启（约 ¥0.9/天，用完关掉）；TASK-13/14 身份与运维收尾不变。完整进度及操作见[项目进度](../PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

本文保留同步前的历史文字，所有“当前”“未完成”和数字都只代表当时记录，不能作为当前状态。最新结论见 [当前验证结果](../VALIDATION_RESULT.md)。原有过时结论保留供追溯。

# 本地验证结果

本次复核日期：2026-09-12（工程卫生轮）。验证对象为当前本地工程；上一轮（2026-09-11）的
增强模式验证记录仍然有效——本轮未触碰业务规则、匹配逻辑与数据内容，仅重构页面组织、加固
选科回填与隐私存放，并在改动前后各跑一次全量测试。

## 本轮（2026-09-12）实际结果

| 检查 | 环境/命令 | 结果 |
|---|---|---|
| 全量测试（改动前基线） | Node 26.7.0；npx vitest run | 通过：19 个文件、255 项、0 失败 |
| 全量测试（改动后） | Node 26.7.0；npx vitest run | 通过：20 个文件、272 项、0 失败（净增选科组合解析 3 项） |
| 类型检查 | npm run typecheck（tsc -b + 三个 workspace --noEmit） | 通过，0 错误 |
| 工作区一致性 | py -3.12 tools/sync_project_docs.py --check | 通过：11 份冻结构造副本一致，源码包与工程一致 |
| 盐路径迁移 | py -3.12 -m py_compile pipelines/quality-huixi/build_quality_db.py | 语法通过；默认盐路径指向 private/keystore/，未重跑建库（数据与盐内容均未变） |


本次复核日期：2026-09-11。验证对象为当前本地工程与交接合同；当前状态以 [PROJECT_STATUS.md](../PROJECT_STATUS.md) 为准。
本次新增荣县一中增强模式（质量慧析接入）的结果，见下表末尾三项与 [质量慧析管线](../QUALITY_HUIXI_PIPELINE.md)。

## 本次实际结果

| 检查 | 环境/命令 | 结果 |
|---|---|---|
| 工程合同生成、类型检查和测试 | Node 24.19.0 / npm 11.19.0；npm run validate | 通过：18 个文件、241 项测试、0 失败 |
| TASK-08 AI网关纯核 | packages/ai-gateway/test/gateway.test.ts | 28 项通过：幂等、额度、并发、超时重试、故障保守记账、凭证撤销与过期、SSE帧序与心跳、载荷哈希 |
| TASK-08 A40—A48契约 | packages/ai-gateway/test/acceptance-cases.test.ts | 11 项通过：按 fixtures 案例输入断言，含流式阶段拦截与降级文本复查 |
| TASK-08 HTTP适配层 | apps/api/test/api.test.ts | 16 项通过：健康与就绪、访问码、鉴权、SSE、幂等与409、413、A44降级、A46/A48降级、A47隔离、会话撤销、CORS来源限制 |
| TASK-08 网页AI客户端 | apps/web/test/ai-client.test.ts | 11 项通过：A47运行戳校验、事件采纳、缺少凭证不发请求、线格式字段名 |
| TASK-08 AI面板 | apps/web/test/ai-panel.test.ts | 13 项通过：默认关闭不发请求、启用语义、降级展示、过期回复忽略、回复随修订可见失效 |
| TASK-07学生流程 | apps/web/test/flow.test.ts | 7项通过：缺成绩、失效、方向修订、Excel隔离、合同语义、撤回/空结果、WebMCP起点工具合同 |
| Web生产构建 | npm run web:build | 通过：主脚本193.05KB/gzip 64.29KB（含AI面板），仍低于300KB级预算 |
| 浏览器流程 | Edge无头浏览器，本机5173 | 选科—回答—确认—匹配—航线图—失效—Excel核对—清除通过；390px无横向溢出；打印保留航线图 |
| TASK-08 AI端到端 | 本机回环HTTP + 本地假上游，7类场景 | 通过：正常/超时/文本后失败/脚本/概率/链接/空输出；无脚本、链接或概率外泄；降级时公共数据继续可用 |
| TASK-08 AI浏览器路径 | Edge无头浏览器，CDP驱动 | 通过：AI默认关闭、启用不发请求、兑换访问码、SSE回复、修改输入后旧回复可见失效、控制台异常0 |
| TASK-09 页面视觉与交互 | Edge无头，1440/390/320 三档视口 | 通过：横向溢出0、文字裁切0、对比度未达标0、未标注控件0、无作用域表头0；修正6项，保留3类经复核的非缺陷 |
| TASK-09 表现不变量 | apps/web/test/presentation.test.ts | 8 项通过：对比度下限、强调色变量、点击高度、表单标签、表头作用域、打印规则 |
| 荣县一中数据产物 | apps/web/test/quality-huixi.test.ts | 23 项通过：直接读真实发布产物，核对解析器提交、分片命名不含姓名、分片不含同学姓名、位次范围与索引人数一致、跨科类考试按该场科类取线、线差为减法、缺失状态不带值、知识点得分率可复算、索引无姓名与明文验证码、位次口径差异逐条保留、非法码不发请求、不存在码报「查无此人」 |
| 荣县一中表现约定 | apps/web/test/quality-presentation.test.ts | 10 项通过：入口不再禁用、验证码边界说明、不出现录取结论用语、表头作用域与可访问名称、缺失显示为「—」、跨科类说明、宽表横向滚动、开发中间件路径越界复检、验证码不入地址栏与本地存储、分片只用摘要名 |
| 荣县一中建库自检 | pipelines/quality-huixi/build_quality_db.py | 通过：880 人、7,954 条成绩、926 题、15,878 条小题；行数与身份一致性校验通过，逐人知识点得分率与解析器全年级汇总 689 组全等 |
| 荣县一中发布产物核验 | pipelines/quality-huixi/verify_release.py | 通过：880 分片中抽检 40 份；manifest 哈希一致、索引零姓名、位次在范围内、线差为减法、知识点得分率可复算；0 问题 |
| 荣县一中页面实测（独立浏览器） | Chromium + Playwright，本机 5173 | 通过：入口→验证码→成绩页渲染；控制台异常 0；页面无录取概率类表述；页面数字与 SQLite 逐项一致；截图在 private/verification/ |
| 学生姓名泄漏扫描 | private/verification/scan_name_leaks.py | 通过：870 个姓名 × 除发布产物与 private/ 外全部工程文件，0 处命中；源码包 740 项不含 private/、dataset.json、任何 .sqlite |
| 合同测试 | packages/contracts/test/contracts.test.ts | 10 项通过 |
| 规则断言 | packages/domain/test/acceptance.test.ts | 37 项通过 |
| MatchResult 组合测试 | packages/domain/test/matching.test.ts | 9 项通过 |
| 学校摘要适配 | packages/school-adapter/test/school-adapter.test.ts | 17 项通过；其中固定源真实字段结构回归 10 项 |
| Excel主管线样本 | packages/contracts/test/workbook-data.test.ts | 4项通过：源定位、口径隔离、未核实状态和表头差异 |
| TASK-06探索内容 | packages/exploration/test/exploration.test.ts | 9项通过：否认/重答、证据边界、约束矛盾、行动和专业源快照 |
| Python Excel解析 | unittest test_workbook_intake.py | 5项通过 |
| Excel原单元格独立校验 | validate_workbook_samples.py | 2份原文件SHA一致，36条样本964个原单元格证据一致 |
| TASK-03历史数据回归 | packages/contracts/test/task03-data.test.ts | 6 项通过；覆盖快照/OCR哈希、组继承、分段缺失、录取口径隔离和人工状态 |
| TASK-03 官方快照复核（2026-09-10历史结果） | `fetch_official_samples.py --verify-local` | 通过：10 个快照文件 SHA-256 一致 |
| TASK-03 独立数据检查（2026-09-10历史结果） | `validate_task03_samples.py` | 通过：11 组语义检查、5 个 OCR 输出、17 条结构样本；人工核实 0、发布 0 |
| 固定源取证（此前固定提交核对） | Git 固定 SHA 与 `git rev-parse FETCH_HEAD:<path>` | 提交 SHA 及 types/parser/score-validation 等 6 个文件 blob 与登记一致 |
| 交接结构检查 | Python 3.12.4 / jsonschema 4.26.0；validate_contracts.py | 4 份 Schema、3 组正反例、6 项额外结构断言通过；52 个案例登记、53 个历史源码引用、7 个来源条目和 1 次实际取得登记一致 |
| 冻结文件一致性 | 交接 contracts/fixtures 对比工程副本 | 11/11 一致 |

A01—A52 全部 52 个案例 ID 均有局部可执行断言；TASK-08 补齐了 A40—A48。测试数量与案例 ID 数量不是一一对应关系，也不等于完整端到端验收；生产级安全终审仍需在实现接入真实依赖后进行。

当前整合日志见 [Excel与TASK-06验证日志](../verification/npm-validate-excel-task06-2026-09-10.txt)，Python与原单元格核验见 [Excel验证日志](../verification/excel-intake-validation-2026-09-10.txt)。TASK-05 原始日志和此前 63/73 项基线继续保留。TASK-03 的历史工程输出见 [npm 验证日志](../verification/npm-validate-task03-2026-09-10.txt)，快照与数据检查见 [TASK-03 数据验证日志](../verification/task03-data-validation-2026-09-10.txt)，TASK-03阶段交接合同输出见 [交接检查日志](../verification/handoff-contracts-task03-2026-09-10.txt)。快照登记、带坐标 OCR、结构样本、核对记录、覆盖表和问题清单位于 `data/task03/`，详见 [TASK-03 验证报告](../TASK03_VALIDATION_REPORT.md)。工程类型检查采用 tsc -b，会执行 TypeScript 项目构建；不代表网页构建完成。

## 已验证的实现范围

- JSON Schema 结构与业务语义分别校验，导入 JSON 不可自行提升身份。
- 同分位次闭区间、零人数、表外分数、顶部合并段和尾部省略按冻结规则处理。
- 校考/模考不转换省位次；重建总分和口径冲突被拦截。
- MatchResult 将目标情景、发布覆盖、证据粒度、资格、历史关系、偏好和排序组合为冻结合同输出。
- 候选、分段表和历史输入限定为当前锁定发布的 PUBLISHED 记录；撤回发布返回空结果与 DATASET_WITHDRAWN。
- 组参考和专业参考分别校验，缺历史不回填；未知学费保留 UNKNOWN，硬条件排空后不自动放宽；输入乱序输出稳定。
- 固定 accuracy-v1.2 单人入口映射真实 StudentScore/ScoreConflict 字段；保留 0 分与缺考差异，缺源总分不重建，城市/学校名次不伪装省位次。
- 完全重复只在源解析指纹一致时折叠并保留源行；冲突记录拒绝输出；同名跨班分别生成本地摘要，不按姓名覆盖或跨考合并。
- 日期、逐科满分、赋分口径和稳定 ID 无来源时保持未知/本地；伪造认证声明被忽略，来源质量置信度不作为录取概率。每个成功输出同时通过冻结 Schema 和独立语义校验。
- 2026 计划样本已按年度、科类、批次、阶段、招生类型和专业组分开；组字段仅在同范围继承，节选数不当全组覆盖。
- 分段表仅标记高分段节选；679 分 OCR 缺失保留 `null`，未算术回填。
- 川农 `group_admission_min` 与 `major_admission_min` 已分开，没有伪造 `group_filing_min`；原图未说明的历史批次、招生类型和分数口径保持 `null`。

## 未验证范围和历史区分

已只读扫描两份招生Excel共52,878条专业行并生成36条非发布样本；全量来源准确性仍未验收。TASK-05 的固定源单人适配已有真实字段映射，本次荣县一中管线使用的是同一 accuracy-v1.2 提交的真实学校工作簿（13 次考试、880 名学生），但**未做真实学生试用**：学生是否能理解「校内位次 ≠ 录取可能」没有观察证据。6 位验证码可被离线穷举，增强模式当前仅限本机/校内演示，正式上线必须改为服务端校验与限流。纸感版（`apps/web-paper`）尚未接入。TASK-07本地页面和390px浏览器检查已通过；TASK-08的AI路径已在本机假上游下完成端到端验收，但仍是开发档：状态存储在内存、上游为假实现、无Redis、无真实模型、无生产密钥、未部署。成绩类接口没有任何可发放凭证，因此保持403。GATE-LOCAL已通过，其余三个门禁未通过。

2026-09-10首批实现曾记录3个测试文件54项通过，随后为63、73、79和92项；这些数字作为历史保留。TASK-07整合后为8文件99项，TASK-08完成后为13文件178项，TASK-09完成后为14文件186项，正式前端接入后为16文件210项，荣县一中增强模式接入后当前结果为19文件255项通过。

原根目录源码包已迁入历史归档；当前源码包位于工作区 releases，包含Excel主管线、TASK-06及当前同步文档。源码包逐文件比对、参考副本与哈希检查由工作区 tools/sync_project_docs.py --check 执行。它不重新联网核查官方来源或旧仓库。

最终复验日期：2026-09-11；本工作包日志文件名中的2026-09-10保留为工作包标识。TASK-08 的验收日志见 [AI网关验收日志](../verification/task08-ai-gateway-2026-09-11.txt)，TASK-09 见 [页面视觉记录](../TASK09_VISUAL_CHECK.md) 与 [截图](../verification/task09-screenshots/)，TASK-10 见 [阶段验收记录](../TASK10_STAGE_ACCEPTANCE.md)。

本地阶段验收结论：9 类关键错误均为 0，7 项未闭环问题中 4 项阻塞 GATE-PILOT（工作簿权威性、人工核实、真实成绩工作簿、真实模型费用）。真实招生发布、生产模型、部署与真实学生试用仍未发生。
