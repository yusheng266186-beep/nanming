# 当前源码分发

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-14，2026-09-14-service-switch）：服务开关网页已交付并实测通过：开启与关闭全链路各跑一遍（开→建实例→站点转 Redis→关→回单实例内存档），云端结束时保持已关闭；账户已由负责人充值，欠费解除。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：47 个测试文件、554 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：按全项目审阅修 P1 与状态生命周期；要用谈心时双击桌面「南溟服务开关」点开启（约 ¥0.9/天，用完关掉）；TASK-13/14 身份与运维收尾不变。完整进度及操作见[项目进度](../nanhang-app/docs/PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

当前源码包：[nanhang-app-source-2026-09-10.zip](nanhang-app-source-2026-09-10.zip)。哈希见[同名 SHA-256 文件](nanhang-app-source-2026-09-10.zip.sha256)。包内包含 `nanhang-app/` 工程、锁文件、当前进度、验证记录和完整交接参考副本；不包含 `node_modules`、`dist`、构建缓存、Python 环境或历史归档。

解压后安装 Node >=22，在 `nanhang-app/` 运行 `npm ci`、`npm run validate`。学生页面用 `npm run web:dev`（默认 http://localhost:5173 ），本机 AI 中转用 `npm run api:start`（默认 http://127.0.0.1:8790 ，默认关闭、仅本地假上游）；`npm run dev` 仅监视 TypeScript 编译，不启动网页服务。

本包由根目录 `tools/sync_project_docs.py --package` 生成，`--check` 会逐文件比较压缩内容与当前工程，并检查哈希。工程变化后需重新同步打包；根目录 `MANIFEST.sha256` 另覆盖完整受管工作区。

源码包文件名中的 2026-09-10 是历史固定标识，不代表内容日期；当前内容按工程进度 revision、包哈希与 --check 判断。每次修改和提交前必须重打包，见 [同步规范](../nanhang-app/docs/DOCUMENTATION_POLICY.md)。
