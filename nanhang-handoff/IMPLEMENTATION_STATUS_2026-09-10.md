# 南溟实施状态交接

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-14，2026-09-14-cloud-cost-freeze）：按负责人要求冻结计费云资源：按量计费 Redis 已销毁、函数改单实例内存档，站点与学校查询在线可用；账户欠费与 CLS/COS 小额日用仍在。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：47 个测试文件、554 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：回读账单确认 15:00 之后不再出现 Redis 小时费用并处理账户欠费；恢复共享会话需重建 Redis、回填 NANHANG_REDIS_* 并把 NANHANG_AI_ALLOW_MEMORY_STORE 改回 0；审阅 P1 修复与 TASK-13/14 身份运维收尾不变。完整进度及操作见[项目进度](../nanhang-app/docs/PROJECT_STATUS.md)。历史验证记录不代表当前状态。
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
