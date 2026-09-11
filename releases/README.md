# 当前源码分发

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-11，2026-09-12-theme-and-spirit）：TASK-03 数据核实与发布完成；荣县一中增强模式接入完成（质量慧析 accuracy-v1.2 固定版本解析学校复盘工作簿，建成本地成绩库与按人分片的发布产物）；TASK-11 小范围试用经负责人决定跳过，GATE-PILOT 未通过。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：无；未开始：TASK-12、TASK-13、TASK-14。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：20 个测试文件、269 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：TASK-11 已按负责人决定跳过。可选的后续：TASK-12 数据扩容、TASK-13 本人身份（增强模式的验证码目前只是本地演示，正式上线需要服务端校验与限流）、TASK-14 部署运维。。完整进度及操作见[项目进度](../nanhang-app/docs/PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

当前源码包：[nanhang-app-source-2026-09-10.zip](nanhang-app-source-2026-09-10.zip)。哈希见[同名 SHA-256 文件](nanhang-app-source-2026-09-10.zip.sha256)。包内包含 `nanhang-app/` 工程、锁文件、当前进度、验证记录和完整交接参考副本；不包含 `node_modules`、`dist`、构建缓存、Python 环境或历史归档。

解压后安装 Node >=22，在 `nanhang-app/` 运行 `npm ci`、`npm run validate`。学生页面用 `npm run web:dev`（默认 http://localhost:5173 ），本机 AI 中转用 `npm run api:start`（默认 http://127.0.0.1:8790 ，默认关闭、仅本地假上游）；`npm run dev` 仅监视 TypeScript 编译，不启动网页服务。

本包由根目录 `tools/sync_project_docs.py --package` 生成，`--check` 会逐文件比较压缩内容与当前工程，并检查哈希。工程变化后需重新同步打包；根目录 `MANIFEST.sha256` 另覆盖完整受管工作区。
