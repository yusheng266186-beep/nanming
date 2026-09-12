# 章节版前端与后端对齐（2026-09-12）

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-12，2026-09-12-acceptance-cloud-snapshot）：负责人授权当前全部半成品快照上云验收；Pages发布进行中，腾讯云API部署待恢复登录凭据。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：36 个测试文件、454 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：完成当前快照Pages/API发布并核验线上链路，供负责人实际验收；未完成门禁仍如实保留。完整进度及操作见[项目进度](PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

本轮以 `apps/web/src/main.tsx` 实际挂载的 `App.tsx` 为准；JourneyApp 为参考壳。保留其他任务正在修改的界面与规则，视觉验收由负责人完成。本轮修改未提交、未推送、未部署。

## 功能与数据路径

| 前端功能 | 实际后端或数据路径 | 本轮处理 |
|---|---|---|
| 选科、批次、专业门类与专业类目录 | COS 招生不可变发布包 → release-loader → match-input/domain | 维持现有数据规则；真实发布目录与匹配测试通过，线上 current.json 可读且允许跨域 |
| 校外录入、考试换算、分数轴与院校池 | 前端纯规则计算及后台 Worker | 不增加无意义的服务器数据库写入；不改负责人尚未裁定的考试换算口径 |
| 学校姓名＋验证码、定位与成绩趋势 | `/v1/school/identify` → 私有身份索引 → 本人密文分片及匿名考试汇总 | 修复核验成功后仍读取 Pages 不存在的静态 index.json；接口现在返回 `{ shard, index: { exams, trend } }` |
| 引航/泛舟、三档思考、原话与库内建议 | `/v1/access/exchange`、`/v1/career/turn` → Redis → 千帆 | 单条原话容量从 500 对齐到 4000 字，12 条合计上限 48000；8 条上下文总上限 32000；HTTP 体上限 512 KiB，仍严格拒绝客户端控制模型及库外建议 |
| 聊天断网、超时、会话过期 | 客户端异常收尾、401 重连、服务端异常响应 | 断网不再永久等待；401 重开访问码入口；330 秒客户端上限覆盖现有 300 秒深度档；共享存储异常返回 503 |
| 设置中的清除本次探索 | 本页状态清除＋`DELETE /v1/session` | 接通服务端撤销；失败明确提示云端尚未清理、等待到期，不能把本页清除当云端删除成功 |
| 导出图片、复制文字 | 浏览器本地导出 | 沿用当前前端实现，无后端存储依赖；本轮不作视觉验收 |
| Pages 生产构建 | GitHub 仓库变量、Vite production | 本地演示码/示例建议限 DEV；缺少 API/招生地址或使用本机地址时构建拒绝发布 |

## 学校数据发布顺序

学校汇总仍是从既有成绩数据库发布产物派生，没有重算或清洗学生分数。导出时只取 `exams`、`trend`，用现有服务端密钥加密，HMAC 输入名为 `index.json`。对象存储只有密文；API 只在姓名与验证码核验成功后返回汇总。不把整个 index.json 中的源工作簿路径、问题原值及其他班级明细回给页面。

必须按顺序发布，避免新 API 找不到汇总密文：

1. `node scripts/export_school_cloud.mjs`（本轮已执行：880 本人密文＋1 汇总密文，抽查 5 本人分片逐字节回读一致）。
2. `py -3.12 scripts/deploy_school_cloud.py`（本轮未执行，需要腾讯云部署凭据）。
3. `node scripts/build_function.mjs`、`py -3.12 scripts/deploy_function.py`（已打包，未上传）。沿用并保留现有千帆、Redis、学校密钥环境配置；不得用缺项环境覆盖线上配置。
4. 发布包含本轮前端接线的 Pages 构建；工作流先执行 `node scripts/check_pages_config.mjs`，然后构建。两项 GitHub 仓库变量已只读核对为现有公网 HTTPS 地址。
5. 发布后从 Pages 来源检查姓名＋码→成绩/趋势、引航/泛舟及档位、方向两线→分数轴→导出、清除后的会话撤销。真实学生规模、手机校园网及回滚仍待验收。

新版学校接口缺少汇总或密文认证失败时返回 503，不能只上传代码。回滚需同时选择兼容的前端/API 版本；保留新增密文对象不影响旧接口，不通过删对象回滚。

## 验证范围

- 初次和第二次全量默认并发测试均有同一个真实招生目录测试触发 5 秒限时，其余通过；改用 `npx vitest run --maxWorkers=2` 后全量通过，没有放宽断言或修改目录测试。
- 最终类型检查通过，全量34文件439项通过（期间并发前端编辑造成的临时失败保留日志）；结果见 `verification/backend-alignment-typecheck-latest-2026-09-12.txt`、`verification/backend-alignment-tests-latest-2026-09-12.txt`。
- 双前端生产构建通过，云函数打包通过；`node --test scripts/check_pages_config.test.mjs` 通过。
- 本机运行 SCF 打包产物，使用一条实际学校身份核验（不记录身份内容），检查本人分片与汇总同时返回；假 AI 的真实 HTTP 完成帧及会话撤销通过。见 `verification/backend-alignment-smoke-2026-09-12.json`。
- 线上既有 API health/ready 为 200、AI 可用、Redis 可用，Pages 来源预检 204 且 CORS 匹配；招生 current.json 为 200 且允许跨域。见 `verification/backend-alignment-online-2026-09-12.json`。这些结果不证明新代码已上线，也不代替真实模型对话质量验收；本轮未完成真模型调用。
- 不重跑全量 Excel 解析，不改冻结合同，不做浏览器视觉验收。任务与门禁状态不虚增。
