// 谈心：进对话之后的房间形态。
//
// 负责人 2026-09-12 定：选好聊法进到聊天界面之后，不再给切换引航 / 泛舟的按钮；
// 聊天区要放大到接近整屏，不再只显示一两句。这些断言钉住「按钮不回来」与
// 「高度跟着视口算、消息区 flex 撑满」两件事——它们最容易被一次排版调整改回去。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
const talk = src("chapters/talk.tsx");
const css = src("style.css");

describe("谈心：进对话后的房间", () => {
  it("对话里不再有聊法切换按钮：聊法只在进对话之前选一次", () => {
    expect(talk).not.toContain("dock-ctrl");
    expect(talk).not.toContain('className="dc-k"');
    expect(css).not.toContain(".dock-ctrl{");
    // 进对话之前那张选择卡还在（学生仍然选一次），切换函数也仍然只在那儿用。
    expect(talk).toContain('className="voyage-card"');
    expect(talk).toContain("withMode(ai, choice.value)");
  });

  it("按钮可以去，状态得留着：当前档位仍显示在对话头部", () => {
    expect(talk).toContain('className="ch-tier"');
  });

  it("聊天区跟着视口给高度，消息区撑满剩余空间", () => {
    expect(css).toMatch(/\.chat\{display:flex;flex-direction:column;height:clamp\(\d+px,calc\(100dvh - \d+px\),\d+px\)\}/);
    expect(css).toMatch(/\.chat-head,\.dock\{flex:0 0 auto\}/);
    expect(css).toMatch(/\.chat-scroll\{flex:1 1 auto;min-height:0;max-height:none\}/);
  });

  it("放大的是房间不是每一行：容器放宽但气泡仍限宽", () => {
    expect(css).toMatch(/\.talk\{max-width:min\(1024px,100%\)\}/);
    expect(css).toMatch(/\.bub\{max-width:min\(82%,560px\)\}/);
  });

  it("手机上再放宽一档高度", () => {
    expect(css).toContain(".chat{height:clamp(360px,calc(100dvh - 200px),760px)}");
  });
});
