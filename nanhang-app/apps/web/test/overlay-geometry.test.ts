// 浮层必须 portal 到 body：章节动画的 transform 会把 fixed 后代关进局部包含块。
//
// 负责人 2026-09-20 报的问题（真机截图 + 本机实测双重确认）：
//   · 方向小结卡只在屏幕最底下露出一条边，手机端上下滑不动；
//   · 左右两边各有一条白条。
// 根因：`.view` 挂着入场动画 `animation:arrive`，而 `@keyframes arrive` 里有 `transform`。
// 只要 transform 不是 none（动画运行期间就算），该元素就成为 `position:fixed` 后代的包含块。
// 挂在章节里的背板于是按章节盒子定位。实测（390×844，transform=matrix(1,0,0,1,0,18)）：
//   背板 rect = 18,2162 → 372,2991（354×829）——左边留 18px（.wrap 的内边距）＝白条，
//   高度从章节顶部起算＝卡片底边落到视口下方。
// 2026-09-13 去掉 animation-fill-mode 只解决了「动画结束仍带 fill」这一种情形，
// 动画运行期间照样创建包含块，所以那次没根治。
//
// 现在的机制（由本文件钉住）：
//   1. 三处浮层统一走 `Overlay`，它用 createPortal 挂到 document.body——包含块永远是视口；
//   2. 背板是块级容器，卡片高度相对背板限制（max-height:100% + min-height:0），
//      不用 dvh 这种在部分 WebView 上会算大的单位，卡片底边不可能落到视口外；
//   3. 卡片自己滚（overflow:auto + overscroll-behavior:contain），背板不滚。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
const css = src("style.css");
const overlay = src("overlay.tsx");
const sail = src("chapters/sail.tsx");
const talk = src("chapters/talk.tsx");
const settings = src("chapters/settings.tsx");

describe("浮层挂载点：portal 到 body", () => {
  it("Overlay 用 createPortal 挂到 document.body，并保留背板类名", () => {
    expect(overlay).toContain('import { createPortal } from "react-dom"');
    expect(overlay).toContain("createPortal(backdrop, document.body)");
    expect(overlay).toContain('const { className = "board-backdrop", ...rest2 } = rest');
    // 没有 document 时退回内联，保证测试/SSR 不炸。
    expect(overlay).toContain('if (typeof document === "undefined") return backdrop');
  });

  it("三处浮层（登船卡 / 设置卡 / 方向小结）都走 Overlay，没人再往章节里塞 fixed 背板", () => {
    expect(sail).toContain("import { Overlay }");
    expect(settings).toContain("import { Overlay }");
    expect(talk).toContain("import { Overlay }");
    for (const [name, source] of [["sail", sail], ["settings", settings], ["talk", talk]] as const) {
      expect(source, `${name} 不应再直接写 .board-backdrop 容器`).not.toContain('className="board-backdrop"');
    }
    expect(sail).toContain('<Overlay role="presentation"');
    expect(settings).toContain('<Overlay role="presentation" data-settings="open"');
    expect(talk).toContain('<Overlay role="presentation"');
  });
});

describe("浮层几何：高度跟着视口，卡片自己滚", () => {
  it("手机档用 max-height:100% + min-height:0，不依赖 dvh", () => {
    const start = css.indexOf("@media(max-width:560px){", css.indexOf(".board-backdrop"));
    expect(start, "≤560px 的浮层媒体块应存在").toBeGreaterThanOrEqual(0);
    let depth = 0;
    let block = "";
    for (let i = css.indexOf("{", start); i < css.length; i++) {
      if (css[i] === "{") depth++;
      if (css[i] === "}") { depth--; if (depth === 0) { block = css.slice(start, i + 1); break; } }
    }
    expect(block).toMatch(/\.board-card\{[^}]*max-height:100%/);
    expect(block).toMatch(/\.board-card\{[^}]*min-height:0/);
    expect(block).not.toMatch(/\.board-card\{[^}]*92dvh/);
    expect(block).toContain("align-items:flex-end");
    expect(block).not.toMatch(/\.board-card\{[^}]*transform/);
  });

  it("背板铺满视口、内容不溢出；桌面仍居中", () => {
    expect(css).toMatch(/\.board-backdrop\{[^}]*position:fixed/);
    expect(css).toMatch(/\.board-backdrop\{[^}]*inset:0/);
    expect(css).toMatch(/\.board-backdrop\{[^}]*display:flex/);
    expect(css).toMatch(/\.board-backdrop\{[^}]*align-items:center/);
    expect(css).toMatch(/\.board-backdrop\{[^}]*overflow:hidden/);
    expect(css).toMatch(/\.board-card\{[^}]*overflow:auto/);
    expect(css).toMatch(/\.board-card\{[^}]*overscroll-behavior:contain/);
  });

  it("卡片不做位移入场（只有淡入），避免动画期间位置偏移", () => {
    expect(css).toMatch(/\.board-card\{[^}]*animation:card-fade/);
    const fade = css.match(/@keyframes card-fade\{[^}]*\}/)?.[0] ?? "";
    expect(fade).not.toContain("translate");
    expect(fade).not.toContain("transform");
  });
});
