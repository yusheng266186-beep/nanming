# 南溟实施状态交接

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-14，2026-09-14-cloud-switch）：服务开关升级为「任意设备可用」：COS 上的网页 + 云端中转函数，密钥只在中转函数环境变量里；开/关全链路实测通过（含充值后的新建实例、外网地址、回填变量、store=redis），云端结束时保持已关闭。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：47 个测试文件、554 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：要用谈心时打开网页开关点开启（首次可能等几分钟到十几分钟开通外网地址）；按全项目审阅修 P1 与状态生命周期；TASK-13/14 身份与运维收尾不变。完整进度及操作见[项目进度](../PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

工程版本仍为0.1.0；工作区已更名为“南溟”。2026-09-11已完成TASK-07本地合成学生流程并通过GATE-LOCAL。统一进度、验证、下一步见[项目进度主本](../PROJECT_STATUS.md)。本入口不再维护第二份人工任务状态表。

当前数据路线以用户提供的招生 Excel 为主，记录工作簿哈希、工作表和字段单元格；PDF/OCR 仅保留历史证据与可选补充。原17条OCR样本和新Excel样本均不可直接当正式招生发布。

- [工程与命令](../../README.md)
- [Excel主管线](../TASK03_EXCEL_INTAKE.md)
- [TASK-06内容与接口](../TASK06_CONTENT_SPEC.md)
- [TASK-07本地流程](../TASK07_LOCAL_FLOW.md)
- [实施记录](../IMPLEMENTATION_LOG.md)
- [验证记录](../VALIDATION_RESULT.md)
- [当前源码分发](../../../releases/README.md)

本次没有生产部署、学生私有数据接入或正式招生数据发布。
