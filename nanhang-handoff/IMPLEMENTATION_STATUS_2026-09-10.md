# 南溟实施状态交接

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-12，2026-09-12-latest-frontend-backend-alignment）：最新前端合同已对齐，Pages发布中；API版本9继续在线。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：41 个测试文件、509 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：完成最新前端Pages发布与公网资产核验；继续TASK-13身份生命周期与TASK-14学生规模、校园网和回滚演练。完整进度及操作见[项目进度](../nanhang-app/docs/PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

工程版本仍为0.1.0；工作区已更名为“南溟”。2026-09-11已完成TASK-07本地合成学生流程并通过GATE-LOCAL。统一进度、验证、下一步见[项目进度主本](../nanhang-app/docs/PROJECT_STATUS.md)。本入口不再维护第二份人工任务状态表。

当前数据路线以用户提供的招生 Excel 为主，记录工作簿哈希、工作表和字段单元格；PDF/OCR 仅保留历史证据与可选补充。原17条OCR样本和新Excel样本均不可直接当正式招生发布。

- [工程与命令](../nanhang-app/README.md)
- [Excel主管线](../nanhang-app/docs/TASK03_EXCEL_INTAKE.md)
- [TASK-06内容与接口](../nanhang-app/docs/TASK06_CONTENT_SPEC.md)
- [TASK-07本地流程](../nanhang-app/docs/TASK07_LOCAL_FLOW.md)
- [实施记录](../nanhang-app/docs/IMPLEMENTATION_LOG.md)
- [验证记录](../nanhang-app/docs/VALIDATION_RESULT.md)
- [当前源码分发](../releases/README.md)

本次没有生产部署、学生私有数据接入或正式招生数据发布。
