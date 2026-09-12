// 推荐卡的分层标签：来源与边界的守卫。
//
// 负责人 2026-09-12 要求：把「哪些是冲刺、哪些是保底、哪些是本科、哪些是职业院校」直接做进
// 推荐院校卡片，而不是在页面底部另写一段「保底路线」说明。项目边界（FRONTENDS.md）不提供
// 「冲稳保」预测，所以卡片上的分层用的是**发布包里的历史位置关系**（需更好位置 / 同分或边界重叠
// / 历史位置较有余量），办学层次则取发布包的 level（本科 / 职业本科 / 专科）。这些断言钉住：
// ① 底部那段说明不再回来；② 两张卡的标签来自同一套定义；③ 位次不再写成「247189–247189」。
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildRoutePoster, formatRankInterval, groupRouteRows, levelLabel, pickGroupedCards,
  scoreRangeForRanks,
} from "../src/chapters/shared.js";
import type { LoadedRelease } from "@nanhang/release-loader";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
const chapterDir = resolve(import.meta.dirname, "../src/chapters");
const app = [
  src("App.tsx"),
  ...readdirSync(chapterDir).filter((name) => /\.tsx?$/.test(name))
    .sort().map((name) => readFileSync(resolve(chapterDir, name), "utf8")),
].join("\n");
const chart = src("chapters/chart.tsx");
const axis = src("chapters/axis.tsx");
const shared = src("chapters/shared.ts");
const css = src("style.css");

describe("推荐卡：分层标签", () => {
  it("页底的「保底路线」说明段与它的卡片样式不再回来", () => {
    expect(app).not.toContain("保底路线");
    expect(app).not.toContain("srow");
    expect(app).not.toContain("safety");
  });

  it("航线图与分数轴的推荐卡用同一套标签（位置关系 + 办学层次 + 资格）", () => {
    for (const page of [chart, axis]) {
      expect(page).toContain("sc-rel");
      expect(page).toContain("RELATION_CLASSES.find");
      expect(page).toContain("levelLabel(");
      expect(page).toContain("formatRankInterval(");
      // 顶角徽章 + 底部「资格」格子各写一遍「符合已检查条件」的旧排法不再出现。
      expect(page).not.toContain('className="rbadge');
    }
  });

  it("办学层次取发布包的 level：专科写成「高职（专科）」，其余原样", () => {
    expect(levelLabel("专科")).toBe("高职（专科）");
    expect(levelLabel("本科")).toBe("本科");
    expect(levelLabel("职业本科")).toBe("职业本科");
  });

  it("位次相等时只写一个数并加千分位，不等时写成区间", () => {
    expect(formatRankInterval([247189, 247189])).toBe("247,189");
    expect(formatRankInterval([200565, 204300])).toBe("200,565–204,300");
    expect(formatRankInterval([])).toBe("—");
  });
});

