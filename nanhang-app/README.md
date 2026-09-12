# 南溟目标探索工程

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-12，2026-09-12-acceptance-cloud-snapshot）：当前前后端验收快照已上线；API版本8、881密文、48人新查询码和两种真实AI聊天线上核验通过。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：39 个测试文件、481 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：负责人进行实际页面验收；继续TASK-13身份生命周期与TASK-14学生规模、校园网和回滚演练；未完成门禁保留。完整进度及操作见[项目进度](docs/PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

主入口是章节版 `apps/web/src/App.tsx`，`JourneyApp` 保留作流程参考。当前主入口通过 `POST /v1/school/identify` 核对姓名＋6 位验证码；本轮补齐响应中的匿名考试汇总，移除核验后对本机静态成绩目录的依赖。新增汇总密文必须先上传，再更新 API 与 Pages；本轮已随验收快照推送并部署至API版本8和Pages。详见 [后端对齐与发布顺序](docs/BACKEND_FRONTEND_ALIGNMENT.md)。


先读 [当前进度](docs/PROJECT_STATUS.md) 与 [文档同步与接手规范](docs/DOCUMENTATION_POLICY.md)。招生数据 51,878 条已发布并接入网页，学校成绩管线已完成；千帆、学生原话链路和部署脚本已提交。TASK-14 进行中；本地姓名＋码识别已接通；正式身份生命周期与新流程线上验收尚未完成；共享会话存储已接上（云函数跑 Redis，多实例并发不再把学生踢下线）。TASK-11 按负责人决定跳过。

每次修改、暂停和提交都必须同步实施记录、当前状态、验证范围和相关专题正文，不能只刷新顶部摘要。工程内 [AGENTS.md](AGENTS.md) 同样适用于单独源码包接手。

四班查询码已上线：48人使用身份证后六位（X改填0），其余8人保留原码；API版本8已部署。重建与上线步骤见[查询码规则](docs/CLASS4_QUERY_CODES.md)。

## 线上部署（2026-09-12）

| 位置 | 地址 / 形态 | 说明 |
|---|---|---|
| 学生页面 | https://yusheng266186-beep.github.io/nanming/ | GitHub Pages；push 到 main 自动重建 |
| AI 中转 | https://1459223409-lexj8si8uo.ap-chengdu.tencentscf.com | SCF Web 函数 `nanming-api`；控制台那行「访问路径」就是它的 http 触发器；`/healthz`、`/readyz` 自检 |
| 数据 | COS 桶 `nanming-100051087352-1459223409` | `data/releases/` 招生发布包（`current.json` 指针，前端不重建即可换版）+ `school/objects/` 学校成绩**密文** |
| 会话存储 | 腾讯云 Redis `crs-bdr4f2z6`（256MB，按量 ≈¥0.0368/小时） | 多实例共享会话；试用结束在控制台销毁，并把函数里的 `NANHANG_REDIS_*` 一并删掉 |

密钥与连接串只走环境变量，本机副本在 `private/`（不进仓库、不进源码包）。部署细节见
[AI 接入与部署](docs/AI_QIANFAN_SETUP.md)，学校成绩的密文托管见 [质量慧析管线](docs/QUALITY_HUIXI_PIPELINE.md)。

## 环境与命令

- Node.js >=22；本次使用 Node 26.7.0 / npm 11.19.0；以 node --version 实测，勿根据安装目录名判断版本。
- `npm ci`：按锁文件安装依赖。
- `npm run validate`：生成合同类型、TypeScript 类型检查并运行自动测试。
- `npm run build`：生成合同类型并构建 TypeScript 包。
- `npm run web:dev`：启动本地学生页面，默认地址 `http://localhost:5173/`。
- `npm run web:build`：构建学生页面静态产物。
- `npm run dev`：启动 TypeScript 包编译监视。
- `npm run api:start`：启动本机AI中转服务，默认 `http://127.0.0.1:8790`；上游选择与生产配置见 docs/AI_QIANFAN_SETUP.md。
- `py -3.12 pipelines/task03/fetch_official_samples.py --verify-local`：复核官方快照哈希。
- `py -3.12 pipelines/task03/validate_task03_samples.py`：运行 TASK-03 独立数据语义检查。

荣县一中增强模式（需要先按 [质量慧析管线](docs/QUALITY_HUIXI_PIPELINE.md) 第 2 节导出数据）：

```
node --max-old-space-size=6144 --import tsx pipelines/quality-huixi/export_dataset.ts <workbook.xlsx> data/quality-huixi/dataset.json
py -3.12 pipelines/quality-huixi/build_quality_db.py
py -3.12 pipelines/quality-huixi/export_release.py
py -3.12 pipelines/quality-huixi/verify_release.py
```

要让学生在校外访问（云端托管，只放密文）时，在上述产物之后再跑：

```
node scripts/export_school_cloud.mjs       # AES-256-GCM 加密 + 对象名 HMAC(密钥, 分片名)
python scripts/deploy_school_cloud.py      # 上传到 COS school/objects/
```

密钥落在 `private/school-cloud-key.txt`（不进仓库），函数侧用 `NANHANG_SCHOOL_KEY` 解密；
轮换与限流细节见 [质量慧析管线](docs/QUALITY_HUIXI_PIPELINE.md)。

## 目录与维护

| 目录/文件 | 职责 |
|---|---|
| packages/contracts | 冻结 Schema、生成类型、结构和语义验证 |
| packages/exploration | TASK-06问题、画像、活动、专业卡和行动模板 |
| apps/web | 章节版主入口、后台区间匹配、AI 谈方向、专业分路、图片/文字导出与清除；学校入口走服务端识别 |
| pipelines/task03 | Excel主输入解析与验证；旧OCR仅作历史回归/可选补证 |
| packages/domain | 纯 TypeScript 规则核心及确定性 MatchResult 构建器 |
| packages/school-adapter | 固定 accuracy-v1.2 单人摘要适配、冲突拒绝和合成回归；真实学校工作簿已由质量慧析管线接通，鉴权仍待 TASK-13 |
| packages/ai-gateway | TASK-08 AI中转纯核：幂等、额度、限长、SSE、输出安全校验与降级 |
| apps/api | 本机/SCF HTTP 入口、千帆与假上游；已部署为 SCF Web 函数（版本 7）：真模型、Redis 共享会话、学校成绩密文托管，线上验证见 docs/AI_QIANFAN_SETUP.md |
| data/task03 | workbooks下36条已核实Excel证据样本；官方快照、OCR与历史回归样本 |
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
