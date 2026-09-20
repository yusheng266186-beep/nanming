// 起航页「先定下三件事」＝ 行装清单：结构、状态口径与微交互的不变量。
//
// 三件事各有编号印章（01 首选科目 / 02 再选两门 / 03 目标分），钉在一条竖轨上，备好点亮成铜色；
// 卡头是深海底的备航状态带，报出备齐进度与当前选择的原话摘要。这些断言钉住四件事：
// 编号与字段一一对应、状态只来自真实数据（「备齐几件」与「能不能出发」是两回事）、
// 不做假禁用（满 2 门只变淡），以及「清单」这套结构本身——竖轨、状态签、深海底带、
// 逐件入场。它们是设计意图，最容易被一次调样式改掉。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
const sail = src("chapters/sail.tsx");
const css = src("style.css");

describe("起航页：先定下三件事（行装清单）", () => {
  it("三件事各有编号印章，编号与字段一一对应", () => {
    for (const n of ["01", "02", "03"]) {
      expect(sail).toContain(`<i className="seal">${n}</i>`);
    }
    expect(sail).toContain("首选科目</span>");
    expect(sail).toContain("再选科目（正好 2 门）");
    expect(sail).toContain("高考目标分（可不填）");
    // 印章是装饰性的 <i>：它必须挨着可读的字段名，不能成为这一件唯一的说明。
    expect(sail).toContain('<span className="flab-t">首选科目</span>');
  });

  it("印章亮不亮由真实状态决定：首选已选、再选满 2、目标分已填", () => {
    expect(sail).toContain("const additionalFull = state.form.additional.length === 2;");
    expect(sail).toContain('data-ready={state.form.primary !== null ? "true" : "false"}');
    expect(sail).toContain('data-ready={additionalFull ? "true" : "false"}');
    expect(sail).toContain('data-ready={state.form.score !== null ? "true" : "false"}');
    // 「可以出发」的信号只在这两件都备好时出现。
    expect(sail).toContain("const readyToSail = state.form.primary !== null && additionalFull;");
    expect(sail).toContain('data-ready={readyToSail ? "true" : "false"}');
    // 点亮是铜色实心 + 一圈光环，只挂在备好的那一行上（不另存一份状态）。
    expect(css).toMatch(/\.sail-panel \.pack-row\[data-ready="true"\] \.seal\{[^}]*background:var\(--brass\)/);
    expect(css).toMatch(/\.sail-panel \.pack-row\[data-ready="true"\] \.seal\{[^}]*box-shadow:0 0 0 5px rgba\(169,123,52/);
  });

  it("进度数的是三件（含选填的 03），能不能出发仍只看 01 与 02", () => {
    expect(sail).toContain("const packed = (state.form.primary !== null ? 1 : 0) + (additionalFull ? 1 : 0) + (state.form.score !== null ? 1 : 0);");
    expect(sail).toContain('const packWord = readyToSail ? "可以出发" : `还差 ${2 - packed} 件`;');
    expect(sail).toContain("data-packed={packed}");
    expect(sail).toContain('<b className="num">{packed}</b>');
    // 进度线走 scaleX：只动合成层，宽度不参与布局，改选科时不会把下面的三件顶动。
    expect(sail).toContain("transform: `scaleX(${packed / 3})`");
    expect(css).toMatch(/\.pack-track i\{[^}]*transform-origin:left/);
    expect(css).toMatch(/\.pack-track i\{[^}]*transition:transform \.7s var\(--ease-glide\)\}/);
  });

  it("三件钉在一条竖轨上，最后一件下面不再连线", () => {
    expect(css).toMatch(/\.pack-row\{[^}]*grid-template-columns:34px minmax\(0,1fr\)/);
    expect(sail).toContain('<span className="pack-node"><i className="seal">01</i></span>');
    expect(css).toMatch(/\.pack-node::after\{[^}]*background:var\(--line-2\)/);
    expect(css).toMatch(/\.pack-row:last-child \.pack-node::after\{content:none\}/);
    // 备好的那一段轨转铜色，轨上读得出备到哪儿了。
    expect(css).toMatch(/\.pack-row\[data-ready="true"\] \.pack-node::after\{[^}]*var\(--brass-line\)/);
  });

  it("卡头是深海底的备航状态带，摘要就地再说一遍（同一句读给读屏）", () => {
    expect(sail).toContain('className="pack-head"');
    expect(css).toMatch(/\.pack-head\{[^}]*background:var\(--sea\)/);
    expect(sail).toContain('className="muted-note sail-live" aria-live="polite" key={sailSummary}');
    // 深海底上的摘要换回这套深色面的可读色（--foam 在海底上偏暗）。
    expect(css).toMatch(/\.sail-panel \.pack-head \.sail-live\{[^}]*color:#a9c3bd\}/);
    expect(css).toMatch(/\.sail-live\{animation:msgin/);
  });

  it("每件的状态收成一枚状态签，与状态带里的进度说的是同一份事实", () => {
    for (const wording of ['{state.form.primary !== null ? "已定" : "待定"}', "已满 2 门",
      "`${state.form.additional.length}/2 门`", '{state.form.score !== null ? "已填" : "可不填"}']) {
      expect(sail).toContain(wording);
    }
    expect(css).toMatch(/\.pack-row\[data-ready="true"\] \.pack-state\{[^}]*var\(--brass-bg\)/);
    // 状态签紧跟着标题，不靠行右边缘：`.flab-t` 一旦写成 flex:1，
    // 宽屏上签会被推到离标题约 1000px 的地方（1280px 实测），读不出属于哪一件。
    expect(css).toMatch(/\.sail-panel \.pack-field \.flab-t\{min-width:0\}/);
    expect(css).not.toMatch(/\.sail-panel \.pack-field \.flab-t\{[^}]*flex:1 1 auto/);
  });

  it("再选满 2 门后其余 chip 变淡但仍可点，点了给说明而不是静默", () => {
    expect(sail).toContain('data-full={additionalFull ? "true" : "false"}');
    expect(css).toMatch(/\.chips\[data-full="true"\] \.chip:not\(\.on\)\{opacity:\.\d+\}/);
    // 满员时点第三个仍然会走到这段提示，不是 disabled。
    expect(sail).toContain('setToast("再选科目正好 2 门，先取消一门再选。")');
    expect(sail).not.toContain("disabled={additionalFull}");
  });

  it("选中章是一次性的扩散光环，不是常驻描边", () => {
    expect(css).toMatch(/@keyframes seal-ring\{from\{transform:scale\([\d.]+\);opacity:[\d.]+\}to\{transform:scale\([\d.]+\);opacity:0\}\}/);
    expect(css).toMatch(/\.chip\.on::before\{[^}]*animation:seal-ring/);
    expect(css).toMatch(/\.chip\.on::before\{[^}]*forwards/);
  });

  it("清单逐件入场，备齐时出发按钮弹一下", () => {
    expect(css).toMatch(/\.pack-head\{[^}]*animation:fade/);
    expect(css).toMatch(/\.pack-row\{[^}]*animation:arrive/);
    expect(css).toMatch(/\.pack-row:nth-child\(3\)\{animation-delay:\.16s\}/);
    expect(css).toMatch(/\.pack-foot\{[^}]*animation:arrive[^}]*\.24s\}/);
    expect(css).toMatch(/\.panel\.sail-panel\[data-ready="true"\] \.sail-act \.btn\.brass\{animation:arm/);
  });

  it("旧的平铺表单结构已下线，窄屏的对应规则也一并换掉", () => {
    // 老结构：`.grid-2 sail-form` 两栏 + 独立的 `.sail-score` 字段 + `.flab-n` 计数胶囊。
    expect(sail).not.toContain('className="grid-2 sail-form"');
    expect(sail).not.toContain("flab-n");
    expect(css).not.toContain(".sail-form");
    expect(css).not.toContain(".flab-n");
    expect(css).not.toContain(".field.sail-score");
    // 面板自己不再吃内边距（内边距归状态带 / 清单 / 按钮区三段），窄屏也不能把它加回来。
    expect(css).toMatch(/\.panel\.sail-panel\{[^}]*padding:0/);
    // 窄屏的收紧值（2026-09-20 第二轮：上一轮只收外边距、空白仍明显，这轮连行距与状态带一起收）。
    expect(css).toMatch(/#page-sail \.sail-panel\{margin-top:10px;padding:0/);
    expect(css).toMatch(/#page-sail \.pack-row\{[^}]*padding:10px 0\}/);
    expect(css).toMatch(/#page-sail \.pack-head\{padding:14px 16px 12px\}/);
  });

  it("摘要说清了「还没选科」的后果，不是只报状态", () => {
    expect(sail).toContain("位次与资格都会显示为未知");
  });
});
