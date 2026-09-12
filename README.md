# 南溟项目总入口

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-12，2026-09-12-acceptance-cloud-snapshot）：当前前后端验收快照已上线；API版本8、881密文、48人新查询码和两种真实AI聊天线上核验通过。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：39 个测试文件、481 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：负责人进行实际页面验收；继续TASK-13身份生命周期与TASK-14学生规模、校园网和回滚演练；未完成门禁保留。完整进度及操作见[项目进度](nanhang-app/docs/PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

当前主界面已重构为五步：**选科 → 双成绩入口/区间院校池 → 两种 AI 聊天 → 库内自主选专业 → 合并/分路结果**。主入口是 JourneyApp；旧七章组件不再挂载。姓名＋验证码的本地服务端识别已实现，正式身份仍在推进。新界面及协议本轮未部署，见 [流程决策与接手](nanhang-app/docs/ADR_003_STUDENT_JOURNEY.md)。


当前工作目录为“南溟”，原始招生Excel保留在根目录并作为只读主输入。当前路线见 [Excel主管线](nanhang-app/docs/TASK03_EXCEL_INTAKE.md)，不再要求PDF/OCR作为前置步骤。AI 已接千帆和假上游，原话请求链路已提交；Pages/COS/SCF 部署工作进行中，线上验收未在本轮确认。

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

本目录已有 Git；本次核对的业务基线为 `e2001cb5a1ff301c303a4bf4295ebf71c3ab4e1b`。本轮文档同步未推送或部署，不根据提交标题推断线上状态。

**负责人要求：后续每次修改和每次提交都必须同步文档，未完成或暂停也必须留下接手记录。** 详见 [文档同步与接手规范](nanhang-app/docs/DOCUMENTATION_POLICY.md) 与 [AGENTS.md](AGENTS.md)。先根据实际代码和验证结果更新 `nanhang-app/docs/project-status.json`、`PROJECT_STATUS.md`、`IMPLEMENTATION_LOG.md` 和 `VALIDATION_RESULT.md`，并清理正文中被新状态取代的指示；在本目录运行：

```powershell
py -3.12 tools/sync_project_docs.py --package
py -3.12 tools/sync_project_docs.py --check
```

脚本能发现摘要、参考副本、冻结合同/案例、源码包和哈希漂移；任务是否真正完成仍需核对实现和测试。历史归档不参与当前进度同步。
