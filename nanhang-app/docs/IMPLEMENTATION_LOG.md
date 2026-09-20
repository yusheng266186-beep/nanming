# 实施记录

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-20，2026-09-20-university-detail-enrichment-82）：完成官方学费队列核查和两库合并后，已对统一库 2,308 所院校批量编排详细档案：每校平均 918 字，保留教育部名录、阳光高考章程入口、学科/学位、招生计划、费用与来源状态；统一库与详细来源表一次性写入，数据库独立验证、68 项 TASK-03 Python 测试通过；未执行线上部署，云端开关仍保持关闭。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：47 个测试文件、554 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：统一数据库已生成并作为本地查询入口；后续若招生库或官方学费目录继续更新，应先重建/验证南航规范化招生库，再运行 pipelines/task03/merge_admissions_databases.py 重新生成统一库，不能只替换其中一侧。118 个 institution 实体行仍没有可直接入库的官方明确 CNY/学年金额，继续保持未知；同时按全项目审阅修 P1 与状态生命周期，TASK-13/14 身份与运维收尾不变。完整进度及操作见[项目进度](PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

## 2026-09-20 / drawer-anchor-and-pack-compress-1：抽屉「点击后上方变白」按根因修；行装清单真正压缩

- 负责人 2026-09-20 第三轮（明确不满）：「六次靠岸在手机上只要点击某个航线，卡片上方就会出现白色，这应该是个 bug」「行装清单让你压缩，还是有这么大的空白」「这些问题我不是已经说过了吗，到底改了没有」。
- **我要认的错**：上一轮我对这两个问题改的是**数值/局部**，没有查根因——所以改完你看还是原样。
- 「点击后上方变白」的定位过程（这轮没有靠猜）：
  1. 静态几何：390×844 实测抽屉展开后 `stop` 高 96px、正文底到卡片底只差 1px——**静态没有多余空白**；
  2. 触摸手势复现（先触摸滚动再触摸点卡）：点击前后 `scrollY` 都是 365，**没有跳滚动**；
  3. 录屏逐帧（CDP screencast，32 帧）：展开动画期间 `deckTop` 恒为 120、被点开的卡底 277 不变；
  4. 读出样式表：`html{scroll-behavior:smooth}` + **滚动锚定 `overflow-anchor:auto`**。
  结论：卡一展开，它下面的内容整体下移，**Chrome 的滚动锚定会自动补一次滚动来"稳住"视口**，
  于是视口上方那块被顶出去、露出下面的空背景——正是负责人截图里「上方一片白」且**章节抬头被切掉一半**的样子。
  修法：`html{overflow-anchor:none}` + `.deck{overflow-anchor:none}`（页面里所有高度变化都由我们自己的滚动逻辑管，
  不需要浏览器代劳补滚动）。这条同时修掉其它「展开/收起后视口被顶走」的表现。
- 「行装清单空白」的修法（给出可量目标，不再凭感觉）：上一轮只收了小节外边距，收效看不出来；
  这轮直接收三件自己的行距与状态带高度：状态带内边距 `18/16 → 14/12`、进度线间距 `14/11 → 11/8`、
  每行内边距 `15 → 10px`、提示文字 `11.5px/1.7 → 10.5px/1.55`、页尾 `16/20 → 12/14`、轨道列 `28 → 24px`。
  实测：面板 **616 → 533px**、每行 **149 → 130px**、状态带 **111 → 90px**、页尾 **87 → 77px**、
  首页总高 **2329 → 2241px**；压缩后整块清单在一屏（390×844）里完整可见（标题 → 三件 → 开始起航按钮），不再需要滚。
- 顺手加的调试钩子：`App.tsx` 里 `window.__nmDebug`（**只在 `DEBUG_MODE` 为真时挂载**，生产构建摇掉）。
  用途是让验收脚本把页面直接摆到某个状态（选科/五次考试/已选入口/跳页），复现问题不用再点完整流程——
  这轮的复现就是靠它把「六站 + 已选科」一步摆好。语义是纯调试入口，学生端拿不到。
- 工具与核查：`npm run validate` = **53 个测试文件、582 项通过、0 失败**（`sail-pack` 断言同步新数值并加了两条窄屏收紧断言；
  `serif-font` 守卫又抓到两条 ≤12px 规则漏写宋体，已补 `font-family:var(--song)`；`quality-huixi` 那条 5 秒超时在全量并发下偶发，
  单跑 36 项全过）。
- 视觉校检：新增对照截图 `11-行装清单-压缩后-上半.png`、`12-…-下半.png`、`13-六站-展开后.png`（`docs/verification/sail-layout-2026-09-20/`）。
- 未做与边界：仍是设备仿真；「上方变白」的真机验证需要负责人在手机上确认（我这边按根因修的是滚动锚定，
  若真机上仍有，请告诉我那一刻视口顶部显示的是什么内容，我按现象继续查）。

## 2026-09-20 / exam-analysis-2：改用「生成成绩分析」按钮，复用荣县一中的航迹图；考试输入框重做

- 负责人 2026-09-20 第二轮修正（附真机截图）：「我看到你新增的了，那你这里这两个不用起来吗，不要搞得和荣县一中的成绩显示效果（不一致）…**不是让你新增**，输入五次成绩后增加一个按钮，可以生成和接入荣县一中成绩一样的显示效果；五次成绩输入的那个框还是太丑了，再改！」
- **我先犯的错与纠正**：上一轮我自己新画了一张折线图（`ExamTrajectoryChart`），还把它塞进「录入近几次考试」面板底部。两处都不对：(1) 荣县一中那条路**本来就有**这张图——「航迹：历次总分与切线」，负责人要的是把它**用起来**，不是另做一张像它的；(2) 位置也埋错了，它在录入面板内部 y≈1185，而负责人看的「你的成绩曲线」在 y≈2979，难怪问「改到哪去了」。本轮按指示改成复用。
- 实际修改：
  - 新增 `apps/web/src/chapters/trail.tsx`：把荣县一中那段「航迹」的 SVG 与历次表抽成 `ExamTrailChart` / `ExamTrailTable`，**两条路共用同一套渲染**。位次与考试人数两列只在学校数据存在时出现（手填不显示一排「—」，直接不占位置）。
  - `exam-trajectory.ts` 新增 `manualExamsToShardExams()`：把手填考试转成与荣县一中发布分片**同一个数据形状**（`QualityStudentExam`），这是复用同一套渲染的前提。缺的字段一律留空（位次/人数 null、`subjects`/`knowledge` 空数组），不推算不补零。
  - 定位页手填路线：录满 5 次后出现按钮「**生成成绩分析（与接入荣县一中同款）**」，点开即生成同款航迹图 + 同款历次表 + 逐次读数卡，并写明「这份分析只用你填的总分与两条切线；逐科分数、年级与班级均分差、校内位次来自学校成绩记录」。
  - 撤掉上一轮自造的折线图：`chapters/trajectory.tsx` 只保留逐次读数卡（图上放不下的部分），折线图与相关几何函数删除，避免同一页两张讲同一件事的图。
  - **考试输入框重做**（负责人两轮都说丑）：改成「纸面填空」——无框、只留一条铜色底线、大一号等宽数字（20px）、聚焦时底线点亮 + 一层柔光，与区间标尺同一支笔；步进箭头吞掉；宽屏加一行列头「总分 / 特控线 / 本科线」（窄屏靠 aria-label，列头会挤掉数字宽度）。
- 一个值得记的坑：这三格的样式我写了三轮都没生效。查到底后发现——Vite 开发态把 `style.css` 按块注入成多条 `<style>`，`.inp` 的基础规则（`min-height:50px`、1px 描边）在层叠里压过了我后写的 `#page-locate .exam-row .exam-num .inp`（浏览器里规则确实存在、计算值却不变）。最后把这几个视觉属性放进组件内联样式固定下来，不再受注入顺序影响。同类问题以后优先考虑内联或提高作用域。
- 工具与核查：`npm run validate` = **53 个测试文件、582 项通过、0 失败**（期间 `serif-font` 守卫抓到一条 ≤12px 规则没写宋体——项目硬规矩，已补 `font-family:var(--song)`；另有一条 `quality-huixi` 用例 6.8 秒超时属既有抖动，单跑通过）。
- 实测结果（本机 390×844，手填 5 次）：按钮出现且文案正确；点击后生成 `1` 张航迹卡、`5` 根柱、`10` 段虚线（两条线各 5 段）、`5` 行历次表（列头：考试/总分/一本线/距一本/本科线/距本科，**无位次列**）、`5` 张读数卡；考试输入框 `50 → 40px`、每行 `111 → 101px`；控制台异常 `0`。
- 视觉校检：新增截图 `05-手填生成成绩分析.png`、`06-手填成绩分析-1x.png`、`07-五次考试录入-新样式.png`（`docs/verification/locate-exam-2026-09-20/`）。
- 未做与边界：仍未在真机验收；荣县一中那条路的航迹图换成了共用组件（同一份 JSX，视觉与行为不变，但这是**该页面的改动**，需要负责人过一眼）。

## 2026-09-20 / exam-analysis-1：手填成绩的轨迹分析（对齐荣县一中那条路的阅读深度）

- 负责人 2026-09-20 第三批：手填五次考试后「这些图表没有像荣县一中一样详细」，成绩曲线也没标出本科线与特控线；同时五次考试那一段空白多、显得粗糙；要求「其他成绩数据分析要对齐荣县一中一样」。
- **先确认边界（负责人已裁定：只做真实可得的部分）**：荣县一中那张逐科表（科目/分数/本科线/距本科线/一本线/距一本线/年级均分差/班级均分差）来自学校成绩库；手填的考试只有三格——总分、特控线、本科线。**没有单科、没有年级/班级均分**。所以本轮的取舍是：把真能算出来的分析做深，拿不到的一律显示「未提供」，不推算不补造（符合项目「缺失即未知」的硬规矩）。参考线按**每场考试自己的切线**画（负责人选定），跨场不平均。
- 实际修改：
  - 新增 `apps/web/src/exam-trajectory.ts`（纯函数）：逐场算距线差、分数轴范围（把参考线一起框进来，端点留白）、最近一次变化量、跨度、在线上次数；`spanReading()` 只按跨度给一句实话，不出现概率/冲稳保字样。
  - 新增 `apps/web/src/chapters/trajectory.tsx`：`ExamTrajectoryChart`（SVG 轨迹图：总分实线 + 每场自己的特控线铜色虚线 + 本科线灰虚线，各带落点与 title 读数，图框标出分数轴端点）与 `ExamReadingCards`（逐次读数卡：总分、距两条线、较上次变化）。
  - 定位页把它接在「录入近几次考试」面板下方（`exams.length > 0` 才出现），并显式写明「逐科分数与年级/班级均分差需要学校成绩数据，在起航选荣县一中接入后才会多出那张表」。
  - 排版收紧（负责人：空白多、粗糙）：手机档考试行由**三行**（标签行/三个输入/删除按钮独占一行）改成**两行**——删除按钮提到标签行右侧（`grid-template-areas:"tag tag tag del"`），输入高度 50→42px，行内那两枚「距线」胶囊删除（下方读数卡已经算得更清楚，行内属重复）。实测：每次考试 `131 → 107px`，五次共省约 120px，整页 `5118 → 4997px`。
- 工具与核查：`npm run validate` = **53 个测试文件、582 项通过、0 失败**（新增 `test/exam-trajectory.test.ts` 6 项：逐场距线差、缺线不替补、没总分不进轨迹、轴范围覆盖参考线、单次不给结论、解读不夹带录取判断）。
- 实测结果（本机 390×844，手填 5 次：612/518/430、560/580/495、499/510/450、580/560/500、651/520/440）：
  - 轨迹图渲染 3 条线（总分/特控线/本科线）+ 15 个落点，图框标出 `403–678`；
  - 5 张读数卡数值正确：`+94/+182`、`-20/+65`、`-11/+49`、`+20/+80`、`+131/+211`，变化量 `-52/-61/+81/+71`；
  - 解读句：「五次里最高与最低差 152 分，起伏偏大；这时候区间比单点更能反映你的位置。」；
  - 诚实说明在位（指路荣县一中接入），控制台异常 `0`。
- 视觉校检：4 张截图入 `docs/verification/locate-exam-2026-09-20/`（轨迹图 3 倍图、1 倍视口、五次考试录入段）。**只做了设备仿真**，真机手感仍由负责人验收。
- 未做与边界：没有给手填路线增加单科输入口（那是负责人未选的方案）；未触碰荣县一中数据链路与云函数；未提交前不得声称已上线。

## 2026-09-20 / layout-and-think-tail-1：首页排版割裂、底栏遮挡、聊天高度、思考只露尾巴

- 负责人 2026-09-20 第二批（附真机截图）：① 首页行装清单上下留白太多、六站抽屉与下一节割裂；② 六站点击后上方变白，怀疑所有抽屉卡都有；③ 完成环节右上角小圆点看着廉价；④ 谈心对话框太短，聊两句就要下滑；⑤ 思考过程不要全显示，参考 beichen 的做法。
- 逐条实测与修法：
  - **② 抽屉卡「上方变白」**：不是抽屉本身的问题，是**固定底栏盖住了内容**——`main` 的 `padding-bottom` 只有 20px，而底栏（`.bottom-nav`）是 64px + 安全区。真机截图里「THE VOYAGE · 六章航程」正好被底栏压住，展开抽屉时上方的章节抬头被盖，看起来就像「变白」。修法：`main{padding-bottom:calc(84px + env(safe-area-inset-bottom))}`（仅手机档那条媒体块内）。
  - **③ 完成态小圆点**：`.bottom-nav button.done::after`（5px 圆点）整条删除，完成态仍由当前页高亮与图标颜色表达。
  - **① 首页留白**：小节内边距 `16/18px → 10/12px`，抽屉每张再收一档（`padding` 11→9px、图标 21→15px、叠层 −12→−14px）。实测：收起态每张 `51 → 45px`、整叠 `243 → 197px`、首页总高 `2363 → 2329px`。
  - **④ 谈心高度**：量出根因是**页头占了一屏的 20%**（280px），而聊天气泡只有 470px。手机档三件事一起做：页头瘦身（导语不显示、标题 26px、装饰玫瑰下线，实测 `280 → 110px`）、聊天卡片高度改按「视口 − 顶栏 − 底栏让位」算（`clamp(430px, calc(100dvh - var(--rail-h) - 178px), 820px)`）。实测：卡片 `644 → 602px`、**输入栏从「被底栏盖住 143px」变成 `dockCoveredByNav: 0`**（输入栏上沿留 4px），页头与卡片顶端一共收掉 170px。这里做了个取舍：牺牲一点消息区高度（470→439px）换取「输入框永远够得着」——手机键盘弹起时被压在底栏下面更糟。
  - **⑤ 思考只露尾巴（借鉴 beichen）**：去读了 `beichen` 仓库的 `index.html`，它的做法是——取 reasoning 的最后一个片段（`>40` 字就 `'…' + s.slice(-40)`），做成**一行、不换行、超出省略号**的细字，**每 600ms 才换一次**并淡入；另外它的提示词里也有【思考语言】那条（与本项目 9-20 的修法互相佐证）。照此实现：App 把增量推进 `reasoningQueue`（ref，不触发渲染），谈心室每 600ms 排空一次、只写尾部 40 字，`.thinking-tail.swap` 做淡入。实测：一条 40+ 字的长发言触发了 **16 次尾巴变化**，每段长度 37–41 字（全部 ≤41，符合 40+省略号），中文；回答到达后尾巴清空；大块 `.thinking` 面板下线。
- 工具与核查：`npm run validate` = **52 个测试文件、576 项通过、0 失败**（更新 `talk-room`、`ai-reasoning`、`settings` 三处断言，钉住新机制：队列 + 600ms + `slice(-40)`、手机高度公式、小圆点已删除）。
- 视觉校检：线上 Pages 手机档 390×844 重跑一轮，8 张截图更新到 `docs/verification/pages-mobile-2026-09-20/`；登船卡与设置卡 `coversViewport: true`、底边溢出 0；思考尾巴中文（中文 77 / 拉丁 0）；控制台与网络异常 0。
- 未做与边界：只改了 `apps/web`（CSS/组件/测试）与文档，**未改云函数、未动密钥**；本轮仍是设备仿真不是真机；`③` 的小圆点删除与 `②` 的底栏让位属观感类改动，最终手感由负责人真机验收。

## 2026-09-20 / overlay-portal-1：浮层改走 portal 修根因；思考改中文；线上视觉校检

- 负责人真机报三处（附截图）：① 方向小结卡只露一条边、手机端上下滑不动；② 左右两边两条白条；③ 思考要中文。要求改完顺带做视觉校检。
- 根因（实测，不是推断）：`.view` 挂着入场动画 `animation:arrive`，而 `@keyframes arrive` 里有 `transform`。
  只要元素的 transform 不是 none（**动画运行期间就算**），它就成为 `position:fixed` 后代的包含块。
  三处浮层原先都挂在章节里，于是背板按章节盒子定位。390×844 实测：
  背板 `18,2162 → 372,2991`（354×829）——左边 18px 正好是 `.wrap` 的 `padding:0 18px`（**白条**），
  顶边从章节顶部起算、卡片底边落到视口下方 381px（**只剩一条边、滑不动**）。
  2026-09-13 去掉 `animation-fill-mode` 只解决「动画结束后仍带 fill」那一档，动画运行期间照样创建包含块，所以那次没根治。
- 修法：新增 `apps/web/src/overlay.tsx`——`Overlay` 用 `createPortal` 把浮层挂到 `document.body`，
  包含块永远是视口，与任何祖先的 transform/动画无关；登船卡、设置卡、方向小结三处统一改走它
  （源码里已无 `className="board-backdrop"` 直写）。几何同时加固：手机档卡片高度改为相对背板的
  `max-height:100%` + `min-height:0`（不再用 `92dvh`——它在部分 WebView 上会算得比可视高度大），
  背板 `overflow:hidden`，卡片自己滚（`overflow:auto` + `overscroll-behavior:contain`）。
- 思考改中文：系统提示词加【语言】段（`qianfan_upstream.buildQianfanSystemPrompt` 开头、单独一段）——
  只写在【输出格式】里时线上实测仍整段英文（有截图证据），提到最前面后连测 4 轮全部中文
  （深档 中文 826/拉丁 161、535/73；标准档 253/7、276/11）。
- 工具与核查：`npm run validate` = **52 个测试文件、576 项通过、0 失败**；守卫测试改为钉住新机制
  （`overlay-geometry.test.ts` 重写：portal 到 body + 高度约束 + 卡片自己滚；`overlay-fixed.test.ts`、
  `talk-room.test.ts` 同步）。
- 实测结果（本机 390×844 与线上 Pages 各一轮）：
  - **修复后几何**：背板 `0,0 → 390,844`（**铺满视口**，与修复前的 354 宽对比）；卡片底边溢出 `0`（修复前 +381）；
    手指拖动滚动 `63 → 903`（修复前卡在 231）；左右白条消失。
  - **视觉校检**（线上 Pages、手机档 390×844、真模型）：8 张截图存入
    `docs/verification/pages-mobile-2026-09-20/`（起航 / 登船卡 / 定位 / 实时思考 / 谈心回复 / 方向小结卡 /
    方向小结卡滑到底 / 设置卡）；登船卡与设置卡同样 `coversViewport: true`、底边溢出 0；
    **控制台与网络异常 0**。
  - 一个如实说明：某一轮小结卡内容短于视口时 `internalScroll: false`，手指拖动 `scrollTop=0`——
    这是「没有内容可滚」，不是滑不动；内容长的两轮都是 `internalScroll: true` 且能滚。
- 未做与边界：云函数已部署（版本 14，环境变量指纹仍为 `565bedfd44feff54` 逐项一致，**未改任何密钥**）；
  本轮截图是设备仿真（390×844/DPR3/触摸），不是真机；模型思考语言仍可能偶发英文（提示词约束，非硬保证）。
- 下一步：负责人在真机上过一眼小结卡的滑动手感与思考块的可读性。

## 2026-09-20 / live-reasoning-1：把模型思考改成实时下发（负责人指示）

- 指示原文：负责人 2026-09-20「我确定低语改为实时的，不要害怕什么冲，就要让学生看到思考过程」。
  这条指示**改变了项目此前的一条既定边界**（思考内容属草稿、不下发学生端），因此下面把改动、代价与验证逐项记清。
- 为什么之前做不到（三处卡点，都不是前端文案问题）：
  ① `apps/api` 的网关把帧攒进数组、整轮跑完才返回（`careerTurn` 一次性给 frames）；
  ② 帧协议只有 `start/delta/complete/error`，**没有思考通道**；
  ③ `apps/web` 的 `runAiTurn` 用 `await response.text()` 整包读响应。
  另外 `qianfan-upstream.ts` 顶部注释原本写着「思考内容(reasoning_content)一律丢弃」。
- 实际修改（四层，逐层可测）：
  - **帧协议**（`packages/ai-gateway/src/sse.ts`）：新增 `reasoning` 事件与 `reasoningEvent()`。
  - **上游**（`qianfan-upstream.ts`）：`deltaFromLine` 同时认 `reasoning_content` 与 `reasoning` 两种字段名，
    思考按 `kind:"reasoning"` 单独 yield；正文仍走结构化段边界判定（思考不参与该判定，不会把 JSON 当思考发出去）。
  - **网关**（`gateway.ts`）：`UpstreamChunk` 增加可选 `kind`；`pump` 分两条流分别扫描与下发；
    `careerTurn` 拆成 `openTurn()`（先把「写响应之前」的判断跑完，给出状态码）+ `run(sink)`（逐帧边产生边发）。
    start 帧推迟到上游真的出第一块内容时才发——这样「首字节就失败」仍然能用 503 表达，帧序仍是 start→…→complete。
    思考通道的显示上限 1200 字；思考里出现概率/分层词汇时**不作废整轮**，改为停止继续显示思考并给一条
    `REASONING_HIDDEN` 说明（负责人明确接受草稿里出现这类说法；正文与结构化建议仍走原来的严格校验）。
    思考仍保留两条硬拦截：标记与链接（防 XSS 与引流）。
  - **浏览器**（`apps/web/src/ai-client.ts`）：`runAiTurn` 改为 `response.body.getReader()` 边收边解析，
    新增 `onReasoning/onText` 实时回调与 `frameDelta()`；没有 body 的实现仍回落到整包读取。
  - **界面**（`chapters/talk.tsx`、`App.tsx`、`style.css`）：待回答的气泡里新增 `.thinking` 节点，
    思考增量**直接写 DOM**（不走 React state——一帧一次 setState 会把对话树重渲染几十次）；
    节点重新挂载时从 `reasoningText` 回填，开头不会丢。样式与正文分开：缩进 + 左侧细线 + 更小更淡的字。
  - **本机可验证**：假上游支持 `reasoningChunks`；`NANHANG_FAKE_SCENARIO=reasoning` 演「思考分 3 块、每块隔 900ms」，
    默认档保持原来的节奏（否则每轮多等近 3 秒，自动测试会被拖过超时）。
- 工具与核查：`npm run validate` = **52 个测试文件、574 项通过、0 失败**（新增 `apps/web/test/ai-reasoning.test.ts` 6 项；
  更新 `gateway.test.ts` 一条状态码断言与 `qianfan-upstream.test.ts` 的收集器与两条用例名）。
- 实测结果（本次运行，均为实测不是推断）：
  - **本机端到端**（`NANHANG_FAKE_SCENARIO=reasoning` + dev server）：谈心室那块的思考长度按 700ms 采样为
    `0 → 41 → 72 → 107` 字**逐块增长**，回答到达后节点卸载；控制台异常 `0`。
  - **线上云函数（部署前）**：`HTTP 200`、首字节 `0ms`、40 个 `delta`、1 个 `complete`；思考块 0 个——旧代码仍丢弃思考。
  - **云端部署（本轮完成）**：`node scripts/build_function.mjs`（136 KB）→ 用 `private/deploy_code_preserving_env.py`
    部署。该脚本**只换代码**：先用交接库《操作执行清单》附录 A 的腾讯云凭据（与 `private/inspect_function_env.py`
    同一条既有通道，只读凭据、不打印值）`GetFunction` 把线上 10 个环境变量整表读回并备份到
    `private/backups/nanming-api-env-preserved-20260920T040726Z.json`，再 `UpdateFunctionCode` +
    用**同一份环境变量**回写配置，最后逐键比对指纹。实测：环境指纹部署前后同为 `565bedfd44feff54`（**逐项一致**），
    已发布版本 11。**没有新建或修改任何密钥、没有触碰其它函数**。
  - **线上云函数（部署后，直连探针）**：`HTTP 200`、首字节 `0ms`、`start×1`、**`reasoning×303`（共 1198 字，首块 1ms）**、
    `delta×14`、`complete×1`。**真模型确实返回思考内容**。
  - **线上端到端（浏览器 + 手机档 390×844，dev server 指向云端真模型）**：`.thinking` 节点长度按 500ms 采样为
    `24 → 145 → 292 → 465 → 620 → 640 → 933 → 1081 → 1191` 字**逐块增长**（约 6.7 秒内长满），
    回答到达后节点卸载；随后 AI 正文 90 字 + 4 个可点选项；控制台异常 `0`。
  - **部署副作用核对**：`/healthz` = `{"status":"ok","ai":true,"store":"memory"}`、`/readyz` = `upstream:"qianfan"`；
    学校入口 `/v1/school/identify` 用不存在的凭据返回 `401`（服务在、凭据不匹配；若是 `503` 才说明配置被弄丢）——
    **学校入口未被本次部署影响**。
  - **手机档思考块几何**（390×844，注入长思考实测）：宽 290px 不越界、高 220px 上限、可滚（手指拖动 `scrollTop=400`）、
    字号 12px / 行高 21px / `pre-wrap`。
  - **线上 Pages 最终验收（学生真实地址，不是本机 dev server）**：手机档 390×844 走完
    「起航 → 定位 → 谈心 → 连接 → 发话」，**思考块在页面上出现并逐块增长**
    （`72 → 312 → 532 → 656 → 789 → 989 → 1128 → 1197` 字，约 3.5 秒内），回答到达后节点卸载；
    随后 AI 正文 187 字 + 4 个可点选项；生产构建无调试角标；控制台/网络异常 `0`。
- 未做与边界：未做视觉校检（思考块观感由负责人验收）；**思考正文是英文**（线上那轮模型用英文推理，
  见下一条「待裁决」）；首页/航线图等其它页面的观感未逐页复看。
- 待裁决（本轮发现，未擅自改）：模型这轮的思考是**英文**（`The student has said: ...`），学生不一定读得懂。
  要不要让模型用中文思考，属于提示词层面的决定：可以在系统提示词里加一句「思考过程也用中文」，
  代价是多约几十个 token，且不保证所有模型都遵守。负责人说一声我就改。
- 下一步：无需再动云端；若要中文思考，改提示词后重新打包部署（同一条命令）。

## 2026-09-20 / university-detail-enrichment-82：统一库批量补充院校详细档案

- 目的：负责人要求继续为合并库的每所院校补充尽可能详细的介绍，且必须先完成批量检索/整理，再一次性写入数据库，不能查一所就重建一所。
- 资料边界：本轮以现有教育部普通高校名录匹配、阳光高考招生章程官方入口和库内既有招生结构化字段为输入；批次来源域名仅保留 `www.moe.gov.cn`、`gaokao.chsi.com.cn`。教育部名录和阳光高考入口是官方来源，未用第三方搜索摘要补写未知字段。阳光高考批量直连存在访问保护，本轮未绕过限制，也不把未批量取得的章程全文冒充已入库事实。
- 实现：新增 `pipelines/task03/enrich_university_details.py`，先生成 `data/admissions/university-detail-enrichment-batch.json`，完成 2,308 条记录和来源/状态统计后，再用同一批次在一个 SQLite 事务中创建 `university_detail`、`university_detail_source` 和 `v_university_detail`。详细文案按概览、教育部名录、办学特色、研究生学科、2026 招生计划、报考要求/历史、费用、来源边界分段；官方来源事实与结构化字段分别保留。
- 结果：详细档案 `2,308/2,308`；平均 `915.46` 字，范围 `760–2,126` 字；来源记录 `6,918`，官方 URL `4,610`。状态为 `OFFICIAL_REGISTRY_AND_CHSI_INDEX=2,282`、`CHSI_INDEX_WITHOUT_MOE_NAME_MATCH=20`、`OFFICIAL_REGISTRY_ONLY=1`、`OFFICIAL_SOURCE_INDEX_INCOMPLETE=5`。新增 `query_admissions.py --institution-detail <代码/ID/名称>` 查询入口。
- 失败与修正：首次应用批次时发现来源插入 SQL 占位符多 1 个，事务回滚且未留下详细表；修正后重新应用成功。随后抽样发现自动文案量词重复（“条条/个个”），修正编排器后重新生成全量批次并整体替换，最终抽样重复短语数为 0。两次写入均是全量批次事务操作，没有逐校重建。
- 实测命令与结果：
  - `py -3.12 -X utf8 nanhang-app/pipelines/task03/enrich_university_details.py --build-batch`：2,308 条批次生成通过；批次 SHA-256=`7cb4782ff6c6708d2a5e94379d0a18ea340afe1663aaf1e7cb5863a8509f86ba`。
  - `py -3.12 -X utf8 nanhang-app/pipelines/task03/enrich_university_details.py --apply-batch --replace --backup ...`：详细表 `2,308`、来源表 `6,918`、视图 `2,308`；`integrity_check=ok`、外键违规 `0`。
  - `py -3.12 -X utf8 nanhang-app/pipelines/task03/validate_admissions_db.py --db ...admissions_merged.sqlite --manifest ...merged-manifest.json`：`66,399/66,399` 通过，0 失败。
  - `py -3.12 -X utf8 -m unittest discover -s nanhang-app/pipelines/task03 -p 'test_*.py'`：`68/68` 通过；新增详细档案专项测试 `3/3`；脚本 `py_compile` 通过。
  - 最终统一库 SHA-256=`d4e8167a8109bf8ee2a34f28268c62e41ab021cf9bf15f180a20bb557e02bb17`；清单已由脚本刷新并与数据库哈希一致。
- 未执行：未部署、未推送、未更新线上发布包、未做浏览器视觉验收；工作区仍保留写入前 SQLite 备份。

## 2026-09-20 / deploy-pages-mobile-ai-1：提交推送上线 Pages，并在线上手机档验收 AI 谈心

- 目的：负责人要求把本轮改动同步到 GitHub，并确保「真实移动端 / Pages 页面」能用 AI 谈心。本轮做三件事：提交推送、触发 Pages 重建、**在线上 Pages 用手机设备仿真走一遍 AI 谈心并记录证据**。
- 提交与上线：提交 `8245b5a`（29 个文件，含前端修复、四个新守卫测试、`web:mobile`/`web:dev:lan` 两个入口与文档同步产物），推送 `f5ee66a..8245b5a` → GitHub Actions 工作流 `Deploy 南溟学生端` 运行 `35486087777` **success**（55 秒）。产物换版：`index-CW0TagIM.js` → `index-B_BdHKrK.js`、`index-2A4i1QBL.css` → `index-DMctSkdn.css`，新 bundle 里已含本轮修复标记（`card-fade`）。
- 线上通路核对（本次实测，非历史结论）：
  - 仓库变量 `NANHANG_API_BASE` = 云端函数、`NANHANG_RELEASE_BASE` = COS 发布包，均只读核对为正确值；新 bundle 内联的 API 地址与 COS 地址与之一致。
  - 云函数从 Pages 来源的预检：`OPTIONS /v1/access/exchange` 带 `Origin: https://yusheng266186-beep.github.io` → `204` + 该来源被放行；`/healthz` = `{"status":"ok","ai":true,"store":"memory"}`，`/readyz` = `upstream:"qianfan"`；COS `data/releases/current.json` → `200`。
  - **手机档线上验收**（390×844 / DPR 3 / 触摸，真 Chrome 设备仿真跑线上 Pages）：生产构建无调试角标、谈心室**不预填**演示码（符合预期）；探索区间自动生成 `616–616`；底部导航进谈心正常；用当前 TOTP 兑换后「已连接」；**输入框下面那行小字已消失**；低语按秒变化（`溟在读你刚写的那句……` → `已等 3 秒` → `已等 4 秒` → `已等 6 秒`）；**真模型返回 77 字正文 + 4 个可点选项**；控制台与网络异常 `0`。
  - 小结卡的几何修复在线上没被单独复验（那轮对话没聊到收口、卡片没自动弹出）；同一份代码与样式已在本机手机档实测过（底部溢出 0、卡片可滚，见 `talk-ui-fixes-1`）。
- 会话存储的既有边界（给真机调试的提醒，不是本轮引入的问题）：云端 `store=memory`——共享 Redis 自 2026-09-14 计费冻结，函数跑单实例内存档。同一码不能重复兑换；**函数冷启动或换实例后旧会话失效，学生会被要求重新输入当前动态码**。真机试用的操作方式：`$env:NANHANG_TOTP_SECRET=(Get-Content private/nanming-totp-secret.txt -Raw).Trim(); node nanhang-app/scripts/totp_code.mjs --watch`，把当前 6 位码填进手机页面（取码时留 20 秒以上，避免跨窗口 401）。若试用中出现频繁要求重新输码，需要按负责人决定是否重新开启共享 Redis（服务开关网页，会产生按量计费）。
- 未做与边界：本轮是**设备仿真**，不是真机实测（负责人将自行在真机上验收）；未改云函数、未改云端环境变量、未开关键资源；未做视觉校检。CI 里 `quality-huixi.test.ts` 因其依赖本机 `private/` 成绩产物而在 runner 上报 ENOENT——工作流该步骤是 `continue-on-error: true`（负责人既定要求：半成品也发布供验收），**不拦上传**，与本次改动无关。
- 下一步：负责人在真机上打开 https://yusheng266186-beep.github.io/nanming/ 验收 AI 谈心；需要长会话稳定性时再决定是否开启共享 Redis。

## 2026-09-20 / talk-ui-fixes-1：谈心页四处 UI 问题（浮层几何、低语、会话提示行、输入框手柄）

- 目的：负责人验收谈心页时提出四处问题——① 方向小结的弹出卡片缩在底部、根本看不见、也不能滑动；② 等待时的低语一直重复同一句，应该是实时的；③ 输入密钥后对话框下面出现一行小字（「已获得本地试用会话。」），要删掉；④ 对话输入框右下角有两条斜杠。
- 定位与根因（全部先实测再改）：
  - ① 不是滚动坏了，是**入场动效把卡片推出了视口**。`.board-card` 原挂着位移动画（桌面 `translateY(26px)`、≤560px `translateY(60px)`），390×844 档实测：动画期间卡片 rect 底边 = 视口底 +60px，`bottomOverflowPx: 60`；动画结束后才归位（0）。那半秒里正文与底部按钮都在屏幕外，看着就是「缩在底部」。同一处还有一个隐患：≥640px 宽屏时 `.board-backdrop{padding:0}` 会让卡片 92dvh 顶到视口外。
  - ② 低语是 `WHISPERS` 三句 + `setInterval` 2.4 秒循环，与真实等待毫无关系。
  - ③ 那句话来自 `withSession()` 写死的 `status`，由 `.feedback` 在已连接分支渲染。
  - ④ `textarea.inp{resize:vertical}`：浏览器把 resize 手柄画在输入框右下角，就是那两条斜杠；而 `.dock-row textarea` 本身已有 46–120px 高度区间，这个手柄只改高度，纯视觉噪音。
- 实际修改：`style.css`（背板 grid→flex 居中/贴底、卡片去掉位移动画改 `card-fade` 淡入、`overscroll-behavior:contain`、`.dock-row textarea.inp{resize:none}`）、`chapters/talk.tsx`（新增纯函数 `whisperLine(seconds, tier)`：按真实经过秒数推进阶段且句子里带秒数，替换三句循环；删掉已连接分支的状态行）、`ai-panel.ts`（`withSession` 成功后清空 `status`，连上一轮失败提示一起清）、`chapters/settings.tsx`（设置卡里低语说明改成「实时进度」）。
- 工具与核查：`npm run validate` = **51 个测试文件、568 项通过、0 失败**（新增 `test/talk-whisper.test.ts` 4 项、`test/overlay-geometry.test.ts` 3 项；改动 `test/settings.test.ts`、`test/overlay-fixed.test.ts` 两条随行为更新的断言）。浏览器实测（本机 Chrome + 设备仿真，dev server 指向云端真模型）：卡片第一帧 rect `0,68 → 390,844`、`bottomOverflowPx: 0`（修复前 +60）；卡片可滚区 473px，**滚轮 `page.mouse.wheel` 与手指拖动都真的能滚**（scrollTop 0→400 / 0→473）；低语按秒采样 13 个不同句子、秒数逐秒递增（`已等 3 秒`→`已等 16 秒`），不再是三句循环；输入框下面那行小字已消失；`.dock-row textarea.inp` 的 `resize` 计算值为 `none`。
- 关于「实时思考内容」的边界（没有擅自越线）：本项目既定规矩是思考内容属草稿、不过安全扫描、绝不下发学生端（`docs/AI_QIANFAN_SETUP.md`「没有搬的，以及原因」），而且前端当前是整包读响应（`ai-client.ts` 的 `runAiTurn` 用 `await response.text()`），本来也没有逐字中间态可用。所以本轮给的是**真实进度**（真秒数、真阶段），不是模型 reasoning。要显示思考原文，需要先放宽这条边界并把响应改成流式读取，属产品决定，留给负责人裁定。
- 未做与边界：只做代码与 DOM 层验证，**没有做视觉校检**（视觉由负责人验收）；未提交、未推送、未部署。
- 下一步：负责人刷新页面在手机档与桌面档各看一眼小结卡；若要真流式（逐字出现 + 逐字思考），单独开一轮改 `runAiTurn` 与服务端帧协议。

## 2026-09-20 / cloud-ai-local-dev-1：本机 dev server 打通云端 AI 谈心（真模型）

- 目的：负责人要求「把 AI 谈心那里的云端打通」。本机 dev server 此前指向本地假上游（`127.0.0.1:8790`），假上游不返回 `options`，「引航」模式下那几个可直接点的答案永远不出现。本轮把它切到云端函数并用真模型实测。
- 实际修改：只改本机 `apps/web/.env.local`（git 忽略、不进仓库）里的 `VITE_NANHANG_API_BASE` → `https://1459223409-lexj8si8uo.ap-chengdu.tencentscf.com`，并把一进一出的两条路子（云端模式要 TOTP、本地模式用演示码但拿不到 options）连取码命令一起写进注释；随后重启 dev server（`VITE_*` 是构建期内联的，不重启不生效）。**没有改任何代码、没有部署、没有动云端函数配置。**
- 工具与核查：`apps/api/test` 无关；本轮用三段实测——① 预检：`OPTIONS /v1/access/exchange` 带 `Origin: http://localhost:5173` 返回 `204` 且 `access-control-allow-origin` 为该来源（云端白名单放行本机 dev 来源）② 协议级：本机 TOTP 种子取当前码 → `POST /v1/access/exchange` `200`（`quota=20`）→ 同码重复兑换 `401 TOTP_REPLAYED` → `POST /v1/career/turn` `200`、约 3.4 秒、`start/delta/complete` 28 帧、`options` 4 个、无 `error` 帧、未被安全校验降级 ③ 浏览器级：真实页面「开始谈心 → 填当前动态码 → 连接 → 发一句话」→ 聊天气泡渲染出真模型正文并给出 4 个可点选项，控制台与网络异常 `0`。`npm run validate` 仍为 49 文件 561 项通过（本轮未改代码，无新增测试）。
- 实测结果与证据（本次运行）：`/healthz` 为 `{"status":"ok","ai":true,"store":"memory"}`、`/readyz` 为 `upstream=qianfan`；兑换耗时约 2.1 秒；一轮谈心 3.4 秒返回 68 字正文 + 4 选项。`store=memory` 是 2026-09-14 计费冻结后的预期档（共享 Redis 已销毁、函数按单实例内存跑），不是故障。
- 一个实测踩到的坑（写进文档避免误判成 bug）：TOTP 每 30 秒一个窗口、一码一用。如果取码时窗口只剩几秒，等填完表再点「连接」就会跨窗口失败（401），页面上还会留着上一轮的失败提示，看着像「云端没通」。取码时留 20 秒以上即可；服务端允许前后各一个窗口的时钟偏差。
- 未做与边界：本轮只证明「本机 dev server → 云端真模型」这条路通；云端函数未重新部署、Pages 未发布、未推送；没有做真机或视觉验收；「AI 建议」卡在第一轮不会出现，因为会话里还没有学生原话（空证据时服务端按设计不给建议，避免假记忆），聊过并保存原话/走收尾轮后才会有。
- 下一步：负责人直接在浏览器里用云端真模型点谈心（谈心室填 `scripts/totp_code.mjs` 的当前码）；要完全离线就按 `.env.local` 注释切回本地 8790。

## 2026-09-20 / frontend-mobile-debug-1：手机端在电脑上调试的入口，并修掉 320px 底部导航越界

- 目的：负责人要调手机端，问「能不能在电脑上打开手机端页面」。本轮给出三条可复用的路子（真机尺寸窗口 / DevTools 设备模式 / 局域网真机），并用设备仿真把六页在两档机型上体检一遍。
- 实际修改（工程侧）：新增 `apps/web/scripts/open-mobile-window.mjs`——用独立配置目录的 Chrome/Edge 起窗口，再用 CDP `Emulation.setDeviceMetricsOverride` + `setTouchEmulationEnabled` 把视口钉到设备尺寸并打开触摸仿真（`--window-size` 包含浏览器外框，凑不出准确的 390×844，所以必须走 CDP）；根 `package.json` 加 `web:mobile`、`web:dev:lan`，`apps/web/package.json` 加 `mobile`、`dev:lan`；机型尺寸支持 `--width=` 与 `NANHANG_MOBILE_*` 两种入口（实测 `npm run` 转发 `--width=` 会被吞掉，故文档改用环境变量）。
- 修复·320px 底部导航越界（`apps/web/src/style.css`、新增 `apps/web/test/bottom-nav-narrow.test.ts`）：`.bottom-nav button` 基准最小宽度 56px × 6 站 = 336px，加容器左右各 6px 共 342px，比 320px 视口宽 22px，最后一站「航线图」压在视口外按不到（设备仿真实测导航条 `scrollWidth=342 / clientWidth=320`）。只改 `@media(max-width:340px)` 一档：按钮最小宽度 48px、容器内边距 4px，六站合计 296px；390px 及以上一个像素没动，`topbar-narrow.test.ts` 对 ≤340px 块唯一性的断言仍成立。
- 工具与核查：设备仿真脚本（`puppeteer-core` 驱动本机 Chrome，390×844/DPR3 与 320×640/DPR2，`isMobile+hasTouch`）按真实门禁走完「起航 → 定位 → 谈心（连接 + 发话）→ 方向（勾工学 → 计算机类）→ 分数轴（匹配）→ 航线图」；`npx vitest run apps/web/test/bottom-nav-narrow.test.ts apps/web/test/topbar-narrow.test.ts apps/web/test/serif-font.test.ts` 为 3 文件 13 项通过。
- 实测结果（本次运行）：两档机型六个页面**均无横向滚动**，底部六站都能点亮跳转，控制台 `0` 异常；390×844 档分数轴匹配出 32 所院校、航线图进入正常。修复前 320px 档单页最多 3 个元素出界（含那枚 56px 的「航线图」按钮），修复后出界的只剩被容器裁掉的装饰性 SVG（`.slot-wrap` 里的插画与 `hero-art` 波浪）。仍未处理：起航页顶栏「北辰」彩蛋按钮实测 17×17px，小于拇指区建议值，属彩蛋入口，本轮只记录不改版式。
- 未做与边界：全程是**设备仿真**，不是真机；真机路径（`web:dev:lan` + 临时 `NANHANG_CORS_ORIGINS`）本轮只核对代码与文档口径，没有拿手机实测。未做视觉校检（视觉由负责人验收），未提交、未推送、未部署，云端开关保持关闭。
- 下一步：负责人用 `npm run web:mobile` 直接点手机版；要真机就把 `web:dev:lan` 的地址开到手机上（只看界面即可，AI 与学校接入需要临时白名单，别写成永久配置）。

## 2026-09-20 / admissions-database-merge-81：南航招生库与外部四川招生库合并

- 目的与实际修改：按负责人指定的外部目录 `C:\Users\yusheng\Desktop\sichuan_gaokao_2026_database_v1.0_compressed`，确认实际数据库为其下 `sichuan_gaokao_2026_package_v1.0_compressed\database\sichuan_gaokao_2026.db.gz`，与南航 `data/admissions/admissions.sqlite` 合并生成 `data/admissions/admissions_merged.sqlite`。新增 `pipelines/task03/merge_admissions_databases.py`，并让 `query_admissions.py` 在统一库存在时默认读取统一库。
- 合并策略：保留南航规范化表和外部原始表，不把同名但语义不同的表粗暴拼接；以“来源文件 + 工作表 + Excel 行号”作为招生记录键，以院校代码和院校名称作为简介键。南航规范化字段是统一查询主口径，外部原始记录、原始单元格、教育部高校名录和院校简介作为补充；冲突写入 `merge_conflict`，不覆盖任一来源值。“新增”与 `1/0` 只作语义归一化。
- 实际结果：南航计划记录 `51,878` 与外部招生记录 `51,878` 全部一一对应；院校 `2,308/2,308` 全部映射；规范化冲突 `0`。统一库保留官方费用引用 `8,887`、院校标签 `3,200`、外部原始单元格 `3,207,195`、教育部名录 `2,952`、院校简介 `2,308`，合并视图 `v_merged_admission`/`v_merged_institution` 分别为 `51,878/2,308` 行。
- 工具与核查：执行 `py -3.12 -X utf8 pipelines/task03/merge_admissions_databases.py --external-db-gz <path> --force`；执行 `py -3.12 -X utf8 pipelines/task03/validate_admissions_db.py --db data/admissions/admissions_merged.sqlite --manifest data/admissions/merged-manifest.json`；执行 `py -3.12 -X utf8 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 和三个新增/相关脚本的 `py_compile`。统一库 `PRAGMA integrity_check=ok`、外键违规 0，南航独立验证 `66,399/66,399`，TASK-03 Python 测试 `65/65`。
- 证据与边界：统一库 SHA-256 为 `c187c1d3881c5d055e93ad21897a679622afea6bbcd97444a6297e9e62d00d3b`；生成清单为 `data/admissions/merged-manifest.json`。原始 `admissions.sqlite` 和外部 `.db.gz` 均保留，未删除、未覆盖；本轮未部署、未推送、未做浏览器视觉验收，源码包仍排除生成的 SQLite 和真实本机数据。

## 2026-09-20 / frontend-dev-debug-run-1：把主前端拉起来实时改，并修掉两处实测阻塞点

- 目的：按负责人要求，把 `apps/web`（章节版主入口）以调试模式在浏览器里拉起来做实时预览与逐页点检；同时用真实浏览器把「起航 → 定位 → 谈心 → 方向 → 分数轴 → 航线图」整条链路点一遍，确认没有点不动的地方。
- 启动方式（本轮实测）：`npm run api:start`（本地 AI 中转，`127.0.0.1:8790`，日志 `upstream=fake-local`、`profile=development`）+ 在 `apps/web` 下运行 `node_modules/.bin/vite --host 127.0.0.1 --port 5173`（HMR 生效）。调试模式由 `DEBUG_MODE = import.meta.env.DEV` 自动开启：页面右上角出现「调试模式 · 示例数据」角标、谈心室预填演示访问码 `local-trial-code`、模型没给结构化建议时注入两条「（调试示例）」建议；**章节门禁仍按 `progress.ts` 真实规则走，调试模式不旁路**（负责人 2026-09-13 的既定要求）。本机 `apps/web/.env.local`（git 忽略）本轮指向本地 API，切云端的写法与代价已写在该文件注释里。
- 修复一·登船口第一次点没反应（`progress.ts`、`App.tsx`、`test/route-split.test.ts`，新增 `test/entry-gate.test.ts`）：登船卡片上点「全国通用模式／荣县一中」是「先记下选过入口、再进定位」的同一个动作，而 `goTo` 判门禁用到的 `progress` 还是本次渲染的旧值（`entryChosen` 仍是 false），于是第一次点只会弹一句「先完成『起航』（…再点『开始起航』选一条登船口）」——入口其实已经选好，提示与事实相反，必须再点一次航程条才进得去。新增纯判据 `entryChosenGate(id, input, maxStage)`，只在这一次点击里把「刚选下入口」显式传进门禁；其余判断仍由 `canOpen` + `lockHint` 决定，调试模式不旁路。
- 修复二·分数轴刻度重复 React key（`chapters/axis.tsx`）：区间退化成一点时（几场考试换算出同一个分数，实测 `616–616`）两个端点得到同一个 key `616-区间下限`，控制台每次渲染都报 duplicate key，且同一位置叠两枚标签谁也读不清；改成显式 marks 列表，退化时只画一枚「区间」刻度。
- 顺手修两处调试期噪音（`apps/web/index.html`、`apps/web/vite.config.ts`）：`index.html` 补内联 SVG 图标，消掉 `/favicon.ico` 的 404；`vite.config.ts` 给 `server.watch.ignored` 加 `**/*.tmpdir/**`——编辑器的原子写在 `src/` 下留过 `.progress.ts.<随机>.tmpdir/progress.ts.tmp`，目录被删除时 watch 抛 `EBUSY` 会让整个 dev server 退出（本轮实测发生一次）。
- 工具与核查：`npm run validate`（合同类型生成 + 四个工作区类型检查 + vitest）`48` 个测试文件、`558` 项通过、`0` 失败（本次新增 `apps/web/test/entry-gate.test.ts` 4 项，基线 47/554）。浏览器点检用系统临时目录里的 `puppeteer-core` 脚本驱动本机 Chrome，走 `http://127.0.0.1:5173/`，共 55 步（脚本与依赖都在 `%TEMP%\nanming-clickprobe`，不属于仓库实现，用完即弃）。
- 实测结果（本次运行，非历史结论）：调试角标在场；选科 → 开始起航 → 登船卡片 → 全国通用模式**一次点击即进入定位**且不再出现矛盾提示；一次考试（总分 612、特控线 518、本科线 430）自动生成探索区间 `616–616`；谈心「开始谈心 → 连接（预填演示码）→ 写话 → 发送」返回假上游回复；方向页渲染「（调试示例）」AI 建议，勾「工学 → 计算机类」后自选线记下 2 项；分数轴勾批次后「用这个区间匹配院校」得到 **32 所院校 · 67 条专业×院校**；航线图进入后「保存为 PNG 图片」可用且真的落盘一张 `南溟航线图-2027-616–616.png`（698 KB）；设置卡四个开关可切换、思考档位三选一在位；逍遥游彩蛋可开可关；已走过的章节可回看；学校入口那条路（荣县一中增强模式）表单在位，提交不存在的凭据时返回「姓名或验证码不匹配，请向老师核对。」且页面不跳走。全程 `0` 条控制台错误、`0` 条非预期失败请求（唯一 401 来自上述刻意的错误凭据）。
- 未做与边界：本轮只做代码逻辑与 DOM/交互层验证（含一次 PNG 落盘），**没有做浏览器视觉校检**，视觉仍由负责人自己验收；未提交、未推送、未部署，云端开关保持关闭；本地 AI 是假上游，只有真模型（千帆／云端）才会给「引航」的可点答案，本地调试下该按钮不出现属预期。
- 下一步：负责人直接在 `http://127.0.0.1:5173/` 上边改边看（Vite HMR）；需要真模型时把 `apps/web/.env.local` 指回云端并用 `scripts/totp_code.mjs` 取当前动态码；本轮改动与文档需在同一次提交里入库（尚未提交）。

## 2026-09-20 / official-tuition-queue-complete-80：剩余队列全部核查后只重建一次

- 目的与实际修改：按负责人要求，先完成剩余学校的官方渠道核查，再统一重建数据库。本轮对 118 所队列院校逐校留痕，研究日志 `pipelines/task03/official_tuition_research_log.json` 共 121 条记录；仅在官方材料给出明确、可精确界定的金额时写入 `pipelines/task03/official_tuition_sources.json`，新增山西工商学院、河北女子职业技术学院、九江理工职业学院、长治幼儿师范高等专科学校 4 个院校目录条目。
- 官方来源与边界：检索范围仅接受学校官网、教育主管/招生考试主管部门和教育部阳光高考审核章程或计划入口；官方检索器本轮完成 118 所队列扫描，未发现可安全精确匹配的新增 2026 CNY/学年金额。长治幼儿师范高等专科学校补入 2024 年学校官方章程中的婴幼儿托育服务与管理、智慧健康养老服务与管理各 4,000 元/学年，并保留历史年份；香港中文大学、香港珠海学院官网金额为港币，因数据库金额口径为 CNY 且当前专业仅为类别标签，未换算或强行匹配；无法核验的学校继续留空，第三方页面未写入来源目录。
- 工程同步修改：更新官方费用目录、逐校研究日志及项目状态；为 `jjlgedu.com`、`hebnzxy.com`、`cskjzyxy.com` 增加已核验的官方域名门禁；同步 `validate_admissions_db.py` 使用构建器同一来源判定逻辑，修复校验器对已允许官方域名的旧白名单误报；更新 TASK-03 费用计数测试至 8,887 条/2,190 所院校。校验器修复和测试断言修改发生在唯一一次数据库重建之后，没有再次重建数据库。
- 工具与核查：先执行 `py -3.12 -X utf8 pipelines/task03/crawl_official_tuition.py --refresh --merge --workers 8 --timeout 20 --max-results 8` 完成官方队列扫描，再执行 `py -3.12 -X utf8 pipelines/task03/build_admissions_db.py` 唯一一次重建；之后执行 `py -3.12 -X utf8 pipelines/task03/validate_admissions_db.py`、`py -3.12 -X utf8 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 和 `py -3.12 -X utf8 -m py_compile pipelines/task03/build_admissions_db.py pipelines/task03/validate_admissions_db.py pipelines/task03/test_admissions_db.py`。
- 实测结果：数据库 2,308 所院校、51,878 条招生计划，SQLite `integrity_check=ok`；官方费用目录 2,190 所院校、8,887 条引用，2,029 条精确匹配到招生专业；机构级仍有 118 个实体行没有可直接入库的明确 CNY/学年金额。独立验证 `66,399/66,399` 通过，TASK-03 Python 测试 `59/59` 通过（核心数据库测试 `54/54`），`py_compile` 通过。数据库 SHA-256 为 `94d286a8942695b2a71e58bc6bc3e8822db5eefb96fe67def2c0bb5def314a52`，官方费用配置 SHA-256 为 `bf6f38c192d6c2850ca2b65a429f8908efa1e451cc37a58a094b5a2b3a582a4f`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界与下一步：本轮只更新本地可重建数据库、官方费用目录、来源门禁、验证器、测试断言和接手文档；未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。剩余 118 个实体行继续保持未知，只有后续官方渠道出现明确金额时再增量写入。

## 2026-09-19 / official-tuition-increment-79：完成辽宁剩余 4 所院校官方收费补录

- 目的与实际修改：继续按 institution 实体未核验队列检索官方学费，向 `pipelines/task03/official_tuition_sources.json` 新增沈阳城市学院、辽宁财贸学院、辽宁轻工职业学院、阜新高等专科学校 4 所数据库已有院校，共 4 条 `CNY + academic_year` 官方费用档；辽宁队列清零。
- 官方来源与边界：沈阳城市学院使用教育部阳光高考信息平台 2026 年招生章程，记录 42 个本科专业 31,000 元/年；辽宁财贸学院使用教育部阳光高考平台 2026 年普通类本科批 B 阶段计划，记录计划明确的专业 26,800 元/年；辽宁轻工职业学院使用教育部阳光高考平台 2026 年高职（专科）第 4 次征集志愿计划，仅记录旅游管理、连锁经营与管理 4,800 元/年；阜新高等专科学校使用学校官网 2026 年招生章程，记录 33 个高职专业 5,000 元/年。计划专业金额不跨专业或批次泛化；住宿费、教材费、考务费、报名费、奖助学金和其他代收费不入库，没有新增专业 `match`。
- 工程同步修改：更新 TASK-03 官方费用计数断言至 8,251 条/2,053 所院校，加入本批三条教育部/省级阳光高考计划或章程 URL、一条阜新官网 URL 的来源门禁测试；为 `fxgz.com.cn` 增加经核验的官方来源域名门禁，并同步独立验证器；未放宽任意第三方来源。
- 工具与核查：执行 `py -3.12 pipelines/task03/build_admissions_db.py`、`py -3.12 pipelines/task03/validate_admissions_db.py`、在 `pipelines/task03` 目录执行 `py -3.12 -m unittest test_admissions_db.py` 与 `py -3.12 -m unittest discover -s . -p 'test_*.py'`，并执行 `py -3.12 -m py_compile pipelines/task03/build_admissions_db.py pipelines/task03/validate_admissions_db.py pipelines/task03/test_admissions_db.py`；随后执行根目录 `py -3.12 tools/sync_project_docs.py --package` 和 `py -3.12 tools/sync_project_docs.py --check`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 2,053 所院校、8,251 条费用证据，`offering_matches=1470`；机构级未核验队列降至 255 行。`validate_admissions_db.py` 为 62,923/62,923，TASK-03 Python 测试为 59/59（核心数据库测试 54/54），SQLite `integrity_check=ok`，`py_compile` 通过。原始配置 SHA-256 为 `8AB06C9A6FA51C82A9FED9B7EC58CB0E42145209456440950B10AFACF9DA4B44`，规范化官方学费配置 SHA-256 为 `76875161bd9f740ed38e80aa34e056c1a8499fc7c49d6fb3311c1e222169eb67`，数据库 SHA-256 为 `ad22bbbf69c61ce16a00f6e7f32c3a90e1a88159a47df73e9a3de87f8bb2b511`。
- 发布边界与下一步：本轮仅更新本地可重建数据库、官方费用目录、来源域名门禁、测试断言和接手文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；剩余 255 个 institution 实体行继续按河北、黑龙江、山东、贵州、重庆等队列检索，无法从官方渠道核到明确金额的学校继续留空。

## 2026-09-19 / official-tuition-increment-78：辽宁 10 所院校官方收费补录

- 目的与实际修改：继续按 institution 实体未核验队列检索官方学费，向 `pipelines/task03/official_tuition_sources.json` 新增营口职业技术学院、辽宁特殊教育师范高等专科学校、辽宁职业学院、辽宁民族师范高等专科学校、辽宁生态工程职业学院、辽宁冶金职业技术学院、辽宁金融职业学院、铁岭师范高等专科学校、铁岭卫生职业学院、锦州师范高等专科学校 10 所数据库已有院校，共 24 条 `CNY + academic_year` 官方费用档。
- 官方来源与边界：营口、辽宁特殊教育、辽宁职业使用教育部阳光高考平台 2026 年审核章程；其余 7 所使用教育部阳光高考平台 2026 年征集志愿计划。只记录材料中明确的逐专业或章程专业清单金额；辽宁特殊教育两项标注“暂定”的专业保留暂定状态，辽宁冶金“待定”金额不录入；教育部计划的专业级金额不跨专业或批次泛化。住宿费、教材费、考务费、报名费、奖助学金和其他代收费不入库，没有新增专业 `match`。
- 工程同步修改：更新 TASK-03 官方费用计数断言至 8,247 条/2,049 所院校，并加入本批三条官方章程 URL 和三份教育部阳光高考计划 URL 的门禁断言；未放宽任意第三方来源。
- 工具与核查：执行 `py -3.12 pipelines/task03/build_admissions_db.py`、`py -3.12 pipelines/task03/validate_admissions_db.py`、在 `pipelines/task03` 目录执行 `py -3.12 -m unittest test_admissions_db.py` 与 `py -3.12 -m unittest discover -s . -p 'test_*.py'`，并执行 `py -3.12 -m py_compile pipelines/task03/build_admissions_db.py pipelines/task03/validate_admissions_db.py pipelines/task03/test_admissions_db.py`；随后执行根目录 `py -3.12 tools/sync_project_docs.py --package` 和 `py -3.12 tools/sync_project_docs.py --check`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 2,049 所院校、8,247 条费用证据，`offering_matches=1470`；机构级未核验队列降至 259 行。`validate_admissions_db.py` 为 62,899/62,899，TASK-03 Python 测试为 59/59（核心数据库测试 54/54），SQLite `integrity_check=ok`，`py_compile` 通过。原始配置 SHA-256 为 `157741D026754CD1ADE9CDA70ED6E149B557FB76D42AB4404B58CFA210D620F5`，规范化官方学费配置 SHA-256 为 `f2966ca0f54a1cb070d21e6353413e14a11410d81265fd215d7d6bd25e9f6cc0`，数据库 SHA-256 为 `3b64ad0ec97ff4f3844cc86f97b757172a5d93e2e7f6221accf95d5d06a1e392`。
- 发布边界与下一步：本轮仅更新本地可重建数据库、官方费用目录、测试断言和接手文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；辽宁仍有 4 个 institution 实体行未核验，下一轮继续处理辽宁、河北、黑龙江、山东、贵州、重庆等队列，无法从官方渠道核到明确金额的学校继续留空。

## 2026-09-19 / official-tuition-increment-77：辽宁 4 所院校官方收费补录

- 目的与实际修改：继续按 institution 实体未核验队列检索官方学费，向 `pipelines/task03/official_tuition_sources.json` 新增辽宁地质工程职业学院、辽阳职业技术学院、辽宁农业职业技术学院、辽宁石化职业技术学院 4 所数据库已有院校，共 10 条 `CNY + academic_year` 官方费用档。来源为学校官网/招生网发布的 2026 年招生章程或单独招生实施方案。
- 官方来源与边界：辽宁地质工程职业学院 25 个高职专业均为 4,500 元/年；辽阳职业技术学院记录 4,600 元、5,000 元两档，并把婴幼儿托育服务与管理、融媒体技术与运营、数字媒体艺术设计、人工智能技术应用 4 个章程标注“暂定”的专业独立记录；辽宁农业职业技术学院记录 4,000 元、4,500 元、5,000 元三档；辽宁石化职业技术学院记录单招方案覆盖的 4,500 元、5,000 元两档。辽阳暂定金额保留最终以辽阳市发展和改革委员会文件为准，辽宁石化保留单招批次范围；住宿费、教材费、考务费、报名费、奖助学金和其他代收费不入库，没有新增专业 `match`。
- 工程同步修改：为 `419.com.cn`、`lnnzy.ln.cn` 增加经核验的官方来源域名门禁，在 TASK-03 测试中加入本批四条来源 URL 断言，并将官方收费计数断言更新至 8,152 条/2,030 所院校；没有放宽任意 `.cn` 来源。
- 工具与核查：执行 `py -3.12 pipelines/task03/build_admissions_db.py`、`py -3.12 pipelines/task03/validate_admissions_db.py`、`py -3.12 -m unittest discover -s pipelines/task03 -p 'test*.py'`、`py -3.12 -m py_compile pipelines/task03/build_admissions_db.py pipelines/task03/validate_admissions_db.py pipelines/task03/test_admissions_db.py`；随后执行根目录 `py -3.12 tools/sync_project_docs.py --package` 和 `py -3.12 tools/sync_project_docs.py --check`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 2,030 所院校、8,152 条费用证据，`offering_matches=1432`；机构级未核验队列降至 278 行。`validate_admissions_db.py` 为 62,398/62,398，TASK-03 Python 测试为 59/59（核心数据库测试 54/54），SQLite `integrity_check=ok`，`py_compile` 通过。原始配置 SHA-256 为 `1E2C194D70EFFC746B3C86C623FD71729FA3012149C0D85223BF404A73092CE`，规范化官方学费配置 SHA-256 为 `877b54966b1e23ea206d477017ea9ba0895aeaf206eb4e9bb6e41cc01300b225`，数据库 SHA-256 为 `5EA5778344B78AD495DE4620571D3E15D92A8991DAF7ED5000E830635288F201`。
- 发布边界与下一步：本轮仅更新本地可重建数据库、官方来源条目、来源域名门禁、测试断言和接手文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；辽宁仍有 23 个 institution 实体行未核验，下一轮继续处理辽宁、河北、黑龙江、山东、贵州、重庆等队列，无法从官方渠道核到明确金额的学校继续留空。

## 2026-09-19 / official-tuition-increment-76：辽宁 4 所院校官方收费补录

- 目的与实际修改：继续按 institution 实体未核验队列检索官方学费，向 `pipelines/task03/official_tuition_sources.json` 新增辽东学院、营口理工学院、沈阳科技学院、沈阳工学院 4 所数据库已有院校，共 15 条 `CNY + academic_year` 官方费用档。来源为省级阳光高考平台和学校官网/招生网发布的 2026 年招生章程。
- 官方来源与边界：辽东学院章程列明本科多档收费、高职 4,800/5,000 元/年及两类定向临床医学项目免费；营口理工学院全部本科专业 4,900 元/年；沈阳科技学院所有专业 29,000 元/年；沈阳工学院普通本科 28,000 元、艺术本科 29,800 元、专科 15,000 元/年。定向免费项目只在原文明确的项目范围内记录为 0，住宿费、教材费、考务费、报名费、奖助学金和其他代收费不入库，没有新增专业 `match`。
- 工程同步修改：更新官方收费目录计数断言至 8,142 条/2,026 所院校，并在 TASK-03 测试中加入本批四条来源 URL 的官方门禁断言；没有放宽来源规则。
- 工具与核查：执行 `py -3.12 pipelines/task03/build_admissions_db.py`、`py -3.12 pipelines/task03/validate_admissions_db.py`、`py -3.12 -m unittest discover -s pipelines/task03 -p 'test*.py'`、`py -3.12 -m py_compile pipelines/task03/build_admissions_db.py pipelines/task03/validate_admissions_db.py pipelines/task03/test_admissions_db.py`；后续执行根目录 `py -3.12 tools/sync_project_docs.py --package` 和 `py -3.12 tools/sync_project_docs.py --check`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 2,026 所院校、8,142 条费用证据，`offering_matches=1432`；机构级未核验队列降至 282 行。`validate_admissions_db.py` 为 62,344/62,344，TASK-03 Python 测试为 59/59（核心数据库测试 54/54），SQLite `integrity_check=ok`，`py_compile` 通过。原始配置 SHA-256 为 `6F19A16DEF11A79CAF798C22C0DBB324090BED82FB9A280C37E3486E5A6EE8B6`，规范化官方学费配置 SHA-256 为 `99254A75D996585484F3911B519BA8B3D26D9411369DE8437D5D802EE2F1332A`，数据库 SHA-256 为 `04AC16AC8072A4962315B93957A027E9F9608B62B69D8307995D06741A4531DA`。
- 发布边界与下一步：本轮仅更新本地可重建数据库、官方来源条目、测试断言和接手文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；辽宁仍有 27 个 institution 实体行未核验，下一轮继续处理辽宁、河北、黑龙江、山东、贵州、重庆等队列，无法从官方渠道核到明确金额的学校继续留空。

## 2026-09-19 / official-tuition-increment-75：辽宁 3 所院校官方收费补录

- 目的与实际修改：继续按 institution 实体未核验队列检索官方学费，向 `pipelines/task03/official_tuition_sources.json` 新增大连装备制造职业技术学院、抚顺师范高等专科学校、沈阳北软信息职业技术学院 3 所数据库已有院校，共 9 条 `CNY + academic_year` 官方费用档。来源均来自学校官网/招生网的 2026 年招生章程、招生计划或专业问答。
- 官方来源与边界：大连装备制造 2026 年章程明确全部高职专业 10,800 元/年；抚顺师专 2026 年单独考试招生计划明确 4,500、5,000、6,000、3,600、3,000、4,100 元六档；北软两篇官网专业问答分别明确大数据技术 12,800 元/年、计算机应用技术 11,800 元/年。北软合并为一个院校目录条目，但在费用行级保留第二篇问答的 `source_url`、`source_title` 和 `source_date`；住宿费、教材费、考务费、报名费、奖助学金和其他代收费不入库，没有新增专业 `match`。
- 工程同步修改：为 `dlemcedu.cn`、`nsi-soft.com` 增加精确官方域名白名单；构建器允许费用行用独立官方来源覆盖院校默认来源，并在 TASK-03 测试中断言北软 11,800/12,800 元两行分别对应两篇官网问答；更新官方收费计数断言至 8,127 条/2,022 所院校。
- 工具与核查：执行 `py -3.12 pipelines/task03/build_admissions_db.py`、`py -3.12 pipelines/task03/validate_admissions_db.py`、`py -3.12 -m unittest discover -s pipelines/task03 -p 'test*.py'`、`py -3.12 -m py_compile pipelines/task03/build_admissions_db.py pipelines/task03/validate_admissions_db.py pipelines/task03/test_admissions_db.py`；后续执行根目录 `py -3.12 tools/sync_project_docs.py --package` 和 `py -3.12 tools/sync_project_docs.py --check`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 2,022 所院校、8,127 条费用证据，`offering_matches=1432`；机构级未核验队列降至 286 行。`validate_admissions_db.py` 为 62,265/62,265，TASK-03 Python 测试为 59/59（核心数据库测试 54/54），SQLite `integrity_check=ok`，`py_compile` 通过。原始配置 SHA-256 为 `81478C4FDE77C7A8CC44B0EBD3CD9E28F0A895FEDF2314A264AD5388074E01F6`，规范化官方学费配置 SHA-256 为 `F4CC363073B801532415945F241C39050C6A9C19B9A81858BCF9E8C935CDC841`，数据库 SHA-256 为 `3946C0DB6D531192C2240557EF3C919D7D9C1A758A4D174E4825C8C031D45ACE`。
- 发布边界与下一步：本轮仅更新本地可重建数据库、官方来源域名白名单、费用行级来源映射、测试断言和接手文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；辽宁仍有 31 个 institution 实体行未核验，下一轮继续处理辽宁、河北、黑龙江、山东、贵州、重庆等队列，无法从官方渠道核到明确金额的学校继续留空。

## 2026-09-19 / official-tuition-increment-74：辽宁大连 5 所院校官方收费补录

- 目的与实际修改：继续按 institution 实体未核验队列检索官方学费，向 `pipelines/task03/official_tuition_sources.json` 新增大连工业大学艺术与信息工程学院、大连枫叶职业技术学院、大连汽车职业技术学院、大连科技学院、大连航运职业技术学院 5 所数据库已有院校，共 20 条 `CNY + academic_year` 官方费用档。来源均为学校官网/招生网 2026 年招生章程或官方实施方案。
- 官方来源与边界：艺信学院记录艺术类 29,500 元、普通类 27,500—28,000 元；大连枫叶按官方学分制把专业学分学费 9,680—16,680 元和拓展学分费 3,120 元/年分列；大连汽车、大连科技、大连航运按官网逐专业收费档分组记录。住宿费、考务费、教材费、报名费、奖助学金和其他代收费不入库，未把学分制分项推导成原文未表述的总额。
- 工程同步修改：为 `caie.edu.cn`、`dlfy.edu.cn`、`dlqcxy.net`、`dlust.edu.cn`、`dlsczsjy.com` 增加精确官方域名白名单，并在独立验证器和 TASK-03 测试中加入来源 URL 门禁与新的目录计数断言；没有新增专业 `match`，避免单招或分类收费跨批次套用。
- 工具与核查：执行 `py -3.12 pipelines/task03/build_admissions_db.py`、`py -3.12 pipelines/task03/validate_admissions_db.py`、`py -3.12 -m unittest discover -s pipelines/task03 -p 'test*.py'`、`py -3.12 -m py_compile pipelines/task03/build_admissions_db.py pipelines/task03/validate_admissions_db.py pipelines/task03/test_admissions_db.py`；随后按项目要求执行根目录 `py -3.12 tools/sync_project_docs.py --package` 和 `py -3.12 tools/sync_project_docs.py --check`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 2,019 所院校、8,118 条费用证据，`offering_matches=1432`；机构级未核验队列降至 289 行。`validate_admissions_db.py` 为 62,217/62,217，TASK-03 Python 测试为 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`，`py_compile` 通过。原始配置 SHA-256 为 `333CD9EAFB9DBB5AD69797070C19B8F8D16C3E54263CDCE6A627A8DC0FFEDBB6`，规范化官方学费配置 SHA-256 为 `fc162acbbae798d25a40ed628c57a9ad3e228add43ee02016f7fac8b15b428cc`，数据库 SHA-256 为 `4F241400F7EE6EFB1581E9D203BBA350C42FF05E871759E34A50B7B5652F0055`。
- 发布边界与下一步：本轮仅更新本地可重建数据库、官方来源域名白名单、测试断言和接手文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；辽宁仍有 34 个 institution 实体行未核验，下一轮继续处理辽宁、河北、黑龙江、山东、贵州、重庆等队列，无法从官方渠道核到明确金额的学校继续留空。

## 2026-09-19 / official-tuition-increment-73：陕西队列 9 所院校官方收费补录

- 目的与实际修改：继续按 institution 实体未核验队列检索官方学费，向 `pipelines/task03/official_tuition_sources.json` 新增渭南职业技术学院、陕西工商职业学院、西安高新科技职业学院、陕西能源职业技术学院、陕西航空职业技术学院、安康职业技术学院、榆林职业技术学院、西安医学高等专科学校、陕西科技大学镐京学院 9 所数据库已有院校，共 14 条 `CNY + academic_year` 官方费用档。西安高新科技职业学院的 10,780 元来自 2024 年官网公示，作为历史官方证据保留原始年份。
- 官方来源与边界：只采纳学校官网/招生网、教育部阳光高考审核章程或省级教育招生官方平台的明确金额。渭南、陕西工商、陕西能源、安康和西安医学高专保留官方材料中的分类收费；榆林、陕西航空和镐京学院保留层次或院校级明确金额。住宿费、五年制/中职阶段收费、教材费、报名费、奖助学金和其他代收费不入库，无法核验的学校不填第三方估算。
- 工程同步修改：为 `wnzy.net`、`ousn.edu.cn`、`xhtu.com.cn`、`sxhkxy.com`、`akvtc.cn`、`yulinvtc.com.cn`、`xagdyz.com`、`sxhju.cn` 及陕西能源对应官方站点补充精确来源门禁；将陕西能源条目的 `official_site_url` 从 HTTP 规范化为 HTTPS 形式；同步构建器、独立验证器和 TASK-03 测试断言。官方来源仍保留省级阳光高考页面，不把域名规范化误作收费来源变更。
- 工具与核查：执行 `py -3.12 pipelines/task03/build_admissions_db.py`、`py -3.12 pipelines/task03/validate_admissions_db.py`、`py -3.12 -m unittest discover -s pipelines/task03 -p 'test*.py'`、`py -3.12 -m py_compile pipelines/task03/build_admissions_db.py pipelines/task03/validate_admissions_db.py pipelines/task03/test_admissions_db.py`；随后按项目要求执行根目录 `py -3.12 tools/sync_project_docs.py --package` 和 `py -3.12 tools/sync_project_docs.py --check`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 2,014 所院校、8,098 条费用证据，`offering_matches=1432`；机构级未核验队列降至 294 行。`validate_admissions_db.py` 为 62,112/62,112，TASK-03 Python 测试为 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`，`py_compile` 通过。原始配置 SHA-256 为 `18497AC691D27E7A429790911E9584E76C351A469346E0C7AA50B4C8EBEC760D`，规范化官方学费配置 SHA-256 为 `8e4d799fd24f0a2da122f47b373141893726d4ae89f555234ee56b0779aefaaf`，数据库 SHA-256 为 `249FC29A0556432BA8A3D8D70A183A1C8A4905ADA1BB96602C87F71358DE8CEB`。
- 发布边界与下一步：本轮仅更新本地可重建数据库、官方来源域名白名单、测试断言和接手文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；陕西仍有 14 个 institution 实体行未核验，下一轮继续处理辽宁、河北、黑龙江、山东、贵州、重庆等队列，无法从官方渠道核到明确金额的学校继续留空。

## 2026-09-19 / official-tuition-increment-72：陕西队列 7 所院校官方收费补录

- 目的与实际修改：继续按 institution 实体未核验队列检索官方学费，本轮转入陕西并新增咸阳职业技术学院、陕西工业职业技术大学、延安职业技术学院、神木职业技术学院、汉中职业技术学院、西安电力高等专科学校、陕西邮电职业技术学院 7 所数据库已有院校，向 `pipelines/task03/official_tuition_sources.json` 写入 11 条 `CNY + academic_year` 官方费用档；咸阳职院来源为学校官网 2025 年章程，作为历史官方证据保留原始年份。
- 官方来源与边界：陕西工业职业技术大学、汉中职业技术学院、西安电力高等专科学校、陕西邮电职业技术学院使用学校官网/招生网；延安职业技术学院使用教育部阳光高考审核章程；神木职业技术学院使用省级教育招生官方平台；咸阳职业技术学院使用学校招生网 2025 年高职章程。只记录材料中明确的 6,500、7,150、10,000 元等金额，住宿费、教材费、报名费、奖助学金和“按主管部门标准执行”的表述不入库；没有把类别档强行设置为专业 `match`。
- 工程同步修改：为汉中职院官方招生网 `hzvtc.cn`、陕西邮电职院招生网 `sptc.sn.cn` 增加精确官方域名白名单，并在独立验证器和 TASK-03 测试中加入来源 URL 门禁；更新官方收费计数断言至 8,084 条/2,005 所院校。
- 工具与核查：执行 `py -3.12 pipelines/task03/build_admissions_db.py`、`py -3.12 pipelines/task03/validate_admissions_db.py`、`py -3.12 -m unittest discover -s pipelines/task03 -p 'test*.py'`、`py -3.12 -m py_compile pipelines/task03/build_admissions_db.py pipelines/task03/validate_admissions_db.py pipelines/task03/test_admissions_db.py`；随后按项目要求执行根目录 `py -3.12 tools/sync_project_docs.py --package` 和 `py -3.12 tools/sync_project_docs.py --check`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 2,005 所院校、8,084 条费用证据，`offering_matches=1432`；机构级未核验队列降至 303 行。`validate_admissions_db.py` 为 62,033/62,033，TASK-03 Python 测试为 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`，`py_compile` 通过。原始配置 SHA-256 为 `0BF20B3805697B651C98702FDD76D7F3CCEAE590D056D2EEC78271F74E2CF13B`，规范化配置 SHA-256 为 `7b00626644547b777a4ecae2772d9ff461ec3460dbdd29e158ccf221a6b8d946`，数据库 SHA-256 为 `DCC21F138402C6C306AE8F0E37D344252DCF13BBF21629F67FFA923E2E8D5D34`。
- 发布边界与下一步：本轮仅更新本地可重建数据库、来源白名单、测试断言和接手文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；陕西仍有 23 个 institution 实体行未核验，下一轮继续处理黑龙江、山东、贵州、重庆等队列，无法从官方渠道核到明确金额的学校继续留空。

## 2026-09-19 / official-tuition-increment-71：22 所江苏、浙江、辽宁、河北院校官方收费补录

- 目的与实际修改：继续处理 institution 实体未核验队列，只接受学校官网/招生网和教育主管部门或省级教育招生官方平台出现的明确收费金额。本轮合并向 `pipelines/task03/official_tuition_sources.json` 新增江苏城市职业学院、江苏卫生健康职业学院、常州信息职业技术大学、江南影视艺术职业学院、硅湖职业技术学院、12 所浙江院校、辽宁理工学院、辽宁轨道交通职业学院、辽宁医药职业学院、唐山海运职业学院和河北机电职业技术学院，共 22 所院校、94 条 `CNY + academic_year` 官方费用引用；同步更新构建器、独立验证器和 TASK-03 测试计数断言。
- 官方来源与边界：来源全部为学校官网/招生网或省级教育招生官方平台。硅湖职业技术学院官方备案表明确为 2024 年秋季新生；杭州职业技术大学、浙江商业职业技术学院、浙江药科职业大学、湖州职业技术学院分别使用 2024、2023、2025、2025 年官方材料，保留原始 `source_date`，不包装为 2026 新标准。辽宁理工学院 2026 官网专业表明确列出 17,500—29,000 元/年五档；辽宁轨道交通职业学院 2026 官网章程明确普通高职 5,000 元/年；辽宁医药职业学院 2026 官网章程明确医学影像技术 4,500 元/年、其他列示普通高职 5,000 元/年；唐山海运职业学院 2026 官网收费公示表明确 15,800—20,000 元/年五档；河北机电职业技术学院 2026 招生网简章明确普通专业 5,000 元、中俄/中马合作 16,000 元、中英合作暂定 20,000 元/年。常州信息职业技术大学本科章程只写按核准标准执行但未给金额，因此只记录明确的专科档。杭州科技职业技术学院只核到成人继续教育收费/报名费，普通高职收费第三方转载未入库。
- 精确边界：本轮 94 条引用均保持官方材料原始类别、专业清单、合作办学或适用年份范围，未新增 `match`，`offering_matches` 保持 1,432；住宿费、教材费、报名费、奖助学金和其他代收费不进入学费证据，也没有把“按批准标准执行”或河北机电中英合作的暂定标准包装成无条件最终金额，没有改写原始 `plan_record.tuition_*` 或 `TUITION_PENDING=797`。
- 官方来源：完整 URL、金额原文、证据说明和 SHA-256 保存在 `pipelines/task03/official_tuition_sources.json`；来源映射见 `docs/TASK03_SOURCE_MAPPING.md`。
- 工具与核查：执行 `py -3.12 pipelines/task03/build_admissions_db.py`、`py -3.12 pipelines/task03/validate_admissions_db.py`、`py -3.12 -m unittest discover -s pipelines/task03 -p 'test*.py'` 和 `py -3.12 -m py_compile pipelines/task03/build_admissions_db.py pipelines/task03/validate_admissions_db.py pipelines/task03/test_admissions_db.py`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,998 所院校、8,073 条费用证据，`offering_matches=1432`；机构级未核验队列 310 行。`validate_admissions_db.py` 为 61,971/61,971，TASK-03 Python 测试为 58/58，SQLite `integrity_check=ok`。本轮原始配置文件 SHA-256 为 `C3F94DB68AC8A085718AFB39B0E3EFC3E8E8D848533BA916977AD8474816CDBA`，规范化配置 SHA-256 为 `c7cff0de1adff0735b4f62d931c0086801f04049e92ecb9bc7b04d93cfda96d7`，数据库 SHA-256 为 `44c32300505673b87e9d6a881308363fe26f1605f151b001f0457ad0cdc6b2bc`。
- 发布边界与下一步：本轮仅更新本地可重建数据、官方来源白名单、测试断言和接手文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。江苏队列已清零，浙江仅剩杭州科技职业技术学院，辽宁新增 3 所后仍有 39 行未核验，河北新增 2 所后仍有 31 行未核验；下一轮继续按陕西、黑龙江、山东等省份队列检索，无法从官方渠道核到明确金额的学校继续留空。

## 2026-09-19 / official-tuition-increment-70：金肯职业技术学院官方收费补录

- 目的与实际修改：继续处理 institution 实体未核验队列，只接受金肯职业技术学院学校官网发布的《2026年招生简章》收费标准原图；向 `pipelines/task03/official_tuition_sources.json` 新增 1 所数据库已有院校、32 条专业级 `CNY + academic_year` 收费档，并更新 `build_admissions_db.py`、`validate_admissions_db.py` 的官方域名白名单及 TASK-03 计数断言。
- 官方金额边界：官网收费页逐专业列明 7 个专业 16,000 元/年、24 个专业 18,000 元/年、动漫设计 20,000 元/年。本轮不写入奖助学金、住宿费、教材费或其他代收费；没有设置 `match`，不把图片中的专业名未经招生层次核对强行绑定到当前招生记录。
- 官方来源：[金肯职业技术学院2026年招生简章](https://www.njjku.com/detail/372340)。官方页面为学校官网 HTTPS 页面，简章收费页是官方原图；`njjku.com` 已按人工核验结果加入构建器、独立验证器和测试的精确学校域名白名单，未使用第三方收费汇总页。
- 工具与核查：执行 `py -3.12 pipelines/task03/build_admissions_db.py` 重建 SQLite；执行 `py -3.12 pipelines/task03/validate_admissions_db.py`、`py -3.12 -m unittest discover -s pipelines/task03 -p 'test*.py'` 和 `py -3.12 -m py_compile pipelines/task03/build_admissions_db.py pipelines/task03/validate_admissions_db.py pipelines/task03/test_admissions_db.py`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,976 所院校、7,979 条费用证据，`offering_matches=1432`；机构级未核验队列 332 行。`validate_admissions_db.py` 为 61,479/61,479，TASK-03 Python 测试为 58/58，SQLite `integrity_check=ok`。本轮原始配置文件 SHA-256 为 `365AC8116EAF17CB58DAE4510395BB1E5CBDFB4020E1816976CF57C6279E77D8`，规范化配置 SHA-256 为 `33C9D803CA2AA866C73CD32543FC76CDBCB4CE1465AFD03AD42A994BE30B1FD0`，数据库 SHA-256 为 `7162C5DAF7DAF0931343B0182C7A5B5E9BD95ECBDBB127A87CBD3564E4DD68C6`。
- 任务状态与下一步：TASK-03 数据补录仍在进行，官方无法明确核验金额的 332 所院校继续保持未知；下一轮继续按江苏、浙江、辽宁、河北、陕西等省份队列检索。文档同步命令尚待本轮末执行；本轮未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 2026-09-19 / official-tuition-increment-69：2 所江苏院校官方收费补录

- 目的与实际修改：继续处理 institution 实体未核验队列，只接受河南省阳光高考信息平台发布的南京交通职业技术学院、江苏经贸职业技术学院 2026 年普通高考招生章程中的明确学费金额；向 `pipelines/task03/official_tuition_sources.json` 新增 2 所数据库已有院校，共 9 条 `CNY + academic_year` 收费档，并重建本地 SQLite。
- 官方金额边界：南京交通职业技术学院章程列文科 4,700、理科 5,300、工科 5,300、艺术 6,800 元/学年；江苏经贸职业技术学院章程列文科 4,700、工科 5,300、体育 4,800、艺术 6,800、医药卫生 6,200 元/学年。分类档只保留院校级证据，未跨专业匹配；住宿费、教材费和其他代收费不入库。
- 官方来源：[南京交通职业技术学院 2026 年普通高考招生章程](https://12804.gaokao.haedu.cn/policy/brochure/2026/0623/153922.html)、[江苏经贸职业技术学院 2026 年全日制普通高考招生章程](https://12047.gaokao.haedu.cn/policy/brochure/2026/0623/153905.html)。两页均为河南省阳光高考信息平台官方发布，未使用第三方收费汇总页。
- 工具与核查：更新 TASK-03 目录计数断言；执行 `build_admissions_db.py` 重建 SQLite，执行独立验证器、TASK-03 Python 测试和 `py_compile`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,975 所院校、7,947 条费用证据，`offering_matches=1432`；机构级未核验队列 333 行。`validate_admissions_db.py` 为 61,318/61,318，`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58，SQLite `integrity_check=ok`。本轮原始配置文件 SHA-256 为 `AC7786FF0F43C2FAD7FBB57418C1B7745FFD83A6F765904D16B4957103A7D594`，规范化配置 SHA-256 为 `C9F3178A8CD3F8A516631E05CF9F14A9CF8201D298824E027F4AC491429C0F68`，数据库 SHA-256 为 `D30EE5286F9DBD4C4AA7C3C51BCB493AC5E153789295F42F4B035EDB35CB7A40`。
- 发布边界：本轮仅更新本地可重建数据、测试断言和接手文档；官方无法明确核验金额的 333 所院校继续保持未知，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。下一轮继续按省份队列逐校核查。

## 2026-09-19 / official-tuition-increment-68：九州职业技术学院官方收费补录

- 目的与实际修改：继续处理 institution 实体未核验队列，只接受九州职业技术学院官网发布的《九州职业技术学院2026年招生章程》中的明确学费金额；向 `pipelines/task03/official_tuition_sources.json` 新增 1 所数据库已有院校，共 3 条 `CNY + academic_year` 收费档，并重建本地 SQLite。
- 官方金额边界：章程第八条列明文科类 14,800 元/生/年、理工和艺术类 15,800 元/生/年、医学类 17,800 元/生/年；当前数据库没有可安全按类别精确匹配的同名专业，三条均只保留院校级证据。住宿费、教材费和其他代收费不入库。
- 官方来源：[九州职业技术学院2026年招生章程](http://www.jzp.edu.cn/zsgzc/2026/0519/c2161a33111/page.htm)。官网当前该页面使用 HTTP，已对 `www.jzp.edu.cn` 设置精确 legacy HTTP 白名单，未使用第三方收费汇总页。
- 工具与核查：更新 `build_admissions_db.py`、`validate_admissions_db.py` 和 TASK-03 测试断言；执行 `build_admissions_db.py` 重建 SQLite，执行独立验证器、TASK-03 Python 测试和 `py_compile`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,973 所院校、7,938 条费用证据，`offering_matches=1432`；机构级未核验队列 335 行。`validate_admissions_db.py` 为 61,271/61,271，`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58，SQLite `integrity_check=ok`。本轮原始配置文件 SHA-256 为 `C29D8F89C3FEAA3FD67EE66A120293AFFE3CEAA254CEE4776B9E08771A4E3260`，规范化配置 SHA-256 为 `F193ADDA7C0D4931F9690AC74F422250B83FE9F0BAA6FFF20DF970425FE702F8`，数据库 SHA-256 为 `21905DFDDBD48BED91CCDDE2F4060E44FE83DCB965B70378941E233AABA77C66`。
- 发布边界：本轮仅更新本地可重建数据、官方来源白名单、测试断言和接手文档；官方无法明确核验金额的 335 所院校继续保持未知，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。下一轮继续按省份队列逐校核查。

## 2026-09-19 / official-tuition-increment-67：5 所江苏院校官方收费补录

- 目的与实际修改：继续处理 institution 实体未核验队列，只接受连云港师范学院、常州机电职业技术学院、徐州工业职业技术学院、徐州生物工程职业技术学院、苏州健雄职业技术学院学校官网发布的 2026 年招生章程或官方收费标准；向 `pipelines/task03/official_tuition_sources.json` 新增 5 所数据库已有院校，共 28 条 `CNY + academic_year` 收费档，并重建本地 SQLite。
- 官方金额边界：连云港师范学院记录本科 6 类、专科 5 类收费；常州机电记录普通专科 3 类和 2 个中外合作办学项目；徐州工业记录普通专科 3 类；徐州生物工程记录文史、理工、农业、医卫 4 类；苏州健雄记录普通专科 4 类和 1 个中外合作办学项目。分类档不向数据库具体招生专业无依据扩展，住宿费、教材费、保险和其他代收费不入库。
- 官方来源：[连云港师范学院 2026 年招生章程](https://ty.lygsf.edu.cn/2026/0625/c109a41002/page.htm)、[常州机电职业技术学院 2026 年招生章程](https://zt.czimt.edu.cn/zsw/2026/0615/c3496a185013/page.htm)、[徐州工业职业技术学院 2026 年招生章程](https://zsb.xzcit.cn/?article_39/826.html)、[徐州生物工程职业技术学院 2026 年招生章程](https://www.ypsp1.xzsw.net.cn/html/878/2026-06-11/content-16001.html)、[苏州健雄职业技术学院 2026 年招生章程 PDF](https://www.csit.edu.cn/_upload/article/files/c5/5c/afb43c9d4eb4a7f51dbba9675927/c6394010-ed7d-467a-96eb-9a2e0b5befd8.pdf)。徐州两校的非 `.edu.cn` 招生域名仅按本轮人工核验结果加入构建器和验证器精确白名单。
- 工具与核查：更新 `build_admissions_db.py` 和 `validate_admissions_db.py` 的官方来源白名单，更新 TASK-03 目录计数断言；执行 `build_admissions_db.py` 重建 SQLite，执行独立验证器、TASK-03 Python 测试和 `py_compile`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,972 所院校、7,935 条费用证据，`offering_matches=1432`；机构级未核验队列 336 行。`validate_admissions_db.py` 为 61,255/61,255，`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58，SQLite `integrity_check=ok`。本轮原始配置文件 SHA-256 为 `48C4CE8E6B20BAD16B9AA72D0EADDA1706B44A52AFF1FB7F1EABB44D3870D2D9`，规范化配置 SHA-256 为 `C093069DA200829D74B9612361A264181273C11E0D11465626C5D165D3916715`，数据库 SHA-256 为 `A6BBE955C8C4C1ABDB82FD11D273C967C7C1F58FA605C751A1F219CDD1124358`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮只更新本地可重建数据、官方来源白名单、测试断言和接手文档；官方无法明确核验金额的 336 所院校继续保持未知，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。下一轮继续按省份队列逐校核查。

## 2026-09-18 / official-tuition-increment-66：长沙职业技术学院官方收费补录

- 目的与实际修改：继续处理 institution 实体未核验队列，只接受河南省阳光高考信息平台发布的长沙职业技术学院 2026 年普通高校招生章程中的明确学费金额；向 `pipelines/task03/official_tuition_sources.json` 新增 1 所数据库已有院校，共 28 条原始 `CNY + academic_year` 收费档。
- 官方金额边界：章程按专业列出普通类学费，并另列视觉传达设计、汽车检测与维修技术、计算机网络技术 3 个听障项目免费。只记录章程收费表中的金额，不把住宿费、教材费、代收费或听障专项免费标准泛化到普通类招生记录。
- 精确边界：机械制造及自动化、计算机网络技术、软件技术 3 个数据库同名普通类招生专业完成精确匹配，各展开 1 条；其余专业档以及听障项目只保留院校级官方证据，没有跨专业套用。
- 官方来源：[长沙职业技术学院 2026 年普通高校招生章程](https://13036.gaokao.haedu.cn/policy/brochure/2026/0623/154721.html)。页面由河南省阳光高考信息平台发布，未使用第三方收费汇总页；`haedu.cn` 已在官方来源白名单中，本批未改来源规则。
- 工具与核查：更新 TASK-03 测试断言中的官方费用总数及官方来源 URL；执行 `build_admissions_db.py` 重建 SQLite，执行 `validate_admissions_db.py`、TASK-03 Python 测试和 `py_compile`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,967 所院校、7,907 条费用证据，`offering_matches=1432`；机构级未核验队列 341 行。`validate_admissions_db.py` 为 61,110/61,110，`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58，SQLite `integrity_check=ok`。本轮原始配置文件 SHA-256 为 `3C8AD2F1885EBBFE26124C12944236C88EE7CAD9FDBE7B286EDD2763CB2573CF`，规范化配置 SHA-256 为 `02401E01C829D090A443722FDDB23FE7489724FAF71DBE2DFB1E78A22098ECA5`，数据库 SHA-256 为 `7058BEACBAAA4CD4389D1F36BDABB5CE1F52835F05F1D54E94CCC449B41A8C01`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮仅更新本地可重建数据、测试断言和接手文档；官方无法明确核验金额的 341 所院校继续留空，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 2026-09-18 / official-tuition-increment-65：2 所湖南院校官方收费补录

- 目的与实际修改：继续处理 institution 实体未核验队列，只接受河南省阳光高考信息平台发布的长沙商贸旅游职业技术学院、衡阳科技职业学院 2026 年招生章程中的明确学费金额；向 `pipelines/task03/official_tuition_sources.json` 新增 2 所数据库已有院校，共 61 条原始 `CNY + academic_year` 收费档。
- 官方金额边界：长沙商贸旅游职业技术学院章程列出 29 个专业收费档；衡阳科技职业学院章程列出 32 个专业收费档。只记录章程收费表中的学费金额，不把住宿费、教材费、校企合作说明或其他代收费当作学费。
- 精确边界：长沙商贸旅游职业技术学院仅“软件技术”匹配当前招生记录并展开 1 条；衡阳科技职业学院仅“无人机应用技术”匹配并展开 2 条。其余专业档只保留院校级官方证据，没有跨专业套用。
- 官方来源：[长沙商贸旅游职业技术学院 2026 年招生章程](https://12603.gaokao.haedu.cn/policy/brochure/2026/0623/154704.html)、[衡阳科技职业学院 2026 年普通高校招生章程](https://14820.gaokao.haedu.cn/policy/brochure/2026/0623/154774.html)。两页均来自河南省阳光高考信息平台，未使用第三方收费汇总页；`haedu.cn` 已在官方来源白名单中，本批未改来源规则。
- 工具与核查：更新 TASK-03 测试断言中的官方费用总数及两条官方来源 URL；执行 `build_admissions_db.py` 重建 SQLite，执行 `validate_admissions_db.py`、TASK-03 Python 测试和 `py_compile`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,966 所院校、7,879 条费用证据，`offering_matches=1429`；机构级未核验队列 342 行。`validate_admissions_db.py` 为 60,966/60,966，`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58，SQLite `integrity_check=ok`。本轮原始配置文件 SHA-256 为 `A5F388ECFF81296E61791B931C0A2BFB4276164A2A3E4251FD2446A4D579CA80`，规范化配置 SHA-256 为 `0A6DD43BAD819C2629E91D1B8B6AD23E3D9E40690B365E8B93C2D25ED678416D`，数据库 SHA-256 为 `59450FAC58A3B16476E067DEAFFEDC73CB094C1743A0D647CDA857B8E9E4BEBF`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮仅更新本地可重建数据、测试断言和接手文档；官方无法明确核验金额的 342 所院校继续留空，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 2026-09-18 / official-tuition-increment-64：4 所湖南院校官方收费补录

- 目的与实际修改：继续处理 institution 实体未核验队列，只接受邵阳工业职业技术学院、衡阳理工职业学院、长沙文创艺术职业学院、湖南幼儿师范高等专科学校官网或官方招生处发布的 2026 年收费通知、收费备案和招生章程中的明确金额。向 `pipelines/task03/official_tuition_sources.json` 新增 4 所数据库已有院校，共 69 条原始 `CNY + academic_year` 收费档。
- 官方金额边界：邵阳工业职业技术学院官网列出 24 个 2026 级专业收费档；衡阳理工职业学院招生章程列出 17 个专业收费档；长沙文创艺术职业学院信息公开页列出 9 个新增专业收费档；湖南幼儿师范高等专科学校官方招生章程附件列出 19 个专业收费档。只记录材料中出现的学费金额，不把住宿费、教材费、校企合作说明或其他代收费当作学费。
- 精确边界：邵阳工业职业技术学院仅“智能机器人技术”匹配当前招生记录并展开 2 条；衡阳理工职业学院人工智能技术应用、无人机应用技术展开 4 条；长沙文创艺术职业学院无同名专业，9 条均保留院校级证据；湖南幼儿师范高等专科学校 7 个同名专业展开 14 条。其余专业档只保留院校级官方证据，没有跨专业套用。
- 官方来源：[邵阳工业职业技术学院 2026 级学生学杂费收费标准](https://www.sygyzy.edu.cn/info/1032/12151.htm)、[衡阳理工职业学院 2026 年普通高校招生章程](https://zs.hylgzyxy.com/?list_27/80.html=)、[长沙文创艺术职业学院 2026 年新增专业学费收费标准](https://www.cswcxyedu.cn/content.jsp?urltype=news.NewsContentUrl&wbnewsid=11181&wbtreeid=1046)、[湖南幼儿师范高等专科学校 2026 年招生章程及附件](https://zsjyc.hnyesf.com.cn/2026_05/25_08/content-28108.html)。未使用第三方收费汇总页；幼师专校收费表以学校招生处官网挂载的官方 PDF 附件发布。
- 工具与核查：为衡阳理工职业学院 `hylgzyxy.com`、长沙文创艺术职业学院 `cswcxyedu.cn`、湖南幼儿师范高等专科学校 `hnyesf.com.cn` 增加精确官方白名单，并同步构建器、独立验证器和测试断言；执行 `build_admissions_db.py` 重建 SQLite，执行 `validate_admissions_db.py`、TASK-03 Python 测试和 `py_compile`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,964 所院校、7,817 条费用证据，`offering_matches=1426`；机构级未核验队列 344 行。`validate_admissions_db.py` 为 60,652/60,652，`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58，SQLite `integrity_check=ok`。本轮原始配置文件 SHA-256 为 `607B20B0206EAFC82CE443F7806396F161183964A7E5E0694D4022BD99E5C0F4`，规范化配置 SHA-256 为 `E5D4743FEE206F6926574E7FBF75A27B7DEA5B805CB0D6A1A712E5EA693D60ED`，数据库 SHA-256 为 `538D3C4AAD839BEDCB064EB1D6F30A34E3A42BA8022029378085B893852880A4`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮仅更新本地可重建数据、官方来源域名白名单、测试断言和接手文档；官方无法明确核验金额的 344 所院校继续留空，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 2026-09-18 / official-tuition-increment-63：3 所湖南院校官方收费补录

- 目的与实际修改：继续处理 institution 实体未核验队列，只接受教育部阳光高考平台 2026 年高职（专科）征集志愿计划、湖南理工职业技术学院学校官网 2026 年高职单独招生章程和湖南民族职业学院学校官方招生网 2026 年招生简章中的明确收费金额。向 `pipelines/task03/official_tuition_sources.json` 新增潇湘职业学院、湖南理工职业技术学院、湖南民族职业学院 3 所数据库已有院校，共 35 条原始 `CNY + academic_year` 收费档。
- 官方金额边界：潇湘职业学院官方计划列出 13 个具体专业档，金额为 10,900—16,700 元/年；湖南理工职业技术学院章程列出 4,600、3,500、7,500 元/年三类专业收费；湖南民族职业学院官方招生简章图片列出当前库专业的 3,500、4,600、4,800、5,460、7,500、7,800 元/年收费档。
- 精确边界：潇湘职业学院 4 个同名专业展开为 4 条匹配，湖南理工职业技术学院新能源汽车技术、工业机器人技术展开为 4 条匹配，湖南民族职业学院 7 个同名专业展开为 14 条匹配；其余 13 个材料专业档只保留院校级证据。没有改写原始 `plan_record.tuition_*`、`TUITION_PENDING=797`、住宿费、教材费、报考费、保险及其他代收费。
- 官方来源：[教育部阳光高考 2026 年高职（专科）理工类征集志愿计划统计表](https://gaokao.chsi.com.cn/news/file.do?attach=true&hist=false&id=2293106879&method=downFile)、[湖南理工职业技术学院 2026 年高职单独招生章程](https://www.xlgy.com/uploadfiles/202601/2026012616323087048.pdf)、[湖南民族职业学院 2026 年招生简章（学校官方招生网）](https://txx.hnvc.net.cn/column/tzgg/content/1785308542280.shtml)。未使用第三方收费汇总页；湖南民族职业学院的收费表以学校官方招生网挂载的招生简章图片发布。
- 工具与核查：为湖南民族职业学院官方招生子域 `hnvc.net.cn` 和湖南理工职业技术学院官网 `xlgy.com` 增加精确官方白名单，并同步构建器、独立验证器和测试断言；执行 `build_admissions_db.py` 重建 SQLite，执行 `validate_admissions_db.py`、TASK-03 Python 测试和 `py_compile`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,960 所院校、7,738 条费用证据，`offering_matches=1406`；机构级未核验队列 348 行。`validate_admissions_db.py` 为 60,243/60,243，`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58，SQLite `integrity_check=ok`。本轮原始配置 SHA-256 为 `C3FEE304370B848444E73F5C626212CF5298F811AB1F517EA85461A81439FE6`，规范化配置 SHA-256 为 `0C51D812549EE3C04C21A1466A6FF1FDA9CCCB411337177A5FAB9A53B47CCAAF`，数据库 SHA-256 为 `35C3F2203387E69996E68F732F364B83755E9BFA6D78EE8A5586646912714087`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮仅更新本地可重建数据、官方来源域名白名单、测试断言和接手文档；官方无法明确核验金额的 348 所院校继续留空，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 2026-09-18 / official-tuition-increment-62：4 所院校官方收费补录

- 目的与实际修改：继续处理 institution 实体未核验队列，只接受教育部阳光高考平台 2026 年高职（专科）征集志愿计划和学校官网 2026 年教育收费公示中的明确金额。向 `pipelines/task03/official_tuition_sources.json` 新增郴州职业技术学院、湘中幼儿师范高等专科学校、陕西青年职业学院、陕西财经职业技术学院 4 所数据库已有院校，共 7 条原始 `CNY + academic_year` 收费档。
- 官方金额边界：郴州职业技术学院旅游管理 4,600 元/年；湘中幼儿师范高等专科学校婴幼儿托育服务与管理、党务工作 3,500 元/年，研学旅行管理与服务 4,600 元/年；陕西青年职业学院和陕西财经职业技术学院官网收费公示均列高职一般专业 6,500 元/人·学年、艺术专业 10,000 元/人·学年。
- 精确边界：湘中幼儿师范高等专科学校 3 条具体专业费用展开匹配到当前招生记录；郴州具体计划专业没有数据库同名记录，陕西两校是一般/艺术分类公示，没有逐专业映射，因此均保留院校级证据。住宿费、教材费、报名考试费、保险及其他代收费不写入；原始 `plan_record.tuition_*` 和 `TUITION_PENDING=797` 不改写。
- 官方来源：[教育部阳光高考 2026 年高职（专科）征集志愿计划统计表](https://gaokao.chsi.com.cn/news/file.do?attach=true&hist=false&id=2293305029&method=downFile)、[陕西青年职业学院 2026 年教育收费公示](https://www.sxqzy.com/info/1016/56937.htm)、[陕西财经职业技术学院 2026-2027 学年教育收费公示](https://cwc.scy.cn/info/1005/1371.htm)。未使用第三方收费汇总页；陕西两项公示的金额表为学校官网页面图片附件。
- 工具与核查：为陕西青年职业学院官网域名 `sxqzy.com` 和陕西财经职业技术学院财务处域名 `scy.cn` 增加精确官方白名单，并同步构建器、独立验证器和测试断言；执行 `build_admissions_db.py` 重建 SQLite，执行 `validate_admissions_db.py`、TASK-03 Python 测试和 `py_compile`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,957 所院校、7,694 条费用证据，`offering_matches=1384`；机构级未核验队列 351 行。`validate_admissions_db.py` 为 60,007/60,007，`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58，SQLite `integrity_check=ok`。本轮原始配置 SHA-256 为 `272707018175231B67EE0F60C3B8DBACA2FA9E5D3ACEC71C5ABDCB47BD1BC0E2`，规范化配置 SHA-256 为 `F7ABE4BDEF54009A7BCB264780F30A295A77F489E5B0798AD28A67D04A38D248`，数据库 SHA-256 为 `55C9BC8E5B4FEC785AC8F1CEF34AA297A0F1B8829154880A429906B119FFD9FF`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮仅更新本地可重建数据、官方来源域名白名单、测试断言和接手文档；官方无法明确核验金额的 351 所院校继续留空，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 2026-09-18 / official-tuition-increment-61：6 所湖南院校官方收费补录

- 目的与实际修改：继续处理 institution 实体未核验队列，只接受教育部阳光高考平台 2026 年高职（专科）征集志愿计划和教育部阳光高考院校信息库 2026 年专业学费页中的明确收费金额。向 `pipelines/task03/official_tuition_sources.json` 新增湖南工商职业学院、湖南吉利汽车职业技术学院、湖南三一工业职业技术学院、湖南食品药品职业学院、湖南应用技术学院、湘西民族职业技术学院 6 所数据库已有院校，共 14 条原始 `CNY + academic_year` 收费档。
- 官方金额边界：征集计划列出湖南工商职业学院 15,980/16,980 元、湖南吉利汽车职业技术学院 10,900/11,900/14,900 元、湖南三一工业职业技术学院 16,800 元、湖南食品药品职业学院中药学 5,460 元、湖南应用技术学院专科专业 14,200/14,800 元；教育部阳光高考院校信息页列出湘西民族职业技术学院 3,000/3,500/4,600/5,500/7,800 元专业档。
- 精确边界：湖南食品药品职业学院中药学 2 条当前招生记录、湘西民族职业技术学院页面列出的同名专业 28 条完成匹配；其他征集计划专业因当前数据库缺少同名或层次一致记录而保留院校级证据。没有改写原始 `plan_record.tuition_*`、`TUITION_PENDING=797`、住宿费、教材费、保险或其他代收费。
- 官方来源：[教育部阳光高考 2026 年高职（专科）征集志愿计划统计表](https://gaokao.chsi.com.cn/news/file.do?attach=true&hist=false&id=2293305029&method=downFile)、[教育部阳光高考院校信息库湘西民族职业技术学院专业学费页](https://gaokao.chsi.com.cn/sch/schoolInfo--schId-2044%2CcategoryId-6242682%2Cmindex-2.dhtml)。未使用第三方收费汇总页。
- 工具与核查：执行 `build_admissions_db.py` 重建 SQLite，执行 `validate_admissions_db.py`、TASK-03 Python 测试和 `py_compile`；没有部署、推送或浏览器视觉验收，云端开关保持关闭。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,953 所院校、7,686 条费用证据，`offering_matches=1381`；机构级未核验队列 355 行。`validate_admissions_db.py` 为 59,961/59,961，`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58，SQLite `integrity_check=ok`。本轮原始配置 SHA-256 为 `4AA9FD4D4C5B8B06861D51405BAD8B06FC5D2FFD97E2293C8A9771BAAEE19CBF`，规范化配置 SHA-256 为 `DF800387DD1965C8EC9B697FDA5D2B014B2DD0B997617C52B48C98A097727F14`，数据库 SHA-256 为 `53F61A1AB15641866E0FDC19AF9A96BA3F32B0F910A50A9C0A907E262669F63F`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮仅更新本地可重建数据、测试断言和文档；官方无法明确核验金额的 355 所院校继续留空。

## 2026-09-18 / official-tuition-increment-60：2 所湖南院校官方征集计划收费补录

- 目的与实际修改：继续处理 institution 实体未核验队列，只接受教育部阳光高考平台 2026 年高职（专科）征集志愿计划中的明确收费金额。向 `pipelines/task03/official_tuition_sources.json` 新增湖南九嶷职业技术学院、湖南劳动人事职业学院 2 所数据库已有院校，共 2 条 `CNY + academic_year` 官方收费档。
- 官方金额边界：计划表列明湖南九嶷职业技术学院模具设计与制造专业、湖南劳动人事职业学院供热通风与空调工程技术专业的学费均为 4,600 元/年。
- 精确边界：当前数据库没有这两个具体专业的同名招生记录，因此两条均仅保留院校级证据、没有填写 `match`；不把单个征集计划金额跨专业泛化。没有改写原始 `plan_record.tuition_*`、`TUITION_PENDING=797`、住宿费、教材费、保险或其他代收费。
- 官方来源：[教育部阳光高考 2026 年高职（专科）征集志愿计划统计表（理工类）](https://gaokao.chsi.com.cn/news/file.do?attach=true&hist=false&id=2293106879&method=downFile)。未使用第三方收费汇总页。
- 工具与核查：执行 `build_admissions_db.py` 重建 SQLite，执行 `validate_admissions_db.py`、TASK-03 Python 测试和 `py_compile`；没有部署、推送或浏览器视觉验收，云端开关保持关闭。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,947 所院校、7,648 条费用证据，`offering_matches=1351`；机构级未核验队列 361 行。`validate_admissions_db.py` 为 59,759/59,759，`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58，SQLite `integrity_check=ok`。本轮原始配置 SHA-256 为 `B4999DB976506CE25518515BFF1833F7C1CB9C04DFEDAB5AA9A76A3D3B8BA70A`，规范化配置 SHA-256 为 `61C0550927FC01F612B84007BA281ADF8D13A5041769E0014175DEB5F219E018`，数据库 SHA-256 为 `1597811879236CF5A99CDDA09A9ED5EB8700D0F0DE2261FCA0DFACB783DE3E4E`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮仅更新本地可重建数据、测试断言和文档；官方无法明确核验金额的 361 所院校继续留空。

## 2026-09-18 / official-tuition-increment-59：3 所院校官方收费档补录

- 目的与实际修改：继续处理 institution 实体未核验队列，只接受教育部阳光高考计划或学校官网 2026 年招生章程中的明确收费金额。向 `pipelines/task03/official_tuition_sources.json` 新增安徽中医药高等专科学校、山西华澳商贸职业学院、江西青年职业学院 3 所数据库已有院校，共 3 条 `CNY + academic_year` 官方收费档；为山西华澳官网加入精确官方域名白名单，并同步验证器和测试断言。
- 官方金额边界：安徽中医药高等专科学校计划表明确针灸推拿专业 3,900 元/年；山西华澳商贸职业学院 2026 年章程明确三年制高职各专业 12,000 元/年；江西青年职业学院 2026 年章程明确高职（专科）5,000 元/年。
- 精确边界：安徽针灸推拿只按教育部计划表中的具体专业匹配当前 2 条数据库招生记录；山西华澳、江西青年仅保留院校级证据，不把层次/全校标准跨专业泛化。没有改写原始 `plan_record.tuition_*`、`TUITION_PENDING=797`、住宿费、教材费、保险或其他代收费。
- 官方来源：[教育部阳光高考 2026 年高职计划](https://gaokao.chsi.com.cn/news/file.do?attach=true&hist=false&id=2293305030&method=downFile)、[山西华澳商贸职业学院 2026 年招生章程](https://www.huaao.sx.cn/?id=3652&lanmu=9&p=yuanxicont)、[江西青年职业学院 2026 年招生章程](https://zs.jxqy.edu.cn/info/1054/3009.htm)。未使用第三方收费汇总页。
- 工具与核查：执行 `build_admissions_db.py` 重建 SQLite，执行 `validate_admissions_db.py`、TASK-03 Python 测试和 `py_compile`；没有部署、推送或浏览器视觉验收，云端开关保持关闭。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,945 所院校、7,646 条费用证据，`offering_matches=1351`；机构级未核验队列 363 行。`validate_admissions_db.py` 为 59,747/59,747，`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58，SQLite `integrity_check=ok`。本轮原始配置 SHA-256 为 `A3A9742FBA9F2D8885F3118BD23F124990386F81A40962F83510F2345069FC35`，规范化配置 SHA-256 为 `183D23095C9C133181BF66EA20718B8B0DC27552B0C5526ABADEE80378F8671C`，数据库 SHA-256 为 `5E03347250BE606759BCBEDD35CCB8A9B9D898A47E0F35CE3F88392C699C7159`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮仅更新本地可重建数据、官方来源域名白名单、测试断言和文档；官方无法明确核验金额的 363 所院校继续留空。

## 2026-09-18 / official-tuition-increment-58：3 所甘肃院校官方招生材料收费补录

- 目的与实际修改：继续处理 institution 实体未核验队列，只接受学校招生就业处官网或教育部阳光高考平台 2026 年材料中的明确收费金额。向 `pipelines/task03/official_tuition_sources.json` 新增甘肃畜牧工程职业技术学院、甘肃有色冶金职业技术学院、兰州职业技术学院 3 所数据库已有院校，共 3 条 `CNY + academic_year` 官方收费档。
- 官方金额边界：甘肃畜牧工程职业技术学院 2026 年招生章程明确普通专科（高职）学费 4,500 元/人/年；教育部阳光高考 2026 年高职征集志愿计划分别列出甘肃有色冶金职业技术学院计算机应用技术、兰州职业技术学院计算机应用技术 4,500 元/年。阳光高考计划只证明对应专业行，不扩展到其他专业。
- 精确边界：本批 3 条收费档均没有填写 `match`，不把单个征集计划金额跨专业泛化；住宿费、教材费、保险、其他代收费与原始 `plan_record.tuition_*`、`TUITION_PENDING=797` 均不改写。
- 官方来源：[甘肃畜牧工程职业技术学院 2026 年招生章程](https://zsjyc.xmgcedu.cn/bkznan/zszc/content_38899)、[教育部阳光高考 2026 年高职征集志愿计划统计表](https://gaokao.chsi.com.cn/news/file.do?attach=true&hist=false&id=2293305029&method=downFile)。
- 工具与核查：为甘肃畜牧工程职业技术学院的学校官方招生域名增加精确验证白名单；未将第三方收费汇总页写入数据库。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,942 所院校、7,642 条费用证据，`offering_matches=1349`；机构级未核验队列 366 行。`validate_admissions_db.py` 为 59,723/59,723，`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58，SQLite `integrity_check=ok`。本轮原始配置 SHA-256 为 `1183CF466359912F65A77C3F07700661CCEB209F8DC604A61DBAA71DFFF8930F`，规范化配置 SHA-256 为 `ab1da080616e0ee6f8ea72a9ae2d838fa775794cd5131f733a3dc7b949c9fcff`，数据库 SHA-256 为 `7F7B198DDEC9A0455239ABD58C20973558D5982384126E18346D8D1A9D36EF3A`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮仅更新本地可重建数据、官方来源域名白名单、测试断言和文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；官方无法明确核验金额的 366 所院校继续留空。

## 2026-09-18 / official-tuition-increment-57：7 所院校官方招生材料收费补录

- 目的与实际修改：继续处理 institution 实体未核验队列，只接受学校官网或官方省级阳光高考审核章程中明确的 2026 年收费金额。向 `pipelines/task03/official_tuition_sources.json` 新增海口经济学院、宁波职业技术大学、兰州现代职业学院、甘肃农业职业技术学院、临夏现代职业学院、白银矿冶职业技术学院、庆阳职业技术学院 7 所数据库已有院校，共 41 条 `CNY + academic_year` 官方收费档。
- 官方金额边界：海口经济学院保留章程列出的 33 个 17,990—69,900 元分类/专业档；宁波职业技术大学保留普通类 6,000—7,500、艺术类 9,000、中外合作办学 18,000—20,000 元/学年；兰州现代职业学院、甘肃农业职业技术学院、白银矿冶职业技术学院、庆阳职业技术学院均记录官方明确的 4,500 元标准；临夏现代职业学院只记录运动训练专业 4,500 元/生·学年。
- 精确边界：本批 41 条收费档均没有填写 `match`，不把类别、培养方式或单个专业金额跨专业泛化；临夏的运动训练金额不扩展到其他专业。没有改写原始 `plan_record.tuition_*`、住宿费、教材费、保险、其他代收费或 `TUITION_PENDING=797`。
- 官方来源：[海口经济学院 2026 年招生章程](https://12308.gaokao.haedu.cn/policy/brochure/2026/0623/155011.html)、[宁波职业技术大学 2026 年招生章程](https://yzhaosheng.nbpu.edu.cn/a/2026521/1036.shtml)、[兰州现代职业学院 2026 年招生章程](https://zsjyc.lzmvc.edu.cn/2026/0603/c1232a20258/page.htm)、[甘肃农业职业技术学院 2026 年招生章程](https://13954.gaokao.haedu.cn/policy/brochure/2026/0623/155403.html)、[临夏现代职业学院官方公告](https://www.lxxdzy.com/lxtyx/xbxw/content_29253)、[白银矿冶职业技术学院 2026 年招生章程](https://www.bymu.cn/zjc/2026/0701/c495a18776/page.htm)、[庆阳职业技术学院 2026 年新生入学指南](https://www.qyvtc.cn/info/1097/70132.htm)。
- 工具与核查：保留官方域名精确白名单策略，未将搜索结果或第三方收费汇总页写入数据库；新增 7 所院校均通过数据库实体匹配，临夏仅保留院校级证据避免不存在的专业精确挂接。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,939 所院校、7,639 条费用证据，`offering_matches=1349`；机构级未核验队列 369 行。`validate_admissions_db.py` 为 59,705/59,705，`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58，SQLite `integrity_check=ok`。本轮原始配置 SHA-256 为 `85AB54F6832DE381D510808D378BA99D8C6A0933EE90CF800A431BEA4D187519`，规范化配置 SHA-256 为 `ccdea98ac431551578fbff60b024fa91deb78c3f9064f36e2e81cbe6a5ab4b4c`，数据库 SHA-256 为 `45A84EE5444C658EB7DDFE5F5616D0D4526315AC5A9041CBEAAD0791D0823B54`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮仅更新本地可重建数据、官方来源域名白名单、测试断言和文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；官方无法明确核验金额的 369 所院校继续留空。

## 2026-09-18 / official-tuition-increment-56：5 所江苏院校官方招生材料收费补录

- 目的与实际修改：继续处理 institution 实体未核验队列，只接受学校官网或官方省级教育招生平台 2026 年招生章程/招生办页面中的明确金额。向 `pipelines/task03/official_tuition_sources.json` 新增南京师范大学中北学院、南通大学杏林学院、南京师范大学泰州学院、苏州大学应用技术学院、明达职业技术学院 5 所数据库已有院校，共 27 条 `CNY + academic_year` 分类/特殊专业收费档。
- 官方金额边界：南京师范大学中北学院记录人文社科/体育 18,000、理工 20,000、艺术 22,000、环境设计 24,000 元；南通大学杏林学院记录人文社科 18,000、行政管理 19,800、理工 20,000、土木工程/集成电路设计与集成系统 22,000、医学/艺术 22,000、医学检验技术 24,200 元；南京师范大学泰州学院记录文科 18,000、理工 20,000、艺术 22,000，以及章程单列的小学教育（师范）19,800、数学与应用数学（师范）22,000、生物技术 22,000、电气工程及其自动化 22,000、国际经济与贸易 19,800 元；苏州大学应用技术学院记录文科 18,000、理工 20,000、电气工程及其自动化 22,000、艺术 22,000、服装与服饰设计 24,200、中外合作办学 27,600 元/生·学年。
- 精确边界：本批金额均按官方章程的类别或明确专业原文保存，没有填写 `match`，没有把类别收费推断为当前数据库全部专业，普通专业与中外合作办学单独保留；住宿费、超学分费用及其他代收费不进入学费证据，也没有改写原始 `plan_record.tuition_*` 或 `TUITION_PENDING=797`。
- 明达职业技术学院的学校招生办页面直接列明文科 16,000、理科 18,000、艺术 20,000 元/年；该非 `.edu.cn` 域名只按已核验学校官方域名加入精确白名单，不放宽通用教育域名规则。
- 官方来源：[南京师范大学中北学院 2026 年普通本科招生章程](https://zs.nnudy.edu.cn/c107/20260518/i47163.html)、[南通大学杏林学院 2026 年招生章程](https://xlxy.ntu.edu.cn/2026/0521/c3084a291454/page.htm)、[南京师范大学泰州学院 2026 年招生章程（河南省阳光高考信息平台审核页）](https://13843.gaokao.haedu.cn/policy/brochure/2026/0623/153962.html)、[苏州大学应用技术学院 2026 年招生章程](https://tec.suda.edu.cn/zs/info/1105/4997.htm)。本轮未使用第三方收费汇总页。
- 官方来源补充：[明达职业技术学院 2026 年学生问答](https://zsks.mdut.cn/kswd/webinfo/2026/05/1780850588280802.htm)。
- 工具与核查：为重新扫描此前缓存的 381 所未核验院校，给 `pipelines/task03/crawl_official_tuition.py` 增加 `--refresh` 参数；按官方域名白名单扫描 380 个可定位队列，0 条自动入库，未把搜索结果直接当成证据。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,932 所院校、7,598 条费用证据，`offering_matches=1349`；机构级未核验队列 376 行。`validate_admissions_db.py` 为 59,493/59,493，`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58，SQLite `integrity_check=ok`。本轮原始配置 SHA-256 为 `A270F23E991E87C0E8A2755F17B18DB1F3BEE0A09B6610091370DDDEB22800A5`，规范化配置 SHA-256 为 `BB118BE416CF3B278DE195F1D1B83F865CDA8A2EDFD1BE5C28B18E729EA068E0`，数据库 SHA-256 为 `2D095AF4D78DEF2F67519AE7BBF95237C598F6DD3E09F0E1D160EFECF562E533`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮仅更新本地可重建数据、爬虫缓存/结果与文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；官方无法明确核验金额的 376 所院校继续留空。

## 2026-09-18 / official-tuition-increment-55：20 所院校官方征集计划收费档补录

- 目的与实际修改：继续处理机构级未核验队列，只接受教育部阳光高考平台审核发布的 2026 年高职（专科）征集志愿计划。向 `pipelines/task03/official_tuition_sources.json` 新增 20 所数据库已有院校，共 22 条 `CNY + academic_year` 院校级收费档：阿勒泰、安徽矿业、安徽新闻出版、河北对外经贸、合肥通用、合肥幼师、菏泽家政、石河子工程、博尔塔拉、朔州师专、山西同文、塔城、宿迁泽达、正德、莱芜、山东服装、昆山登云、太湖创意、泰州、江苏财经。
- 官方金额边界：阿勒泰为 3,200/4,500 元，安徽矿业为 6,800 元，安徽新闻出版为 3,900 元，河北对外经贸为 5,000 元，合肥通用为 6,500 元，合肥幼师为 3,200 元，菏泽家政为 6,000 元，石河子工程与博尔塔拉为 3,300 元，朔州师专为 4,000 元，山西同文为 7,500 元，塔城为 2,900 元，宿迁泽达为 15,800 元，正德与昆山登云为 16,000 元，莱芜为 4,800 元，山东服装为 4,800/7,000 元，太湖创意为 18,000 元，泰州为 5,300 元，江苏财经为 4,700 元；每个档均保留官方计划表中的具体专业范围。
- 精确边界：本轮所有费用档均不填写 `match`，不把某省份征集计划的专业金额扩展到当前数据库其他省份招生记录；校企培养、艺术专业、师范专业和具体专业范围只作为证据说明保存。住宿费、教材费、保险及其他代收费不入库，也没有改写原始 `plan_record.tuition_*` 或 `TUITION_PENDING=797`。
- 权威来源：[阳光高考 2293106879](https://gaokao.chsi.com.cn/news/file.do?attach=true&hist=false&id=2293106879&method=downFile)、[阳光高考 2293305029](https://gaokao.chsi.com.cn/news/file.do?attach=true&hist=false&id=2293305029&method=downFile)、[阳光高考 2293305030](https://gaokao.chsi.com.cn/news/file.do?attach=true&hist=false&id=2293305030&method=downFile)。未使用第三方学费汇总页。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,927 所院校、7,571 条费用证据，`offering_matches=1349`；机构级未核验队列 381 行。`validate_admissions_db.py` 为 59,353/59,353，`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58，SQLite `integrity_check=ok`。本轮原始配置 SHA-256 为 `B24321EF6601DC4728B5F9191C2241435CDA33BB1FF5E9BA0EF889C7F2282099`，规范化配置 SHA-256 为 `850c233a8259907e0f948c061b18981b181935ae359294ac8e9cea8ca426ae9e`，数据库 SHA-256 为 `542117bd14b5e54380903b35bcf0f60db760304f375e93b3c7cffd07f5ff40a9`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮仅更新本地可重建数据和文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；官方无法明确核验金额的 381 所院校继续留空。

## 2026-09-18 / official-tuition-increment-54：三所院校官方收费档补录

- 目的与实际修改：继续处理 institution 实体未核验队列，只接受学校官网、官方省级教育/招生考试平台或教育部阳光高考审核章程中的明确金额。本轮向 `pipelines/task03/official_tuition_sources.json` 新增新疆师范高等专科学校、新疆工业学院、广东信息工程职业学院 3 所数据库已有院校，共 15 条 `CNY + academic_year` 院校级收费档。
- 精确边界：新疆师范高等专科学校按章程第 22 条保留文科、财经、体育、理工、外语、医学、艺术 7 个类别档；新疆工业学院保留文科 4,000、理工 4,500 元档；广东信息工程职业学院保留普通专业和校企联合培养班六个官方收费档。当前数据库没有足以证明类别/培养方向的逐专业官方映射，15 条均不展开为 `OFFERING_MATCH`，不把联合培养班金额套用到普通班；住宿费、教材费、保险及其他代收费不入库。
- 权威来源：[新疆师范高等专科学校 2026 年招生章程](https://www.xjei.edu.cn/info/1026/53062.htm)、[新疆工业学院 2026 年本科招生章程](https://zs.xjut.edu.cn/info/1221/1701.htm)及其[学校官网](https://www.xjut.edu.cn/)、[河南省阳光高考平台广东信息工程职业学院 2026 年招生章程](https://14427.gaokao.haedu.cn/policy/brochure/2026/0623/154900.html)。伊犁职业技术学院本轮仅定位到官方政府目录，官方正文抓取未完成，因此没有使用第三方页面补值。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,904 所院校、7,545 条费用证据，`offering_matches=1349`；机构级未核验队列 404 行。`validate_admissions_db.py` 为 59,200/59,200，`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58，SQLite `integrity_check=ok`。本轮原始配置 SHA-256 为 `436D94A6CC0225536F0EB6C6465EAC1ECA2A6549D31B0240BBA9BBE46D6C5921`，规范化配置 SHA-256 为 `d9e9b55ef07ef3be13333fe1c8ac2754ebbd877f011efdd24e64155ccc6ab90d`，数据库 SHA-256 为 `3e8af718694976a9f227aef54e607d3ed7cffc2b1bc0b0e247209b00c1ef27be`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 其他变更与发布边界：补齐 `sxptc.com`、`cntcvc.com` 的验证器官方域名白名单，更新 TASK-03 费用计数断言；原始 `plan_record.tuition_*`、`TUITION_PENDING=797` 未改写。本轮仅更新本地可重建数据，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 2026-09-18 / official-tuition-increment-53：德宏职业学院官方招生简章学费补录

- 目的与实际修改：继续检索 institution 实体未核验队列。德宏职业学院招生信息网于 2026-06-25 发布《德宏职业学院2026年招生简章》，页面由学校招生就业处主办并链接学校官方微信公众号图文；图文“相关说明”第 1 项明确三年制专科学费 5,000 元/生·学年。新增 1 所数据库已有院校、1 条 `CNY + academic_year` 原始收费档，按 101 专业组和同名专业精确展开 6 条费用引用；住宿费 450 元不写入学费证据。
- 精确边界：只匹配当前数据库组号 101 的临床医学、护理、口腔医学、中医学 6 条普通三年制专科招生记录，不把三年制金额扩展到其他培养类型或未列专业，也没有改写原始 `plan_record.tuition_*`、住宿费、教材费、伙食费、其他代收费或 `TUITION_PENDING=797`。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,876 所院校、6,434 条原始收费档，展开后 `official_fee_reference=7223`、`offering_matches=1050`；机构级未核验队列按未覆盖 `institution_pk` 统计为 432 行。`validate_admissions_db.py` 为 57,534/57,534，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 权威来源与文件：[德宏职业学院招生信息网 2026 年招生简章](https://zs.yndhvc.com/showarticle_zs.php?actiontype=0&id=120&keyword_type=0&search_keyword=)；页面链接的[德宏职业学院官方微信公众号图文](https://mp.weixin.qq.com/s/0sdTs2Dlgadw3bWXQVNgag?color_scheme=light&from=industrynews)。本轮涉及 `pipelines/task03/official_tuition_sources.json`、`pipelines/task03/build_admissions_db.py`、`pipelines/task03/validate_admissions_db.py`、`pipelines/task03/test_admissions_db.py`，并生成 `data/admissions/admissions.sqlite` 与 `data/admissions/build-manifest.json`。原始配置 SHA-256 为 `743BBADF6CB8BF89C2B72D8C3854188B94A4E809A3D589736F46AEDEC8FF85BE`，规范化配置 SHA-256 为 `72a27e4f14b97ca6640c627c72ba40cefd9de413e4dea33e23c7aa4dac720d2c`，数据库 SHA-256 为 `4ca1903765bc5db2af8b3d202720e5a71127501278bfd8bd4002d48e3f57272e`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮只更新本地可重建数据、官方来源域名白名单、测试断言和文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；剩余学校继续按“官方明确金额才写入、无法核验继续留空”的规则处理。

## 2026-09-18 / official-tuition-increment-52：四川招生计划补录阿坝师范学院与四川民族学院

- 目的与实际修改：继续检索 institution 实体未核验队列。依据四川省教育考试院 2026 年物理类招生计划图，新增阿坝师范学院、四川民族学院 2 条院校目录记录，共写入 11 条明确收费档，并按专业组和专业名精确展开 39 条 `official_fee_reference`。
- 精确边界：阿坝师范学院 17/17 条现有物理类招生专业完成匹配，费用为 4,800、5,200 或 8,000 元/生·学年；四川民族学院 22/22 条完成匹配，专业组 105/108 为 4,800 元，专业组 106 内分为 5,200 元和 4,800 元，专业组 114/117 为 5,200 元。没有把专业组费用跨组扩散，也没有改写原始 `plan_record.tuition_*`、住宿费、教材费、伙食费或其他代收费字段。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,875 所院校、6,433 条原始收费档，展开后 `official_fee_reference=7217`、`offering_matches=1044`；机构级未核验队列按未覆盖 `institution_pk` 统计为 433 行。`validate_admissions_db.py` 为 57,502/57,502，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 权威来源与文件：[四川省教育考试院 2026 年物理类计划入口](https://plan.sceea.cn/lkjh.html)；直接证据为[第 131 图](https://plan.sceea.cn/img/wl/tu/wl%20(131).png)和[第 132 图](https://plan.sceea.cn/img/wl/tu/wl%20(132).png)。本轮涉及 `pipelines/task03/official_tuition_sources.json`、`pipelines/task03/test_admissions_db.py`，并生成 `data/admissions/admissions.sqlite` 与 `data/admissions/build-manifest.json`。原始配置 SHA-256 为 `5A0868A8D0C72581D4DA5F53FEBBA40B3EB44ABD2719E06126910ACB4DD92449`，规范化配置 SHA-256 为 `606ef39831aeead175616529cbd2ebc6402cf57a74338951d54831e4813d8d25`，数据库 SHA-256 为 `2980497e40d5f97512310ec3076c8c1a700adad1e3795fef872af1dd1efa6b5f`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮只更新本地可重建数据和文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；剩余学校继续按“官方明确金额才写入、无法核验继续留空”的规则处理。

## 2026-09-18 / official-tuition-increment-51：军队院校官方待遇补录

- 目的与实际修改：继续检索 institution 实体未核验队列。苏州市人民政府发布的 2026 年军队院校报考指南明确，经高考录取并复查合格的军校本科学员学习费用由军队承担；国防科技大学招生网同样说明生长军官本科学员学习费用由军队承担，海军工程大学招生网明确免收学费。基于这一适用于军队生长军官本科招生的官方规则，为军事航天部队航天工程大学、陆军兵种大学、武警警官学院、陆军防化学院、空军航空大学（空军招飞）5 所院校写入 0 元/生·学年学生自付学费记录。
- 精确边界：5 所院校均按数据库已有军事类专业名精确匹配，共 73 条 `official_fee_reference`，没有把军校待遇扩展到无军籍地方本科生，也没有改写原始 `plan_record.tuition_*`、住宿费、教材费、伙食费或其他代收费字段。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,873 所院校、6,422 条原始收费档，展开后 `official_fee_reference=7178`、`offering_matches=1005`；机构级未核验队列按未覆盖 `institution_pk` 统计为 435 行。`validate_admissions_db.py` 为 57,294/57,294，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 权威来源与文件：[苏州市人民政府 2026 年军队院校在苏招生报考指南](https://www.suzhou.gov.cn/szsrmzf/mszx/202606/116f07f8f1fc48ec924aae1b4ea6201d.shtml)；交叉核验：[国防科技大学招生网](https://www.nudt.edu.cn/bkzs/zkzc/cjwt/gpdw/b0c26f39d9c94283829bcc20aa15bb1d.htm)、[海军工程大学招生网](https://www.nue.edu.cn/htmls/dakaoshengwen/20250601/1930161968839151616.html)。本轮涉及 `pipelines/task03/official_tuition_sources.json`、`pipelines/task03/test_admissions_db.py`，并生成 `data/admissions/admissions.sqlite` 与 `data/admissions/build-manifest.json`。原始配置 SHA-256 为 `5339301086782C5D1E1BE82CCB48A714044A7D091B426CC647B7DC759511E4A9`，规范化配置 SHA-256 为 `2d2e4e79189d0bf19147b86e3c414ae9eab639fc5302c99e4d933c763cacf13d`，数据库 SHA-256 为 `b6b97e843881edea2b8a52e1286b49949b6d0f02683cb5e6b25ee935a4c479ac`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮只更新本地可重建数据和文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；剩余学校继续按“官方明确金额才写入、无法核验继续留空”的规则处理。

## 2026-09-18 / official-tuition-increment-50：四川省教育考试院计划补录成都轨道交通职业学院

- 目的与实际修改：继续检索 institution 实体未核验队列，依据四川省教育考试院 2026 年普通高校在川招生专业及名额介绍（物理类）第 190 图，新增成都轨道交通职业学院 1 所数据库已有院校，写入 1 条 `CNY + academic_year` 官方收费档。专业组 501 的城市轨道车辆应用技术、城市轨道交通机电技术、城市轨道交通通信信号技术、城市轨道交通供配电技术、城市轨道交通运营管理均明确为 17800 元/生·学年，按同名专业和 501 专业组精确展开 5 条官方费用引用；历史类未列入当前数据库的可匹配普通招生专业，未扩展推断。
- 权威来源与边界：[四川省教育考试院 2026 年普通高校在川招生专业及名额介绍（物理类）](https://plan.sceea.cn/lkjh.html)为省级招生考试机构官方计划入口，直接证据为[物理类第 190 图](https://plan.sceea.cn/img/wl/tu/wl%20(190).png)。未使用第三方学费汇总；原始 `plan_record.tuition_*`、住宿费、教材费、其他代收费及 `TUITION_PENDING=797` 未改写。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,868 所院校、6,417 条原始收费档，展开后 `official_fee_reference=7105`、`offering_matches=932`；机构级未核验队列按未覆盖 `institution_pk` 统计为 440 行。`validate_admissions_db.py` 为 56,919/56,919，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 本轮涉及文件：`pipelines/task03/official_tuition_sources.json`、`pipelines/task03/test_admissions_db.py`；生成 `data/admissions/admissions.sqlite` 与 `data/admissions/build-manifest.json`。官方学费配置原始文件 SHA-256 为 `9FCCD1219C23D3239FA1B7378047850F54F6D1A3ED56FFBAC1EFACAB001A05C1`，规范化配置 SHA-256 为 `c89cfb970fe30dd068600bb7469b137062cd27c35feab0264f9d78026583700f`，数据库 SHA-256 为 `180da9c7d5752c4e6ed15081357242c8aa9ba0e36ff1ca28323eb15d273357f9`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮只更新本地可重建数据和文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；剩余学校继续按“官方明确金额才写入、无法核验继续留空”的规则处理。

## 2026-09-18 / official-tuition-increment-49：四川省教育考试院计划补录宜宾两所职业院校

- 目的与实际修改：继续检索 institution 实体未核验队列，依据四川省教育考试院 2026 年普通高校在川招生专业及名额介绍的物理类第 191 图、历史类第 102 图，新增宜宾工业职业技术学院、宜宾医药健康职业学院 2 所数据库已有院校，写入 7 条 `CNY + academic_year` 官方收费档。宜宾工业职业技术学院按物理类 101/201、历史类 102/202 专业组逐组匹配 4800/5200 元档；宜宾医药健康职业学院 10 个同名专业在物理类和历史类专业组 101 均为 5800 元档；展开后新增 38 条官方费用引用。
- 权威来源与边界：[四川省教育考试院 2026 年普通高校在川招生专业及名额介绍](https://plan.sceea.cn/)为省级招生考试机构官方计划入口，直接证据为[物理类第 191 图](https://plan.sceea.cn/img/wl/tu/wl%20(191).png)和[历史类第 102 图](https://plan.sceea.cn/img/ls/tu/ls%20(102).png)。未使用第三方学费汇总；官方图表未列出的专业不扩展，原始 `plan_record.tuition_*`、住宿费、教材费、其他代收费及 `TUITION_PENDING=797` 未改写。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,867 所院校、6,416 条原始收费档，展开后 `official_fee_reference=7100`、`offering_matches=927`；机构级未核验队列按未覆盖 `institution_pk` 统计为 441 行。`validate_admissions_db.py` 为 56,892/56,892，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 本轮涉及文件：`pipelines/task03/official_tuition_sources.json`、`pipelines/task03/test_admissions_db.py`；生成 `data/admissions/admissions.sqlite` 与 `data/admissions/build-manifest.json`。官方学费配置原始文件 SHA-256 为 `4E11A270602938C823601F4EC3128B00DA2ACD094CF2BA723F88A5A3CA4424F4`，规范化配置 SHA-256 为 `aa0ae6ff1bed32db1df60a7e0a694bdc88a6b2a0e705859b8305587cf33ecbaa`，数据库 SHA-256 为 `95d2c96abee295c6f4a6d9efe6422993f4e17a9425350033f2c604d66bd3c5d0`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮只更新本地可重建数据和文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；剩余学校继续按“官方明确金额才写入、无法核验继续留空”的规则处理。

## 2026-09-18 / official-tuition-increment-48：四川省教育考试院计划补录川北幼儿师范高等专科学校

- 目的与实际修改：继续检索 institution 实体未核验队列，依据四川省教育考试院 2026 年普通高校在川招生专业及名额介绍（物理类）第 184 图，新增 1 所数据库已有院校，写入 3 条 `CNY + academic_year` 官方收费档。图表按专业列明 4800、5200、5800 元/生·学年；其中 13 个同名专业按数据库专业精确挂接，展开后新增 25 条官方费用引用。没有按类别或相近专业泛化金额。
- 权威来源与边界：[四川省教育考试院 2026 年普通高校在川招生专业及名额介绍（物理类）](https://plan.sceea.cn/lkjh.html)为省级招生考试机构官方计划入口，直接证据图为[第 184 图](https://plan.sceea.cn/img/wl/tu/wl%20(184).png)。未使用第三方学费汇总；原始 `plan_record.tuition_*`、住宿费、教材费、其他代收费及 `TUITION_PENDING=797` 未改写。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,865 所院校、6,409 条原始收费档，展开后 `official_fee_reference=7062`、`offering_matches=889`；机构级未核验队列按未覆盖 `institution_pk` 统计为 443 行。`validate_admissions_db.py` 为 56,693/56,693，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 本轮涉及文件：`pipelines/task03/official_tuition_sources.json`、`pipelines/task03/test_admissions_db.py`；生成 `data/admissions/admissions.sqlite` 与 `data/admissions/build-manifest.json`。官方学费配置原始文件 SHA-256 为 `FCAD984999EBD476A15EF6DBC0397E7264132A9E8BA855A6CB5EC9F4975F7531`，规范化配置 SHA-256 为 `07e0ac46ff17cb3574fd3cd4406fcdb234a7dccee0bcac4ce3a8f391f70fd88f`，数据库 SHA-256 为 `26EC6BE2B29D3F0598389170DA49BC8DC602BF05606A3B5AC7C53418B2836477`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮只更新本地可重建数据和文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；剩余学校继续按“官方明确金额才写入、无法核验继续留空”的规则处理。

## 2026-09-18 / official-tuition-increment-47：新疆应用职业技术学院官方学费补录

- 目的与实际修改：继续检索 institution 实体未核验队列，依据新疆应用职业技术学院官网《2026年招生章程》新增 1 所数据库已有院校，写入 4 条 `CNY + academic_year` 官方收费档。章程明确理工/文理兼类 3300 元、艺术类 5500 元、护理 3900 元、财经类 3000 元/年；只有护理在当前数据库存在同名 106 组招生记录，按同名专业和组代码精确展开为 1 条费用引用，其余类别保持院校级证据，不从专业名称推断类别。
- 权威来源与边界：[新疆应用职业技术学院2026年招生章程](https://www.xjyyedu.cn/2026/0520/c26a5688/page.htm)为学校官网页面，发布日期 2026-05-20，页面明确学校为公办全日制普通高等职业院校并公布上述收费标准。未使用第三方学费汇总；住宿费、教材费和代收费不写入学费证据表。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,864 所院校、6,406 条原始收费档，展开后 `official_fee_reference=7037`、`offering_matches=864`；机构级未核验队列按未覆盖 `institution_pk` 统计为 444 行。`validate_admissions_db.py` 为 56,564/56,564，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 本轮涉及文件：`pipelines/task03/official_tuition_sources.json`、`pipelines/task03/build_admissions_db.py`、`pipelines/task03/validate_admissions_db.py`、`pipelines/task03/test_admissions_db.py`；生成 `data/admissions/admissions.sqlite` 与 `data/admissions/build-manifest.json`。官方学费配置原始文件 SHA-256 为 `2172a403e2e249a0c618a57fee152d5d1e62fe51aaa5333fb40511ee00637b3d`，构建清单规范化配置 SHA-256 为 `ecba8b6e3c9b93eb2f1a1f99d1a3fb22828aea85e0b1e2d6589c59adb0ee7d78`，数据库 SHA-256 为 `8114d302afbbc9eb8ec7244ee6465ab8b82c3ba67f1ce0aafd420a5ec2d3cda3`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮只更新本地可重建数据和文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；剩余学校继续按“官方明确金额才写入、无法核验继续留空”的规则处理。

## 2026-09-18 / official-tuition-increment-46：河北水利电力学院官方学费补录

- 目的与实际修改：继续检索 institution 实体未核验队列，依据河北水利电力学院招生信息网《关于我院优势本科专业调整学费标准的公示》新增 1 所数据库已有院校，写入 3 条 `CNY + academic_year` 官方收费档。公示列出 7 个专业，电气工程及其自动化、自动化、水利水电工程、道路桥梁与渡河工程按同名专业及 101 招生组精确展开为 4 条费用引用；机械设计制造及其自动化、数据科学与大数据技术合并保留 5390 元院校级档，财务管理保留 5060 元院校级档，未向相近专业扩展。
- 权威来源与边界：[河北水利电力学院关于优势本科专业调整学费标准的公示](https://zsb.hbwe.edu.cn/info/1006/6041.htm)为学校招生信息网页面，发布日期 2025-11-12，页面明确新标准自 2026 年秋季入学新生开始执行。未使用第三方学费汇总；公示未列入的当前数据库专业继续留空，住宿费、教材费和代收费不写入学费证据表。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,863 所院校、6,402 条原始收费档，展开后 `official_fee_reference=7033`、`offering_matches=863`；机构级未核验队列按未覆盖 `institution_pk` 统计为 445 行。`validate_admissions_db.py` 为 56,542/56,542，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 本轮涉及文件：`pipelines/task03/official_tuition_sources.json`、`pipelines/task03/test_admissions_db.py`；生成 `data/admissions/admissions.sqlite` 与 `data/admissions/build-manifest.json`。官方学费配置原始文件 SHA-256 为 `e16e9eba55140dc56c731ae994da5f0633853a9d30ac40c86803c59f0ade9d0d`，构建清单规范化配置 SHA-256 为 `3ff7a458abf417eee0eadaae3ffa80f9c4ad2dbca495e4da9c972268b4c629e9`，数据库 SHA-256 为 `e2198c2190bb45d9288de12e7ee21ac66ebe5687593c237ee80d8dc10c94b088`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮只更新本地可重建数据和文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；剩余学校继续按“官方明确金额才写入、无法核验继续留空”的规则处理。

## 2026-09-18 / official-tuition-increment-45：新疆职业大学官方学费补录

- 目的与实际修改：继续检索 institution 实体未核验队列，依据新疆职业大学官网发布的《2026年普通高职（专科）招生简章》新增 1 所数据库已有院校，写入 11 条 `CNY + academic_year` 官方收费档。来源表共列明 59 个普通高职专业及收费标准；其中航空物流管理、民宿管理与运营的 3480 元档，以及应用化工技术、新能源汽车检测与维修技术、水利水电工程智能管理、电力储能应用技术、民航安全技术管理的 3960 元档，按数据库同名专业和 101/102 招生组展开为 11 条费用引用。带方向名称不一致的水利工程（农业水利工程）没有映射到数据库水利工程；联合办学第三学年 16600 元保留为条件性收费档，不折算成单一年度金额。
- 权威来源与边界：[新疆职业大学 2026 年普通高职（专科）招生简章](https://www.xjvu.edu.cn/zjb/info/1051/1517.htm)为学校招生就业处官网页面，发布日期 2026-07-03，专业表同时列出学费及自治区发展和改革委员会收费标准文件号。未使用第三方学费汇总；住宿费、制服等自理费用不写入官方学费证据表；“最终以自治区发展和改革委员会核定标准为准”的说明不改变本轮对页面明确金额的存证。
- 实测结果：数据库重建 `status=passed`，2,308 所院校、51,878 条招生计划；官方目录覆盖 1,862 所院校、6,399 条原始收费档，展开后 `official_fee_reference=7027`、`offering_matches=859`；机构级未核验队列按未覆盖 `institution_pk` 统计为 446 行。`validate_admissions_db.py` 为 56,510/56,510，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 本轮涉及文件：`pipelines/task03/official_tuition_sources.json`、`pipelines/task03/build_admissions_db.py` 既有白名单、`pipelines/task03/validate_admissions_db.py` 既有来源规则、`pipelines/task03/test_admissions_db.py` 目录计数与官方 URL 断言；生成 `data/admissions/admissions.sqlite` 与 `data/admissions/build-manifest.json`。官方学费配置原始文件 SHA-256 为 `5139788d74b64ff132a61100f40fc2b0e16b34947dbbd73373524e064bfbe221`，构建清单规范化配置 SHA-256 为 `da1460c54e489a57555e1e20203488382ec0f8ba413c6c27b617064f3ba572f4`，数据库 SHA-256 为 `11f496e2670c23b0a847d3f608061bd11533bc12b5d73594919803f7ad7965b9`，`release_id=LOCAL-OFFLINE-2026-e48a598a1832`。
- 发布边界：本轮只更新本地可重建数据和文档，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；剩余学校继续按“官方明确金额才写入、无法核验继续留空”的规则处理。

## 2026-09-18 / official-tuition-increment-40：湖南 6 所院校官方学费补录

- 目的与实际修改：继续按 institution 实体未核验队列检索官方学费。本轮新增湖南中医药高等专科学校、湘南幼儿师范高等专科学校、长沙医药健康职业学院、益阳师范高等专科学校、湖南软件职业技术大学、湖南水利水电职业技术学院 6 所数据库已有院校，写入 41 条 `CNY + academic_year` 原始收费档；重建后新增 68 条 `official_fee_reference`，其中 51 条精确挂接到当前招生专业，17 条因当前库没有同名或方向可安全对应的招生行保留为院校收费档。原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 官方来源与边界：湖南中医药、湖南软件使用官方省级招生信息平台的 2026 年审核章程；湘南幼儿师范、长沙医药健康、益阳师范、湖南水利水电使用学校官网 2026 年章程、收费表或招生材料。长沙医药健康的招生章程PDF注明收费标准按最新核准政策执行；湖南水利水电注明执行湖南省学分制收费标准，均按官网明确金额登记但不据此推导未列专业。湖南软件商务英语跨境方向按 6,800 元匹配数据库备注，普通商务英语 12,800 元仅保留院校档；软件测试、动漫制作等当前库无对应方向，未强行挂接。住宿费、教材费和代收费不进入学费证据表，第三方网页未作为入库依据。
- 权威来源：[湖南中医药高等专科学校 2026 年招生章程](https://13802.gaokao.haedu.cn/policy/brochure/2026/0623/154729.html)、[湘南幼儿师范高等专科学校 2026 年收费标准](https://www.xnyesz.com/info/13792)、[长沙医药健康职业学院 2026 年招生章程 PDF](https://www.csyyjkzy.cn/attachment/file/20260608/20260608092725_73185.pdf)、[益阳师范高等专科学校 2026 年招生章程 PDF](https://zsjy.newyishi.com/__local/4/19/06/660B41B26415CDBBF91EFA10CFE_4E7E3939_30DA3.pdf)、[湖南软件职业技术大学 2026 年招生章程](https://13925.gaokao.haedu.cn/policy/brochure/2026/0623/154740.html)、[湖南水利水电职业技术学院 2026 年招生章程](https://www.hnslsdxy.com/zsw/page/contentshow.aspx?id=20260529154844798&page=1)。四个学校官网非 `.edu.cn` 域名仅加入精确 HTTPS 白名单，未放宽任意非教育域名规则。
- 实测结果：数据库 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,853 所院校、6,322 条原始收费档，展开后 `official_fee_reference=6860`、`offering_matches=748`；按未覆盖的 `institution_pk` 统计机构级未核验队列降至 455 行。`validate_admissions_db.py` 为 55,645/55,645，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 构建与发布：构建清单官方学费配置规范化 SHA-256 为 `4568fd214e962414b8968f0eb9259897558043f58f0827a36c290f29e51ae952`，原始配置文件 SHA-256 为 `04b01b6aa7c54d9f8c0c6d8737b99f14cb0555eab3db3097a05e1f513f392da5`，数据库 SHA-256 为 `261f0a0e7dff89a2dbc92bd23356611a6f39c67ace34010deb895e2435cafcff`，构建清单 `release_id=LOCAL-OFFLINE-2026-e48a598a1832`。本轮为本地可重建产物，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 455 个 institution 实体行。

## 2026-09-18 / official-tuition-increment-39：海南 3 所院校官方学费补录

- 目的与实际修改：继续按 institution 实体未核验队列检索 2026 年官方学费。本轮新增海南健康管理职业技术学院、三亚城市职业学院、海南经贸职业大学 3 所数据库已有院校，写入 11 条 `CNY + academic_year` 原始收费档；重建后新增 30 条 `official_fee_reference`，30 条均精确挂接到当前招生专业。原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 官方来源与边界：海南健康管理职业技术学院使用学校招生网 2026 年招生章程；三亚城市职业学院使用学校官网 2026 年招生章程；海南经贸职业大学使用学校招生信息网 2026 年招生计划及收费标准，并与同校 2026 年招生章程交叉核对。三亚“大数据与会计、现代物流管理”的普通组 14,800 元与新加坡 PSB 合作组 30,000 元按专业组代码 101/103 与 102/104 分开；海南经贸四个相关记录均由数据库原始计划明确标为中外合作办学，未把普通专业 5,700 元误套到合作组。住宿费、教材费和代收费不进入学费证据表，第三方网页未作为入库依据。
- 权威来源：[海南健康管理职业技术学院 2026 年招生章程](https://zsw.hainhmc.edu.cn/info/237/6201.html)、[三亚城市职业学院 2026 年招生章程](https://www.sycsxy.cn/nd.jsp?id=3457)、[海南经贸职业大学 2026 年招生计划及收费标准](https://zsw.hceb.edu.cn/info/1014/9771.htm)、[海南经贸职业大学 2026 年招生章程](https://zsw.hceb.edu.cn/info/1023/9741.htm)。`sycsxy.cn` 仅作为经核验的学校官方非 `.edu.cn` 域名加入精确 HTTPS 白名单，未放宽任意非教育域名规则。
- 实测结果：数据库 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,847 所院校、6,281 条原始收费档，展开后 `official_fee_reference=6792`、`offering_matches=697`；按未覆盖的 `institution_pk` 统计机构级未核验队列降至 461 行。`validate_admissions_db.py` 为 55,275/55,275，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 构建与发布：构建清单官方学费配置规范化 SHA-256 为 `1414bcb2d364c83974fddd585facee9e48ff8a006cd3459fc8add2655344c1ef`，原始配置文件 SHA-256 为 `88e9630f54d47c7769eecfce9771075bcb59035763f3b738217832393a80c45b`，数据库 SHA-256 为 `36a911c245da1c45b778565d01b64a0627a667b015f31d82fbc66155d48c6419`。本轮为本地可重建产物，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 461 个 institution 实体行。

## 2026-09-18 / official-tuition-increment-38：河南 5 所院校官方学费补录

- 目的与实际修改：继续按未核验 institution 队列检索官方学费。本轮新增鹤壁能源化工职业学院、郑州食品工程职业学院、郑州电子商务职业学院、鹤壁汽车工程职业学院、郑州财税金融职业学院 5 所数据库已有院校，写入 15 条 `CNY + academic_year` 原始收费档；按数据库现有专业名称精确匹配，展开后新增 29 条 `official_fee_reference`，其中 29 条均为专业级费用引用。原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 官方来源与边界：鹤壁能源化工职业学院使用学校官网 2026 年普通专科招生章程；郑州食品工程职业学院使用河南省阳光高考平台 2026 年对口升学招生章程的专业收费条款；郑州电子商务职业学院、鹤壁汽车工程职业学院、郑州财税金融职业学院使用河南省教育考试院 2026 年专科招生计划中按专业列示的收费标准。郑州财税金融的“金融服务与管理”另与学校官网章程的文史类 3,700 元/生·年交叉核对；“网络营销与直播电商”只有分类收费说明，未作专业金额推断。对口计划来源仅按同名专业精确挂接，不把住宿费、教材费或代收费写入学费表。
- 权威来源： [鹤壁能源化工职业学院 2026 年招生章程](https://www.hbnyhgzyxy.com/newsinfo/9064082.html)、[郑州食品工程职业学院 2026 年对口升学招生章程](https://14812.gaokao.haedu.cn/policy/brochure/2026/0123/78931.html)、[河南省 2026 年普通高等学校对口招生计划（专科）](https://www.haeea.cn/attach/file/20260408/20260408103833_2199_a6ddea6a.pdf)、[郑州财税金融职业学院 2026 年普通高招招生章程](https://www.zzcsjr.edu.cn/zs/info/1074/3065.htm)。`hbnyhgzyxy.com` 仅作为经核验的学校官方非 `.edu.cn` 域名加入精确 HTTPS 白名单，未放宽任意非教育域名规则；第三方网页未作为入库依据。
- 实测结果：数据库 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,844 所院校、6,270 条原始收费档，展开后 `official_fee_reference=6762`、`offering_matches=667`；按未覆盖的 `institution_pk` 统计机构级未核验队列降至 464 行。`validate_admissions_db.py` 为 55,111/55,111，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 构建与发布：构建清单官方学费配置规范化 SHA-256 为 `6c1c2cf07891db6a079c9287800c0dcf7278851319a081b9ef1a0d8493f1f27f`，原始配置文件 SHA-256 为 `2eef0d4fd3cb8917175d1c7fc056ea5cff8b0898edb461c32cedc963feb3f7d5`，数据库 SHA-256 为 `de3fce57ad4f02bd5989706a850c4573e2e65bc4a6dd50f6fb20df03189dfd67`。本轮为本地可重建产物，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 464 个 institution 实体行。

## 2026-09-17 / official-tuition-increment-37：天津、吉林、长春 3 所院校官方学费补录

- 目的与实际修改：继续按 institution 实体未核验队列检索官方学费。本轮新增天津机电职业技术学院、吉林工业职业技术学院、长春师范高等专科学校 3 所数据库已有院校，写入 20 条官方原始收费档；重建后新增 35 条 `official_fee_reference`，其中 33 条精确挂接到当前招生专业，2 条天津机电按招生章程的普通/特殊专业类别保留为院校级证据。原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 官方来源与边界：天津机电招生网《2026年普通高职招生章程》明确一般专业 5,000 元/生·年、特殊专业 5,500 元/生·年，但同页未把“特殊专业”逐项列出，故不作模糊专业映射；吉林工业招生网发布的 2026 年招生章程及官方专业收费表中，当前数据库的数控技术为 6,500 元、机械制造及自动化为 5,500 元，按专业精确匹配；长春师范高专官网 2026 年招生简章专业表中，当前数据库可精确对应的 16 个专业按 4,300—6,000 元/生·年写入，未把表外或方向不一致专业扩展。住宿费和代收费不进入学费证据表。
- 权威来源： [天津机电职业技术学院 2026 年普通高职招生章程](https://zsjy.suoyuan.com.cn/info/1003/1632.htm)、[吉林工业职业技术学院 2026 年招生章程](https://zsjyc.jvcit.edu.cn/info/1074/1505.htm)、[长春师范高等专科学校 2026 年招生简章](https://zs.ccnc.edu.cn/info/1003/1936.htm)。`suoyuan.com.cn` 仅作为经核验的学校招生站精确 HTTPS 白名单加入构建器、验证器和测试，未放宽任意非 `.edu.cn` 域名规则；第三方网页未作为入库依据。
- 实测结果：数据库 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,839 所院校、6,255 条原始收费档，展开后 `official_fee_reference=6733`、`offering_matches=638`；按未覆盖的 `institution_pk` 统计机构级未核验队列降至 469 行。`validate_admissions_db.py` 为 54,946/54,946，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 构建与发布：构建清单官方学费配置规范化 SHA-256 为 `8eca5a21f6c36b1cb3c921c050f9ebbf2b7e9c3cce51e763ddd1eb500b07968e`，原始配置文件 SHA-256 为 `ed2b232802ea7e6ad64c83e6803072b3aa38045a4afb7dbb25dc10d9cefbfac2`，数据库 SHA-256 为 `e1e47a8afcaa6ceec3c1ba7c9090d1ce151a456a053ca071e67fb21637412734`。本轮仍为本地可重建产物，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 469 个 institution 实体行。

## 2026-09-17 / official-tuition-increment-36：吉林 5 所院校官方学费来源复核与专业挂接

- 目的与实际修改：继续按 institution 实体未核验队列复核已有官方收费档。本轮没有新增 institution 行，而是复核吉林科技职业技术学院、长春金融高等专科学校、吉林工程职业学院、吉林电子信息职业技术学院、白城职业技术学院 5 所院校；将长春金融、吉林电子原先不完整的省级招生计划收费档替换为教育部阳光高考审核章程，并为其余 3 所已有章程档补齐当前数据库的同名专业匹配。配置原始收费档净增 1 条，官方费用引用净增 30 条，`offering_matches` 净增 38 条；原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 官方来源与精确边界：全部使用教育部阳光高考已审核的 2026 年招生章程，不使用第三方转载。吉林科技职业技术学院按 14800 元档补入“大数据与会计、全媒体广告策划与营销”当前同名专业，保留护理 15800 元及旅游管理 12700 元院校级档；长春金融高等专科学校按 5000 元档匹配云计算技术应用、大数据与会计、大数据与财务管理、大数据技术、市场营销、现代物流管理、电子商务、计算机网络技术、证券实务、财富管理、资产评估与管理、金融服务与管理，人工智能技术应用按 6500 元匹配；吉林工程职业学院按 3500/5500/7000/8500 元分别匹配畜牧兽医、旅游管理/护理/计算机应用技术、工业机器人技术、动漫制作技术；吉林电子信息职业技术学院按 5000 元匹配工程造价和高速铁路客运服务；白城职业技术学院按 3300 元匹配应急救援技术和应用化工技术、5500 元匹配体育教育。待定或当前库无同名专业的金额不扩展。
- 权威来源： [吉林科技职业技术学院 2026 年招生章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-52327073%2CinfoId-7638147814.dhtml)、[长春金融高等专科学校 2026 年招生章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-811%2CinfoId-7617056487.dhtml)、[吉林工程职业学院 2026 年招生章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-1377%2CinfoId-7624541214.dhtml)、[吉林电子信息职业技术学院 2026 年招生章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-1375%2CinfoId-7619477173.dhtml)、[白城职业技术学院 2026 年招生章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-6267039%2CinfoId-7637205676.dhtml)。
- 实测结果：数据库 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,831 所院校、6,222 条原始收费档，展开后 `official_fee_reference=6656`、`offering_matches=563`；按未覆盖的 `institution_pk` 统计机构级未核验队列仍为 477 行。`validate_admissions_db.py` 为 54,522/54,522，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 构建与发布：构建清单官方学费配置规范化 SHA-256 为 `82c9831436e3256f9354acb8034e3be4188e4a6b9c78d05647f2e9e1247f6538`，原始配置文件 SHA-256 为 `5ca9d36a319b716b258b658ab26954b78ff717863884a882f180ec885f91363e`，数据库 SHA-256 为 `ee13e3ba15501a347dd7bb9d86d1d1501ac1a9b5659780e6e7e199d026cbe390`。本轮仍为本地可重建产物，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 477 个 institution 实体行。

## 2026-09-17 / official-tuition-increment-35：甘肃、宁夏 3 所院校官方学费补录

- 目的与实际修改：继续按 institution 实体未核验队列检索官方学费。本轮新增甘肃卫生职业学院、宁夏艺术职业学院、宁夏工商职业技术大学 3 所数据库已有院校，写入 5 条 `CNY + academic_year` 原始收费档；按数据库当前招生专业精确匹配，展开后新增 40 条官方费用引用。原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 官方来源与边界：甘肃卫生职业学院官网 2026 年招生章程明确普通高职（专科）4500 元/学年；宁夏艺术职业学院官网 2026 年普通高考招生章程第二十六条明确文化产业经营与管理 5500 元/学年、网络直播与运营 4600 元/学年；宁夏工商职业技术大学招生信息网 2026 年普通高考招生章程第二十八条明确专科普通类 4600 元/生/学年、定向培养军士 7000 元/生/学年。本轮未写入本科职业教育专业，因为官网章程只写按自治区发改委批复标准执行。
- 精确匹配实现：宁夏工商职业技术大学的“机电一体化技术”同时出现在普通类和定向培养军士记录中，扩展 `major_exact` 匹配规则支持 `admission_type` 过滤，并同步让验证器按相同过滤条件展开计数；普通类与军士类分别写入 4600 和 7000，避免同名专业错套收费。`wszyjy.com.cn` 仅加入经核验的精确 HTTPS 白名单，`zsw.nxgs.edu.cn` 仅作为官方 HTTP legacy 页面精确放行。
- 实测结果：数据库 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,831 所院校、6,221 条原始收费档，展开后 `official_fee_reference=6626`、`offering_matches=525`；按未覆盖的 `institution_pk` 统计机构级未核验队列为 477 行。`validate_admissions_db.py` 为 54,363/54,363，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 构建与发布：构建清单官方学费配置规范化 SHA-256 为 `7e0b60123880b80512162d2b9828be9cbeaa4bc723673f229ad5112d3304d213`，原始配置文件 SHA-256 为 `c155e64f5a983de1cf7dacdb80146df96d17ba163effd15cdf4bbbf37bc8678c`，数据库 SHA-256 为 `5c1829554e65db4119f0859c7190e53d72bf485d62b4203df3b51e9a86227698`。本轮仍为本地可重建产物，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 477 个 institution 实体行。

## 2026-09-17 / official-tuition-increment-34：北京 5 所院校官方学费补录

- 目的与实际修改：继续按 institution 实体未核验队列检索官方学费。本轮新增中国消防救援学院、北京经贸职业学院、北京经济管理职业学院、北京警察学院、北京邮电大学世纪学院 5 所数据库已有院校，写入 11 条 `CNY + academic_year` 原始收费档；按数据库当前专业名称精确匹配，展开后新增 25 条官方费用引用。原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 官方来源与边界：中国消防救援学院招生网 2026-05-27 官方问答明确青年学生“免交学费”，当前数据库 7 个不同专业名称对应 8 条招生记录全部写入金额 0；北京经贸职业学院使用河南省阳光高考信息平台 2026-06-23 发布的官方招生章程，仅将“大数据与会计”完全同名的 18,800 元写入，数据库“影视动画”与来源“影视动画（影视特效）”不完全相同，未模糊匹配；北京经济管理职业学院官网 2026-05-27 招生章程明确学费 6,000 元/学年，按数据库中的商务英语、大数据与会计、无人机应用技术及其不同招生组记录精确匹配；北京警察学院官网 2026-05-27 招生章程明确社会体育指导与管理 4,200 元/年；北京邮电大学世纪学院招生网 2026-07-09 新生入学须知内官方收费图表逐项核到 34,000、36,000、37,000、39,000、40,000、41,000、43,000 元档，补齐当前数据库 9 条专业记录（含物联网工程）。
- 交叉核验与保守边界：第三方搜索结果只作为检索线索，最终证据均回到学校官网或省级教育主管部门官方平台；北京经济管理职业学院专业名称在直接查询数据库后从检索摘要中的误读修正为官方数据库原名“无人机应用技术”；中国消防学院官方问答列出的航空航天工程、消防指挥（直升机飞行与指挥）当前数据库没有对应招生专业，未新增虚拟记录；住宿费、教材费、体检费和其他代收代支不进入学费证据表。`ccbupt.cn` 仅加入精确官方来源白名单，未放宽任意非教育域名规则。
- 实测结果：数据库 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,828 所院校、6,216 条原始收费档，展开后 `official_fee_reference=6586`、`offering_matches=485`；按已覆盖的 `institution_pk` 统计，机构级未核验队列为 480 行。`validate_admissions_db.py` 为 54,155/54,155，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 构建与发布：构建清单官方学费配置规范化 SHA-256 为 `bd8498ffb5947eca4526279d82f89e0166882cf0753d82e90f44ab6f3090647f`，原始配置文件 SHA-256 为 `cf13eb2b0e6698871ea26508a623d44ced2547ba3adb310d1d91e90d18356aa0`，数据库 SHA-256 为 `4caca801438f710cfc8e7f5188c9f7b39c4bc4a8c9d00bb57a8f26279b6d12c2`。本轮仍为本地可重建产物，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 480 个 institution 实体行。

## 2026-09-17 / official-tuition-increment-33：内蒙古 2 所院校官方学费补录

- 目的与实际修改：继续按机构级未核验队列检索，只采用学校官网及教育部官方更名文件交叉核验。本轮新增内蒙古科技大学包头师范学院、赤峰大学 2 所数据库已有院校，写入 6 条 `CNY + academic_year` 原始收费档；按数据库 2026 招生专业精确匹配，展开后新增 14 条费用引用。原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 官方来源与边界：包头师范学院招生信息网 2025-07-03 官方招生问答明确 2025-2026 学年文史类专业 4,200 元/年/生、理工类专业 4,600 元/年/生；本轮只将当前数据库中能按学校专业收费口径精确对应的 7 个文史类专业和 3 个理工类专业写入，机器人工程、生态学因没有相同名称的明确收费档不扩展。赤峰大学条目使用学校官网在更名前发布的《赤峰学院2025年区内外招生计划》，逐专业核到汉语言文学 4,200、医学检验技术 5,000、机械设计制造及其自动化 4,600、食品质量与安全 4,600 元/年；教育部 2026-02-04 官方函确认赤峰学院更名为赤峰大学，故与数据库当前名称对应。
- 交叉核验与保守边界：赤峰学校官网历史招生计划、当前官网页面和教育部更名函保持同一官方域名/学校实体链路；包头师范 2025 官方问答与学校逐专业收费表口径一致。包头医学院、内蒙古财经大学、鄂尔多斯应用技术学院本轮官方本科章程仍只写按自治区价格主管部门公布标准，未取得当前专业明确金额，因此继续保持未知。第三方网页只作为检索线索，未作为入库依据；`cfxy.cn` 仅加入精确官方来源白名单。
- 实测结果：数据库为 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,823 所院校、6,205 条原始收费档，展开后 `official_fee_reference=6561`、`offering_matches=460`；按已覆盖的 `institution_pk` 统计，机构级未核验队列为 485 行。`validate_admissions_db.py` 为 54,014/54,014，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 构建与发布：构建清单官方学费配置规范化 SHA-256 为 `b7ec6e14f04948dbdce1b18611c323ff213c8b5160421df4e0e890358d4a1d09`，原始配置文件 SHA-256 为 `6254a3d547d7c2d8ab786effdcf1fd8097fc9134fb499993695f2c38d3a9719a`，数据库 SHA-256 为 `a631b8a9ee1f1b1de58a821c01afc8f2bae685c1e85ffc20942bd31aed5a5842`。本轮仍为本地可重建产物，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 485 个 institution 实体行。

## 2026-09-17 / official-tuition-increment-32：云南 4 所院校官方学费补录

- 目的与实际修改：继续按机构级未核验队列检索，只采用学校官网、学校招生网或学校信息公开栏目及其官方附件。本轮新增昆明幼儿师范高等专科学校、昆明工业职业技术学院、昆明铁道职业技术学院、云南交通职业技术大学 4 所数据库已有院校，写入 5 条 `CNY + academic_year` 原始收费档；按数据库 2026 招生专业精确匹配，展开后新增 36 条费用引用。原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 官方来源与边界：昆明幼儿师范高专官网 2026 收费项目公示列示学前教育 3,400、智慧健康养老服务与管理 4,000 元/生·学年；昆明工业职院 2026 招生章程列示统一学费 6,800 元/生·学年；昆明铁道职院 2026 普通高考招生章程 PDF 列示学费 5,000 元/学年；云南交通职业技术大学招生网收费公示的“高等职业教育”行列示 5,000 元/生·学年，本轮只覆盖当前 2026 高职（专科）批的 9 个专业，未套用艺术类、五年制或中外合作办学收费行。
- 交叉核验与保守边界：四所学校均先确认学校官网/招生网的 2026 页面，再将收费条款与当前数据库专业集合逐一比对。大理农林、德宏职业、云南司法警官、玉溪农业等本轮虽查到官方招生入口或公示线索，但未取得当前普通招生专业可直接核验的明确金额，因此继续保持未知。昆明铁道官网当前可访问的权威页面为 HTTP，构建器、验证器和测试仅加入 `kmtdzy.cn`/`www.kmtdzy.cn` 精确 legacy 白名单；昆明幼儿、昆明工业的非 `.edu.cn` 域名也仅加入 `kmyesf.cn`、`kmvtc.net` 精确白名单，未放宽任意非官方域名规则。第三方转载只作为检索线索，未作为入库依据。
- 实测结果：数据库为 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,821 所院校、6,199 条原始收费档，展开后 `official_fee_reference=6547`、`offering_matches=446`；按已覆盖的 `institution_pk` 统计，机构级未核验队列为 487 行。`validate_admissions_db.py` 为 53,936/53,936，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 构建与发布：构建清单官方学费配置规范化 SHA-256 为 `5069f1b5b6b06253f7dc0fed674d0cde4df146685f4fe5b87a7ac899a27020d8`，原始配置文件 SHA-256 为 `9f4d8f37b8d162307abdef54284a9fdb2d4fade46c0916bb31fa552fbc253912`，数据库 SHA-256 为 `e1b8e5cff7600ac45464a9721431e44dee721dd09225b0dbe25bea7187df8133`。本轮仍为本地可重建产物，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 487 个 institution 实体行。

## 2026-09-17 / official-tuition-increment-31：安徽 3 所院校官方学费补录

- 目的与实际修改：继续按机构级未核验队列检索，只采用学校官网、学校招生网或学校信息公开栏目及其官方附件。本轮新增安徽文达信息工程学院、安徽城市管理职业学院、合肥理工学院 3 所数据库已有院校，写入 4 条 `CNY + academic_year` 原始收费档；按数据库 2026 招生专业精确匹配，展开后新增 18 条费用引用。原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 官方来源与边界：安徽文达 2026 普通高考招生章程将智能制造工程、自动化、计算机科学与技术、商务英语、财务管理列入 23,800 元/生·学年档；安徽城市管理 2026 普高安徽省招生计划列示老年保健与管理 4,900 元/年、现代家政服务与管理 4,300 元/年；合肥理工学校信息公开栏目发布 2025—2026 学年收费公示并链接安徽省公办普通高校本科学费标准附件，当前 9 个理工本科专业按“大学类高校理科类”5,200 元/生·学年精确映射。住宿费、教材费、保险及其他代收代支不入库。
- 交叉核验与保守边界：三所均先查 2026 招生章程/招生计划，再以学校收费公示或省级标准附件复核；安徽中医药高专、安徽审计、安徽工业经济、安徽汽车和安徽新闻出版等本轮检索到的 2026 官方章程仍只写“按省价格主管等相关部门核定标准”，未取得当前普通高考专业的直接金额，继续保持未知。第三方网页只作为检索线索，未作为入库依据。
- 实测结果：数据库为 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,817 所院校、6,194 条原始收费档，展开后 `official_fee_reference=6511`、`offering_matches=410`；机构级未核验队列降至 491 所。`validate_admissions_db.py` 为 53,747/53,747，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 构建与发布：构建清单官方学费配置规范化 SHA-256 为 `9036629e3662b7dc2d13c978e997d6d46f8c272439fa09776555b17f58f2a0ec`，原始配置文件 SHA-256 为 `58066b6618bfa8d0ac0ba868f6c10978c62159e238f96e85809984ae237ecb46`，数据库 SHA-256 为 `84c8f00254109b909b819459c5d8b17ecd692e362cac86ecf7b0f848ef7144eb`。本轮仍为本地可重建产物，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 491 所院校。

## 2026-09-17 / official-tuition-increment-30：北京 2 所院校官方学费补录

- 目的与实际修改：继续按机构级未核验队列检索，只采用学校官网/学校招生网官方材料。本轮新增北京信息职业技术学院、北京第二外国语学院中瑞酒店管理学院 2 所数据库已有院校，写入 2 条 `CNY + academic_year` 原始收费档；专业精确匹配展开后新增 4 条数据库费用引用。原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 官方来源与边界：北京信息职业技术学院官网 2026 全国统一高考招生章程附件列示普通专业 6,000 元/学年、艺术类专业 8,000 元/学年，本批按当前数据库“物联网应用技术”精确匹配普通专业档；中瑞酒店管理学院官网 2026 级新生缴费通知单列示财务管理 49,800 元/学年，本批按当前数据库“财务管理”精确匹配。酒店管理官方条目带“酒店运营管理”等方向后缀，未按模糊名称映射；住宿费和军训教材等代收项目不入库，第三方网页未作为入库依据。
- 实施过程：临时批次 JSON 通过合并脚本 `--file` 写入后已删除；中瑞官网使用经核验的非 `.edu.cn` 域名，向构建器和验证器同时加入精确的 `bhiedu.cn` 白名单，不放宽任意非官方域名规则。
- 实测结果：数据库为 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,814 所院校、6,190 条原始收费档，展开后 `official_fee_reference=6493`、`offering_matches=392`；机构级未核验队列降至 494 所。`validate_admissions_db.py` 为 53,650/53,650，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 构建与发布：构建清单官方学费配置规范化 SHA-256 为 `fe713c3664d8e8bd0761ee48c4612ab1014c87cc7bf8c0809ec83cb0568f666c`，原始配置文件 SHA-256 为 `a368cdd40fe2b6c3762a62d37229fe96d0def42a400d35bdd08013affc0a5bc0`，数据库 SHA-256 为 `2c1388f7752fbf2133fd3109baec2b74da12a55c4f270204af37d62799510570`。本轮仍为本地可重建产物，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 494 所院校。

## 2026-09-17 / official-tuition-increment-29：安徽 3 所院校官方学费补录

- 目的与实际修改：继续按机构级未核验队列检索，只采用学校官网及学校信息公开网官方材料。本轮新增合肥共达职业技术学院、安徽电子信息职业技术学院、安徽财贸职业学院 3 所数据库已有院校，写入 9 条 `CNY + academic_year` 原始收费档；专业精确匹配展开后新增 12 条数据库费用引用。原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 官方来源与边界：合肥共达 2026 年普通高考招生章程将城市轨道交通运营管理、机械制造及自动化列为 8,200 元/年，将物联网应用技术、电梯工程技术列为 9,800 元/年；安徽电子信息官网 2026 年度收费表将机电一体化技术、电子信息工程技术、计算机应用技术按理科类精确对应 4,900 元/生·学年，软件技术另列 260 元/生·学分，因当前官方费用字段只接受学年制金额而未换算；安徽财贸 2026 年收费项目公示表将大数据与会计、旅游管理按官方文科类别对应 3,500 元/生·学年。住宿费、教材费和其他代收代支不入库，第三方网页未作为入库依据。
- 实施过程：临时批次 JSON 通过合并脚本 `--file` 写入后已删除；因合肥共达官网使用经核验的非 `.edu.cn` 域名，向构建器和验证器同时加入精确的 `hfgdxy.cn` 白名单，不放宽任意非官方域名规则。
- 实测结果：数据库为 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,812 所院校、6,188 条原始收费档，展开后 `official_fee_reference=6489`、`offering_matches=388`；机构级未核验队列降至 496 所。`validate_admissions_db.py` 为 53,626/53,626，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 构建与发布：构建清单官方学费配置规范化 SHA-256 为 `1ea7a836dcfa8cce7fab1a467097ce8a54ecb250bbc72eca3ee085d11baea647`，原始配置文件 SHA-256 为 `9787075dade2f0df0c1e5e552d96dd4dc37b6f4f5968389fa732d4e6efc52670`，数据库 SHA-256 为 `fe5e9bb2718379538a7809db55447d41b0f03098550da60f11b9087efd530a13`。本轮仍为本地可重建产物，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 496 所院校。

## 2026-09-17 / official-tuition-increment-28：河南 3 所院校官方学费补录

- 目的与实际修改：继续按机构级未核验队列检索，只采用学校官网、河南省教育考试院官方招生计划或河南省阳光高考平台官方审核材料。本轮新增黄河水利职业技术大学、长垣烹饪职业技术学院、林州建筑职业技术学院 3 所数据库已有院校，写入 15 条 `CNY + academic_year` 官方收费档；原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 官方来源与边界：黄河水利职业技术大学使用河南省阳光高考平台发布的学校 2026 普招招生章程，当前库 8 个同名专业按专业表金额精确匹配；长垣烹饪和林州建筑使用河南省教育考试院发布的《河南省2026年普通高等学校对口招收中等职业学校毕业生招生计划（专科）》官方 PDF，分别精确匹配 5 个、2 个当前专业。长垣的“学前教育（师范）”按数据库当前“学前教育”同名去除师范标注匹配；林州当前“财税大数据应用”未在该官方表中取得明确收费行，继续留空。住宿费、教材费及其他代收代支不入库，第三方网页未作为入库依据。
- 实施过程：河南省教育考试院同一官方 PDF 存在 `heao.com.cn` 预览镜像和 `haeea.cn` 官方附件地址；构建器白名单拒绝前者后，改用已允许的 `haeea.cn/attach/file/20260408/20260408103833_2199_a6ddea6a.pdf`，不放宽域名规则，也未改变收费证据内容。临时批次 JSON 通过合并脚本 `--file` 写入后已删除。
- 实测结果：数据库为 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,809 所院校、6,179 条原始收费档，展开后 `official_fee_reference=6477`，本批新增 22 条费用引用且 22 条精确挂接到当前招生专业；机构级未核验队列降至 499 所。`validate_admissions_db.py` 为 53,554/53,554，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 构建与发布：构建清单官方学费配置规范化 SHA-256 为 `a2a3699ad5316d111466d7dd08c2f91a5fd0e994d4473bf934c5965f83e03662`，原始配置文件 SHA-256 为 `681319de58863f5f5f265d24662f03fdb73c2789f3481982ee7aa7ca846718dc`，数据库 SHA-256 为 `bd6d8d8cf8290482577c431692f49b9ba4e8428c672d4ea33b7e8fe2c76c3c3f`。本轮仍为本地可重建产物，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 499 所院校。

## 2026-09-17 / official-tuition-increment-27：安徽、宁夏、天津 4 所院校官方学费补录

- 目的与实际修改：继续按机构级未核验队列检索，只接受学校官网或教育部阳光高考审核章程。本轮新增安徽国防科技职业学院、宁夏幼儿师范高等专科学校、天津渤海职业技术学院、天津滨海职业学院 4 所数据库已有院校，写入 9 条 `CNY + academic_year` 官方收费档；原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 官方来源与边界：安徽国防官网 2026 级收费公示列示汽车检测与维修技术 4,900 元/学年，住宿费及代收代支不并入；宁夏幼专官网 2026 高职单招简章明确师范专业宁夏户籍 420 元、非宁夏户籍 4,620 元，婴幼儿托育服务与管理和社会工作 4,620 元，按条件分别保留；天津渤海和天津滨海的教育部阳光高考审核章程分别列示一般/特殊（以及滨海艺术类）收费档，章程没有提供当前专业类别的可靠对应关系，保留院校级档案，不强行映射。第三方网页未作为入库依据。
- 实施过程：首次通过 PowerShell 标准输入合并时发现编码转换异常，源配置文件被截断；立即停止重建并从已校验源码包恢复，恢复文件 SHA-256 为上一轮记录的 `29fd600b553f7fb4bc9358634754e3a90a22dba31210ac02258891aecebd0f09`。随后改用 `apply_patch` 生成临时批次 JSON、合并脚本 `--file` 写入并删除临时文件，重新核对配置后才重建数据库。
- 实测结果：数据库为 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,806 所院校、6,164 条原始收费档，展开后 `official_fee_reference=6455`，本批新增 21 条费用引用，其中 16 条精确挂接到当前招生专业；机构级未核验队列降至 502 所。`validate_admissions_db.py` 为 53,426/53,426，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。
- 构建与发布：构建清单官方学费配置规范化 SHA-256 为 `26e5596eea647557e8eb861cb9769d670e2a3fde00e443bd2fa6163dc095c030`，原始配置文件 SHA-256 为 `0376a59e3a4bdb37687fcccb0aaa263cbfb0a2b6ffbf070698ff6f45db17a759`，数据库 SHA-256 为 `b2e45240f46a22242195f1566815aa2763379ead99be7a7176f7e36a19d66940`。本轮仍为本地可重建产物，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 502 所院校。

## 2026-09-17 / official-tuition-increment-26：天津、吉林、宁夏 3 所院校官方学费补录

- 目的与实际修改：继续按机构级未核验队列检索，只接受学校官网、官方省级教育/招生考试机构或河南省阳光高考平台审核的 2026 招生章程。本轮新增天津滨海汽车工程职业学院、吉林职业技术学院、宁夏警官职业学院 3 所数据库已有院校，写入 9 条可重建官方收费档；原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 官方来源与边界：天津滨海汽车工程职业学院官网章程明确 15,800/16,800/17,800 元/生·年三档；当前库只有 16,800 和 17,800 档能按同名专业精确匹配，15,800 档因当前库没有对应专业仅保留院校收费档。吉林职业技术学院使用河南省阳光高考官方平台审核章程，当前库内专业按 12,800/13,800/15,000/25,000/32,000 元档精确匹配。宁夏警官职业学院使用宁夏招生考试信息网发布的 2026 章程，学费为 4,600 元/生·学年，住宿费 800 元未并入。第三方网页未作为入库依据；新增 `tqzyxy.com`、`nxkszsedu.net` 的精确官方来源白名单。
- 实测结果：重建后数据库为 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,802 所院校、6,155 条原始收费档，展开后 `official_fee_reference=6434`，本轮增加 42 条费用引用，累计 `offering_matches=338`；机构级未核验队列降至 506 所；`validate_admissions_db.py` 为 53,313/53,313，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。构建配置规范化 SHA-256 为 `cb2694b2e1c552f5ae1dd159e92ebaecb908850ee89306060c5fa4673421cea0`，数据库 SHA-256 为 `c3d1697bc41757268ad313f725389c45c6a229b87ca4f0375e090084e9101c8a`。
- 发布边界与下一步：本轮仅更新本地可重建配置、SQLite、官方域名白名单、测试断言和接手文档，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 506 所院校，优先处理云南、内蒙古、北京、四川、安徽等队列。

## 2026-09-17 / official-tuition-increment-25：四川 2 所院校官方学费补录

- 目的与实际修改：继续按机构级未核验队列检索，只接受学校官网公开的 2026 招生计划或收费公示。本轮新增南充卫生职业学院、江阳城建职业学院 2 所数据库已有院校，写入 6 条可重建官方收费档；南充官网 5 个首批专业均为 5,800 元/生·年，江阳城建官网 40 个专科专业按官网表格原值归并为 11,130、12,500、13,250、14,500、15,370 元/学年 5 档。
- 官方来源与边界：使用[南充卫生职业学院 2026 年招生计划](https://ncwzy.com/)和[江阳城建职业学院 2026 年学费、住宿费收费标准](https://www.jyccc.cn/info-public/2207)。收费金额仅按官网表内专业名称与当前招生库精确匹配；住宿费、教材费、保险和未在专科收费表中明确覆盖的项目不写入，原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。为接收两所学校经核验的非 `.edu.cn` 官网，构建器、独立验证器和测试断言新增 `jyccc.cn`、`ncwzy.com` 精确 HTTPS 白名单，任意其他非白名单域名仍拒绝。
- 实测结果：重建后数据库为 2,308 所院校、51,878 条招生计划；官方可重建目录覆盖 1,799 所院校、6,146 条原始收费档，展开后 `official_fee_reference=6392`，本轮增加 70 条专业费用引用，累计 `offering_matches=298`；机构级未核验队列降至 509 所；`validate_admissions_db.py` 为 53,093/53,093，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。构建清单官方学费配置 SHA-256 为 `01b8b49f91889925fb357a76ad62763955398e0cbeef5b9ec603439859c97533`，数据库 SHA-256 为 `5baaafeea5165b2daf355f4450f73f7f44067dcfa6812ed69c84958e6571cf26`。
- 发布边界与下一步：本轮仅更新本地可重建配置、SQLite、官方域名白名单、测试断言和接手文档，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 509 所院校，优先处理既定云南、内蒙古、北京、吉林、四川、天津、宁夏和安徽队列。

## 2026-09-17 / official-tuition-increment-24：吉林、天津、甘肃、新疆 8 所院校官方学费复核

- 目的与实际修改：继续按机构级未核验队列检索，只接受教育部阳光高考审核的 2026 招生章程/招生计划和学校官方招生网收费表。本轮复核并替换 8 所院校的旧收费条目，保留 28 条可重建官方收费档：吉林科技职业技术学院、天津商务职业学院、天津职业大学、天津艺术职业学院、甘肃工业职业技术大学、甘肃交通职业技术学院、兰州资源环境职业技术大学、新疆工业职业技术大学。专业金额只与当前数据库招生专业精确匹配；只有类别区间或当前没有对应专业的金额保留为院校收费档案，不强行套用。
- 官方来源与边界：吉林科技、天津商务、天津职业、天津艺术、甘肃工业、甘肃交通、兰州资源环境使用教育部阳光高考审核章程/招生计划；新疆工业使用学校官方招生网的 2026 直升高职专业收费表及更名后的招生章程。新疆旧页面仍以“新疆轻工职业技术学院”发布，官方新章程说明现名为“新疆工业职业技术大学”。住宿费、教材费、保险和未能与当前招生专业可靠对应的金额不写入专业精确收费。
- 实测结果：重建后数据库为 2,308 所院校、51,878 条招生计划；官方可重建目录覆盖 1,797 所院校、6,140 条原始收费档，展开后 `official_fee_reference=6322`，其中 `offering_matches=228`；机构级未核验队列降至 511 所；`validate_admissions_db.py` 为 52,735/52,735，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。构建清单中的官方学费配置 SHA-256 为 `0d8d4c7741c2d369cad079c61e9a61968a2e0ac765e71f0b100e2ac3d0477932`，数据库 SHA-256 为 `835e4e37c43429cbc06d0dd552e490b73ff01c904e349d0d5aea36559494e7ae`。
- 发布边界与下一步：本轮仅更新本地可重建配置、SQLite、测试断言和接手文档，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 511 所院校，官方无法核实的继续保持未知。

## 2026-09-17 / official-tuition-increment-23：贵州、湖北、重庆、山东 5 所院校官方学费补录

- 目的与实际修改：继续按院校未核验队列，只采用学校官网收费/招生材料、重庆市人民政府网发布的学校招生章程或河南省阳光高考平台审核章程；新增 5 所数据库已有院校、15 条可重建目录收费档。专业精确匹配展开后，本轮增加 82 条数据库费用引用，累计 `official_fee_reference=6209`。
- 覆盖院校与官方来源： [贵阳康养职业大学 2026 年本、专科招生章程](https://16206.gaokao.haedu.cn/policy/brochure/2026/0623/155253.html)；[贵州轻工职业大学 2026 年招生章程](https://www.gzqy.cn/zsw/info/1089/1481.htm)；[荆楚理工学院财务处 2026—2027 学年收费目录页面](https://cwc.jcut.edu.cn/info/1014/1683.htm)及[官方 PDF](https://cwc.jcut.edu.cn/__local/1/03/78/6A56C3C91AA3D1A87044D16F86F_2B80F8A1_A059F.pdf)；[重庆电子科技职业大学 2026 年普通高考招生章程](https://www.cq.gov.cn/zwgk/zfxxgkml/zdlyxxgk/jy1/jyzt/gz2026nqggk/zsjz/202606/t20260602_15720677.html)；[山东农业工程学院 2026 年本专科学费标准页面](https://www.sdaeu.edu.cn/xwgk/info/1183/2673.htm)及[官方 PDF](https://www.sdaeu.edu.cn/__local/C/E9/EF/AD83D3FB8517D70CA04FAA398BA_837E155F_1266D.pdf)。
- 来源与边界：贵阳康养按当前数据库专业精确写入 4,100/4,200 元档；贵州轻工按普通类专科 3,850 元写入，艺术和中外合作办学未推断；荆楚理工按园艺 3,000、4,000 元档、5,200 元档的专业名单精确写入；重庆电子科技章程只给艺术传播类 8,800—11,000 元和其他专业 6,490—8,050 元区间，数据库保留官方区间，不猜具体单值；山东农业工程按官方 PDF 的学分制年平均数写入，并在证据备注保留“100 元/学分、具体缴费以系统为准”的限制。住宿费、教材费、保险、资助金额和未与当前招生专业对应的收费档不入库。为接收贵州轻工职业大学官网的经核验非 `.edu.cn` 域名，构建器与独立验证器新增 `gzqy.cn` 精确 HTTPS 白名单。
- 实测结果：重建后数据库为 2,308 所院校、51,878 条招生计划；官方可重建目录覆盖 1,796 所院校、6,129 条收费档，展开后 `official_fee_reference=6209`、累计 `offering_matches=111`，机构级未核验队列降至 512 所；`validate_admissions_db.py` 为 52,154/52,154，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。配置文件 SHA-256 为 `a72718c6beb66b6292e4c0ec745b8e823ed9aa1fad98d542b91c0425580a10b7`，数据库 SHA-256 为 `1b451d193d04eda128f5c0a08cef6bbd792dc409425ad9c8aaa38402a585989f`。
- 发布边界与下一步：本轮仅更新本地可重建数据、来源白名单、测试断言和文档，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续检索剩余 512 所院校，官方无法核实的仍保持未知。

## 2026-09-17 / official-tuition-increment-22：云南与吉林 5 所院校官方学费补录

- 目的与实际修改：继续处理机构级未核验队列，只采用学校官网 2026 年招生章程、学校官网收费目录/收费公示，或河南省阳光高考平台审核发布的 2026 年招生章程；新增 5 所数据库已有院校、18 条可重建目录收费档，并将 16 条按专业精确匹配规则写入数据库的专业范围。
- 覆盖院校与官方来源： [昭通卫生职业学院 2026 年普通高考招生章程](https://www.ztwzy.cn/html/907/2026-06-24/content-3996.html)（5000 元/生·年）；[大理护理职业学院 2026 年招生章程](https://portal.dlhlzyxy.edu.cn/zswz/#/index/functionColumn/article/details?wzid=cb2aff65-3834-4d5c-8b54-85b67d52bbc7&lmid=b26857c4-e5a3-4125-900a-bba49960dadf)（5000 元/生·年）；[吉林交通职业技术学院 2026 年高职分类招生章程](https://zsc.jljy.edu.cn/info/1004/1838.htm)（按数据库已有专业列示 5000/5500 元档）；[吉林水利电力职业学院收费信息](https://www.jlsy.edu.cn/info/2147/17731.htm)（数据库已有水利水电建筑工程专业 5500 元/生·学年）；[通化医药健康职业学院 2026 招生章程](https://14744.gaokao.haedu.cn/policy/brochure/2026/0623/153739.html)（按数据库已有专业列示 3300—6000 元档）。
- 来源与边界：收费金额严格按来源原文登记；吉林水利电力职业学院收费目录发布日期为 2025-05-07，证据备注保留来源日期和“未发现后续官方变更”的边界；“待定”专业不写入；住宿费、教材费、保险、资助金额不写入。构建器和独立验证器新增 `ztwzy.cn` 这一条经过核验的学校官网精确白名单，不接受任意非白名单 `.cn` 页面或普通 HTTP 来源。原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 实测结果：重建后数据库为 2,308 所院校、51,878 条招生计划；官方可重建目录覆盖 1,791 所院校、6,114 条收费档，因专业精确匹配展开为 `official_fee_reference=6127`，剩余 517 所院校未核验到官方明确金额；`validate_admissions_db.py` 为 51,724/51,724，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。配置 SHA-256 为 `18495cbb8b45b85669e30cebb3f360674f05e300dedaf2dd9062a7ae5e816c1b`，数据库 SHA-256 为 `c2ec8de4413b2ea63a96f610381a602ee8807680919f3992162f0690c3778658`。
- 发布边界与下一步：本轮仅更新本地可重建数据、白名单、独立校验规则、测试断言和文档，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续按云南、内蒙古、北京、吉林、四川、天津、宁夏和安徽等剩余 517 所院校队列检索。

## 2026-09-17 / official-tuition-increment-21：云南与河南 6 所院校官方学费补录

- 目的与实际修改：继续处理机构级未核验队列，只采用学校官网收费公示/收费目录、学校官网 2026 年招生章程或河南省阳光高考信息平台审核章程；新增 6 所数据库已有院校、12 条 `CNY + academic_year` 收费记录，合并到 `official_tuition_sources.json` 并重建 SQLite。
- 覆盖院校：郑州幼儿师范高等专科学校（5 档，学校官网 2026 普通高招章程）、郑州电力高等专科学校（3 档，河南省阳光高考平台 2026 对口章程）、云南财经职业学院（1 档，河南省阳光高考平台 2026 章程）、云南特殊教育职业学院（1 档，学校官网 2025-2026 学年收费公示）、云南国防工业职业技术学院（1 档，学校官方收费目录）、云南水利水电职业学院（1 档，学校官方收费公示）。
- 来源与边界：郑州幼儿师范高等专科学校的 5 档保留文科、理工、医学、艺术和学前教育分类；郑州电力高等专科学校只登记章程明确的 3,700/4,200/4,600 元档，不推算章程所述可能上浮金额。云南水利水电职业学院的官方公示日期为 2018-07-19，明确适用 2016 年秋季及以后入学大专生；本轮未找到后续官方变更，因此在证据备注中保留适用范围和来源日期，不表述为无条件的 2026 标准。住宿费、教材费、保险、资助金额和无法可靠读取的附件金额不写入。
- 实测结果：重建后数据库为 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,786 所院校、6,096 条收费记录，按院校规范化名称剩余 522 所未核验；`validate_admissions_db.py` 为 49,762/49,762，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。配置 SHA-256 为 `24258c1aee9e9867ba08875790b4e7d9dd02519e2abb1c2202b6957c9fb8a7e4`，数据库 SHA-256 为 `5930b34a39741602511dbd657769b6227eb55cada03e64944bb1b6a47ff93cf0`。
- 发布边界与下一步：本轮仅更新本地可重建数据，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续按云南、内蒙古、北京、吉林、四川、天津、宁夏和安徽等剩余 522 所院校队列检索。

## 2026-09-17 / official-tuition-increment-20：河南 4 所院校官方章程补录

- 目的与实际修改：继续处理机构级未核验队列，只采用学校官网或河南省阳光高考信息平台审核发布的 2026 招生章程；新增 4 所数据库已有院校、14 条 `CNY + academic_year` 收费记录，合并到 `official_tuition_sources.json` 并重建 SQLite。
- 覆盖院校：河南工业职业技术大学（6 档，官网单独考试招生专业表）、郑州医药健康职业学院（4 档，官网普通高招招生专业表）、焦作师范高等专科学校（3 档，河南省阳光高考平台对口招生章程）、郑州卫生健康职业学院（1 档，河南省阳光高考平台单招章程）。招生类型范围在收费标签和证据说明中保留；住宿费、教材费、保险或未被证据覆盖的专业不作推断。
- 来源与边界：本轮 3 份来源为学校官网，1 份来源为河南省阳光高考平台；构建器与验证器继续只允许教育/学校官方 HTTPS 来源，河南平台使用上一批已核验的 `haedu.cn` 精确白名单。原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 实测结果：重建后数据库为 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,780 所院校、6,084 条收费记录，按院校规范化名称剩余 528 所未核验；`validate_admissions_db.py` 为 49,702/49,702，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。配置 SHA-256 为 `824323e395e33b1567dc0975b871575a75785a6ccd5b893a6daa00916cd4ce74`，数据库 SHA-256 为 `e09ee315357edf73d09abb47490b1ba2beef086095067ba1cd919b443bc89c1f`。
- 发布边界与下一步：本轮仅更新本地可重建数据，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续按 528 所未核验院校及官方来源队列检索。

## 2026-09-17 / official-tuition-increment-19：河南 8 所院校官方招生章程补录

- 目的与实际修改：继续处理机构级未核验队列，只采用河南省阳光高考信息平台审核发布的 2026 年招生章程及河南水利与环境职业学院招生信息网官方章程；新增 8 所数据库已有院校、35 条 `CNY + academic_year` 收费记录，写入 `official_tuition_sources.json` 并重建 SQLite。
- 覆盖院校：三门峡社会管理职业学院（3 档）、河南工业和信息化职业学院（3）、河南应用技术职业学院（5）、南阳工艺美术职业学院（3）、安阳幼儿师范高等专科学校（3）、平顶山工业职业技术学院（7）、开封文化艺术职业学院（5）、河南水利与环境职业学院（6）。收费档按原章程保留文/理/医/艺分类、专业上浮标准和中外合作项目，不把住宿费、教材费、保险或资助金额并入学费。
- 来源与边界：前 7 所采用河南省阳光高考平台的 2026 官方招生章程，河南水利与环境职业学院采用学校招生信息网 2026 年普招招生章程；页面均明确院校名称、办学/招生信息和收费金额。构建器与验证器新增 `haedu.cn` 省级教育招生官方域名的精确白名单，仍不接受任意非官方 `.cn` 页面或普通 HTTP 来源；原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 实测结果：重建后数据库为 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,776 所院校、6,070 条收费记录，按院校规范化名称剩余 532 所未核验；`validate_admissions_db.py` 为 49,632/49,632，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。配置 SHA-256 为 `7c157d798ab22dfde8f527cb5e1790ddb90dbd5c7e350335c2728914b5ba2927`，数据库 SHA-256 为 `c101b6f8626969987078146da72a3cddcc2ed3f2d8440f346d59ca864c89312d`。
- 发布边界与下一步：本轮仅更新本地可重建数据，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续按 532 所未核验院校及官方来源队列检索。

## 2026-09-17 / official-tuition-increment-18：河南省教育考试院对口专科计划补录

- 目的与实际修改：继续处理未核验队列，读取河南省教育考试院发布的[河南省 2026 年普通高等学校对口招收中等职业学校毕业生招生计划（专科）](https://www.haeea.cn/attach/file/20260408/20260408103833_2199_a6ddea6a.pdf)。该官方 PDF 的表头明确为“学费标准（元/年）”，本轮新增 11 所数据库已有院校、41 条 `CNY + academic_year` 记录，合并到 `official_tuition_sources.json` 并重建 SQLite。
- 覆盖院校：河南护理职业学院（3 档）、河南推拿职业学院（3）、鹤壁职业技术学院（5）、济源职业技术学院（4）、南阳科技职业学院（4）、南阳农业职业学院（3）、濮阳职业技术学院（5）、商丘职业技术学院（3）、郑州体育职业学院（6）、郑州职业技术学院（3）、焦作新材料职业学院（2）。这些是官方对口专科计划中实际出现的收费档，未扩展为所有普通高考专业的收费承诺。
- 解析与边界：修正 `import_henan_plan_pdfs.py` 对对口专科表中“计划人数—学制—学费”列顺序的解析；焦作新材料职业学院的校名与“民办”状态跨行排版，另按同一 PDF 的专业行逐页复核 9,800/10,800 元。住宿费列、教材费、保险和其他代收费均未写入，原始 `plan_record.tuition_*` 与 `TUITION_PENDING=797` 未改写。
- 实测结果：重建后数据库为 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,768 所院校、6,035 条收费记录，按院校规范化名称剩余 540 所未核验；`validate_admissions_db.py` 为 49,457/49,457，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。配置 SHA-256 为 `dd6fbe60afa535fd783c5c4c08b6776a4b1c9aade405d8c6e57845a212c8fc88`，数据库 SHA-256 为 `7b7c365117d041fff580a657fbf813f3e119660b140477f2687c1b36c220a900`。
- 发布边界与下一步：本轮仅更新本地可重建数据，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续按 540 所未核验院校及官方来源队列检索。

## 2026-09-17 / official-tuition-increment-17：继续补录云南、内蒙古、广东与广西院校官方学费

- 目的与实际修改：继续逐校读取学校官网、学校官方招生章程/计划、自治区招生考试机构计划及学校官方收费公示；本轮新增 30 所数据库已有院校、92 条 `CNY + academic_year` 官方收费档，写入 `pipelines/task03/official_tuition_sources.json`，重建本地 SQLite，并同步测试断言与来源文档。
- 覆盖范围：云南新增 5 所/6 条，内蒙古新增 8 所/12 条，广东新增 2 所/12 条，广西及北海新增 15 所/62 条。来源包括[内蒙古招生考试信息网 2026 高职单招计划 A 类](https://www.nm.zsks.cn/ztzl/2026gzdz/202602/t20260209_46225.html)、[南宁职业技术大学 2026 招生计划](https://zs.nnvtu.edu.cn/info/1096/8082.htm)、[广西机电职业技术学院 2026 招生章程](https://zs.gxcme.edu.cn/info/1041/1890.htm)、[广西城市职业大学 2026 招生章程](https://www.gxcvu.edu.cn/zsjy/zsxx/zszc/content_9791)、[柳州城市职业学院 2026 招生章程](https://www.lcvc.edu.cn/zsjyc/info/1061/1705.htm)及[百色职业学院官方收费公示](https://www.gxbszy.cn/index.php?c=show&id=6887)。完整逐校映射在 `TASK03_SOURCE_MAPPING.md`。
- 边界：只登记官方页面或官方附件中明确列出的学费金额；住宿费、教材费、保险和其他代收费不并入。百色职业学院本轮仅依据“新增、调整专业收费标准”官方公示写入对应专业档，不向其他专业扩展；广西经济职业学院、广西职业师范学院等仍未取得可直接核实的官方具体金额，保持未核验。原始 `plan_record.tuition_*` 和 `TUITION_PENDING=797` 未改写。
- 代码与配置：为接受本轮经核验的非 `.edu.cn` 学校官网，构建器和独立验证器增加了 `bma-bh.com`、`bhkyxy.com`、`gxtznn.com`、`gxuie.cn`、`gxaqzy.cn`、`gxxd.net.cn`、`gxbszy.cn`、`gxstzy.cn` 的精确 HTTPS 白名单；任意其他非白名单 HTTP/非官方域名仍拒绝。同步更新 `test_admissions_db.py` 预期计数及相关专题文档。
- 实测结果：重建后数据库为 2,308 所院校、51,878 条招生计划；官方目录覆盖 1,757 所院校、5,994 条收费记录，按院校规范化名称剩余 551 所未核验；`validate_admissions_db.py` 为 49,252/49,252，TASK-03 Python 测试 58/58（核心数据库测试 53/53），SQLite `integrity_check=ok`。配置 SHA-256 为 `3cc5f9d94b03425aea0d3816392a074c875011be3dd2ab5038db2b02bd970fa4`，数据库 SHA-256 为 `506b5f396a14f536c67d1c51d28ef0d64e083fad0769323ad775963ff00c5212c`。
- 发布边界与下一步：本轮仅更新本地可重建数据，`publication_status=NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；下一轮继续按未核验队列检索，仍以官方明确金额为入库门槛。

## 2026-09-16 / official-tuition-increment-16：江苏院校官方收费继续补录

- 目的：继续只从学校招生网官方招生章程、官方招生计划或其官方附件读取 2026 年明确学费；住宿费、教材费、保险及其他代收费不写入，原始 `plan_record.tuition_*` 不覆盖。
- 本轮新增 9 所数据库已有院校、40 条 `CNY + academic_year` 记录：南通科技职业学院（农林 2,200、文科 4,700、理科/工科 5,300、艺术 6,800 元/年，5 条）；南通职业大学（文科 4,700、工科 5,300、艺术 6,800，3 条）；盐城工业职业技术学院（文科 4,700、工科 5,300、体育 4,800、艺术 6,800，4 条）；常州纺织服装职业技术学院（文科 4,700、工科 5,300、艺术 6,800，3 条）；常州工业职业技术学院（文科 4,700、工科 5,300、体育 4,800、艺术 6,800、中外合作 15,000，5 条）；扬州职业技术大学（本科设施园艺 2,750、婴幼儿发展与健康管理 5,200、医养照护与管理 6,800、普通工科 5,800、中外合作 26,400；专科文科 4,700、工科 5,300、医药卫生 6,200、体育 4,800、艺术 6,800，10 条）；徐州幼儿师范高等专科学校（文科 4,700、工科 5,300、体育 4,800、艺术 6,800、医药卫生 6,200、中外合作 18,800，6 条）；江苏航空职业技术学院（工科类 5,300，1 条）；无锡南洋职业技术学院（文科 16,000、理工科 18,000、医学艺术类 20,000，3 条）。
- 官方来源： [南通科技职业学院 2026 章程](https://zs.ntst.edu.cn/2026/0514/c1121a54155/page.htm)、[南通职业大学 2026 章程](https://zsw.ntvu.edu.cn/2026_06/23_08/content-36041.html)、[盐城工业职业技术学院 2026 章程](https://zs.ycpc.edu.cn/2026/0609/c1316a63663/page.htm)、[常州纺织服装职业技术学院 2026 章程](https://rongmeiti.cztgi.edu.cn/_s6/2026/0618/c3202a88833/page.psp)、[常州工业职业技术学院 2026 章程](https://zs.ciit.edu.cn/2026/0609/c1154a142786/page.htm)、[扬州职业技术大学 2026 招生计划](https://zsjy.yzpc.edu.cn/2026/0609/c2632a73972/page.htm)、[徐州幼儿师范高等专科学校 2026 章程](https://zjc.xzyz.edu.cn/info/1098/4694.htm)、[江苏航空职业技术学院 2026 章程](https://zs.jatc.edu.cn/2026/0601/c609a21977/page.htm)、[无锡南洋职业技术学院 2026 高职提前招生简章](http://zs.wsoc.edu.cn/info/1035/1975.htm)。常州两校的官方页面以校方发布的 2026 章程/PDF 为证；无锡南洋招生网该页目前仅提供同校官方 HTTP 入口，已在构建器和验证器中设置单一精确白名单，其他任意 HTTP 来源仍拒绝。
- 实测：数据库重建通过；2,308 所院校、51,878 条招生计划，官方目录 1,727 所院校、5,902 条记录，按当前数据库院校实体去重后剩余 581 所未核验；`TUITION_PENDING=797` 保留原始计划级事实。官方目录规范化配置 SHA-256 为 `2a059bf79597ff8915efd32b044a59c5fdd632b69c1345062c91385c835ce0d9`，数据库 SHA-256 为 `20f1b1ee4e063c586a3d4965b200eda37a5ea58de81a95a111a66d0d42f61fd6`。
- 验证：`py -3.12 pipelines/task03/validate_admissions_db.py` 为 48,792/48,792 通过；`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58 通过，其中 `test_admissions_db.py` 53/53。未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 2026-09-16 / official-tuition-increment-15：山东官方计划与济南护理校方计划补录

- 目的：继续从学校官网和省级招生考试机构官方材料核验剩余院校；本轮不采信第三方转载，也不把住宿费、教材费、保险或其他服务性收费当作学费。
- 济南护理职业学院：学校招生就业处官方[2026 年单独招生专业计划表](https://zs.jnnvc.edu.cn/articles/3531)在专业行明确列示 6,000、6,900 元/年/生，新增 1 所院校、2 条收费记录。
- 山东省教育招生考试院：官方[2026 年春季高考专科批第 2 次志愿院校专业计划](https://www.sdzk.cn/NewsInfo.aspx?NewsID=7325)及其[官方 XLS 附件](https://www.sdzk.cn/Floadup/file/20260730/6392102228579453507227548.xls)的列名为“收费标准（元/年）”。与数据库未核验队列按院校全名交叉比对后，新增 13 所院校、33 条收费档；每校只记录该官方表中实际出现的不同档次，不向未列专业扩展。
- 本轮新增院校：曲阜远东职业技术学院、东营职业学院、山东圣翰财贸职业学院、青岛求实职业技术学院、烟台理工学院、山东外事职业大学、潍坊理工学院、青岛远洋船员职业学院、山东海事职业学院、山东艺术设计职业学院、日照航海工程职业学院、德州工程职业学院、日照康养职业学院，以及济南护理职业学院。
- 边界记录：潍坊科技学院财务处发布了[2026 年学费、住宿费、服务性收费标准公告](https://cwc.wfust.edu.cn/info/1011/1368.htm)，但官方 XLS 附件下载要求验证码，当前无法从公开正文核对具体学费数字，因此没有写入数据库；不以可猜测的旧年度或第三方数字替代。
- 实测：重建后数据库为 2,308 所院校、51,878 条招生计划；官方目录 1,718 所院校、5,862 条记录；按当前数据库院校实体去重后剩余 590 所未核验。`TUITION_PENDING=797` 保留原始计划级事实。
- 验证：`py -3.12 pipelines/task03/validate_admissions_db.py` 为 48,592/48,592 通过；`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58 通过，其中核心数据库测试 53 项；数据库 SHA-256 为 `3504deef91e5667907c87aa12204d7a084cce16a723533829527b0af5f8be7c5`。
- 工程变更：将已核验的 `sdzk.cn` 加入构建器与验证器的省级考试院官方域名白名单；新增官方计划、测试预期及文档均与本轮数据同次同步。未部署、未推送、未做浏览器视觉验收，云端开关保持关闭。

## 2026-09-16 / official-tuition-increment-14：四川高职单招官方计划批量补录

- 目的：继续使用省级招生考试机构官方材料核验剩余院校。四川省教育考试院的 2026 年高职单招“普高类”计划页及其 21 张官方计划图片在专业行明确列示“收费标准”；本轮按图片逐页核对第 1—21 页，仅把已列专业的同一收费档登记为院校级官方证据，不向未列专业扩展。
- 本轮新增：39 所数据库内院校、113 条 `CNY + academic_year` 记录，覆盖四川及该官方计划页列示的新疆兵团院校。金额范围为 3,300—18,000 元/年；住宿费、教材费、保险及其他代收费未写入。四川省教育考试院官方来源：[2026 年高职单招招生专业及计划（普高类）](https://www.sceea.cn/gzdz/dzjh/pg.html)。
- 代表性覆盖：四川幼儿师范高等专科学校、达州职业技术学院、四川机电职业技术学院、绵阳职业技术学院、成都农业科技职业学院、乐山职业技术学院、南充文化旅游职业学院、甘孜职业学院、德阳科贸职业学院、天府新区通用航空职业学院、达州中医药职业学院、内江卫生与健康职业学院、阿坝职业学院、西昌民族幼儿师范高等专科学校、攀枝花攀西职业学院、资阳口腔职业学院、遂宁能源职业学院、遂宁工程职业学院、图木舒克职业技术学院、铁门关职业技术学院、塔里木职业技术学院、昆玉职业技术学院等；完整收费档和证据 URL 保存在 `pipelines/task03/official_tuition_sources.json`。
- 实测：数据库重建 `status=passed`、`integrity_check=ok`；2,308 所院校、51,878 条招生计划，官方目录 1,704 所院校/5,827 条记录；按规范化校名去重后 604 所仍未核验，计划级 `TUITION_PENDING=797` 保持原始事实。数据库 SHA-256 为 `658b2efbf0f38d7e246848091b2a02e2cf64800c5b2235d87dd1fd836bc47a1d`。
- 验证：`validate_admissions_db.py` 48,417/48,417 通过；`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58 通过，其中 `test_admissions_db.py` 53 项。原始 `plan_record.tuition_*` 未覆盖。
- 边界：本轮未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；文档同步命令在本轮收尾执行。

## 2026-09-16 / official-tuition-increment-13：继续补录官方学费

- 目的：继续只使用学校官网或省级教育考试机构官方页面中的 2026 明确金额，补录尚未覆盖的院校；住宿费、教材费、保险等代收费不转入学费目录。
- 本轮新增：四川中医药职业学院 1 条、四川质量工程职业技术学院 2 条、四川财经职业学院 1 条、成都工贸职业技术学院 20 条，共 4 所现有院校、24 条 `CNY + academic_year` 记录。四川质量工程职业技术学院的收费表以官网图片附件发布，保留 5,200/5,800 元两档；四川财经职业学院仅写入 2026 章程明确的中外合作专业 16,000 元；成都工贸职业技术学院按 2026 官方招生计划逐专业写入 4,800/5,200 元两档。
- 官方来源：[四川中医药职业学院 2026—2027 学年收费公示](https://www.scvctcm.com/article/1321)、[四川质量工程职业技术学院 2026—2027 学年度收费标准](https://www.scqec.edu.cn/info/1024/1451.htm)、[四川财经职业学院 2026 年高职单招章程（四川省教育考试院）](https://www.sceea.cn/GZDZ/Html/140910.html)、[成都工贸职业技术学院 2026 年招生计划](https://zsx.cdgmxy.edu.cn/html/zsxxw/zsxxw_zsjh/52243.html)。
- 实测：数据库重建 `status=passed`、`integrity_check=ok`；2,308 所院校、51,878 条招生计划，官方目录 1,665 所院校/5,714 条记录；按规范化校名去重后 643 所仍未核验，计划级 `TUITION_PENDING=797` 保持原始事实。数据库 SHA-256 为 `40d26b4bf22432b4e30c2570ffe198184ec69832ad8a192ebf7a59220a0c853b`。
- 验证：`validate_admissions_db.py` 47,852/47,852 通过；`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58 通过，其中 `test_admissions_db.py` 53 项。原始 `plan_record.tuition_*` 未覆盖。
- 边界：本轮未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；文档同步命令在本轮收尾执行。

## 2026-09-16 / official-tuition-increment-12：继续补录官方学费

- 目的：继续从学校官网、教育主管部门招生计划和官方收费公示中核验数据库剩余院校学费；仅写入能看到明确金额的当前官方记录，未把旧年度标准或“按省级标准执行”转换成 2026 学费。
- 本轮新增：云南轻纺职业学院 2 条、广安理工学院 1 条、内蒙古美术职业学院 2 条，共 3 所现有院校、5 条 `CNY + academic_year` 记录。云南轻纺普通/艺术类分别为 5,000/10,000 元；广安理工六个本科专业均为 5,200 元；内蒙古美术职业学院官方自治区招生计划中已列出的专业为 8,800/12,000 元两档。
- 官方来源：[云南轻纺职业学院 2026 招生章程](https://www.ynqfzyxy.cn/temp/1779497472855.pdf)、[广安理工学院 2026—2027 学年度收费标准](https://www.gait.edu.cn/info/1054/5601.htm)、[内蒙古招生考试信息网 2026 高职单招专栏](https://www.nm.zsks.cn/ztzl/2026gzdz/202602/t20260209_46227.html)。为接受经核验的非 `.edu.cn` 学校官网，本轮将 `ynqfzyxy.cn` 加入构建器/验证器显式白名单；`nm.zsks.cn` 加入省级考试机构白名单。
- 实测：数据库重建 `status=passed`、`integrity_check=ok`；2,308 所院校、51,878 条招生计划，官方目录 1,661 所院校/5,690 条记录；按规范化校名去重后 647 所仍未核验，计划级 `TUITION_PENDING=797` 保持原始事实。数据库 SHA-256 为 `80180eba6ea33fc3a75fed85d083e461a007efb69b392d5335132d26d9d9b316`。
- 验证：`validate_admissions_db.py` 47,732/47,732 通过；`py -3.12 -m unittest discover -s pipelines/task03 -p 'test_*.py'` 为 58/58 通过，其中 `test_admissions_db.py` 53 项。原始 `plan_record.tuition_*` 未覆盖。
- 边界：云南特殊教育职业学院 2026 招生简章正文只有图片，官网可直接读取的 5,000 元金额来自 2025 招生章程；本轮未把旧年度金额冒充 2026 写入。未部署、未推送、未做浏览器视觉验收，云端开关保持关闭；文档同步命令待本轮收尾执行。

## 2026-09-16 / official-tuition-complete-11：完成剩余院校首轮官方学费检索

- 目标：完成此前排队的 700 所院校的首轮官方学费检索；来源限定为学校官网、教育部阳光高考审核招生章程，以及省级教育考试/教育主管部门发布的 2026 招生计划收费列。
- 检索与复核：700/700 已扫描；严格身份条件为院校全名、2026 年页面和原始 `schId` 同时匹配。临时“附近金额”规则命中的 32 条候选全部撤回，改为只解析收费章节，并在住宿费、资助政策或后续章节前截断；最终保留 32 所院校、114 条收费记录，668 所仍无官方明确金额。7 所（云南旅游职业学院、北京金融科技学院、唐山工业职业技术大学、张家口职业技术学院、武汉电力职业技术学院、银川科技学院、首都师范大学科德学院）另做了逐页人工复核。
- 代表性官方证据： [福建省教育考试院 2026 招生计划公告](https://www.eeafj.cn/gkptgkgsgg/20260624/14715.html)、[河南省教育考试院计划 PDF](https://www.haeea.cn/attach/file/20260408/20260408103833_2199_a6ddea6a.pdf)、[广东省 2026 官方招生计划 PDF](https://szeb.sz.gov.cn/attachment/1/1698/1698967/12710895.pdf)、[上海纽约大学 2026 审核章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-539086822%2CinfoId-7635926758.dhtml)、[银川科技学院 2026 审核章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-6675760%2CinfoId-7670786449.dhtml)。全部 32 条来源映射见 `TASK03_SOURCE_MAPPING.md`。
- 结果：官方目录累计 1,639 所院校、5,594 条收费记录；`official_fee_reference` 与配置一致，独立院校数 1,639。原始 `plan_record.tuition_*` 未覆盖；机构级未核实数为 668（按规范化校名去重）。源工作簿有 1 条重复的“厦门大学”院校行，因此按 `institution_pk` 行数看未匹配行是 669；计划级 `TUITION_PENDING=797` 保留原状。
- 数据产物：更新 `official_tuition_sources.json`、CHSI 扫描队列/进度、计划导入报告、SQLite 数据库、验证断言及相关文档；`build_admissions_db.py` 重建通过，数据库 SHA-256 为 `a121fdc81824900cff12d42380fb0898441e83690e22ed6925d3cd1434b2e1e0`；全量 TASK-03 Python 测试 58 项通过，其中核心数据库测试 53 项。
- 边界：本轮只更新本地可重建数据，不部署、不推送、不改变云端开关；后续仅在官方渠道出现明确金额时增量核验。

## 2026-09-16 / official-tuition-continuation-10：继续补录吉林民办院校官方学费

- 目的：继续逐校核验 2026 年学费，只登记学校招生网或教育部阳光高考审核章程明确的金额；民办本科、艺术类、中外合作办学和专科按官方分类保留，待定项目不做推断。
- 本轮新增：`吉林外国语大学` 7 条、`吉林师范大学博达学院` 4 条、`长春光华学院` 2 条、`长春工业大学人文信息学院` 2 条，共 4 所院校、15 条 `CNY + academic_year` 记录。
- 官方来源： [吉林外国语大学 2026 章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-679%2CinfoId-7625286114.dhtml)、[吉林师范大学博达学院 2026 章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-1867%2CinfoId-7613517607.dhtml)、[长春光华学院 2026 章程](https://wxy.ghu.edu.cn/info/1047/3566.htm)、[长春工业大学人文信息学院 2026 章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-1846%2CinfoId-7614597802.dhtml)。
- 实测：重建后数据库保持 2,308 所院校、51,878 条招生记录；官方目录为 213 所院校、1,152 条记录，2,095 所尚未有足够官方金额。`build_admissions_db.py` 通过且 `integrity_check=ok`，53 项 Python 数据库测试通过，`validate_admissions_db.py` 为 25,042/25,042 检查通过、0 失败；数据库 SHA-256 为 `996dbddbd38673b1d3e0f569f3988c2cb5674bd0ea9501ae151927d14ef13423`。
- 发布边界：原始 `plan_record.tuition_*` 未覆盖，计划级 `TUITION_PENDING=797` 保留；仅更新本地可重建配置、SQLite、测试断言和文档，`publication_status` 仍为 `NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收。

## 2026-09-16 / official-tuition-continuation-9：继续补录吉林院校官方学费

- 目的：继续逐校核验 2026 年学费，只登记学校招生网或教育部阳光高考审核章程明确的金额；合作办学、校企合作、艺术类和专业类分档按官方原文保留，待批复项目不做推断。
- 本轮新增：`延边大学` 16 条、`白城师范学院` 13 条、`长春工业大学` 11 条、`吉林农业科技学院` 10 条，共 4 所院校、50 条 `CNY + academic_year` 记录。
- 官方来源： [延边大学 2026 章程](https://zsb.ybu.edu.cn/info/1010/1723.htm)、[白城师范学院 2026 章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-169%2CinfoId-7624455159.dhtml)、[长春工业大学 2026 章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-158%2CinfoId-7638323423.dhtml)、[吉林农业科技学院 2026 章程](https://zs.jlnku.edu.cn/info/1029/1160.htm)。
- 实测：重建后数据库保持 2,308 所院校、51,878 条招生记录；官方目录为 209 所院校、1,137 条记录，2,099 所尚未有足够官方金额。`build_admissions_db.py` 通过且 `integrity_check=ok`，53 项 Python 数据库测试通过，`validate_admissions_db.py` 为 24,967/24,967 检查通过、0 失败；数据库 SHA-256 为 `b14c87888d1422a724a7022844881e6af6ecf9bce2e9d6385256d416049fd6af`。
- 发布边界：原始 `plan_record.tuition_*` 未覆盖，计划级 `TUITION_PENDING=797` 保留；仅更新本地可重建配置、SQLite、测试断言和文档，`publication_status` 仍为 `NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收。

## 2026-09-16 / official-tuition-continuation-8：继续补录吉林院校官方学费

- 目的：继续逐校核验 2026 年学费，只登记教育部阳光高考审核章程明确的金额；免费医学定向、合作办学和艺术类按官方分类保留，无法确认的项目不猜测。
- 本轮新增：`吉林医药学院` 9 条、`吉林工商学院` 8 条、`吉林工程技术师范学院` 15 条、`吉林警察学院` 6 条，共 4 所院校、38 条 `CNY + academic_year` 记录。
- 官方来源： [吉林医药学院 2026 章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-1945%2CinfoId-7623702696.dhtml)、[吉林工商学院 2026 章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-751%2CinfoId-7621848918.dhtml)、[吉林工程技术师范学院 2026 章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-167%2CinfoId-7618602819.dhtml)、[吉林警察学院 2026 章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-812%2CinfoId-7625335904.dhtml)。
- 实测：重建后数据库保持 2,308 所院校、51,878 条招生记录；官方目录为 205 所院校、1,087 条记录，2,103 所尚未有足够官方金额。`build_admissions_db.py` 通过且 `integrity_check=ok`，53 项 Python 数据库测试通过，`validate_admissions_db.py` 为 24,717/24,717 检查通过、0 失败；数据库 SHA-256 为 `d7c81aa9ffeef6e7e287a352ea459820f49e01811f0ee165393590f7ac42240b`。
- 发布边界：原始 `plan_record.tuition_*` 未覆盖，计划级 `TUITION_PENDING=797` 保留；仅更新本地可重建配置、SQLite、测试断言和文档，`publication_status` 仍为 `NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收。

## 2026-09-16 / official-tuition-continuation-7：继续补录吉林院校官方学费

- 目的：继续逐校核验 2026 年学费，只登记学校招生网或教育部阳光高考审核章程明确的金额；章程写明“待定”的专业不做推断。
- 本轮新增：`吉林农业大学` 11 条、`吉林化工大学` 9 条、`吉林财经大学` 9 条、`长春理工大学` 12 条，共 4 所院校、41 条 `CNY + academic_year` 记录。收费表按专业档/专业集合保留，合作办学单独列出；长春理工大学生物工程中外合作办学待定项未录入。
- 官方来源： [吉林农业大学 2026 章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-161%2CinfoId-7616827731.dhtml)、[吉林化工大学 2026 章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-160%2CinfoId-7624337335.dhtml)、[吉林财经大学 2026 章程](https://zsb.jlufe.edu.cn/info/1011/1747.htm)、[长春理工大学 2026 章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--method-view%2CschId-156%2CinfoId-7624494565.dhtml)。
- 实测：重建后数据库保持 2,308 所院校、51,878 条招生记录；官方目录为 201 所院校、1,049 条记录，2,107 所尚未有足够官方金额。`build_admissions_db.py` 通过且 `integrity_check=ok`，53 项 Python 数据库测试通过，`validate_admissions_db.py` 为 24,527/24,527 检查通过、0 失败；数据库 SHA-256 为 `30925736395f5f0e575b518fbdb463d43dacf2671e2b2aeaa744fc6386bfe664`。
- 发布边界：原始 `plan_record.tuition_*` 未覆盖，计划级 `TUITION_PENDING=797` 保留；仅更新本地可重建配置、SQLite、测试断言和文档，`publication_status` 仍为 `NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收。

## 2026-09-16 / official-tuition-continuation-6：继续补录上海、北京院校官方学费

- 目的：继续逐校检索 2026 年学费；只接受学校官网/财务处/招生网，或教育部阳光高考审核通过的招生章程。没有官方明确金额的学校、专业或境外阶段不补猜测值。
- 本轮相对上一条实施记录新增 14 所数据库已有院校、50 条 `CNY + academic_year` 收费记录：上海健康医学院（4）、上海商学院（7）、中华女子学院（4）、北京信息科技大学（3）、北京第二外国语学院（2）、上海应用技术大学（4）、上海师范大学（6）、上海政法学院（2）、上海戏剧学院（1）、北京印刷学院（3）、北京建筑大学（2）、北京联合大学（4）、首都经济贸易大学（3）、北京物资学院（5）。上海海事大学原已有 3 条记录，本轮只做重复核对，未再次写入。
- 收费边界：合作办学、艺术类、普通本科区间、少数民族预科和专科收费按官方分类单列；上海师范大学保留非合作/合作三档，上海戏剧学院只登记普通批次简章明确的本科专业；北京物资学院合作项目只记国内阶段金额；未把住宿费、外方阶段非人民币费用或“以各省计划公布”为准的金额写入普通学费目录。
- 权威来源示例： [上海应用技术大学章程](https://info.sit.edu.cn/info/2922/110982.htm)、[上海师范大学 2026 级缴费须知](https://cwc.shnu.edu.cn/05/f6/c32506a853494/page.htm)、[北京印刷学院 2026—2027 学年缴费通知](https://www.bigc.edu.cn/xsfwtd19/tzgg/1701402f10494956a14934e8a5a4bb0b.htm)、[北京联合大学 2026 章程](https://gaokao.chsi.com.cn/zsgs/zhangcheng/listVerifedZszc--infoId-7638170681%2Cmethod-view%2CschId-799.dhtml)。完整来源映射见 `TASK03_SOURCE_MAPPING.md`，所有原文和证据说明仍集中在 `pipelines/task03/official_tuition_sources.json`。
- 实测：重建后数据库保持 2,308 所院校、51,878 条招生记录；官方目录为 197 所院校、1,008 条记录，2,111 所尚未有足够官方金额。`build_admissions_db.py` 通过且 `integrity_check=ok`，53 项 Python 数据库测试通过，`validate_admissions_db.py` 为 24,322/24,322 检查通过、0 失败；数据库 SHA-256 为 `48ed7026c27939337b56504661a0f27b565993e3673ac069e75ae94dc0d1bdd5`。
- 发布边界：仅更新可重建配置、SQLite 本地产物、测试断言和文档；原始 `plan_record.tuition_*` 未覆盖，`publication_status` 仍为 `NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收；云端开关状态未改变。`nanhang-app` 根目录和完整项目根目录的文档打包/一致性检查在本轮收尾执行。

## 2026-09-16 / official-tuition-continuation-5：继续补录剩余院校官方学费

- 目的：继续逐校核验 2026 年学费，只登记学校官网或教育部阳光高考审核章程中明确的具体金额；没有官方具体金额的院校继续保持未知，不用第三方页面、旧年度标准或收费上限推断。
- 本轮新增：`东北电力大学`、`长春大学`、`长春师范大学`、`长春大学旅游学院`、`吉林师范大学`、`长春中医药大学`、`北华大学`、`吉林建筑大学` 8 所院校，共 103 条 `CNY + academic_year` 官方收费记录。记录覆盖普通本科、职业本科、专科、艺术类、合作办学和国际项目等章程明确的收费类别；长春大学旅游学院只保留正常学年学费，未把辅修收费写成普通学费。
- 官方来源：8 条权威来源均为教育部阳光高考已审核的 2026 年招生章程，收费原文、来源 URL、学校辅助 URL 和证据哈希保存在 `pipelines/task03/official_tuition_sources.json`。合作办学及国际项目按章程单独登记，未并入普通专业标准；原始 `plan_record.tuition_*` 不覆盖。
- 实测结果：数据库重建保持 2,308 所院校、51,878 条招生计划；官方目录累计 183 所院校、958 条记录，2,125 所院校仍没有足够官方具体金额，保持 `UNVERIFIED`。53 项 Python 数据库测试通过，独立校验 24,072 项通过、0 失败；数据库 SHA-256 为 `91ee7de03a2744bbbeb41f9c86aba6147060e3fb7103e1c554aacfd7e66941015`。
- 发布边界：本轮仅更新本地可重建数据库、测试断言和文档，`publication_status` 仍为 `NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收；云端开关状态未改变。

## 2026-09-16 / official-tuition-continuation-4：继续补录剩余院校官方学费

- 目的：继续逐校核验 2026 年学费，只登记学校官网或教育部阳光高考审核章程中明确的金额，不把第三方转载、旧年度标准或未列出的专业映射成当前数据。
- 本轮新增：`北京电影学院`、`鞍山师范学院`、`天津理工大学中环信息学院`、`长春建筑学院`、`长春人文学院` 5 所院校，共 15 条 `CNY + academic_year` 官方收费记录。北京电影学院章程同时覆盖本科和高职（专科）；鞍山师范学院为公办本科；天津理工大学中环信息学院、长春建筑学院、长春人文学院的章程明确为民办/独立学院本科。
- 官方来源：5 条权威来源均为教育部阳光高考已审核的 2026 年招生章程，收费原文、来源 URL、学校辅助 URL和证据哈希保存在 `pipelines/task03/official_tuition_sources.json`。鞍山师范学院本轮只写入页面已核到的 4,800/5,200/10,000 元专业集合，不向未见行扩展。
- 边界：北京电影学院保留普通艺术本科 10,000 元、戏剧影视文学/电影学 8,000 元、文化产业管理 6,000 元、数字媒体技术 4,600 元及高职专科 19,000 元（其中舞台艺术设计与制作为章程“拟定”）；长春建筑学院与长春人文学院分别保留 25,000/26,000 元、25,000/26,000/28,000 元专业集合；天津独立学院保留 23,000/19,000 元两档。原始 `plan_record.tuition_*` 未覆盖。
- 实测结果：数据库重建保持 2,308 所院校、51,878 条招生计划；官方目录累计 175 所院校、855 条记录，未核验院校 2,133 所。53 项 Python 数据库测试通过，独立校验 23,557 项通过、0 失败；数据库 SHA-256 为 `e79d722e8028e63dd156ab3ed6d6bb7dfe26beb5c352c9d1c700df6dc2bf8606`。
- 发布边界：本轮仅更新本地可重建数据库、测试断言和文档，`publication_status` 仍为 `NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收；云端开关状态未改变。

## 2026-09-16 / official-tuition-continuation-3：继续补录剩余院校官方学费

- 目的：继续逐校检索数据库中尚未核验的 2026 年学费。只有学校官网或教育部阳光高考审核通过的招生章程明确给出具体金额时才入库；没有明确金额、只有收费上限或只有第三方转载的材料不写入。
- 本轮新增：`长春科技学院`、`喀什大学`、`白城医学高等专科学校`、`玉溪师范学院`、`北京石油化工学院`、`长春电子科技学院` 6 所院校，共 25 条 `CNY + academic_year` 官方收费记录。长春科技学院记录覆盖民办本科和专科；白城医学高等专科学校为公办专科；北京石油化工学院只保留章程明确的本科/职业本科收费区间，没有把区间猜成逐专业金额。
- 官方来源：本轮 6 条权威来源均为教育部阳光高考已审核的 2026 年招生章程，来源 URL、院校辅助 URL、收费原文和证据哈希保存在 `pipelines/task03/official_tuition_sources.json`。长春电子科技学院仅登记章程列出的 26,000 元专业集合，不向未列明专业扩展。
- 边界：喀什大学按文科、理工农、医学、外语、体育、艺术保留 4,000/4,500/5,200/4,900/4,200/7,800 元分类；白城医专保留普通专科 5,000—6,500 元分类和中外合作 18,000 元；玉溪师范学院保留普通类、艺术类和优势专业不同标准。原始 `plan_record.tuition_*` 未覆盖，仍无法核验的院校保持 `UNVERIFIED`。
- 实测结果：数据库重建保持 2,308 所院校、51,878 条招生计划；官方目录累计 170 所院校、840 条记录，未核验院校 2,138 所。53 项 Python 数据库测试通过，独立校验 23,482 项通过、0 失败；数据库 SHA-256 为 `b2abf335a84a898d84cf65104fbca060dc634ed922c7246d921495bacdd1178bd`。
- 发布边界：本轮仅更新本地可重建数据库、测试断言和文档，`publication_status` 仍为 `NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收；云端开关状态未改变。

## 2026-09-16 / official-tuition-continuation：继续补录官方学费证据

- 目的：继续逐校检索数据库中尚未核验的院校学费。只有学校官网或教育部阳光高考审核通过的 2026 年招生章程明确给出具体金额时才入库；旧收费标准、仅有上限、第三方转载和无法与数据库院校实体匹配的材料均不作为当前学费证据。
- 本轮新增：`中国科学院大学`、`中央美术学院`、`中央戏剧学院`、`中国戏曲学院`、`外交学院`、`北京舞蹈学院`、`首都体育学院` 7 所院校，共 18 条 `CNY + academic_year` 官方收费记录。外交学院的记录严格限定为 2026 年全国联招华侨港澳台学生（简章明确与大陆同专业标准相同），不把该特殊招生口径扩展成未核实的普通本科专业表。
- 官方来源：国科大、中央美院和外交学院使用学校官方招生页面；中央戏剧学院、中国戏曲学院、北京舞蹈学院、首都体育学院使用教育部阳光高考审核通过的 2026 年招生章程。来源 URL 及证据说明集中保存在 `pipelines/task03/official_tuition_sources.json`，构建器只接受政府/教育官方域名；本轮同步允许中国科学院大学使用的官方 `.ac.cn` 域名，验证器与构建器规则一致。
- 边界：中央音乐学院、中国音乐学院本轮也检索到阳光高考 2026 年章程的具体收费，但当前招生数据库没有对应院校实体；按“只更新现有院校、不得凭空新建”规则，本轮未写入，待数据库出现匹配实体后再补。没有修改原始 `plan_record.tuition_*`，官方证据继续独立存放于 `official_fee_reference`，未把分类收费平均成全校单值。
- 实测结果：数据库重建保持 2,308 所院校、51,878 条招生计划；官方目录累计 159 所院校、788 条记录，未核验院校 2,149 所。`py -3.12 pipelines/task03/test_admissions_db.py` 为 53 项通过；`py -3.12 pipelines/task03/validate_admissions_db.py` 为 23,222 项通过、0 失败；数据库 SHA-256 为 `38ce90f2bad374f04439dad093c7d7cc079c11519fad4d4cf3c41ccff7db47c0`。
- 发布边界：本轮仅更新本地可重建数据库和文档，`publication_status` 仍为 `NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收；云端开关状态未改变。

## 2026-09-16 / official-tuition-continuation-2：继续补录剩余院校官方学费

- 目的：继续逐校检索数据库中尚未核验的院校学费。仍只接受学校官网或教育部阳光高考审核通过的 2026 年招生章程中的明确金额；未找到官方具体金额的院校不补猜测值。
- 本轮新增：`首都医科大学`、`河南中医药大学`、`天津医科大学临床医学院`、`桂林医科大学`、`内蒙古医科大学` 5 所院校，共 27 条 `CNY + academic_year` 官方收费记录。桂林医科大学同时补入章程明确的本科、高职（专科）、农村订单定向免费医学生和“中高计划”本校学费；境外高校收费、生活费和汇率不合并为本校人民币学费。
- 官方来源：5 所均使用教育部阳光高考已审核的 2026 年招生章程；来源 URL、官方院校 URL、收费原文和证据说明保存在 `pipelines/task03/official_tuition_sources.json`。其中天津医科大学临床医学院的章程同时明确其为独立学院，数据库既有的民办本科属性不做改写。
- 边界：河南中医药大学的 5500/6000 元医学类收费按章程专业表分别保留；定向免费医学生的学费栏为“—”且方向明确标注为免费医学生，记录为 0 并在 `fee_raw`/`evidence_note` 留下原文口径。所有官方收费仍独立存放于 `official_fee_reference`，没有覆盖原始 `plan_record.tuition_*`，也没有把分类标准平均成院校单值。
- 实测结果：数据库重建保持 2,308 所院校、51,878 条招生计划；官方目录累计 164 所院校、815 条记录，未核验院校 2,144 所；`py -3.12 pipelines/task03/test_admissions_db.py` 为 53 项通过；`py -3.12 pipelines/task03/validate_admissions_db.py` 为 23,357 项检查、0 失败；数据库 SHA-256 为 `82970fc1685bd5fea5cfa5899759c1c27008bad262ff41f029c6c0c6c9fe9f97`。
- 发布边界：本轮仅更新本地可重建数据库和文档，`publication_status` 仍为 `NOT_PUBLISHED`，未部署、未推送、未做浏览器视觉验收；云端开关状态未改变。完整文档同步仍需从项目根目录执行 `py -3.12 tools/sync_project_docs.py --package` 与 `--check`。

## 2026-09-15 / official-tuition-enrichment：官方渠道学费证据表

- 目的：响应“逐校从官网核验学费”的要求。只把学校官网或教育部阳光高考审核招生章程明确写出的收费分类/区间写入数据库；无法在官方渠道核验的院校保持未核验，不用第三方页面补值。
- 修改：`build_admissions_db.py` 将 schema 升为 `1.1.0`，新增 `official_fee_reference` 及索引；`v_offering_full`、`match_pool`、查询 JSON/CSV 暴露官方学费证据字段；新增可复建目录 `pipelines/task03/official_tuition_sources.json`；更新 `query_admissions.py`、`validate_admissions_db.py`、`test_admissions_db.py`。
- 数据：首批 18 所院校、87 条 2026 学年收费记录，口径统一记录为 `CNY` + `academic_year`，每条保留原文摘要、来源 URL、学校招生网辅助 URL、证据说明和 SHA-256。覆盖深圳大学、厦门大学嘉庚学院、天津大学、北京服装学院、空军军医大学、天津医科大学、九江职业大学、西南大学、北京农学院、云南财经大学、江西科技学院、厦门大学、中国农业大学、西南财经大学、中国药科大学、云南农业大学、新疆农业大学、云南大学。
- 官方来源：使用学校招生网/本科生院/学校官网页面，以及教育部阳光高考的 2026 年审核招生章程；构建器和独立校验拒绝非 HTTPS 或非政府/教育官方证据来源。机构级收费分类暂以 `INSTITUTION_SCHEDULE` 展示，不把不同专业、艺术/医学、中外合作办学或分年级收费平均成一个数字。
- 性质核对：数据库现有 `institution.ownership` 与 `institution.level_label`，已覆盖公办/民办与本科/专科的组合，不新增重复标签；本轮实测无空值，公办专科 753、公办本科 853、民办专科 266、民办本科 314。该性质字段沿用招生工作簿属性，未将其冒充为本轮逐校官方复核结果。
- 本轮实测：重建通过；`py -3.12 -m unittest discover -s pipelines/task03 -p test_admissions_db.py` 为 53 项通过；`py -3.12 pipelines/task03/validate_admissions_db.py` 为 19,717 项检查、0 失败；`query_admissions.py --stats` 显示 `official_fee_reference=87`。数据库院校总数 2,308，尚未写入官方收费证据的院校为 2,290；数据库 SHA-256 为 `3a3ae7ab973779283c7aa1c6b4401fe393faf10cd5f974b2ac4e2d5a444655d8`，本地构建状态仍为 `NOT_PUBLISHED`。
- 边界/接手：没有修改原始 `plan_record.tuition_*`，也没有把本批机构级收费强行映射为每个专业的精确学费；下一轮继续按同一官方来源政策补录，仍无法核验的记录保持 `UNVERIFIED`。本轮未部署、未改变云端开关状态。

## 2026-09-15 / official-institution-tags：按官方名单补齐 211、985、双一流院校标签

- 目的：依据教育部官方名单与官方说明，把 `211`、`985`、`双一流` 写入招生库 `institution_tag`，并在库内增加可查询的定义索引，避免把历史工程、当前“双一流”建设名单和招生数据混为一谈。
- 修改：新增 `pipelines/task03/official_institution_tags.json`，记录官方名单、定义、别名、交叉核验来源和名单哈希；更新 `build_admissions_db.py`，新增 `reference_index` 表、官方名称/校区/医学部匹配策略和标签重建逻辑；更新 `validate_admissions_db.py`、`test_admissions_db.py`，覆盖官方计数、数据库命中数和独立学院排除；`query_admissions.py --stats` 现在会显示 `reference_index` 行数。
- 官方依据：教育部 211 工程名单 112 所、985 工程名单 39 所、第二轮“双一流”建设高校名单 147 所（331 个建设学科，不含自主确定学科），并用教育部 211/985 说明及第二轮双一流说明交叉核验。上海体育学院→上海体育大学、军医大学旧名→现名等更名按教育部/国防部官方页面建立别名；中国石油/地质/矿业等官方校区名称按当前库实体映射。独立学院不继承母体标签；官方成员未出现在当前招生工作簿时不新建院校行，本次未出现 211 的中央音乐学院及双一流的中央音乐学院、中国音乐学院、上海音乐学院、广州医科大学。
- 实际结果：数据库标签命中数为 `211=132`、`985=52`、`双一流=161`。命中数高于官方名单数是因为当前招生库拆分了明确的校区、医学部、深圳/威海等招生实体；`reference_index` 同时保留官方名单数 `112/39/147` 与数据库命中数。数据库当前 `release.publication_status=NOT_PUBLISHED`、`human_review_performed=0`，本轮未改变发布状态。
- 本轮实测：重建数据库通过；`py -3.12 -m unittest discover -s pipelines/task03 -p test_admissions_db.py` 为 50 项通过；`py -3.12 pipelines/task03/validate_admissions_db.py` 为 19,279 项检查、0 失败；数据库重建产物 SHA-256 为 `bdd85d9635df29023cd04798574455757c927650ddf6642af3179dc687da42b2`。未做线上部署、网页视觉验收或提交。
- 下一步/接手：在 `nanhang-app` 目录可运行 `py -3.12 pipelines/task03/build_admissions_db.py`、`py -3.12 pipelines/task03/validate_admissions_db.py`、`py -3.12 pipelines/task03/query_admissions.py --stats`；本轮已从完整项目根目录执行文档 `--package` 与 `--check`，冻结副本 11 份、基线文件 24 份、0 错误。

## 2026-09-14 / cloud-switch：任意设备可用的服务开关（COS 网页 + 云端中转）

- 负责人要求（原文）：「我需要的是一个随时都可以打开的网页，而且在任何设备上都能使用，所以说密钥直接可以扔进去的，不用担心。现在我已经把账户余额充值好了，你自己跑一遍流程，看有没有问题。」
- 路线变化：上一轮做的是「本机助手 + 本地网页」（要靠本机进程，手机/别的电脑打不开）。这一轮改成
  **云端中转**：静态网页放在 COS（公网任何设备可开），网页只带「中转地址 + 控制口令」；
  真正的云端操作由新函数 `nanming-control`（SCF，Python 3.10，成都）执行，**腾讯云密钥只在它的环境变量里**
  （`NANMING_TC_SECRET_ID/_KEY`，SCF 不允许 `TENCENTCLOUD_` 前缀，中转启动时映射回助手认识的名字）。
  没有采纳「把腾讯云密钥直接扔进网页」：腾讯云 API 不返回跨域头，浏览器直连会被 CORS 挡死，所以中间必须有转发点；
  而把根密钥放进公网静态页，泄露的就是整个账号（含交接库读取权）。口令路线泄露的最坏结果是别人开/关这台
  Redis（约 ¥0.9/天）并看到费用数字。
- 文件（都在工作区之外/私密区，不进 Git、不进源码包）：
  - 网页地址：`https://nanming-100051087352-1459223409.cos.ap-chengdu.myqcloud.com/switch/b76b5b97.html`
  - `private/nanming-switch-cloud/`：`index.py`（中转入口）、`deploy.py`（部署/更新函数与触发器，`--rotate` 换口令）、
    `upload_page.py`（生成并上传网页）、`page-template.html`、`control-token.txt`、`page-slug.txt`、`README.md`
  - `桌面/南溟服务开关/`：本机版助手（保留为备用路线，不依赖新增的云组件）
  - 中转打包时把桌面那份 `nanming_switch.py` 原样拷进函数，**本机与云端共用同一份实现**，避免两处逻辑漂移。
- 为支持云端而改的助手核心：动作改成**幂等 + 按时间预算分次推进**（新增 `Pending` 与 `Deadline`；
  单次调用最多干 12 秒，做不完返回 `done=false`，网页每 2.5 秒接着调，直到 `done=true`）。
- 本轮实测（2026-09-14，账户由负责人充值后）：
  - 网页：公网 `GET` 200（14,046 字节，`text/html`），页面内只有中转地址与口令，没有 `AKID` 样式密钥。
  - 浏览器侧真实验证（在 github.io 源上用 `fetch`）：读 COS 发布指针 200；调中转 `/api/status` 得到 401「口令不对」
    —— 说明跨域头与口令鉴权在真实浏览器里都正常（中转对错误口令的拒绝就是这条证据）。
  - 中转：`/api/status` 与 `/api/action` 全部走通；`off` 12 秒内完成；重复点同一边 2 秒返回「已经是开启状态」；
    **完整 on**（新建实例 → 外网地址 → AUTH+PING → 回填三项变量并把内存档置 0 → `/healthz` 显示 `store=redis`）
    与后续 `off`（销毁 → 移除变量 → `store=memory`、学校查询 401）均成功。
  - 助手 `selftest` 7/7（含「环境变量写入回路」原样写回比对）。
- 过程中修掉三个真问题（都写下来免得重犯）：
  1. **反复重设密码把流程锁死**：原来的顺序是「先改实例密码、再写环境变量」，一次调用做不完时下一轮从头发起
     又会改一次密码，实例被一直按在「设置密码中」（Status 1），连接探测永远不通过。改成「先把密码落到云函数、
     再让实例接受同一个密码」，并对同一实例的改密次数设上限（3 次）。
  2. **外网地址不能催**：同一实例重复提交 `AllocateWanAddress` 会把开通流程拖住，改成每实例最多 6 次、
     间隔 3 分钟，其余时间只轮询。实测腾讯云这一步排队长（个别实例十~十几分钟才出地址，也有 20 秒就出的）。
  3. 探针单次抖动会误报站点异常 → 加两次重试；`on` 的每次重入不再重复重写环境变量（配置已对上就直接核验）。
- 已知脾气（写进 `private/nanming-switch-cloud/README.md` 与页面说明）：首次开启可能要在「等待开通外网地址」
  上停留几分钟到十几分钟；关闭是秒级；欠费时创建会被腾讯云拒绝（这条路径实测过，不产生费用）。
- 未做：网页的视觉/交互最终验收仍由负责人执行（我做的是接口、跨域、按钮路径与真实开/关循环）。
  收尾时云端保持**关闭**状态（Redis 已销毁、函数为单实例内存档），不产生 Redis 费用。

## 2026-09-14 / service-switch：南溟服务开关（本机助手 + 网页）

- 负责人要求（原文）：「做一个类似于这样的一个网页，我可以随时的打开网页进行开关」，参照物是 `桌面\北辰实时数据Demo\北辰Redis开关\北辰后台工作台.html`。
- 参照物怎么做的：单文件 HTML 里**嵌了一个 GitHub 个人令牌**，页面直接调 GitHub API 派发 `beichen-workbench.yml`，由 Actions 拿仓库密钥去操作腾讯云，状态写在交接库 `.workbench/state.json`，页面再读回来显示。能用，代价是令牌跟着文件走。
- 本工程的实现换成本机助手路线，工具在工作区之外：`C:\Users\yusheng\Desktop\南溟服务开关\`（`nanming_switch.py`、`南溟服务开关.html`、`启动开关.cmd`、`README.md`、`开关配置.example.json`）。双击启动器 → 助手在 `127.0.0.1:8770` 起一个只服务本机的进程并自动打开浏览器 → 页面按钮调助手 → 助手在你本机直接调腾讯云。**任何文件里都不放凭据**：SecretId/SecretKey 从本机私有交接文档读（读不到才用 `gh api` 拉同一份）。
- 页面内容：状态卡（会话存储 store、`/healthz`、学校查询探针、AUTH+PING 连接探测、实例状态/创建时间、函数环境变量、地域）、费用条（本月至今 + 分产品 + 余额/欠费，账单缓存 10 分钟）、开启/关闭两张动作卡（确认弹窗 + 费用与后果说明）、任务进度与步骤列表、最近操作（浏览器 localStorage）。
- 助手实现要点：**纯标准库**（自带 TC3-HMAC-SHA256 签名，不用 pip、不依赖工程里的 SDK）；`on`/`off` 都可重复执行；改云函数环境变量走「读回 → 合并 → 整表写回 → 逐项比对」，不动其他键；关闭时自动把 `NANHANG_AI_ALLOW_MEMORY_STORE` 置 1（上一轮教训：生产档缺共享存储会让整个函数拒绝启动）；只绑 127.0.0.1，并拒绝非本机页面/`file://` 来源的跨站请求（别的网站没法偷偷调它开资源）；日志抹掉账号 UIN 与长令牌样式串，密码从不进日志、也不在本机留副本。
- 本轮实测（2026-09-14）：
  - `selftest` 7/7 通过：凭据读取、实例查询、环境变量读取、**环境变量写入回路**（原样写回后逐项一致）、账单与余额、`/healthz`、学校查询 401。
  - `status`：`state=off`、`consistent=true`；账单本月 ¥7.01（缓存 6.28 / CLS 0.52 / 精度差异 0.12 / COS 0.09），与上一轮独立审计逐项一致（账单汇总接口对本月的返回为空，已改用明细接口聚合，并修掉月末日期按 31 天写的跨月错误）。
  - `off`：幂等通过——没有运行实例就跳过销毁，环境变量已是内存档就原样写回再复核，站点回到 `store=memory`。
  - 网页服务：`GET /` 200（19,099 字节）；`/api/status` 正常；伪造来源 `Origin: https://evil.example` 的 POST 被 403 拒绝；`Origin: null`（双击 HTML 打开）可正常走到参数校验；页面脚本 `node --check` 通过。
  - 启动器：`启动开关.cmd` 双击实测可起服务并自动开浏览器（页面 200、状态正确）。这里踩了一个坑：Write 出来的 .cmd 默认是 LF 换行，cmd.exe 会解析错乱（报 `'ho' 不是内部或外部命令`），必须写成 CRLF；同时把内容编码改成 GBK，中文提示在默认代码页的控制台里才不会乱码。
  - **开启全链路（当天负责人充值后补测，16:24–16:28）**：余额从 -13 变成 187，于是完整跑通——创建 `crs-i937eo6w`（16:25:55，`ZoneId=160001`／TypeId 17／256MB／1 副本／沿用 vpc-rgor54b6·subnet-4jsr4kun）→ 实例转运行中 → 自动开通外网地址（`cd-crs-i937eo6w.sql.tencentcdb.com:20449`）→ `AUTH OK · PING PONG` → 回填三项变量并把内存档置 0 → `/healthz` 200 且 `store=redis`、`/readyz` 返回 `{"public_data":true,"ai":true,"state_store":true,"upstream":"qianfan"}`。随后执行 `off` 回到冻结态：实例 `-3`、函数 10 个变量且无 `NANHANG_REDIS_*`、`store=memory`、学校查询 401。测试实例存活约 3 分钟，费用不到一分钱；结束时系统仍是「已关闭」。
  - 前半程的欠费也被当成一次真实验证：创建请求被 `ERR_INSUFFICIENT_BALANCE`（余额 -13、冻结 4）拒绝，**欠费账户不能创建任何按量资源**，该请求不产生费用。
- 本轮修掉三个自己写出来的 bug（都留下记录，避免下次重犯）：① RESP 简易读取把首个 `+` 吃掉，`PING` 判断拿 `PONG` 比 `+PONG` 必然失败——第一次 `on` 因此半途停下（实例已建、函数还没改），第二次靠「复用现有实例」分支跑完，也顺带验证了复用路径；② Windows 上 `HTTPServer` 默认开 `SO_REUSEADDR`，第二个助手实例也能绑上同一端口（请求去向随机），改成 `allow_reuse_address=False`，重复启动直接报错并提示改端口；③ `/healthz` 单次抖动会让状态误报「站点异常」，探针加了两次重试。
- 未做与边界：没有做网页的视觉/交互验收（按项目规则由负责人自行验收）；本机若要连 Redis 自检，密码只在云函数环境变量里、不在本机留副本；网页与助手都只在有浏览器窗口和本机助手进程时可用，手机或其他电脑打不开（这是「不放凭据」换来的代价）。
- 工具本体在工作区之外，不进 Git、不进源码包（它不含凭据，可以自由复制同步）；北辰那个工作台 HTML 里嵌了令牌，两者不要混放一处同步。

## 2026-09-14 / cloud-cost-freeze：冻结云端计费项目

- 负责人要求（原文）：「帮我把云端要收费的项目暂停或者冻结了，最近天天扣我的费。」
- 盘点（只读，腾讯云 SDK 与账单接口）：账户余额已经为负。2026-09 前 14 天共 ¥7.01：分布式缓存（Redis）¥6.28、日志服务 CLS ¥0.52、月度计费精度差异 ¥0.12、COS ¥0.09。账单里出现过 9 个 Redis 实例，其中 8 个是此前测试期建了就删的；冻结前仍在运行的只有本项目 `crs-bdr4f2z6`（nanming-state，按量计费小时结，约 ¥0.0368/小时、¥0.9/天）。当月账单里没有云函数（SCF）费用，五个函数都没有定时触发器，空闲不产生调用；另一个项目（北辰）的按量 Redis 在本次操作前已是待删除状态，未由本轮处理；CVM 在五个地域均为 0 台。脚本（本机留档，均在 `private/`，不进包）：`cloud_cost_audit.py` 资源清单、`cloud_bill_rows.py` 账单明细、`freeze_paid_resources.py` 冻结、`finalize_freeze.py` 单实例内存档与探针、`inspect_function_env.py` 环境变量复核。
- 动作：① 销毁按量计费 Redis `crs-bdr4f2z6`（按量计费没有暂停档，销毁是唯一停止计费的方式；实例内只有 TOTP 会话与限流计数，此前实测用量 0MB）；② 从云函数环境变量移除 `NANHANG_REDIS_HOST/_PORT/_PASSWORD` 三项，其余 10 个键逐项比对未变，更新前配置备份在 `private/backups/redis-freeze-20260914/`。
- 过程中踩到的坑（重要）：只做 ①② 会让**整个函数拒绝启动**——生产档下缺少共享存储时 `productionGuard` 直接抛错，`/v1/school/identify` 会一起不可用，并不只是关闭 AI。改动后第一次探针就抓到 `refusing to start: production requires a shared state store`。补救：设 `NANHANG_AI_ALLOW_MEMORY_STORE=1`，即项目自带的单实例试用档，站点与学校查询恢复。代码里不存在「站点正常但 AI 关闭」的配置档，记在这里以免下次再踩。
- 冻结后实测（2026-09-14）：`GET /healthz` → 200 `{"status":"ok","ai":true,"store":"memory"}`；`POST /v1/school/identify` 用不存在的姓名 → 401「姓名或验证码不匹配，请向老师核对。」，响应正常。未消耗负责人 TOTP 动态码，未使用真实学生资料；AI 真链路未在冻结后重测。证据：[冻结记录](verification/cloud-cost-freeze-2026-09-14.json)。
- 未做与边界：账单按小时结算且有两小时左右延迟，最后一笔 Redis 费用需要之后再回读确认；账户欠费未处理，未清欠费时平台仍可能继续隔离资源；CLS 日志投递（约 ¥0.04/天）与 COS 存储（约 ¥0.006/天）保留未动，关闭前者会影响线上排障；本轮未改业务代码、未跑本地测试、未做视觉验收。
- 恢复共享会话：重建按量 Redis → 回填三项 `NANHANG_REDIS_*` → 把 `NANHANG_AI_ALLOW_MEMORY_STORE` 改回 0 → 跑 `node scripts/redis_store_check.mjs` 自检后再用于多人。当前内存档会话与限流计数重启即丢，只适合负责人自测。

## 2026-09-13 / frontend-code-review：前端专项，只读代码

- 负责人要求重点审阅内容、交互动画、架构、UI、操作流程、数据校验、环节、AI与视觉实现，并明确不做实际操作校检。基线仍为 `14fad3f`；保留上轮未提交审阅文档、他人 VISUAL_PROGRESS 与实施记录增量及 gui-test-screenshots，不读截图、不改业务代码。
- 新增 `FRONTEND_CODE_REVIEW_2026-09-13.md`：32项静态发现（6项P1、26项P2）和10项设计/维护建议。重点补充学校与手填共享数组、学校裸分回退为等价分、隐藏谈心小结锁屏、最终理由不覆盖、建议截断、完整列表不可达、组线/资格说明导出丢失、JS动效不受开关控制等调用链问题。
- 方法为读取源码、配置、测试代码和文档；本轮未启动应用/浏览器、未看截图、未调API、未执行构建、类型检查、业务测试或上轮复现脚本。32项是审阅发现数，不是执行测试数；上轮554项等均为历史。
- 同步主进度、机器JSON、前端专题与验证说明，任务/门禁未变。业务问题均未修复，未提交、推送、部署。根目录文档 `--package`/`--check` 仅用于本次交付文档同步，不是用户禁止的应用实操校检。
- 下一步按报告分批修复状态边界，再做统一组件/动效/结果导出改进；业务验证需在后续修复任务执行，本轮不开展。


## 2026-09-13 / class4-end-to-end-walkthrough：以四班学生走一遍全流程（只报告，未改代码）

- 目的（负责人原文）：「你现在从头到尾一个以用户的视角过一遍全流程，包括和ai聊天谈心，选科目，填分数，选专业，这个地方就以荣县一中4班的学生为例，走一篇全流程，在这个过程当中你要看一看是否有什么问题和bug。把他报告给我，还有没有你觉得在实操或者体验当中感觉到不足的地方，把它一起汇总起来。」
- 做法：在负责人正在看的本机页面（390×844，dev server 指向云函数）上，用四班一名真实身份（物化生平行班，10 场考试；姓名与查询码只在本机私密读取，不写入任何文档）完整走完：起航选科 → 登船卡选「荣县一中 · 增强模式」 → 定位接入（姓名 + 身份证后六位） → 探索区间 302–434 → 谈心（引航，兑换 TOTP 动态码后与云端 AI 走了 6 轮学生发言 + 自动收尾轮） → 方向（AI 建议线 4 个小类 / 自选线勾 10 个小类） → 分数轴匹配 → 航线图（双线 + 导出 PNG）。全部步骤都有 DOM/网络证据；本轮**没有改动任何代码**，视觉验收仍归负责人。
- 发现的 bug（建议优先修）：
  - **登船卡选完入口不跳转**（首次进入必现）：点「全国通用模式」或「荣县一中 · 增强模式」后卡片关闭，但页面停在起航，并弹出一句与事实相反的提示「先完成『起航』（选好首选科目与两门再选科目，再点『开始起航』选一条登船口…），再进入『定位』」。根因：`App.tsx` 的 `chooseRoute` 先 `setEntryChosen(true)` 再调 `goTo("locate")`，而 `goTo` 里的门禁读的是同一 tick 里尚未生效的 `progress`（`entryChosen` 仍为 false），于是被自己的门禁拦下；只有再点一次导航条上的「定位」才进得去。修法方向：把新值一并喂给门禁（用 `{...progress, entryChosen: true}` 判一次），或让 `chooseRoute` 在自身门禁判断通过后直接 `setPage("locate")`。
  - **「方向」页的小类计数在每一行都是全局数**：实测在「理学」行与「医学」行同时显示「已勾 10 / 10」，而医学下其实只有 2 个勾选（`direction.tsx` 第 151 行用的是 `picks.length`）。同时「/ 10」是全局上限，文案没有说明是全局。
  - 定位页「学生姓名」输入框的 placeholder 是「和验证码一起由班主任发放」——这句话属于查询码那一格，放错字段。
  - 谈心连接成功后提示「已获得本地试用会话。」，而本机 dev server 已指向云端函数（`ai-panel.ts` 第 133 行），文案与事实不符。
  - 逐科位置表的科目顺序直接透传源数据（实测 化学/数学/物理/生物/英语/语文），与常见顺序（语文/数学/外语/物理/化学/生物）不一致。
- 数据与匹配层面（不是代码 bug，但影响结论可用性）：
  - 该生区间 302–434 分整体落在参考年本科线以下：只勾默认的「本科批B段」时池子只有 4 条（预科班类 2 条 + 管理学 1 条 + 农学 1 条），航线图两条线全空；勾上「高职（专科）批」后变成 792 所院校 · 5866 条，自选线 86 条。系统在定位/分数轴都不提示「你的区间基本在本科线以下、建议同时勾高职批」，只在航线图末尾一句带过。建议就地提示并可一键勾上高职批。
  - 池子里出现「边防军人子女预科」（太原学院、福建商学院）这类有报考资格限制的专业，卡片与列表没有任何资格标注（其他不满足的会显示「待核对」），学生可能把它当成可选。
- 体验不足（按影响排序）：
  - 谈心的等待明显长于界面承诺的「约 20–40 秒」（实测单轮 40–80 秒），期间只有一句轮换低语，没有进度、也不能做别的事。
  - 引航模式承诺「每一步我都会摆几个现成的答案」，实测有 1–2 轮一个可点选项都没有（只能自己写）。
  - 方向小结卡与自动收尾轮并行：收尾轮还在跑时卡片就能打开（先看到 3 个小类，落地后变 4 个），数字当场变化。
  - 「去分数轴匹配」只是换页，真正的匹配要在分数轴再点「用这个区间匹配院校」。
  - AI 建议卡没有「采纳/加入自选线」入口：想让两条线一致，得在 33 个大类、上百个小类里手动找同一项（无搜索、无「AI 建议过」标记）。
  - 「让溟讲讲就业方向」的回答不受方向目录约束：这次回答讲的是「医学技术类 / 医学影像技术」，而小结卡里列的是公共卫生与预防医学类、护理学类，两边不是同一批专业类。
  - 整条流程只存在内存里：刷新或热更新会清空（本次实测因并行线的热重载被清空三次），学生中途刷新就得从起航重来，AI 会话也要重新兑换动态码。
- 未覆盖：泛舟模式、通用模式（手填考试）那条路、打印与手机端 320px、以及 AI 快/深两档的对比，本轮都没走；四班 56 人里 8 人仍用旧码的兼容路径也没测。
- 未做：浏览器视觉验收由负责人自行完成；本轮未提交、未推送。

## 2026-09-13 / full-project-review：全项目审阅，业务问题待修复

- 基线 `14fad3f`，开始时保留他人 `apps/web/VISUAL_PROGRESS.md` 修改；核对机器、主进度、实施记录与验证结果后审阅。没有改业务代码、私有数据或冻结合同。
- 新增 `PROJECT_REVIEW_2026-09-13.md`：19 项发现（6 项 P1、13 项 P2）和 8 项完善事项；Redis 响应错配、开发数据目录暴露、兑换无失败限流、首次登船跳转、无 AI 主流程阻塞、旧区间残留列优先。新增脱敏验证摘要与只读合成复现工具；工具初跑因 CRLF 提取失败，规范换行后 5 项探针复现。
- 本次实测：typecheck、47 文件 554 项测试、双前端构建通过；Python 53+4 项、Pages 配置 1 项通过；数据库 19,264 项、分段表 19,178 项检查通过。npm 镜像 audit 404 后改用官方 registry 参数，报告同一公告的 2 个 moderate 包条目。未执行视觉、云端攻击/压测、部署及校园网/回滚。
- 同步主进度、机器 JSON、验证结果、README、AI/学校专题的当前事实；任务状态与门禁未变，不把审阅当成功能修复。历史验证保持原记录。
- 下一步按报告分批修复并补组件时序测试；本轮仅文档/审阅工具，未提交、未推送、未部署。交付前执行根目录 `py -3.12 tools/sync_project_docs.py --package` 与 `--check`，结果以本轮工具输出为准。


## 2026-09-13 / page-scroll-top：换页从顶端开始

- 现象（负责人原文）：「我通过点击开始启航进入定位之后，它进去的不是页面的最顶端，而是在下面这个地方，有问题，从一个界面到下一个界面，应该是从上往下，从开始浏览到下面，不应该进入界面是下方。把这个逻辑优化一下，包括后面的几个页面全部一起完善。」
- 原因：六个章节是**同一个文档里 display 切换的区块**，不是各自独立的页面，所以浏览器不会自动重置滚动位置——上一页滚到哪，切过去就停在哪。点「开始起航」时页面本来就停在下方（登船入口在起航页底部），于是进定位就落在中段。
- 修法：`App.tsx` 里对 `page` 加一段 `useLayoutEffect`——`window.scrollTo({ top: 0, left: 0, behavior: "instant" })`。三个细节缺一不可：① 用 `useLayoutEffect` 而不是 `useEffect`，在绘制前滚完，不会先闪一下新页面的中段；② `behavior:"instant"` 必须写明，全局 `html{scroll-behavior:smooth}` 会把这次跳转变成一段滚动动画；③ 挂在 App 上而不是各章节里——六页共用一个入口（`goTo`），一处覆盖全部。
- 实测（390×844，开发档）：起航滚到 1400 点入口进定位 → 落在 `scrollY=0`，定位页页头顶部在视口 83px 处（紧贴吸顶栏下方）；定位滚到 700 用导航条回看起航 → `scrollY=0`；再点回定位 → `scrollY=0`；在定位填一次考试生成区间后（navState：起航开 / 定位开 / 谈心开 / 方向锁 / 分数轴锁 / 航线图锁）滚到 600 再切谈心 → `scrollY=0`。前后两个方向、三个页面都验证过，其余章节走的是同一段 effect。
- 守卫测试：新增 `apps/web/test/page-scroll-top.test.ts`（2 项）——换页滚回顶部的代码必须还在、且必须是 `useLayoutEffect` + `behavior:"instant"`。
- 全量 `npm run test` 47 文件 554 项通过、0 失败；typecheck 通过；`--package` / `--check` 通过。

## 2026-09-13 / gate-entry-required：定位必须先选登船口，调试模式不再旁路门禁

- 现象（负责人原文）：「我点击开始启航之后，哪怕我退出来，定位也是已经解锁了的，这个地方只能够通过开始起航选了入口之后才能进入……如果一旦他没有选择对应的五次成绩或者荣县一中，他进入进去之后还是什么都没有」。
- 查实的三个口子（都在门禁侧）：
  ① `chapterDone("sail")` 只看选科齐不齐——选科是打开登船卡片的前提，所以「选科齐」几乎等于「点过开始起航」，定位就这样被放行了；
  ② 调试模式 `gateOpen = DEBUG_MODE || canOpen(...)` **整段旁路门禁**，开发档里任何章节都能直接点进去；
  ③ 调试模式预置了一段示例探索区间（`DEBUG_SAMPLE_RANGE` 550–570），它让 `rangeKnown` 在没有成绩时就成立，于是「定位」甚至直接显示为**已完成**，谈心/方向也跟着提前解锁。
- 改法：
  - `progress.ts`：`ProgressInput` 新增 `entryChosen`（在登船卡片里明确选过入口，两条路都算），`chapterDone("sail") = 选科齐 && entryChosen`；`DONE_HINT.sail` 改成「选好首选科目与两门再选科目，再点「开始起航」选一条登船口（通用模式或荣县一中）」。
  - `App.tsx`：新增 `entryChosen` 状态，`chooseRoute()` 里 `setEntryChosen(true)`（登船卡片两条入口的唯一出口），`clear()` 里一并复位；`gateOpen` 去掉 DEBUG 旁路；`hasChatted` 不再因调试模式成立；删掉示例区间那段 effect 与 `DEBUG_SAMPLE_RANGE`（`debug.ts` 的文件头注释同步改写）。
  - `sail.tsx`：删掉「先看看分数轴」按钮——门禁是真的之后，分数轴要等定位与方向走完才解锁，这个按钮只会弹一句提示，留一个按不动的入口不如不留（回看走下方导航条）。
- 调试模式现在还剩什么：预填本地演示访问码、本地假上游不返回结构化建议时注入两条「（调试示例）」建议、页面上的「调试模式」角标。门禁、成绩与区间一律按真实规则走。
- 实测（390×844，开发档即调试模式）：① 未选科点定位 → 停在起航，提示「先完成「起航」（选好首选科目与两门再选科目，再点「开始起航」选一条登船口（通用模式或荣县一中）」；② 选科齐了但没选入口 → 同样挡住；③ 打开登船卡片再关掉 → 仍然挡住；④ 选「通用模式」→ 进定位并出现「录入近几次考试 / 添加一次考试 / 探索区间（自动生成，可微调）」；⑤ 改选「荣县一中」→ 进定位并出现姓名 + 6 位查询码的接入表单。两条路进去都有事可做，不存在「进去什么都没有」。
- 验证：`progress.test.ts` 15 项（新增/改写 3 项：起航需选过入口、未选入口时定位锁住且提示指名、完成标记如实回退），`route-split.test.ts` 6 项（`chooseRoute` 断言补上 `setEntryChosen(true)`）；全量 46 文件 552 项通过、0 失败；typecheck 通过；`--package` / `--check` 通过。

## 2026-09-13 / overlay-viewport-fix：登船卡片不再被章节框住（两边露底、下方被挡）

- 现象（负责人原文）：「首页点击开始起航之后，弹出来那个卡片为什么两边有遮挡，而且这个卡片有 bug，它跳转的时候无法固定，导致下方的有一节被遮挡住了」。
- 根因不在卡片，在章节的入场动画：`.view{animation:arrive .65s var(--ease) both}` 带了 **fill**。带 fill 的动画即使已经结束，浏览器仍把元素当成「还在动 transform」的元素，于是它成为 `position:fixed` 后代的**包含块**——挂在章节里的浮层（登船卡片、设置卡、方向小结）全部改用章节盒子当参照：
  - 背板只盖住章节的宽度（390 视口里背板宽 354）→ 两侧露出页面底色，就是「两边有遮挡」；
  - 卡片只能对齐章节底部，页面一滚就跟着走 → 「跳转时无法固定，下方一节被遮挡」。
- 实测证据（390×844）：`fill=both` 时背板 rect `[18,-1224,354,2079]`（= `#page-sail` 的盒子）；把动画改成不带 fill 后 `[0,0,390,844]`（= 视口）。同一元素换成 `animation:none` 也是视口，说明就是 fill 造成的包含块。
- 修法一个 token：`.view{...animation:arrive .65s var(--ease)}`（去掉 `both`）。动画结束即回到自然样式（opacity 1、transform none，与原来的「to」态一致），视觉不变；章节里的浮层重新以视口为参照。没走「把浮层 portal 到 body」那条路——一条 CSS 就能修根因，不必动组件结构。
- 修后复测（三个滚动位置各开一次卡片）：背板始终 `[0,0,390,844]`，卡片 `[0,141,390,703]`（整屏宽、贴视口底、底部完整可见），页面滚动被锁住 ✓；设置卡浮层（同一个 `.board-backdrop`）也是 `[0,0,390,844]`，且祖先里已经没有带动画的元素 ✓。顺带确认 `#kun-stage`（北辰浮层）与 `.toast` 本来就不在章节里，rect 正常。
- 守卫测试：新增 `apps/web/test/overlay-fixed.test.ts`（3 项）——章节动画不许带 `both/forwards/backwards`、浮层背板必须是 `fixed + inset:0`、移动端是贴底整屏弹层（`padding:0;align-items:end` + `92dvh` + 安全区）。样式表里也留了说明，避免以后有人把 fill 加回来。
- 全量 `npm run test` 46 文件 552 项通过、0 失败（首跑有 1 项 `release-integration` 因并行负载超 5 秒超时，单跑该文件 13 项全过，属负载抖动，不是本轮改动）；typecheck 通过；`--package` / `--check` 通过。

## 2026-09-13 / GitHub 首页与最新前端同步发布

- 按负责人要求，继续把现有前端增量同步到 GitHub Pages，并整理仓库首页。根 README 已覆盖项目用途、六个章节、招生与成绩数据、AI 验证、部署结构、运行命令、目录导航和待验收范围；GitHub 仓库简介和主页字段已回读确认包含 Pages 地址。本次又修正 README 中过时的固定测试文件数。
- 本次纳入前端并行任务已交还的全站宋体与两页共用区间标尺。发布任务只收集、验证、提交和部署现有前端文件，不改动其实现逻辑；对应设计和交互依据见本文件下方 `serif-everywhere`、`range-fill-ruler` 条目。
- 本机重新执行 `npm run typecheck`、`npm test -- --maxWorkers=2`（45 文件、549 项通过）、按正式 API/COS 地址和 `/nanming/` base 构建主前端（通过；JS gzip 111.12 kB），以及根目录 `--package`、`--check`（通过）。线上 Pages 发布结果需在工作流结束后另记；这组本地结果不冒充已部署或负责人视觉验收。

## 2026-09-13 / range-fill-ruler：探索区间与分数轴的上下限改成一支共用标尺

- 目的（负责人原文）：「定位里面这里的探索区间有一个微调下限和微调上限这两个框，我觉得也有点不太好看。包括分数轴里面也会有这两个框区间上限，区间下限，把它同步进行优化修改和完善，重新设计一下。」
- 问题定位：四只框是同一种「两个一模一样、彼此独立的输入框」写法——可上下限属于同一个值（一段区间），摊成两个字段之后读不出它们是一段，没有单位，也没有和分数轴那条金带对上。
- 改动：
  - 新增 `src/range-fill.tsx`（两页共用）：一支标尺——数字是纸面填空（无框、一条铜色细底线，悬停底线转亮、聚焦点亮并浮一层柔光），中间一根带两个端头的细线（与分数轴金带上的端头同一支记号笔）读作「从下到上」，单位「分」整支只出现一次；两端各有一行铜色小字抬头（定位「微调下限/微调上限」、分数轴「区间下限/区间上限」，文案一字未改）。两页共用同一个模块，改一处两处一起变。
  - 端点语义留在各页自己手里，一字未动：定位改下限时上限兜 750、改上限时下限兜 0；分数轴还没有区间时以「另一个端点先等于这个值」起步（不补 750/0 造出巨区间）；两句 basis 也照旧。空串仍然表示「这个端点还没填」（交回 NaN）。
  - `style.css` 新增「区间标尺」一段（浅色卡 + 深海底两版，后者沿用原来那套深海玻璃底配方），并删掉 `.axis-hero .inp` 那五条——这一页只有这两只输入框，改用标尺后已无作用对象。
  - 窄屏（≤560px）：数字 30→25px、中线 26→18px、内边距与圆角各收一圈。
- 跨线说明：`chapters/locate.tsx`、`chapters/axis.tsx` 原属线一，本轮由负责人直接指派跨线接管；按契约先在 `PARALLEL_FRONTEND.md` 第四节登记（已交还），动手前两份文件都是干净的（最近一次改动来自线一 00:44 的提交）。
- 验证：`npm run typecheck` 通过；全量 `npm test` 45 文件 548 项通过、0 失败（新增 `test/range-fill.test.ts` 6 项：两页共用同一模块、端点语义与 basis 不变、标尺的样子、深海底那一版、旧结构下线、窄屏收一圈）。390×844 与 1280×900 两档实测（DOM 与计算样式）：定位页标尺 225×81、浅色卡底、底线 `--brass-line`、单位「分」只剩一处；分数轴英雄区里同一支标尺换成 `rgba(9,38,44,.55)` 玻璃底、数字 `#f2f6f3`、抬头 `--brass-2`；数字与中线的中心线相差 2–3px，两档都无横向溢出。改数走通：把下限交给输入框后，分数轴读数变 585–610、金带由 36px 变 45px、刻度同步成 585/610，再改回 590 复原。可读名称实测为「探索区间下限 / 探索区间上限」（aria-label 生效，抬头小字不并进控件名）。会话数据（物理类 + 化学/生物 + 目标分 600 → 区间 590–610）已重新填好。
- 未做：浏览器视觉验收由负责人自行完成。

## 2026-09-13 / serif-everywhere：全站一套宋体（正文、聊天框、输入框一起改）

- 目的（负责人原文）：「我看到还有很多字体是原本的字体，就是刚才小号字体的同号字体。把这一类字体全部改为宋体，比如说像谈心里的聊天框，填写分数的框里面都还是这种字体，全部改为宋体，要做到全覆盖，不要漏掉。」——第一轮只改了 ≤12px，13px 以上的正文（聊天气泡 `.bub` 13px、输入框继承的 14px）还是无衬线。
- 改动只有四处，但覆盖全站：① 基准字体 `body{font:14px/1.75 var(--song)}`——正文、气泡、输入框、按钮、表格都靠继承，一处改全站变；② `.num`（带等宽数字的数据位）改 `--song` 并保留 `tabular-nums`；③ `#page-direction .group-chip small` 改 `--song`；④ `--sans` 令牌保留名字、值改成宋体栈，并在注释里说明它是历史别名——以后哪怕有人手滑写 `var(--sans)` 也不会悄悄掉回无衬线；真要无衬线必须显式写字体栈。
- 改完后样式表里的字体声明只剩两种：`var(--song)`（123 + 2 处简写）与 `var(--display)`（15 + 20 处简写，Cormorant Garamond，本身就是衬线展示体，中文回退到 `'Noto Serif SC'`）；无衬线一条不剩。
- 补（同一轮内负责人点名的第二处）：「填写分数的框」——起航页的高考目标分输入框原本写死 `var(--display)`（数字走 Cormorant / 本机没装该字体时回退 Georgia），改成 `var(--song)`；规则收紧为**能打字的地方（input / textarea / select）一律宋体**并写进守卫测试。定位页的考试行、区间微调、谈心输入框本来就靠继承，已经是宋体。
- 守卫测试改为 `apps/web/test/serif-font.test.ts`（6 项，原 `serif-small-text.test.ts` 已删）：基准字体必须是宋体、`button,input,textarea,select` 只许 `font:inherit`、声明块里不许出现任何无衬线标记（含 `font:var(--sans)` 这种写法）、输入类规则不许写展示字体、≤12px 的规则仍要写明衬线、定位页 4 处 SVG 小字写死 `SONG_FAMILY`。
- 边界：纸版前端 `apps/web-paper` 有自己的样式表与字体令牌（`--serif`），本轮仍未动——负责人看的是主前端；`src/journey.css` 属于 `JourneyApp`（没有入口引用，是遗留件），同样未动。**只读**的数字（大号分数、占比、计数）与拉丁小标仍走 `--display`（衬线展示体）——这是这一版设计里的「数字声音」，不是被漏掉的无衬线；要连它们一起换宋体是一行的事。
- 全量 `npm run test` 45 文件 549 项通过、0 失败；typecheck 通过（`locate.tsx` 上另有一处在建改动报 `RangeFill` 未定义，与本轮无关，未纳入提交）；工作区根 `--package` / `--check` 通过。

## 2026-09-13 / serif-small-text：全站小字改宋体（≤12px 一条不漏）

- 目的（负责人原文）：「把前端中最小的那些字体改为宋体。这样的话看起来更加和谐，注意是整个网页进行一次全面的替换，不要漏掉」。
- 规则：**凡是 font-size ≤ 12px 的规则，一律写明宋体**（`--song`），不再靠继承拿 `--sans`。12px 是这条界线，13px 起才是正文。
- `style.css` 逐块解析后改写 76 条规则：73 条原本没写字体（继承无衬线）→ 追加 `font-family:var(--song)`；3 条原本写死 `var(--sans)` → 换成 `var(--song)`。`font:` 简写里的小字号同样处理（`.pack-state` 那一处替换位置算错，已修回 `padding:5px 10px`，并把简写里的字体改成 `--song`）。
- 不动的两类：① 显式用 `var(--display)`（Cormorant Garamond）的拉丁/数字串——它本身就是衬线展示体，中文会回退到 `'Noto Serif SC'`，本来就是宋体；数字继续走 Cormorant 保持「数字的声音」统一（大号分数也是它）。② 13px 及以上的正文与小标题。
- 不认 `var()` 的地方单独处理：定位页轨迹图里有 4 处 SVG `<text>`（纵向刻度 8px、两条切线标签 9px、柱顶分数 8.5px、柱下考试名 9px）原本连字体都没写、继承到无衬线；现按 `style.css` 同一串栈写死 `SONG_FAMILY`（presentation attribute 不认 CSS 变量，只能写死）。
- 验证（两重）：① 新增守卫测试 `apps/web/test/serif-small-text.test.ts`（3 项）：`--song` 带回退、`≤12px` 的规则没有一条落在无衬线上（含 `font:` 简写）、定位页 4 处 SVG 小字都带 `SONG_FAMILY`。② 浏览器逐页实测审计（390×844，4 班数据，池 1158 所 / 11643 条）：起航、定位、谈心、方向、分数轴、航线图六页逐页统计「算出字号 ≤12px 且字体栈里没有衬线」的元素——**六页都是 0 处**。第一次审计把 Cormorant 误判成非衬线（只看了字体栈第一位），修正判据后归零。
- 未做：纸版前端 `apps/web-paper` 有自己的样式表与字体令牌（`--serif`），本轮未动——负责人这一轮看的是主前端；要不要一起换，等一句话。
- 全量 `npm run test` 44 文件 540 项通过、0 失败；typecheck 通过；工作区根 `--package` / `--check` 通过。

## 2026-09-13 / sail-pack-manifest：「先定下三件事」改成行装清单（深海底带 + 竖轨）

- 目的（负责人原文）：「启航这里先定下三件事情优化一下，我觉得这里和整个网页的设计有点不太匹配。想一下怎么去改变一下这个设计，更加具有设计感和高级感」。
- 问题定位：三件事是起航页上唯一一块「白卡里摊一组默认表单」的地方——没有面板抬头，也没有页面上反复出现的那几样记号（深海底面、铜色细线、编号点、状态签），所以看着像另一套设计。
- 改动（`chapters/sail.tsx`、`style.css` 三件事一段及其窄屏对应几行）：
  - 卡头改成深海底的「备航状态带」：面板抬头（锚形图标 + 行装清单）、`{packed}/3` 显示衬线大数字 + 一枚状态签（可以出发 / 还差 N 件）、一条铜色细进度线（`scaleX`，不动布局），以及原来那句摘要（aria-live）就地再说一遍——深海底上换用 `#a9c3bd`（`--foam` 在海底上偏暗）。深海底面与右上那枚铜色圆环，与登船卡的两条入口、航线图面板同一支记号笔。
  - 三件沿一条竖轨排开：编号印章钉在轨上，备好点亮成铜色实心并挂 5px 光环（与顶栏六站航程轨「当前站」的点同款），轨在备好的那一段转铜色；最后一件下面不再连线，读得出清单到哪儿结束。
  - 每件右侧收一枚状态签（待定 / 已定 / n 门 / 已满 2 门 / 可不填 / 已填），与状态带里的进度是同一份事实的两种说法，不另造第二套状态。02 原来的 `.flab-n` 计数胶囊并进这枚签。
  - 目标分做成「一个数字」：显示衬线 19px、纸底、右缀「分」；选择按钮由胶囊改方角 10px（胶囊留给方向页的小类）。
  - 窄屏（≤560px）：状态带内边距、轨道列 34→28px、印章 30→26px、按键 42→40px 各收一圈；老结构 `.grid-2.sail-form`、`.flab-n`、`.field.sail-score` 的规则全部下线，其中包括 `#page-sail .panel{padding:18px}`——它会把这套新分段的 0 内边距加回来。
- 口径不变：出发门禁仍只看 01 与 02（进度线把选填的 03 也算一件，两者不是一回事）；满 2 门只变淡不禁用，点了给说明；选中章仍是扩散光环。
- 无障碍：03 的状态签裹在 `<label>` 里，加 `aria-hidden`——否则会并进输入框的可读名称（实测快照读成「高考目标分（可不填） 可不填」）。状态由那句 aria-live 摘要统一报出。
- 宽屏实测发现并修掉一处：状态签原来跟着行右边缘，1280px 下被 flex 推到离标题约 1000px 处，读不出属于哪一件（`.flab-t` 的 `flex:1 1 auto` 去掉，签紧跟标题）。修后实测两档宽度：1280px 签距标题 12px、面板高 629px；390×844 签距标题 9px、面板高 672px；两档 `scrollWidth` 都不超出视口。
- 验证：`npm run typecheck` 通过；全量 `npm test` 44 文件 540 项通过、0 失败（本轮复跑时并行线又加了一个测试文件；`test/sail-pack.test.ts` 由 6 项改写为 11 项：进度口径、竖轨、状态签、深海底带、逐件入场、签距与旧结构下线守卫）。390×844 实测（DOM 与计算样式，真实坐标点击）：三件备齐后 `data-packed=3`、面板 `data-ready=true`、进度线 `scaleX(1)`、三行状态签 已定 / 已满 2 门 / 已填、印章与轨道段落转铜色、`scrollWidth=390` 无横向溢出；摘要读作「当前：物理类 · 再选 化学、生物 · 高考目标分 600（演示值）」。会话数据已重新填好。
- 环境注记（非代码问题）：① 本内置浏览器的 role 点击在这块面板上一律超时（`elementFromPoint` 命中正确、坐标点击正常），DOM 断言改用页面内派发与坐标点击完成；② 标签页在后台时 rAF 不跑（`rafRan=false`），CSS 过渡停在起始值，因此「过渡之后的样子」要读内联值与规则（实测进度线内联 `scaleX(1)`、印章 `box-shadow:0 0 0 5px rgba(169,123,52,.14)`），出帧时刻的读数为 `matrix(1,0,0,1,0,0)`；③ 逍遥游浮层关闭后仍留在 DOM（`opacity:0 + pointer-events:none`），不挡点击。
- 提交归属：本轮改动被并行线的提交整文件扫入——`style.css` 的三件事一段随 `66cef28`（00:37）入库，`chapters/sail.tsx`、`test/sail-pack.test.ts` 与本条目随 `7916f91`、`c0b2664`（00:49）入库；本轮结束时这四个路径的工作区与 HEAD 一致（与本文件第五节的既有先例相同）。同一次扫描也把另一条线正在做的全站小字改宋体带了进来，那不是本轮的改动，本轮未触碰。
- 未做：浏览器视觉验收由负责人自行完成。

## 2026-09-13 / deck-spring-and-tighter-tail：纸堆改弹簧收尾，跑道再收短

- 目的（负责人原文）：「在上滑的时候还是会出现这样大面积的空白，而且我感觉这个动画流畅是假流畅，并不是那种非线性动画，带有阻尼感的那种动画，所以说滑动起来感觉还是有点不跟手」。
- 留白：末尾跑道再收一档 `min(13vh,116px)` → `min(7vh,60px)`（本轮是先 300 → 116 → 60）。390×844 上从卡片底到下一组标题的距离由约 165px 降到约 86px（60 跑道 + 14 外边距 + 12 上内边距/虚线）。跑道只决定「最后一张停得住多久」，不决定它能被读多久——停住之后不再滑动它就一直在。
- 阻尼：翻页的翘起不再直接把滚动量写给 `--ap`，而是先算目标值、再用一根**欠阻尼弹簧**去追：ωn ≈ 12 rad/s、阻尼比 ≈ 0.67，停下后约 0.7 秒收干净，落地过冲约 4%（`--ap` 到 1.04，样式上表现为纸上抬 0.6px、反向 0.3°，再落平）。慢速滑动时目标值变化慢、基本跟得住；快滑时纸会拖在手指后面一点，停手后自己把最后那点翘起收完——这就是「有阻尼」和「假流畅」的区别。
- 重量感：整摞再加一层按滑动速度的滞后（`--pile-lag`，最多 ±10px，另一根 ωn ≈ 16 / ζ ≈ 0.68 的弹簧，约 0.5 秒归位）。快滑时整摞往后沉一点、停下带一点回弹地归位，解决「内容像贴在手指上滑」的那种轻飘。
- 不吃帧：弹簧停住后 rAF 循环自动结束（判定 `|target-value| + |velocity|×0.1 < 0.0015`），不在空闲时空转；`prefers-reduced-motion` 下直接给目标值、不做弹簧与滞后；视野外的一摞整摞跳过并把它的弹簧清掉（回来时从目标值起步，不会跳一下）。
- 验证：`route-labels` 22 项通过（补了弹簧常量、reduced-motion 分支、`--pile-lag`、跑道 60px 等断言）。弹簧本身按同一组常量在 Node 里逐步积分复核：翻页 ωn=12.0 / ζ=0.66 / 过冲 4.0% / 0.72s 静止；整摞 ωn=16.1 / ζ=0.68 / 过冲 2.6% / 0.50s 静止。样式侧在页面里逐个喂 `--ap` 验证响应：0.10 → 抬 6.34°/缩 0.971/下移 12.6px；1.06 → 反向 0.42°/放大 1.002/上移 0.84px；1.00 → 完全摊平。
- 环境注记（不是代码问题）：这个内置浏览器在不可见/被遮挡时不产帧，`requestAnimationFrame` 完全不跑（实测连挂一个持续 CSS 动画也带不起来），所以弹簧的连续过程没法在这里逐帧观测；上面用「同组常量的数值积分 + 样式响应」两条独立证据代替，实际手感需要负责人滑一次。全量 `npm run test` 43 文件 532 项通过、0 失败；typecheck 通过；工作区根 `--package` / `--check` 通过。
- 未做：浏览器视觉验收由负责人自行完成。

## 2026-09-13 / latest-frontend-final-turn：继续发布前端并对齐 AI 收尾

- 提交 `c0b2664` 归档：后端千帆收尾提示与选项处理、当时前端增量、TOTP 本地工具及测试一并纳入；根 README 与 GitHub 简介/主页已更新，公网 README 回读为当前版本。完整快照以该提交所附的文档同步与验证日志为准。

- 并发增量：初次 `--package` 后，前端纸堆从直接跟手改成阻尼弹簧，`--check` 因源码变动未通过；随后源码和守卫测试继续调整。按负责人“半成品也上线”的授权，最终以再次实测和重新打包的当时快照为准；本轮没有编写该前端代码。

- 目的：负责人要求继续更新前端，且后端主动匹配，不能擅自修改前端。本轮读取并收集当前工作区增量，未编写或回滚 `apps/web` 源码。
- 合同核对：院校卡纸堆、方向分层、设置状态均为前端逻辑；谈心新增自动收尾轮沿用 `/v1/career/turn` 的原请求字段与目录、证据，不需要改变学校数据库或 COS 密文。发现旧千帆系统提示仍强制每轮提问及 guided 选项，与收尾指令冲突。
- 仓库整理：参照负责人公开的北辰、质量慧析、研芽仓库首页的项目定位、在线入口、功能、架构、运行和目录组织方式，重写根 `README.md` 并修正工程 README 中旧 JourneyApp/版本9 现状；补全公开数据、学校密文、AI、隐私与未完成门禁说明，不移动正在并行修改的源码。GitHub 仓库简介和主页地址随本轮推送同步更新。
- 后端修改：仅在 `user_text` 以当前前端固定的「【收尾】谈心到这里。」开头时使用总结提示，要求无追问、无选项、最多 4 条有证据的专业类建议；`finalize()` 即使收到模型误给的 guided 选项也清空。普通轮原规则保留。新增专项测试覆盖提示与选项落地。
- 验证：`npm run typecheck` 通过；`npm test -- --maxWorkers=2` 为 44 文件 540 项通过、0 失败；正式 API/COS 地址下 `npm run web:build` 通过，主 JS 342.20 kB（gzip 111.08 kB）。`node scripts/build_function.mjs` 打包成功。
- 云端：仅替换 `nanming-api` 代码并保留所有既有环境；版本 10 Active，下载 ZIP 逐文件比对一致，`/healthz`、`/readyz` 均 200。首次更新后函数已 Active 但代码下载端短时仍返回旧包，重试后校验一致，未改动环境。合成原话的真实千帆收尾轮 HTTP 200、complete、无问号、空选项、2 条建议；会话已撤销。脱敏证据见 `verification/final-turn-cloud-api-2026-09-13.json`、`verification/final-turn-online-2026-09-13.json`。
- Pages 工作流 `34706440514` 对提交 `c0b2664` 构建与部署成功；公网 HTML、JS、CSS 均 200，JS/CSS 与本机正式构建逐字节一致，公开 README 已更新，见 `verification/latest-pages-online-2026-09-13.json`。CI 验证仍有 3 项失败（两项既有数据哈希断言、私有学校分片未进入 CI）；按负责人半成品发布要求未阻断部署，也不记为测试通过。本轮不声明视觉验收。TASK-13、TASK-14与未通过门禁保留。

## 2026-09-13 / deck-flip-scroll-linked：纸堆收满后的留白收短、翻页改成跟着手指走

- 目的（负责人原文）：「全部收上去的时候，下面的留白太大了，再想一下，而且动画不够丝滑」。
- 留白：一摞末尾那段「跑道」从 `min(42vh,300px)` 收到 `min(13vh,116px)`。它只负责让最后一张停得住，不需要这么长的空程；收满之后当前这张下面只剩这段 + 下一组的标题。390×844 实测（探针）：收满时当前卡下方到下一段内容的距离由约 300px 降到约 110px（13vh）。
- 丝滑：翻页的翘起由「切 class 触发 0.58s 过渡」改成**跟着滚动走的连续量**——每帧把「离自己那条钉线还有多远」写成 `--ap`（1 = 已贴线摊平，0 = 还差一屏行程），CSS 用它算 rotateX / 位移 / 缩放，不再给 transform 加过渡。实测 `--ap` 随滚动连续变化（第二张 0.38 → 0.72 → 1.00；第三张 0.00 → 0.10 → 0.43 → 0.77 → 1.00），变换矩阵同步变化（rotateX 约 -6.7° → 0，缩放 0.968 → 1）。时间驱动的过渡会落在手指后面，快滑时发飘——这是「不够丝滑」的根。
- 顺手修掉两个实测暴露的问题：① 我第一版把公式方向写反（`1 - (line - top)/travel`），结果所有卡片恒为摊平、等于没有动画；改成 `1 - (rect.top - line)/travel` 后翘起才随滚动出现。② 钩子在挂载时找不到 `.card-stack` 就整段放弃，而抽屉是点开才把卡片放进 DOM 的，于是**第一次点开抽屉没有动画**；现在用 `MutationObserver` + `refresh()`，卡片一进 DOM 就认领（实测：关掉再点开抽屉，四张卡片立即带上 `--ap`，不需要额外出帧）。
- 另外：视野之外的一摞整摞跳过，不再每帧读它们的布局；卡片自带的入场动画仍然让位（`animation:none`）。
- 验证：`route-labels` 22 项通过（补了「公式方向」「MutationObserver 自愈」「跑道只留一小段」等断言）；全量 43 文件 531 项通过、0 失败；typecheck 通过；工作区根 `--package` / `--check` 通过。
- 环境注记：内置浏览器在页面不出帧时 rAF 不跑，`--ap` 会停在上一帧；本轮用「截图强制出帧」与「关掉再点开抽屉触发一次同步绘制」两种办法读数，都不是页面/代码问题。
- 未做：浏览器视觉验收由负责人自行完成。

## 2026-09-12 / cards-paper-stack：院校卡改成真正的纸张堆叠（滚一张翻一张）

- 目的（负责人原文）：「我要的是卡片抽屉式的堆叠结构。随着滑动有那种类似于纸张翻页的那种动效动画。然后停在当前卡片就只显示当前卡片的内容。」——上一轮的做法（跟随滑动只把细节调亮调暗）不算数：所有卡片都仍然摊着内容。
- 结构与做法：一个专业类的卡片叠成一摞（`.card-stack`），每张卡占一个 `.stack-slot`，用 `position: sticky` 钉在 `--deck-top + i × --deck-peek` 这条线上；`--deck-peek:66px` 正好露出抬头那一条（院校·城市 + 位置关系 + 专业名首行）。`shared.ts` 新增 `useDeckStack`：一帧一次（scroll/resize + rAF 合并）算出「谁在线上」，只切 `is-current` / `is-covered` / `is-arriving` 三个 class，**不动任何布局尺寸**，所以滚动不会被顶动。翻页感来自被钉住的那张不动、下一张从下面滑上来盖住它，并且它在落线之前微微翘起（`perspective + rotateX(-6.5deg)`，落到线上就摊平）。
- 两个实测踩到的坑（都写进注释了）：① 一摞末尾必须有「跑道」——`.stack-tail`（`min(42vh,300px)`）给最后一张留停留位；用真实的空 div 而不是 `padding-bottom`，因为 padding 不在内容盒里，sticky 的最后一张钉不住。② `.scard` 自带的 `msgin` 动画是 `fill:both`，动画来源会压掉翻转用的 `transform`，所以 `.card-stack .scard{animation:none}` 必须显式让位。
- 旧机制下线：IntersectionObserver / `.focus` / `.sc-detail` 透明度调暗全部删掉（`.sc-detail` 恢复常显；位次、招生数、学费只出现在摊开的那张上，因为别的都被压住了）。
- 分数轴的挑选口径同时修正：`AXIS_CARDS_PER_CLASS` 6→3、`AXIS_CARDS_TOTAL` 60→600。原来 60 张要平摊到一百多个专业类，`pickGroupedCards` 一轮就吃满上限，每个专业类只剩 1 张（页面标题写着「列前 1」），纸堆根本翻不起来；现在每类 3 张、总数上限只当安全阀，页面文案同步改成「每个专业类先展开前 3 张卡片」。
- 实测（390×844，4 班学校数据，池 1158 所 / 11643 条）：航线图一摞 4 张，滚到位时钉位依次是 `72` → `72/138` → `72/138/204` → `72/138/204/270`（步长正好 66px），状态依次 `C` → `xC` → `xxC` → `xxxC`，**任何时刻只有一张 current**；被压住的两张只露出 66px 的抬头条（实测暴露高度 66/66/201）。分数轴一摞 3 张同款：`72/138/204`、暴露 66/66/201，最后一张在 +360 与 +520 两处都稳在 204（跑道生效）。同一套结构另用合成 DOM 复验了跑道修正（132/346 → 72/246 → 72/138 → 72/138 → 滚走）。
- 验证：`route-labels` 22 项通过（改写「抽屉式分组」「纸堆三态与钉线」两项、新增「最低分常驻」一项）；web typecheck 通过；全量与文档同步见提交记录。
- 未做：浏览器视觉验收由负责人自行完成。

## 2026-09-12 / chart-cards-follow-scroll：航线图院校卡补上「跟随滑动」

- 目的（负责人原文）：「跟随滑动为什么没有，还是静态的呢」——同样的卡片，分数轴会跟着滑动亮起来，航线图那一屏还是静态的。
- 原因：上一轮只把跟随滑动做进了「分数轴」（`axis.tsx`）。航线图的 `renderCard` 把位次 / 招生数 / 学费与其他字段一起写在常显的 `.sc-foot` 一行里，页面上也没有任何观察者，所以滑到哪张都一样。
- 改动（`chart.tsx` 与 `axis.tsx`，均在已认领范围内）：卡片拆成两层——常显的是抬头（院校·城市 + 位置关系）、专业名 + 办学层次、批次·专业类、以及最低分；位次 / 招生数 / 学费 / 院校标签 / 「只有专业组依据」提示收进 `.sc-detail`。两条线的卡片收进 `<div className="route-cards" ref={cardsRef}>`，挂 IntersectionObserver；deps 是 `[focusKey, openCategory]`，因为窄屏抽屉是点开才把大类放进 DOM 的，展开状态一变要重新挂。
- 带宽收紧：`rootMargin` 由 `-42%` 改成 `-46%`（视野中间约 8% 的带子，比卡片矮），两页同时改——同一时刻通常只有「当前这张」亮着。过渡仍然只做 opacity / transform，卡片高度不随聚焦变化。
- 实测（390×844，4 班学校数据、池 1158 所 / 11643 条、两条线 685 条）：航线图 8 张卡的抽屉展开后，把第 1 / 4 / 6 张分别滚到视野中间，每次都恰好只有那一张带 `.focus`，它自己的细节 opacity 1.00、其余 0.35；三次测量里卡片高度集合都是 {190, 211, 235, 213}，与聚焦无关（无布局跳动）。分数轴同法复测（第 2 / 5 张）：聚焦恰好一张，opacity 1.00 / 0.35，高度集合 {177, 198, 201} 不变。
- 环境注记（本轮实测遇到，不属于代码问题）：在这个内置浏览器里，IntersectionObserver 的回调只在标签页真的出帧时才送达；页面在后台不出帧时 `.focus` 会停在上一次的位置。本轮用一次截图强制出帧后回调即正常（`3:true`，其余 false）。
- 验证：`route-labels` 新增 1 项（航线图跟随滑动：容器、观察者、带宽、deps、`.sc-foot` 不再含位次）并同步带宽断言，该文件 21 项通过；web typecheck 只剩另一路正在改 `App.tsx` 的 `catalog` 先声明后使用与 `direction-quota.test.ts` 的参数类型两处报错，与本轮无关。全量测试与文档同步见下条。
- 未做：浏览器视觉验收由负责人自行完成。

## 2026-09-12 / latest-frontend-backend-alignment：按最新前端合同对齐并发布

- 负责人要求以当前前端为唯一标准，后端主动匹配，并明确本轮不改前端。核对基线 `77b4b09` 与随后交还的最新工作区：新增行为是起航选科门禁、竖版院校卡长图、院校卡按大类/小类分组、谈心开场问题/回答起点、方向收口冻结、聊完方向小结及就业方向追问。
- 逐项核对实际请求：学校查询仍为 `POST /v1/school/identify`；AI 验证仍为 `POST /v1/access/exchange`；就业方向追问仍由既有 `POST /v1/career/turn` 发送 `user_text/context/thinking_tier/mode/evidence/direction_catalog`，仍消费 `reply/options`。没有新增接口、字段或数据库写入，API 版本9已经完整覆盖，故不重复上传云函数，也不改变数据库和密文对象。
- 准备提交后又接收到已完成的前端增量：AI备选答案由不齐的 `flex-wrap` 改为宽屏等宽两列、窄屏单列，答案文字居中；对应谈心与设置守卫测试同步增加。本轮仍未修改任何 `apps/web` 源码，只读取、验证并纳入发布。
- 最终类型检查通过；全量41文件509项通过、0失败；主前端生产构建通过。线上 `/healthz` 和 `/readyz` 均200，AI、Redis、千帆与公开数据均就绪。
- 当前提交将触发 GitHub Pages 发布；最终工作流、SHA、公网页面资产核验随后补记。负责人按协作约定自行做页面视觉验收；TASK-13、TASK-14与未完成门禁不变。

## 2026-09-12 / nanming-totp：AI 固定访问码改为动态码（已部署）

- 基线 `d2a6a03`。按负责人要求参考北辰正式站：新增 Base32/SHA-1/30 秒/6 位 TOTP，允许 ±1 窗口；扩展 `StateStore.consumeOnce`，内存档用于开发，生产 Redis 使用 `SET NX EX` 原子防重放。`createApiServer` 显式接收同一状态存储。
- 正式环境不再读取 `NANHANG_TRIAL_ACCESS_CODE`；部署脚本改为必需 `NANHANG_TOTP_SECRET`。新种子用系统安全随机源生成，32 位 Base32，存 `private/nanming-totp-secret.txt`；文档和验证报告仅登记 SHA-256 指纹，原值不入库。
- 前端只改实际主入口的兑换错误提示、谈心输入约束与会话过期提示：数字键盘、one-time-code、最多6位，区分过期/错误与已使用。按并行规则认领 `App.tsx`、`ai-panel.ts`、`chapters/talk.tsx`，不改布局和样式。
- 本机类型检查通过；专项4文件66项通过，先前后端范围6文件121项通过；全量40文件483项中482通过，1项 `route-labels.test.ts` 的窄屏航线图历史断言失败，来自并行航线图实现变化，与TOTP无关，不改他人文件来消除失败。生产前端构建通过，SCF包129KB。
- 使用私有交接凭据部署 `nanming-api` 版本9：先加新种子、再更新代码、最后移除旧固定码，避免切换窗口；下载线上ZIP逐项校验一致，原有环境配置不变。线上前一窗口动态码兑换成功、同码重放401、旧固定码401、会话撤销200。回滚包在 `private/backups/nanming-totp-20260912`，未演练回滚。
- 提交 `8de1983` 已推送；Pages 工作流 `34697202201` 构建与部署成功，公网HTML和JS均200，脚本包含新的动态码输入、过期与重放提示。CI另有两处既有数据哈希断言与私有成绩分片缺失，共3项失败；依现有半成品发布策略未阻断构建，不记为通过。
- 脱敏证据：[线上TOTP](verification/nanming-totp-online-2026-09-12.json)。原始种子与认证器参数直接交给负责人。后续学生规模发码、校园网与回滚演练仍未做；TASK与门禁不变。

## 2026-09-12 / acceptance-followup-complete

补充快照9e31d9f已完成Pages构建与部署，工作流34696117253由gh run watch --exit-status返回成功。CI仍出现两处哈希断言与私有学校测试文件缺失，按授权不阻断；不冒充全量通过。API继续版本8。本条仅归档发布结果，重新执行--package/--check后以[skip ci]文档提交推送，避免重复构建相同代码。负责人从Pages实际验收，未完成门禁保持。


## 2026-09-12 / acceptance-followup：继续发布当前前端

负责人要求继续；核对基线5124e86，上一轮线上为f18f215。本次把其后方向卡片修复、航线图样式及当前talk聊天界面、动效与聊天测试一起纳入快照，不等待在建工作收尾；不覆盖其他任务修改。API源代码未变，保留已经线上核验的版本8和881密文，不重复上传。已有39文件481项本地结果来自其他任务记录，不充当本轮新实测。根目录--package/--check同步后提交推送，等待Pages构建和部署；本轮仍允许测试失败不阻断半成品发布，具体结果以对应Actions运行记录为准。任务与门禁不变，完整视觉/功能验收仍由负责人完成。


## 2026-09-12 / acceptance-final-confirmed：最终发布结果

最终源码快照f18f215已成功发布，GitHub Actions [34694705981](https://github.com/yusheng266186-beep/nanming/actions/runs/34694705981)构建与部署成功；API为版本8。公网HTML、JS、CSS请求均200。云端测试为3文件失败、33文件通过、1文件跳过（3项失败）：两处数据哈希断言不一致及学校私有分片未进入CI；按负责人要求允许半成品发布，没有把这些测试标为通过，也没有为测试上传学生明文。本轮无后续功能修改；本条仅补充实际发布结果，文档重新--package/--check后归档提交。线上48人查询、两种speed聊天和会话撤销结果见acceptance-online记录。完整功能与视觉由负责人验收。


## 2026-09-12 当前快照线上实测（负责人验收版本）

- API版本8为Active，881密文上传及线上ZIP逐项比对成功，环境变量全部保留；[部署结果](verification/acceptance-cloud-api-2026-09-12.json)。
- 使用负责人提供的身份表逐一请求线上接口：四班48人均成功，本人分片与原数据一致，匿名考试汇总返回，Pages来源CORS一致；其余8人保留原码。本机保留规则已在前轮全量核验，本次未用缺失身份的8人做线上登录。
- 真实千帆speed档：guided完成且返回4项选择；open完成且无选择项；兑换和会话撤销成功。health/ready、Redis、Pages均通过。详见[线上结果](verification/acceptance-online-2026-09-12.json)。
- 首次网络断连后有限重试；核验脚本一度用错evidence.kind被400拒绝，改成与前端一致的student_self_report后两模式通过。此错误来自脚本测试数据，没有修改线上接口来迁就脚本。
- 首轮Pages工作流34694203265成功；本次最终提交继续纳入期间的前端在建修改，推送后由同一工作流构建发布。未再次运行本机全量测试，云端保留验证结果但依负责人要求不阻断半成品发布。历史454项结果不能冒充最终快照的新测试结果。
- 未完成：负责人视觉与完整功能验收、standard/deep本轮在线调用、真实学生规模/校园网、回滚演练；任务与门禁不虚增。文档执行根目录--package和--check后随代码同次提交。


## 2026-09-12 / acceptance-cloud-deployed：当前在建成果直接上线供验收

- 基线46a51ee（首轮Pages工作流34694203265成功）；负责人要求不等待收尾，第二次快照继续纳入部署期间产生的App、章节、样式和对应测试修改，保留其原实现。
- 按负责人指定从北辰私有交接库读取腾讯云凭据，仅在内存使用；官方SDK安装在忽略目录private/deploy-deps，辅助部署/核验脚本也位于private。没有改动北辰服务，没有把凭据或学生明文加入Git/源码包。
- 执行export_identity.py、build_function.mjs和private/deploy_acceptance_snapshot.py：上传881个学校密文；更新nanming-api并发布版本8，状态Active；下载线上ZIP逐项比对成功，所有既有环境变量保持一致。更新前后ZIP备份保存在private/backups/acceptance-cloud-20260912，未实施回滚演练。
- 首次线上核验遇到RemoteDisconnected，未作为成功；增加有限网络重试重新执行。实际查询、AI与撤销结果见随后脱敏核验记录。
- Pages类型与测试保留执行日志且本轮不阻断发布；实际构建必须成功。本轮不追加功能收尾，不作页面视觉验收，不宣称全部功能或学生规模验收通过。TASK与门禁状态未变。
- 根目录执行sync_project_docs.py --package及--check，再提交并推送包含文档与当前前端修改的最终验收快照。后续由负责人实际验收，身份生命周期、校园网和回滚仍未完成。


## 2026-09-12 / acceptance-cloud-snapshot：负责人要求全部当前成果部署验收（进行中）

- 负责人明确授权：不等待其他任务、不要求完工，全部当前前后端部署供实际验收。本轮纳入当前工作区未提交代码、前端布局及此前后端/四班查询码变更；不回滚或覆盖在建改动。
- Pages保留验证日志，但校验步骤continue-on-error，使未完成测试不阻断本次验收发布。地址配置与实际构建仍必须完成。
- 开始基线1d43c94；GitHub CLI已登录、Pages仓库变量已核对。腾讯云终端环境没有部署凭据，控制台未登录，已请求负责人恢复登录或提供既有凭据位置；同步继续Pages发布。
- 部署顺序：上传已准备的学校汇总密文，更新含四班新索引的API，发布Pages快照；在凭据恢复前API更新仍待执行。阶段门禁不虚增，未完成的东西仍作为半成品验收。
- 验证与最终部署SHA/地址将在本轮完成记录中追加。当前文档记录属于部署进行中，不等于已上线。



## 2026-09-12 / class4-query-code-x0：四班查询码改为身份证后六位，X按0

- 负责人指定身份工作簿，只读匹配48条；成绩库四班共56人，48人唯一匹配，另外8人按负责人明确回复保留原查询码。随后负责人指示X用0代替，最终全部为六位数字，前导零保留；6人执行X→0，转换后没有重复码。
- 实现：新增 import_class4_codes.py、verify_class4_codes.py 和合成测试；export_identity.py 读取私有覆盖表并原子更新身份索引。新查询键沿用原分片定位，48个旧查询键移除；其他832人映射、成绩SQLite与本人分片不变。覆盖表只存稳定ID及新码摘要，原身份工作簿和完整身份证不复制进工程；更新前私有备份。
- 界面接线仅改查询码提示与数字规范化，明确身份证末位X改填0；不改视觉布局。保留其他前端任务在建改动。最初支持X的中间实现已被最新指示替代；初始测试跨目录导入API导致TypeScript错误，已移除该导入，真实API验证由私有输入核验脚本承担。
- 验证：最终 npm run typecheck 通过；npx vitest run --maxWorkers=2 为36文件454项通过；Python unittest 4项通过。SCF重新打包，实际48人HTTP逐人查询全部成功，其中6人X→0；对比返回内容等于本人原分片。旧48键移除、其余832键不变、四班8人保留原码、SQLite哈希不变，见 class4-codes-x0-result-2026-09-12.json。早期含X的结果文件仅为历史。未做浏览器视觉验收。
- 文档：新增 CLASS4_QUERY_CODES.md；同步主进度、机器状态、学校专题、README与验证记录；根目录--package/--check验证生成摘要与分发包。不虚增任务/门禁完成状态。
- 状态：本机新查询码映射已生效，未提交、未推送、未部署。上线需要含新索引的API部署与Pages说明更新；本轮查询码变化不要求重传成绩密文，但若并同上一轮后端补齐部署，必须先上传上一轮汇总密文。


## 2026-09-12 / backend-alignment：以后端适配实际章节版前端

- 开始基线 6e3ec33；过程中有其他前端任务并发提交，未暂存/提交/回滚他人文件。依据 main.tsx 的实际 App 入口核对，不以过时 JourneyApp 文档替代界面。
- 学校接口与数据：school-access 返回本人分片及考试汇总，export_school_cloud 增加加密汇总对象；App 移除静态汇总读取。只回 exams/trend，不发源路径、问题原值与班级明细。880本人密文+1汇总已本地生成，5份分片抽查及实际汇总解密逐字节/结构对照通过；不改分数数据库和换算口径。
- AI：网关原话容量匹配前端完整发言，HTTP/上下文上限相应调整；API异常503与断开处理，移除进程内多余令牌副本；客户端断网收尾、401重连、4000字提示、清除探索请求撤销云端会话。生产DEV隔离演示注入，Pages增加HTTPS地址检查、类型检查、测试门禁。
- 验证：最终 npm run typecheck 通过；npx vitest run --maxWorkers=2 为34文件439通过；专项11文件168通过；node --test scripts/check_pages_config.test.mjs通过。SCF打包产物本机真实学校识别+汇总+假AI HTTP+撤销通过，日志不含身份/成绩/令牌。真实汇总密文独立解密回读通过。双前端生产构建与SCF打包通过。
- 历史失败如实保留：前两轮默认并发目录测试触发5秒超时；中间一轮遇其他前端在建导入缺失与文案断言失败，后续最新快照均通过。本轮真模型探针未完成（本地访问码文件格式不是直接的纯码输入，未发送模型请求）；只读线上health/ready、Redis、CORS及招生指针通过，不把它们记作新代码上线。
- 文档同步：更新项目进度/机器状态/README/AI与学校专题，新增 BACKEND_FRONTEND_ALIGNMENT 发布矩阵；生成副本与包由根目录同步工具处理，不手改。任务/门禁完成范围未提升；TASK-11保持负责人跳过。
- 未完成与下一步：当前请求为后续Pages发布作准备，本轮不发布仍在收尾的共享前端；新成果未提交、未推送、未部署。必须先上传汇总密文，再部署API，再发布Pages，随后验证真实模型完整学生流程、手机校园网、规模与回滚。部署命令与凭据边界见新专题。


## 2026-09-12 / topbar-320：顶栏 320px 溢出归零（≤340px 专项收紧）

- 目的：负责人要求三路并行改前端且互不打架；本轮认领实施记录在案的遗留项——sail-compact 轮顺带记录的
  「320px 下顶栏 `.head-end`（四川·尚未选科·2027 + 溟）横向溢出 18px」。
- 实现：`style.css` 末尾新增 `@media(max-width:340px)` 专项块：品牌字距（23px/.24em→18px/.16em）、
  上下文按钮（字号 11px→10px、内边距 12→8、图标 16→13px）、头像（40→34px）同步收一圈，
  `.topbar-in`/`.head-end` 间距 12→8；根因是品牌与 `.head-end` 都 `flex-shrink:0`，故在 ≤340px 允许
  `.head-end` 收缩、上下文文字以省略号兜底——字体渲染再偏宽也不会顶出横向滚动。基础规则未动，
  390px 及以上不受影响（390 品牌字号仍走既有 ≤400px 块的 20px，`.head-end` 仍不可收缩）。
  新增 `test/topbar-narrow.test.ts` 4 项守卫：基础规则未被改动、收缩与省略号兜底存在、
  点击高度 ≥32px、专项块只对 ≤340px 生效。
- 提交归属说明：样式块于 19:49 写入（早于分工契约创建），被线一/线二 `6e3ec33` 按 style.css 整文件
  add 扫入 HEAD，与该提交自身的导出区改动可共存（线三 20:01 已登记复核）；本轮提交只含守卫测试、
  实测截图与文档，不含其他线的文件。
- 并行避让：按 `docs/PARALLEL_FRONTEND.md` 参与避让——本轮除共享的 style.css 末尾追加外，未触碰
  其他线的独占与在建文件（App/sail/talk/settings/chart 等的未暂存改动一律未动）；`MANIFEST.sha256`、
  `FILE_INDEX.md` 与源码包由线一的同步流程刷新，本轮未跑 `sync_project_docs.py`（串行规则），
  同步留待该线下轮执行。
- 验证：`npm --workspace @nanhang/web run typecheck` 0 错；全量 `npm run validate` 31 个测试文件、
  419 项通过、0 失败（20:03 实测；19:54 曾见 settings.test 1 项失败，系线三设置卡当时在途，与本轮无关）。
  浏览器实测（内置 Chromium，320×568）：`scrollWidth==clientWidth==320`，改前在案溢出 18px；
  上下文文字完整未截断（span scrollWidth==clientWidth）；390×844 溢出为 0 且专项块不生效
  （flex-shrink 回 0、品牌字号 20px 与改前一致）；六章 320px 逐页强制可见扫查 pageOverflow 全 0。
  截图 [topbar-320-fixed-2026-09-12.png](verification/topbar-320-fixed-2026-09-12.png)。
- 未做：实施记录在案其余「未修」项均属负责人裁定（调试模式关闭、学校接入自动代填目标分）或
  数据管线范畴（满分口径导出），本轮未认领；未做真机验收（界面视觉按分工契约由负责人自行验收）。

## 2026-09-12 / axis-cards-deck-focus：分数轴院校卡改成抽屉式分组 + 跟随滑动的「当前这张」

- 目的（负责人原文）：「大学专业卡片这里也设置成抽屉式卡片，跟随滑动显示卡片信息，动画要做好，丝滑流畅，停留则显示当前卡片信息。」
- 分组抽屉：`axis.tsx` 的院校池改用与航线图同一套分组与挑选（`groupRouteRows` + `pickGroupedCards(grouped, 6, 60)`）：手机端（`useNarrow()`）把大类收成抽屉（复用 `.deck/.stop` 的堆叠与展开动效），宽屏是「大类标题 → 小类标题 → 卡片」的平铺分组列表。实测 390×844：池子分成 5 个大类抽屉（工学 25 个专业类 / 1110 条、管理学 8 / 528、文学 3 / 222、经济学 4 / 183、医学 5 / 68）。
- 跟随滑动（`.focus`）：卡片拆成「常显」与「细节」两层——抬头（院校·城市 + 位置关系）、专业名 + 办学层次、批次·专业类、以及最低分常显；位次 / 招生数 / 学费 / 院校标签 / 待核对条件放进 `.sc-detail`。用 IntersectionObserver（`rootMargin: -42% 0px -42% 0px`，即视野中间约 16% 的带子）给当前那张切换 `.focus`，CSS 只过渡 opacity 与 transform——**细节始终占位，不改变高度**，所以滚动时页面不会被顶动。
- 实测（390×844，工学抽屉展开 25 张卡）：滚到中间时恰好 1 张带 `.focus`、其细节 opacity 1、其余 0.35；**聚焦卡与普通卡高度完全一致（177px）**，无布局跳动。触屏（`pointer:coarse`）下细节常显 0.75（不需要跟着忽明忽暗），`prefers-reduced-motion` 下细节常显且无过渡。
- 共用：窄屏判定 `useNarrow()` 从 `chart.tsx` 挪进 `shared.ts`，两页共用同一阈值（≤720px）。
- 验证：`route-labels` 新增 2 项（分数轴抽屉与跟随滑动、两页共用 useNarrow），该文件 20 项；全量 41 文件 510 项通过——其中 `settings.test.ts` 一条因另一路正在改 App.tsx 的设置接线而失败（`renderSettings({ open: settingsOpen`），与本轮无关。web typecheck 通过。
- 权衡：卡片高度由 148 → 177px（细节常驻占位换取零跳动）；若希望更短，可把细节并回最低分那一行（约省 30px），需要负责人定。

## 2026-09-12 / chart-counts-and-deck-polish：图内三个数字改为按两条线统计；抽屉内排布收口

- 目的（负责人原文）：「文字被挤压了，而且点开之后的卡片排列不好看，再优化一下，还有一个问题，为什么航线图那个 svg 图片里面更好的位置永远都是 0，同分比例也是固定的数值，那些都不会发生变化的吗？」
- 三个数字的真相（查实并修）：
  - 它们原来统计的是**整个院校池**（`pool.rows` 的候选），所以换方向、换自选都不会动 —— 这就是「像固定值」的原因。现在改成统计**两条线里的记录**（按 offeringId 去重），实测加一个小类：同分 6 → 13、余量 379 → 568 ✓。
  - 「需更好位置」恒为 0 是**池子的定义**决定的：`referenceOverlaps` 只收与你的位次区间有交集的记录，位置比你更靠前的记录根本不会进池子（域内 `compareRankIntervals`：candidate 全在 reference 之前才算 AHEAD，全在其后才算 BEHIND）。这条现在写在页面说明、以及导出图的图下小字里（海报新增 `chartNote`）。
  - 版心右上角改成「两条线 N 条 · 池 X 所 / Y 条」，两种版式都改了。
- 排布收口：抽屉内容原本内边距为 0，标题与卡片都贴边（负责人看到的「被挤压」）。现在 `#page-chart .deck .stop-body` 补内边距、小类之间加虚线分隔（首个不加）、卡片间距 18→12、小类标题两端各留 2px 且数字用等宽数字、类名过长省略号——只作用于航线图，不动首页起航那副抽屉。
- 验证：`route-labels` 19 项（新增「三个数字按两条线统计 + 说明为空的原因」）；全量 41 文件 510 项通过；web typecheck 通过。DOM 实测：加一个小类后同分/余量计数随之变化；版心右上角两种版式都显示新口径。
- 未做：浏览器视觉验收由负责人自行完成。

## 2026-09-12 / chart-deck-grouped：删复制按钮、导出改高清、卡片按大类小类分层（手机抽屉 / 导出平铺）

- 目的（负责人原文）：「直接删掉航线图里面的复制文字版按钮，导出的图片清晰度不够，因为图片本身长度很长……给出的院校推荐卡片要按照大类和小类专业组进行分类。要有层次感，不要把所有的卡片一股脑的全部扔出来，这里也可以借鉴首页起航里面六个靠岸里面的那种卡片，抽屉式堆叠的这种思想，加上很好的动画。注意，这里改动了之后，移动端显示的是抽屉式卡片，但是导出的图片里面依然是这种平铺的视图，但是分类也要体现在导出的图片里面。」
- 删按钮：`chart.tsx` 去掉「复制文字版」按钮与 `copyText` 实现（导出区现在只有「保存为 PNG 图片」「回去调区间」），三处提示语不再指向它。
- 清晰度：海报按 **2 倍**像素密度光栅化（`PNG_SCALE = 2`）。SVG 是矢量，放大不损失清晰度；实测同一份内容从 720×2358 提升到导出画布 **1440×4716**，长图放大后文字依然锐利。
- 分层（页面两版、导出海报同源）：新增 `shared.ts::groupRouteRows()`（按发布包原文的 `category` 门类 → `categoryClass` 专业类分组，两级都按条数从多到少排）与 `shared.ts::pickGroupedCards()`（每个专业类取前 4 张、每条线合计上限 24 张，按轮次在各组间挑选，保证层次都能露头）。
  - **手机端（≤720px）**：大类收成抽屉（复用首页起航六站的 `.deck/.stop` 与其堆叠、展开动效），一行显示「专业类数 · 大类名 · 条数」，点开才展开该大类的小类标题与卡片——不再一股脑全堆出来。
  - **宽屏**：平铺的分组列表——大类标题（含「N 条 · M 个专业类」）→ 小类标题（含「N 条 · 列前 4」）→ 卡片。
  - **导出海报**：始终平铺，且分类照搬（大类标题 + 计数、小类标题 + 计数、卡片），与页面同一份挑选规则。
- 验证：`route-labels` 18 项（新增分组排序、每类取数上限、抽屉/平铺/海报同源、2 倍导出、复制按钮已删）；全量 41 文件 507 项通过。DOM 实测（390×844）：抽屉 2 行（工学 341 条 / 电子与信息大类 44 条，默认全收起，单行 54px），展开后小类标题为「计算机类 341 条 · 列前 4」并有 4 张卡；导出画布 1440×4716；切到 1280 后抽屉归零、平铺分组标题出现（`sc-cat` 2 个）。
- 遗留：每线 24 张的上限同时决定海报长度（当前约 2×2358px）；若希望更短，调小 `CARDS_PER_CLASS/CARDS_PER_ROUTE` 即可（页面与海报同源）。

## 2026-09-12 / sail-gate-and-poster-wysiwyg：起航门禁 + 导出改成与手机端一致的竖版卡片海报

- 目的（负责人原文）：「首页起航这里在没有点首选科目和再选科目直接都可以点击开始起航，这里不应该允许弹出卡片，而是在提醒学生去选择，选择了之后才能够拉起卡片。……把刚才航线图里面导出 png 改为导出的图片要和手机端的显示一致，也就是长的矩形卡片，而不是像刚才那样把院校集中在一坨看起来密密麻麻的，做到所见即所得。」
- 起航门禁（`sail.tsx`）：点「开始起航」先查选科——没选首选提示「先在下面选好首选科目与两门再选科目，再开始起航。」；只选了一半提示「再选科目要正好 2 门——先在下面选满，再开始起航。」；两门齐了才拉开登船卡。实测三种状态：无选科→不弹卡只提醒 ✓；只有首选→不弹卡只提醒 ✓；三科齐→弹卡 ✓。
- 导出改成竖版卡片海报（`shared.ts::buildRoutePoster` 重写）：宽度 720（手机版心约两倍），图用**竖版**那张航线图（在 DOM 里始终存在），每条线下面**一张张卡片**往下排（与页面卡片同构：院校·城市 + 位置关系色标 / 专业名 + 办学层次 / 批次·专业类 / 最低分 + 位次·招生数·学费 / 院校标签），末尾「写给你」+ 免责说明——不再是把院校压成一堆 22px 的文字行。
- 验证：`route-labels` 16 项（海报断言改为卡片式：院校抬头、专业、参考年最低分、一行数据、院校标签、其余条数、寄语、竖版宽度）；全量 40 文件 491 项通过；web typecheck 通过（仅剩另一路 `talk.tsx` 半改中的报错）。DOM 抓取实际导出：画布 **720×4170**，海报正文含「南溟航线图 / 四川 · 物理类 · 2027 / 探索区间 200–460 分 · 参考年 2025」+ 竖版航线图 + 卡片数据行「位次 185,117 · 招 4 人 · 学费未知」+「另有 361 条未逐条列出」+ 寄语「愿你既有仰望星空的方向……—— 南 溟」+ 免责说明。
- 遗留：海报长度会随条数增长（当前一线 24 张卡 ≈ 4170px 高）；若希望更短，把每线条数上限调小即可（页面与海报用的是同一个数字）。学校入口（荣县一中）现在同样要求先选满三科才能拉开登船卡——若希望学校通道豁免，需负责人确认。
- 事故与修复：本轮用脚本重写 `shared.ts` 时替换区间比预期大，误删了 `RELATION_CLASSES` / `experienceCardFor` / `majorCardFor`；类型检查当即报出，已从 HEAD 取回原文补上并复跑全量（40 文件 491 项通过）。

## 2026-09-12 / chart-cards-score-poster：卡片加最低分、压扁高度，导出改成整页海报

- 目的（负责人原文）：「最后航线图这里面给出来的对应学校和专业没有给出对应的最低录取分数线，学生可能不知道哪个学校的分数是对应哪一个……导出为 png 图片这里导出是有问题的。导出的话应该是把航线图，还有专业对应的院校，这些还有包括最后写给你这段话全部囊括进去……每一个学校和专业的这个卡片适当的压缩一下所占的位置太大了，导致滑的时候很费劲。」
- 最低分：合约里的候选只带位次区间（`reference_rank_interval`），没有分数。新增 `shared.ts::scoreRangeForRanks()`——用发布包里**同一年**那张一分一段表反查（表里每行是一个分数，其位次带是 `[cumulative−count+1, cumulative]`；位次落在哪一行就是哪个分数），查不到返回 null 写「未知」，不插值不外推。卡片上以「{参考年} 最低 N 分」打头，位次跟在后面。
- 卡片压缩（航线图与分数轴两处同款）：抬头与「位置关系」标签并成一行（`.sc-head`），专业名收成 16.5px、办学层次改为名字后的内联小标签，批次/专业类并成一行小字（`.sc-sub`，资格只在不符合时才出现），原来的三格方块（参考年/位次/招生数/学费）压成一条数据行（`.sc-foot`：最低分 · 位次 · 招 N 人 · 学费）。实测单卡高度 **236 → 148px**（-37%），同样的 27 张卡少滑约 2400px。旧的「符合已检查条件」徽章与 `.ranks` 三格随之退役（`.sc-foot` 的旧定义一并删掉，避免同权重覆盖）。
- 导出改成整页海报：新增 `shared.ts::buildRoutePoster()`（纯函数，返回一个 SVG）——抬头（南溟航线图 · 地区/科类 · 区间/参考年）+ 航线图正文 + 两条线的院校专业清单（每行「院校 · 城市 · 专业（层次）」+ 右对齐「最低 N 分 · 位次 · 招 N」）+ 末尾深海底色那段「写给你」+ 免责说明。`savePng` 收集数据后交给 `svgStringToPng` 光栅化。清单只列页面展开的前 24 条/线，其余条数如实写在海报里。为了让窄屏也能导出横版海报，两版版心**都留在 DOM**（`.rt-narrow` / `.rt-wide`），显隐交给 CSS，海报取宽版那张。
- 验证：`route-labels` 新增 3 项（位次反查分数的四种边界、海报内容与高度、卡片压扁与两版共存），该文件 19 项；全量 40 文件 491 项通过；web typecheck 通过（仅剩另一路 `talk.tsx` 半改中的 `useState/useRef/useScrollLock` 报错）。DOM 实测：卡片 148px、字段为「2025 最低 444 分 / 位次 200,565 / 招 6 人 / 学费未知」；导出后 canvas 尺寸 **1000×1316**（含 24 条清单与寄语），窄屏（390）下 `.rt-narrow` 可见、`.rt-wide` 隐藏但仍在 DOM。
- 未做：浏览器视觉验收由负责人自行完成；未改「复制文字版」（仍只含每路前 20 条的院校与专业名）。

## 2026-09-12 / full-walkthrough：负责人视角的完整走查（起航→定位→谈心→方向→分数轴→航线图）

- 目的（负责人原文）：「从头到尾进行一次完整的验证交互，作为用户来使用这个页面……选用荣县一中数据选择 4 班的学生，完整地跑一遍，看会不会遇到什么问题」。本轮**不改产品代码**，只记录走查与一次环境修复。
- 环境级阻塞（已修，需其他线知悉）：本地 API 进程是 18:41 启动的旧版，`/v1/school/identify` 只返回 `{shard}`；而前端新代码（另一路的后端对齐）要求响应同时带 `index`，否则抛「成绩汇总暂不可用」。结果：**任何学生都登不进去**。已按 `apps/api` 的 start 脚本重启（profile=development、假上游、8790），重启后响应为 `{shard, index}`（汇总 24 行 + 趋势 12 点），登录恢复。**改后端代码后必须重启本地 API 进程**，否则前端会整段不可用。
- 走查路径与结果（内置浏览器、调试构建、本地假上游）：起航（六站抽屉 + 三件事）→ 开始起航 → 登船卡两条入口 → 荣县一中入口 → 4 班学生接入（3 行只读、入口考已剔除、区间自动生成）→ 谈心（连接 + 一句话，收到回复与两条建议）→ 方向（1 大类 + 计算机类）→ 分数轴匹配 → 航线图（AI 线 3 条 / 自选线 385 条、27 张分层标签卡、图签与占比）。
- 发现的问题（未修，按用户视角排序）：
  1. **引航模式"现成答案"没渲染**：talk.tsx 写着「每一步我都会摆几个现成的答案，点一下就算你答了」，但 `AnswerStarters` 只在 App.tsx 里被 import、无任何渲染点——说一套做一套。
  2. **低分段学生死胡同**：区间 136–189（全在公布范围 150 以下）点匹配被拒，只得到「区间端点超出参考年分段表的公布范围，请调整分数区间。」——不告诉要抬到多少、也没有一键修正；走查时只能手动改成 200–460 才走通（改成 237 所院校 / 2418 条后双线正常出卡）。
  3. **报错与空态自相矛盾**：匹配失败后，分数轴空态仍写「区间已经有了：选好批次，点上面的「用这个区间匹配院校」」，让用户去做刚失败的事。
  4. **4 班查询码已换**（另一路按负责人要求改为身份证后六位，末位 X 记 0）：抽查 8 名 4 班学生，旧码 7 名 401、1 名成功（属保留原码的 8 人）。不是缺陷，但**旧码表仍会被误用**，需确保新码已发放到位。
  5. **门禁无法验证**：`DEBUG_MODE` 短路了章节门禁，六站全可点——「一步一步解锁」这条产品规则本轮没有验到，需关掉调试开关再走一遍。
  6. **调试注入的建议没有标记**：谈心里 AI 建议（财务会计类/财政税务类）是调试模式注入的示例，与我说的内容无关，界面上没有"调试示例"字样；上线前必须关掉，否则学生会以为 AI 在乱推荐。AI 回复自称「本地假上游」，开发环境正常。
  7. 次要：内置浏览器里「复制文字版」因剪贴板权限失败（提示诚实，引导手动复制）；「保存为 PNG 图片」提示已保存，但下载是否落盘取决于浏览器权限，未能在内置浏览器确认。
- 未做：未修上面任何一条（属产品/其它线的决定）；未在真机、关闭调试模式或真实模型下走查。

## 2026-09-12 / chart-inline-motion：航线图去边框直接落在页面上，并补入场与悬停动效

- 目的（负责人原文）：「图片不要边框，直接放入进去，最好增加一些交互和动画，显得更加高级。」
- 去边框：删掉两版版心的纸色底板、版框矩形、四角铜色刻线、经纬底纹，以及左下图签的方框——SVG 变成透明，卡片底色透上来，看着是页面的一部分而不是贴上去的一张图。底部改用一条细线收口（区间 / 参考年 / 免责说明排在同一行）。导出 PNG 不受影响：`svgStringToPng` 会先垫纸色再画。
- 动效（全部走 transform/opacity，且只在页面上生效——导出时 SVG 被序列化重画，CSS 不跟着走，静态图保持干净）：
  1. **入场**：三条关系行错峰（0 / .11s / .22s）上浮淡入（`rt-row-in`）。
  2. **悬停**：`@media(hover:hover)` 下鼠标进入图表即把三行压到 42%，指到的那一行恢复全亮、浮起 4.5% 深海色底（`rt-band`）、线加粗到 4、光晕加深、胶囊加深、名字转墨色——像海图上一层被点亮。
  3. **帆船**：`rt-bob` 6.5s 一次 ±2.6px 的起伏；外层 g 不带 transform 属性，避免 CSS 变换覆盖内层坐标变换。
  4. **触屏**：没有 hover，用 `:active` 短暂点亮；`prefers-reduced-motion` 下入场与起伏全关、过渡取消。
- 验证：`route-labels` 新增 2 项守卫（无底板/版框/刻线、动效钩子与关键帧在位），该文件 13 项；全量 39 文件 481 项通过（`--testTimeout=15000`）；web typecheck 通过。DOM 核对：图内无背景/版框矩形（`plainRects: []`）、SVG 背景 `rgba(0,0,0,0)` 与卡片底色 `rgb(251,249,242)` 贴合、三行 `rt-row-in` 延迟 0/.11/.22s、帆船 `rt-bob` 在位、悬停底色初始 opacity 0。
- 未做：浏览器视觉验收由负责人自行完成。

## 2026-09-12 / empty-route-honesty：选了方向却不出卡片——查实并改掉那句说错的解释

- 负责人报障：「我选择了合适的分数，选择了合适的方向，也点击了匹配院校，但生成航线图后没有对应的学校卡片，这是一个 bug 吗？」
- 复现与根因（内置浏览器实测）：**方向页可勾的专业类来自整份发布库**（`buildReleaseCatalog`，同一选科/批次下全部真实专业，标注的「计算机类 · 31 个专业」也是发布库口径），而**航线图的卡片只从匹配出的院校池里出**（`pool.rows` 按住区间、选科、批次筛出来）。两者不是一回事：`buildSchoolPool` 里 `pool.majors` 取的是**全部候选**的目录，`pool.rows` 才是命中区间的那部分——所以页面会把「发布库里有的类」说成「在院校池里」。实测两种形态：池子大时（263 所 / 1853 条）勾哪个常见类都出卡；把区间调到低分段（池子 2 所 / 2 条）再勾「计算机类」→ **0 张卡**，页面给出「这些专业在院校池里，但当前区间、选科和批次没有命中院校专业」——这句是错的，而且没有给出可操作的下一步；若自选完全落空还会显示「两条线都还空着 · 去方向自选」，让已经选过方向的学生再选一遍。
- 本轮改动（`chart.tsx`）：① 空结果分两种情形——没选方向 vs 选了但池里没有；后者列出是哪几个专业类、并给出「回分数轴放宽区间」「换个方向」按钮（`chosenDirections` 由自选 + AI 建议条数算出，`missingNames` 从 id 取回类名）。② 每条 0 条记录的路线，文案改成「这些专业类在你这次的院校池里一条记录都没有（池子共 N 条 · M 所院校）……可以把区间放宽一点、把高职（专科）批一并勾上」，并说明池子是按什么筛出来的。
- 验证：`route-labels` 新增 1 项守卫（空结果说实话：不许再出现旧措辞）；该文件 11 项、全量 37 文件 467 项通过（`--testTimeout=15000`）；web typecheck 通过（仅剩另一路 `App.tsx`/`sail.tsx` 半改中的 `renderSail` 报错）。新文案的浏览器复核未跑成：页面在复现过程中被另一路的热重载多次整页重置。
- **未改（待定）**：根子在「方向」页——它显示的是发布库口径的数量，没有任何「在你当前院校池里有几条」的提示，学生只能靠试。建议在每个专业类后面标「池内 N 条 / 池内 0 条」（无池时标「匹配后显示」），池内 0 条的淡显。该文件（`chapters/direction.tsx`）归另一条线，本轮未动。

## 2026-09-12 / route-mobile-plate：航线图窄屏换竖排版心（负责人三次反馈）

- 目的（负责人原文）：「这个图太小了，如果在手机端上根本看不清是什么东西。」
- 根因：横版版心是 1000×320，缩到 390 宽的手机上只剩约 312px 宽，等比缩到 0.87 倍后 13px 的字只剩 4–5px，确实读不出来。
- 改法：新增 `useNarrowPlate()`（`matchMedia('(max-width: 640px)')`），窄屏改画 **360×372 的竖排版心**——一条关系一行（名字＋空心色环 → 计数与占比 → 一条带波纹的航路），底部收口：航线小结、区间、参考年与免责说明各占一行；数据、配色、虚线样式与横版完全同源，只是版式换了。导出尺寸改成读当前这张图自己的 `viewBox`，窄屏导出竖版、宽屏导出横版，不再写死 1000×320。窄屏另收掉卡片留白（`.chart-stage` 圆角、`.chart-head` 内边距、隐藏旋转印章、`.routes` 与图例内边距），把版心从 312px 撑到约 328px。
- 实测（390×844 内置浏览器，DOM 量测，非视觉判断）：竖版生效（viewBox `0 0 360 372`），版心 312×322、缩放 0.87，关系名 **17px**、计数 **28.5px**、图题 15.5px，全部落在版框内（越界 0）——之前横版是 4–5px，现在读得清。加宽留白那一步（312→328）未能在浏览器复测：另一路正在改 `sail.tsx`/`App.tsx`（类型检查报 `renderSail` 缺 `route`/`chooseRoute`），页面多次整页不渲染。
- 验证：`route-labels` 新增 1 项守卫（窄屏竖版存在、两种 viewBox 都在、导出尺寸跟 viewBox 走、不许再写死 1000）；该文件 10 项、全量 36 文件 459 项通过（`--testTimeout=15000`）。
- 未做：未做浏览器视觉验收（按分工契约由负责人自行验收）；加宽留白后的复测留待页面恢复。

## 2026-09-12 / route-chart-plate-2：航线图版心收口与信息补全（负责人二次反馈）

- 目的（负责人原文）：「文字超出图片里面，而且整个图片我感觉没有太大的变动，还是很不好看。」
- 查实两个具体毛病：
  1. **确有越界**：第一版沿用了旧图的右侧标签列 `LABEL_COLUMN_X = 992`，而新画的版框右边界是 976 —— 右侧关系名/计数、以及右下角那句说明都跑到框外。本版把一切坐标收进 `PLATE` 常量（版心 44–956，航路 200→700，数据栏 866–956），并删掉那两个旧常量。
  2. **信息太少、空得发虚**：全图只有三条线加三个数字。本版补上：左上角图题（ROUTE RELATIONS · 航线关系图）、右上角院校池口径（「区间内匹配 263 所院校 · 1,853 条专业 × 院校」）、左侧每条航路的关系名＋空心色环、右侧数据栏（浅底胶囊里的计数 + 「占 98.2%」占比）、航路两侧的细导轨线、中段空档里的航线小结（原来是压在坐标里的散字）、右下角两行说明。
- 版式：三条航路 y=92/158/224（间距 66），中间 172–210 空档留给航线小结，224 以下留给图签与说明；左侧写名字、右侧只留数字，两端都有落点；帆船压在中间那条航路的起点上。
- 验证：web typecheck 通过；新增 1 项守卫（版心常量 x1=956、旧标签列 `LABEL_COLUMN_X` 与 x=992 不许回来）；`route-labels` 9 项、全量 36 文件 459 项通过（`--testTimeout=15000`，整机负载下 release-integration 偶发 5s 超时已排除）。**几何核对（非视觉判断）**：量了图内 19 个文字与胶囊的包围盒，全部落在版框 24–976 × 22–298 内，最右 958.7、最下 290.7，越界项 0。
- 未做：未动三条航路的 y 与导出尺寸以外的几何；未做浏览器视觉验收（由负责人自行验收）。

## 2026-09-12 / route-chart-plate：航线图重画成「海图版画」，顺带修掉导出 PNG 的深色底

- 目的（负责人指出，附截图）：「航线图……看着非常的低级和 low，和我们整个页面的主题、还有设计不相符。」指的是图里那张 SVG（三条横线 + 小船 + 右侧标签），不是推荐卡。
- 顺带查出的真问题：**导出的 PNG 一直是深色底**。导出流程先把画布填成 `#08202a` 再画 SVG，而旧图那块底是 `url(#rtSea)` 渐变——SVG 被序列化成独立文档后该引用解析不到，纸色底不生效，于是露出深色垫底，就成了负责人截图里那张「黑底草稿」。本次把图内所有 id 引用（渐变/滤镜/sprite 的 `<use>`）全部去掉，颜色字体写成元素属性，并把垫色改成纸色。
- 重画内容（viewBox 与三条线的 y=78/158/238 不变，导出与屏幕同一坐标系）：纸色满幅底 + 海图版框（双线细框、四角铜色刻线）+ 不标数值的经纬底纹（避免被读成分数轴）；三条航路各画两遍（低透明度光晕 + 主线）并在两端加节点，右侧引出细虚线到标签栏——关系名用衬线小字、数量用 Cormorant 大号并加千分位；左侧一枚金铜色小帆船标出起航点；左下角是双框区间图签（EXPLORATION RANGE / 550–570 分 / 参考年 2025）；底部一行航线小结，右下角写「按历史位置参考绘制 · 不构成录取判断」。空态也改成两行衬线文案。
- 图例一并收口：`.route-legend` 拉开间距、标签改用章节衬线，与图签、卡片同一种语气。
- 验证：`npm run typecheck`（web）通过；`npx vitest run apps/web/test/route-labels.test.ts` 8 项通过；全量 vitest 36 文件、453 项通过——其中 `release-integration` 一条在整机负载下超时 5s，单独重跑 13 项全过（与本轮无关，属并发负载偶发）。DOM 核对（非视觉判断）：图上 rect fill=`#f7f5ee`、29 条 path、6 个节点圆、无任何 `url(` 引用，文字为「需更好位置 / 0、同分或边界重叠 / 33、历史位置较有余量 / 1,820、EXPLORATION RANGE、550–570 分、参考年 2025、按历史位置参考绘制 · 不构成录取判断」。
- 未做：未动三条线的 y 坐标与导出尺寸（另一路 19:20 定的几何）；未做浏览器视觉验收（按分工契约由负责人自行验收）。

## 2026-09-12 / route-cards-tiered：推荐卡改成分层标签，页底「保底路线」段撤掉

- 目的（负责人裁定，原文）：「航线图这里看起来太廉价了，把它改的更加的高级和贴切一点。然后下面的这些什么冲刺保底不应该在下面写出来，而是应该在直接的推荐的院校的卡片里给出对应的标签。哪些学校是冲刺，哪些学校是保底，哪些学校是本科，哪些学校是职业院校，哪些学校是 211、985、双一流。」
- 改法（受项目边界约束）：`FRONTENDS.md` 明令「不预测录取、不给概率、不提供「冲稳保」」，AI 输出里出现这类词也会被 `validateCareerTurnOutput` 拦下。因此卡片分层用**发布包自己的历史位置关系**——需更好位置 / 同分或边界重叠 / 历史位置较有余量（与图上三条线、图例同一套 cls：far / main / safe，卡片顶部加同色细线）；「本科 / 职业本科 / 高职（专科）」取发布包 `level`；院校标签（C9联盟 / 部委直属 / 卓越中医 / 原XX部直属…）取 `institutionTags`。**985 / 211 / 双一流 发布包与源工作簿里都没有**，本轮没有伪造。
- 改动：`chart.tsx` 与 `axis.tsx` 两处推荐卡统一换成分层卡片——抬头（院校 · 城市）→ 专业名 → 标签行（位置关系 · 办学层次 · 批次 · 专业类 · 资格）→ 院校标签行 → 数据行（参考位次 · 招生数 · 学费）。删掉「符合已检查条件」在顶角徽章与底部格子里各写一遍的旧排法；位次不再是「247189–247189」（相等时写 `247,189`，统一千分位）；`shared.ts` 新增 `levelLabel` 与 `formatRankInterval` 两个纯函数供两页共用；`chart.tsx` 删除整段「保底路线 · 每条路都能通向远方」及其 `.safety/.srow/.sicon` 样式。
- 验证：`npm run typecheck` 通过；全量 vitest 32 文件、429 项通过、0 失败；新增 `test/route-labels.test.ts` 4 项守卫（底部说明段与类名不再回来、两页标签同源、`levelLabel` 与 `formatRankInterval` 行为）。DOM 层面核对（非视觉判断）：分数轴匹配出 263 所院校 / 1853 条后，卡片标签为 `同分或边界重叠 / 本科 / 本科批B段 / 中药学类 / 资格符合`，院校标签 `原中医药管理局 / 卓越中医 / 部委直属`，数据行 `参考 2025 位次 45,869 · 招生数 1 · 学费未知`，卡片类名 `scard rel-main`。
- 待裁决：① **985 / 211 / 双一流 拿不到数据**：发布包 `institutionTags` 现有 40 余种全是「卓越工程师 / 省部共建 / 部委直属 / C9联盟 / 五院四系 / 原XX部直属」这类，源工作簿字段也只有院校代码/名称/专业组/专业/批次/招生类型/地区/选科/学历层次/招生数/学费/学制，没有办学层级列。要做只能新增一份带来源登记的静态名单（39 所 985 / 116 所 211 / 双一流名单），并按院校名匹配 2308 所院校（有名称变体风险），需负责人确认来源后再做。② 若要字面上的「冲刺 / 稳妥 / 保底」措辞，那是对 `FRONTENDS.md` 边界与 AI 校验词表的修改，需一并裁定。
- 未做：`.scard` 视觉是两页共用的，分数轴页卡片同样变了样子；未做浏览器视觉验收（按分工契约由负责人自行验收）。

## 2026-09-12 / chart-export-slim：航线图删掉「本人数据」与打印，剩余按钮重排

- 目的（负责人裁定，原文）：「把航线图里本人数据这个地方直接删掉……这里的打印另存为 pdf 就不要了，剩下的几个按钮重新排一下版，好看一些。」
- 改动：`chart.tsx` 删除整块「本人数据」面板（含「下载本人 JSON」；「清除本次探索」已由另一路移到顶栏「溟」→ 设置），删除打印按钮并撤掉 `window.print()`；剩下三枚按钮重排成两级——「保存为 PNG 图片」独占一行当主操作，「复制文字版」「回去调区间」等宽并排为次要操作（`.chart-actions.chart-export` + `.export-row`，≤400px 时各自占满一行）。`ChartProps` 去掉已无用的 `download`。三处原本引导「改用打印 / 另存为 PDF」的失败提示改为引导「复制文字版」；「已展示前 24 条，其余请下载 JSON 或打印查看」改为说明复制文字版含每路前 20 条。
- 归属与协作：`chart.tsx` 属另一路（线三）的独占文件，其 19:45 那笔已在 `docs/PARALLEL_FRONTEND.md` 登记为「已交还」；动手前重读了含其改动的当前内容，其 SVG 几何与文案改动全部保留，本轮认领登记也写在该文件第四节。线三的 `test/settings.test.ts` 里「下载仍留在航线图」一条断言因面板下线而失效，本轮只改这一条（改为断言面板与打印入口都已下线），其余断言未动。
- 验证：`npm run typecheck` 通过；全量 vitest 30 文件、415 项通过、0 失败。
- 数据流复核（浏览器，非视觉判断）：导入一名 4 班学生（11 次考试）→ 区间 356–444 → 分数轴匹配到 164 所院校 / 1536 条记录 → 方向页勾 1 个大类 + 5 个专业类 → 航线图渲染出「我的自主选择 · 462 条」与 1489 项「历史位置较有余量」，图内标签为 `区间 · 356–444 分`；底部只剩三枚按钮，页面已无「本人数据」面板与打印入口。AI 建议线本轮为空（没走谈心对话），要两条线同现需先聊一轮。
- 顺带查实的一条产品事实（不是缺陷）：另一名 4 班学生的区间 378–430 整个落在**本科批线以下**，同口径只勾「本科批B段」时只匹配到 **4 条**记录，看着像坏了。直接查发布库确认：物理类本科批B段 2025 年 `major_admission_min` 共 16613 条，最深位次只到 247,189，其中 1138 条挤在 199,440–214,418 这一小段（本科线上下），再往下几乎空白——所以「区间整个在本科线以下 + 只勾本科批」＝空池是数据本身的样子。同一名学生若区间上探到 444（含本科线段），立刻变成 164 所院校 / 1536 条。**建议**：默认只勾「本科批B段」，这类学生会看到一个接近空的池子且没有任何解释，宜在勾批次处提示「你的区间在本科批线以下，建议同时勾选高职（专科）批」，或按区间位置默认勾上高职批。此项未改，留待负责人定。
- 未做：未动 `chart.tsx` 里另一路的 SVG 几何；未改「保底路线」等正文；未改 `presentation.test.ts` 里那条打印样式断言（那条断的是 CSS 的 `@media print`，与页面按钮无关）。

## 2026-09-13 / level-selected-fix：修掉「大类选中后看不出变化」

- 现象（负责人指出）：小类勾选后有深色表示选中，但大类选中后没有任何变化，看不出哪些选了哪些没选。
- 根因（我上一轮引入的 bug）：`#page-direction .group-chip{…background:var(--card)}` 带了 `#` 作用域，**权重高于全局的选中态** `.chip[aria-pressed="true"]`（(1,1,0) > (0,2,0)），所以选中时仍被按回卡片底色 ✗。小类那边我也顺手确认了同类隐患：`.class-chip` 覆盖了 `color`，会把选中时的深色文字压成低对比的铜字。
- 修法（`style.css`，作用域不变）：
  - **未选中规则里不再写 `background`**（原地留了注释说明为什么）；悬停一律加 `:not([aria-pressed="true"])`，不许压过选中态。
  - **选中态单独写**：大类 `.group-chip.on, .group-chip[aria-pressed="true"]{background:var(--sea);…}`（实心深海＝范围圈定），小类 `.class-chip…{background:var(--brass);…}`（实心铜，沿用既有语言）；两级的计数小字在选中时一并提亮（`#a9c3bd` / `#f6e7cf`）。
  - 迁移时误删的 `.class-row`（缩进 + 左侧铜色竖线）两条规则已补回。
- 验证：`npx vitest run` 43 个测试文件、531 项通过、0 失败——`test/direction-levels.test.ts` 增到 5 项，新增那条专门钉这次的原因：两级都必须有显式选中态、**未选中规则里不许出现 `background`**（出现就把选中态压掉）、悬停只对未选中生效。
- 环境观察（对负责人有用）：本轮因为我在改文件，**Vite 热重载把内存里的会话清空了**（选科、对话都只在内存）——这也是之前数据反复消失的原因。所有编辑结束后重新填了一份，供负责人查看。

## 2026-09-13 / session-fill：手工铺一份可看的会话数据（顺带复核「选科 → 目录」这条依赖）

- 目的（负责人原文）：把需要的数据给我填上，我看看效果是什么样的。
- 做法（只在浏览器里点，**不刷新页面**，避免冲掉内存里的会话；没有改任何代码或仓库文件）：
  1. 起航：首选**物理类**、再选**化学 + 生物**、高考目标分 **600**；
  2. 方向：大类勾 **工学、理学**，专业类勾 **计算机类 / 电子信息类 / 机械类 / 数学类 / 物理学类**（2 个大类 + 5 个小类，正好是收口判据「5 小类、跨 2 大类」的形状）；
  3. 分数轴：点「用这个区间匹配院校」；
  4. 航线图：查看自选线结果。
- 实测结果（本机，2026-09-13）：填好选科后**方向页出现 33 个 chip**（目录构建成功）；区间由目标分 ±10 生成（与上轮 550–570 的样例区间不同，故院校数从 263 变为 **187 所院校 / 1536 条专业×院校**）；航线图显示**「我的自主选择 · 84 条专业 × 院校」**。
- 这条会话同时复核了上一轮诊断的依赖关系：**目录为空的根因就是选科未定**——选科一填上，目录立刻从 0 变成 33 个 chip，AI 的建议才有落地的可能。未填的部分：AI 推荐线（需要在谈心页用云端 AI 聊出建议）。
- 验证：本轮无代码改动，不涉及测试与哈希；仅记录会话数据与本机观察。

## 2026-09-13 / direction-levels：方向页两级选择在视觉上分层（大类 ≠ 小类）

- 目的（负责人原文）：方向里面选择大类和小类，用不同的颜色区分一下，不然容易把它看成一个层级，其实他们是从属关系，想想怎么优化。
- 问题：两级原来都用同一个 `.chip`（同为胶囊、选中同为铜色 `brass on`），大类下面展开的小类也只是一排同样的胶囊——看起来像一排并列，读不出从属。
- 改法（`chapters/direction.tsx` 加三个类名 + `style.css` 一段；文案与结构未动）：
  - **大类 = 范围**：`group-chip`，海绿（`--sea`）系、`border-radius:10px`（略方，像文件夹）、衬线字、字号 13px；选中走既有的 `.chip.on`（实心深海，大类不再用铜色），计数小字在选中时提亮成 `#a9c3bd`。
  - **小类 = 范围里的内容**：`class-chip`，铜（`--brass-line` / `--brass-3`）系、保持胶囊、字号 12px；选中仍是实心铜——沿用本 App「铜色＝学生自己勾的」这套既有语言（已选汇总里的 `×` 胶囊也是铜色，一致）。
  - **从属再加一层结构暗示**：展开的小类区整块 `.class-row` 缩进 14px、左侧挂一条 2px 铜色竖线，小标题也转铜色——读起来就是「挂在上面那个大类底下」；窄屏（≤640px）缩进减半，别把可点区域挤窄。
- 归属与占用：`chapters/direction.tsx` 原登记在线二名下；动手前查过它当时干净（最后改动 19:35），本轮只加类名、没动文案与结构，已记进认领登记。
- 验证：`npx tsc --noEmit -p apps/web/tsconfig.json` 0 错；全量 `npx vitest run` 43 个测试文件、530 项通过、0 失败（新增 `apps/web/test/direction-levels.test.ts` 4 项：两级各有类名且大类不再用铜色、颜色与形状分开、缩进与竖线的从属暗示、以及「只在方向页生效不泄漏到别处」——`.chip` 是全局组件，这条守的是作用域）。按负责人指示不做视觉校检。

## 2026-09-12 / material-frontend：删掉那句免责声明；「素材够不够」改成前端判

- 目的（负责人原文）：那句话需要删掉；判断素材够不够放前端应该也可以，不一定非要在网关，那里加提示词太麻烦；可选 ID 仍然来自候选科目，不做变动。
- 删掉那句：`apps/web/src/ai-panel.ts` 正常一轮不再写 `status`（原来每次都挂「AI 建议仅作待确认方向，需你本人确认。」，像一句免责声明）。**出错、降级、限流等真实状态照旧写 status**；真正要说的边界在界面各处写出了具体来源。钉住这句的那条测试（`test/ai-panel.test.ts` 的「正常回复原样展示，但不进入画像」）随之改成断言 `status === null`——它是另一条线的文件，本轮为保持全绿做了这一处最小改动。
- 「素材够不够」改前端判（不动网关提示词、也不让模型自评）：`direction-quota.ts` 新增 `MATERIAL_READY = { minTurns: 6, minChars: 240, hardTurns: 12 }` 与 `materialEnough(studentTurns)`——**六轮起、学生自己写的字数（去掉空白）累计 240 字起**，或满 12 轮一律算够（再聊也不会多出什么，不让学生无限聊下去）。`directionTalkSettled(studentTurns, suggestions, groups)` 的入参从「轮数」改成**学生原话**，判据变成「方向覆盖到量 **或** 素材够」。
  - 数字选整数档是为了对学生解释得清楚；判据只用学生能控制、且看得出「说过具体的事」的量，不引入任何模型自评。
- 顺带补一条诚实提示：谈心室在**没有专业类目录**时（选科未定时目录为空）直接说明原因——「专业类清单按选科与批次生成，现在 AI 认不出专业类，先去「起航」把三件事定下来」，避免再出现「聊了十几轮什么都没有、也不知道为什么」。
- 不做的（按负责人裁定）：AI 的「可选方向 ID」仍然来自**依赖选科的候选目录**，本轮不动。
- 验证：`npx tsc --noEmit -p apps/web/tsconfig.json` 0 错；全量 `npx vitest run` 42 个测试文件、525 项通过、0 失败（`test/direction-quota.test.ts` 增到 11 项：素材判据的三种边界——轮数不够、字数不够、满 12 轮兜底——以及「没到兜底轮数时空话不算素材」；`test/talk-room.test.ts` 增到 19 项：删句与真实状态、缺目录时的提示、素材判据入参）。按负责人指示不做视觉校检。
- 一句自我修正：本轮先写错了两处测试夹具（把「每轮字数」当成「总字数」），以及在自己的注释里又把那句被删的话写了一遍（守卫是按源码不含它来断言的），都已改正。

## 2026-09-12 / final-turn：借北辰的「报告轮」——聊天只收集素材，收尾由界面发起一次专门的生成请求

- 目的（负责人原文）：再去看看北辰的代码，它是怎么样去通过聊天把结果给判断出来的，借鉴它的思路优化一下。
- 先在北辰那边读到的（固定提交 `f02c70b5` 的 `index.html`）：
  - **聊天轮只收集素材**：领航每轮下发的引导词只是「问一个问题 + 3~4 个可点答案」；夜航从第 5 轮起随轮下发【夜航 · 画像评估】，让模型安静判断素材够不够，够了才输出【可点亮】标记（宁缺毋滥）。
  - **结果是另起一轮生成的**：`buildReportInstructions()` 是一条专门的生成指令（【点亮星图】），带严格逐字段规格——称号 / 方位 / 星值 / 五张星卡 / 3+1+2 组合 / 5–8 个专业（每个三段：专业名‖推荐分析‖**就业方向**）/ 寄语；而且**证据只发学生自己的原话**（`buildReportEvidence()`：按主题标注学生回答，明确不重复发 AI 正文）。
  - **生成之后画像不再变**：`POST_REPORT_GUIDANCE` 把 AI 切成「解答者」——只回答、不再主动提问、不再出报告；想重来要走「重新测试」。
  - 触发：领航满十轮自动一次（只此一次），夜航靠模型自评或满 15 轮兜底。
- 南溟这一轮落地（**全部在前端**，没有改网关提示词与协议）：
  - **修掉一条真缺陷**：`directionTalkSettled` 的轮数兜底原来还要求「建议数 > 0」，于是「聊够了却一条可落地建议都没有」永远不成立——负责人实测 14 轮没有结果就是这条。现在兜底只看轮数（≥8），聊够就该收尾。
  - **新增收尾轮（报告轮）**：`App.tsx` 的 `runFinalTurn()`——聊够且已连接时由界面自动发起**一次**（`finalTurnRef`），文本是 `FINAL_TURN_INSTRUCTION`（借北辰的规格：最多 3 个大类 → 各列出专业类，每条一句「为什么」+ 一句「以后主要做什么工作」，另加两件两周内的小事）。这条指令**不进转写**（对话框里看不到）、**不进可引用证据**（否则模型会去引用一句系统指令，界面还会把它当学生原话展示）：直接调 `askAi` 而不走 `sendAi`，素材只取学生自己的原话（最近 12 条）。
  - **冻结时机**：`mergeSuggestions` 的第四参从「轮数」改成 `frozen: boolean`，由 App 用 `finalDone` 决定——收尾轮以 `false` 合并（否则它自己算出来的那套会被旧的冻结集合挡掉），落定后才 `setFinalDone(true)`，此后不再增减（北辰的「画像不再变」）。
  - **界面**：收口提示按「有没有可落地建议」分两种话术，没聊出时如实说原因（回「起航」定选科）；方向小结卡里每条专业类下面**直接显示收尾轮给的「为什么 + 以后主要做什么工作」**（不必再另开一轮问就业方向）。
- 验证：`npx tsc --noEmit -p apps/web/tsconfig.json` 0 错；全量 `npx vitest run` 42 个测试文件、521 项通过、0 失败（`test/direction-quota.test.ts` 改了收口语义与冻结参数；`test/talk-room.test.ts` 增到 17 项：收尾轮只发一次、素材只取学生原话、指令不进转写、冻结在收尾轮之后）。按负责人指示不做视觉校检。
- 没做（留给负责人定）：① 让模型自己判「素材够了没有」（北辰的【可点亮】标记）要在**网关提示词**里加评估指令并由前端识别标记，属网关那一侧；② AI 的「可选方向 ID」仍然来自依赖选科的候选目录，是否改成「发布包级、不依赖选科」见上一轮的分析。

## 2026-09-12 / cloud-session-ready：把本机前端指到云端中转并备好取码工具（供负责人做会话实测）

- 目的（负责人原文）：AI 聊天的动态码已改为 TOTP 并与云端对齐，看看能不能连接上云，要做一次会话实测。
- 实测到的现状（都是本机实测，命令与结果如下，不含任何密文）：
  - **云端是活的**：`GET /healthz` → `{"status":"ok","ai":true,"store":"redis"}`（0.75s）；`GET /readyz` → `{"public_data":true,"ai":true,"state_store":true,"upstream":"qianfan"}`。即云端跑的是**真千帆上游 + Redis 共享状态**。
  - **本地 API 跑的是假上游**：`http://127.0.0.1:8790/readyz` → `"upstream":"fake-local"`、`store":"memory"`。也就是说，直接把本机页面用默认配置打开，测到的是假模型。
  - **跨域允许本机**：对 `POST /v1/access/exchange` 发预检，`Access-Control-Allow-Origin` 分别为 `http://localhost:5173`、`http://127.0.0.1:5173`、`https://yusheng266186-beep.github.io` 时都被点名放行（不回通配符）；`Allow-Methods: GET, POST, DELETE, OPTIONS`、`Max-Age: 600`。
  - **端到端形状对得上**：从本机 origin 用**故意错误**的码打一次 → `401 {"error":{"code":"UNAUTHENTICATED","message":"dynamic code rejected"}}`，正是界面会映射成「动态码无效或已过期」的那条分支（正确码被消费过一次才返回 `TOTP_REPLAYED`）。
  - 动态码口径（读代码确认）：RFC 6238，Base32 密文 + SHA-1 + 30 秒 + 6 位；**服务端接受前后各一个窗口**（`matchingTotpCounter` 遍历 current-1/current/current+1），密文来自 `NANHANG_TOTP_SECRET`。
- 本轮做的三件事：
  1. `apps/web/.env.local`（**已加进 .gitignore**，不进仓库、不进索引与分发包）：`VITE_NANHANG_API_BASE=https://1459223409-lexj8si8uo.ap-chengdu.tencentscf.com`，把本机 dev server 的 AI 中转指到云端。改后实测 dev server 解析出的基址已是云端地址（Vite 会在 env 变化后自动重启）。**删掉这个文件即回到本地 API**；同一工作区的其他人若也想用本地假上游，注意这条已被改。
  2. 新增 `scripts/totp_code.mjs`：按同一套参数打印当前 6 位码（`NANHANG_TOTP_SECRET=... node nanhang-app/scripts/totp_code.mjs`，加 `--watch` 每 30 秒自动刷新，并提示本窗口还剩几秒）。密文只从环境变量读，脚本内不含任何密钥。
  3. 新增 `apps/api/test/totp-code.test.ts` 5 项：用同一份测试密文逐窗口比对**脚本与服务端的算法完全一致**、窗口容差（前后各一个有效、相隔两个无效）、非法输入一律不猜（非六位/非数字/密文非法或缺失）、剩余秒数提示。
- 验证：`npm --workspace @nanhang/web run typecheck` 0 错；全量 `npx vitest run` 42 个测试文件、519 项通过、0 失败。按负责人指示不做视觉校检。
- 给负责人做实测的步骤：① 用 `scripts/totp_code.mjs` 取当前码（或手机上的验证器）；② 本机打开 `http://localhost:5173` → 谈心 → 输入动态码 → 连接；③ 聊几轮后按新的收口规则会自动弹方向小结卡。
- 边界：本轮只做「连通性核实 + 取码工具 + 指向云端」，**没有**替负责人跑真实会话（那会消费云端额度与一次性码）；也没有改任何密文或服务端配置。

## 2026-09-12 / settings-switches：设置卡增加「思考低语」与「界面动效」两个开关，并加只读状态一览

- 目的（负责人原文）：设置增加低语选项，像北辰一样增加信息和功能开关进去。
- 先看北辰那一项到底是什么（固定提交 `f02c70b5` 的 `index.html`）：它的设置面板是「一行一个开关或读数」的排法（`.stat-row` + `.t-lb`），「思考低语」是一对开/关按钮，**开 = 等待时把模型真实 reasoning 的尾部淡入**（600ms 一换，自述「仅显示，不保存、不上传」），关 = 只显示阶段进度；偏好存 localStorage。
- **南溟的取舍（需要负责人知道）**：思考内容属于草稿、不过安全扫描，本项目当初刻意没有搬这一项（见 `AI_QIANFAN_SETUP.md`「没有搬的，以及原因」：万一模型在思考里写「可以考虑冲一冲」，那句话就到了学生眼前）。所以这里的「思考低语」做成了**南溟自己的阶段提示**——等回答时在打字指示器下面淡入一行「溟在读你刚写的那句／它在把你的话和已有的方向对一遍」，每 2.4 秒换一句；卡片上如实写明「不是模型的内部思考」。真要显示模型思考，需要网关那一侧开口子并纳入安全扫描，属另一个决定，本轮没有擅自越过。
- 实现：
  - `chapters/settings.tsx`：新增「等待与动效」面板（思考低语、界面动效两个开/关，用与北辰同款的「开 / 关」两枚 chip，`aria-pressed` 表状态，另给读屏补一句隐藏说明）与「现在的样子」只读一览（定位路线 / 发布数据版本 / 谈心连接与档位 / 两个开关的当前值）。分组排法借北辰 `.stat-row`，新样式 `.set-rows` / `.set-row` 收在 `style.css`。
  - `App.tsx`：两个开关的状态（默认**低语开、动效跟随系统**）；动效开关落到 `html[data-motion="off"]`，样式表里与系统 `prefers-reduced-motion` 共用同一套「一律压成瞬时」的选择器；`renderSettings` 多接 `route` / `releaseId` / 两个开关。
  - `chapters/talk.tsx`：`whisperOn` 打开且确实在等回答时，打字指示器下面淡入一行低语（只动 opacity），停下即收起。
  - 两个开关都**不写盘**（刷新回默认），卡片里也这么写明——与项目「探索内容只留内存、只有主动下载才写设备」的口径保持一致。
- 验证：`npm --workspace @nanhang/web run typecheck` 0 错；全量 `npx vitest run` 41 个测试文件、514 项通过、0 失败（`test/settings.test.ts` 由 4 项增到 7 项：两个开关接到真实状态且低语写明不是模型思考、只读一览取自真实状态且不含按钮、低语只在开着且等待时出现）。顺手修了 `test/page-motion.test.ts` 的切片方式（改成切到「下一个区块横幅」，不再依赖后续插入位置——本轮新增样式块时它先误伤了一次）。按负责人指示不做视觉校检。

## 2026-09-12 / topbar-and-choices：删掉顶栏上下文按钮；备选按钮改成两列网格（借北辰 .choices）

- 目的（负责人原文）：把顶上「四川 · 尚未选科」这个按钮删掉——它和「定位」重复、没有实际用处；AI 聊天里的备选按钮做成北辰那种规整排列，不要一行两个、一行一个地参差。
- 顶栏：删掉 `App.tsx` 里的 `.ctx-btn`（它显示 `四川 · 科类 · 年份` 并跳到「定位」）。读数并没有丢——「定位」页顶部本来就有，航程条上的「定位」也还在。`.ctx-btn` 的样式**刻意留在 `style.css`**：另一条线的窄屏守卫（`test/topbar-narrow.test.ts`）仍在断言它，删样式会误伤；只是不再有标记用它。
- 备选按钮：`.qopts` 从 `display:flex;flex-wrap:wrap` 改成 `display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px`，`.qopt` 文字改居中、加 `min-width:0`；窄屏（≤640px）退回一列。这正是北辰的做法（其 `index.html` 第 262 行 `.choices{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}`，按钮文字居中），一行两个、每格等宽，选项长短不一也照样对齐。谈心页的开场起点（引航的四个现成答案）与 AI 后续给的选项共用这套排法。
- 验证：`npm --workspace @nanhang/web run typecheck` 0 错；全量 `npx vitest run` 41 个测试文件、509 项通过、0 失败（`test/settings.test.ts` 新增 1 项：顶栏不再有 `.ctx-btn` 而样式仍在；`test/talk-room.test.ts` 新增 1 项：`.qopts` 是两列网格、文字居中、窄屏一列、且不再出现 `flex` 换行写法）。
- 附：负责人要求「看看卡片长什么样」，本轮用**真实标记 + 真实样式表**在浏览器里渲染了一张示例卡（数据是示例：工学 ‹计算机类 / 电子信息类 / 机械类›、理学 ‹数学类 / 物理学类›，卡片结构、文案、按钮与线上完全同源），只存在于浏览器 DOM 里，刷新（或热重载）即消失，仓库里没有任何预览文件。第一轮抓图连续报 `capture failed for guest`，重试后在移动端视角（390×844，卡片呈底部升起的 sheet）截到了图并交给负责人看过；截图按负责人「视觉由本人验收」的要求不入库——它是示例数据的预览，不是线上状态。

## 2026-09-12 / talk-quota：聊到量就收口（借北辰），收口后仍可聊但方向不再变

- 目的（负责人原文）：聊到一定轮数之后，比如获取了三到两个大类专业和 5 至 6 个小类专业，这轮对话就应该停止，像北辰一样弹出一个卡片；但学生想继续聊可以，只是不再新增专业，然后就可以进入下一步。参考 github 上北辰那个库的聊天与生成星图部分，把思路借鉴过来。
- 先在北辰那边读到的做法（`github.com/yusheng266186-beep/beichen`，固定提交 `f02c70b5`，前端单文件 `index.html`）：
  - 「夜航：第 5 轮起每轮评估画像成熟度；评估通过出现「点亮星图」入口，满 15 轮仍未点亮则固定给出」「领航满十轮自动点亮」——**按轮数到量即停，两种聊法阈值不同**（`OPEN_REPORT_MIN_TURNS = 5`、`turnCount >= 10`、`guidedAutoReportDue()`）；
  - 星图生成后**仍可继续聊**，星图本身不再变（`reportDone` 之后入口常驻、可随时回看；弹窗里写明「之后仍可继续聊」）；
  - 就绪后顶栏弹出「星图报告」按钮，报告是弹窗卡片，分几段（文理方位与星值 / 星卡 / 3+1+2 组合 / 写给你的一段话）。
- 南溟这一轮的落地（把「轮数」换成「方向覆盖」这个更贴产品的量，轮数留作兜底）：
  - 新增 `apps/web/src/direction-quota.ts`（纯函数）：`DIRECTION_QUOTA`（小类上限 6、大类上限 3；收口线 5 小类 + 2 大类；轮数兜底 8）；`directionTalkSettled()` 判断是否聊够；`trimSuggestions()` 裁到上限；`mergeSuggestions()` 合并——**已收口就整体冻结（连顺序都不动）**，没收口才并入并裁剪。
  - `App.tsx`：AI 每轮的建议合并改走 `mergeSuggestions(current.suggestions, merged.suggestions, groups, studentTurns)`，于是「收口后继续聊可以、但专业类不再新增」落在**数据层**，不是只靠界面提示。
  - `talk.tsx`：收口时在对话里补一句「方向已经收齐了——跨了 N 个大类、M 个专业类。想接着聊随时可以，只是不再往上加新的专业类了」；输入框**不禁用**，只把提示语换成「还想补充就接着说——方向已经收齐，不再新增专业类」；方向小结卡的自动弹出时机从「刚拿到第一条建议」改成「收口」（与北辰「到量才点亮」一致）。
- 边界：没有改 AI 网关的提示词与协议。北辰是在提示词里下发「评估画像成熟度」的指令让模型判；南溟先用前端可判定的方向覆盖做收口。若要把节奏也交给模型（让它自己说「聊得差不多了」），那是在提示词里加一条评估指令，属网关那一侧的工作，另立一轮再做。
- 验证：我改的文件 typecheck 0 错；全量 41 个测试文件、505 项中 **504 项通过、1 项失败**——失败项是另一条线在建的 `apps/web/test/route-labels.test.ts`（`buildRoutePoster` 的 `groups` 字段还没跟上，反复重跑仍失败），与本轮无关，未改动对方文件。本轮新增 `apps/web/test/direction-quota.test.ts` 9 项（真行为测试：覆盖判定、轮数兜底、上限裁剪、收口冻结），`apps/web/test/talk-room.test.ts` 由 13 项增到 15 项。按负责人指示不做视觉校检。

## 2026-09-12 / talk-opening：两个模式的开场第一句都改成问题；引航一进来就摆出可点答案

- 目的（负责人原文）：如果选引航，第一句就应该直接给出选项让学生选；泛舟才是学生自主开场。两个模式的第一句都应该是一个问题，让学生能直接回答，否则学生不知道该怎么聊起来。
- 实现（`chapters/talk.tsx`）：
  - 开场气泡从「模式说明」改成**一个问句**：`OPENING_QUESTION = QUESTIONS[0].text`，取自 `@nanhang/exploration` 内容规格里的第一条问题（「最近一次你自愿多花时间完成的任务是什么？具体做了什么？」）——不另造问法。原来引航写的是「我们一句一句来…」、泛舟写的是「泛舟开始…」，都只说明模式、不构成问题。
  - 模式差异现在只体现在气泡里那行小字提示（`OPENING_HINT[ai.mode]`）：引航说「每一步我都会摆几个现成的答案」，泛舟说「不设路线，用你自己的话答」。
  - 引航在问题下面直接摆四个可点答案（`OPENING_STARTERS`），用的是既有但一直没接上的 `AnswerStarters`（「回答起点」）组件；点一下就以学生自己的名义发出去（`sendAi(text)`），与引航后续由 AI 给出的选项是同一套交互。没连上或正在等回复时按钮不可点（点了也发不出去）。
  - 泛舟不给现成答案，只留问题，让学生用自己的话说。
  - 起点只在「还没有任何往来」时出现（`ai.history.length === 0`），一聊起来就撤掉，不占地方、也不与 AI 自己的选项打架。
- 边界：回答起点是措辞帮助，不点就什么也不算（沿用既有约定）；问题文本取自内容规格、不是本轮新写；未改 AI 网关的提示词或协议。
- 验证：`npm --workspace @nanhang/web run typecheck` 0 错；全量 `npx vitest run` 40 个测试文件、494 项通过、0 失败（`apps/web/test/talk-room.test.ts` 由 10 项增到 13 项：两个模式第一句都是问题且取自规格、引航摆出可点答案且未连接时不可点、泛舟不给现成答案）。按负责人指示不做视觉校检。

## 2026-09-12 / talk-summary：聊完才给「去方向」；聊完弹出方向小结卡；修掉聊天区下方留白

- 目的（负责人原文）：连接云端 AI 聊完天之后才给出「去方向 · 选专业」这个按钮（之前灰着点了没反应）；聊完之后也像登船卡片一样弹一张卡，让学生大致清楚自己感兴趣的大类/小类专业，并说说这些专业未来的就业方向，交给 AI 去筛选和处理；聊天输入框要贴到最下面，别停在中间，否则下面留一圈白。
- 先修留白的根因（上一轮遗留的真 bug）：上一轮加的聊天区样式块被插在文件里**原有** `.chat-scroll{max-height:min(48vh,440px)}` 之前，同优先级下后者胜出——消息区没撑开，卡片固定高度的剩余空间落在输入栏下方，输入栏就停在中间、下面一圈白。改法：这几条规则一律带 `#page-talk` 作用域，与源码顺序无关（守卫里把这条原因写进注释钉住）。
- 按钮门禁：`.talk-meta` 改为仅在 `ai.suggestions.length > 0` 时渲染——AI 还没给出建议时，去「方向」也看不到 AI 那条线，按钮出现等于没反应；同时删掉旧的 `disabled={!hasChatted}` 写法（正是「点了没反应」的来源）。
- 聊完之后的方向小结卡（复用登船卡片的浮层与 `useScrollLock`）：AI 第一次给出建议时自动弹一次（`summarySeen` 只弹一次，关掉后不再打扰），内容是按大类分组的专业类清单——全部来自 AI 从学生原话里挑出的建议，并写明「它只做整理与筛选，不替你决定」。卡片两个出口：`去方向 · 选专业`、`让溟讲讲就业方向`。**就业方向不在卡片里编造**：点它把一句提问发进对话，答案由 AI 在对话里现场给出——既满足负责人「让 AI 去筛选和处理」的要求，也守住项目「不编造事实」的底线。
- 验证：`npm --workspace @nanhang/web run typecheck` 0 错；全量 `npx vitest run` 40 个测试文件、491 项通过、0 失败（`apps/web/test/talk-room.test.ts` 由 5 项增到 10 项：作用域与留白三件套、容器放宽但气泡限宽、按钮门禁、只弹一次且可手动再看、按大类列出并带原话、就业入口与「不许写死清单」、锁滚动）。按负责人指示不做视觉校检。
- 说明：`hasChatted` 仍是 `TalkProps` 的字段（App 照旧传入），本轮起谈心页不再使用；未从接口删除，避免在别的线正在改 App 时增加无谓改动。

## 2026-09-12 / page-motion：谈心 / 方向 / 分数轴 / 航线图 的动画适配

- 目的（负责人原文）：做完之后对谈心、方向、分数轴和航线图做动画上的适配和优化，要丝滑高级。
- 做法：**只加样式**——`style.css` 新增一块「谈心 / 方向 / 分数轴 / 航线图：动画适配」，四个页面的标记与文案一处未动。这四页里三页正被别的线改（航线图的图内 SVG 甚至正在重画），样式表是唯一不会互相覆盖的落点。
- 编排：每页 `>*` 统一 `arrive` 并按 `:nth-child` 依次延迟（.05–.15s）；页内的块再各自错峰——对话房间的三段（头 / 消息 / 底栏）、方向的两块选择区、分数轴的英雄区与批次链条、航线图的外壳与结果区。
- 「数据在原地长出来」：分数轴的金带与进度**横向展开**（`band-open`，只缩放自身，位置仍来自内联 `left`/`width`）、端头刻度随后报到、大数字落定（`num-in`）、候选卡与结果卡逐张落位；方向页的 chip 与胶囊逐条出现；航线图的保底线与结果卡逐行落位。
- 「可点即反馈」：谈心的输入框聚焦给铜色描边与柔光（与起航、定位同一套）、连上 AI 时状态徽章弹一下（`seal-pop`）、可点答案逐条落位。
- 刻意不碰的三处（守卫里钉住）：`.stick` 靠 `translateX(-50%)` / `-100%` 做端点对齐，只淡入、不位移；`.seal`（航线图印章）与 `.head-rose`（罗盘）自带旋转动画，不覆盖它们的 `animation`；航线图图内的 `rt-*` 动效（`rt-row-in`、`rt-bob`）归正在重画那块的那条线，本轮不在同一份样式里重复定义。
- 验证：`npm --workspace @nanhang/web run typecheck` 0 错；全量 `npx vitest run` 39 个测试文件、481 项通过、0 失败（新增 `apps/web/test/page-motion.test.ts` 7 项：四页各自的编排要点、端点刻度只淡入、印章与罗盘的旋转不被覆盖、新规则必须全部带页面作用域）。按负责人指示不做视觉校检。
- 并发说明：写样式期间另一条线正在重写 `style.css` 的航线图部分（文件在几分钟内先缩小再放大），本块用唯一锚点整段插入，插入后核对过花括号配平与关键选择器，未覆盖对方内容。

## 2026-09-12 / talk-room：进对话后去掉聊法切换，聊天区放大到接近整屏

- 目的（负责人原文）：谈心这里选择聊法之后进入聊天界面，就不要再去给他按钮让他选择引航还是泛舟了；把聊天框拉大，不要只显示一句话，这里显得有点拥挤，尽量占满屏幕。
- 实现：
  - `chapters/talk.tsx`：删掉对话底栏那一行「聊法」切换（`.dock-ctrl`、`.dc-k` 与两枚 chips）。聊法仍然只在进对话之前那张选择卡里选一次，`withMode` 也仍然只在那里用；当前思考档位仍显示在对话头部（`.ch-tier`），学生知道自己这句话是按哪一档答的。
  - `style.css`：会话卡片改成 flex 列——头部与输入栏固定、消息区 `flex:1` 撑满，高度跟着视口算 `clamp(420px,calc(100dvh - 300px),820px)`；手机 ≤640px 用 `clamp(360px,calc(100dvh - 200px),760px)`。容器放宽到 `min(1024px,100%)` 占满屏幕，但气泡仍限宽 `min(82%,560px)`——**放大的是房间，不是每一行**。原来的消息区上限是 `min(48vh,440px)`，视口一矮就只容得下一两句话。
  - 顺手删掉随标记一起失效的 `.dock-ctrl` / `.dc-k` 两条样式（全仓已无引用），在原地留一行说明。
- 验证：`npm --workspace @nanhang/web run typecheck` 0 错；全量 `npx vitest run` 38 个测试文件、472 项通过、0 失败（新增 `apps/web/test/talk-room.test.ts` 5 项：对话里没有聊法按钮而入口卡仍在、档位状态仍留在头部、高度与 flex 骨架、容器放宽但气泡限宽、手机档位）。按负责人指示不做视觉校检。
- 并发与归属：`chapters/talk.tsx` 原登记在线二名下（它 19:11 改过这一页）；本轮按负责人指派只动底栏那一行，写前已重读，未触碰它的大类分组建议卡与页面其余部分。

## 2026-09-12 / locate-two-routes：定位拆成两条并行路；浮层锁住整页滚动

- 目的（负责人原文）：启航页「开始起航」弹出的卡片应该把整个页面固定住（现在还能上下滑动，有点奇怪）；卡片里点哪条就做两条路线——定位做成两个页面，一个只给荣县一中学生，一个给手填五次考试的学生，定位里不要再掺杂手填五次考试；选完就跳到对应页面；两条路最后同时进入谈心。
- 实现：
  - **锁滚动**：新增 `apps/web/src/scroll-lock.ts`（`useScrollLock`：挂载时把 `html` 与 `body` 的 overflow 存下来改成 `hidden`，卸载时按原值还原），登船卡片（`sail.tsx` 的 `boardOpen`）与设置卡片（`App.tsx` 的 `settingsOpen`）都挂上。用 JS 而不是 CSS `:has()`——`:has()` 在老浏览器会静默失效，这里要的是「一定锁住」。
  - **两条路**：`chapters/shared.ts` 新增 `export type LocateRoute = "manual" | "school"`。它是同一章下的两个页面变体，不新增章节——航程条仍是六站，「定位」这一站进去看到哪一页由路线决定。
  - `App.tsx`：新增 `route` 状态（默认 `manual`，即通用模式）与 `chooseRoute(next) => { setRoute(next); goTo("locate"); }`，并把 `route`/`chooseRoute` 交给 sail 与 locate；门禁仍走 `goTo`（没完成上一步时只提示、不跳页）。
  - `sail.tsx`：登船卡片两条入口改为 `chooseRoute("manual" | "school")`（不再各自 `setPage("locate")`）；`picked` 标记改按当前路线标（原先看的是「有没有选科 / 有没有接入」，与学生实际选的那条路并不一致）。
  - `locate.tsx`：`schoolLocked` 加上路线条件（`route === "school" && …`）；接入卡只在走学校路时出现；学生端考试面板只在「手填路」或「学校路已接入（显示只读的学校行）」时出现。于是两条路互不掺杂：手填路上看不到任何学校入口，学校路上也看不到可编辑的手填行。接入卡里那句「不接入也完全可以：直接在下面手填考试即可」在拆分后不再成立，改为指向第一条路。
  - 两条路都通向谈心：定位页收尾仍是「去谈心」，门禁里定位仍是一段、谈心紧随其后（两条路共用同一段）。
- 验证：`npm --workspace @nanhang/web run typecheck` 0 错；全量 `npx vitest run` 37 个测试文件、466 项通过、0 失败（新增 `apps/web/test/route-split.test.ts` 6 项：路线类型唯一来源、选路跳转与已选标记、两个页面互不掺杂、学校数据仅在学校路成立、两条路都通向谈心、锁滚动钩子挂在两处浮层上）。按负责人指示不做视觉校检。
- 未做：页面上没有「换一条路」的切换控件——目前只能回「起航」→「开始起航」重选（负责人只要求「选择之后就跳转到对应的页面」）。若要在页内切换，另开一轮加。

## 2026-09-12 / locate-compact：定位页卡片留白收紧（点名「荣县一中接入」与「探索区间」）

- 目的（负责人原文）：定位页里有些卡片间隙偏大，调紧凑一些，特别是「探索区间」和「荣县一中的同学」这两张。
- 做法（只动 `style.css`，**没有改 `locate.tsx`**）：
  - 整页面板先收一档：`.panel` 内边距 26→22（窄屏 ≤640px 再收到 20px 18px）、`h3` 与副述之间各收 2–4px（`h3` margin-bottom 4→2、`.psub` 18→14）。
  - 两张被点名的卡再收一档：内边距 20/22、`.psub` 10、`.field` 归零、`.flab` 12→8、`.vlist` 与 `.vpill` 收一档、`.fhint` 与空态 `muted-note` 各收 2–3px。
  - 这两张卡靠 `:has()` 按内容认出来：识别卡有全页唯一的文本框（`input[type="text"]`），区间卡有「网格里的数字框」（`input[type="number"]` 且外层是 `.grid-2 label.field`；考试行的数字框在 `.exam-row` 里，不会误伤）。认不出的浏览器（不支持 `:has()`）只是保持原样，不会坏版；守卫测试另有一条断言：这些规则只出现留白属性，不出现 display/grid-template/position/width/height。
  - 卡内几处间距是 JSX 的行内 style（`.grid-2` 的 marginTop/gap、`.hero-act`、`.vlist`、两条提示），样式表要盖住行内值只能用 `!important`——本轮只在这里用，且每一处都限定在这两张卡的 `:has()` 选择器内（守卫里钉住）。
- 为什么不用加类名的办法：当时另一条线正在同一个文件里改这张卡的文案（「6 位验证码」→「6 位查询码」等），按分工契约不与其并发写同一文件，改用纯 CSS 的按内容识别。
- 验证：`npx vitest run` 36 个测试文件、458 项通过、0 失败（`apps/web/test/locate-motion.test.ts` 由 10 项增到 14 项：整页与窄屏各收一档、两张卡按内容唯一识别且不给 JSX 加类名、`!important` 只出现在 `:has()` 规则里、`:has()` 规则只改留白不改布局）。按负责人指示不做视觉校检。
- 未做：其余卡片只有「整页那一档」的收紧（不额外收）；若负责人觉得还不够，再按同样办法逐张处理。

## 2026-09-12 / locate-gauge-squeeze：定位页读数区被挤成半栏导致的断行

- 现象（负责人截图指出）：`.gauge-top` 两处读数（高考目标分 · 裸分 / 全省位次 · 参考年）在窄屏被 `space-between` 挤成半栏，标签在字中间断行，大号破折号与「分」也分了家。
- 修法（只动 `style.css`；`chapters/locate.tsx` 本轮仍未改动）：
  - 标签与数字自己不再拆行：`.gauge .eyebrow{white-space:nowrap}`、`.gauge .bignum{white-space:nowrap}`，并让 eyebrow 的短横线 `flex-shrink:0`（原先被挤时会先收缩掉）。
  - ≤560px 时两处读数上下各占一行（`.gauge-top{flex-direction:column;gap:16px}`）。右块的对齐写在 JSX 的行内 `style` 上，行内样式压不过继承值、却会被子元素的显式声明盖掉，所以用 `.gauge-top>div>*{text-align:left}` 把它收回左对齐——不改 JSX。
  - 断点取 560px 的依据：两处读数并排约需 390px 内宽（标签约 170px、位次数字约 200px），可用内宽 ≈ 视口宽 − 140px（外层与面板内边距），视口低于约 530px 即开始挤压。
- 验证：`npx vitest run` 36 个测试文件、454 项通过、0 失败（`apps/web/test/locate-motion.test.ts` 由 8 项增到 10 项，新增两条：不拆行与短横线不收缩、窄屏上下各占一行且右块收回左对齐）。按负责人指示不做视觉校检。
- 并发说明：本轮 typecheck 报的两个错都在别的线在建的文件上——`apps/api/src/school-access.ts(15,37)` 与 `apps/web/test/class4-codes.test.ts(3,33)`（都是带 `.ts` 后缀的 import），与本轮改动无关；首跑那 1 项测试失败同样是并发中间态，复跑全绿。

## 2026-09-12 / locate-motion：定位页的编排与微交互（只动样式，不动内容与结构）

- 目的（负责人原文）：定位页也按前面的要求重新设计，包含样式和动画，**不做内容的变动和结构的改变**。
- 做法：这一轮**完全没有改 `chapters/locate.tsx`**，全部落在 `style.css` 的一个新块「定位页：编排与微交互」里，用 `#page-locate` 作用域；页面标记、文案、元素顺序一处未动（守卫测试里有一条断言专门钉这一点：定位页源码里不得出现本次新增的动效类名）。
- 编排（自上而下逐块落位）：`#page-locate>*` 统一 `arrive`，按 `:nth-child` 依次延迟 .05–.3s；头像的 eyebrow 横线自己画出来（`rule-in`，`scaleX` 从左到右）。
- 数字与图形「在原地长出来」，不搬动布局：
  - 分数条：位次标记自上落下（`band-drop`，`scaleY` 从 0）、三条刻度依次报到（`tick-in`）。
  - 读数：两枚大数字落定（`num-in`），四格统计只淡入（`fade`）——统计格在 1px 缝隙的网格里、网格会裁切，位移会露馅；格子里的数值单独弹一下。
  - 结论卡：六枚胶囊逐条报到，最后那排刻度值再补一拍。
  - 成绩曲线与航迹：柱子从底部长出来（`bar-grow`，`scaleY` 从 .02），内联的 `height`（数据本身）一律不覆盖；航迹的刻度与虚线先淡入、柱子后长出。
- 微交互：考试行逐行落位，正在填的那一行整行提亮并长出一条铜色竖线（`:focus-within`）；输入框聚焦给铜色描边与柔光，**已填的格子描边转铜**（`:not(:placeholder-shown)`），一眼看得出还差哪一格；表格行悬停给底色；胶囊悬停轻抬；按钮上的箭头朝「下一步」方向前进 3px。
- 两处刻意避开的坑（写进守卫断言）：`.bandtick` 靠 `translateX(-50%)` 居中，动画首尾必须显式保留这个位移，否则文字会偏半个字宽；`.stat` 网格裁切，故只淡入不位移。
- 减少动态效果：给全局的 `@media(prefers-reduced-motion:reduce)` 补了 `animation-delay:0s!important`——原先只把时长压成 .001ms，错峰的延迟还在，元素会在延迟里停在首帧（opacity:0）而不显示。
- 验证：`npm --workspace @nanhang/web run typecheck` 0 错；全量 `npx vitest run` 35 个测试文件、447 项通过、0 失败（新增 `apps/web/test/locate-motion.test.ts` 8 项，含「新规则必须全部挂在 `#page-locate` 下，不泄漏到别的章节」）。按负责人指示不做视觉校检。
- 一次并发说明：本轮第一次跑 typecheck 时失败在 `chapters/chart.tsx(136)`（`CHART.frame` 不存在）——那是另一条线正在加这个常量，属中间态；20 秒后复跑即通过，未改动对方文件。
- 并发与归属：`chapters/locate.tsx`（未改动）与 `style.css` 原登记在线一名下，本轮按负责人指派接手样式部分，写前已重读。

## 2026-09-12 / sail-pack：「先定下三件事」做成一件一件备齐

- 目的（负责人原文）：启航里「先定下三件事」这里也做优化和调整，把动画和整体的设计感做出来。
- 设计：三件事各自一枚编号印章（01 首选科目 / 02 再选科目 / 03 目标分）——没备好是空心，备好变铜色并弹一下；「再选科目」标题旁加一枚 `n/2` 计数胶囊，满 2 门转铜；底部那句摘要沿用原来的话术，但**每次变化都重新淡入**并 `aria-live` 读给读屏（状态只写一处、说两遍，不另造第二份说明）。
- 动效（只用 transform/opacity，复用既有的 `arrive` / `msgin` 关键帧）：
  - 三件事逐件入场（.5s，延迟 0 / .07 / .14 / .2s），与上面六张抽屉卡同一套节奏。
  - 选中 chip 的那一刻盖一枚向外扩散的铜色光环（`@keyframes seal-ring`，一次性 `forwards`，不常驻），chip 自身按下缩到 .96。
  - 印章点亮时弹一下（`seal-pop`，`--ease-spring`）；三件事备齐时「开始起航」弹一下（`arm`），作为「可以出发」的信号。
  - 目标分聚焦时铜色描边 + 4px 柔光。
- 交互诚实性：再选满 2 门后其余 chip 淡到 `opacity:.45`（悬停回 .75），但**仍然可点**——点了照旧给「再选科目正好 2 门，先取消一门再选。」，不假装禁用。这一条连同「不得出现 `disabled={additionalFull}`」写进了守卫断言。
- 验证：`npm --workspace @nanhang/web run typecheck` 0 错；全量 `npx vitest run` 34 个测试文件、439 项通过、0 失败（新增 `apps/web/test/sail-pack.test.ts` 6 项：编号与字段对应、状态来源、满员不禁用、光环是一次性的、逐件入场与备齐弹一下、摘要重新淡入且可说给读屏）。按负责人指示不做视觉校检。
- 并发与归属：`chapters/sail.tsx` 与 `style.css` 仍在负责人指派的线三名下，写前已重读；`style.css` 只新增「先定下三件事」一段与窄屏三行。

## 2026-09-12 / sail-deck-motion：抽屉卡补上展开动效，整摞错峰入场

- 目的（负责人原文）：堆叠的感觉有了，但不够精致，「我需要的是加上一些流畅的动画」。
- 改动（`chapters/sail.tsx` 一处结构 + `style.css` 的抽屉规则）：
  - **展开/收起不再瞬时**：正文容器从 `hidden` 改成常驻 DOM 的 grid 抽屉，靠 `grid-template-rows: 0fr → 1fr` 过渡（.45s，`--ease`）——高度跟着内容走，不写死任何像素；认不出 `fr` 插值的浏览器退化为瞬时展开，功能不受影响。
  - **正文再跟进一层**：`p` 自己带 `opacity 0→1`（.28s，延迟 .1s）与 `translateY(-6px)→0`（.45s），抽屉拉开的同时文字轻轻落位，比单纯撑高有层次。
  - **整摞错峰入场**：六张卡复用既有的 `arrive` 关键帧（只有 transform 与 opacity），延迟 0 / .05 / .10 / .15 / .20 / .25s 依次浮现。
  - **让位与压边走过渡**：`.stop+.stop` 的 `margin-top` 加 .45s 过渡，展开时下面几张顺势让开，而不是跳一下。
  - **箭头回弹与表头反馈**：展开箭头翻转改用 `--ease-spring`（.5s）并转成铜色；表头补 hover（白底）与按下（压深一档）反馈，标题颜色过渡。
  - **堆叠的厚度**：被压边的那张带一层向下的柔和投影，展开的那张换成更近的投影，读起来像从这摞里被抽出来。
  - 正文不再用 `hidden`：读屏不会因为视觉收起而丢掉这六段说明，这一点写进了守卫断言。
- 动效范围：只用 transform/opacity，外加 `grid-template-rows` 与 `margin-top` 两处小范围布局过渡；文件末尾既有的 `@media(prefers-reduced-motion:reduce)` 会把过渡与动画统一压成 .001ms，不需要另写覆盖（守卫断言钉住这条全局规则）。
- 验证：`npm --workspace @nanhang/web run typecheck` 0 错；全量 `npx vitest run` 32 个测试文件、428 项通过、0 失败（`apps/web/test/sail-deck.test.ts` 由 4 项增到 7 项，新增动效参数与 reduced-motion 的断言）。运行期证据（改动当时实测，非视觉验收）：展开过程中正文高度 80ms→23px、180ms→46px、300ms→51px、520ms→52px，正文透明度同步 0→0.75→0.98→1，确认是逐帧插值而非瞬间跳变。按负责人指示不做视觉校检。
- 未做：设 320px 下标题与压边的余量只做了静态推算（窄屏表头 12px 内边距、标题行高 20px、压边 12px，余量约 2px），未在浏览器复测——负责人已明确界面由本人验收。

## 2026-09-12 / sail-deck：六站航程改成抽屉式堆叠卡

- 目的（负责人原文）：首页「6 张航程」全部堆在那里显得冗杂，做成抽屉式的堆叠卡片——没点开时堆在一起，点开才展开，让它占的空间压缩。
- 实现（`chapters/sail.tsx` + `style.css`）：
  - 六张平铺卡（`.trio` 三列网格 + `.mini`，每张一整段说明）换成一副抽屉：收起时每站只露一行——章号 + 站名 + 这一站做什么（`h4` 单行、超长用省略号兜底），相邻两张用 `margin-top:-14px` 压边叠成一副；点开哪一站，哪一站展开说明并把后面那张推开（`.stop.open+.stop{margin-top:10px}`），展开中的那张 `z-index:2`，描边与阴影不被后一张切掉。
  - 展开/收起用 `aria-expanded` + 正文 `hidden` 报状态，整行是按钮（49px 高，在 44px 点击下限之上）；默认全部收起（`deckOpen` 初值 `null`），一次只开一张，再点收起。
  - 六站的整句说明一个字没删，仍在 DOM 里、展开即见；段首说明补了一句「六站收成一叠抽屉卡，点哪一站展开哪一站」，让第一次来的人知道可以点。
  - 旧规则一并清掉：`.trio` / `.mini` 的定义、窄屏专项块里的五条，以及 `.entry-grid,.trio,.dir-grid,.schools` 里对 `.trio` 的引用（全仓已无其它使用者）。
- 实测（浏览器量 DOM 盒，不做视觉验收）：1440px 收起 **243px**（六张各 51px、压边 14px），展开其中一张后 **315px**；390px 收起约 **246px**、无横向溢出、六条标题都没有被省略号截断、整行高 49px。改前同一页窄屏的记录是六张卡合计 **980px**（见 `apps/web/VISUAL_PROGRESS.md` 起航页紧凑化段），即收起态在窄屏省掉约四分之三、桌面（原为三列两行网格）省掉约四分之一。
- 验证：`npm --workspace @nanhang/web run typecheck` 0 错；全量 `npx vitest run` 31 个测试文件、419 项通过、0 失败（新增 `apps/web/test/sail-deck.test.ts` 4 项：六站说明未删、默认收起且状态可读、平铺卡片已移除、压边与推开与单行标题写在样式里）。
- 并发与归属：`chapters/sail.tsx` 与 `style.css` 原登记在线一名下。本轮按负责人指派接手，写前已重读，只动这两处（`style.css` 只替换六站卡规则与窄屏那五条）；若线一同时在改起航页间距或 `style.css`，以其最新内容为准重新合并。

## 2026-09-12 / parallel-lanes：三线并行的分工契约与越线自查工具

- 目的（负责人原文）：三个 AI 同时改前端，要「确保不要打架」。
- 现状核实（本轮开工时按 git 状态、提交与文件时间逐项核对）：三条线共用**同一个工作区**，没有各自的分支或 worktree。冲突不是合并冲突，而是**后写的人整文件覆盖前写的人**。当时同一文件已被两条线改过的实例就存在：`talk.tsx`（线二 19:11、线三 19:45）、`App.tsx`（线二 19:18、线一 19:30、线三 19:45）、`journey-model.ts` / `model.ts`（线一与线二都要动）。
- 新增 `docs/PARALLEL_FRONTEND.md`：三条线的独占文件表与最后触碰证据、共享文件表（`App.tsx`、`style.css`、`journey-model.ts`、`model.ts`、`talk.tsx`、`axis.tsx`、`VISUAL_PROGRESS.md`、本分工表、实施记录与进度主本）、五条硬规则（写前重读、不整仓 `add`、不提交不回滚别人的在建文件、文档同步串行、不切分支不重置）、追加式认领登记表，以及「新文件放哪里」的约定。
- 新增 `tools/check_frontend_lanes.py`：读 `git status --porcelain`，把脏文件分成「本线 / 共享 / 其它线 / 生成物 / 文档摘要块 / 工作区工具 / 未登记」；`--lane N` 时若暂存区里出现别的线的文件，以非零退出（那等于准备把别人的改动一起提交）。摘要块用 `git diff` 逐行识别，避免每次文档同步后十几个文档都被误报成越线。
- `AGENTS.md` 加两条：多 Agent 改前端前先读分工表并用该脚本自查；界面视觉由负责人自己验收，Agent 只做代码与逻辑层面的验证、不代做浏览器视觉校检（负责人 2026-09-12 指示）。
- 验证：`py -3.12 tools/check_frontend_lanes.py --lane 3` 在真实脏工作区上跑通（本线 3 个文件、共享 6 个，生成物与摘要块分别归类）；`py -3.12 tools/sync_project_docs.py --package` 与 `--check` 通过（frozen_copies_equal 11、errors 0）。
- 边界：它是**提示工具，不是强制钩子**（与文档规范里「当前未安装 Git 提交钩子」一致）；它只按登记表分类，无法证明内容没被覆盖——真正的防线仍是「写前重读」。三条线共用一个工作区这一点本轮没有改动；要彻底隔离需要各自 clone 或 worktree，属独立工程决定，未擅改。

## 2026-09-12 / settings-panel：设置卡片收拢「思考深度」与「清除本人数据」；顶栏两枚按钮换分工

- 目的（负责人原文）：把右上角「溟」做成整页的设置按钮，点开一张卡片式设置页；谈心页的「思考深度」、航线图页的「清除本人数据」都搬进去；原先点「溟」弹出的《逍遥游》彩蛋挪到左边的图标与文字上，点它弹同一个彩蛋。
- 实现：
  - 新增 `apps/web/src/chapters/settings.tsx`：卡片式设置（复用登船卡片的 `.board-backdrop` / `.board-card`，Esc、点背景、关闭按钮三种退出方式），两块内容——思考深度（三档卡，各标一次回答的预估等待时间）与本人数据（清除本次探索，写明清除范围与「已下载到设备上的文件不归这里管」）。
  - `App.tsx`：顶栏右上「溟」`aria-label` 改「设置」、点击打开设置卡片；左上品牌标记 `aria-label` 改「南溟 · 逍遥游」、点击弹出同一个彩蛋；新增 `settingsOpen` 状态与 `renderSettings` 挂载；`ctx` 不再向航线图传 `clear`。（原先「回到起航」的主页入口由航程条的「01 起航」承担。）
  - `talk.tsx`：删掉聊法面板里的「思考深度」整块与对话底栏的「深度」快捷 chips（同一件事原先有两处入口），保留对话头部「深度 深（默认）· 约 20–40 秒」的当前档位显示，聊法面板留一句指向「溟 → 设置」；不再 import `withTier`。
  - `chart.tsx`：本人数据面板移走「清除本次探索」按钮，保留「下载本人 JSON」，并补一句指路；`ChartProps` 去掉 `clear`。
  - 新增 `apps/web/test/settings.test.ts` 3 项守卫：入口分工（左品牌 = 彩蛋、右「溟」= 设置）、思考深度只在设置里可改而谈心页只显示当前档、清除按钮不再出现在航线图（下载仍在）。
- 任务状态：未变（TASK-01—TASK-14 与四个门禁同前）。这是界面归属调整，不涉及数据、判定规则与冻结合同。
- 验证：`npm --workspace @nanhang/web run typecheck` 0 错；全量 `npx vitest run` 29 个测试文件、411 项通过、0 失败（新增 3 项即本文件）。功能自测（改动当时、负责人下达「不做视觉校检」之前）用浏览器控制台做过 DOM 断言：入口标签、卡片内容与三档状态、档位切换、Esc 关闭、彩蛋弹出与关闭、清除后的状态，均与预期一致；按负责人 2026-09-12 指示，本轮不做视觉验收，界面观感由负责人自己验收。
- 未做：设置卡片里没有放「连接状态 / 访问码」等其它项（负责人只点了这两项）；卡片在 390px 的实际观感未经负责人验收。
- 后续（同日 20:01，另一条线的提交 6e3ec33）：负责人指示把航线图底部整块「本人数据」面板下线，该提交删掉面板与「打印 / 另存为 PDF」，同时把线三当时在建的 `chapters/chart.tsx`（航线图标签修复）、`style.css`（六站抽屉卡样式）、`test/settings.test.ts` 与文档条目一并扫进了同一个提交。因此本条目上文「保留『下载本人 JSON』」一句已不成立——以 `chart.tsx` 导出区注释、`test/settings.test.ts` 的现行为准（该测试也已被同一条线改成「面板整块下线」的断言）。提交本身完整可构建、全量测试通过；抽屉卡的页面标记 `chapters/sail.tsx` 当时尚未提交，故该提交里的 `.deck/.stop` 规则一度是没有标记的样式。
- 并发与归属：本轮改了共享文件 `App.tsx` 与 `talk.tsx`（线二刚在 `0e28a80` 改过谈心页）。写前已重读当前内容，只动顶栏两枚按钮、设置挂载与思考深度两处；若线二同时在改 talk.tsx，以其最新内容为准重新合并。三线分工、共享文件与认领登记见[前端三线并行](PARALLEL_FRONTEND.md)。

## 2026-09-12 / chart-labels：航线图右侧标签被画布裁掉、航线小结横穿中间那条线

- 目的：航线图 SVG 有两处几何问题，都不报错但看得见——导出 PNG 用的是同一块画布，导出同样带着这两处。
- 实测（在浏览器里量 DOM 盒，不是看截图）：`viewBox` 宽 1000，右侧三行关系标签原从 x=898 起左对齐，最长的「历史位置较有余量 1820」在渲染宽 1158px 的画布上溢出 39px、次长的溢出 8px——计数升到四位数时数字被裁在画布外；三条航线小结原写在 y=148/165/182，正落在中间那条线（y=158，波形带 149–165）内，实测「我的自主选择 · 493 条」与中间线的包围盒相交。
- 改动（只动 `chapters/chart.tsx` 的 SVG 段，新增四个排版常量并写明约束）：
  - 右端留出标签栏：线画到 x=812 停，标签右对齐到 x=992 向左生长，计数涨到五位数也不会溢出（余量 30 单位）。
  - 航线小结移进两条线之间的空档（y=186 起，行距 17），不再与中间线相交。
  - 图内浅色文字改用墨色 `#2c444c`：关系标签原用线色，其中 brass `#a97b34` 在浅底上 3.29:1、safe `#7d9a86` 只有 2.64:1，13px 文字达不到 4.5:1；「区间 · X 分」原色 `#6d7f83`（3.67:1）与空态文字同色，一并改墨色。线本身仍按关系着色，颜色与关系的对应由图下方 `.route-legend` 承担。
- 复测（同一浏览器、同一状态，改动前后各量一次）：溢出 2 处 → 0 处；文字与航线包围盒相交 1 处 → 0 处；三条线右端 1023px → 940px，标签右缘统一在 1149px（画布 1158px）。
- 遗留（跨线，未改）：`--safe`（#7d9a86）在浅底上 2.64:1，低于非文本元素 3:1 的下限；它同时是 `.rl.safe .swatch` 的颜色，属 `style.css` 的令牌（线一的范围）。本轮只改了 SVG 内的文字颜色，没有动这条令牌，已登记在[前端三线并行](PARALLEL_FRONTEND.md)第二节，等线一裁决。
- 验证：`npx vitest run` 29 个测试文件、411 项通过、0 失败。航线图几何是渲染期属性，本次未新增静态断言；上面的实测数字即为证据，回归守卫若要机械化建议放进浏览器审计（TASK-09 的做法）。

## 2026-09-12 / axis-range-ownership：分数轴自己拥有区间；顺带查出区间宽度与口径的两条实测结论

- 目的（负责人指出）：分数轴页一边能改区间上下限、一边写着「去「定位」生成区间」，自相矛盾；并要求顺带检查定位生成的区间是否合理、分数轴算法有没有问题。
- 改动（只动文案与手动路径，换算规则不动）：`axis.tsx` 里所有对着已有区间的学生说「去生成」的地方改掉——hero 说明改成「区间来自「定位」页的考试数据，也可以直接在这一页改上下限」；底部按钮随状态改文案（有区间 →「去「定位」看区间怎么来的」，没有 →「去「定位」按考试数据生成」）；没有区间且有高考目标分时新增「用目标分 ±10 生成区间」（与定位页同一条规则）；手动填写不再用 750/0 补另一端（那会平白造出 0–750 的巨区间），改为另一端先等于当前值，basis 写明「手动填写的探索区间（不来自考试数据）」。没有区间时结果区的空态也改掉（原来不管有没有区间都写「先在「定位」生成探索区间」）；新增 1 项守卫断言。
- 复核（换一名 4 班学生，11 次考试）：浏览器实测区间 **361–395**，与手算的五场综合等价分（389 / 361 / 379 / 388 / 395）逐项一致——这名学生五场都在 0.72–0.79 倍线之间，区间只有 34 分宽，和上一名（一场考砸 → 132 分宽）形成对照；分数轴页显示「区间来自「定位」页的考试数据，也可以直接在这一页改上下限」、按钮为「去「定位」看区间怎么来的」、上下限框预填 361/395。
- 遗留（属另一路在建文件，未动）：`chart.tsx` 空态与 `direction.tsx` 里仍写着「先在「定位」生成探索区间」「用「定位」生成的探索区间」，而这两个文件正在被另一路改；chart.tsx 那句还把顺序写成「分数轴 → 方向」，与现行「方向 → 分数轴 → 航线图」不一致，建议由该路一并校正。
- 实测结论一（数据面，需负责人裁决）：各场考试的「学生总分 ÷ 本场特控线」全校中位比值——1册 0.846、21 0.835、2册 0.830、3册 0.849、41 0.820、4半 0.801、43 0.800、4册 0.854、51 0.855，而「4月」= **0.989**（只有 114 人参加）。也就是说 4月 那场的切线是相对一小批（很可能更强）的考生定的，比例法会把参加过它的学生等价分整体抬高约 20%——上一轮 1 班学生区间被撑到 637 就是这一场造成的。建议向校方确认 4月 的口径，或与入口同理把 4月 当不可比场次剔除。
- 实测结论二（算法面，需负责人裁决）：区间取「各场综合等价分的最小—最大」，一场考砸就会单独决定下沿。4 班那名学生五场综合等价分为 404 / 302 / 376 / 377 / 434，低端 302 来自唯一一次「0.583 倍线」的第4学期半期（其余四场在 0.72–0.83 倍线之间），于是区间 302–434（132 分宽）。可选的收紧办法：①≥4 场时去掉一个最低与一个最高再取最小—最大（该生 → 376–404，1 班学生 → 588–616）；②只取最近 3 场（该生 → 376–434）；③保留最小—最大，但把离群场次在界面上标出来由学生自己决定。三选一（或维持现状）由负责人定，本轮未擅自改。
- 另记一处口径不一致：自动填进高考目标分的是「最近一次考试」的换算值，而区间来自五场——该生最近一次最好，于是点值 433 落在区间 302–434 的上沿，看起来像自相矛盾。等位参考卡片写明了用的是哪一场，但分数轴与定位页顶部的大数字没写。附带说明：本页显示的低端是 302；负责人提到的「402」应为口误或另一状态下的读数，已按 302 核对。
- 验证：`npm run validate` 28 文件、408 项通过、0 失败。本轮未做浏览器复核：同一姓名的核验限流（5 次 / 15 分钟）已用尽，且页面状态被另一路的热重载反复重置；改动集中在文案与手动路径，已有断言覆盖。
- 未做：上面两条结论只记录，未改算法、未改数据、未动「学校接入自动代填目标分」。

## 2026-09-12 / direction-hierarchy：方向选择改为「大类 → 小类」两级

- 目的（负责人裁定）：AI 推荐与学生自选都先分大类（学科门类，如「工学」）、再选小类（专业类，如「计算机类」）；大类可选 2–3 个、小类 5–10 个，最后按这些方向去「分数轴」匹配院校与专业。
- 实现：
  - `catalogFromRows` 返回增加 `groups`：门类（大类）→ 专业类（小类）→ 真实专业 三层；个别记录缺门类归入「未分类」，不发明门类名。SchoolPool 同步携带 groups。
  - `makeBranches` 自选线颗粒度从「专业 id」改为「专业类 id」，与 AI 线同颗粒：一致合并为共同方向、不一致分两条（重叠的专业×院校两路都出现，不去重）。
  - App：新增 `pickedGroups`（≤3，取消大类联动取消其下已勾小类）、`togglePick` 上限 5→10（选的是专业类）；调试注入改为「一个大类 + 其下两个小类」贴合层级；下载 JSON 增加大类与小类名称导出。
  - 方向页：块一 AI 建议按大类分组（组头「{门类} · 溟建议在这一类里探索」）；块二改为两步选择——先点大类 chips（≤3），展开各大类内专业类 chips（≤10，悬停可见类下真实专业），底部已选小类可移除；块三与完成提示文案同步。
  - 谈心页建议卡按大类分组展示；progress DONE_HINT.direction 改「选 2–3 个大类，再勾 5–10 个专业类，或采用 AI 建议」。
- 验证：tsc 0 错；全量 vitest 28 文件、407 项通过（journey-model 新增分组结构、未分类回退、自选线按专业类颗粒度的断言）。按负责人要求未做浏览器视觉校检。
- 并发说明：本轮提交同时包含另一工作流在途的「入口考剔除」改动（identifySchool 的 withoutEntryExams 及 locate/quality-huixi 对应修改）——App.tsx 同文件交叉且拆分会造成中间提交缺函数不可构建，故一并入库保持每个提交可构建，归属归对方工作流，内容以其条目与 diff 为准。

## 2026-09-12 / drop-entry-exam：入口考整场剔除，不作为参考依据

- 目的（负责人裁定，原文）：「入口成绩不作为参考依据，直接把它删掉不放进去。」
- 实现：`quality-huixi.ts` 新增 `isEntryExam`（考试代码以「入口」开头）与 `withoutEntryExams`（返回剔除后的分片，不含入口场次时原样返回）。在**接入分片的那一刻**就过滤——`App.tsx` 的 `identifySchool` 拿到的 shard 先过 `withoutEntryExams`，`loadQualityShard` 同样处理；因此考试行、距线差、稳定性、趋势、航迹图、成绩表、知识短板、班级变动这些下游消费者自动都看不到入口场次，不需要各自判断。
- 边界：这是「不拿它当依据」，不是删数据——学校原始分片、数据库与发布产物都不动，重新接入拿到的仍是同一份数据。界面上明说这一点：已接入面板补「（入学入口考满分口径与正考不同，不作为参考，已剔除）」，学校数据里一场都不剩时给专门的空态文案（原来会提示「点添加一次考试」，而学校模式下没有这个按钮）。
- 实测：`npm run validate` 28 个文件、406 项通过、0 失败（新增 1 项真实分片断言：剔除后考试行与「最近一次」都不含入口，且原始分片不被就地修改）。浏览器实测同一名只有 4 次考试的学生：导入后考试行 4 → **3** 行（入口那一行的总分比其余三行高一倍多），近五次稳定性 **±176.6 → ±77.0**，趋势与探索区间不变（入口本来就没有切线、不参与换算）。880 份分片里剔除入口后没有学生变成「一场不剩」（最少剩 1 场）。
- 复核（换一名 4 班平行班学生，10 次考试）：学校面板显示「已接入 9 次考试记录（入学入口考……已剔除）」——10 → 9 场，最近五次里没有入口；五行全部有特控线、四行有本科线，距线差全部为负（这名学生整段在切线以下）。探索区间与按新公式手算的五场综合等价分逐项一致（先口径内取整、再两口径平均、再取最小—最大），稳定性、趋势、航迹柱数与剔除后的场次数一致。第二名字段、面板文案与空态均按预期渲染。
- 数据口径现状（仍未解决）：入口已剔除，但「1 册」上限 336 是另一套满分口径、「33」全校无切线、「4月」仅 114 人参加——这些仍会让同一列出现不可比的数字。要彻底解决需要导出环节按场次记录满分或由校方确认哪些场次不可比。
- 未做：未改学校数据导出管线；未动「学校接入自动代填目标分」（与 ADR-002 §4 冲突，等负责人裁定）。

## 2026-09-12 / range-average-and-school-data-check：两口径各半的区间、0 分与切线守卫，以及真实学校数据实测

- 目的：负责人裁定（原文）「两种不同的算法算出来的分数不一样……把它们两个综合一下各占 50% 的比例，相当于取一个平均数」；同时修掉总分 0 击穿探索区间的问题；并把荣县一中真实数据导入实测一遍（负责人怀疑导入出来的考试数据有问题）。
- 改动：`exam-position.ts` 新增 `usableLines` / `linesInverted`——切线必须在 (0, 750] 内，同一场两条线同时存在而本科线高于特控线时两条都作废并标记颠倒。`journey-model.ts` 的 `rangeFromExams` 增加 `combinedEquivalent`：每场考试把特控线口径与本科线口径**各占一半取算术平均**，再对各场取最小—最大值；总分 ≤0 与缺失同等对待（不再只挡 <0）。`locate.tsx` 的稳定性/趋势同样排除 0 分，切线颠倒的行显示「这场本科线高于特控线，未参与等位换算」；`style.css` 配一条 `.exam-diffs span.warn`。ADR-002 增加「修订 2026-09-12」节，说明「不平均」只约束等位参考的展示，探索区间改用平均。
- 验证：`npm run validate` 28 个文件、405 项通过、0 失败（本轮新增 4 项：平均口径、0 分、缺一条线、切线颠倒）。浏览器实测（内置 Chromium，390×844）：导入真实学生后探索区间由 529–655 变为 **543–637**，说明文字同步为「每场考试把特控线口径与本科线口径各占一半取平均」。
- 真实数据画像（880 份分片，只记聚合口径，不记姓名与成绩）：入口考 794 人全部无切线、总分上限 784.9（超出 750 口径，28 人超过）；「1册」上限 336（另一套口径）且 343/795 无切线；「33」739 人全部无切线；「4月」只有 114 人参加、切线明显低于其他场次。最近五次里含「入口」的学生 55 人（6%）；最近五次中可参与等位换算的场次数分布：0 场 10 人、1 场 74 人、2 场 16 人、3 场 23 人、4 场 78 人、5 场 679 人。
- 两个典型现场：一名考试次数较多的学生五行齐全，五场等价分跨 94 分（区间仍偏宽，主要来自「4月」那场的本科线口径比例 +41.9%）；一名只有 4 次考试的学生，同一列总分跨约 240–700 量级（三套满分口径混排），页面据此显示「稳定性 ±176.6、趋势 −122.3」，等位换算只找到一次可用切线，区间退化成 436–438 两点宽。
- 结论：导入链路本身没错（标签映射、只读、顺序、与源分片逐项一致），问题在**源数据的口径**——同一列混着不同满分的考试，且近半数场次没有切线。前端能做的边界守卫已加；要真正解决要么在导出环节按场次记录满分或剔除入口类考试，要么把这些场次明确标为不可比并排除出稳定性与趋势。留给负责人裁决。
- 提交归属说明：本轮 `journey-model.ts` 的改动被另一路 0e28a80 用 `git add` 整体扫入（该次提交同时改了同一文件），其余文件另行提交；两路改动已确认可共存（对方在文件下半部分增目录函数，本轮只改 `rangeFromExams` 及其辅助函数）。
- 未做：未改学校数据导出管线；未动「学校接入自动代填目标分」那条（与 ADR-002 §4「系统不得自动代填」冲突，等负责人裁定改代码还是改 ADR）；未做手机真机验收。

## 2026-09-12 / direction-catalog：谈心后给不出方向推荐的根因修复（发布包级专业类目录）

- 目的（负责人反馈）：调试模式里不管聊几轮都拿不到 AI 的专业推荐。根因是流程重排后暴露的依赖错误：AI 建议的目录、调试注入、方向页的自选清单与建议名字解析全部挂在「院校池」上，而新流程方向页在分数轴之前——学生聊完时院校池根本不存在，推荐永远不会出现。
- 实现：
  - journey-model 新增 `buildReleaseCatalog(release, track, additional, batches)`：发布包级专业类目录（与分数区间无关），复用 buildPublishedInput + catalogFromRows，枚举同一选科批次下发布库全部真实专业与专业类；场景构建所需分数取该科类公布范围中点（只为了过分段表校验，目录不使用它）。
  - App：目录按「选科+批次」指纹自动构建（不需要探索区间）；AI 请求的 directionCatalog、调试模式的示例建议注入都改用该目录；`matchPool` 不再清空自选（自选挂在发布包目录上，方向先定、匹配在后）。
  - 方向页：自选清单、专业类筛选、AI 建议名字解析改用目录；无院校池时不再阻断（原来是「先匹配院校池」横幅挡住整页），覆盖数字如实标注「匹配后显示」；底部横幅改「去分数轴匹配院校与专业」。
  - 谈心页建议卡的名字解析改用目录（不再依赖 pool）。
- 验证：tsc 0 错；全量 vitest 28 文件、400 项通过（新增 release-integration 集成测试：目录与分数无关、覆盖窄区间院校池之外的专业类——测试内用 fetch 桩把 offering 分片请求落回磁盘发布目录）。按负责人要求未做浏览器视觉校检。
- 提交：本轮代码与文档同提交（见 git log direction-catalog）。
- 未做：真实模型下 171 个专业类的全目录推断仍属二期（前端已按计划先行把全目录发给服务端 catalog-guard）；调试模式待负责人验收后关闭。

## 2026-09-12 / ui-acceptance：定位·谈心·分数轴逐页验收修正与流程段序理顺

- 目的（负责人逐页验收反馈，共四轮）：①航迹图看不出高低差，且不能用一条切线代表所有场次；②匹配出来的分数不再叫「高考目标分」；③等位参考两张口径卡叠字、字看不清；④删除给学生看的证据链/数据来源/真实性类展示；⑤谈心页「回答节奏」改「思考深度」并给每档预估时间、连接按钮被压扁、聊天界面精简、方向证据展示全删；⑥分数轴窄屏整页排布崩坏；⑦金带像点不像区间、白底输入框观感差、幽灵按钮隐形；⑧流程改为「先定方向，再按分数匹配」，分数轴不再回指方向。
- 实现：
  - 航迹图 `trailChart` v2：只画最近 6 次（入口考等量纲不同会把标尺撑宽、压扁近期柱差），特控线/本科线按每一场自己的划线分段绘制，新增左侧分数刻度、柱顶当次总分、两类划线标签防重叠；侧栏「你的成绩曲线」同改区间缩放标尺。
  - 高考等价分：识别接入后 `score` 改用最近一次带切线考试的线差比例换算值（原为裸分总分），定位页大数字/胶囊/按钮/通知文案同步；release-loader 刻度「你的情景分」改「你的分数」。
  - 按产品裁定删除面向学生的来源与真实性展示：Provenance 溯源锚点 7 处（定位/分数轴/航线图）、定位页证据链侧栏、探索事实卡「资料来源编号/链接」、谈心「可溯源」横幅、聊天气泡「存为方向证据」按钮与「方向证据 N 条」计数；学生原话仍随每轮对话作为自述证据上行，方向结论由 AI 建议线×自选线在方向页生成（机制不变，App 删除 saveChatEvidence/saveAnswer 等死代码）。
  - 谈心：THINKING_CHOICES 增加每档预估等待时间（深 约20–40秒 / 标准 约10–20秒 / 快 约3–8秒），开始页三张 tier-card；连接行 `.inp` flex:1 修复按钮被压扁；聊天头一行（名称/连接状态/当前深度）、气泡与输入区紧凑化、聊法/深度收一行 chip。
  - 分数轴：≤560px 英雄区竖排（标题通铺、区间数字收行）、两枚自身刻度收拢、底部说明只留提示句；根因修复——轨道容器子元素全为绝对定位致高度为 0，轨道悬下压住说明，补 44px 流式高度；金带删除「当前分」竖线（.axis-now），改更亮填充+上下限实心端头；区间输入框白底改深海玻璃底+浅色字（含 autofill）；「去定位生成区间」幽灵按钮换金调描边；底部横幅窄屏竖排；刻度全局不折行、贴边刻度向内对齐。
  - 流程段序：progress.ts STAGES 重排为 起航→定位→谈心→**方向→分数轴**→航线图（与导航编号一致，负责人裁定不倒回去）；分数轴底部横幅改「去航线图看两条线的结果」，谈心建议区下一步改「去方向定两条线」；考试行 ≤560px 改名称整行+三数字框等宽（学校长考次名不再挤截数字）；学校切线取整 1 位小数；vpill 在浅色卡片换深字浅底。
- 验证：每轮 `tsc --noEmit` 0 错；全量 vitest 28 个文件、399 项通过（前一轮状态摘要中的 398 为旧数）。测试钉桩按产品裁定反转或新增：Provenance/证据链/资料来源不得回潮、`.axis-now` 不得回潮且金带端头必须存在、航迹划线按场分段、标签防重叠 ≥12px、recentExams 取整、解锁顺序 断言改「区间→谈心→自选→匹配→航线图」。前几轮曾做内置浏览器 390px 实测；负责人说明由本人验收，此后不再做视觉校检。
- 提交与并发：1a22868（定位页四项）、43ecc1a（谈心页精简）、0d5bac1（分数轴金带重设计）、7b22784（流程段序+测试）。注意：axis.tsx / talk.tsx / style.css 的本轮界面改动被并行工作流的 800c36c（sail-compact，18:57:12）一并扫入，该提交说明未列这些内容，实际内容以本条目与对应文件 diff 为准；7b22784 只含 progress.ts 与 progress.test.ts。
- 未做/移交：调试模式（debug.ts DEBUG_MODE）仍开启，待负责人验收结束后关闭；后端协议对齐与线上验收另轮处理。

## 2026-09-12 / sail-compact：起航页六次靠岸与三件事的窄屏紧凑化

- 目的（负责人要求）：首页「一条航线，六次靠岸」六张卡在手机上占近一屏半，「先定下三件事」面板也偏松；要求在不删信息的前提下把卡片与卡片内容收紧。
- 改动：`chapters/sail.tsx` 把写死在 JSX 里的四处间距（面板 22 / 两栏 4+22 / 目标分 20+maxWidth320 / 行动行 22）收成类名 `sail-panel`、`sail-form`、`sail-score`、`sail-act`；`style.css` 末尾新增同名基础规则（桌面数值与改动前逐项相同）与 ≤560px 的起航页专项块：卡片内边距 20→13/15、正文 11.5px/1.9→11px/1.7、标题 16px→14.5px、卡间距 16→9、区块间距 26/30→16/18、面板内边距 26→18、字段间距 22→0/12，目标分与上方提示留 18px 以示换字段。六站说明与两条选科提示一条未删。
- 实测（内置 Chromium，390×844 / 320×568 / 1280×900）：390px 下单张靠岸卡 150→112px、六张合计 980→720px、三件事面板 560→483px、整页 3105→2662px；1280px 桌面逐项不变（卡片 150px、三列、面板内边距 26px、四处间距 22/4/20/22 全部与改动前一致）；320px 卡片同为 112px、本页无新增溢出。
- 验证：`npm --workspace @nanhang/web run typecheck` 通过；`npm run validate` 本轮复跑两次均为 28 个文件、399 项通过、0 失败（当前状态摘要里写的 398 是上一轮记录，差 1 项；以工作区实测为准，下次全量同步时更正）。18:50 复跑 `npm run validate` 有 1 项失败：`apps/web/test/theme-spirit.test.ts`「does not label the target slider as 现在」，原因是同一工作区另一路正在改的分数轴样式移除了 `.axis-now`（尚未提交），与本轮起航页改动无关；未去改该测试，留待对方收尾。
- 顺带记录（未修）：320px 下顶栏 `.head-end`（「四川·尚未选科·2027」+「溟」）横向溢出 18px，属既有问题，不在本轮范围。
- 提交状态：**尚未提交**。`style.css` 同时含另一路未提交的分数轴改动，无法只提交本轮内容；文档同步（`--package`/`--check`）与提交等对方落地后再做，避免把在建状态写进索引与源码包。
- 未做：未在真机与桌面浏览器逐页复看起航页；未跑真实数据流程。

## 2026-09-12 / student-journey-v1：按负责人思路重构主前端

- 目的：以选科与两条成绩入口开始，先筛区间院校，再两种 AI 聊天、学生自主选专业、交集合并/差集分路。负责人明确允许重构；决策及具体边界见 ADR-003。
- 实现：main.tsx 挂载 JourneyApp；新增 journey-model/worker/css。真实发布目录提供专业类与专业名，Worker 执行同年区间匹配；过期请求和旧结果被取消/失效。成绩变化后不能沿用旧结果，打印展开完整结果。
- AI：新增 catalog-guard 与 direction_catalog 请求字段、幂等内容、提示词词表和双端 ID 校验；新增实际 AiGateway 贯通测试，拦截库外建议与不属于学生的引用。主入口只保留引航/泛舟，无经典问答兜底。
- 学校：新增 school-access.ts 及私有映射导出器，880 条映射位于 private/；姓名+码必须同时匹配，选科不符拒绝覆盖，估算不混当前科类之外考试。移除 Vite 成绩静态挂载。单姓名/单 IP 限流防止全班因共用出口被五次登录锁住；生产身份生命周期尚未完成。
- 验证：26 文件/377 项通过；两前端构建通过；浏览器以真实招生和合成 AI/学校响应验证完整路径、两种聊天、库外 ID 过滤、结果分路、重算、考试入口、390/320 布局；学校另以实际本地发放记录核验一人，只记录结果不输出隐私。日志见 VALIDATION_RESULT.md。未在本任务调用真实模型或部署。
- 并发：工作期间另一路推进 AI 宿主/共享状态；保留其修改。206d625/76517fd 记录了将部分在建文件一并提交的情况，不能据此认定本轮完整实现已提交。集成检查发现 main.ts 一处多余括号，已作单字符修正以通过类型检查。当前工作区继续包含未提交改动。
- 文档与交付：同步当前状态、机器状态、README、AI/学校/前端专题与视觉说明，生成交接副本、索引、哈希及源码包。每次修改/提交同步文档的规则继续有效。
- 下一步：新前端与新 AI/学校协议一并线上联调；共享会话/限流、正式身份权限和校园网/回滚验收。TASK-13 改为进行中，TASK-14 保持进行中，TASK-11 保持跳过。


## 2026-09-12 / e2001cb-doc-sync：当前进度纠偏与持续交接规则

- 基线：`e2001cb5a1ff301c303a4bf4295ebf71c3ab4e1b`；本轮开始时工作区干净。补记此前已提交的首页/成绩页改进、ADR-002、千帆接入、Pages/COS/SCF 脚本及学生原话链路；不是本轮重新实现。
- 任务：TASK-14 从未开始改为进行中；TASK-01—10 保持原完成范围，TASK-12/13 未开始，TASK-11 保持负责人决定跳过。没有将部署脚本或提交标题当作线上验收。
- 修改：重写当前进度和验证主本、纠正机器状态内部旧字段，更新 README、AI、招生数据库及视觉进度专题；旧验证正文独立保存为明确历史快照。加入根目录和工程 AGENTS.md、DOCUMENTATION_POLICY.md，规定每次修改/暂停/提交同步文档、验证与接手信息。
- 同步工具：排除 dist-scf 构建输出和 .zcode 会话状态，更新索引用途描述；修正下一步摘要重复句号；其余私有数据与冻结合同边界保持。
- 验证：本轮重新运行 npm run validate（22 文件、342 项通过），npm run build:all（两前端通过），日志在 docs/verification/。文档同步用根目录 --package 与 --check，均通过（11 份冻结副本、24 份基线文件、0 错误），结果见当前验证页；没有重跑真实模型、浏览器、全量 Python 管线或线上验收。
- 待办：AI 空证据的演示回退、共享状态存储、TASK-13 本人鉴权、云运行时兼容性和线上验收仍未完成；继续顺序见 PROJECT_STATUS.md。
- 提交/部署：本轮文档和工具更新尚未提交；未推送、未部署。源码 ZIP 为固定旧日期文件名，内容由本轮同步刷新。

## 以下为逐轮历史记录

以下条目的“当前”“下一步”及测试数字只指对应实施时点；已被本页最新条目与 PROJECT_STATUS.md 取代，不应作为当前待办。

## 2026-09-12 工作区状态说明：另一路在建文件被一并提交

- 提交 `206d625` 时用了 `git add -A`，把同一工作区里另一路正在写的文件一并带上了：
  `apps/web/src/journey-model.ts`、`apps/api/src/school-access.ts`、
  `packages/ai-gateway/src/catalog-guard.ts`、`pipelines/quality-huixi/export_identity.py`
  及 `vite.config.ts` 的两行改动。
- 影响范围：这些文件目前**没有被任何入口引用**（`journey-model.ts` 无 importer，
  其余为新增模块），Vite 打包内容未变——Pages 产物哈希仍是 `index-t9FGXJGZ.js`，学生侧无变化。
- 当前 `npm run typecheck` 与 `npm test`（1 项：`quality-presentation` 的 vite 配置断言）
  在这批在建文件上是红的；它们属于另一路工作，本轮**没有改动**，以免覆盖对方正在写的版本。
  那一路收尾时会一并修好；在此之前不要把 `GATE-LOCAL` 当作当前通过状态。
- 教训：本工作区有并发写入，提交必须用显式路径 `git add <file>...`，不要用 `-A`。

## 2026-09-12 章节门禁：一步一步来，但随时可以回看

- 负责人要求（参照 Codex 的做法）：没完成上一个环节就不能打开下一个页面，必须一步步完成，
  完成之后可以回看；不允许随意乱跳。
- 新增 `apps/web/src/progress.ts`（纯逻辑，15 项测试）：章节按**流程**分段——
  起航 → 「定位｜成绩」两个成绩入口并列 → 分数轴（区间匹配）→ 谈心 → 方向 → 航线图；
  只有前面每一段都完成，下一段才解锁。段内并列是有意的：定位与成绩本来就是同一个环节的两种入口
  （通用模式 / 荣县一中增强模式），任选其一完成即可往下走。
- 每步「完成」的条件都取自既有状态，不新增需要学生记忆的标记：
  起航 = 首选 + 两门再选；定位 = 生成探索区间；成绩 = 验证码接入成功或按下「先用通用模式」；
  分数轴 = 跑过一次区间匹配；谈心 = 聊过（AI 转录有发言或存过原话）；方向 = 自选或采用 AI 建议；
  航线图 = 前面每一段都完成。
- 防跳：所有跳转（七个章节里的按钮、顶部航程条、移动端底部导航、页头、品牌按钮）统一走 App 里的
  `goTo`——没解锁就只弹一句指名道姓的提示（「先完成『定位』（生成探索区间），再进入『分数轴』。」），
  不换页。章节组件一行没改：`goTo` 的类型与 useState 的 setter 一致，章节拿到的就是它。
- 解锁只增不减：本会话解锁过的段位记在 `maxStage`，回去改数据不会把已经看过的页面重新锁上
  （避免学生在两页之间被弹来弹去）；但「完成」标记始终按当前数据实时算，改坏了就如实变回未完成。
  「清除本次探索」把门禁一并归零。
- 界面：未解锁的章节显示为虚线圆点 + 变灰 + `aria-disabled` 与 `title` 提示（不是 `disabled`，
  这样点得动、点下去还能听到为什么）；已完成打勾。顶部航程条的进度线也按真实完成状态绘制，
  不再用「编号小于当前页」这种线性假设（新流程里分数轴在谈心之前，编号顺序已不等于流程顺序）。
- 顺带确认：数字输入框的原生上下箭头（负责人提到的「输入框内右边的滑动箭头」）由 bd4dd63 的
  「表单控件主题化」修掉，实测计算样式已是 `appearance: textfield`，本地构建的 CSS 里也带这条规则；
  线上要等这次推送部署后生效。
- 验证：`npm run validate` 28 文件 398 项通过（新增 15 项门禁测试）；浏览器实测整条链：
  点被锁的章节只出提示不跳页 → 选科后定位/成绩解锁 → 生成区间后分数轴解锁 → 匹配出
  187 所院校后谈心解锁 → 存一句原话后方向解锁 → 自选一个专业后航线图解锁 → 回看任意章节正常。

## 2026-09-12 订正：Redis 规格从 1GB 缩到 256MB

- 先前的判断是错的：`CreateInstances` 的文档写着「MemSize 数值需为 1024 的整数倍」，我把它当成了最小规格，
  直接开了 1GB。实际询价显示 256MB / 512MB 都能买，价格按内存线性（256MB ≈ ¥0.0368/小时）。
- 实测用量 `SizeUsed` 为 0（会话键每条几百字节到几 KB，一个班几十人也远不到 1MB），
  256MB 完全够用。已用 `UpgradeInstance(MemSize=256, RedisReplicasNum=1, SwitchOption=2)` 原地缩容，
  **外网地址与端口不变**（`cd-crs-bdr4f2z6.sql.tencentcdb.com:24668`），连接数上限仍为 10000。
- 缩容后复验：函数 `/healthz` 仍为 `store:"redis"`，`/readyz` 的 `state_store` 为 true；
  线上真跑一轮（兑换 + 引航）HTTP 200、4 个选项、0 个 error 帧。
- 教训记在这里：腾讯云 API 文档里的「单位/倍数」说明不等于售卖规格下限，开实例前应该先用
  `InquiryPriceCreateInstance` 逐档询价，而不是照着文档推。

## 2026-09-12 学校成绩上云（方案 B）：云端只放密文 + 共享限流

- 负责人决定采用云端托管，并明确不担心验证码强度。事实层面必须记住：6 位码只有 100 万种组合、
  分片名又是 `sha256(验证码)[:40]`，所以「目录一旦可读 = 全部学生可读」。因此这一轮不是把明文分片
  放上对象存储，而是把它变成「即使存储侧泄露也无用」的形态。
- **密文导出**：新增 `scripts/export_school_cloud.mjs`（AES-256-GCM + 对象名 `HMAC(密钥, 分片名)[:40]`），
  880 份分片 → 44.5 MB 密文；密钥 `private/school-cloud-key.txt`（新建，git 忽略，只进函数环境变量）。
  上传用 `scripts/deploy_school_cloud.py`（沿用既有只读桶，上传的是密文，不需要新桶、不需要新凭据）。
- **函数侧**：`school-access.ts` 支持云端取分片（配了 `NANHANG_SCHOOL_CLOUD_BASE` + `NANHANG_SCHOOL_KEY`
  就不读本地目录，云端取不到直接 401，不回落到明文）；限流从「每个实例自己数」改成 **Redis 共享计数**
  （姓名 5 次 / IP 120 次 / 15 分钟），多实例下才真正有效。身份索引随代码包发布
  （`build_function.mjs` 自动附带 `private/quality-identity.json`，只有摘要、无姓名与验证码）。
- **修掉一个自己埋的坑**：本地目录的兜底路径是提前求值的 `new URL(..., import.meta.url)`，
  打包成 CJS 后 `import.meta.url` 为空，于是每次请求都抛 `Invalid URL` 被吞成 503。
  改为惰性解析（`moduleRelative`），并把吞掉的异常写进函数日志。这个 bug 只有在「打包产物」上才复现——
  用源码跑是好的，说明「本地通」不等于「线上通」。
- 验证：`scripts/redis_store_check.mjs` 之外新增 6 项云端分片测试（对象名派生、解密、篡改一个字节即拒绝、
  配了云端不回落本地、密钥长度不对按未配置处理）；`npm run validate` 27 文件 383 项通过；
  线上用**真实学生凭据**验证：HTTP 200、返回分片与本地明文逐字段一致（9 次考试）、
  公网直取对象是密文（56 KB 二进制、非 JSON）、错名 401、限流 429（跨实例共享）。
- 仍未验证：并发规模（几十人同时登录）、密钥轮换演练；增强模式要等新前端（JourneyApp）上线才对学生可见——
  现在线上的旧前端读的是静态目录 `/data/quality-huixi`，云上并没有那个目录。

## 2026-09-12 共享会话存储：Redis 接上，多实例不再踢人

- 背景：函数此前跑单实例内存档，SCF 并发起来会起多个实例，学生的第二轮请求落到另一个实例就会
  401、被要求重新兑换访问码。课堂试用前必须解决。
- **开了一台最小的 Redis**（腾讯云 `crs-bdr4f2z6`，成都一区，Redis 7.0 标准架构 1GB/1 副本，按量计费
  ≈¥0.15/小时），建在独立的 `nanming-state-vpc` 里，开通外网访问供函数使用；连接信息在
  `private/nanming-redis.txt`（git 忽略），只以环境变量形式进函数配置。
- **`StateStore` 接口改为异步**：网络存储天然异步，把 `claim/transition/revoke…` 全部改成 Promise，
  `MemoryStateStore` 与新的 `RedisStateStore` 实现同一套语义，网关只依赖接口；`apps/api` 侧
  `authenticate/createSession/requestStatus/revoke/readiness` 一路 await，测试同步补齐。
- **原子性靠 Lua**：占位、状态迁移、撤销各是一个脚本，判断与写入不分离——额度、并发计数、
  幂等记录不会因为并发而超卖或重复结算。键统一前缀 `nm:`，全部带 TTL（默认等于会话 TTL）。
- **自带极小 RESP 客户端**（`redis-client.ts`，socket + 命令队列 + 断线重连），不引入第三方依赖；
  冷连接超时按 5 秒（实测首次 DNS 解析加握手 0.5 秒，2 秒预算会被 DNS 吃光，误判成「存储不可用」
  会把 AI 关掉）；探活失败只丢当前连接，不把客户端标记为关闭。
- 验证：`scripts/redis_store_check.mjs` 对真实实例 16/16 通过（含「三方同时抢同一个 request_id
  只结算一次」与撤销）；自动测试新增 13 项线级测试（26 文件、377 项全通过）；函数部署为版本 4，
  `/healthz` 显示 `store:"redis"`，`/readyz` 的 `state_store` 为 true；
  线上真跑：引航/泛舟各一轮、两个学生**同时**兑换并各聊一轮（都 200）。
- 顺带确认（浏览器走查线上 Pages）：起航选科+情景分 600 → 位次 23,461（2025 官方分段表）；
  成绩页要求 6 位验证码并明说离线可穷举；分数轴「运行匹配」得到 20,366 个专业×院校，
  航线图按历史参考关系分成 2,367 / 54 / 16,591 三组；AI 面板深档一轮约 15–90 秒（冷启动更久）。
- 待办：真实学生规模下的限额与计费、TASK-13 学生本人身份；Redis 用完记得销毁并把
  `NANHANG_REDIS_*` 一并删掉（生产档会因此让 AI 整体不可用，而不是悄悄退回内存档）。

## 2026-09-12 线上打通：函数访问路径、演示原话隔离、建议署证不再整轮作废

- 背景：Pages 已读真实发布包，但 AI 中转函数在控制台上没有「访问路径」，学生点不动 AI。
- **查清访问路径的来路**：`nanming-api` 的触发器数是 0 —— 用 `CreateFunction` API 建的 Web 函数
  不会自带触发器，`GetFunction.AccessInfo.Host` 也是空串，所以「没有访问路径」不是没开通。
  建一条 `http` 触发器（`Type=http`、`Qualifier=$LATEST`、`EnableExtranet`、CORS 留给服务端自己发）
  后，`ListTriggers` 的 `TriggerDesc.NetConfig.ExtranetUrl` 即公网地址；
  已写进仓库变量 `NANHANG_API_BASE`，建触发器的字段与坑记进 `docs/AI_QIANFAN_SETUP.md` 第三节。
- **线上真跑三轮**（真实千帆、深档、同一会话）暴露两处问题，均已修：
  1. **演示原话被当成学生的经历**：服务端注册表无条件回落到 `demoEvidence()`，模型于是引用演示原话，
     回复里出现「你之前说搭纸桥记测试方法」——学生从没说过。新增
     `demoEvidenceAllowed()`：只有假上游（本地联调、验收脚本）才允许演示原话顶替，
     接真模型时服务端注册表为空，没存过原话就只提问、不给建议；`NANHANG_ALLOW_DEMO_EVIDENCE` 可覆盖。
  2. **一条没署证的建议会让整轮作废**：泛舟模式实测被 `suggestion must cite registered evidence` 整轮降级，
     学生等到的那段正文一起没了。改为**丢掉那一条建议、保留正文**（正文已过安全扫描，伪造引用本来也不渲染），
     丢了几条、为什么丢写进 complete 帧的 `dropped_suggestions`（学生端不读）。提示词同时补一句
     「整段回复里只留一个问号」，此前实测出现过一次回复里两个问题。
- 修后复跑：没存原话的引航/泛舟两轮都干净（无假引用、无降级，引航给出 4 个可点选项）；
  学生给出自己的原话那轮，模型正确引用 `ev-mine-1` 并给出方向建议。
- 验证：`npm run typecheck` 通过；`npm test` 22 个文件、347 项通过（含新增 5 项：演示原话开关、
  空注册表建议丢弃、被丢掉建议的正文保留）；函数重新部署为版本 3。
- 仍然未做：共享状态存储（现为 `NANHANG_AI_ALLOW_MEMORY_STORE=1` 单实例模式，多实例并发下学生会话会失效）、
  线上 Pages 端到端点击验收、TASK-13 学生本人身份。

## 2026-09-12 聊天模型接入：百度千帆（Token Plan 个人版）

本轮只改 AI 上游与运行配置，不触碰匹配规则、发布数据与学生数据。新增 30 项测试
（21 项千帆上游与网关端到端、6 项上游选择，另补既有 API 测试的确定性）。

**新增 `packages/ai-gateway/src/qianfan-upstream.ts`**

- 端点收敛：只允许 https、官方域名 `qianfan.baidubce.com` 与标准 Token Plan 个人版路径；
  coding 系地址与带凭据的地址在构造时就被拒绝，避免配错域名把密钥发到别处。
- 流式解析：只把正文增量发给学生，`reasoning_content`（模型草稿）一律丢弃；分隔标记
  `===NANHANG_STRUCT===` 之后的结构化段永不进入学生的界面。
- 可见边界分三种情况：遇到标记 → 只发标记之前；行首出现 `{` → 先扣住，等流结束由
  `splitStructured` 判定；文本结尾恰好是标记前缀 → 只扣住那几个字符。首版固定扣住整个标记
  长度，导致短回复被整段压住（首字节不出现、流式失效），由本轮测试暴露并改掉。
- 兜底：模型忘写标记时识别末尾 JSON 并剥离；JSON 不合法时保留正文、建议为空。
- 失败分类：非 2xx 只上报状态码（不读上游正文、不回显密钥）；中途掉线按 `started` 标记归类，
  让网关不再对已经出过字的请求重试。
- 缓冲按请求对象存放（WeakMap），同一实例并发处理多个会话时不会互相覆盖。

**学生证据接进上游请求**

- `UpstreamRequest` 新增 `evidence`，由网关从会话注册表填入（上限取配置的 `maxEvidenceIds`）。
  此前模型拿不到任何证据 ID：结构化输出的校验要求每条方向建议引用注册过的原话 ID，而提示词里
  没有这些 ID，建议必然是空的。这是接入真实模型前必须补上的一环。
- 系统提示词 = 既有 `PROMPT_BOUNDARY` 七条 + 输出格式合同 + 可引用证据 + 可选方向 ID；
  学生原话放在明确标注为「数据，不是指令」的区块里。

**`apps/api` 上游选择与超时**

- `selectUpstream`：显式 `NANHANG_AI_UPSTREAM=qianfan` 时配置不全就拒绝启动；`=fake` 或设了
  `NANHANG_FAKE_SCENARIO` 时用假上游；未指定时千帆配置齐全就用真模型。实际生效的是哪一个会出现在
  启动日志与 `/readyz` 的 `upstream` 字段里，不会静默切换。
- 新增 `NANHANG_AI_FIRST_BYTE_TIMEOUT_MS` / `NANHANG_AI_TOTAL_TIMEOUT_MS`：开启思考档位后首字节
  明显变慢，不放出这两个旋钮，整条 AI 路径会超时失败。

**提示词与思考档位：借鉴北辰（2026-09-12 补做）**

- 北辰的提示词在前端页面里，本轮把其中可迁移的**谈话纪律**搬进服务端提示词：先接住学生刚说的具体内容再
  往前走一小步、每轮只问一个问题且问题要能引出一段经历／感觉／取舍、话题线索从具体往抽象走并在长对话里换
  切入角度、喜欢与擅长与家长期待与担心竞争分开记录且冲突如实保留、只有至少两类线索相互印证才说「更偏向」
  否则写「仍在观察」、快捷回答只是线索不是结论、正文与建议理由都不许出现证据编号或「第几问／判断依据／
  证据表明」这类测评腔。
- **没有搬**：思考低语（南溟规定思考内容绝不发给学生，且它不过安全扫描）、北辰知识库里的具体数字
  （南溟不许模型自行断言数据）、领航／夜航双模式与可点选项（南溟面板本来就是自由输入）。
- **提问内容按南溟重写**，不是照抄北辰的话题清单：明确告诉模型要分辨的方向只有三个
  （数据整理与信息核对、结构制作与修改、规则阅读与流程记录）；把每条方向真实配套的那件小任务
  写进提示词，并指示它聊到某条方向时问学生愿不愿意试、试完什么感觉；要求问现实条件
  （家里、费用、地域、必须照顾的安排）；明确把分数／位次／能不能上某所学校划走，
  并禁止主动把话题引到具体学校或专业（实测中模型这么做过一次，因此写进提示词）。
- 思考档位三档（`NANHANG_AI_THINKING_TIER`）。**服务端默认 deep（质量优先，负责人决定）**，
  学生在谈心章节的 AI 面板里自己切（深／标准／快），逐轮生效、不影响已拿到的回复；
  服务端在深档下把首字节上限放宽到 120 秒、整轮 300 秒，否则每轮都会在默认 30 秒被掐断。
  实测同题：deep 17.0／9.5 秒，speed 4.9 秒，端点默认档 24.8／19.8 秒。
- 真实模型复验（默认深档，同一凭据来源，脚本用完即删）：含糊回答只问一个具体经历问题；
  提到家里希望留川、学费有压力那轮得到 **0 条建议、0 条行动**，没有硬凑方向。
- **两种聊法**（参考北辰领航／夜航，名字与文案按南溟主题重写）：**引航**（默认，每轮给 3~4 个可直接点的
  答案）与**泛舟**（取自「泛若不系之舟」，只问问题、不给选项）。界面上是两张可以挑的卡
  （`aria-pressed` 选中态 + 既有设计令牌：金铜边框、米色底、衬线名字），切换下一轮生效、已聊内容不受影响。
  模式随每轮请求下发（请求体新增 `mode`，只接受 `guided`/`open`），输出契约新增 `options`
  （最多 4 个、每个 ≤24 字、同样过安全扫描）。
  自由探索下有两道防线保证不出按钮：上游清空 `options`，前端也只在 `guided` 时渲染，两条都有测试。
  切换聊法清掉上一轮选项但保留回复。真模型复验：选择作答返回 4 个具体答案，把其中一个当学生回话再发，
  模型顺势给出配套的小任务（用纸搭桥并记录测试方法）；自由探索同样输入返回 0 个选项。

**未做（如实标注）**

- **真实凭据验证已通过（2026-09-12 补做）**：凭据按交接库规矩从《操作执行清单》附录 A 读取，
  探针脚本放临时目录、用完即删、全程不打印密钥。直连探针 HTTP 200、首字节约 1.0 秒；
  完整网关跑一轮 HTTP 200、约 16 秒、143 个 delta 帧、0 个 error 帧、552 字正文，未被安全校验降级，
  1 条建议同时引用注册过的两条原话，学生看到的文字与校验后的 reply 逐字相同。
  实测教训已回写进代码与文档：思考与正文共用单轮 token 上限，`max_tokens=300` 且开思考时正文为 0 字，
  因此新增 `QIANFAN_MAX_TOKENS` 旋钮。仍未验证：多轮连续对话、并发、真实规模下的限额与计费。
- **本地 API 仍是演示宿主**：服务端证据注册表是 `demoEvidence()` 的合成原话，前端发送 `context: []`
  不带学生自己的回答。真实模型现在会引用学生没写过的演示原话生成建议卡片——自测可以，给学生用之前
  必须先把前端的学生回答接进请求（属于 `ALLOWED_TURN_FIELDS` 的契约改动），单独做、单独测。
- 云函数宿主、生产 CORS、学生身份（TASK-13）未动。配置与故障对照见
  [AI 千帆接入说明](AI_QIANFAN_SETUP.md)。

## 2026-09-12 工程卫生：学生页拆章、选科回填不猜组合、盐钥分离与版本控制

本轮不改业务规则、匹配逻辑与数据管线，只做可维护性与隐私加固；全部改动由既有守卫测试与新增断言护航。

**学生页拆章（App.tsx 1543 行 → 外壳 400 行 + 章节文件）**

- 新增 `apps/web/src/chapters/`：`shared.ts`（标签表、章节表、历史参考配色、SVG 转 PNG 等
  模块级内容）与 sail/locate/quality/talk/direction/axis/chart 七个章节文件。各章只声明自己
  用到的 props，正文逐字搬移；删除无引用的死代码 `toggleSubject` 与 `escapeXml`。
- 主题/谈心/成绩/纸感四个守卫测试改为拼接 App 与全部章节源码后做静态断言，原来钉住的约定
  一条没少；vite 数据目录断言改为钉住工厂的挂载路径与越界复检。
- `vite.config.ts` 中 release 与 quality 两个逐行重复的数据目录中间件合并为 `serveDataDirectory`
  工厂，路径逃逸防护只此一份。

**增强模式选科回填：不按旧名单猜组合**

- 原实现把「物化地/历政地」之外的组合一律兜底成物化生；数据出现新组合时会静默填错再选科目、
  把资格判断带偏。改为 `quality-huixi.ts` 的 `additionalFromCombination` 按组合原文逐字解析
  （如「物生地」→ 生+地），识别不足两门返回 null、保持学生当前选择让他自己改；新增 3 项测试。

**隐私加固：盐与明码表分开存放**

- `private/quality-huixi-salt.txt` 移入 `private/keystore/`；`build_quality_db.py` 默认路径与
  `QUALITY_HUIXI_PIPELINE.md` 同步更新，仍可用 `--salt` 显式指定。新增 `private/README.md`
  记录存放规则与已知残留风险（验证脚本内置真实码；上线前必须服务端校验并限流）。

**版本控制**

- 工作区首次 `git init`（此前以 zip 快照 + SHA-256 清单代替版本管理）。根 `.gitignore` 排除
  private/、真实学生数据、原始 Excel 与可重建产物；改动前先做基线提交，保证每步可回滚。

**验证**：20 个测试文件、272 项通过、0 失败（净增选科组合解析 3 项）；`npm run typecheck` 通过；
`tools/sync_project_docs.py --check` 通过。本轮未发布站点、未触碰招生与成绩数据内容。


## 2026-09-11 荣县一中增强模式：质量慧析接入、成绩库与发布产物

把学校提供的《高2024级51质量复盘（新版）赋分3(1).xlsx》接入学生端，做成可验证的入口。

**解析：只用质量慧析自己的代码**

- 固定 `yusheng266186-beep/zhiliang-huixi-new-` 的 accuracy-v1.2 提交
  `6f70eab4e6e9ecadc00149b1387103b45b5d8e2b`，克隆到**工程外** `../.nanhang-ref/`（不进索引与源码包）。
- `pipelines/quality-huixi/export_dataset.ts` 在参考仓库内运行，核对 `HEAD` 后调用它的
  `parser.ts` / `analytics.ts` / `class-config.ts` / `report-model.ts`，输出 `dataset.json`。
- 解析结果与该仓库自带断言吻合：51 考试物理类均分 403.5713922320411、历史类 419.14728192175136。
- 覆盖 13 次考试、880 名学生、7,954 条成绩、15,878 条小题、926 道小题元数据。

**建库**

- `pipelines/quality-huixi/build_quality_db.py`：`dataset.json` → `quality-huixi.sqlite`
  （23 张表 + 2 张视图），写入时自检 person / observation / question / item_response 行数与身份一致性，
  并把逐人知识点得分率与解析器的全年级汇总逐条比对（689 组必须全等，否则建库失败）。
- 身份规则由数据推出并写入 `person.identity_basis`：一个人 =（姓名, 科类, 选科组合）；
  16 班美术生的 35 条「艺术」组合记录并入同名常规班学生；8 名换班学生的每次原始班号保留在
  `person_class_history`。

**本次核对发现并如实记录的三件事**

1. **工作簿「校赋名」列在不同考试语义不同。** `21`/`33`/`51` 是年级位次（51 物 433 条全对），
   `4册`/`41`/`43`/`2册`/`3册`/`4半` 是班内位次（4册 405 条中 327 条相符），`入口`/`1册`/`4月`
   两者都不是。新增 `rank_check` 表保存源位次与重算位次之差，`data_issue` 为 9 次不一致考试
   各记一条（`RANK_SOURCE_DISAGREEMENT`，共 5,633 条），页面统一显示重算位次并在索引里说明理由。
2. **美术班考试按历史类统计。** 41/4半 的美术生记录在成绩表里属历史类，其位次池、分数线与班级
   均分都取历史类；`score_observation.track` 按行保存，发布分片新增 `trackDiffersFromHome`，
   页面在该行标注「按历史类」，避免用本人主科类的分数线错算线差。
3. **169 条小题记录无法归属。** 41 与 4册 有 169 条小题明细在成绩表里找不到对应的有效学生行
   （总分缺失、冲突被排除或该次未参加），记为 `ITEM_RESPONSE_UNLINKED`（8 条）留在库里，
   不进小题库，不猜测归属。

**发布产物与前端**

- `export_release.py`：880 份按人分片（文件名 = sha256(6位验证码)[:40]）+ 共享索引 + manifest
  （逐文件 SHA-256、验证码强度警告）。分片只含本人成绩行与匿名汇总；索引里的姓名被掩码成
  「曹＊＊」，冲突记录只保留条数与处理方式。
- `verify_release.py`：抽检 40 份分片，核对哈希、姓名隔离、位次范围、线差减法、知识点得分率
  与跨科类口径；当前 0 问题。
- React 版新增第三章「成绩」（`App.tsx` 的 `renderQuality`）+ 读取层
  `quality-huixi.ts`/`quality-types.ts`；入口卡片从禁用改为可用，需要 6 位验证码。
  读完自动回填首选科目、再选科目、最近一次总分与最近五次历史分。
- 读取层按内容区分「查无此人」与「数据损坏」：带 SPA 回落的开发服务器对缺失分片返回 200 + HTML，
  这种情况也提示验证码不对，而不是抛解析错误。

**隐私与分发边界**

- `data/quality-huixi/`（含姓名、成绩、验证码摘要）写入 `nanhang-app/.gitignore`，并加入
  `tools/sync_project_docs.py` 的 `UNMANAGED`：不进索引、不进哈希清单、不进源码包。
  已核对生成的源码包 737 项中只有管线源码，无任何学生数据。
- 明码表与盐在工程外 `../private/`。盐决定验证码，丢失会导致所有学生换码。

**验证**

- `npm run validate`：18 个测试文件、241 项通过、0 失败（新增 31 项：数据 21 项 + 表现 10 项，
  另有 2 项并入既有文件）。
- `npm run web:build`：主脚本 gzip 91.44 KB。
- 端到端：用真实浏览器（Chromium + Playwright）走完入口→验证码→成绩页，页面渲染出学生姓名、
  班级、51 场总分、校内位次、逐科距线差与知识点表；控制台无异常，页面无「录取概率/稳上/保底」类
  表述。数字与 SQLite 逐项核对一致（总分 562.25、校内 6/433、班内 4/28、一本线 474.2、本科线 396.23）。
  另按页面同一条 HTTP 路径取回本人分片，未发行的验证码取不到记录。
  此处只记录核对结论，不记录学生姓名与成绩——具体记录留在本机发布产物里。

**尚未验证**

- 未做真实学生试用；学生是否理解「校内位次 ≠ 录取可能」无观察证据。
- 6 位验证码可离线穷举，当前仅限本机/校内演示；正式上线必须改为服务端校验 + 限流。
- 纸感版（`apps/web-paper`）尚未接入，接口与约束见 [质量慧析管线](QUALITY_HUIXI_PIPELINE.md) 第 8 节；
  该目录当时正被另一处并行编辑，本次未改动。

## 2026-09-12 荣县一中增强模式：页面实测、隐私收口与一处排序修正

上一轮留下三件事：浏览器实测没做成、纸感版当时正被并行编辑、以及未做端到端隐私核对。本轮逐项收尾。

**浏览器实测（补上一轮未完成的验证）**

上一轮 IAB 面板 `visibilityState` 为 `hidden`，点击送不到页面。这次改用独立进程的 Chromium + Playwright
（`private/verification/check_quality_page.py`），它是与工程测试分开的第二条证据链：

- 关掉开场对话框 → 点「荣县一中 · 增强模式」→ 输入 6 位验证码 → 成绩页渲染完成；
- 页面控制台异常 0；无「录取概率 / 稳上 / 保底 / 冲稳保 / 预计录取」类表述；
- 页面数字与 SQLite 逐项一致：总分 562.25、校内 6/433、班内 4/28、一本线 474.2、本科线 396.23，
  逐科距线差与库内减法结果相同；
- 缺失单元格渲染为「—」（语文 106 等正常值旁，入口/33/43 场的缺失线显示为「—」）。

**修掉一个只有肉眼才能发现的问题：知识点排序**

页面上「最该先补的几块」原先按得分率升序、并列时按满分**升序**，于是并列 0% 的条目里，
一连串「0/3」的小题把真正丢分最多的「0/17」挤出了表格。改为并列时先看丢分多少（`possible` 降序），
再并列时看与年级得分率的差。修正后首条变为「数学·导数综合 0/17，年级 1.8%」——这才是学生该先看的。
新增 2 项测试盯住这条排序（含「并列 0% 时前面一条的满分不低于后一条」）。

**隐私收口（本轮新增的核对）**

写了一份独立扫描（`private/verification/scan_name_leaks.py`）：把数据库里 870 个学生姓名逐一在
**除发布产物与 `private/` 之外的全部工程文件**里检索。它抓到两处真实泄露：

1. `docs/IMPLEMENTATION_LOG.md` 的验证记录里写了学生姓名与成绩（上一轮我写的）；
2. `docs/QUALITY_HUIXI_PIPELINE.md` 用真实姓名举例说明「同名不同组合」。

两处都改为不指向具体学生的写法，复扫 0 处命中。另外把 `private/`（明文验证码表、盐、核对脚本与截图）
写进 `tools/sync_project_docs.py` 的 `UNMANAGED`：此前它虽不在源码包内，却已被 `FILE_INDEX.md` 与
`MANIFEST.sha256` 收录——**码表的哈希离码本身只有一步，盐更是决定每个学生的码**。修正后实测：
源码包 740 项不含 `private/`、不含 `dataset.json`、不含任何 `.sqlite`；索引与清单 0 处 `private/` 条目。

**纸感版为什么仍未接入**

本轮确认纸感版有**明确的有意设计**：`docs/FRONTENDS.md` 写明「它比主前端少一些东西，这是有意的：
没有 AI 面板、没有荣县一中增强模式、没有单科提分计划」，`apps/web-paper/test/paper-honesty.test.ts`
还专门断言纸感版源码不得出现 `quality-huixi` 或「荣县」。因此**不接入**，这不是遗漏而是遵循既定边界；
若负责人日后决定以纸感版为主，需按 `FRONTENDS.md`「还没决定的事」一节另立任务。

**验证**

- `npm run validate`：19 个测试文件、255 项通过、0 失败。
- 浏览器实测：见上；截图在 `private/verification/`（本机留存，不进交付）。
- 姓名泄漏扫描：0 处命中（870 个姓名 × 全部受管文件）。
- `tools/sync_project_docs.py --check`：通过；`--package` 后源码包 740 项，逐文件核对一致。

## 2026-09-12 前端主题与内核：让「南溟」长进界面，而不是贴在界面上

上一轮把纸感版并入后，主前端的问题变成「有形无神」：配色与排版是南溟的，但界面本身没有在
讲南溟这件事。这一轮不换风格，只把主题与内核补进去，并修掉过程中暴露的几处真问题。

**图标：补上南溟自己的形状**

新增 6 枚，画法与既有图标一致（24×24、fill:none、stroke-width 1.5、圆头圆角）：
`i-kun`（鲲）、`i-wing`（鹏翼）、`i-log`（航海日志）、`i-ruler`（刻度）、`i-buoy`（浮标）、
`i-chartmap`（海图）。成绩章此前用 `layers`，与「校内位置」重复，改为 `i-log`。

**航程：七章各有其名**

每章眉题加上航程阶段名：起航·北冥有鱼 / 定位·测深 / 成绩·录航迹 / 谈心·问心 /
方向·定罗盘 / 分数轴·试风 / 航线图·抟扶摇（取自《逍遥游》的航程意象）。
顺带修掉一个错位：新增成绩章后，各页眉题的章节编号仍停留在六章时代（谈心写 03、
成绩也写 03、航线图写 06），与导航不一致；现已与 `CHAPTERS` 对齐并由测试钉住。

**内核：把「每个数字都能追到来源」做成元件**

- `Provenance`（溯源锚点）——一枚锚加一行依据。用在四处：定位页的公布范围、院校卡
  （说明组线与专业线是两条记录、各来自哪一年）、航线图的分组依据、成绩页的解析版本。
- `Uncharted`（未测绘）——缺失数据不是破折号，而是「这片海域没有测过」。位次不可得时
  显示「未测绘 + 原因」，与「不好」分开。
- 方向卡现在引用**学生本人保存的原话**（`interestEvidence[0].quote`）。项目一直声称
  「方向来自你保存的原话」，但卡片此前并不显示那句话；没有原话时明说「还没有你自己的原话
  支撑」，不用系统措辞充数。
- 成绩页新增「航迹」：把历次总分画成一条看得见的轨迹，缺考或没有来源总分的场次画成
  虚线空柱，**不补成 0 分**（0 分会读成「考了 0 分」）。

**修掉的真问题**

1. 分数轴刻度重叠：「150 / 公布低段 2025」与「300」叠在同一位置，右端「691 / 公布高段 / 2025」
   被挤成四行。原因是三个标签都居中排在同一高度。现按位置决定对齐：端点上贴边、情景分单独
   占一行。
2. 滑块范围与刻度不同源：范围此前从「本次位次结果」推导，未填分数时退回 300–700，
   而刻度来自分段表（150/691），于是刻度被夹到错误位置、和滑块声称的范围也对不上。
   现统一取公布范围。
3. 未填分数却写「尚未载入分段表」，把「没填」与「分数不在公布范围」混为一谈。现分开措辞。
4. 滑块上方同时出现「你的情景分」与旧设计留下的「现在」标签——后者是给「当前分/目标分」
   双滑块设计的，本页只有一个目标分滑块。
5. 缺值的大号破折号在 40px 字号下渲染成一根粗黑条，看起来像强调；加 `.absent` 弱化。

**验证**

- `npm run validate`：20 个测试文件、269 项通过、0 失败（新增主题守卫 10 项 + 航迹 4 项）。
- `npm run build:all`：主前端 gzip 93.18 KB、纸感版 20.17 KB。
- 浏览器实测：七章导航、新图标注入、刻度不重叠、滑块范围 150–691、溯源锚点 4 处、
  未测绘提示、方向卡引用本人原话，均通过。
- 成绩页的「航迹」需要真实学生验证码才能看到，因此把柱高计算抽成纯函数 `trailHeights`
  并补 4 项单元测试（含缺考不画成 0 分），在不用学生数据的前提下验证其行为。

## 2026-09-12 第二套前端并入：共享数据与规则，界面留给比较


把此前作为单文件演示的「纸感版」正式并入项目，作为与 `apps/web` 并列的备用前端。

**先抽共享包，再做界面**

并入不是把 HTML 搬进目录就算完成。纸感版原本自带 1.81 MB 内嵌数据切片，并把匹配规则
在页面里重写了一遍。如果就这样并存，两套前端会各自维护一份「哪一年可比、位次取哪张表、
组线还是投档线」的判断——迟早有一套会悄悄给出错误结论。因此先抽出三个工作区包：

- `packages/release-loader`：发布包线格式，以及位次（`scorePosition`）、分数轴刻度（`axisMarks`）、
  方向覆盖（`directionCoverage`）、参考年（`referenceYearFor`）的派生。这些函数从
  `apps/web/src/model.ts` 与 `release-loader.ts` 迁入，`apps/web` 改为薄重导出，导入路径不变。
- `packages/match-input`：从发布包构建匹配输入（`buildPublishedInput`）与可选批次清单。
- `packages/domain`：匹配规则本体（原本就是共享包，未改动）。

**纸感版的变化**

- 丢弃内嵌的 1.81 MB 数据切片，改为运行期读取与主前端相同的 `data/releases`（同一 vite 中间件、
  同一份目录穿越防护）。
- 删除本地规则实现（`rankIntervalFor`/`compareRankInterval`/`evaluateSubjectRule`/`referenceFor`
  /`referenceYearFor` 等约 150 行），改为调用 `buildMatchResult`。
- 保留视觉与交互：纸感配色、六章结构、回答起点、逐字动画、发布源面板、导出与打印。
- 新增发布版本徽章：两套前端都能一眼看出当前用的是哪一份发布包。

**新增守卫测试**（`apps/web-paper/test/paper-honesty.test.ts`，12 项）

盯的是「悄悄分叉」这一类问题：纸感版必须依赖共享包、不得自带规则实现、不得内嵌数据集、
必须与主前端指向同一发布目录、必须保留不可预测/不给概率的说明、缺失值不得显示为 0。
负向测试确认：往 `data.js` 里加一个本地 `rankIntervalFor` 会让测试失败。

**新增启动报告模块**（`apps/web-paper/src/boot-report.js`）

纸感版是单页脚本应用，没有 React 的错误边界；模块起不来时页面只剩静态文案、数字全空，
看起来像「数据是空的」而不是「程序坏了」。该模块捕获同步错误与未处理的 Promise 拒绝，
并在主模块未完成初始化时明确提示。它在本次并入中立刻发挥作用：把「页面空白且控制台无异常」
变成了可读错误（先 `TRACKS is not defined`，后共享包签名不匹配），两个问题据此定位。

**顺带修复**

- 纸感版 `refYearFor` 存在重复定义（一份接收 track 参数、一份不接收），后者覆盖前者导致
  定位页始终显示「未选科」；已去重，并补 `currentRefYear()` 供按当前状态取参考年。
- 纸感版缺少 `release-badge` 元素与样式，补上。
- 内联诊断脚本会被 Vite 的 html-proxy 转换干扰，改为独立模块。

**验证**

- `npm run validate`：19 个测试文件、253 项通过、0 失败（纸感版新增 12 项）。
- `npm run build:all`：主前端 gzip 91.62 KB，纸感版 gzip 20.17 KB（无 React）。
- 浏览器实测纸感版：载入发布包 SC-2026-e48a598a1832 → 选科 → 600 分 → 位次 22,825–23,461
  （前 8.2%）→ 匹配 20,366 条候选，与主前端一致；控制台无异常。

## 2026-09-11 正式前端：按原设计补齐交互并把假数据换成真数据


以项目内 `南溟.html` 为视觉基准，把此前只落到 CSS、React 未接上的部分补齐，并把原作中与
本项目证据要求冲突的示例数据换成发布包里的真实记录。

**新增交互（`src/chat.tsx` + `src/chat.test.ts`）**

- 谈心页改为对话式：三点打字指示器、逐字打字机（`caret` 光标）、每条回答后自动滚动。
- 提问起点按钮：给不知道怎么开口的学生几个例句，点一下填进输入框再自己改写。
  它**只是措辞帮助**——不携带任何权重、不参与计算；原作用选项的 dims/avoid 权重算「方向适配度 %」，
  本项目禁止由兴趣推断专业适合度（`packages/exploration` 的 `PROMPT_BOUNDARY` 第 2 条）。
- `prefers-reduced-motion` 下不做逐字动画，直接渲染完整文本；测试有守卫断言。

**把假数据换成真数据**

- 定位页：新增 `scorePosition()`，按**参考年**那张分段表把分数换算成位次与百分位。
  修复一处真 bug：初版误用 `rankLookup`（取最新一年），会拿 2026 年的表解释 2025 年的记录，
  导致分数在 2026 表里存在、在 2025 表里不存在时返回了一个有年份错的位次。
- 定位页的区间条改为官方分段表**实际公布的分数范围**，并注明「不是本科线或特控线，不做线差计算」
  ——发布包不含控制线，原作的本科线/特控线是示意值。
- 分数轴：新增 `axisMarks()`，刻度用公布最低分/最高分与本人情景分；滑块范围随之变为 150–691。
- 院校卡：显示工作簿原文的学科门类、专业类、招生数、学费与院校标签（如「原卫生部直属」「基础学科拔尖」）。
- 方向卡：新增 `directionCoverage()`，显示该方向在本次范围内的**真实覆盖**（专业条数、院校数、
  命中专业类），不显示适配度、不按它排序；归类映射标注为项目归类而非官方学科目录。

**修复**

- 起航页此前只有「选择你的选科组合」的文案，代码中**没有任何设置首选科目的界面**，位次与资格
  因此永远无法产生。补上选科与情景分面板。
- 该面板初版用闭包里的 `state` 连续更新，三次点击互相覆盖（只剩最后一门）。改为函数式 `setState`，
  与项目既有写法一致。

**验证**

- `npm run validate`：16 个测试文件、210 项通过、0 失败（新增 15 项）。
- `npm run web:build`：主脚本 gzip 86.24 KB，仍低于 300 KB 级预算。
- 浏览器实测：选科 → 600 分 → 位次 23,461 / 前 8.2% → 匹配 20,366 条候选 → 方向覆盖 5,242 / 4,462 / 3,240 条
  → 航线图与导出。控制台无异常。

## 2026-09-11 TASK-07 无AI学生流程

- DeepSeek负责高token实现草稿；主代理否决了不符合React/Vite的第一稿，并在第二稿基础上修正清除、否认保持、提示词展示、无依据地域过滤、跳过、结果失效和撤回数据行为。
- 新增`apps/web`，接通现有exploration、domain和contracts。真实Excel只在本地开发核对视图读取，合成匹配没有包含任何Excel院校或样本ID。
- 8个测试文件99项通过，生产构建通过。无头Edge完成完整路径、390px和打印检查；GATE-LOCAL通过，未发布站点。
- 下一项为TASK-08 AI/API；招生Excel来源与人工核实仍是独立进行中的TASK-03。

本文件按时间保存已发生的实施与验证。当前完成状态和可执行的下一步指示统一见 [PROJECT_STATUS.md](PROJECT_STATUS.md)，不从早期历史条目恢复旧任务。

## 2026-09-11 TASK-03 本地招生数据库与快速匹配

- 把根目录两份只读招生 Excel 清洗进一个可重建的 SQLite 库：51,878 条专业行、2,308 所院校、12,275 个院校专业组、264,971 条历史录取观察（含位次 264,959 条），2026 计划人数合计 422,017。新增 `pipelines/task03/build_admissions_db.py`、`validate_admissions_db.py`、`query_admissions.py`、`test_admissions_db.py` 与 [数据库说明](TASK03_ADMISSIONS_DB.md)。
- 表结构对齐 `DATA_AND_MATCHING_SPEC.md` 的实体：source_document、institution、admission_group、offering、plan_record、requirement、admission_observation、score_distribution、release，另加 data_issue 台账和物化的 match_pool 宽表。事实表用 INTEGER 代理键控制体积（约 117 MB），可读 ID 与证据单元格地址经 `v_observation`、`v_observation_context` 等视图提供。
- 清洗严格执行既有规则：代码保文本与前导零；0 与缺失分开；位次 0 判无效（`rank_is_valid=0`，12 处）；公式不执行、Excel 错误不变成 0；学费保留原值而币种与计费周期保持未知（797 条待定、1215 条免费）；历史观察不带当代科类/批次/录取类型/分数口径，计划行身份只作为显式标记的假定关联；选科要求三值解析，`不限`、`all_of` 与无法识别的 `unknown` 分开，资格 UNKNOWN 不并入 PASS 或 FAIL；空计划类别按普通类处理并标 `admission_type_inferred`。所有无法解析或需推断的值写入 data_issue，逐行重复的源级说明折叠为带计数的单条记录（134,852 → 2,113 行）。
- 匹配入口按考生输入快速筛选：选科三值资格、历史位次闭区间关系、逐年分别比较、资格分区→方向优先→所选排序→稳定 ID 的排序；硬预算仅在显式承认“人民币/学年”假定后才排除。两份工作簿没有一分一段表，因此只给分数时关系一律“无法比较”（`NO_OBSERVED_SCORE`），不制造分数→位次换算。
- 验证：建库重跑两次得到相同文件哈希（确定性）；独立校验脚本重新解析原工作表单元格并与库内逐字段核对，521 项检查通过；新增 31 项 Python 行为测试，与原有 5 项 Excel 解析测试合计 36 项通过；原有 `npm run validate` 14 个测试文件 186 项不受影响。匹配查询本机耗时约 1.9 秒（整表）与 0.3 秒（带索引过滤）。原始输出见 [验证记录](verification/task03-admissions-db-2026-09-11.txt)。
- 本库是离线工作产物而非发布：`publication_status=NOT_PUBLISHED`、`human_review_performed=0`，真实招生发布记录仍为 0；源工作簿制作方与字段准确性仍未独立核实，TASK-03 的人工核实与正式发布仍未完成。库文件是可重跑的构建产物（约 117 MB），不进入 FILE_INDEX、MANIFEST 与源码包。

## 2026-09-11 TASK-03 官方一分一段表接入

- 从四川省教育考试院官方发布页抓取 2026 年物理类、历史类成绩分段统计表全量图片（2 个发布页 + 40 张表图，登记 42 个文件的 SHA-256 与 HTTP 元数据，快照 run `20260911T025944Z`），新增 `fetch_score_distribution.py`、`extract_score_distribution.py`、`validate_score_distribution.py`。抓取为有界抓取：仅两个发布页及其正文表图，不爬站、不使用第三方转载。
- 抽取按词坐标对齐：聚三列（分数/人数/累计），分数列由「按 1 递减游程」识别并优先最左列——低位段人数也连续（如 1..6），只靠连续性会误判；人数与累计按列归属配对而非出现顺序，OCR 漏读一格不会错位。官方未列出的分数表示无人达到，记录为 `unlisted_scores` 而不补 0。OCR 漏读的人数用 `count(s)=cum(s)−cum(s+1)` 补回并记 `count_derived` 与算式（物理 10 处、历史 7 处），抽样对照原图确认（679→14、674→25、231→83、230→85 均与官方图一致）。
- 结果：物理类 534 行（685–150 分）、历史类 512 行（662–151 分）；算术闭合——物理 292,372+54=292,426、历史 177,461+30=177,491，表顶之上人数是官方发布的真实性质而非缺口。写入 `score_distribution` 与 `score_distribution_row`（含 `rank_best`/`rank_worst`、证据图片与像素坐标、图片 SHA-256），核验状态 `VERIFIED`。计分口径记为 `gaokao_cultural` 并标注 `NOT_STATED_ON_PUBLISHED_TABLE`，即用途推定而非原文明示。
- 查询层新增 `--score`/`--score-year`：按规格第 6 节 `locateRank` 输出位次区间并在比较时取区间下界；未列出分数、低于/高于公布范围分别返回 `NO_OBSERVED_SCORE`、`OUT_OF_DISTRIBUTION_COVERAGE`、`ABOVE_PUBLISHED_RANGE`，不插值不外推；考生自报 `--rank` 优先于分数换算。
- 验证：快照 42 个文件重算哈希通过；抽取独立校验 5,379 项通过；数据库独立校验 5,758 项通过（含分段表逐行比对与种群守恒）；Python 测试 50 项通过（新增 12 项）；`npm run validate` 14 个测试文件 186 项不受影响；建库重跑两次文件哈希一致。详见 [一分一段表说明](TASK03_SCORE_DISTRIBUTION.md) 与 [验证记录](verification/task03-admissions-db-2026-09-11.txt)。
- 附带修复：`windows_ocr.ps1` 显式输出 UTF-8，避免中文 Windows 上 GBK 输出使既有按 UTF-8 解码的调用失败。
- 边界：仅 2026 年两类分段表，2025/2024/2023 未抓取，历史位次比较仍直接用工作簿位次；分段表给的是区间不是个人精确名次；工作簿部分仍未独立核实，库整体保持 `NOT_PUBLISHED`。

## 2026-09-11 TASK-11 按负责人决定跳过

- 项目负责人决定跳过 TASK-11 教师协调的小范围试用（约 10—20 人）。记录为「按负责人决定跳过」，**不记为完成**：至今未接触任何真实学生。
- 后果如实保留：GATE-PILOT 未通过且不再处于「待安排」状态；「学生能否说出候选方向」「能否解释一个参考依据」两项观察无证据；「是否出现『系统预测我能被录取』这类误解」未知，因此也不能据此调整文案或扩大范围。不得声称学生已试用。
- TASK-11 的三份材料（教师知情说明、学生端一页说明、观察记录表）未编写。
- 同步工具补充了「已按负责人决定跳过」的摘要行：此前该任务既不属已完成也不属进行中或未开始，会从进度摘要中消失，读者无法得知曾做过决定。现在跳过项在各文档摘要中显式列出。

## 2026-09-11 项目更名为南溟

- 用户决定将项目名由原名（南航）改为**南溟**，以对接其放在项目根目录的前端文件 `南溟.html`。
- 已将受管文本中的项目名统一替换：32 个文件、94 处。替换按“项目名”精确匹配，**排除误匹配**——院校名「四川西南航空职业学院」含「南航」子串，属真实数据，数据库内 69 处、发布包内 68 处均保持原样。
- 前端标题同步更新（`apps/web/index.html` 页面标题为「南溟目标探索」）。
- 历史验证日志中出现的路径文本随本次更名统一更新；命令与结果本身未改动，已在项目进度中说明。
- 两份源工作簿哈希未变；数据库、发布包、分段表数据未受影响（校验见下条）。
- **未一并改动**的两类（属独立决定，需用户确认后另行处理）：① 拉丁标识符（`nanhang-app`、`nanhang-handoff` 目录名、`@nanhang/*` 包名、`Nanhang*` 类型名、`NANHANG_*` 环境变量，共约 2,469 处）；② 冻结合同中的 Schema 标题（`Nanhang ...`），按项目规则改冻结合同需另立 ADR。

## 2026-09-11 TASK-03 数据核实、多年份分段表与发布导出

- **一分一段表扩展到 2023—2026 共 7 张**。新增 2025 物理/历史、2024 理科/文科、2023 理科五个发布页的抓取（各自独立快照运行，登记 SHA-256）。抽取升级为多尺度（1x/2x/3x，超上限的尺度跳过）交叉核对，并加入两类可追溯的自动恢复：由累计差补回漏读人数、按「丢字」关系与闭包算术恢复误读的分数与计数。七个表全部算术闭合、0 条待人工核对。三处 OCR 完全读不出的单元格按官方原图直接读取，记录在 `verified_score_rows.py`（含定位说明），并与算术校验互相印证。
- **两种科类口径显式分离**。2025 起为物理类/历史类（3+1+2），2024 及以前为理科/文科（文理分科）。库、发布包与查询层都用 `curriculum_system` 与 `DISTRIBUTION_TRACK_BY_YEAR` 标明，避免把理科表当物理类表读。查询层因此可用于历史年份的分数→位次换算（`--score-year`）。
- **工作簿位次交叉复核**。新增 `crosscheck_workbook_ranks.py`：对每条历史记录检验其位次是否落在官方分段表区间内。结果 237,818 条中 237,635 条落在区间内、**0 条越界**，其余 183 条高于官方公布最高分（官方合并为「某分及以上」）。这是独立于人工确认的第二条证据。
- **核实记录**。新增 `record_verification.py` 与 `data/task03/human-verification.json`，记录核实方、日期与机器复核结果，并把工作簿样本、历史样本逐条标记为 `VERIFIED`。该脚本**不改动** `publication_status`：核实与发布是两个独立决定。
- **发布导出器**。新增 `export_release.py`：SQLite → 不可变分片数据包（manifest + index + 按招生类型切分的专业分片 + 分段表 + 证据索引 + current 指针）。发布目录一次写入，内容不同时重跑会失败而非覆盖。54,878 条专业导出为 90 个分片、74 条覆盖声明，约 60 MB。历史记录用紧凑元组形式，字段序在分片头声明一次。
- **真实数据接入网页**。新增 `apps/web/src/release-loader.ts` 读取发布包并转换成分匹配输入；`vite.config.ts` 开发期只读提供 `data/releases`（路径规范化后校验，不能越出）；页面横幅显示当前数据来源与版本，载入失败退回合成数据并说明原因。匹配的参考年取「同时有分段表与历史记录」的最近年份，避免计划年（2026，无录取历史）导致全表无法比较。
- **验证**：分段表抽取独立校验 19,178 项通过；数据库独立校验 19,230 项通过；快照重算哈希通过（141 个文件）；Python 管线测试 50 项通过；`npm run validate` 15 个测试文件 189 项通过（新增 3 项发布包集成测试，直接读取磁盘上的导出产物）；发布包 `--check` 93 个文件 SHA-256 全部一致。
- **清理**：移除 231 个 OCR 放大中间图（290 MB → 8.8 MB），OCR 结果缓存保留；抽取脚本改为先查缓存再生成放大图，重跑不再重建大图。
- **边界未变**：位次是官方分段区间不是个人名次；历史年份科类定义未逐行给出，跨年比较不自动等同；不输出录取概率或「冲稳保」；工作簿仍为用户提供，本记录只确认其内容已核对，不声称官方发布了工作簿。未完成：O-03 真实学生成绩工作簿、O-04 真实模型费用核算。

## 2026-09-11 TASK-09 页面视觉与交互检查

- 在 1440/390/320 三档视口、且每个面板都有内容的状态下检查：横向溢出 0、文字裁切 0、未标注控件 0、无作用域表头 0。
- 修正 6 项：按钮与航线图节点白字对比度 3.56:1 提到 5.18:1（新增 `--accent-strong`，亮橙 `--accent` 仅保留给大号装饰数字）；顶部导航、专业卡外链与折叠标题点击高度 21px 提到 32px；科目选择标签点击区提到 70×32；7 个问题输入框补 `aria-label`；6 个表头补 `scope="col"`。
- 复核后判定 3 类不是缺陷并保留：航线图深色面板文字实际为 6.6:1 与 11.32:1（检查脚本未合成半透明叠层）、大号序号按大字号下限 3:1 达标、窄屏单列堆叠未裁切。
- 新增 `apps/web/test/presentation.test.ts` 8 项不变量，把对比度下限、点击高度、标签与打印规则固定，防止改配色时静默回退。
- 只改表现层，未动数据合同与业务规则。截图与明细见 [TASK-09 记录](TASK09_VISUAL_CHECK.md)。

## 2026-09-11 TASK-10 本地阶段验收

- 按 TASK-03 至 TASK-09 的可运行版本做阶段验收：14 个测试文件 186 项通过；Excel 5 项解析测试通过、964 个原始单元格一致、两份工作簿哈希未变；交接结构检查与工作区一致性检查通过。
- 9 类关键错误全部为 0：组线当专业线、校考产生省位次、未核实数据发布、重复计费、客户端覆盖 system/模型、脚本执行与录取概率断言、故障回退内存扣费、旧运行污染、个人信息进入公开数据。
- 列出 7 项未闭环问题：O-01 工作簿权威性未核实、O-02 人工核实为 0、O-03 真实成绩工作簿未验证、O-04 无真实模型费用核算（四项阻塞 GATE-PILOT）；O-05 内存状态存储、O-06 成绩接口无发放路径、O-07 320px 仅验证溢出（三项已知边界）。
- 明确否定五类过度表述：不称真实数据已核实、不称 AI 已接入、不称已部署、不称已过生产安全终审、不称学生已试用。详见 [阶段验收记录](TASK10_STAGE_ACCEPTANCE.md)。
- 下一项 TASK-11 处于阻塞：需先完成 TASK-03 人工核实，再安排教师协调与 10—20 人知情试用。

## 2026-09-11 TASK-08 可关闭的AI中转层

- 新增 `packages/ai-gateway`（纯TypeScript，可被未来SCF/Express宿主复用）与 `apps/api`（Node HTTP适配层，仅本机）。上游为本地假上游，无网络、无密钥、无付费模型；状态存储为 `MemoryStateStore`，生产档据此拒绝启用AI，避免多实例按内存各自扣费。
- 幂等键为(session_id, run_id, task_type, request_id)：先校验输入，再原子占用额度；同键同负载返回既有结果且不再调用上游，同键不同负载返回409。额度、并发1、输入≤4000字符、上下文≤20条、首字节30秒、整体90秒、心跳15秒均可配置。
- SSE固定为start/delta/complete/error并带request_id与seq；心跳为注释行。安全扫描在流式阶段即生效：模型文本若含标记、链接或录取概率/冲刺稳妥表述，该增量不会下发，客户端收到显式降级文本而不是原始输出。
- 客户端不能决定system、模型或上游地址：相关字段与system/developer/tool角色一律拒绝并返回CLIENT_CONTROL_REJECTED。模型输出另经结构校验，建议必须引用已登记证据ID，且不得设置eligibility/rank/release等受保护字段。
- 会话凭证只存哈希；`GET /v1/me/academic-profile` 按设计返回403——目前不存在任何可发放的成绩访问凭证（北辰门禁只授予谈心访问）。
- 网页新增可选AI面板，默认关闭且启用本身不发请求；显示前对尖括号做替换，修改输入后旧回复与匹配结果一样可见失效。
- 验收：13个测试文件178项通过（TASK-08新增56项）；本机真实HTTP覆盖7类上游场景，确认无脚本/链接/概率泄漏；Edge无头浏览器走通默认关闭、启用、兑换、SSE显示、失效标记、390px与打印检查，控制台异常0。详见 [AI网关验收日志](verification/task08-ai-gateway-2026-09-11.txt)。
- 未接真实模型、未使用生产密钥、未部署、未开放任何成绩接口；A40—A48现有可执行断言，但仍是本地合成范围，不构成生产安全终审。下一项为TASK-09页面视觉与交互检查。


## 2026-09-11 最终验收补充

DeepSeek以只读方式提供设计草稿及静态审查，主代理负责集成、修正和实际验收。此前修正了摘要/行动入口可绕过证据校验、专业卡发布日期登记遗漏，并明确学费币种和周期未知、不可直接作预算比较。TASK-07整合后最终99项工程测试、5项解析测试及964个原始单元格独立核对通过；原工作簿哈希未变。日志文件沿用2026-09-10工作包命名，当前验收日期为2026-09-11。

## 2026-09-10｜Excel主管线与TASK-06最小内容

- 用户把项目目录更名（原始名称记录为“南航”），原文件不变，明确招生主输入改为Excel。新增独立Excel主管线，不覆盖历史OCR样本和源文件。2026-09-11 项目名统一为南溟，见下方记录。
- 只读扫描物理34,686行、历史17,192行，生成36条带字段单元格证据的非发布样本；区分年份/组专业粒度/空值/0/代码字符串，公式和未知口径不升级事实。
- DeepSeek子代理经配置的CommandCode CLI给出只读审查与TASK-06草案；首次被用量限制中断后重试成功。主代理完成落盘、修正空证据与教师意见确认漏洞、冲突测试预期、互斥条件边界和行动优先级。没有声称只读代理修改了文件。
- 新增packages/exploration：7条问题、3张自拟体验卡、3张有来源专业事实卡、不可变证据注册、学生确认/否认/重答、约束与矛盾、1—2项行动和提示词模板。
- 三张专业事实卡来源为北科计算机/机械及南开国经贸官方页面，保留网页快照、日期和哈希；事实范围仅是该校介绍，不是全省招生依据。
- npm run validate：7文件92项通过；Python Excel解析5项通过；36条样本964个原始单元格证据独立校验通过。来源、人工核实与发布仍分别标记，真实发布保持0。
- 各文档当前要求统一为Excel优先，源图/PDF/OCR方法标为历史或可选补证。整理前状态已备份到archives/workspace-before-excel-task06-2026-09-10.zip。
- 下一最小任务为TASK-07无AI学生网页与GATE-LOCAL验收；TASK-03真实来源核实单独继续。

## 2026-09-10｜TASK-03 最小官方来源取得与提取链路完成，人工核实待续

- 从既有 7 条来源登记出发，于 `2026-09-10T09:42:33Z` 重新访问省教育考试院计划入口、物理/历分段表和川农招生网；保存 5 个入口 HTML 及 5 张代表图片，记录 HTTP 元数据、取得时间、字节数和 SHA-256。
- 新增 `pipelines/task03/fetch_official_samples.py`，`--fetch` 每次新建时间戳目录以保留历史，`--verify-local` 独立复核本地快照哈希；本次 10/10 文件一致。
- 对5张图片实际运行本地 `Windows.Media.Ocr.OcrEngine` 简体中文 OCR，保留 5 份含行/词/像素坐标的原始 JSON。密集三栏计划页出现串栏和字符误识；分段表可按 y 坐标还原行，但物理 679 分的本段人数漏识。
- 对项目根目录的物理/历工作簿进行只读 XLSX XML 文字层提取，记录两个文件哈希与行范围；工作簿明确标为“用户提供的二级输入”，不当官方原文。
- 生成 17 条结构化样本：7 条计划、6 条分段、4 条川农 2025 历史录取；分开 `group_admission_min` 与 `major_admission_min`，未取得的 `group_filing_min` 列为缺口。未说明的批次、招生类型和分数口径保持 `null`。
- 新增覆盖表、问题清单、逐条核对台账、字段映射和 TASK-03 验证报告。17 条均为 `VALIDATED_NOT_VERIFIED`、`human_review_status=PENDING`，真实招生发布记录仍为 0，不将模型阅图或自动检查写成人工验收。
- `validate_task03_samples.py` 通过 11 组哈希与独立语义检查；新增 6 项 Vitest 回归。Node 24.19.0 / npm 11.19.0 下 `npm run validate`：5 个文件、79 项通过、0 失败。
- TASK-03 仍为进行中。下一最小任务是由人工按17个定位逐条对照并签字，处理 679 分漏识，并补官方组投档最低来源或确认不可得。

## 2026-09-10｜TASK-05 固定 accuracy-v1.2 单人摘要适配完成

- 按固定提交 `6f70eab4e6e9ecadc00149b1387103b45b5d8e2b` 拉取并读取 `app/lib/types.ts`、`parser.ts`、`score-validation.ts`、`class-config.ts`、`metrics.ts` 和 `scripts/verify-accuracy.ts`；固定提交及 6 个 Git blob 均与既有证据登记一致，未使用 main 替代。
- 在 `packages/school-adapter/src/index.ts` 增加真实源字段类型和 `adaptAccuracyV12SelectedStudent` 单人入口。入口只接收调用方已选定的一条 StudentScore；姓名、学校和班号不进入摘要，也不用于跨班/跨考合并。
- 映射源考试标签、选科组合、源总分、逐科状态、城市/学校名次和源行位置。源对象没有日期、稳定 ID、逐科满分或原分/赋分元数据时保留 `null/unknown/local` 与警告；来源质量置信度不进入录取概率。
- 缺失或异常源总分保持 `null`，不从科目重建；标为 reconstructed 的数值被抑制。完全重复仅在源解析指纹一致且 resolution 为 rank-only 时折叠并保留全部源行；excluded 冲突直接拒绝，不采用最后一条。
- 新增真实源字段结构的合成/脱敏 fixture 与 10 项回归，覆盖 0 分、缺考、缺总分、重复/冲突、同名跨班、未知日期/口径、缺稳定 ID 和伪造认证声明。适配器返回前执行冻结 Schema 和独立语义校验，测试再次从合同包独立验证。
- 新增 `docs/ACCURACY_V1_2_FIELD_MAPPING.md`，记录固定来源、Git blob、完整字段表、未知值和冲突处理。
- Node 24.19.0 / npm 11.19.0 下最终 `npm run validate`：4 个测试文件、73 项通过、0 失败。没有真实工作簿，本次不声称真实数据验收完成；真实学生数据、生产身份和认证仍不存在。

## 2026-09-10｜全目录复核与文档同步

- 以当前代码和本次测试重新核对：TASK-01、02、04 完成，TASK-05 进行中，TASK-03 和 TASK-06—14 未开始；四个阶段门禁均未通过。
- 使用 Node 24.19.0 / npm 11.19.0 复跑 npm run validate：4 个测试文件、63 项通过、0 失败；使用隔离 Python 环境复跑交接合同检查通过。
- 新建 PROJECT_STATUS.md 和 project-status.json，统一各文档进度摘要；修正交接首页、任务表、交付提示和验证记录中仍要求重做 TASK-01/02/04 的旧指示。
- 为根目录增加总入口、逐文件索引和同步/校验脚本。保留工程与交接主本的目录，docs/baseline 改为自动同步的完整参考副本；原始基线已存入整理前备份。
- 原根目录压缩包归档，重新生成当前工程源码包与 SHA-256。记录整理前原 manifest 有 1 项失配，重新生成当前文件清单；不把历史清单说成全部通过。
- 合同与 fixtures 保持不变，工程/交接共 11 份副本一致。业务源码未作功能改动；交接验证工具仅修正文案，避免误称整个工作区没有业务实现。
- 下一项实施任务：固定 accuracy-v1.2 单人真实字段映射与冲突输入测试。细节见项目进度；本轮仅完成整理，不提前实施 TASK-05 后续功能。

## 2026-09-10｜历史：TASK-04 完成

- 新增 packages/domain/src/matching.ts 中的纯 TypeScript buildMatchResult，显式接收目标情景、规则版本、锁定发布、覆盖、分段表、证据、选科、候选及已确认偏好。
- 组合位次、资格三值、历史闭区间关系、发布状态、硬偏好与稳定排序；领域模块不读取 DOM、网络、当前时间或 LLM。
- 仅接受当前发布与范围内的 PUBLISHED 事实；撤回发布输出 DATASET_WITHDRAWN 空结果；证据按主体及指标粒度核对。
- 组参考与专业参考分别处理，缺专业历史不复制组线；未知学费保持 UNKNOWN；硬条件空结果不自动放宽。
- 新增 9 项 MatchResult 组合测试，代表结果经结构与语义校验。
- 当时验证记录：实现前 54 项，实施中 62 项，补未发布历史与防御性复制后最终 63 项通过；11 份 contracts/fixtures 副本一致。
- 当时源码 ZIP 未更新，此历史问题已在本次目录整理中解决。

## 2026-09-10｜历史：TASK-01/02 完成，TASK-04/05 首批实现

- 原记录集成负责人为 Sol。建立独立 npm workspaces、TypeScript project references、依赖锁、版本文件和实施记录。
- 四份冻结 Schema 原样复制，自动生成类型，结构与语义分别验证；领域包保持纯函数。
- 实现位次、资格、历史比较、数据状态、偏好、排序函数；TASK-05 提供单人摘要和转换警告初版。
- 当时 npm run validate 为 3 个测试文件、54 项全部通过；该数字仅代表早期版本，已被后续 63 项结果取代。
- 原记录称实施前交接清单 22/22 一致；本次整理时的实际清单为 23 项且其中 1 项失配，两个记录对象/时点不同。
- 原建议“组合 TASK-04”已经完成，不再执行；TASK-05 真实字段映射仍待完成。

## 固定设计决策与范围

设计基线为 2026-09-09 / 1.0.0，规则 nh-rules-1.0.0；北辰固定 SHA 为 f02c70b5cfeb19592985e8d3c949eae624e7e898，质量慧析 accuracy-v1.2 为 6f70eab4e6e9ecadc00149b1387103b45b5d8e2b。没有新增核心规则或身份设计变更。

现有记录未报告远程推送、真实学生数据接入、正式招生发布、生产密钥、付费 AI 或部署。本地工作区没有 .git 元数据，后续交付以文件、验证记录和哈希说明实际版本。
