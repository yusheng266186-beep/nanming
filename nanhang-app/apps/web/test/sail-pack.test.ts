// 起航页「先定下三件事」：印章状态与微交互的不变量。
//
// 三件事各自有编号印章（01 首选科目 / 02 再选两门 / 03 目标分），备好点亮成铜色；
// 选中的 chip 盖一枚一次性的扩散光环；再选满 2 门后其余 chip 变淡但仍可点（点了给说明）。
// 这里钉住「编号、状态来源、以及不做假禁用」三件事——它们是设计意图，最容易被一次调样式改掉。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
const sail = src("chapters/sail.tsx");
const css = src("style.css");

describe("起航页：先定下三件事", () => {
  it("三件事各有编号印章，编号与字段一一对应", () => {
    for (const n of ["01", "02", "03"]) {
      expect(sail).toContain(`<i className="seal">${n}</i>`);
    }
    expect(sail).toContain("首选科目</span>");
    expect(sail).toContain("再选科目（正好 2 门）");
    expect(sail).toContain("高考目标分（可不填）");
  });

  it("印章亮不亮由真实状态决定：首选已选、再选满 2、目标分已填", () => {
    expect(sail).toContain("const additionalFull = state.form.additional.length === 2;");
    expect(sail).toContain("data-ready={state.form.primary !== null ? \"true\" : \"false\"}");
    expect(sail).toContain("data-ready={additionalFull ? \"true\" : \"false\"}");
    expect(sail).toContain("data-ready={state.form.score !== null ? \"true\" : \"false\"}");
    // 「可以出发」的信号只在这两件都备好时出现。
    expect(sail).toContain("const readyToSail = state.form.primary !== null && additionalFull;");
    expect(sail).toContain('data-ready={readyToSail ? "true" : "false"}');
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

  it("三件事逐件入场，备齐时出发按钮弹一下", () => {
    expect(css).toMatch(/\.sail-panel \.sail-form \.field\{animation:arrive/);
    expect(css).toMatch(/\.sail-panel \.sail-score\{animation:arrive[^}]*\.14s\}/);
    expect(css).toMatch(/\.panel\.sail-panel\[data-ready="true"\] \.sail-act \.btn\.brass\{animation:arm/);
  });

  it("摘要每次变化重新淡入，并且说给读屏", () => {
    expect(sail).toContain('className="muted-note sail-live" aria-live="polite" key={sailSummary}');
    expect(css).toMatch(/\.sail-live\{animation:msgin/);
    // 印章编号用的是装饰性 <i>，必须留在 aria-hidden 之外的可读文本旁边，不能被当成唯一的说明。
    expect(sail).toContain("位次与资格都会显示为未知");
  });
});
