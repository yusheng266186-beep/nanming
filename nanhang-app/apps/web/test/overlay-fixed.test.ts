// 浮层必须贴着视口（负责人 2026-09-13：「首页点击开始起航之后，弹出来那个卡片为什么两边有遮挡，
// 而且这个卡片有 bug，它跳转的时候无法固定，导致下方的有一节被遮挡住了」）。
//
// 根因不是浮层本身，而是章节的入场动画：`.view{animation:arrive … both}` 带了 fill，
// 浏览器会把「动画还在（含 fill）」的元素当成仍在动 transform 的元素，于是它成为 position:fixed 后代的
// 包含块——挂在章节里的浮层就以章节盒子为参照：
//   · 背板只盖住章节的宽（两侧露出页面底色）＝「两边有遮挡」；
//   · 卡片只能对齐章节底部，页面一滚就跟着走＝「跳转时无法固定，下方一节被遮挡」。
// 实测（390×844，fill=both）：背板 rect=[18,-1224,354,2079]；去掉 fill 后=[0,0,390,844]。
// 这条测试钉住「章节动画不带 fill」与「浮层是 fixed」两件事，避免以后有人顺手把 both 加回来。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
const css = src("style.css");
const sail = src("chapters/sail.tsx");

describe("浮层贴视口", () => {
  it("章节入场动画不带 fill：否则它会成为 fixed 后代的包含块", () => {
    const view = /(?:^|\n)\.view\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(view).toContain("animation:arrive .65s var(--ease)");
    expect(view).not.toMatch(/animation:[^;}]*\b(both|forwards|backwards)\b/);
    // 说明也留在样式表里，方便下一个人看懂为什么不能加回来
    expect(css).toContain("不能带 fill");
  });

  it("登船卡片与其它浮层的背板都是 position:fixed 且铺满视口", () => {
    const backdrop = /\.board-backdrop\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(backdrop).toContain("position:fixed");
    expect(backdrop).toContain("inset:0");
    // 移动端是一条自下而上的整屏弹层：背板不留内边距，卡片自己贴底并吃安全区
    expect(css).toContain(".board-backdrop{padding:0;align-items:end}");
    expect(css).toMatch(/\.board-card\{[^}]*max-height:92dvh/);
    expect(css).toMatch(/\.board-card\{[^}]*env\(safe-area-inset-bottom\)/);
  });

  it("登船卡片挂在章节里（所以上面那条 fill 规则才是关键）", () => {
    expect(sail).toContain('className="board-backdrop"');
    expect(sail).toContain('role="dialog"');
    expect(sail).toContain('aria-modal="true"');
  });
});
