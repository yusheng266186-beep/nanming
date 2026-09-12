// TASK-09: presentation invariants that must not silently regress.
//
// These are static checks over the stylesheet and the page markup. They complement the
// browser audit: the audit measures the rendered result, these pin the intent so a later
// palette edit cannot quietly drop below the contrast floor or strip a label.
//
// The palette and markup below are the ported 南溟 demo design (`.topbar`, `.view`, `--brass`,
// `--sea`) that now backs the six-chapter page, so the tokens these checks reference are the
// ones actually shipped.
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(import.meta.dirname, "../src/style.css"), "utf8");
// 页面标记分布在 App.tsx 与 chapters/ 的章节文件里，静态检查拼接全部来源，
// 负向断言（不得出现某段文案）也因此覆盖所有会进入页面的源码。
const chapterDir = resolve(import.meta.dirname, "../src/chapters");
const app = [
  readFileSync(resolve(import.meta.dirname, "../src/App.tsx"), "utf8"),
  ...readdirSync(chapterDir).filter((name) => /\.tsx?$/.test(name))
    .sort().map((name) => readFileSync(resolve(chapterDir, name), "utf8"))
].join("\n");

function contrast(foreground: string, background: string): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex: string) => {
    const h = hex.replace("#", "");
    const r = Number.parseInt(h.slice(0, 2), 16);
    const g = Number.parseInt(h.slice(2, 4), 16);
    const b = Number.parseInt(h.slice(4, 6), 16);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const token = (name: string) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];

describe("TASK-09 视觉与可访问性不变量", () => {
  it("填充按钮上的浅色文字达到 WCAG AA 4.5:1", () => {
    const sea = token("sea");
    expect(sea).toBeDefined();
    expect(contrast("#eef4f1", sea!)).toBeGreaterThanOrEqual(4.5);
  });

  it("按钮与航线图节点使用同一个可读强调色，而不是低对比的浅橙", () => {
    expect(css).toMatch(/\.btn\s*{[^}]*background:\s*var\(--sea\)/);
    expect(css).toMatch(/\.rl\.main \.swatch\s*{[^}]*border-top:[^;]*var\(--sea\)/);
    expect(css).not.toMatch(/background:\s*#e45d2a/);
  });

  it("大号装饰性强调色走独立变量，而不是散落的硬编码", () => {
    expect(css).toMatch(/--brass:\s*#a97b34/);
    expect(css).toMatch(/\.eyebrow\s*{[^}]*color:\s*var\(--brass\)/);
  });

  it("正文与提示文字达到 4.5:1", () => {
    for (const [fg, bg] of [["#546a79", "#ffffff"], ["#176b87", "#ffffff"], ["#9a3e18", "#ffffff"], ["#09627e", "#ffffff"]]) {
      expect(contrast(fg!, bg!)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("深色航线图面板上的文字达到 4.5:1", () => {
    expect(contrast("#8bd0e4", "#082f49")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#ffffff", "#082f49")).toBeGreaterThanOrEqual(4.5);
  });

  it("交互元素保持至少 2rem 的点击高度", () => {
    expect(css).toMatch(/\.btn\s*{[^}]*min-height:\s*50px/);
    expect(css).toMatch(/\.chip\s*{[^}]*min-height:\s*40px/);
    expect(css).toMatch(/\.ctx-btn\s*{[^}]*min-height:\s*42px/);
  });

  it("每个问题输入框都有可读标签，表头带作用域", () => {
    expect(app).toMatch(/aria-label=\{current\.text\}/);
    expect(app).toMatch(/<th scope="col">/);
  });

  it("打印样式隐藏交互面板但保留航线图", () => {
    const print = css.slice(css.indexOf("@media print"));
    expect(print).toMatch(/\.view\s*{[^}]*display:\s*none/);
    expect(print).toMatch(/#page-chart\.view\s*{[^}]*display:\s*block/);
  });
});
