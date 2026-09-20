# 南溟目标探索工程

> [在线体验 Pages](https://yusheng266186-beep.github.io/nanming/) · [完整项目介绍与仓库导航](../README.md)

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-20，2026-09-20-university-detail-enrichment-82）：完成官方学费队列核查和两库合并后，已对统一库 2,308 所院校批量编排详细档案：每校平均 918 字，保留教育部名录、阳光高考章程入口、学科/学位、招生计划、费用与来源状态；统一库与详细来源表一次性写入，数据库独立验证、68 项 TASK-03 Python 测试通过；未执行线上部署，云端开关仍保持关闭。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：47 个测试文件、554 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：统一数据库已生成并作为本地查询入口；后续若招生库或官方学费目录继续更新，应先重建/验证南航规范化招生库，再运行 pipelines/task03/merge_admissions_databases.py 重新生成统一库，不能只替换其中一侧。118 个 institution 实体行仍没有可直接入库的官方明确 CNY/学年金额，继续保持未知；同时按全项目审阅修 P1 与状态生命周期，TASK-13/14 身份与运维收尾不变。完整进度及操作见[项目进度](docs/PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

## 统一招生数据库（2026-09-20）

已将本项目的规范化招生数据库与外部 `sichuan_gaokao_2026.db.gz` 招生数据库合并为新的本地数据库：`data/admissions/admissions_merged.sqlite`。新库保留南航库的官方学费、211/985/双一流标签、录取历史、位次和匹配池，也保留外部库的原始招生记录、3,207,195 个原始单元格、教育部 2026 高校名录和 2,308 条院校简介。

两边 51,878 条招生记录按“来源文件 + 工作表 + Excel 行号”一一对应，2,308 所院校简介全部对应；`merge_conflict` 为 0。统一查询视图为 `v_merged_admission` 和 `v_merged_institution`，映射与校验结果在 `merge_record_map`、`merge_institution_map`、`merge_validation` 中。原始两个输入文件保留不改，统一库生成清单见 `data/admissions/merged-manifest.json`。

重新生成统一库：

```powershell
py -3.12 pipelines/task03/merge_admissions_databases.py `
  --external-db-gz <sichuan_gaokao_2026.db.gz 的完整路径> `
  --force
```

## 院校详细档案（2026-09-20）

合并库已按“先批量整理全部院校、再一次性写入”的方式补充 `2,308` 条长简介，平均 `915.46` 字；详细来源表有 `6,918` 条记录，其中 `4,610` 条官方 URL 仅来自教育部和阳光高考。数据表为 `university_detail`、`university_detail_source`，查询视图为 `v_university_detail`，状态字段保留教育部名录匹配和阳光高考入口缺失情况，未知字段不猜测填充。

批次文件 `data/admissions/university-detail-enrichment-batch.json` 先完整生成后才写入数据库；当前统一库 SHA-256 为 `d4e8167a8109bf8ee2a34f28268c62e41ab021cf9bf15f180a20bb557e02bb17`。读取单校详细信息：

```powershell
py -3.12 pipelines/task03/query_admissions.py --institution-detail 0001 --format json
```

本轮保存的是官方来源索引、教育部名录事实与既有结构化字段的详细编排；阳光高考章程页面的批量直连存在访问保护，未绕过限制，也没有把未抓到的全文内容写成事实。后续可沿 `university_detail_source` 的官方入口继续增量补充学校官网全文。

## 最近数据更新（2026-09-17）

天津、吉林和宁夏批次继续核验 3 所院校的官方收费证据，新增 9 条原始收费档并展开为 42 条费用引用；当前官方目录覆盖 1,802/2,308 所院校、6,155 条目录记录，展开为 6,434 条数据库官方费用证据，338 条精确匹配到招生专业，506 所仍未核验到官方明确金额。数据库重建、53,313 项独立校验和 58 项 TASK-03 Python 测试均通过；本轮未部署、未推送，云端开关保持关闭。来源与边界见 [TASK03_SOURCE_MAPPING.md](docs/TASK03_SOURCE_MAPPING.md)。

## 2026-09-13 审阅状态

[全项目审阅报告](docs/PROJECT_REVIEW_2026-09-13.md)已记录认证、Redis、主入口状态与发布方面的 19 项发现。现有测试与数据检查通过，但问题尚待修复；当前主入口未接入旧版 Worker，无 AI 首次流程和开发成绩目录边界需完善。本轮只审阅与同步文档，未部署。


主入口是章节版 `apps/web/src/App.tsx`，`JourneyApp` 保留作流程参考。学生端连接公开招生发布包与当前 API 版本 10：学校入口通过 `POST /v1/school/identify` 核对姓名＋6 位查询码后取本人密文分片与匿名考试汇总；AI 入口使用 TOTP，谈心自动收尾轮复用 `/v1/career/turn`。部署先核对密文和函数环境，再发布 Pages，见 [后端对齐与发布顺序](docs/BACKEND_FRONTEND_ALIGNMENT.md)。


先读 [当前进度](docs/PROJECT_STATUS.md) 与 [文档同步与接手规范](docs/DOCUMENTATION_POLICY.md)。招生数据 51,878 条已发布并接入网页，学校成绩管线已完成；千帆、学生原话链路和部署脚本已提交。TASK-14 进行中；本地姓名＋码识别已接通；正式身份生命周期与新流程线上验收尚未完成；共享会话存储代码保留，但按负责人要求已于 2026-09-14 销毁云端 Redis 停止计费，函数暂按单实例内存档运行。TASK-11 按负责人决定跳过。

每次修改、暂停和提交都必须同步实施记录、当前状态、验证范围和相关专题正文，不能只刷新顶部摘要。工程内 [AGENTS.md](AGENTS.md) 同样适用于单独源码包接手。

四班查询码已上线：48人使用身份证后六位（X改填0），其余8人保留原码；该能力仍包含在当前 API 版本 10。重建与上线步骤见[查询码规则](docs/CLASS4_QUERY_CODES.md)。

## 线上部署（2026-09-12）

| 位置 | 地址 / 形态 | 说明 |
|---|---|---|
| 学生页面 | https://yusheng266186-beep.github.io/nanming/ | GitHub Pages；push 到 main 自动重建 |
| AI 中转 | https://1459223409-lexj8si8uo.ap-chengdu.tencentscf.com | SCF Web 函数 `nanming-api`；控制台那行「访问路径」就是它的 http 触发器；`/healthz`、`/readyz` 自检 |
| 数据 | COS 桶 `nanming-100051087352-1459223409` | `data/releases/` 招生发布包（`current.json` 指针，前端不重建即可换版）+ `school/objects/` 学校成绩**密文** |
| 会话存储 | **已冻结**：按量 Redis `crs-bdr4f2z6` 于 2026-09-14 销毁（按量 ≈¥0.0368/小时） | 共享会话代码仍在；恢复前函数按单实例内存档跑（`NANHANG_AI_ALLOW_MEMORY_STORE=1`，`NANHANG_REDIS_*` 已移除）。开/关用服务开关网页（任意设备）：COS 上的 `/switch/b76b5b97.html`，网页只带中转地址与控制口令，腾讯云密钥在云端中转函数 `nanming-control` 的环境变量里；桌面 `南溟服务开关\启动开关.cmd` 保留为本机备用。首次开启时腾讯云开通外网地址可能等几分钟到十几分钟，关闭是秒级；欠费时创建被拒。详见[冻结记录](docs/verification/cloud-cost-freeze-2026-09-14.json) |

AI 谈心入口自 API 版本 9 起改用 TOTP；当前 API 版本 10 另对齐前端自动收尾轮。TOTP 为 SHA-1、30 秒、6 位、允许前后一个时间窗口；配共享存储时同一码经原子消费后不能再次兑换（当前内存档只在单实例内消费，重启即失效）。原始 Base32 种子只保存在 `private/nanming-totp-secret.txt` 和云函数 `NANHANG_TOTP_SECRET`，不进入仓库或源码包；旧固定访问码已从云端移除。

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

招生库还维护官方院校标签：`211`、`985`、`双一流` 的名单与定义来自教育部官方页面/PDF，构建时写入 `institution_tag`，来源、交叉核验、名单哈希和当前库命中数写入 `reference_index`；详细口径见 [TASK-03 本地招生数据库](docs/TASK03_ADMISSIONS_DB.md) 的“官方院校标签”一节。

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
| apps/api | 本机/SCF HTTP 入口、千帆与假上游；当前 SCF Web 函数版本 10：真模型、TOTP、共享会话（云端 Redis 已于 2026-09-14 冻结，现为单实例内存档）、学校成绩密文托管和 AI 收尾轮；线上验证见 docs/VALIDATION_RESULT.md |
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
