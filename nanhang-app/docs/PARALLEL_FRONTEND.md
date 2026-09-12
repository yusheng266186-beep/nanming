# 前端三线并行：分工、共享文件与认领规则

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-12，2026-09-12-chapter-gate）：本地核心流程、真实招生发布与学校成绩接入完成；千帆、学生原话链路、共享会话存储均已上线；学校成绩改为云端密文托管（对象存储里只有密文）；TASK-14 剩余线上验收与回滚演练。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：32 个测试文件、428 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：线上学生规模验收与回滚演练、TASK-13 本人身份；TASK-11 按负责人决定保持跳过。完整进度及操作见[项目进度](PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

负责人要求（2026-09-12）：多个 Agent 同时改 `apps/web`，必须**明确分工、互不覆盖**。本文件是这份分工的
唯一登记处：谁改了哪些文件、哪些文件是共享的、动手前要做什么。

三条线共用**同一个工作区**（没有各自的分支或 worktree）。因此冲突不是「合并冲突」，而是
**后写的人整文件覆盖前写的人**——`Edit`/`Write` 都是整文件落盘，谁手里是旧快照，谁就会把别人的改动抹掉。
下面的规则全部围绕这一点。

## 一、三条线（按最近触碰证据登记）

| 线 | 范围 | 独占文件（只有这条线能写） | 最后触碰证据 |
|---|---|---|---|
| 线一 · 定位/成绩与交付 | 成绩接入、入口考剔除、探索区间、分数轴换算、文档同步与提交 | `chapters/locate.tsx`、`chapters/axis.tsx`、`chapters/sail.tsx`、`quality-huixi.ts`、`quality-types.ts`、`exam-position.ts`、`reference-lines.ts`、`progress.ts`、`test/exam-position.test.ts`、`test/quality-huixi.test.ts`、`test/progress.test.ts`、`test/release-integration.test.ts`、`VISUAL_PROGRESS.md`、`docs/**`（本节登记处除外）、`MANIFEST.sha256`、`FILE_INDEX.md`、`releases/**` | `3f05c4d`、`4f47b1c`、`8ec3c32`、`174e2e7`（19:30–19:37） |
| 线二 · 方向与双线 | 「大类 → 小类」两级选择、AI 建议线与自选线的等权双线、候选按线拆分 | `chapters/direction.tsx`、`journey-model.ts`（专业类目录与分组） | `0e28a80`、`3f05c4d`（19:18–19:37） |
| 线三 · 设置与图形 | 顶栏两枚按钮的归属、设置卡片、航线图 SVG 几何与图内文字、图形资源 | `chapters/settings.tsx`（新）、`chapters/chart.tsx`、`art.tsx`、`chat.tsx`、`test/settings.test.ts`（新） | 本轮（19:45–19:50） |

`journey-model.ts` 与 `model.ts` 只列在一条线里，但它们同时被两条线用（线一改区间与院校池，线二加专业类
目录与 `WebState.picks`）——所以按下面第二节当作**共享文件**处理，动手前必须认领。

未列入上表的 `apps/web` 文件（`main.tsx`、`theme.tsx`、`ai-panel.ts`、`ai-client.ts`、`journey.css`、
`JourneyApp.tsx`、`style.css`）属**共享文件**，见下节。

## 二、共享文件：先认领，再动手

共享文件同一时间只能有一个写者。动手前在第三节登记一行，写完把「状态」改成「已交还」。

| 文件 | 谁在用 | 为什么危险 |
|---|---|---|
| `apps/web/src/App.tsx` | 线一（章节门禁、成绩入口）、线二（状态与建议注入）、线三（顶栏按钮与设置卡片挂载） | 三线都要在这里接线，是覆盖概率最高的文件 |
| `apps/web/src/style.css` | 线一（分数轴金带、窄屏收紧、起航页间距） | 三线都要加样式，且线一按惯例在同一提交里改它 |
| `apps/web/src/journey-model.ts` | 线一（区间/院校池）、线二（专业类目录与分组） | 同一个文件里两套结构 |
| `apps/web/src/model.ts` | 线一（表单与匹配）、线二（WebState.picks/pickedGroups） | 状态结构的唯一来源 |
| `apps/web/src/chapters/talk.tsx` | 线二（建议卡按大类分组）、线三（本轮移走思考深度） | 谈心室同时被两条线改 |
| `apps/web/src/chapters/axis.tsx` | 线一（区间归属与换算）、线二（双线候选拆分） | 分工文档：分数轴归线一，双线候选区归线二 |
| `apps/web/VISUAL_PROGRESS.md` | 线一 | 视觉进度主本，只由线一追加 |
| `docs/PARALLEL_FRONTEND.md`（本文件） | 三线共用 | 认领登记在第四节，谁都可以追加一行；追加时不要重排别人的行 |

## 三、五条硬规则

1. **写前重读**：任何共享文件在 `Edit`/`Write` 之前先重新读一遍当前内容。手里是旧快照就不要写——
   整文件落盘会把别人刚写的部分抹掉。改动越小越好，不要顺手重排、重命名、调整格式。
2. **不整仓 add**：禁止 `git add -A` / `git add .` / `git commit -a`。只 add 自己这一轮的文件；
   `git status --short` 里别人的暂存与未暂存改动一律不要碰（线一的文档同步会刷新 `MANIFEST.sha256`、
   `FILE_INDEX.md` 与源码包，那些不是你的改动）。
3. **别人在建的文件不提交、不回滚**：看到不属于自己这条线的未暂存改动（尤其 `App.tsx`、`style.css`、
   `journey-model.ts`），只报告，不 `checkout`、不 `stash`、不 `reset`。
4. **文档同步串行**：`py -3.12 tools/sync_project_docs.py --package` 与 `--check` 一次只允许一个人跑
   （它会重写 MANIFEST、索引、源码包与各文档的进度摘要块）。跑之前看一眼 `MANIFEST.sha256` 的修改时间，
   跑完立刻 `--check`；发现并发的改动就重跑，不要手工合并生成物。
5. **不切分支、不重置工作区**：共享工作区上执行 `git checkout <branch>`、`git restore`、`git reset --hard`
   会同时影响另外两条线。要试验就另开目录，不在这里做。

补充（负责人 2026-09-12 指示）：**界面视觉由负责人自己验收**。改动做完只需要给出代码与逻辑层面的证据
（类型检查、测试、必要的 DOM 断言），不要代为做浏览器视觉校检，也不要在实施记录里写成「已通过视觉验收」。

## 四、认领登记（追加式，最新在下）

| 时间 | 线 | 文件 | 做什么 | 状态 |
|---|---|---|---|---|
| 2026-09-12 19:20 | 线三 | `chapters/chart.tsx`（SVG 段） | 航线图右侧标签溢出被裁、航线小结与中线相交、图内浅色文字对比度 | 已交还 |
| 2026-09-12 19:45 | 线三 | `chapters/settings.tsx`（新）、`App.tsx`（顶栏段）、`chapters/talk.tsx`、`chapters/chart.tsx`、`test/settings.test.ts`（新） | 设置卡片收拢思考深度与清除本人数据；顶栏「溟」= 设置、品牌标记 = 逍遥游彩蛋 | 已交还 |
| 2026-09-12 19:52 | 线三 | `tools/check_frontend_lanes.py`（新）、`docs/PARALLEL_FRONTEND.md`（新）、`AGENTS.md` | 建分工契约与越线自查脚本；登记 `test/topbar-narrow.test.ts` 归线一（据内容推定，不符请那边改登记） | 已交还 |
| 2026-09-12 19:56 | 线一 | `chapters/chart.tsx`（底部导出区）、`style.css`（只新增导出区一条规则）、`test/settings.test.ts`（改一条过时断言） | 负责人直接指派：删掉「本人数据」面板与「打印 / 另存为 PDF」，剩余按钮重排。线三 19:45 那笔已交还，动手前重读的是含线三改动的当前内容；线三的 SVG 几何与文案改动一律保留。`test/settings.test.ts` 里「下载仍留在航线图」那条断言随面板下线一并更新（只改这一条，其余未动）。 | 已交还 |
| 2026-09-12 20:00 | 线三（负责人指派） | `chapters/sail.tsx`、`style.css`（六站卡规则与窄屏那五条） | 首页六站改抽屉式堆叠卡：收起 980→246px（390px），点开展开并推开后一张 | 已交还 |
| 2026-09-12 20:01 | 线一 / 线二（提交 `6e3ec33`） | `chapters/chart.tsx`、`style.css`、`test/settings.test.ts`、`docs/IMPLEMENTATION_LOG.md` | 航线图底部收拢的提交把这些文件一并入库，其中航线图标签修复、抽屉卡样式、设置归属测试都是线三当时在建的内容 | 已入库（线三复核：内容完整、测试通过） |
| 2026-09-12 20:06 | 第四会话（顶栏窄屏修复） | `style.css`（仅末尾 ≤340px 顶栏块，19:49 写入）、`test/topbar-narrow.test.ts`（新）、`docs/verification/topbar-320-fixed-2026-09-12.png`（新） | 修复 sail-compact 轮在案的 320px 顶栏溢出 18px；样式块已随 `6e3ec33` 的 style.css 整文件 add 进入 HEAD，与该提交自身改动可共存（更正 19:52 行的推定：topbar-narrow.test.ts 与顶栏块归本会话，非线一）；本轮提交只含测试、实测截图与文档 | 已交还 |
| 2026-09-12 20:08 | 线三（负责人指派） | `chapters/sail.tsx`、`style.css`（抽屉卡动效）、`test/sail-deck.test.ts` | 抽屉卡补动效：0fr→1fr 展开、正文跟进、整摞错峰入场、让位过渡、箭头回弹；正文改为常驻 DOM（读屏不丢内容） | 已交还 |

线三动手前后都确认过：`App.tsx` 当时无未暂存改动（线一 19:30 的提交刚落地），`style.css` 本轮未触碰。

## 五、机械校验

后端对齐轮（2026-09-12）认领：`App.tsx` 仅成绩响应接线、`quality-huixi.ts` 仅汇总类型、`ai-client.ts` 仅网络异常收尾；不改章节布局与样式。状态：进行中。

```powershell
cd C:\Users\yusheng\Desktop\南航
py -3.12 tools/check_frontend_lanes.py --lane 3
```

按上表把当前脏文件分成三类打印：**本线**（可安全提交）、**共享**（需确认无人在改）、**其它线**
（不要 add/commit）。另有两条硬错误：`MANIFEST.sha256`/`FILE_INDEX.md` 之类生成物被手工改动而未跑同步、
以及暂存区里出现别的线的文件（等于准备把别人的改动一起提交）。

## 六、新文件放哪里（避免争同一个文件）

- 一条线自己的新模块放到 `apps/web/src/chapters/<名字>.tsx`（页面）或 `apps/web/src/<名字>.ts`（纯逻辑），
  在**自己线的文件里** import，不要顺手改 `main.tsx`。
- 一条线自己的样式先写进自己的模块能覆盖的范围；非要新增样式时，优先用既有类（`.panel`、`.btn`、`.chips`、
  `.board-card`、`.tier-pick` 等）。必须新增全局样式时，按第二节先认领 `style.css`。
- 一条线自己的守卫测试放 `apps/web/test/<名字>.test.ts`，不往别人的测试文件里加断言。
