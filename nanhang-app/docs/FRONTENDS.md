# 两套前端：目的、差异与如何切换

<!-- PROJECT-STATUS:START -->
> 统一进度（2026-09-20，2026-09-20-unified-ui-polish-84）：主前端六章体验统一已完成：触屏潮汐、连续抽屉、紧凑清单与定位、北辰式设置；54 文件 592 项测试与23项合成 DOM 断言通过；本轮待 PR 审阅与负责人视觉验收，未合并部署；已有数据发布与云端开关状态沿用上一轮。
> 已完成：TASK-01、TASK-02、TASK-03、TASK-04、TASK-05、TASK-06、TASK-07、TASK-08、TASK-09、TASK-10；进行中：TASK-13、TASK-14；未开始：TASK-12。
> 已跳过：TASK-11（项目负责人（用户）决定）；相应门禁未通过，不得按已完成或待办处理。
> 本次验证：54 个测试文件、592 项通过、0 失败；真实招生发布记录为 51878；已通过：GATE-LOCAL。
> 下一步：审阅 codex/frontend-polish 并由负责人验收桌面/手机画框、抽屉、清单、定位和设置；当前未合并部署。后续若招生库或官方学费目录继续更新，应先重建/验证南航规范化招生库，再运行 pipelines/task03/merge_admissions_databases.py 重新生成统一库，不能只替换其中一侧。118 个 institution 实体行仍没有可直接入库的官方明确 CNY/学年金额，继续保持未知；同时按全项目审阅修 P1 与状态生命周期，TASK-13/14 身份与运维收尾不变。完整进度及操作见[项目进度](PROJECT_STATUS.md)。历史验证记录不代表当前状态。
<!-- PROJECT-STATUS:END -->

## 2026-09-20 主前端体验统一

当前 `App/chapters` 六章保留纸色、海绿、铜线与宋体；起航画框使用触屏也能呈现的潮汐和光感，抽屉生命周期与曲线在起航/分数轴/航线图统一，清单桌面三项并排、手机收紧；定位强调读数分层，设置参考北辰窄面板与行内状态。`motion.ts` 统一系统与会话动效偏好，解决此前前端专项报告中的「JS 动效开关不生效」问题；该报告其他问题不据此宣称解决。

本次验证：web typecheck、54 文件 592 项测试、Vite build、23 项合成 DOM 断言通过。分支 `codex/frontend-polish` 待审阅，未合并部署，视觉验收由负责人执行。详见 [体验统一说明](UI_POLISH_2026-09-20.md)。


## 2026-09-20 本地调试模式跑法（本轮实测）

想把主前端拉起来边改边看时，用两个进程：

```powershell
cd C:\Users\yusheng\Desktop\南航\nanhang-app
npm run api:start                 # 本地 AI 中转 127.0.0.1:8790（日志里 upstream 应为 fake-local 或 qianfan）
cd apps\web
..\..\node_modules\.bin\vite --host 127.0.0.1 --port 5173   # 显式绑 IPv4：本机默认只监听 ::1，用 127.0.0.1 连不上
```

- 调试模式跟着 dev server 走（`DEBUG_MODE = import.meta.env.DEV`）：右上角角标「调试模式 · 示例数据」、谈心室预填演示访问码 `local-trial-code`、模型没给结构化建议时注入两条「（调试示例）」建议。
- **门禁不旁路**：调试模式不会解锁任何章节，仍要从「起航」选科、选登船口一步步走（负责人 2026-09-13 的既定要求）。
- AI 中转地址由 `apps/web/.env.local` 决定（git 忽略），**当前指向云端函数（真模型）**：
  - 云端档：谈心室要填 TOTP 动态码，调试模式预填的 `local-trial-code` 会被拒。取当前码：
    ```powershell
    $env:NANHANG_TOTP_SECRET=(Get-Content C:\Users\yusheng\Desktop\南航\private\nanming-totp-secret.txt -Raw).Trim()
    node nanhang-app\scripts\totp_code.mjs
    ```
    码每 30 秒一个窗口、一码一用；取码时**留 20 秒以上**，否则填完表点「连接」可能跨窗口失败（401）。
  - 本地档（把 `.env.local` 指回 `http://127.0.0.1:8790` 并重启）：演示码直接可用、不花云端额度，但上游是假上游——**不返回 `options`，「引航」的可点答案不会出现**，也不会有 AI 建议。
  - 换过 `.env.local` 必须重启 dev server：`VITE_*` 是构建期内联的，热更新带不动它。
