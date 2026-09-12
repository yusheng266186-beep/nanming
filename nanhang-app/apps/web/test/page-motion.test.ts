// 谈心 / 方向 / 分数轴 / 航线图：动画适配的不变量。
//
// 四页的动效与起航、定位同一套语言：块自上而下错峰落位，数字与刻度「在原地长出来」，
// 能点的东西有悬停与按下反馈。这些断言钉住三件事：动效只作用在各自那一页、
// 三处不能被动 transform 的元素（端点对齐的刻度、自带旋转的印章与罗盘）没有被误伤、
// 以及航线图的图内动效仍归正在重画它的那条线（本轮只做外壳）。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
const css = src("style.css");

const start = css.indexOf("谈心 / 方向 / 分数轴 / 航线图：动画适配");
// 切到「下一个区块横幅」为止：这样以后在它后面插入别的样式块，也不会被算进这一块里
// （按 reduced-motion 之类的位置切会在下一次插入后失效——本轮就踩过一次）。
const nextBlock = css.indexOf("/* ══════════", start);
const block = css.slice(start, nextBlock === -1 ? css.length : nextBlock);
const rules = block.split("\n").map((line) => line.trim()).filter((line) => line.includes("{"));

describe("四页动效：编排", () => {
  it("谈心：房间三段先后落位，可点答案逐条出现，连上时扩一下", () => {
    expect(block).toContain("#page-talk .talk{animation:arrive");
    expect(block).toContain("#page-talk .chat-head{animation:fade");
    expect(block).toContain("#page-talk .dock{animation:fade");
    expect(block).toContain("#page-talk .qopt{animation:msgin");
    expect(block).toContain("#page-talk .qopt:nth-child(n+5){animation-delay:.2s}");
    expect(block).toContain("#page-talk .ch-state.on{animation:seal-pop");
  });

  it("方向：整页逐块落位，chip 与胶囊逐条出现", () => {
    expect(block).toContain("#page-direction>*{animation:arrive");
    expect(block).toContain("#page-direction .chips .chip{animation:msgin");
    expect(block).toContain("#page-direction .chips .chip:nth-child(n+6){animation-delay:.15s}");
    expect(block).toContain("#page-direction .vlist .vpill{animation:msgin");
  });

  it("分数轴：金带展开、刻度报到、链条与候选卡逐段落位", () => {
    expect(block).toContain("#page-axis .axis-band{transform-origin:center;animation:band-open");
    expect(block).toContain("#page-axis .delta-num{animation:num-in");
    expect(block).toContain("#page-axis .chain-seg{animation:fade");
    expect(block).toContain("#page-axis .scard:nth-child(n+5){animation-delay:.22s}");
    expect(block).toContain("@keyframes band-open{from{transform:scaleX(.86);opacity:0}");
  });

  it("航线图：外壳与结果列表落位，图内 SVG 的动效不在这里抢", () => {
    expect(block).toContain("#page-chart .chart-head{animation:msgin");
    expect(block).toContain("#page-chart .res-bar{animation:msgin");
    expect(block).toContain("#page-chart .srow{animation:msgin");
    expect(block).toContain("#page-chart .blessing{animation:arrive");
    // 图内元素（rt-*）的入场归正在重画这块的那条线：本轮不在同一份样式里重复定义。
    expect(block).not.toContain(".rt-row");
    expect(block).not.toContain(".rt-boat");
  });
});

describe("四页动效：不许误伤的三处", () => {
  it("端点对齐的刻度只淡入：动 transform 会把 translateX 的居中压掉", () => {
    expect(block).toContain("#page-axis .stick{animation:fade");
    for (const line of rules) {
      if (!line.includes("#page-axis .stick")) continue;
      expect(line).not.toMatch(/translate|arrive|msgin|scaleX/);
    }
  });

  it("自带旋转的元素不动：印章与罗盘的 animation 不被覆盖", () => {
    for (const line of rules) {
      expect(line).not.toMatch(/\.seal\s*\{[^}]*animation:/);
      expect(line).not.toMatch(/\.head-rose\s*\{[^}]*animation:/);
    }
    // 既有的两条旋转动画仍在样式表里。
    expect(css).toMatch(/\.chart-head \.seal\{[^}]*animation:spin/);
    expect(css).toMatch(/\.head-rose\{[^}]*animation:spin/);
  });

  it("新规则全部带页面作用域，不漏到别的章节", () => {
    for (const line of rules) {
      if (line.startsWith("@")) continue;
      expect(line.startsWith("#page-talk") || line.startsWith("#page-direction")
        || line.startsWith("#page-axis") || line.startsWith("#page-chart"), `未加作用域的规则：${line}`).toBe(true);
    }
  });
});
