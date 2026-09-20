// 登船口的「同一次点击」放行：2026-09-20 实测到的自相矛盾提示，钉住修复。
//
// 登船卡片上点「全国通用模式／荣县一中」是**一个动作**：先记下选过入口、再进定位。
// 但 goTo 判门禁用到的 progress 是本次渲染的旧值（entryChosen 还是 false），于是第一次点
// 只会弹一句「先完成起航（…再点开始起航选一条登船口）」——入口已经选好了，提示与事实相反。
// 这里测的是纯判据：只有「本次点击刚选下入口」这一步放宽，其它页面照旧按进度算。
import { describe, expect, it } from "vitest";
import { initialState } from "../src/model.js";
import { canOpen, entryChosenGate, lockHint, type ProgressInput } from "../src/progress.js";

const subjectsChosen: ProgressInput = {
  state: {
    ...initialState(),
    form: { ...initialState().form, primary: "PHYSICS", additional: ["CHEMISTRY", "BIOLOGY"] }
  },
  rangeKnown: false, poolReady: false,
  picks: 0, suggestionCount: 0, chatted: false, entryChosen: false
};

describe("登船口：同一次点击里刚选下入口", () => {
  it("选科齐全但还没选入口时，定位仍然锁着（不旁路门禁）", () => {
    expect(canOpen("locate", subjectsChosen, 0)).toBe(false);
    expect(entryChosenGate("locate", subjectsChosen, 0)).toBe(true);
  });

  it("没选齐选科时，选入口也进不去——放行只补「选过入口」这一项", () => {
    const subjectsIncomplete: ProgressInput = {
      ...subjectsChosen,
      state: { ...initialState(), form: { ...initialState().form, primary: "PHYSICS", additional: ["CHEMISTRY"] } }
    };
    expect(entryChosenGate("locate", subjectsIncomplete, 0)).toBe(false);
    expect(lockHint("locate", subjectsIncomplete)).toContain("起航");
  });

  it("放行只到定位这一站：谈心及以后仍按真实进度算", () => {
    for (const id of ["talk", "direction", "axis", "chart"] as const) {
      expect(entryChosenGate(id, subjectsChosen, 0)).toBe(false);
    }
  });

  it("回看依旧不受影响：已经解锁过的段位由 maxStage 兜住", () => {
    expect(entryChosenGate("chart", subjectsChosen, 5)).toBe(true);
  });
});
