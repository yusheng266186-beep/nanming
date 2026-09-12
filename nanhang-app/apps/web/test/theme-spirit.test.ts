// 南溟 · 主题与内核的守卫测试。
//
// 「形」是配色与排版，「神」是这套界面是否真的在讲南溟这件事：从北冥出发、以证据定位、
// 由本人确认方向、向未测绘的海域如实留白。这些断言盯住的是后者——它们都很容易被
// 一次「优化排版」顺手删掉，而不触发任何功能测试。
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
// 页面标记分布在 App.tsx 与 chapters/ 的章节文件里，守卫检查拼接全部来源。
const chapterDir = resolve(import.meta.dirname, "../src/chapters");
const app = [
  src("App.tsx"),
  ...readdirSync(chapterDir).filter((name) => /\.tsx?$/.test(name))
    .sort().map((name) => readFileSync(resolve(chapterDir, name), "utf8"))
].join("\n");
const art = src("art.tsx");
const css = src("style.css");
const theme = src("theme.tsx");

describe("主题：图标与航程", () => {
  it("keeps the 南溟 icon set in the shared sprite", () => {
    // 这组图标是「鲲化而为鹏」与航海器物的形状，缺一个就会让对应章节退回通用图标。
    for (const id of ["i-kun", "i-wing", "i-log", "i-ruler", "i-buoy", "i-chartmap"]) {
      expect(art, `sprite is missing ${id}`).toContain(`id="${id}"`);
    }
    // 成绩章已并入定位（负责人裁定）；质量慧析的航海日志图标跟去了定位页的识别与慧析面板。
    expect(app).toContain('{ id: "locate", num: "02", k: "定位", icon: "compass"');
    expect(app).toContain('<Icon name="log" />');
  });

  it("names each chapter as a leg of the voyage", () => {
    // 六个阶段名来自《逍遥游》的航程意象；章节编号必须与导航一致（曾经错位过）。
    // 成绩章并入定位后（负责人裁定），质量慧析的「录航迹」由定位页的慧析面板承担。
    const legs = [
      ["Chapter 01 · 起航 · 北冥有鱼", "sail"],
      ["Chapter 02 · 定位 · 测深", "locate"],
      ["Chapter 03 · 谈心 · 问心", "talk"],
      ["Chapter 04 · 方向 · 定罗盘", "direction"],
      ["Chapter 05 · 分数轴 · 试风", "axis"],
      ["Chapter 06 · 航线图 · 抟扶摇", "chart"],
    ] as const;
    for (const [eyebrow] of legs) expect(app, `missing chapter label: ${eyebrow}`).toContain(eyebrow);
    // 导航里的编号与眉题必须成对出现，不能只改一处。
    for (const [eyebrow, id] of legs) {
      const num = eyebrow.slice(8, 10);
      expect(app).toContain(`{ id: "${id}", num: "${num}"`);
    }
  });
});

describe("内核：缺失有名字，来源说明按产品裁定不再露出", () => {
  it("ships the uncharted element", () => {
    expect(theme).toContain("export function Uncharted");
    for (const cls of [".uncharted", ".trail-gap"]) {
      expect(css, `stylesheet is missing ${cls}`).toContain(cls);
    }
    // 未测绘必须真的被用上，否则只是躺在样式表里的死代码。
    expect(app).toContain("<Uncharted");
  });

  it("shows no provenance/evidence machinery to students", () => {
    // 负责人裁定（2026-09）：溯源锚点、证据链、资料来源这类「数据真实性」展示对
    // 学生没有意义，一律不进界面。这里钉住删除，防止哪次重构又把它们贴回来。
    expect(theme).not.toContain("export function Provenance");
    expect(css).not.toContain(".provenance");
    expect(app).not.toContain("<Provenance");
    expect(app).not.toContain("证据链");
    expect(app).not.toContain("资料来源编号");
  });

  it("shows the student's own words on a direction card", () => {
    // 项目内核：方向建议必须引用学生本人的原话。引文只能取自他说过的话，
    // 原话不在了就明说，不许用系统措辞顶上；没有建议也如实说明，不编一条出来。
    expect(app).toContain("quoteFor");
    expect(app).toContain('className="dquote"');
    expect(app).toContain("这次对话还没有形成有依据的建议");
  });

  it("does not invent a score when the student has not entered one", () => {
    // 未填分数/未生成区间时显示「—」，不许拿 480 之类的兜底数字冒充分数。
    expect(app).not.toContain("score ?? 480");
    expect(app).toContain('{score === null ? <span className="absent">—</span> : score}');
    expect(app).toContain('{range ? `${range.low}–${range.high}` : "—"}');
  });
});

describe("内核：范围与刻度同源", () => {
  it("derives the slider range from the published table, not a fallback", () => {
    // 早先的写法是从「本次位次结果」推范围，未填分数时会退回 300–700，
    // 于是刻度（150/691）被夹到错误位置，与滑块声称的范围对不上。
    expect(app).toContain("publishedBounds");
    expect(app).toContain("Math.min(...publishedBounds)");
    expect(app).toContain("Math.max(...publishedBounds)");
  });

  it("keeps both ends of the scale from colliding with the tick numbers", () => {
    // 端点的标签必须贴边对齐；区间端点与公布范围同用这套规则。这些规则删掉就会重现重叠。
    expect(app).toContain('const edge = left <= 1 ? " start"');
    expect(css).toContain(".stick.start{transform:none;text-align:left}");
    expect(css).toContain(".stick.end{transform:translateX(-100%);text-align:right}");
    expect(css).toContain(".stick.own{");
  });

  it("shows the range as a band, not as a point marker", () => {
    // 负责人裁定（2026-09）：探索区间要一眼读成「一段范围」。旧设计在金带两端画
    // 「当前分」竖线（.axis-now），把区间掐成一个点——钉住它不再回来；
    // 金带用实心端头（::before/::after）标出上下限。
    expect(css).not.toContain(".axis-now");
    expect(app).not.toContain('className="axis-now"');
    expect(css).toContain(".axis-band::before,.axis-band::after");
  });
});

describe("内核：留白要说出原因", () => {
  it("explains why a number is missing instead of showing a bare dash", () => {
    // 缺考/无来源的场次在航迹里画成虚线空柱，并说明留空不补零。
    expect(app).toContain('className="trail-gap"');
    expect(app).toContain("留空不补零");
    // 区间/位次不可得时要说清缺的是什么、去哪一步补上——不许只丢一个「—」或一句技术术语。
    expect(app).toContain("还没有探索区间");
    expect(app).toContain("该分数官方未列出");
    // 旧措辞只允许出现在解释这次修改的注释里，不允许再作为界面文案。
    const asDisplayText = app.split(String.fromCharCode(10))
      .filter((line) => !line.trim().startsWith("//"));
    expect(asDisplayText.join("")).not.toContain("尚未载入分段表");
  });
});
