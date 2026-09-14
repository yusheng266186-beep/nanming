# 南溟 · 高考目标探索

> 从自己的成绩与兴趣出发，看清可验证的方向，再把目标化为下一步行动。

南溟是面向高中生的高考目标探索网页。学生可以从选科与分数区间进入真实招生数据，也可以通过有引导或自由的 AI 谈心梳理兴趣和经历；专业建议必须落在已发布目录内，并引用学生自己的表达。最后将 AI 建议与自主选择放在一起，查看分数轴和航线图，带走可继续核对的结果。

- **在线体验：** [打开南溟 Pages](https://yusheng266186-beep.github.io/nanming/)
- **项目源码：** [GitHub · nanming](https://github.com/yusheng266186-beep/nanming)
- **当前进度：** [实施状态与待办](nanhang-app/docs/PROJECT_STATUS.md)

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-14，2026-09-14-cloud-switch）：服务开关升级为「任意设备可用」：COS 上的网页 + 云端中转函数，密钥只在中转函数环境变量里；开/关全链路实测通过（含充值后的新建实例、外网地址、回填变量、store=redis），云端结束时保持已关闭。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：47 个测试文件、554 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：要用谈心时打开网页开关点开启（首次可能等几分钟到十几分钟开通外网地址）；按全项目审阅修 P1 与状态生命周期；TASK-13/14 身份与运维收尾不变。完整进度及操作见[项目进度](nanhang-app/docs/PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

## 2026-09-13 审阅状态

[全项目审阅报告](nanhang-app/docs/PROJECT_REVIEW_2026-09-13.md)已记录认证、Redis、主入口状态与发布方面的 19 项发现。现有测试与数据检查通过，但问题尚待修复；当前主入口未接入旧版 Worker，无 AI 首次流程和开发成绩目录边界需完善。本轮只审阅与同步文档，未部署。


## 项目定位

南溟帮助学生把“我大概想做什么”拆成可以核对的三类材料：本人提供的选科和成绩、公开的历年招生记录、谈心中说出的经历与偏好。它提供探索和比较，不代替考试院、学校或本人作录取判断。分数与位次显示依据、年份和缺失原因；AI 不改写资格、位次、学校成绩或招生发布状态。

当前学生页面按章节组织：**起航、定位、谈心、方向、分数轴、航线图**。校外学生可以手动填写情景分；荣县一中增强入口在服务端核对姓名与六位查询码后，仅返回本人成绩分片和考试趋势。四班已匹配的 48 人使用身份证后六位作查询码，末位 X 用 0 代替；其余 8 人暂沿用原码。

## 能做什么

| 章节 | 学生看到的内容 | 数据或规则来源 |
|---|---|---|
| 起航与定位 | 选科、目标分区间；手动录入或学校成绩入口 | 学生输入；学校入口只查本人密文分片 |
| 分数轴 | 情景分、官方分段位次区间、参考年的院校与专业卡 | 已发布招生包与纯规则匹配 |
| 谈心 | 引航（可点具体答案）或泛舟（自由表达），可调思考档位 | TOTP 验证后的千帆 AI；会话状态存云端会话存储（当前为单实例内存档，见下） |
| 方向 | 有原话依据的专业类建议、自主选择、两条方向的关系 | 已发布专业目录；服务端和前端双重过滤 |
| 航线图 | 两条路线的院校卡、历史位置关系和可导出结果 | 招生记录、本人选择和确定性匹配 |

谈心素材充足后，页面会自动请求一次收尾整理。后端把这轮当作总结：给出有证据的方向和小行动，不再追问或提供答案按钮。学生仍可以继续对话；方向集合按前端现有规则冻结。

## 数据、AI 与隐私边界

- **公开招生数据：** 已发布 51,878 条专业记录、90 个分片、2,308 所院校。Excel 是可复核的主输入，导出为不可变发布包；页面按发布指针读取，匹配规则在共享包内统一实现。数据年份、旧高考与新高考口径见 [数据与匹配规范](nanhang-handoff/DATA_AND_MATCHING_SPEC.md)。
- **学校成绩：** 本机管线覆盖 880 人、12 场考试。真实姓名、成绩、身份映射及查询码不进入 GitHub 或 Pages。云端只存 AES-256-GCM 密文对象；接口在身份核对后返回本人资料。现阶段正式身份生命周期、审计和规模化演练仍在推进。
- **AI 对话：** 浏览器只调用南溟 API。千帆密钥、TOTP 原始种子和会话存储凭据仅在受控运行环境；动态码 30 秒更新且一次性消费。建议必须引用本轮登记的学生原话和已发布专业 ID；模型不能宣布录取概率或修改数据库。详细边界见 [AI 接入说明](nanhang-app/docs/AI_QIANFAN_SETUP.md)。
- **计费冻结（2026-09-14）：** 按负责人要求停止每天扣费，按量计费 Redis 已销毁，函数改按单实例内存档运行，学校查询与页面数据不受影响；共享会话恢复前不适合多人同时谈心。账户欠费与保留的小额日用见[冻结记录](nanhang-app/docs/verification/cloud-cost-freeze-2026-09-14.json)。
- **验收状态：** 已通过本地阶段门禁，线上 API 和合成谈心请求已核验；真实学生规模、校园网和回滚演练尚未完成。页面视觉与实际使用效果由项目负责人验收，不能从自动测试推断全部体验已通过。

## 系统怎样连接

```text
学生浏览器（GitHub Pages）
  ├─ 读取 COS 公开招生发布包 → 位次/院校池/双线匹配（浏览器规则）
  └─ 调用腾讯云 SCF API
       ├─ TOTP → 会话存储（配 Redis 时共享，2026-09-14 起为单实例内存档）→ 百度千帆 AI
       └─ 姓名＋查询码 → 私有身份索引 → COS 本人成绩密文
```

公开招生包与学校密文是不同的数据路径。前端只配置公开 API 和发布包地址；任何密钥、身份表和真实成绩都不应放进 Vite 环境变量或分发包。

## 本地运行

需要 **Node.js 22 或更新版本**、npm；数据管线和文档同步另需 Python 3.12。在仓库根目录执行：

```powershell
cd nanhang-app
npm ci
npm run web:dev
```

开发页默认在 `http://localhost:5173/`。学校增强入口和真实 AI 需要本机按 [AI 配置说明](nanhang-app/docs/AI_QIANFAN_SETUP.md) 准备后端环境；单看页面和公开招生数据不需要把云端密钥写进仓库。

常用验证：

```powershell
cd nanhang-app
npm run typecheck
npm test -- --maxWorkers=2
npm run web:build
```

生产构建由 [Pages 工作流](.github/workflows/deploy-pages.yml) 注入公开的 `VITE_NANHANG_API_BASE` 与 `VITE_NANHANG_RELEASE_BASE`。API 打包入口是 `nanhang-app/scripts/build_function.mjs`；发布步骤、密文上传顺序和回滚条件见 [后端前端对齐](nanhang-app/docs/BACKEND_FRONTEND_ALIGNMENT.md)。不要用缺少密钥的本机环境覆盖已经运行的云函数配置。

## 仓库目录

| 路径 | 内容 |
|---|---|
| [nanhang-app/apps/web/](nanhang-app/apps/web/) | 正式学生端，当前挂载 `App.tsx` 章节版 |
| [nanhang-app/apps/api/](nanhang-app/apps/api/) | HTTP API、身份核对、AI 会话入口和 SCF 打包产物源代码 |
| [nanhang-app/apps/web-paper/](nanhang-app/apps/web-paper/) | 共用数据规则的备用纸感前端；当前 Pages 不使用 |
| [nanhang-app/packages/](nanhang-app/packages/) | 冻结合同、发布包读取、匹配领域规则、学校摘要与 AI 网关 |
| [nanhang-app/pipelines/](nanhang-app/pipelines/) | 招生 Excel 与学校成绩的构建、验证和发布管线 |
| [nanhang-app/docs/](nanhang-app/docs/) | 当前进度、实施记录、验证报告及专题说明 |
| [nanhang-handoff/](nanhang-handoff/) | 设计基线与交接主本 |
| [releases/](releases/) | 与当前工程校验过的源码包及哈希；日期是历史文件名 |
| [tools/sync_project_docs.py](tools/sync_project_docs.py) | 同步摘要、交接副本、文件索引、源码包与校验信息 |

原始工作簿、学生数据、`private/`、本机 `.env` 均不进公开源码包。完整文件导航见 [文件总索引](FILE_INDEX.md)。

## 当前进度与接手

截至 2026-09-13，本机最新完整快照的类型检查、完整测试和正式地址构建已通过；准确测试数、云端版本和 Pages 发布结果以 [当前验证记录](nanhang-app/docs/VALIDATION_RESULT.md) 为准。TASK-13 本人身份生命周期与 TASK-14 规模、校园网和回滚仍在进行；小范围试用 TASK-11 按负责人决定跳过，因此相应门禁未通过。

每次代码、配置、数据或文档修改都要同步 [实施记录](nanhang-app/docs/IMPLEMENTATION_LOG.md) 和 [机器状态](nanhang-app/docs/project-status.json)，再从仓库根目录执行：

```powershell
py -3.12 tools/sync_project_docs.py --package
py -3.12 tools/sync_project_docs.py --check
```

请先读 [项目进度](nanhang-app/docs/PROJECT_STATUS.md) 与 [协作要求](AGENTS.md)，再接手开发或部署。
