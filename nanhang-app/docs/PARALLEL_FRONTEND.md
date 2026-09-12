# 前端三线并行：分工、共享文件与认领规则

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-13，2026-09-13-font-range-pending）：API版本10与Pages c0b2664已部署并核验；宋体与区间标尺新快照本机通过、待Pages发布。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：45 个测试文件、549 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：负责人进行实际页面验收；继续TASK-13身份生命周期与TASK-14学生规模、校园网和回滚演练。完整进度及操作见[项目进度](PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

负责人要求（2026-09-12）：多个 Agent 同时改 `apps/web`，必须**明确分工、互不覆盖**。本文件是这份分工的
唯一登记处：谁改了哪些文件、哪些文件是共享的、动手前要做什么。

三条线共用**同一个工作区**（没有各自的分支或 worktree）。因此冲突不是「合并冲突」，而是
**后写的人整文件覆盖前写的人**——`Edit`/`Write` 都是整文件落盘，谁手里是旧快照，谁就会把别人的改动抹掉。
下面的规则全部围绕这一点。

## 一、三条线（按最近触碰证据登记）

| 线 | 范围 | 独占文件（只有这条线能写） | 最后触碰证据 |
|---|---|---|---|
| 线一 · 定位/成绩与交付 | 成绩接入、入口考剔除、探索区间、分数轴换算、文档同步与提交 | `chapters/locate.tsx`、`chapters/axis.tsx`、`chapters/sail.tsx`、`quality-huixi.ts`、`quality-types.ts`、`exam-position.ts`、`reference-lines.ts`、`progress.ts`、`test/exam-position.test.ts`、`test/quality-huixi.test.ts`、`test/progress.test.ts`、`test/release-integration.test.ts`、`chapters/chart.tsx`（20:1x 起由本线接手院校卡分层标签）、`VISUAL_PROGRESS.md`、`docs/**`（本节登记处除外）、`MANIFEST.sha256`、`FILE_INDEX.md`、`releases/**` | `3f05c4d`、`4f47b1c`、`8ec3c32`、`174e2e7`（19:30–19:37） |
| 线二 · 方向与双线 | 「大类 → 小类」两级选择、AI 建议线与自选线的等权双线、候选按线拆分 | `chapters/direction.tsx`、`journey-model.ts`（专业类目录与分组） | `0e28a80`、`3f05c4d`（19:18–19:37） |
| 线三 · 设置与图形 | 顶栏两枚按钮的归属、设置卡片、起航页六站抽屉卡与「三件事」面板、图形资源 | `chapters/settings.tsx`（新）、`chapters/sail.tsx`、`art.tsx`、`chat.tsx`、`style.css`（仅六站卡与三件事两段）、`test/settings.test.ts`、`test/sail-deck.test.ts`、`test/sail-pack.test.ts`（新） | 本轮（19:45–19:50） |

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
| 2026-09-12 20:20 | 线一（负责人指派） | `chapters/chart.tsx`（推荐卡与已撤掉的「保底路线」段）、`chapters/axis.tsx`（同款推荐卡）、`chapters/shared.ts`（新增 `levelLabel`/`formatRankInterval`）、`style.css`（`.scard` 视觉与标签样式；删掉已失效的 `.safety/.srow/.sicon`）、`test/route-labels.test.ts`（新） | 负责人要求：删掉页底的「保底路线」说明段，把冲刺/保底这类分层直接做进推荐院校卡片；卡片视觉升级。按项目既有边界（不提供「冲稳保」）用历史位置关系标签实现，卡片上另给办学层次（本科/职业本科/高职）与院校标签。动手前已重读四份文件当前内容。985/211/双一流因发布包与源工作簿都没有该字段，未实现，已记入实施记录待裁决。 | 已交还 |
| 2026-09-12 20:14 | 线三（负责人指派） | `chapters/sail.tsx`、`style.css`（三件事一段 + 窄屏三行）、`test/sail-pack.test.ts`（新） | 「先定下三件事」加编号印章、n/2 计数、逐件入场、chip 盖章光环、备齐时出发按钮弹一下；满 2 门只变淡不禁用 | 已交还 |
| 2026-09-12 20:18 | 线一（负责人指派） | `chapters/chart.tsx`（院校卡分层标签与标签行） | 航线图院校卡改用发布包的历史位置关系做分层标签 | 已交还（提交 `65b35bb`） |
| 2026-09-12 22:45 | 线一（负责人指派） | `chapters/axis.tsx`、`chapters/chart.tsx`（窄屏 hook 挪走）、`chapters/shared.ts`（useNarrow）、`style.css`（.sc-detail/.focus）、`test/route-labels.test.ts` | 分数轴院校卡改抽屉式分组（与航线图同源）；滑到视野中间的那张浮出细节，其余只留抬头与最低分；细节只做透明度/位移过渡，卡片高度不变 | 已交还 |
| 2026-09-12 22:15 | 线一（负责人指派） | `chapters/chart.tsx`、`chapters/shared.ts`（chartNote）、`style.css`（航线图抽屉内边距与分隔）、`test/route-labels.test.ts` | 图内三个数字改为按两条线统计（原来按整个院校池，看着像固定值）；把「需更好位置」为空的原因写进页面与导出图；抽屉内容补内边距、加分隔、间距收口 | 已交还 |
| 2026-09-12 22:05 | 线一（负责人指派） | `chapters/chart.tsx`、`chapters/shared.ts`（分组与挑选、海报分层）、`style.css`（分组标题样式）、`test/route-labels.test.ts` | 删「复制文字版」；导出改 2 倍高清；推荐卡按大类→小类分层：手机抽屉（复用起航 .deck/.stop 与动效）、宽屏与导出平铺分组 | 已交还 |
| 2026-09-12 21:55 | 线一（负责人指派） | `chapters/sail.tsx`（开始起航门禁）、`chapters/chart.tsx`、`chapters/shared.ts`（海报改成竖版卡片）、`test/route-labels.test.ts` | ① 选科没齐时不许拉开登船卡，只提醒；② 导出 PNG 改成与手机端一致的竖版卡片长图（720 宽：竖版航线图 + 一条条院校卡片 + 写给你） | 已交还 |
| 2026-09-12 21:40 | 线一（负责人指派） | `chapters/chart.tsx`、`chapters/axis.tsx`、`chapters/shared.ts`、`style.css`、`test/route-labels.test.ts` | 负责人三项：卡片补参考年最低分、卡片压扁（236→148px）、导出 PNG 改成整页海报（航线图 + 双线清单 + 写给你）。新增 `scoreRangeForRanks` / `buildRoutePoster` 两个纯函数；两版版心改为 CSS 切换以便窄屏也能导出横版海报 | 已交还 |
| 2026-09-12 20:30 | 线一（负责人指派） | `chapters/chart.tsx`（导出用的那张 SVG 重画 + 图例）、`chapters/shared.ts`（导出垫色改纸色）、`style.css`（`.route-legend`/`.rl`）、`test/route-labels.test.ts`（加 4 项导出约束断言） | 负责人指出图内 SVG 与整站主题不符：重画成海图版画（版框、四角刻线、不标数值的底纹、双描边航路与端点节点、右侧标签栏、帆船起航点、区间图签、底部小结）。顺带修掉导出 PNG 的深色底：图内不再引用任何 id（渐变/滤镜/`<use>`），垫色改纸色 | 已交还 |
| 2026-09-12 20:21 | 线三（负责人指派） | `style.css`（定位页一段）、`test/locate-motion.test.ts`（新）；`chapters/locate.tsx` 未改动 | 定位页编排与微交互：逐块落位、位次标记落下、柱子原地长起、考试行 focus 提亮、已填格子描边转铜；并给 reduced-motion 补 `animation-delay:0s` | 已交还 |
| 2026-09-12 20:26 | 线三（负责人指派） | `style.css`（定位页读数区窄屏修复）、`test/locate-motion.test.ts`；`chapters/locate.tsx` 未改动 | 修窄屏把两处读数挤成半栏导致的标签与数字断行：不拆行 + ≤560px 上下各占一行并收回左对齐 | 已交还 |
| 2026-09-12 20:31 | 线三（负责人指派） | `style.css`（定位页留白收紧一段）、`test/locate-motion.test.ts`；`chapters/locate.tsx` 未改动 | 定位页卡片留白收紧：整页面板收一档，点名两张卡再收一档（用 `:has()` 按内容识别，避开另一条线正在改的同一文件） | 已交还 |
| 2026-09-12 20:45 | 线三（负责人指派） | `scroll-lock.ts`（新）、`App.tsx`、`chapters/shared.ts`、`chapters/sail.tsx`、`chapters/locate.tsx`、`test/route-split.test.ts`（新） | 定位拆两条并行路（手填 / 荣县一中接入，选完跳对应页面、两条路都进谈心）；登船卡片与设置卡片打开时锁住整页滚动 | 已交还 |
| 2026-09-12 20:56 | 线三（负责人指派） | `chapters/talk.tsx`（底栏聊法一行）、`style.css`（谈心房间一段）、`test/talk-room.test.ts`（新） | 进对话后去掉聊法切换按钮；聊天区按视口放大到接近整屏（消息区 flex 撑满、输入栏落底），气泡仍限宽 | 已交还 |
| 2026-09-12 21:01 | 线三（负责人指派） | `style.css`（四页动画适配一段）、`test/page-motion.test.ts`（新） | 谈心 / 方向 / 分数轴 / 航线图 的动画编排与微交互（只加样式，四页标记未动；航线图图内动效留给重画该块的那条线） | 已交还 |
| 2026-09-12 21:38 | 线三（负责人指派） | `chapters/talk.tsx`、`style.css`（谈心作用域与留白修复）、`test/talk-room.test.ts` | 聊完才给「去方向 · 选专业」；聊完弹方向小结卡（就业方向交 AI 现场答）；修掉聊天区下方留白（样式被旧规则盖掉） | 已交还 |
| 2026-09-12 21:49 | 线三（负责人指派） | `chapters/talk.tsx`（开场气泡与回答起点）、`test/talk-room.test.ts` | 两个模式的开场第一句都改成问题（取自内容规格）；引航一进来就摆出可点答案，泛舟只给问题 | 已交还 |
| 2026-09-12 21:56 | 线三（负责人指派） | `direction-quota.ts`（新）、`App.tsx`（建议合并）、`chapters/talk.tsx`（收口提示与卡片时机）、`test/direction-quota.test.ts`（新）、`test/talk-room.test.ts` | 借北辰「到量即停、之后仍可聊但画像不再变」：方向收口（5 小类 + 2 大类，8 轮兜底）、上限 6 小类 / 3 大类、收口后冻结不再新增 | 已交还 |
| 2026-09-12 22:04 | 线三（负责人指派） | `App.tsx`（顶栏）、`style.css`（`.qopts` 网格）、`test/settings.test.ts`、`test/talk-room.test.ts` | 删掉顶栏重复的上下文按钮（样式保留给窄屏守卫）；备选按钮照北辰改成两列网格、窄屏一列 | 已交还 |
| 2026-09-12 22:53 | 线三（负责人指派） | `chapters/settings.tsx`、`App.tsx`、`chapters/talk.tsx`、`style.css`（`.set-rows` 与动效开关）、`test/settings.test.ts` | 设置卡加「思考低语」「界面动效」两个开关与「现在的样子」只读一览；低语是南溟自己的阶段提示（不显示模型思考），两项开关不写盘 | 已交还 |
| 2026-09-12 23:05 | 线三（负责人指派） | `apps/web/.env.local`（本机、已忽略）、`scripts/totp_code.mjs`（新）、`apps/api/test/totp-code.test.ts`（新）、`.gitignore`、`tools/sync_project_docs.py` | 核实云端连通（healthz/readyz/跨域/401 形状）并把本机 dev server 指向云端中转；新增取码脚本并钉住它与服务端算法一致 | 已交还 |
| 2026-09-12 23:29 | 线三（负责人指派） | `direction-quota.ts`（收口语义与冻结参数）、`App.tsx`（收尾轮）、`chapters/talk.tsx`（话术与卡片）、`style.css`、`test/direction-quota.test.ts`、`test/talk-room.test.ts` | 借北辰「报告轮」：聊天只收集素材，聊够后由界面发起一次专门的生成请求（指令不进转写/证据，素材只取学生原话），落定后方向集合冻结 | 已交还 |
| 2026-09-12 23:36 | 线一（负责人指派） | `chapters/chart.tsx`、`chapters/axis.tsx`（带宽）、`test/route-labels.test.ts` | 负责人问「跟随滑动为什么没有，还是静态的」：航线图院校卡也拆出 `.sc-detail` 并挂上 IntersectionObserver（容器 `.route-cards`、deps 含抽屉展开状态）；两页的聚焦带由 -42% 收到 -46%，同一时刻通常只剩「当前这张」 | 已交还 |
| 2026-09-12 23:58 | 线一（负责人指派） | `chapters/shared.ts`（新增 useDeckStack）、`chapters/chart.tsx`、`chapters/axis.tsx`（每类推选张数）、`style.css`（纸堆三段）、`test/route-labels.test.ts` | 负责人：卡片要抽屉式堆叠、滑动像纸张翻页、停在当前卡只显示当前卡内容。改成 sticky 纸堆（一个专业类一摞、三态 class、末尾跑道给最后一张停留位），下线旧的 `.focus` 调暗；分数轴每类由 1 张改回 3 张 | 已交还 |
| 2026-09-13 00:25 | 线一（负责人指派） | `chapters/shared.ts`（翻页改成滚动驱动的 --ap、MutationObserver 自愈）、`style.css`（末尾跑道 300→116px、去掉 transform 过渡）、`test/route-labels.test.ts` | 负责人：收满后下面的留白太大、动画不够丝滑。跑道收短六成；翘起跟着滚动连续变化（不再用时间过渡），并修掉公式写反与「首次打开抽屉不认领」两个实测问题 | 已交还 |
| 2026-09-13 00:37 | 线一（负责人指派） | `chapters/shared.ts`（弹簧驱动的 --ap 与 --pile-lag）、`style.css`（跑道 116→60px、过冲与滞后接入 transform）、`test/route-labels.test.ts` | 负责人：上滑时仍有大面积空白、动画是「假流畅」缺阻尼感。跑道再收短；翻页翘起改成欠阻尼弹簧追目标值，整摞按滑动速度加一层滞后；停手后自己收尾 | 已交还 |
| 2026-09-13 00:49 | 线一（负责人指派） | `style.css`（76 条 ≤12px 规则改宋体）、`chapters/locate.tsx`（轨迹图 4 处 SVG 小字补宋体）、`test/serif-small-text.test.ts`（新） | 负责人：全站最小的字体改宋体，全面替换不要漏。改完逐页实测审计六页均为 0 处残留 | 已交还 |
| 2026-09-13 00:56 | 线一（负责人指派） | `style.css`（基准字体与 .num/group-chip 改宋体、--sans 变别名）、`test/serif-font.test.ts`（新，替代 serif-small-text）、`test/serif-small-text.test.ts`（删） | 负责人：13px 以上的正文、聊天框、输入框也还是原字体，要全覆盖改宋体。改完样式表里无衬线归零，守卫测试升级为「全站一套宋体」 | 已交还 |
| 2026-09-12 23:47 | 线三（负责人指派） | `ai-panel.ts`（删状态行）、`direction-quota.ts`（素材判据）、`App.tsx`/`chapters/talk.tsx`（入参与缺目录提示）、`test/ai-panel.test.ts`（改一条断言）、两个测试文件 | 删掉每次回复都挂的「待确认」声明；「素材够不够」改前端判（6 轮 + 240 字，或满 12 轮）；缺目录时把原因说出来 | 已交还 |
| 2026-09-13 00:13 | 线三（负责人指派） | `chapters/direction.tsx`（加三个类名）、`style.css`（方向页两级分层一段）、`test/direction-levels.test.ts`（新） | 方向页大类（海绿·略方·13px）与小类（铜·胶囊·12px）分开，小类区缩进并挂竖线，读得出从属关系 | 已交还 |
| 2026-09-13 00:40 | 线三（负责人指派） | `chapters/sail.tsx`、`style.css`（三件事一段与窄屏对应几行）、`test/sail-pack.test.ts` | 负责人：「先定下三件事」和整站设计不匹配，要更有设计感。改成「行装清单」：卡头是深海底带（面板抬头 + 备齐进度 + 铜色细进度线 + aria-live 摘要），三件沿一条竖轨排开，轨上编号印章备好点亮成铜色并挂光环；02 的计数与状态合成一枚状态签；窄屏逐项收一圈 | 已交还 |
| 2026-09-13 01:05 | 线三（负责人指派，跨线接管定位/分数轴） | `range-fill.tsx`（新）、`chapters/locate.tsx`（探索区间微调那块）、`chapters/axis.tsx`（区间上下限那块）、`style.css`（新增「区间标尺」一段，删掉 `.axis-hero .inp` 五条已失效规则）、`test/range-fill.test.ts`（新） | 负责人：定位的「微调下限/微调上限」与分数轴的「区间下限/区间上限」四只框不好看，要一起重新设计。改成两页共用的「区间标尺」：纸面填空式无框数字 + 铜色底线 + 中间带端头的细线（与分数轴金带同一支记号笔）+ 单位只出现一次「分」；深海底上自动换深海玻璃底。两页各自的 setRange 语义与 aria-label 一字未动 | 已交还 |

线三动手前后都确认过：`App.tsx` 当时无未暂存改动（线一 19:30 的提交刚落地），`style.css` 本轮未触碰。

## 五、机械校验

四班查询码轮认领：`quality-huixi.ts` 的查询码规范化、`chapters/locate.tsx` 的查询码输入、`App.tsx` 的核验提示；按负责人最终指示末位X改填0，保留六位数字输入；不改布局/样式。状态：已交还。

后端对齐轮（2026-09-12）认领：`App.tsx` 仅成绩响应、发送边界与会话撤销接线，`quality-huixi.ts` 仅汇总类型，`ai-client.ts`/`ai-panel.ts` 仅异常收尾与过期重连，`debug.ts` 仅生产隔离；不改章节布局与样式。状态：已交还。

南溟 TOTP 轮（2026-09-12）认领：`App.tsx` 仅动态码兑换错误提示，`chapters/talk.tsx` 仅访问码输入约束与文案，`ai-panel.ts` 仅会话过期提示，新增 `test/totp-access.test.ts`；不改布局、状态结构或样式。状态：已交还。

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
