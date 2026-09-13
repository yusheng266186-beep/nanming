// 换页从顶端开始（负责人 2026-09-13：「我通过点击开始起航进入定位之后，它进去的不是页面的最顶端，
// 而是在下面这个地方……从一个界面到下一个界面，应该是从上往下，不应该进入界面是下方」）。
//
// 六个章节是同一个文档里 display 切换的区块，滚动位置本来会留着——上一页滚到哪，下一页就停在哪。
// 所以在 page 变化时把文档滚回顶部，用 useLayoutEffect（绘制前滚，不会先闪一下中段）+
// behavior:"instant"（全局 html{scroll-behavior:smooth} 会把这次跳转变成一段动画）。
// 这条测试钉住这段代码还在，并且没有被换成普通 useEffect 或 behavior 默认值。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const app = readFileSync(resolve(import.meta.dirname, "../src/App.tsx"), "utf8");

describe("换页从顶端开始", () => {
  it("page 一变就滚回顶部，且在绘制前执行", () => {
    expect(app).toContain("useLayoutEffect(() => {");
    expect(app).toContain('window.scrollTo({ top: 0, left: 0, behavior: "instant" });');
    expect(app).toMatch(/useLayoutEffect\(\(\) => \{\s*window\.scrollTo\(\{ top: 0, left: 0, behavior: "instant" \}\);\s*\}, \[page\]\);/);
  });

  it("用 instant 而不是让全局的平滑滚动接管", () => {
    // 样式表里 html{scroll-behavior:smooth} 是给锚点用的；换页跳转必须绕开它。
    expect(app).not.toContain('window.scrollTo({ top: 0, behavior: "smooth" })');
    expect(app).toContain("全局 `html{scroll-behavior:smooth}` 会把这次跳转变成一段动画");
  });
});
