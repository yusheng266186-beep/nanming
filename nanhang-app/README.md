# 南溟目标探索工程

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-12，2026-09-12-refactor-and-hygiene）：TASK-03 数据核实与发布完成；荣县一中增强模式接入完成（质量慧析 accuracy-v1.2 固定版本解析学校复盘工作簿，建成本地成绩库与按人分片的发布产物）；TASK-11 小范围试用经负责人决定跳过，GATE-PILOT 未通过。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：无；未开始：TASK-12、TASK-13、TASK-14。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：20 个测试文件、272 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：TASK-11 已按负责人决定跳过。可选的后续：TASK-12 数据扩容、TASK-13 本人身份（增强模式的验证码目前只是本地演示，正式上线需要服务端校验与限流）、TASK-14 部署运维。。完整进度及操作见[项目进度](docs/PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

先读[项目当前进度与下一步操作](docs/PROJECT_STATUS.md)。当前工程完成TASK-01、TASK-02、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09，并通过TASK-10本地阶段验收，GATE-LOCAL已通过；TASK-03的36条Excel样本仍待来源和人工核实，旧链路17条样本保留作历史记录。AI中转层默认关闭、仅本机、使用本地假上游，现有无AI页面可独立运行。下一步TASK-11小范围试用阻塞于TASK-03人工核实。

## 环境与命令

- Node.js >=22；本次使用 Node 24.19.0 / npm 11.19.0。当前电脑默认 Node 20 不满足要求，切换方法见项目进度。
- `npm ci`：按锁文件安装依赖。
- `npm run validate`：生成合同类型、TypeScript 类型检查并运行自动测试。
- `npm run build`：生成合同类型并构建 TypeScript 包。
- `npm run web:dev`：启动本地学生页面，默认地址 `http://localhost:5173/`。
- `npm run web:build`：构建学生页面静态产物。
- `npm run dev`：启动 TypeScript 包编译监视。
- `npm run api:start`：启动本机AI中转服务，默认 `http://127.0.0.1:8790`；仅开发用，默认关闭AI面板前不会发起请求。
- `py -3.12 pipelines/task03/fetch_official_samples.py --verify-local`：复核官方快照哈希。
- `py -3.12 pipelines/task03/validate_task03_samples.py`：运行 TASK-03 独立数据语义检查。

荣县一中增强模式（需要先按 [质量慧析管线](docs/QUALITY_HUIXI_PIPELINE.md) 第 2 节导出数据）：

```
node --max-old-space-size=6144 --import tsx ../.nanhang-ref/zhiliang-huixi/../../nanhang-app/pipelines/quality-huixi/export_dataset.ts <workbook.xlsx> data/quality-huixi/dataset.json
py -3.12 pipelines/quality-huixi/build_quality_db.py
py -3.12 pipelines/quality-huixi/export_release.py
py -3.12 pipelines/quality-huixi/verify_release.py
```

## 目录与维护

| 目录/文件 | 职责 |
|---|---|
| packages/contracts | 冻结 Schema、生成类型、结构和语义验证 |
| packages/exploration | TASK-06问题、画像、活动、专业卡和行动模板 |
| apps/web | TASK-07无AI学生页面、合成匹配、航线图、打印与本地数据控制；TASK-08可选AI面板（默认关闭）；第三章「成绩」为荣县一中增强模式 |
| pipelines/task03 | Excel主输入解析与验证；旧OCR仅作历史回归/可选补证 |
| packages/domain | 纯 TypeScript 规则核心及确定性 MatchResult 构建器 |
| packages/school-adapter | 固定 accuracy-v1.2 单人摘要适配、冲突拒绝和合成回归；真实工作簿尚未验证 |
| packages/ai-gateway | TASK-08 AI中转纯核：幂等、额度、限长、SSE、输出安全校验与降级 |
| apps/api | TASK-08 本机HTTP适配层与本地假上游；无生产密钥、无付费模型、未部署 |
| data/task03 | workbooks下36条Excel证据样本；历史官方快照、OCR与17条非发布样本 |
| pipelines/quality-huixi | 荣县一中成绩管线：用固定 accuracy-v1.2 解析学校复盘工作簿，建本地成绩库并出按人分片的发布产物；**含真实学生数据，不进源码包**（见 docs/QUALITY_HUIXI_PIPELINE.md） |
| data/quality-huixi | 成绩库、解析输出与前端发布产物；被 .gitignore 与 tools/sync_project_docs.py 的 UNMANAGED 排除 |
| fixtures | 合成正反例和 52 项验收规格 |
| docs/PROJECT_STATUS.md / project-status.json | 当前进度主本和机器状态 |
| docs/IMPLEMENTATION_LOG.md | 实施历史，历史下一步指示不再生效 |
| docs/VALIDATION_RESULT.md / verification | 当前验证结论与原始日志；含TASK-09截图 |
| docs/TASK09_VISUAL_CHECK.md / TASK10_STAGE_ACCEPTANCE.md | 页面视觉修正记录与本地阶段验收、问题清单 |
| docs/baseline | 交接主本的自动同步参考副本；保持设计基线，进度随主本更新 |

项目版本见 VERSION.json。质量慧析复用 SHA 固定为 `6f70eab4e6e9ecadc00149b1387103b45b5d8e2b`，不修改北辰或质量慧析现有项目。

完整交接工作区的文档和压缩包由根目录 `tools/sync_project_docs.py` 维护；单独下载源码包时，进度和规范可直接在 docs 内阅读。

招生资料当前使用项目根目录两份Excel，操作见 [Excel主管线](docs/TASK03_EXCEL_INTAKE.md)；探索内容和下游接口见 [TASK-06说明](docs/TASK06_CONTENT_SPEC.md)；AI中转的边界与验收见 [AI网关验收日志](docs/verification/task08-ai-gateway-2026-09-11.txt)。
