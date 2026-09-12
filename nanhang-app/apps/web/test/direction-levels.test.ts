// 方向页的两级选择：大类与小类不是同级，视觉上必须分得开。
//
// 负责人 2026-09-12 指出：两级原来都用同一个 .chip（同为胶囊、选中同为铜色），看着像一排并列，
// 其实是从属关系。这里钉住三件事：两级各有自己的类名、颜色/形状/字号分开、展开的小类区
// 在结构上缩进并挂一条竖线（读起来是「挂在上面那个大类底下」）。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
const direction = src("chapters/direction.tsx");
const css = src("style.css");

const block = css.slice(css.indexOf("方向页：两级选择"), css.indexOf("/* ══════════ 设置卡"));

describe("方向页：大类与小类分层", () => {
  it("两级各有自己的类名，不再是同一个 .chip", () => {
    expect(direction).toContain("chip group-chip${pickedGroups.includes(group.id) ? \" on\" : \"\"}");
    expect(direction).toContain("chip class-chip${picks.includes(cls.id) ? \" brass on\" : \"\"}");
    // 大类选中不再用铜色（铜色是「学生勾的小类」那一系），改用 .chip.on 的深海。
    expect(direction).not.toContain("chip${pickedGroups.includes(group.id) ? \" brass on\"");
    // 展开的小类区整块有类名，才能缩进 + 挂竖线。
    expect(direction).toContain('<div className="class-row" key={group.id}');
  });

  it("颜色与形状分开：大类是海绿的「范围」标签，小类是铜系胶囊", () => {
    expect(block).toMatch(/#page-direction \.group-chip\{[^}]*border-radius:10px/);
    expect(block).toMatch(/#page-direction \.group-chip\{[^}]*color:var\(--sea\)/);
    expect(block).toMatch(/#page-direction \.class-chip\{[^}]*border-color:var\(--brass-line\)/);
    expect(block).toMatch(/#page-direction \.class-chip\{[^}]*font-size:12px/);
    // 大类字号比小类大一档（层级差）。
    expect(block).toMatch(/#page-direction \.group-chip\{[^}]*font-size:13px/);
  });

  it("从属关系有结构暗示：小类区缩进 + 左侧一条铜色竖线", () => {
    expect(block).toMatch(/#page-direction \.class-row\{[^}]*margin-left:14px/);
    expect(block).toMatch(/#page-direction \.class-row\{[^}]*border-left:2px solid var\(--brass-line\)/);
    // 窄屏把缩进收一半，别把可点区域挤窄。
    expect(block).toMatch(/@media\(max-width:640px\)\{#page-direction \.class-row\{margin-left:6px;padding-left:11px\}\}/);
  });


  it("两级都必须有明确的选中态，且不会被基础规则按回默认底色", () => {
    // 上一版的 bug：基础规则里写了 background（带 # 作用域 → 权重高于全局的选中态），
    // 于是大类选中后看不出任何变化。
    expect(block).toMatch(/#page-direction \.group-chip\.on,#page-direction \.group-chip\[aria-pressed="true"\]\{\s*background:var\(--sea\);border-color:var\(--sea\);color:#eef4f1\}/);
    expect(block).toMatch(/#page-direction \.class-chip\.on,#page-direction \.class-chip\[aria-pressed="true"\]\{\s*background:var\(--brass\);border-color:var\(--brass\);color:#fff8ec\}/);
    // 未选中规则里不许出现 background（它会把选中态压掉）。
    const base = block.split("/* 选中")[0];
    for (const line of base.split(/[\r\n]+/).map((l) => l.trim()).filter((l) => l.includes("{"))) {
      expect(line).not.toMatch(/background:\s*var\(--card\)/);
    }
    // 悬停也不能压过选中：只对未选中的生效。
    expect(block).toMatch(/#page-direction \.group-chip:not\(\[aria-pressed="true"\]\):hover/);
    expect(block).toMatch(/#page-direction \.class-chip:not\(\[aria-pressed="true"\]\):hover/);
    // 选中时计数小字提亮，两级的对比都够。
    expect(block).toContain('#page-direction .group-chip[aria-pressed="true"] small{color:#a9c3bd}');
    expect(block).toContain('#page-direction .class-chip[aria-pressed="true"] small{color:#f6e7cf}');
  });

  it("只在方向页生效，不泄漏到别处（.chip 是全局组件）", () => {
    for (const line of block.split("\n").map((l) => l.trim()).filter((l) => l.includes("{"))) {
      if (line.startsWith("@")) continue;
      expect(line.startsWith("#page-direction"), `未加作用域的规则：${line}`).toBe(true);
    }
  });
});
