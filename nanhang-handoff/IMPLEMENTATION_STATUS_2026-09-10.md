# 南溟实施状态交接

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-20，2026-09-20-unified-ui-polish-deployed-85）：主前端六章体验统一已合并并发布到 GitHub Pages：触屏潮汐、连续抽屉、紧凑清单与定位、北辰式设置已上线；线上 index、JS、CSS 与 Pages 产物逐字节一致；视觉验收仍由负责人执行。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：54 个测试文件、592 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：负责人直接在线验收桌面/手机画框、抽屉、清单、定位和设置，不满意处继续迭代；前端已合并部署。后续若招生库或官方学费目录继续更新，应先重建/验证南航规范化招生库，再运行 pipelines/task03/merge_admissions_databases.py 重新生成统一库，不能只替换其中一侧。118 个 institution 实体行仍没有可直接入库的官方明确 CNY/学年金额，继续保持未知；同时按全项目审阅修 P1 与状态生命周期，TASK-13/14 身份与运维收尾不变。完整进度及操作见[项目进度](../nanhang-app/docs/PROJECT_STATUS.md)。历史验证记录不代表当前状态。
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
