// 起航页六站：抽屉式堆叠卡的不变量。
//
// 六张卡原先平铺（桌面 3 列网格、每张一整段说明），窄屏要 980px 才放得下。改成抽屉之后
// 收起只露一行、相邻两张压边叠成一副。这些断言钉住三件事：六站的说明一条都没删、
// 收起/展开是可读的状态（aria-expanded + hidden）、压边只压上一张的下内边距而不是文字。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
const sail = src("chapters/sail.tsx");
const css = src("style.css");

describe("起航页六站：抽屉式堆叠", () => {
  it("六站的整句说明一条没删，仍是六张卡", () => {
    for (const id of ["sail", "locate", "talk", "direction", "axis", "chart"]) {
      expect(sail).toContain(`${id}: { title:`);
    }
    expect(sail).toContain("CHAPTERS.map((chapter)");
  });

  it("默认全部收起，展开状态由 aria-expanded 与 aria-controls 报出", () => {
    expect(sail).toContain("useState<string | null>(null)");
    expect(sail).toContain("aria-expanded={open}");
    expect(sail).toContain("aria-controls={`stop-${chapter.id}`}");
  });

  it("正文始终留在 DOM 里，收起只动高度与透明度", () => {
    // 不用 display:none 截断动画；aria-hidden 让收起内容退出阅读顺序。
    expect(sail).toContain('<div className="stop-inner"><p>{intro.desc}</p></div>');
    expect(sail).not.toMatch(/\shidden=\{!open\}/);
    expect(sail).toContain("aria-hidden={!open}");
  });

  it("平铺的三列网格卡片已移除", () => {
    expect(sail).not.toContain('className="trio"');
    expect(sail).not.toContain('className="mini"');
    expect(css).not.toContain(".trio{");
    expect(css).not.toContain(".mini{");
  });

  it("压边与推开写在样式里：收起压边、展开推开下一张、行内标题单行", () => {
    expect(css).toMatch(/\.stop\+\.stop\{margin-top:-\d+px/);
    expect(css).toMatch(/\.stop\.open\+\.stop\{margin-top:\d+px\}/);
    expect(css).toMatch(/\.stop-head h4\{[^}]*white-space:nowrap/);
    expect(css).toMatch(/\.stop-head h4\{[^}]*text-overflow:ellipsis/);
    // 展开的那张要盖在别的卡之上，否则阴影与描边会被后一张切掉。
    expect(css).toMatch(/\.stop\.open\{[^}]*z-index:2/);
  });

  it("动效：高度逐帧插值、正文跟进、箭头回弹、整摞错峰入场", () => {
    // 抽屉高度用 0fr→1fr：不写死像素，内容多长都能跟着走（认不出的浏览器退化为瞬时展开）。
    expect(css).toMatch(/\.stop-body\{[^}]*grid-template-rows:0fr/);
    expect(css).toMatch(/\.stop-body\{[^}]*transition:grid-template-rows/);
    expect(css).toMatch(/\.stop\.open \.stop-body\{grid-template-rows:1fr\}/);
    // 正文单独一层透明度 + 位移，比只动高度更有层次。
    expect(css).toMatch(/\.stop-inner p\{[^}]*opacity:0/);
    expect(css).toMatch(/\.stop-inner p\{[^}]*transform:translateY\(-6px\)/);
    expect(css).toMatch(/\.stop\.open \.stop-inner p\{opacity:1;transform:none\}/);
    // 箭头翻转带回弹，压边让位走过渡。
    expect(css).toMatch(/\.stop-cue\{[^}]*var\(--ease-spring\)/);
    expect(css).toMatch(/\.stop\+\.stop\{[^}]*transition:margin-top/);
    // 六张错峰入场：用既有的 arrive 关键帧，逐张加延迟。
    expect(css).toMatch(/\.stop\{[^}]*animation:arrive/);
    expect(css).toMatch(/\.stop:nth-child\(6\)\{animation-delay:/);
  });

  it("减少动态效果时全部动效被压成瞬时", () => {
    const reduced = css.slice(css.indexOf("@media(prefers-reduced-motion:reduce)"));
    expect(reduced).toMatch(/transition-duration:\.001ms!important/);
    expect(reduced).toMatch(/animation-duration:\.001ms!important/);
  });
});
