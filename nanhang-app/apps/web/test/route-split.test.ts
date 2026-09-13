// 定位章的两条路与浮层锁滚动：结构不变量。
//
// 负责人 2026-09-12 定：定位不是一个页面，而是并行的两条——手填几次考试 / 荣县一中接入；
// 登船卡片里选哪条就进哪个页面，两条路都通向「谈心」。这里钉住四件事：选路真的会跳转、
// 两个页面互不掺杂（学校卡与学生手填行不同时出现）、学校数据只在走学校那条路时才算数、
// 以及浮层（登船卡片与设置卡片）开着时整页滚动是锁住的。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");
const app = src("App.tsx");
const sail = src("chapters/sail.tsx");
const locate = src("chapters/locate.tsx");
const shared = src("chapters/shared.ts");
const progress = src("progress.ts");
const lock = src("scroll-lock.ts");

describe("定位章：两条路并行", () => {
  it("路线类型只有一个来源，两条路就叫 manual / school", () => {
    expect(shared).toContain('export type LocateRoute = "manual" | "school";');
    expect(shared).toContain("航程条仍然是六站");
  });

  it("登船卡片选哪条路就进哪个页面，并按当前选择标出已选项", () => {
    expect(sail).toContain('chooseRoute("manual")');
    expect(sail).toContain('chooseRoute("school")');
    expect(sail).toContain('className={`entry${route === "manual" ? " picked" : ""}`}');
    expect(sail).toContain('className={`entry deep${route === "school" ? " picked" : ""}`}');
    // 卡片上的两条入口不再各自直接 setPage：走同一条「记下选过入口 + 定路线 + 进定位」的路。
    // 记下「选过入口」是门禁的一部分（负责人 2026-09-13：没选入口就放行定位，进去是一页空的）。
    expect(sail).not.toContain('setBoardOpen(false); setPage("locate")');
    expect(app).toMatch(/const chooseRoute = \(next: LocateRoute\) => \{\s*setEntryChosen\(true\);\s*setRoute\(next\);\s*goTo\("locate"\);/);
  });

  it("两个页面互不掺杂：学校卡只在学校路，学生手填行只在手填路", () => {
    expect(locate).toContain('{route === "school" && (quality.status !== "ready"');
    expect(locate).toContain('{(route === "manual" || schoolLocked) && <div className="panel"');
    // 学校数据只在走学校那条路时才锁住手填行；否则切换路线后两套规则会混在一起。
    expect(locate).toContain(
      'const schoolLocked = route === "school" && quality.status === "ready" && quality.shard !== null;');
  });

  it("两条路都通向「谈心」：定位段没有分叉到别的章节", () => {
    expect(locate).toContain('setPage("talk")');
    expect(progress).toContain('["locate"]');
    expect(progress).toContain('["talk"]');
    // 门禁里定位仍是一段（两条路共用同一段），没有为路线新增章节。
    expect(progress).not.toContain("manual");
    expect(progress).not.toContain("school");
  });
});

describe("浮层锁滚动", () => {
  it("锁滚动是一个共用钩子：html 与 body 一起锁，退出时按原值还原", () => {
    expect(lock).toContain("export function useScrollLock");
    expect(lock).toContain("document.documentElement");
    expect(lock).toContain("document.body");
    expect(lock).toMatch(/node\.style\.overflow = previous\[index\]/);
  });

  it("登船卡片与设置卡片都挂着它", () => {
    expect(sail).toContain("useScrollLock(boardOpen)");
    expect(app).toContain("useScrollLock(settingsOpen)");
  });
});
