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
  buildRoutePoster, formatRankInterval, levelLabel, scoreRangeForRanks,
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

  it("海报是竖版卡片式：一张张卡片、含最低分与寄语", () => {
    const poster = buildRoutePoster({
      chartBody: "<text>chart</text>",
      chartWidth: 360, chartHeight: 344,
      contextLabel: "四川 · 物理类 · 2027", rangeLabel: "200–460", referenceYear: 2025,
      routes: [{ title: "我的自主选择", total: 385, more: 361, cards: [
        { institution: "示例大学", city: "成都", relation: { label: "历史位置较有余量", color: "#7d9a86" },
          major: "计算机科学与技术", level: "本科", sub: "本科批B段 · 计算机类",
          score: "444", rank: "200,565", plan: "6", fee: "学费 5000", tags: ["省部共建", "卓越工程师"] }
      ] }],
      blessing: { text: "愿你既有仰望星空的方向。", sign: "—— 南 溟" },
      note: "按历史位置参考绘制 · 不构成录取判断"
    });
    expect(poster).toContain("<svg");
    expect(poster).toContain("<text>chart</text>");                    // 竖版航线图正文嵌在海报里
    expect(poster).toContain("我的自主选择 · 385 条专业 × 院校");
    expect(poster).toContain("示例大学 · 成都");                       // 卡片：院校抬头
    expect(poster).toContain("计算机科学与技术");                      // 卡片：专业
    expect(poster).toContain("2025 最低 ");                            // 卡片：参考年最低分
    expect(poster).toContain("位次 200,565 · 招 6 人 · 学费 5000");     // 卡片：一行数据
    expect(poster).toContain("省部共建 · 卓越工程师");                  // 卡片：院校标签
    expect(poster).toContain("另有 361 条未逐条列出");
    expect(poster).toContain("愿你既有仰望星空的方向。");               // 写给你
    expect(poster).toContain("不构成录取判断");
    expect(poster).toMatch(/width="720" height="\d+"/);               // 竖版：宽 720
  });

  it("卡片压扁了：数据条一行、关系标签进抬头行", () => {
    for (const page of [chart, axis]) {
      expect(page).toContain('className="sc-foot"');
      expect(page).toContain('className="sc-head"');
      expect(page).toContain("最低 <b>{scoreText}</b> 分");
      expect(page).not.toContain('className="ranks"');
    }
    // 两版航线图都留在 DOM 里（导出取横版），显隐交给 CSS
    expect(chart).toContain('className="rt-narrow"');
    expect(chart).toContain('className="rt-wide"');
    expect(chart).toContain('ref={chartSvgRef} viewBox="0 0 360 344"');
    expect(css).toMatch(/@media\(max-width:640px\)\{\.routes \.rt-narrow\{display:block\}/);
  });
});
