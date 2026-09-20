// 底部六站在极限窄屏（≤340px，320px 设备）不越界：320 上最后一站曾经按不到。
//
// 背景（2026-09-20 设备仿真实测，320×640）：`.bottom-nav button` 的最小宽度是 56px，
// 六站 6×56=336px，加上容器左右各 6px 内边距共 342px，比视口宽 22px——最后一站「航线图」
// 落在视口外（导航条 scrollWidth=342 / clientWidth=320），手指按不到。
// 修法只动 ≤340px 这一档：按钮最小宽度收到 48px、容器内边距收到 4px，六站合计 296px。
// 这里把「320px 装得下」钉成算式，防止以后有人调底部导航时把溢出带回来。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(import.meta.dirname, "../src/style.css"), "utf8");

/** 取出 ≤340px 的媒体块（与 topbar-narrow.test.ts 同一取法：块内没有嵌套 @media）。 */
function narrowBlock(): string {
  const start = css.indexOf("@media(max-width:340px)");
  expect(start, "≤340px 专项块应存在于 style.css").toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") { depth--; if (depth === 0) return css.slice(start, i + 1); }
  }
  throw new Error("unbalanced braces");
}

const BASE_BUTTON_MIN_WIDTH = 56;
const BASE_PADDING = 6;
const STATIONS = 6;
const NARROW_VIEWPORT = 320;

describe("底部导航极限窄屏不变量", () => {
  it("基准规则未被改动：六站按钮最小宽度 56px、容器内边距 6px（390px 及以上观感不变）", () => {
    expect(css).toMatch(new RegExp(`\\.bottom-nav button\\{[^}]*min-width:${BASE_BUTTON_MIN_WIDTH}px`));
    expect(css).toMatch(new RegExp(`\\.bottom-nav\\{[^}]*padding:${BASE_PADDING}px ${BASE_PADDING}px`));
  });

  it("≤340px 六站按修后的宽度确实装得进 320px 视口", () => {
    const block = narrowBlock();
    const minWidth = Number(block.match(/\.bottom-nav button\{[^}]*min-width:\s*(\d+)px/)?.[1]);
    const padding = Number(block.match(/\.bottom-nav\{[^}]*padding-left:\s*(\d+)px/)?.[1]);
    expect(minWidth, "≤340px 应给出按钮最小宽度").toBeGreaterThan(0);
    expect(padding, "≤340px 应给出容器内边距").toBeGreaterThanOrEqual(0);
    expect(minWidth * STATIONS + padding * 2).toBeLessThanOrEqual(NARROW_VIEWPORT);
    // 修之前必须是真的装不下，否则这条守卫就失去意义。
    expect(BASE_BUTTON_MIN_WIDTH * STATIONS + BASE_PADDING * 2).toBeGreaterThan(NARROW_VIEWPORT);
  });

  it("收紧没有把点击高度压到 32px 下限之下", () => {
    const block = narrowBlock();
    const height = Number(block.match(/\.bottom-nav button\{[^}]*min-height:\s*(\d+)px/)?.[1] ?? "48");
    expect(height).toBeGreaterThanOrEqual(32);
    // 基准的 min-height:48px 仍在（窄屏块里没有覆盖它）。
    expect(css).toMatch(/\.bottom-nav button\{[^}]*min-height:48px/);
  });
});
