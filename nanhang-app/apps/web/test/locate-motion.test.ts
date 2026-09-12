// 定位页：编排与微交互的不变量（本次只加样式，不动结构与文案）。
//
// 定位页要读的东西最多，靠「逐块落位 + 数字/柱子自己在原位长出来」建立阅读顺序。
// 这些断言钉住三件事：动效全部只作用在定位页、两处不能动 transform 的元素只淡入、
// 以及减少动态效果时连错峰延迟一起归零（否则元素会停在首帧不显示）。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
const css = src("style.css");
const locate = src("chapters/locate.tsx");

const block = css.slice(css.indexOf("定位页：编排与微交互"), css.indexOf("@media print"));
const squeeze = css.slice(css.indexOf("读数区不再被挤成半栏"), css.indexOf("定位页：编排与微交互"));
const compact = css.slice(css.indexOf("卡片留白收紧"), css.indexOf("读数区不再被挤成半栏"));

describe("定位页：卡片留白收紧", () => {
  it("整页面板先收一档，窄屏再收一档", () => {
    expect(compact).toMatch(/#page-locate \.panel\{padding:22px 24px\}/);
    expect(compact).toMatch(/#page-locate \.panel \.psub\{margin-bottom:14px\}/);
    expect(compact).toMatch(/@media\(max-width:640px\)\{#page-locate \.panel\{padding:20px 18px\}\}/);
  });

  it("两张卡按内容认出来，全页唯一，且不给 JSX 加类名", () => {
    // 识别卡里有全页唯一的文本框；区间卡里有网格中的数字框（考试行是 .exam-row 里的数字框，不会误伤）。
    expect(compact).toMatch(/#page-locate \.panel:has\(input\[type="text"\]\)/);
    expect(compact).toMatch(/#page-locate \.panel:has\(\.grid-2 label\.field input\[type="number"\]\)/);
    expect(locate).not.toContain("compact");
  });

  it("卡内行内间距只能用 !important 盖住，且每一处都限定在这两张卡上", () => {
    const rules = compact.split("\n").map((line) => line.trim()).filter((line) => line.includes("{"));
    const importants = rules.filter((line) => line.includes("!important"));
    expect(importants.length).toBeGreaterThan(0);
    for (const line of importants) expect(line).toMatch(/:has\(/);
  });

  it("只改留白，不改布局：:has() 规则里不出现布局属性", () => {
    // 只看真正的规则行（带 `{` 的那几行），注释里出现的 `:has()` 不算。
    const rules = compact.split("\n").map((line) => line.trim()).filter((line) => line.includes("{"));
    const hasRules = rules.filter((line) => line.includes(":has("));
    expect(hasRules.length).toBeGreaterThan(3);
    for (const line of hasRules) {
      expect(line).toMatch(/(padding|margin-top|margin-bottom|gap)/);
      expect(line).not.toMatch(/display:|grid-template|position:|width:|height:/);
    }
  });
});

describe("定位页：读数区不被挤成半栏", () => {
  it("标签与数字各自不拆行，短横线不参与收缩", () => {
    expect(squeeze).toMatch(/\.gauge \.eyebrow\{white-space:nowrap\}/);
    expect(squeeze).toMatch(/\.gauge \.eyebrow::before\{flex-shrink:0\}/);
    expect(squeeze).toMatch(/\.gauge \.bignum\{white-space:nowrap\}/);
  });

  it("放不下就上下各占一行，并把右块的右对齐收成左对齐", () => {
    expect(squeeze).toMatch(/@media\(max-width:560px\)\{/);
    expect(squeeze).toMatch(/\.gauge-top\{flex-direction:column;gap:16px\}/);
    // 右块的对齐写在 JSX 的行内 style 上，压不过继承；必须由子元素显式声明才生效。
    expect(squeeze).toMatch(/\.gauge-top>div>\*\{text-align:left\}/);
    // 页面标记未动：两处读数仍是原来的 .gauge-top 结构，没有为了排版加类名或改节点。
    expect(locate).toContain('<div className="gauge-top">');
  });
});

describe("定位页：动效编排", () => {
  it("页面自上而下逐块落位", () => {
    expect(block).toMatch(/#page-locate>\*\{animation:arrive/);
    expect(block).toMatch(/#page-locate>:nth-child\(2\)\{animation-delay:\.05s\}/);
    expect(block).toMatch(/#page-locate>:nth-child\(n\+7\)\{animation-delay:\.3s\}/);
  });

  it("分数条的位次标记自上落下，三条刻度依次报到", () => {
    expect(block).toMatch(/\.bandbar \.bandfill\{[^}]*animation:band-drop/);
    expect(block).toMatch(/\.bandbar \.bandmark\{[^}]*animation:mark-drop/);
    expect(block).toMatch(/@keyframes band-drop\{from\{transform:scaleY\(0\)/);
    expect(block).toMatch(/\.bandtick\{animation:tick-in/);
  });

  it("不能动 transform 的两处保持原样：刻度靠 translateX(-50%) 居中、统计格在会裁切的网格里", () => {
    // 刻度：动画首尾都必须显式保留 -50% 的居中位移，否则文字会偏半个字宽。
    expect(block).toMatch(/@keyframes tick-in\{from\{opacity:0;transform:translateX\(-50%\) translateY\(4px\)\}to\{opacity:1;transform:translateX\(-50%\)\}\}/);
    // 统计格用纯淡入（fade 不改 transform），数值才用会位移的 num-in。
    expect(block).toMatch(/\.stat\{animation:fade/);
    expect(block).toMatch(/\.stat \.sv\{animation:num-in/);
  });

  it("曲线与航迹的柱子只做纵向缩放，不改内联高度", () => {
    expect(block).toMatch(/\.tbar \.col\{transform-origin:bottom;animation:bar-grow/);
    expect(block).toMatch(/svg\[role="img"\] rect\{transform-box:fill-box;transform-origin:bottom/);
    expect(block).toMatch(/@keyframes bar-grow\{from\{transform:scaleY\(/);
    // 内联高度是数据本身，任何动效都不得覆盖它。
    expect(block).not.toMatch(/\.col\{[^}]*height:/);
    expect(css).toMatch(/\.tbar \.col\{width:100%;max-width:26px;background:linear-gradient\(var\(--foam\),var\(--sea\)\);border-radius:5px 5px 2px 2px;transition:height 1s var\(--ease\)\}/);
  });

  it("考试行：正在填的那一行亮起来，左侧铜线长出来", () => {
    expect(block).toMatch(/\.exam-row:focus-within\{box-shadow:inset 0 0 0 100px/);
    expect(block).toMatch(/\.exam-row:focus-within::before\{transform:none\}/);
    expect(block).toMatch(/\.exam-row \.inp:not\(:placeholder-shown\)\{border-color:var\(--brass-line\)\}/);
  });

  it("动效只作用在定位页，不泄漏到别的章节", () => {
    for (const line of block.split("\n")) {
      const rule = line.trim();
      if (!rule.startsWith(".") && !rule.startsWith("#")) continue;
      if (rule.startsWith("@")) continue;
      expect(rule.startsWith("#page-locate") || rule.startsWith("#page-locate>"), `未加作用域的规则：${rule}`).toBe(true);
    }
  });

  it("页面标记与文案没有为了动效改过：定位页里没有新增的动效类名", () => {
    for (const name of ["band-drop", "mark-drop", "tick-in", "num-in", "bar-grow", "row-in", "rule-in"]) {
      expect(locate).not.toContain(name);
    }
  });

  it("减少动态效果时连错峰延迟一起归零", () => {
    const reduced = css.slice(css.lastIndexOf("@media(prefers-reduced-motion:reduce)"));
    expect(reduced).toMatch(/animation-duration:\.001ms!important/);
    expect(reduced).toMatch(/animation-delay:0s!important/);
  });
});