- 浏览器用 `http://localhost:5173/` 或 `http://127.0.0.1:5173/` 都可以；命令行自查请用后者。
- 2026-09-20 的逐页点检证据与两处修复（登船口第一次点没反应、分数轴刻度重复 key）见[实施记录](IMPLEMENTATION_LOG.md) 的 `frontend-dev-debug-run-1` 条目；云端真模型的实测证据见同文件的 `cloud-ai-local-dev-1` 条目；谈心页四处 UI 修复见 `talk-ui-fixes-1` 条目。

### 浮动卡片（登船 / 设置 / 方向小结）的两条硬规矩

2026-09-20 修过一次「方向小结缩在底部、看不见」：根因是卡片自己挂着位移动画
（桌面 `translateY(26px)`、≤560px `translateY(60px)`），动画期间整张卡被推到视口下方
（390×844 实测底部溢出正好 60px）。现在的规矩是：

1. **卡片只淡入，不做位移**（`@keyframes card-fade` 只有 opacity），位置交给背板：
   桌面 flex 居中、≤560px `align-items:flex-end` 贴底。任何 `transform` 都会把偏移带回来。
2. **滚动由卡片自己承担**（`overflow:auto` + `overscroll-behavior:contain`），背板不滚。
   守卫测试 `apps/web/test/overlay-geometry.test.ts` 钉住这两条。

### 谈心室的两处细节（同样是负责人指出的）

- 输入框**不带拖拽改高的手柄**（`.dock-row textarea.inp{resize:none}`）：浏览器把 resize 手柄画在
  右下角，看起来像两条斜杠；高度区间已由 CSS 给足（46–120px）。
- 等待时的低语是**真实进度**：`whisperLine(seconds, tier)` 按真实秒数推进并显示「已等 N 秒」，不是三句循环。
- **模型思考是实时显示的**（2026-09-20 负责人指示：「就要让学生看到思考过程」）：待回答的气泡里有一个
  `.thinking` 节点，思考增量由 App 收到 `reasoning` 帧后直接写 DOM（不走 React state——一帧一次 setState
  会把对话树重渲染几十次）。这条取代了原先「思考属草稿、不下发学生端」的边界；
  安全处理（标记/链接仍拦、概率词只停显示不作废整轮、1200 字上限）见
  [AI 接入](AI_QIANFAN_SETUP.md)「模型思考实时下发给学生」。
  本机想直接看这段效果：`$env:NANHANG_FAKE_SCENARIO="reasoning"; npm run api:start`。
- 连上之后对话框里**不再挂状态行**（原来写「已获得本地试用会话。」）：连接状态由对话头部的
  「已连接」表示，失败与过期提示仍走未连接分支的 `.fhint`。

## 2026-09-20 手机端怎么在电脑上调试（本轮实测）

三条路，按「要不要真机」选。前两条不改任何代码就能用。

**一、电脑上开一个真机尺寸的窗口（推荐先试这个）**

```powershell
cd C:\Users\yusheng\Desktop\南航\nanhang-app
npm run web:mobile                 # 默认 390×844 / DPR 3 / 触摸仿真

# 换机型：用环境变量（`npm run` 转发 `--width=` 在部分 npm 版本上会被吞掉，实测踩过）
$env:NANHANG_MOBILE_WIDTH="320"; $env:NANHANG_MOBILE_HEIGHT="640"; $env:NANHANG_MOBILE_DPR="2"
npm run web:mobile
Remove-Item Env:NANHANG_MOBILE_WIDTH, Env:NANHANG_MOBILE_HEIGHT, Env:NANHANG_MOBILE_DPR
```

它先用 `--remote-debugging-port` 起一个**独立配置目录**的 Chrome/Edge（不碰你正在用的浏览器），再用 CDP 把视口钉到设备尺寸并打开触摸仿真——页面上 `@media(pointer:coarse)` 与 `:hover` 是两条不同分支，只有真开触摸才算手机表现。窗口里按 F12 就是完整 DevTools，`Ctrl+Shift+M` 可随时换机型。关掉窗口即结束，配置目录在系统临时目录里。

**二、你已经在用的浏览器里开设备模式**

`F12` → `Ctrl+Shift+M`（设备工具栏）→ 选 iPhone 14 / Pixel 7 等机型。优点是不用另开窗口；缺点是触摸仿真要手动勾，且切成长屏机型时窗口高度可能不够。

