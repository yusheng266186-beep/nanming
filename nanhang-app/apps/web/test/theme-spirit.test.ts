// 南溟 · 主题与内核的守卫测试。
//
// 「形」是配色与排版，「神」是这套界面是否真的在讲南溟这件事：从北冥出发、以证据定位、
// 由本人确认方向、向未测绘的海域如实留白。这些断言盯住的是后者——它们都很容易被
// 一次「优化排版」顺手删掉，而不触发任何功能测试。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
const app = src("App.tsx");
const art = src("art.tsx");
const css = src("style.css");
const theme = src("theme.tsx");

describe("主题：图标与航程", () => {
  it("keeps the 南溟 icon set in the shared sprite", () => {
    // 这组图标是「鲲化而为鹏」与航海器物的形状，缺一个就会让对应章节退回通用图标。
    for (const id of ["i-kun", "i-wing", "i-log", "i-ruler", "i-buoy", "i-chartmap"]) {
      expect(art, `sprite is missing ${id}`).toContain(`id="${id}"`);
    }
    // 成绩章节用航海日志，而不是与「校内位置」重复的 layers。
    expect(app).toContain('{ id: "quality", num: "03", k: "成绩", icon: "log"');
  });

  it("names each chapter as a leg of the voyage", () => {
    // 七个阶段名来自《逍遥游》的航程意象；章节编号必须与导航一致（曾经错位过）。
    const legs = [
      ["Chapter 01 · 起航 · 北冥有鱼", "sail"],
      ["Chapter 02 · 定位 · 测深", "locate"],
      ["Chapter 03 · 成绩 · 录航迹", "quality"],
      ["Chapter 04 · 谈心 · 问心", "talk"],
      ["Chapter 05 · 方向 · 定罗盘", "direction"],
      ["Chapter 06 · 分数轴 · 试风", "axis"],
      ["Chapter 07 · 航线图 · 抟扶摇", "chart"],
    ] as const;
    for (const [eyebrow] of legs) expect(app, `missing chapter label: ${eyebrow}`).toContain(eyebrow);
    // 导航里的编号与眉题必须成对出现，不能只改一处。
    for (const [eyebrow, id] of legs) {
      const num = eyebrow.slice(8, 10);
      expect(app).toContain(`{ id: "${id}", num: "${num}"`);
    }
  });
});

describe("内核：每个数字都能追到来源", () => {
  it("ships the provenance and uncharted elements", () => {
    expect(theme).toContain("export function Provenance");
    expect(theme).toContain("export function Uncharted");
    for (const cls of [".provenance", ".uncharted", ".trail-gap"]) {
      expect(css, `stylesheet is missing ${cls}`).toContain(cls);
    }
    // 两者都必须真的被用上，否则只是躺在样式表里的死代码。
    expect(app).toContain("<Provenance");
    expect(app).toContain("<Uncharted");
  });

  it("anchors the rank, the candidate cards, the chart and the school data", () => {
    // 这四处是页面给出数字/结论的地方，各自必须写明依据。
    const anchors = app.match(/<Provenance[^>]*>/g) ?? [];
    expect(anchors.length, "expected provenance notes on every data-bearing section").toBeGreaterThanOrEqual(5);
    // 院校卡要说清组线与专业线是两条记录，来自哪一年。
    expect(app).toContain("组位置取自");
    expect(app).toContain("专业位置取该专业自己的记录");
    // 航线图要说清分组依据。
    expect(app).toContain("历史参考关系");
  });

  it("shows the student's own words on a direction card", () => {
    // 项目内核：方向来自学生本人保存的原话。引文只能取自 evidence，
    // 没有原话时就明说没有，不许用系统措辞顶上。
    expect(app).toContain("interestEvidence[0]");
    expect(app).toContain('className="dquote"');
    expect(app).toContain("还没有你自己的原话支撑");
  });

  it("does not invent a score when the student has not entered one", () => {
    // 未填分数时显示「—」，不许拿 480 之类的兜底数字冒充分数。
    expect(app).not.toContain("score ?? 480");
    expect(app).toContain('{score ?? "—"}');
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
    // 端点的标签必须贴边对齐；情景分单独占一行。这些规则删掉就会重现重叠。
    expect(app).toContain('const edge = pct <= 1 ? " start"');
    expect(css).toContain(".stick.start{transform:none;text-align:left}");
    expect(css).toContain(".stick.end{transform:translateX(-100%);text-align:right}");
    expect(css).toContain(".stick.own{");
  });

  it("does not label the target slider as 现在", () => {
    // 「现在」是给「当前分 / 目标分」双滑块的旧设计留的；本页只有一个目标分滑块。
    expect(css).toContain(".axis-now::after{content:none}");
  });
});

describe("内核：留白要说出原因", () => {
  it("explains why a number is missing instead of showing a bare dash", () => {
    // 缺考/无来源的场次在航迹里画成虚线空柱，并说明不补成 0 分。
    expect(app).toContain('className="trail-gap"');
    expect(app).toContain("不补成 0 分");
    // 位次不可得时要区分「没填分数」与「分数不在公布范围」——原来两种都写「尚未载入分段表」。
    expect(app).toContain("尚未填写情景分");
    expect(app).toContain("该分数不在官方公布范围内");
    // 旧措辞只允许出现在解释这次修改的注释里，不允许再作为界面文案。
    const asDisplayText = app.split(String.fromCharCode(10))
      .filter((line) => !line.trim().startsWith("//"));
    expect(asDisplayText.join("")).not.toContain("尚未载入分段表");
  });
});
