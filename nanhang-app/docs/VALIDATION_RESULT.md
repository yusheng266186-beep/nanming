# 当前验证结果

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-14，2026-09-14-cloud-switch）：服务开关升级为「任意设备可用」：COS 上的网页 + 云端中转函数，密钥只在中转函数环境变量里；开/关全链路实测通过（含充值后的新建实例、外网地址、回填变量、store=redis），云端结束时保持已关闭。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：47 个测试文件、554 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：要用谈心时打开网页开关点开启（首次可能等几分钟到十几分钟开通外网地址）；按全项目审阅修 P1 与状态生命周期；TASK-13/14 身份与运维收尾不变。完整进度及操作见[项目进度](PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

## 2026-09-14 / 云端开关：任意设备网页 + 中转，开/关实测通过

本轮把开关升级为「任意设备可用」：网页（COS 静态 HTML）→ 云端中转函数 `nanming-control`（SCF，Python 3.10，成都）→ 腾讯云 API。没有改业务代码，因此没有跑类型检查、构建或单元测试；47 文件 554 项仍是历史结果。

本次实测：

- 网页公网可达：`GET https://…/switch/b76b5b97.html` → 200、`text/html`、14,046 字节；页面内只有中转地址与控制口令，没有 `AKID` 样式密钥。
- 浏览器侧（真实浏览器，在 `github.io` 源上 `fetch`）：读 COS 发布指针 → 200；调中转 `/api/status` → 401「口令不对」；说明跨域头与口令鉴权在浏览器里都生效，且错误口令被拒。
- 中转接口：`/api/status` 正常返回实例/函数/探针/账单；`/api/action` 的 `off` 12 秒内 `done=true`；重复点同一动作 2 秒返回「已经是开启状态，无需改动」。
- 完整 `on`：新建实例 → 等运行中 → 开通外网地址 → `AUTH OK · PING PONG` → 回填三项环境变量并把 `NANHANG_AI_ALLOW_MEMORY_STORE` 置 0 → `/healthz` 200 且 `store=redis`；随后 `off` 销毁实例、移除变量，回到 `store=memory`、学校查询 401。
- 欠费路径（本轮早前实测）：创建被腾讯云以 `ERR_INSUFFICIENT_BALANCE` 拒绝，不产生费用；页面与 CLI 都给出「先充值」的提示。
- 助手核心 `selftest` 7/7（含「云函数环境写入回路」原样写回比对）。

未做：网页的视觉与交互最终验收（按项目规则由负责人执行）；未跑本地测试套件（本轮未改业务代码）。已知脾气：首次开启时腾讯云「开通外网地址」可能排队几分钟到十几分钟（实测 20 秒～13 分钟），页面会持续显示进度；关闭是秒级。收尾时云端保持关闭状态。

## 2026-09-14 / 服务开关：助手自检、网页连通，开→关全链路实测通过

本轮只新增一个本机工具（在工作区之外：`C:\Users\yusheng\Desktop\南溟服务开关\`），没有改业务代码，因此没有跑类型检查、构建或单元测试；47 文件 554 项仍是历史结果。

本次实测（命令与输出都在助手窗口与 `操作记录.log` 里）：

- `py -3.12 nanming_switch.py selftest`：7/7 通过——凭据读取（本机私有交接文档）、Redis 实例查询、云函数环境读取、「云函数环境写入回路」（把现有 10 个变量原样写回并逐项比对一致，只验证写入路径、不改内容）、账单与余额、`/healthz`、学校查询 401。
- `py -3.12 nanming_switch.py status`：`state=off`、`consistent=true`；账单本月 ¥7.01（缓存 6.28 / CLS 0.52 / 计费精度差异 0.12 / COS 0.09），与上一轮独立审计逐项一致。
- `py -3.12 nanming_switch.py off`：幂等通过（无运行实例 → 跳过销毁；环境变量已是内存档 → 原样写回并复核；站点确认回到 `store=memory`）。
- 本地网页服务：`GET /` 200（19,099 字节）、`/api/status` 返回当前状态；伪造来源 `Origin: https://evil.example` 的 `POST /api/action` 得到 403；`Origin: null`（双击 HTML 打开的场景）可正常走到参数校验；页面脚本经 `node --check` 通过。
- `启动开关.cmd` 双击路径：起服务、自动开浏览器、页面 200、状态正确；重复双击时第二个实例明确报「端口 8770 已经被占用」并以退出码 1 结束（不再出现两个助手同时监听）。
- 欠费时的 `on`：参数经 `DescribeProductInfo` 核实（`ZoneId=160001`＝ap-chengdu-1、TypeId 17、256MB、1 副本、按量可售）后提交，被腾讯云拒绝：`ERR_INSUFFICIENT_BALANCE ... balance -13 is less than the frozen amount 4`。**欠费账户不能创建按量资源**；该请求未创建资源、未产生费用。
- 负责人当天充值后（余额 187）**补测开启全链路并成功**：创建 `crs-i937eo6w` → 运行中 → 自动开通外网地址 `cd-crs-i937eo6w.sql.tencentcdb.com:20449` → `AUTH OK · PING PONG` → 回填三项环境变量并把 `NANHANG_AI_ALLOW_MEMORY_STORE` 置 0 → `/healthz` 200 且 `store=redis`、`/readyz` 为 `{"public_data":true,"ai":true,"state_store":true,"upstream":"qianfan"}`；随后 `off` 回到冻结态（实例 `-3`、函数 10 个变量且无 `NANHANG_REDIS_*`、`store=memory`、学校查询 401）。测试实例存活约 3 分钟。

未做：网页的视觉与交互验收（按项目规则由负责人执行）；未跑本地测试套件。工具目录不含任何凭据，也不进入 Git 与源码包；结束时云端处于「已关闭」状态。

## 2026-09-14 / 云端计费冻结：只读盘点 + 冻结后探针

本轮只改云端配置与文档，没有改业务代码，因此没有运行类型检查、构建、单元测试或浏览器校检；47 文件 554 项等数字仍是历史结果。

本次实测分两段。盘点段全部只读：用腾讯云 SDK 读账单明细与资源清单，得到 2026-09-01 至 09-14 共 ¥7.01（缓存 ¥6.28、CLS ¥0.52、计费精度差异 ¥0.12、COS ¥0.09），账单中出现过 9 个 Redis 实例、冻结前仅 1 个在运行，五个云函数都没有定时触发器，CVM 五个地域均为 0 台。动作段销毁该按量实例并调整函数环境变量，随后探针：`GET /healthz` 返回 200 与 `{"ai":true,"store":"memory"}`，`POST /v1/school/identify` 以不存在的姓名请求返回 401 与既定提示语。未消耗负责人 TOTP 动态码，未使用真实学生姓名或成绩，未在冻结后重测真实 AI 链路。

账单按小时结算并有两小时左右延迟，最后一笔 Redis 费用需之后再回读确认；账户欠费未处理。逐项证据见[冻结记录](verification/cloud-cost-freeze-2026-09-14.json)。

## 2026-09-13 / 前端专项：仅代码审阅，无业务实测

本轮按负责人要求未执行类型检查、单元测试、构建、复现脚本、API调用、浏览器/视觉/操作校检。检查方法仅为读取当前基线 `14fad3f` 的源代码、配置、测试代码与文档；发现数与推导边界见[前端代码审阅](FRONTEND_CODE_REVIEW_2026-09-13.md)。上轮47文件554项、Python与数据校验仍是历史，未重跑。

本轮唯一执行的校验为项目要求的文档一致性 `tools/sync_project_docs.py --package` / `--check`，它不证明功能或视觉正确，结果以本轮实际工具返回为准。


## 2026-09-13 / 全项目审阅实测

基线 `14fad3f`：类型检查通过，Vitest 47 文件 554 项通过；双前端构建通过。Python task03 53 项、学校码 4 项、Pages 配置 1 项通过。独立招生库验证 19,264 项、分段表验证 19,178 项通过。5 项审阅探针复现当前问题（提取前端回调与真实 Redis 客户端合成服务），不是业务通过数，也不是浏览器验收。

官方 registry 审计返回同一 Vitest 中危公告的 2 个包条目；默认镜像 audit 不支持，未把其 404 当成无漏洞。命令与脱敏摘要见[本轮证据](verification/project-review-2026-09-13.json)，问题、范围与未执行项见[全项目审阅](PROJECT_REVIEW_2026-09-13.md)。没有生产探测/部署、视觉、学生规模或回滚验收。历史 554 项日志属于此前快照，本轮独立命令结果记录在上述 JSON。


## 2026-09-13 最新前端待发布快照

全站宋体与定位/分数轴共用区间标尺已纳入本机完整快照。`npm run typecheck` 通过；`npm test -- --maxWorkers=2` 为 45 个测试文件、549 项通过、0 失败；使用正式公开 API/COS 地址与 `/nanming/` base 构建主前端通过（JS gzip 111.12 kB）。工作区根目录 `py -3.12 tools/sync_project_docs.py --package` 与 `--check` 通过。这些是本机结果，下面的 Pages `c0b2664` 是上一轮已经上线的快照；新版本的线上结果待工作流和公网资产核验后补记。

## 2026-09-13 当前前端与 AI 收尾轮

仓库文档：根 README 和工程 README 已清理旧主入口/旧部署表述，公开页面链接与本地命令已核对；GitHub About 简介和主页字段经 `gh repo view` 回读均为新值。文件仅整理导航与说明，未移动前端源码。

并发验证注记：第一次全量 43 文件 532 项通过后，纸堆动画继续变动，之后两次全量各有 1 个前端源码字符串断言未跟上同时写入的常量/样式，故不能把初次结果当成最终源码结果；最终重新执行的命令与日志覆盖下方旧数据。失败未涉及后端收尾功能，千帆专项 35 项通过。

- 本次实测 `npm run typecheck` 通过；`npm test -- --maxWorkers=2` 为 44 文件、540 项通过、0 失败；正式公网 API/COS 地址 `npm run web:build` 通过，主 JS gzip 111.08 kB。日志：`verification/latest-frontend-typecheck-2026-09-13.txt`、`latest-frontend-tests-2026-09-13.txt`、`latest-frontend-build-2026-09-13.txt`。
- `node scripts/build_function.mjs` 通过。云端 API 版本 10 Active，环境未改，ZIP 内容比对一致，health/ready HTTP 200。合成材料经真实 TOTP 兑换和千帆收尾轮返回 HTTP 200、complete、0 选项、无追问；会话撤销。脱敏报告：`verification/final-turn-cloud-api-2026-09-13.json` 和 `final-turn-online-2026-09-13.json`。未使用真实学生资料。
- Pages 提交 `c0b2664` 的 [工作流 34706440514](https://github.com/yusheng266186-beep/nanming/actions/runs/34706440514) 构建和部署成功；公网 HTML、JS、CSS 均 200，JS/CSS 与本机正式构建逐字节一致，公开 README 是当前版本，见 `verification/latest-pages-online-2026-09-13.json`。CI 验证另有 3 项失败：两处既有数据哈希断言和缺少私有学校分片；按负责人要求不阻断半成品发布，不记为通过。浏览器视觉验收由负责人完成；学生规模、校园网与回滚限制保持。

## 2026-09-12 最新前端与后端合同对齐

- `npm run typecheck`：通过；日志见 [latest-frontend-typecheck-2026-09-12.txt](verification/latest-frontend-typecheck-2026-09-12.txt)。
- `npm test -- --maxWorkers=2`：41个测试文件、509项通过、0失败；日志见 [latest-frontend-tests-2026-09-12.txt](verification/latest-frontend-tests-2026-09-12.txt)。
- 使用正式 `VITE_NANHANG_API_BASE` 与 `VITE_NANHANG_RELEASE_BASE` 执行 `npm run web:build`：通过，主JS 329.86 kB（gzip 106.84 kB）；日志见 [latest-frontend-build-2026-09-12.txt](verification/latest-frontend-build-2026-09-12.txt)。
- 合同检查：院校分组、方向收口冻结和最新谈心交互没有新增API或数据库字段；就业方向按钮继续向 `/v1/career/turn` 发送普通学生文本，现有后端可处理。线上 `/healthz`、`/readyz` 均200，AI、Redis、千帆和公开数据就绪。
- 本轮未修改前端源码，也未作浏览器视觉验收。Pages发布结果将在工作流完成后补记。

## 2026-09-12 南溟 TOTP

- `npm run typecheck`：通过；`npm test -- --run apps/api/test/api.test.ts packages/ai-gateway/test/redis-store.test.ts apps/web/test/ai-panel.test.ts apps/web/test/backend-alignment.test.ts --maxWorkers=2`：4文件66项通过。
- `npm test -- --maxWorkers=2`：40文件，482项通过、1项失败。失败为航线图窄屏断言仍要求 `useNarrowPlate`，当前并行实现已无该符号；与认证代码无关，未宣称全量通过。`npm run web:build` 通过。
- 云端 API 版本9：动态码兑换200、同码重放401 `TOTP_REPLAYED`、旧固定码401、会话撤销200、线上ZIP内容一致、旧环境配置保留。见 [脱敏报告](verification/nanming-totp-online-2026-09-12.json)。本轮未打印或记录原始种子。
- Pages `8de1983` 经工作流 `34697202201` 构建与部署成功；公网HTML、JS均200，JS包含动态码输入及过期/重放提示。CI另有两处既有数据哈希断言与私有成绩分片缺失，共3项失败；它们未阻断本轮发布，也未记为通过。
- 未作页面视觉验收、学生规模发码或回滚演练。

## 2026-09-12 / acceptance-followup-complete

补充快照9e31d9f已完成Pages构建与部署，工作流34696117253由gh run watch --exit-status返回成功。CI仍出现两处哈希断言与私有学校测试文件缺失，按授权不阻断；不冒充全量通过。API继续版本8。本条仅归档发布结果，重新执行--package/--check后以[skip ci]文档提交推送，避免重复构建相同代码。负责人从Pages实际验收，未完成门禁保持。


## 2026-09-12 / acceptance-followup：继续发布当前前端

负责人要求继续；核对基线5124e86，上一轮线上为f18f215。本次把其后方向卡片修复、航线图样式及当前talk聊天界面、动效与聊天测试一起纳入快照，不等待在建工作收尾；不覆盖其他任务修改。API源代码未变，保留已经线上核验的版本8和881密文，不重复上传。已有39文件481项本地结果来自其他任务记录，不充当本轮新实测。根目录--package/--check同步后提交推送，等待Pages构建和部署；本轮仍允许测试失败不阻断半成品发布，具体结果以对应Actions运行记录为准。任务与门禁不变，完整视觉/功能验收仍由负责人完成。


## 2026-09-12 / acceptance-final-confirmed：最终发布结果

最终源码快照f18f215已成功发布，GitHub Actions [34694705981](https://github.com/yusheng266186-beep/nanming/actions/runs/34694705981)构建与部署成功；API为版本8。公网HTML、JS、CSS请求均200。云端测试为3文件失败、33文件通过、1文件跳过（3项失败）：两处数据哈希断言不一致及学校私有分片未进入CI；按负责人要求允许半成品发布，没有把这些测试标为通过，也没有为测试上传学生明文。本轮无后续功能修改；本条仅补充实际发布结果，文档重新--package/--check后归档提交。线上48人查询、两种speed聊天和会话撤销结果见acceptance-online记录。完整功能与视觉由负责人验收。


## 2026-09-12 当前快照线上实测（负责人验收版本）

- API版本8为Active，881密文上传及线上ZIP逐项比对成功，环境变量全部保留；[部署结果](verification/acceptance-cloud-api-2026-09-12.json)。
- 使用负责人提供的身份表逐一请求线上接口：四班48人均成功，本人分片与原数据一致，匿名考试汇总返回，Pages来源CORS一致；其余8人保留原码。本机保留规则已在前轮全量核验，本次未用缺失身份的8人做线上登录。
- 真实千帆speed档：guided完成且返回4项选择；open完成且无选择项；兑换和会话撤销成功。health/ready、Redis、Pages均通过。详见[线上结果](verification/acceptance-online-2026-09-12.json)。
- 首次网络断连后有限重试；核验脚本一度用错evidence.kind被400拒绝，改成与前端一致的student_self_report后两模式通过。此错误来自脚本测试数据，没有修改线上接口来迁就脚本。
- 首轮Pages工作流34694203265成功；本次最终提交继续纳入期间的前端在建修改，推送后由同一工作流构建发布。未再次运行本机全量测试，云端保留验证结果但依负责人要求不阻断半成品发布。历史454项结果不能冒充最终快照的新测试结果。
- 未完成：负责人视觉与完整功能验收、standard/deep本轮在线调用、真实学生规模/校园网、回滚演练；任务与门禁不虚增。文档执行根目录--package和--check后随代码同次提交。


## 最新：四班身份证后六位查询码，X转0

- 类型检查通过：[日志](verification/class4-codes-x0-typecheck-2026-09-12.txt)；全量36文件454项通过：[测试](verification/class4-codes-x0-tests-2026-09-12.txt)。Python合成测试4项通过；SCF打包通过。
- 48人真实本机HTTP查询全部成功，6人验证X→0。旧48个查询键移除，其余832键保持原样，四班未提供身份的8人保留原码。成绩SQLite哈希不变：[脱敏结果](verification/class4-codes-x0-result-2026-09-12.json)。
- 先前支持X的结果为历史，已被负责人改用0的指示替代；初始测试跨目录导入造成类型检查失败，最终已修正。当时尚未部署或线上核验新码；后续验收部署结果见本页最新补充，不作视觉验收。
- 操作与发布边界见[查询码专题](CLASS4_QUERY_CODES.md)。


## 最新：章节版后端对齐（2026-09-12）

- 类型检查通过：[最终类型检查](verification/backend-alignment-typecheck-latest-2026-09-12.txt)。全量34文件439项通过：[最终测试](verification/backend-alignment-tests-latest-2026-09-12.txt)。后端与AI客户端专项11文件168项通过：[专项](verification/backend-alignment-focused-2026-09-12.txt)。
- 双前端生产构建通过：[构建](verification/backend-alignment-build-latest-2026-09-12.txt)；SCF打包与Pages配置检查器单元测试通过。
- 本机SCF打包产物，真实学校身份只回本人+汇总、假AI HTTP与会话撤销：[脱敏结果](verification/backend-alignment-smoke-2026-09-12.json)。新增汇总密文实际回读与源exams/trend完全一致。
- 线上现有API/Redis健康、Pages CORS与招生current.json通过：[线上只读](verification/backend-alignment-online-2026-09-12.json)。该记录为部署前状态，不视为本轮联合上线验收；后续发布与实测单列。
- 先前两轮默认并发目录测试超时，后采用maxWorkers=2通过；中途因并发前端编辑出现的编译/文案断言失败已由最新工作区通过结果替代，原始日志保留。本轮不做视觉验收、全量Excel重解析或学生规模/校园网/回滚验收。
- 发布顺序与各功能映射见[后端对齐](BACKEND_FRONTEND_ALIGNMENT.md)。文档包同步结果以本轮根目录 --package/--check 实际结果为准。


## 最新验证：五步主流程（2026-09-12）

| 验证 | 实测结果 | 证据 |
|---|---|---|
| 合同生成、全工程类型检查与测试 | 26 个文件、377 项通过、0 失败 | [完整日志](verification/npm-validate-journey-2026-09-12.txt) |
| 两前端构建 | 主版与纸感版通过；主 JS gzip 63.12 KB，另有 19.54 KB Worker | [构建日志](verification/build-journey-2026-09-12.txt) |
| 主流程浏览器 | 真实招生数据；合成 AI 与学校界面响应；1440/390/320、页面异常 0、无横向溢出，完整分路/重算/双成绩路径通过 | [结果](verification/journey-browser-result.json)、[截图](verification/journey-screenshots/) |
| 学校真实本地接口 | 抽一条已发放身份，正确二元组成功、错名失败；回环 HTTP，不输出隐私 | [结果](verification/school-local-result.json) |

新增 17 项专项断言覆盖范围判断、缺考/缺线、目录 ID、实际网关、本人二元组与限流。旧章节静态测试保留作迁移回归，不单独证明新主入口。

本次未验证：真实模型在新词表上的对话质量、新五步前端与学校端点的线上运行、真实学生理解、校园网络和回滚。
（共享会话与限流的线上行为已另行验证：云函数跑 Redis 共享存储、跨实例会话可用、学校端点限流 429 跨实例生效，见 [AI 接入与部署](AI_QIANFAN_SETUP.md) 与 [质量慧析管线](QUALITY_HUIXI_PIPELINE.md)。）并发任务的既有线上 API 三轮记录保留在 AI 专题中，不能替代这里的新协议验收。

本轮根目录 `--package` 与 `--check` 均通过：11 份冻结副本一致、24 份基线文件、0 错误；交接副本、索引、哈希与源码包已同步。当前主流程和后续事项见 [项目进度](PROJECT_STATUS.md)，决策见 [ADR-003](ADR_003_STUDENT_JOURNEY.md)。

## 先前文档同步轮验证（历史，不代表最新主入口）



核对：2026-09-12；业务基线 `e2001cb5a1ff301c303a4bf4295ebf71c3ab4e1b`。当时任务见 [项目进度](PROJECT_STATUS.md)。测试通过不等于线上验收或真实学生试用。

| 验证 | 本次结果 | 证据 |
|---|---|---|
| 合同类型生成、TypeScript 检查、Vitest | 22 文件、342 项通过、0 失败 | [原始日志](verification/npm-validate-2026-09-12-doc-sync.txt) |
| 主前端与纸感前端构建 | 两者通过 | [构建日志](verification/build-all-2026-09-12-doc-sync.txt) |
| 文档摘要、交接参考副本、源码包、索引、哈希与链接 | 本轮 --package 与 --check 均通过：11 份冻结副本一致、24 份基线文件、0 错误 | 本机实际输出已核对；完整工作区可复跑 |

本机 Node 26.7.0 / npm 11.19.0。Pages 使用 Node 22，SCF 脚本指定 Nodejs20.19；本机通过不代替云运行时兼容性验证。

## 既有证据（本次未重新执行）

- 招生数据核实及不可变发布：51,878 条，见 [核实与发布](TASK03_VERIFICATION_AND_RELEASE.md)。
- 学校工作簿解析、建库、分片核验及浏览器实测，见 [学校管线](QUALITY_HUIXI_PIPELINE.md)。发布数据为 12 场考试；源表的 13 组考试列不应写成已发布 13 场。
- 真千帆探针与完整网关历史成功记录，见 [AI 接入](AI_QIANFAN_SETUP.md)。本轮测试使用自动化测试配置，不消耗真实模型额度。
- 早期多视口、打印及本地阶段验收见 TASK09/TASK10 专题；它们是对应阶段的历史结果，不能直接覆盖新增界面。

## 该轮当时的验证缺口

- 未在本次执行真实模型连续多轮/多人并发/计费验证、线上健康检查、手机与校园网络、回滚、全量 Python 管线或浏览器重验。
- 学生原话请求链路已在 e2001cb 实现并补测试；空证据仍回退到演示注册表，生产隔离待完成。
- 学生成绩鉴权与限流未实现；API 仍使用内存存储，部署脚本开启试用豁免不等于共享状态已完成。
- ADR-002 公式断言不证明模考到高考的统计预测有效性。
- TASK-11 按负责人决定跳过，GATE-PILOT 无观察证据；GATE-PUBLISH、GATE-APP 未通过。

此前各阶段详细表格保存在 [历史验证快照](verification/validation-history-before-e2001cb.md)，不得引用其中“当前”作为最新进度。后续每次修改按 [同步规范](DOCUMENTATION_POLICY.md) 维护本页。
