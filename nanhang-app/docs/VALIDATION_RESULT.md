# 当前验证结果

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-12，2026-09-12-acceptance-cloud-snapshot）：负责人授权当前全部半成品快照上云验收；Pages发布进行中，腾讯云API部署待恢复登录凭据。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：36 个测试文件、454 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：完成当前快照Pages/API发布并核验线上链路，供负责人实际验收；未完成门禁仍如实保留。完整进度及操作见[项目进度](PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

## 最新：四班身份证后六位查询码，X转0

- 类型检查通过：[日志](verification/class4-codes-x0-typecheck-2026-09-12.txt)；全量36文件454项通过：[测试](verification/class4-codes-x0-tests-2026-09-12.txt)。Python合成测试4项通过；SCF打包通过。
- 48人真实本机HTTP查询全部成功，6人验证X→0。旧48个查询键移除，其余832键保持原样，四班未提供身份的8人保留原码。成绩SQLite哈希不变：[脱敏结果](verification/class4-codes-x0-result-2026-09-12.json)。
- 先前支持X的结果为历史，已被负责人改用0的指示替代；初始测试跨目录导入造成类型检查失败，最终已修正。未部署或线上核验新码，不作视觉验收。
- 操作与发布边界见[查询码专题](CLASS4_QUERY_CODES.md)。


## 最新：章节版后端对齐（2026-09-12）

- 类型检查通过：[最终类型检查](verification/backend-alignment-typecheck-latest-2026-09-12.txt)。全量34文件439项通过：[最终测试](verification/backend-alignment-tests-latest-2026-09-12.txt)。后端与AI客户端专项11文件168项通过：[专项](verification/backend-alignment-focused-2026-09-12.txt)。
- 双前端生产构建通过：[构建](verification/backend-alignment-build-latest-2026-09-12.txt)；SCF打包与Pages配置检查器单元测试通过。
- 本机SCF打包产物，真实学校身份只回本人+汇总、假AI HTTP与会话撤销：[脱敏结果](verification/backend-alignment-smoke-2026-09-12.json)。新增汇总密文实际回读与源exams/trend完全一致。
- 线上现有API/Redis健康、Pages CORS与招生current.json通过：[线上只读](verification/backend-alignment-online-2026-09-12.json)。未部署本轮新代码、未完成本轮真模型对话，不视为联合上线验收。
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