**三、真机（同一局域网内的手机）**

Vite 本身允许局域网访问（`server.host` 未固定），但本机 API 只放行 `http://localhost:5173` 与 `http://127.0.0.1:5173` 两种来源（`apps/api/src/server.ts` 的 `LOCAL_ORIGINS`，是刻意写死的：手机上的成绩接口不该对整张局域网敞开）。所以真机分两种接法：

```powershell
# A) 只看界面、不用 AI 与学校接入
cd nanhang-app
npm run web:dev:lan                # 监听 0.0.0.0，手机访问 http://<电脑局域网 IP>:5173/
# 本机测试时的 WLAN 地址是 192.168.1.4（用 ipconfig 自己确认一次）

# B) 连 AI / 学校接入一起用（临时把手机来源加进白名单，用完把那个窗口关掉即可）
$env:NANHANG_CORS_ORIGINS="http://192.168.1.4:5173"; npm run api:start
```

`NANHANG_CORS_ORIGINS` 只在这个进程里生效，不改仓库、不写进任何文件；**不要**把它写成永久配置——它等于让同网段的任何人调用本机成绩接口。

**本轮实测（设备仿真，不是真机）**：390×844 与 320×640 两档各走完「起航 → 定位 → 谈心 → 方向 → 分数轴 → 航线图」，六个页面都**没有横向滚动**，底部六站都能点亮跳转，控制台 0 异常。320px 那一档顺带暴露出一个真问题（底部导航越界 22px），已修，见下面「窄屏越界」一节。

**已知仍然偏小的点击目标**：起航页顶栏那枚「北辰」彩蛋按钮实测 17×17px（`<320px` 的拇指区偏小）。它属于彩蛋入口、不是主流程，本轮只记录不擅自改版式；要改的话建议单独一轮，连带把其它 `.pole-star` 之类的小图标一起过一遍。

### 窄屏越界（320px）：底部六站曾经按不到

`.bottom-nav button` 基准最小宽度 56px × 6 站 = 336px，加容器左右各 6px = 342px，比 320px 视口宽 22px（导航条 `scrollWidth=342 / clientWidth=320`），最后一站「航线图」落在视口外。修法只动 `@media(max-width:340px)` 一档：按钮最小宽度 48px、容器内边距 4px，六站合计 296px；390px 及以上一个像素没变。守卫测试 `apps/web/test/bottom-nav-narrow.test.ts` 把「320px 装得下」钉成算式。

## 2026-09-13 前端专项代码审阅

当前主入口为 App/chapters，旧 JourneyApp 和 web-paper 的功能不能算作主入口能力。新增[前端专项报告](FRONTEND_CODE_REVIEW_2026-09-13.md)，列出32项静态发现与10项完善建议。学校/手填来源混用、AI收尾/清除、隐藏弹层、完整列表与导出限制、JS动效开关及无AI路径均待修复；本轮只读代码，没有页面操作、测试或视觉验收。


本项目有**两套并列的学生端界面**，共用同一份发布数据与同一套匹配规则。做两套不是重复建设，
而是把「界面怎么呈现」与「数据怎么判定」分开：判定只有一份，呈现可以先有两条路线，
由负责人比较后再决定保留哪一条。

## 一览

| | 主前端 `apps/web` | 纸感版（备用）`apps/web-paper` |
|---|---|---|
| 技术 | React 18 + Vite + TypeScript | 原生 ES 模块 + Vite（无框架） |
| 视觉 | 浅纸色 / 深海绿 / 衬线标题，五步顺序旅程（ADR-003） | 纸感米白 / 深林绿 / 编辑式排版，同一套六章结构 |
| 入口 | `npm run web:dev` → 5173 | `npm run paper:dev` → 5174 |
| 构建 | `npm run web:build` | `npm run paper:build`（或 `npm run build:all`） |
| 产物 | 主脚本 gzip ≈ 63.12 KB，另有 19.54 KB Worker | 脚本 gzip ≈ 20 KB（无 React） |
| 数据来源 | `data/releases`（只读） | **同一份** `data/releases`（只读） |
| 规则来源 | `@nanhang/domain` | **同一份** `@nanhang/domain` |
| 学校成绩入口 | 走服务端 `POST /v1/school/identify`（姓名＋6 位码 → 只回本人分片）；云端只存密文 | 未接入 |
| 测试 | 新主流程另有模型/分路断言与浏览器验收，详见 VALIDATION_RESULT.md | 1 个文件（12 项诚实性守卫） |

