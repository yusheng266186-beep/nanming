// 章节门禁：一步一步来、不许跳、可以回看。
// 这里只测纯逻辑（progress.ts），界面上「点了没跳只给提示」由 App 里的 goTo 保证。
// 成绩章已并入定位（负责人裁定）：拿成绩的手填/学校接入都发生在定位页内，
// 门禁只看「探索区间是否生成」这一个产出。
import { describe, expect, it } from "vitest";
import { initialState, type WebState } from "../src/model.js";
import type { PageId } from "../src/chapters/shared.js";
import {
  DONE_HINT, STAGES, canOpen, chapterDone, isDone, lockHint, stageOf, unlockedStage, type ProgressInput
} from "../src/progress.js";

const blank: ProgressInput = {
  state: initialState(), rangeKnown: false, poolReady: false,
  picks: 0, suggestionCount: 0, chatted: false
};

const withInput = (patch: Partial<ProgressInput>): ProgressInput => ({ ...blank, ...patch });

function form(patch: Partial<WebState["form"]>): WebState {
  return { ...initialState(), form: { ...initialState().form, ...patch } };
}

/** 按顺序完成各段，返回每一步之后的输入。 */
function completedThrough(stage: number): ProgressInput {
  return withInput({
    state: form({ primary: "PHYSICS", additional: ["CHEMISTRY", "BIOLOGY"], score: 600 }),
    rangeKnown: stage >= 1,
    poolReady: stage >= 2,
    chatted: stage >= 3,
    picks: stage >= 4 ? 2 : 0
  });
}

describe("每一步「完成」的判定", () => {
  it("起航：首选 + 两门再选才算完成（分数可以不填）", () => {
    expect(chapterDone("sail", blank)).toBe(false);
    expect(chapterDone("sail", withInput({ state: form({ primary: "PHYSICS" }) }))).toBe(false);
    expect(chapterDone("sail", withInput({ state: form({ primary: "PHYSICS", additional: ["CHEMISTRY"] }) }))).toBe(false);
    expect(chapterDone("sail", withInput({
      state: form({ primary: "PHYSICS", additional: ["CHEMISTRY", "BIOLOGY"] })
    }))).toBe(true);
  });

  it("定位：有探索区间才算完成——手填考试或接入学校数据都通向它", () => {
    expect(chapterDone("locate", blank)).toBe(false);
    expect(chapterDone("locate", withInput({ rangeKnown: true }))).toBe(true);
  });

  it("航线图：前面每一段都完成才算完成（不是一进来就打勾）", () => {
    expect(chapterDone("chart", blank)).toBe(false);
    expect(chapterDone("chart", completedThrough(0))).toBe(false);
    expect(chapterDone("chart", completedThrough(4))).toBe(true);
  });

  it("分数轴：跑过区间匹配才算；谈心：聊过才算；方向：自选或采用建议都算", () => {
    expect(chapterDone("axis", withInput({ poolReady: true }))).toBe(true);
    expect(chapterDone("talk", withInput({ chatted: true }))).toBe(true);
    expect(chapterDone("direction", withInput({ picks: 1 }))).toBe(true);
    expect(chapterDone("direction", withInput({ suggestionCount: 1 }))).toBe(true);
    expect(chapterDone("direction", blank)).toBe(false);
  });
});

describe("解锁顺序", () => {
  it("什么都没做时只能进起航", () => {
    for (const id of STAGES.flat()) {
      expect(canOpen(id, blank, 0)).toBe(id === "sail");
    }
  });

  it("选完科之后定位解锁；分数轴仍然锁着", () => {
    const input = completedThrough(0);
    expect(unlockedStage(input)).toBe(1);
    expect(canOpen("locate", input, 1)).toBe(true);
    expect(canOpen("axis", input, 1)).toBe(false);
    expect(canOpen("talk", input, 1)).toBe(false);
    expect(canOpen("chart", input, 1)).toBe(false);
  });

  it("一段一段往前开：区间 → 匹配 → 谈心 → 自选 → 航线图", () => {
    expect(unlockedStage(completedThrough(1))).toBe(2);
    expect(canOpen("axis", completedThrough(1), 2)).toBe(true);
    expect(canOpen("talk", completedThrough(1), 2)).toBe(false);
    expect(canOpen("talk", completedThrough(2), 3)).toBe(true);
    expect(canOpen("direction", completedThrough(2), 3)).toBe(false);
    expect(canOpen("direction", completedThrough(3), 4)).toBe(true);
    expect(canOpen("chart", completedThrough(3), 4)).toBe(false);
    expect(canOpen("chart", completedThrough(4), 5)).toBe(true);
  });

  it("不接学校数据也能往下走：只要探索区间生成（手填或目标分），定位即算完成", () => {
    const generic = withInput({
      state: form({ primary: "HISTORY", additional: ["POLITICS", "GEOGRAPHY"] }),
      rangeKnown: true
    });
    expect(unlockedStage(generic)).toBe(2);
    expect(canOpen("axis", generic, 2)).toBe(true);
  });

  it("同一个数据不许跳步：直接点航线图会被挡下（未解锁）", () => {
    expect(canOpen("chart", completedThrough(2), 3)).toBe(false);
    expect(canOpen("chart", completedThrough(4), 5)).toBe(true);
  });
});

describe("回看与单调解锁", () => {
  it("解锁过的章节不会因为回去改数据而重新锁上", () => {
    const maxStage = 5; // 已经一路走到航线图
    const emptied = withInput({ state: initialState(), rangeKnown: false }); // 学生回去把数据改了/清了
    for (const id of STAGES.flat()) expect(canOpen(id, emptied, maxStage)).toBe(true);
  });

  it("但「完成」标记如实回退：改了数据就不再显示已完成", () => {
    expect(isDone("sail", withInput({ state: form({ primary: "PHYSICS", additional: ["CHEMISTRY", "BIOLOGY"] }) }))).toBe(true);
    expect(isDone("sail", withInput({ state: form({ primary: null, additional: [] }) }))).toBe(false);
  });
});

describe("锁定提示指名道姓", () => {
  it("提示里写明缺的那一步和它的完成条件", () => {
    const hint = lockHint("axis", completedThrough(0));
    expect(hint).toContain("定位");
    expect(hint).toContain(DONE_HINT.locate);
  });

  it("缺的是单入口段时只说那一个", () => {
    const hint = lockHint("direction", completedThrough(2)); // 缺谈心
    expect(hint).toContain("谈心");
    expect(hint).not.toContain("定位");
    expect(hint).toContain(DONE_HINT.talk);
  });

  it("每一段都缺的时候先指最早的那一段", () => {
    expect(lockHint("chart", blank)).toContain("起航");
  });
});

describe("分段表本身", () => {
  it("六个章节都在分段表里，且只出现一次", () => {
    const flat = STAGES.flat();
    expect(flat).toHaveLength(6);
    expect(new Set(flat).size).toBe(6);
    for (const id of ["sail", "locate", "talk", "direction", "axis", "chart"] as PageId[]) {
      expect(stageOf(id)).toBeLessThan(STAGES.length);
    }
  });
});
