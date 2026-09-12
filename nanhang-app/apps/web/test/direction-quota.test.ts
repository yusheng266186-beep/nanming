// 「方向收口」的判定与冻结：纯函数行为测试。
//
// 借北辰的做法（到量即停；之后仍可继续聊，但画像不再变）：南溟把「量」定义成方向覆盖——
// 小类满 5 个且分属 2 个以上大类就算聊够，另有轮数兜底；收口后合并只冻结、不新增。
import { describe, expect, it } from "vitest";
import {
  DIRECTION_QUOTA, coveredGroups, directionTalkSettled, groupIdOf, mergeSuggestions, trimSuggestions
} from "../src/direction-quota.js";
import type { CatalogGroup } from "../src/journey-model.js";

// 只用到 id，其余字段与目录结构保持一致（用不着，但要形状对得上）。
const groups = [
  { id: "g-eng", name: "工学", classes: [{ id: "c-1" }, { id: "c-2" }, { id: "c-3" }] },
  { id: "g-sci", name: "理学", classes: [{ id: "c-4" }, { id: "c-5" }] },
  { id: "g-lit", name: "文学", classes: [{ id: "c-6" }] },
  { id: "g-agr", name: "农学", classes: [{ id: "c-7" }] }
] as unknown as CatalogGroup[];

const s = (directionId: string, rationale = "理由") => ({ directionId, rationale, evidenceIds: ["ev-1"] });

describe("方向收口：算不算聊够", () => {
  it("没有建议就不算——宁可多聊一轮，也不凭空收口", () => {
    expect(directionTalkSettled([], groups, 20)).toBe(false);
  });

  it("小类够但只在一个大类里：还不算（负责人要的是两三个大类）", () => {
    // 目录里 g-eng 只有三个类，凑不出 5 个；这里直接构造 5 条同组建议验证判据。
    const sameGroup = [s("c-1"), s("c-2"), s("c-3"), s("c-1"), s("c-2")];
    expect(coveredGroups(sameGroup, groups)).toEqual(["g-eng"]);
    expect(directionTalkSettled(sameGroup, groups, 3)).toBe(false);
  });

  it("满 5 个小类、跨 2 个大类：算聊够了", () => {
    const five = [s("c-1"), s("c-2"), s("c-3"), s("c-4"), s("c-5")];
    expect(coveredGroups(five, groups)).toEqual(["g-eng", "g-sci"]);
    expect(directionTalkSettled(five, groups, 5)).toBe(true);
  });

  it("轮数兜底：已经有建议但覆盖不够时，聊满 8 轮也收口，不让学生一直等", () => {
    const two = [s("c-1"), s("c-2")];
    expect(directionTalkSettled(two, groups, DIRECTION_QUOTA.readyTurns - 1)).toBe(false);
    expect(directionTalkSettled(two, groups, DIRECTION_QUOTA.readyTurns)).toBe(true);
  });

  it("目录里没有的专业类不算进覆盖，也不会被当成新大类", () => {
    expect(groupIdOf("c-不存在", groups)).toBeNull();
    expect(coveredGroups([s("c-不存在")], groups)).toEqual([]);
  });
});

describe("方向收口：合并与冻结", () => {
  it("没收口：新建议并进来，同一专业类只留一条", () => {
    const merged = mergeSuggestions([s("c-1")], [s("c-1"), s("c-2")], groups, 2);
    expect(merged.map((item) => item.directionId)).toEqual(["c-1", "c-2"]);
  });

  it("裁到上限：最多三个大类、六个小类，顺序按目录来", () => {
    const many = [s("c-7"), s("c-1"), s("c-4"), s("c-6"), s("c-2"), s("c-5"), s("c-3")];
    const trimmed = trimSuggestions(many, groups);
    // 取前三个有建议的大类：工学(c-1,c-2,c-3) → 理学(c-4,c-5) → 文学(c-6)；农学(c-7) 被大类上限挡掉。
    expect(trimmed.map((item) => item.directionId)).toEqual(["c-1", "c-2", "c-3", "c-4", "c-5", "c-6"]);
    expect(trimmed.length).toBeLessThanOrEqual(DIRECTION_QUOTA.maxClasses);
  });

  it("已收口：整体冻结——连顺序都不动，后面再给什么都不加", () => {
    const settledSet = [s("c-1"), s("c-2"), s("c-3"), s("c-4"), s("c-5")];
    const after = mergeSuggestions(settledSet, [s("c-6"), s("c-7")], groups, 6);
    expect(after).toEqual(settledSet);
  });

  it("冻结只认「已收口」这一个条件：还没收口时照常并入", () => {
    const notYet = [s("c-1"), s("c-2")];
    const after = mergeSuggestions(notYet, [s("c-3")], groups, 2);
    expect(after.map((item) => item.directionId)).toEqual(["c-1", "c-2", "c-3"]);
  });
});