describe("航线图：海图版画的导出约束", () => {
  // 导出 PNG 时这张 SVG 会被序列化成一个独立文档再画到画布上：CSS 类拿不到、文档里的
  // id（渐变、滤镜、sprite 的 <use>）也解析不到。旧图正面就是栽在 url(#rtSea) 上——
  // 导出后那块底不生效，露出画布的深色垫底，就是负责人截图里那张「黑底草稿」。
  it("被导出的那张 SVG 不引用任何 id，也不带滤镜", () => {
    // 只扫被导出的那一块（ref={chartSvgRef} 到它的 </svg>）：页头那枚罗盘用的是
    // sprite 的 <use href="#rose">，它在导出范围之外，不受影响。
    const start = chart.indexOf("chartSvgRef} viewBox");
    const end = chart.indexOf("</svg>", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const exportedSvg = chart.slice(start, end);
    expect(exportedSvg).not.toContain("url(#");
    expect(exportedSvg).not.toContain("<linearGradient");
    expect(exportedSvg).not.toContain("<filter");
    expect(exportedSvg).not.toMatch(/<use\b/);
  });

  it("颜色与字体写成元素属性（图内一份 CHART 令牌）", () => {
    expect(chart).toContain("fill={CHART.paper}");
    expect(chart).toContain("CHART.song");
    expect(chart).toContain("CHART.display");
    expect(chart).toContain("CHART.brass");
  });

  it("导出垫色改成纸色，不再给浅色航线图垫深海底", () => {
    expect(shared).toContain('context.fillStyle = "#f7f5ee"');
    expect(shared).not.toContain('context.fillStyle = "#08202a"');
  });

  it("版心留白：不再有越出版框的坐标", () => {
    // 上一版沿用了旧图的右侧标签列 x=992，而版框到 976 就结束——文字跑到框外，
    // 负责人一眼就看到了。现在版心由 PLATE 常量收口（x0/x1 = 44/956），
    // 图内一切文字都落在 44–956 之间。
    expect(chart).toContain("x1: 956");
    expect(chart).not.toContain("LABEL_COLUMN_X");
    expect(chart).not.toMatch(/x=\{992\}|x="992"/);
  });

  it("图直接落在页面上：没有底板、没有版框（负责人：不要边框）", () => {
    // 图内不再铺纸色底、不再画版框与四角刻线——SVG 透明，卡片底色透上来，看着是页面的一部分，
    // 而不是贴上去的一张图。导出 PNG 的垫色在 svgStringToPng 里，与这里无关。
    expect(chart).not.toContain("CHART.frame");
    expect(chart).not.toContain("四角刻线");
    expect(chart).not.toContain('<rect width="1000" height="320"');
    expect(chart).not.toContain('<rect width="360" height="344"');
  });

  it("入场与悬停的钩子在（CSS 负责动，导出不受影响）", () => {
    expect(chart).toContain('className="rt-row"');
    expect(chart).toContain('className="rt-band"');
    expect(chart).toContain('className="rt-boat"');
    expect(css).toContain(".routes .rt-row{opacity:0;animation:rt-row-in");
    expect(css).toContain("@keyframes rt-bob");
    expect(css).toMatch(/@media\(hover:hover\)/);
    expect(css).toMatch(/prefers-reduced-motion:reduce\)\{\s*\.routes \.rt-row\{animation:none/);
  });

  it("窄屏换竖排版心，不让横版一路缩到看不清", () => {
    // 横版版心 1000×320，缩到 390 宽的手机上字号只剩 4–5px。窄屏改画 360×344 的竖排版心：
    // 一条关系一行，字号按 1.0 倍左右渲染。切换交给 CSS 的类名（不是按屏宽卸载 DOM）——
    // 两版都要在，导出海报取的正是横版那张。
    expect(chart).toContain('viewBox="0 0 360 344"');
    expect(chart).toContain('viewBox="0 0 1000 320"');
    expect(css).toMatch(/\.routes \.rt-narrow\{display:none\}/);
    expect(css).toMatch(/@media\(max-width:640px\)\{\.routes \.rt-narrow\{display:block\}\.routes \.rt-wide\{display:none\}\}/);
  });

  it("空结果说实话：选了方向但池里没有，不许说成「你还没选」", () => {
    // 负责人 2026-09-12 撞上的坑：方向页勾的专业类来自发布库全目录，而卡片只从匹配出的
    // 院校池里出；两者空的时候页面却说「这些专业在院校池里」/「两条线都还空着」，
    // 把「库里有的类」说成「池里有的类」，还让已经选过方向的学生再去选一遍。
    expect(chart).toContain("选的方向在这个区间里没有院校记录");
    expect(chart).toContain("你这次的院校池里一条记录都没有");
    expect(chart).toContain("回分数轴放宽区间");
    expect(chart).not.toContain("这些专业在院校池里，但当前区间");
  });

  it("不假装分数轴：网格只有底纹，不标数值", () => {
    // 三条线用 y=78/158/238 三个横向位置表示三种位置关系，不是分数刻度；
    // 图上任何带数字的刻度都可能被读成「分数轴」，所以左侧不画带数字的尺。
    expect(chart).not.toContain("axisMarks");
    expect(chart).not.toContain("publishedMinScore");
  });
});

describe("参考年最低分与整页海报", () => {
  // 最小发布包：一张 2025 物理类分段表，三行就够验证位次 → 分数的反查。
  const release = {
    manifest: {}, index: {}, basePath: "",
    distributions: [{
      distributionId: "fixture-2025-PHYSICS", year: 2025, track: "PHYSICS",
      curriculumSystem: "new_gaokao", scoreBasis: "gaokao_cultural",
      publishedMinScore: 550, publishedMaxScore: 552,
      rows: [
        { score: 552, count: 10, cumulative: 10 },
        { score: 551, count: 20, cumulative: 30 },
        { score: 550, count: 30, cumulative: 60 }
      ]
    }]
  } as unknown as LoadedRelease;

  it("位次反查分数：落在哪一行就是哪个分数，两端分别是最低分与最高分", () => {
    expect(scoreRangeForRanks(release, "PHYSICS", 2025, [1, 10])).toEqual({ min: 552, max: 552 });
    expect(scoreRangeForRanks(release, "PHYSICS", 2025, [11, 30])).toEqual({ min: 551, max: 551 });
    expect(scoreRangeForRanks(release, "PHYSICS", 2025, [21, 60])).toEqual({ min: 550, max: 551 });
    // 越界、缺表、缺科类一律返回 null（不插值不外推）
    expect(scoreRangeForRanks(release, "PHYSICS", 2025, [61, 90])).toBeNull();
    expect(scoreRangeForRanks(release, "PHYSICS", 2024, [1, 10])).toBeNull();
    expect(scoreRangeForRanks(release, "HISTORY", 2025, [1, 10])).toBeNull();
    expect(scoreRangeForRanks(null, "PHYSICS", 2025, [1, 10])).toBeNull();
  });

  it("海报是竖版卡片式，并按大类 → 小类分层", () => {
    const poster = buildRoutePoster({
      chartBody: "<text>chart</text>",
      chartWidth: 360, chartHeight: 344,
      contextLabel: "四川 · 物理类 · 2027", rangeLabel: "200–460", referenceYear: 2025,
      routes: [{
        title: "我的自主选择", total: 385, more: 361,
        groups: [{
          name: "工学", total: 200,
          classes: [{ name: "计算机类", total: 120, cards: [
            { institution: "示例大学", city: "成都", relation: { label: "历史位置较有余量", color: "#7d9a86" },
              major: "计算机科学与技术", level: "本科", sub: "本科批B段 · 计算机类",
              score: "444", rank: "200,565", plan: "6", fee: "学费 5000", tags: ["省部共建", "卓越工程师"] }
          ] }]
        }]
      }],
      blessing: { text: "愿你既有仰望星空的方向。", sign: "—— 南 溟" },
      note: "按历史位置参考绘制 · 不构成录取判断"
    });
    expect(poster).toContain("<text>chart</text>");
    expect(poster).toContain("我的自主选择 · 385 条专业 × 院校");
    expect(poster).toContain("工学");                                   // 大类标题
    expect(poster).toContain("200 条 · 1 个专业类");
    expect(poster).toContain("计算机类");                               // 小类标题
    expect(poster).toContain("120 条（列前 1 条）");
    expect(poster).toContain("示例大学 · 成都");
    expect(poster).toContain("计算机科学与技术");
    expect(poster).toContain("2025 最低 ");
    expect(poster).toContain("位次 200,565 · 招 6 人 · 学费 5000");
    expect(poster).toContain("省部共建 · 卓越工程师");
    expect(poster).toContain("愿你既有仰望星空的方向。");
    expect(poster).toContain("不构成录取判断");
    expect(poster).toMatch(/width="720" height="\d+"/);                 // 竖版长图
  });

  it("分组：按大类 → 小类，大类与小类都按条数从多到少", () => {
    const row = (category: string | null, categoryClass: string | null, majorName: string) =>
      ({ label: { category, categoryClass, majorName } });
    const groups = groupRouteRows([
      row("工学", "计算机类", "软件工程"),
      row("工学", "计算机类", "计算机科学与技术"),
      row("工学", "机械类", "机械设计制造及其自动化"),
      row("管理学", "工商管理类", "工商管理"),
      row(null, null, "未分类专业"),
    ]);
    expect(groups.map((group) => group.name)).toEqual(["工学", "管理学", "未分类"]);
    expect(groups[0]!.total).toBe(3);
    expect(groups[0]!.classes.map((cls) => `${cls.name}:${cls.total}`)).toEqual(["计算机类:2", "机械类:1"]);
    // 每类取 1 张、合计上限 2 张：两条线各出一张，超出的不取
    const picked = pickGroupedCards(groups, 1, 2);
    expect(picked.map((entry) => entry.category.name)).toEqual(["工学"]);
    expect(picked[0]!.classes.map((cls) => cls.rows.length)).toEqual([1, 1]);
  });

  it("手机端抽屉、宽屏平铺；导出海报始终平铺（两版共用同一份挑选）", () => {
    expect(chart).toContain("useNarrow()");
    expect(shared).toContain("export function useNarrow");
    expect(axis).toContain("useNarrow()");
    expect(chart).toContain('className="deck"');
    expect(chart).toContain('className="stop-head"');
    expect(chart).toContain('className="sc-class"');
    expect(chart).toContain("groupRouteRows(route.rows)");
    expect(chart).toContain("pickGroupedCards(groupRouteRows(route.rows)");
    expect(chart).toContain("const PNG_SCALE = 2;");
    expect(chart).toContain("posterWidth * PNG_SCALE");
  });

  it("图上三个数字按「两条线」统计，并说明「需更好位置」为何恒为空", () => {
    // 负责人 2026-09-12 问：更好的位置永远是 0、同分比例像固定值，难道不会变？
    // 原来按整个院校池统计——换方向、换自选都不动；现在按两条线里的记录统计，
    // 并把「那一档为空是池子定义决定的」写在页面上与导出图上。
    expect(chart).toContain("routeRows.filter((row) =>");
    expect(chart).toContain("两条线 {routeRows.length");
    expect(chart).toContain("院校池只收与你的位次区间有交集的记录");
    expect(chart).toContain("chartNote:");
    expect(shared).toContain("chartNote?: string");
  });

  it("两个页面的院校卡都是抽屉式分组（大类收起、小类展开）", () => {
    expect(axis).toContain("groupRouteRows(rows)");
    expect(axis).toContain("pickGroupedCards(grouped, AXIS_CARDS_PER_CLASS, AXIS_CARDS_TOTAL)");
    expect(chart).toContain("pickGroupedCards(grouped, CARDS_PER_CLASS, CARDS_PER_ROUTE)");
    expect(axis).toContain('className="deck"');
    expect(chart).toContain('className="deck"');
    // 每类的张数要够翻一趟纸堆：总数上限不能再把每类压到只剩 1 张（原来 60 张平摊就是这个结果）
    expect(axis).toContain("const AXIS_CARDS_PER_CLASS = 3;");
    expect(axis).toContain("const AXIS_CARDS_TOTAL = 600;");
    expect(axis).not.toContain("超过 60 条时先展示前 60 条");
  });

  it("卡片是纸张堆叠：滚到线上的那张完整摊开，被压住的只露抬头", () => {
    // 负责人 2026-09-12：「我要的是卡片抽屉式的堆叠结构。随着滑动有那种类似于纸张翻页的那种动效动画。
    // 然后停在当前卡片就只显示当前卡片的内容。」——所以卡片按专业类叠成一摞，用 sticky 钉成纸堆，
    // 只有当前这张是完整露出来的（旧版是让所有卡片都显示内容、只把细节调暗，不是这个意思）。
    for (const page of [axis, chart]) {
      expect(page).toContain("<div className=\"schools card-stack\"");
      expect(page).toContain('className="stack-slot"');
      expect(page).toContain('"--i": index');
      expect(page).toContain("useDeckStack(cardsRef");
    }
    // 堆叠的行为在 shared 的钩子里：钉线 = --deck-top + i × --deck-peek，谁在线上切 is-current / is-covered
    expect(shared).toContain("export function useDeckStack");
    expect(shared).toContain("deckTop + index * peek");
    expect(shared).toContain('classList.toggle("is-covered"');
    expect(shared).toContain("requestAnimationFrame");
    expect(shared).toContain("box.bottom < -vh * 0.35");   // 视野外的一摞整摞跳过，不每帧读布局
    // 翻页的翘起跟着滚动走（--ap 连续量），不是切 class 的时间过渡
    expect(shared).toContain('setProperty("--ap"');
    // 在线下方时 top > line：ap < 1（翘着）；贴线/越过 ap = 1（摊平）——方向写反过一次
    expect(shared).toContain("1 - (rect.top - line) / travel");
    // 有阻尼：目标值再进一根欠阻尼弹簧，停下来还能收尾（负责人：要非线性、带阻尼，不要「假流畅」）
    expect(shared).toContain("const STIFFNESS = 145;");
    expect(shared).toContain("const DAMPING = 16;");
    expect(shared).toContain("spring.velocity += (STIFFNESS * (target - spring.value)");
    expect(shared).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
    // 整摞按滑动速度滞后（重量感），停下回到 0
    expect(shared).toContain('setProperty("--pile-lag"');
    expect(css).toContain("var(--pile-lag,0px)");
    // 抽屉是点开才把卡片放进 DOM 的：找不到就白挂过一次，所以要用 MutationObserver 自己认领
    expect(shared).toContain("new MutationObserver");
    expect(shared).toContain("const refresh = () =>");
    expect(shared).toContain("if (!stacks.length) refresh()");
    expect(css).toContain("--deck-travel:240px");
    expect(css).toContain("translateY(calc((1 - var(--ap,1)) * 14px + var(--pile-lag,0px)))");
    expect(css).toContain("rotateX(calc((1 - var(--ap,1)) * -7deg))");
    expect(css).toMatch(/\.card-stack \.scard\{[^}]*transition:box-shadow[^}]*\}/);
    // 卡片自带的入场动画是 fill:both，会压掉翻转用的 transform，堆叠里必须关掉
    expect(css).toContain(".card-stack .scard{animation:none");
    // 一摞末尾的跑道只留「够停一下」，太长会在收满之后留一大片空白
    expect(css).toContain(".stack-tail{height:min(7vh,60px)}");
    expect(css).not.toContain("min(42vh,300px)");
    // 旧版「跟随滑动调暗细节」的做法不再回来
    expect(css).not.toContain(".scard.focus .sc-detail{opacity:1");
    expect(css).not.toMatch(/\.sc-detail\{[^}]*opacity:\.35/);
  });

  it("航线图院校卡的最低分常驻，其余细节在摊开的那张里", () => {
    const foot = /<div className="sc-foot">([\s\S]*?)<\/div>/.exec(chart)?.[1] ?? "";
    expect(foot).toContain("sc-score");
    expect(foot).not.toContain("位次");
    expect(chart).toContain('className="sc-detail"');
    expect(chart).toContain("位次 {formatRankInterval(interval)}");
    expect(chart).toContain("招 {row.label.planCount ?? \"—\"} 人");
  });

  it("复制文字版按钮已按负责人要求删掉", () => {
    expect(chart).not.toContain("复制文字版");
    expect(chart).not.toContain("copyText");
    expect(chart).not.toContain("clipboard");
  });
});
