// 顶栏极限窄屏（≤340px）不变量：320px 设备上顶栏不再把页面顶出横向滚动。
//
// 背景：品牌（flex-shrink:0）与 .head-end（flex-shrink:0）的最小宽度在 320px 下超出容器，
// 曾实测横向溢出约 18px。修法是只 在 ≤340px 收紧三件部件，并允许 .head-end 收缩、
// 上下文文字省略号兜底。这里把机制钉住，防止之后有人调顶栏样式时悄悄把溢出带回来。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(import.meta.dirname, "../src/style.css"), "utf8");

// 取出 ≤340px 的媒体块（花括号配对，块内没有嵌套 @media）。
function narrowBlock(): string {
  const start = css.indexOf("@media(max-width:340px)");
  expect(start, "顶栏 ≤340px 专项块应存在于 style.css").toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") { depth--; if (depth === 0) return css.slice(start, i + 1); }
  }
  throw new Error("unbalanced braces");
}

describe("顶栏极限窄屏不变量", () => {
  it("基础规则未被改动：桌面 .head-end 仍不可收缩，.ctx-btn 基准点击高度保持 42px", () => {
    expect(css).toMatch(/\.head-end{[^}]*flex-shrink:0/);
    expect(css).toMatch(/\.ctx-btn\s*{[^}]*min-height:\s*42px/);
  });

  it("≤340px 允许 .head-end 收缩，文字以省略号兜底，不再撑破容器", () => {
    const block = narrowBlock();
    expect(block).toMatch(/\.head-end{[^}]*flex-shrink:\s*1/);
    expect(block).toMatch(/\.head-end{[^}]*min-width:\s*0/);
    expect(block).toMatch(/\.ctx-btn>span{[^}]*text-overflow:\s*ellipsis/);
    expect(block).toMatch(/\.ctx-btn{[^}]*min-width:\s*0/);
  });

  it("≤340px 收紧后的点击高度仍在 32px 下限之上", () => {
    const block = narrowBlock();
    const ctx = Number(block.match(/\.ctx-btn{[^}]*min-height:\s*(\d+)px/)?.[1]);
    const avatar = Number(block.match(/\.avatar{[^}]*width:\s*(\d+)px/)?.[1]);
    expect(ctx).toBeGreaterThanOrEqual(32);
    expect(avatar).toBeGreaterThanOrEqual(32);
  });

  it("专项块只对 ≤340px 生效，不改动 390px 及以上的既有观感", () => {
    expect(css.match(/@media\(max-width:340px\)/g)).toHaveLength(1);
    // 已有的窄屏档位保持原样：400/560/820 三个断点仍然存在。
    for (const bp of [400, 560, 820]) {
      expect(css).toContain(`@media(max-width:${bp}px)`);
    }
  });
});
