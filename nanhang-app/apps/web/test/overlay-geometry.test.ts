// 浮层卡片的几何不变量：卡片不许被入场动效推出视口（负责人 2026-09-20 实测到的「缩在底部看不见」）。
//
// 背景：`.board-card` 原来挂着两段位移动画（桌面 translateY(26px)、≤560px translateY(60px)），
// 手机档实测动画期间卡片底边比视口底多出正好 60px——那半秒里正文和底部按钮都在屏幕外，
// 看起来就像卡片缩在底部、还滑不动。修法是入场只做淡入，位移交给背板，卡片位置从第一帧就定住。
// 这里把机制钉住：卡片本身不带 transform 动画、容器能居中/贴底、卡片自己可滚。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(import.meta.dirname, "../src/style.css"), "utf8");

describe("浮层卡片几何不变量", () => {
  it("卡片不做位移入场，只有淡入", () => {
    expect(css).toMatch(/\.board-card\{[^}]*animation:card-fade/);
    expect(css).not.toMatch(/@keyframes board-rise/);
    expect(css).not.toMatch(/@keyframes board-sheet/);
    // 关键帧本身也不许出现 translate：只要卡片带 transform，位置就会在动画期间偏移。
    const fade = css.match(/@keyframes card-fade\{[^}]*\}/)?.[0] ?? "";
    expect(fade).not.toContain("translate");
    expect(fade).not.toContain("transform");
  });

  it("容器负责定位：桌面居中、手机贴底，且卡片自己能滚", () => {
    expect(css).toMatch(/\.board-backdrop\{[^}]*display:flex/);
    expect(css).toMatch(/\.board-backdrop\{[^}]*align-items:center/);
    expect(css).toMatch(/\.board-backdrop\{[^}]*justify-content:center/);
    // ≤560px 才贴底，且此时卡片不再改 animation（改回位移动画就会重现那个 60px 偏移）。
    // 用花括号配对取出整个媒体块：块里有注释，不能靠"第一个 }"截断。
    const start = css.indexOf("@media(max-width:560px){", css.indexOf(".board-backdrop"));
    expect(start, "≤560px 的浮层媒体块应存在").toBeGreaterThanOrEqual(0);
    let depth = 0;
    let block = "";
    for (let i = css.indexOf("{", start); i < css.length; i++) {
      if (css[i] === "{") depth++;
      if (css[i] === "}") { depth--; if (depth === 0) { block = css.slice(start, i + 1); break; } }
    }
    expect(block).toContain("align-items:flex-end");
    expect(block).toMatch(/\.board-card\{[^}]*max-height:92dvh/);
    expect(block).not.toMatch(/\.board-card\{[^}]*transform/);
    expect(block).not.toMatch(/\.board-card\{[^}]*animation:(board-rise|board-sheet)/);
    expect(css).toMatch(/\.board-card\{[^}]*overflow:auto/);
  });

  it("谈心室输入框没有拖拽改高的手柄（右下角那两条斜杠）", () => {
    expect(css).toMatch(/\.dock-row textarea\.inp\{resize:none\}/);
  });
});
