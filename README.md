# 南溟项目总入口

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-12，2026-09-12-refactor-and-hygiene）：TASK-03 数据核实与发布完成；荣县一中增强模式接入完成（质量慧析 accuracy-v1.2 固定版本解析学校复盘工作簿，建成本地成绩库与按人分片的发布产物）；TASK-11 小范围试用经负责人决定跳过，GATE-PILOT 未通过。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：无；未开始：TASK-12、TASK-13、TASK-14。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：20 个测试文件、272 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：TASK-11 已按负责人决定跳过。可选的后续：TASK-12 数据扩容、TASK-13 本人身份（增强模式的验证码目前只是本地演示，正式上线需要服务端校验与限流）、TASK-14 部署运维。。完整进度及操作见[项目进度](nanhang-app/docs/PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

当前工作目录为“南溟”，原始招生Excel保留在根目录并作为只读主输入。当前路线见 [Excel主管线](nanhang-app/docs/TASK03_EXCEL_INTAKE.md)，不再要求PDF/OCR作为前置步骤。AI中转层仅在本机运行、默认关闭，使用本地假上游，不接触真实模型或生产密钥。

先读[项目当前进度与下一步操作](nanhang-app/docs/PROJECT_STATUS.md)，再按需查看[文件总索引](FILE_INDEX.md)。

| 位置 | 用途与维护方式 |
|---|---|
| [nanhang-app/](nanhang-app/README.md) | 当前可继续开发的工程；业务源码、测试、统一进度与实施记录 |
| [nanhang-handoff/](nanhang-handoff/README.md) | 当前交接规范主本；设计基线仍为 2026-09-09 / 1.0.0 |
| [nanhang-app/docs/baseline/](nanhang-app/docs/baseline/README.md) | 自动同步的完整交接参考副本，不在这里单独编辑 |
| [releases/](releases/README.md) | 与当前工程逐文件核对过的源码包及 SHA-256 |
| [archives/](archives/README.md) | 整理前备份与旧源码包，保留原样供追溯 |
| [tools/sync_project_docs.py](tools/sync_project_docs.py) | 同步进度摘要、参考副本、文件索引和哈希，检查源码包一致性 |
| .venv-contracts/ | 本机交接合同校验专用 Python 环境，可按 requirements 重建 |

当前本地目录没有 `.git` 元数据，不能提供南溟提交 SHA；既有记录未报告远程推送或部署。本次整理未发布站点。

后续每次工程进度变化，先根据实际代码和验证结果更新 `nanhang-app/docs/project-status.json`、`PROJECT_STATUS.md`、`IMPLEMENTATION_LOG.md` 和 `VALIDATION_RESULT.md`，并清理正文中被新状态取代的指示；在本目录运行：

```powershell
py -3.12 tools/sync_project_docs.py --package
py -3.12 tools/sync_project_docs.py --check
```

脚本能发现摘要、参考副本、冻结合同/案例、源码包和哈希漂移；任务是否真正完成仍需核对实现和测试。历史归档不参与当前进度同步。
