# 南溟实施状态交接

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-14，2026-09-14-service-switch）：服务开关网页已交付并实测通过：开启与关闭全链路各跑一遍（开→建实例→站点转 Redis→关→回单实例内存档），云端结束时保持已关闭；账户已由负责人充值，欠费解除。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：47 个测试文件、554 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：按全项目审阅修 P1 与状态生命周期；要用谈心时双击桌面「南溟服务开关」点开启（约 ¥0.9/天，用完关掉）；TASK-13/14 身份与运维收尾不变。完整进度及操作见[项目进度](../nanhang-app/docs/PROJECT_STATUS.md)。历史验证记录不代表当前状态。
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