## 为什么要抽共享包

这次把三处从前端里抽成了工作区包，目的只有一个：**判定不能有两份实现**。

- `packages/release-loader` — 发布包线格式。加载 pointer/manifest/index/distributions/comparability，
  把分片转成候选与历史记录，并派生位次（`scorePosition`）、分数轴刻度（`axisMarks`）、
  方向覆盖（`directionCoverage`）、参考年（`referenceYearFor`）。
- `packages/match-input` — 从发布包构建匹配输入：加载哪些分片、用哪一年做参考、
  组线与专业线各取哪个指标、可选批次清单。
- `packages/domain` — 匹配规则本体（原本就是共享包）：资格三值、参考关系、可比性、排序。

如果这些判断在两套前端里各写一遍，迟早有一套会悄悄给出错误结论——比如拿 2026 年的分段表
去解释 2025 年的记录。抽包之后，两条路线对同一份数据必然给出同样的解读。`apps/web-paper/test`
里有守卫断言，一旦有人在纸感版里重新实现这些规则，测试就会失败。

## 纸感版是怎么来的

纸感版的前身是一个单文件离线演示：HTML 里内嵌了 1.81 MB 的数据切片，匹配规则也在页面里
重写了一遍。并入项目时做了三件事：

1. **丢掉内嵌数据**（1.81 MB → 0），改为运行期读取与主前端相同的发布包；
2. **删掉本地规则实现**，改为调用共享包（`buildMatchResult`）；
3. **保留视觉与交互**：纸感配色、六章结构、回答起点、逐字动画、导出与打印。

纸感版是备用方案，因此它比主前端**少**一些东西，这是有意的：它没有 AI 面板、没有荣县一中
增强模式、没有单科提分计划。它保留的是「看数据、看方向、看位置关系」这条主线。

## 两套前端共同遵守的边界

无论用哪一套，以下判断不由界面决定，两套都一致：

- 不预测录取、不给概率、不提供「冲稳保」；「暂无比较依据」不等于「不好考」。
- 控制线（本科线/特控线）不在发布包里，因此两套都不画、也不算线差；
  分数轴上标的是官方分段表**实际公布**的分数范围。
- 位次一律取匹配所用**参考年**那张分段表；分数不在公布范围时保持未知，不插值不外推。
- 方向不参与机器排序：发布包里的专业没有方向标签，两套都不伪装适配度。
- 缺失值显示「未知」，不显示 0；0 与未知始终不同。

## 纸感版特有的诚实性设计

纸感版是单页脚本应用，没有 React 的错误边界。如果模块起不来，页面会剩下静态文案，
数字全空——看起来像「数据是空的」，而不是「程序坏了」。因此它自带一个启动报告模块
（`src/boot-report.js`）：

- 捕获同步错误与未处理的 Promise 拒绝，在页面底部显示红色提示条（`role="alert"`）；
- 主模块 4 秒内没有把 `window.__paperBooted` 置为 `done`，就明确写出「主模块未执行完成」。

并入过程中这条机制立刻发挥了作用：它把「页面一片空白但控制台无异常」变成了
一行可读的错误（先是 `TRACKS is not defined`，随后是共享包签名不匹配），
两个问题都是这样定位的。

## 常用命令

```powershell
cd nanhang-app
npm run web:dev        # 主前端  http://localhost:5173
npm run paper:dev      # 纸感版  http://localhost:5174
npm run web:build      # 只构建主前端
npm run paper:build    # 只构建纸感版
npm run build:all      # 两套都构建
npm run validate       # 生成类型 + 两套类型检查 + 全部测试
```

两套前端都在 `npm run validate` 的类型检查与测试范围内，改任何一套都会一起被检查。

## 还没决定的事

- 最终保留哪一套（或两套并行）由负责人决定，本文件不预设结论。
- 两套的**文案与信息密度**目前不同：主前端更完整（含增强模式与 AI），纸感版更克制。
  若决定以纸感版为主，需要把主前端里已经完成的能力（如 AI 面板、学校增强模式）
  按同样方式接过来；反之则需要把纸感版的排版语言并入主前端。
- 部署方式尚未确定：若两套共存，需要一个入口页或反向代理决定访问哪一套。
