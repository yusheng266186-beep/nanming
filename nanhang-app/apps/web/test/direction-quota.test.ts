// 「方向收口」的判定与冻结：纯函数行为测试。
//
// 借北辰的做法（到量即停；之后仍可继续聊，但画像不再变）：南溟把「量」定义成两条——
// 方向覆盖（小类 5 个且跨 2 个大类）或**素材够**（纯前端判：轮数 + 学生自己写的字数）；
// 收口由界面发起的收尾轮落定后才冻结。
import { describe, expect, it } from "vitest";
import {
  DIRECTION_QUOTA, MATERIAL_READY, coveredGroups, directionTalkSettled, groupIdOf, materialEnough,
  mergeSuggestions, trimSuggestions
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
/** n 轮学生原话，每轮 chars 字——用来说明「素材够」只看轮数与字数。 */
const turns = (n: number, chars = 50) => Array.from({ length: n }, () => "字".repeat(chars));
/** 把「总字数」摊到 n 轮里：判据看的是总量，不是每轮多长。 */
const total = (n: number, chars: number) =>
  Array.from({ length: n }, () => "字".repeat(Math.max(1, Math.ceil(chars / n))));
const few = turns(MATERIAL_READY.minTurns - 1);
const enough = turns(MATERIAL_READY.minTurns);

describe("素材够不够：纯前端判", () => {
  it("轮数与总字数都到线才算够", () => {
    expect(materialEnough(total(MATERIAL_READY.minTurns, MATERIAL_READY.minChars))).toBe(true);
    // 字写得多但轮数不够：不算（少了来回问答的过程）。
    expect(materialEnough(total(MATERIAL_READY.minTurns - 1, MATERIAL_READY.minChars * 3))).toBe(false);
    // 轮数够但字太少：也不算。
    expect(materialEnough(total(MATERIAL_READY.minTurns + 2, MATERIAL_READY.minChars - 10))).toBe(false);
  });

  it("满 12 轮一律算够：再聊也不会多出什么，不让学生无限聊下去", () => {
    expect(materialEnough(turns(MATERIAL_READY.hardTurns - 1, 1))).toBe(false);
    expect(materialEnough(turns(MATERIAL_READY.hardTurns, 1))).toBe(true);
  });

  it("没到兜底轮数时，空话不算素材：只敲回车或只答「嗯」都不算", () => {
    expect(materialEnough(Array.from({ length: MATERIAL_READY.minTurns }, () => "   "))).toBe(false);
    expect(materialEnough(["嗯", "还行", "不知道", "随便", "都行", "没有"])).toBe(false);
  });
});

describe("方向收口：算不算聊够", () => {
  it("方向覆盖到量：小类满 5 个、跨 2 个大类，就算聊够（哪怕刚聊两句）", () => {
    const five = [s("c-1"), s("c-2"), s("c-3"), s("c-4"), s("c-5")];
    expect(coveredGroups(five, groups)).toEqual(["g-eng", "g-sci"]);
    expect(directionTalkSettled(["刚聊一句"], five, groups)).toBe(true);
  });

  it("小类够但只在一个大类里：不算到量，交给素材判据", () => {
    const sameGroup = [s("c-1"), s("c-2"), s("c-3"), s("c-1"), s("c-2")];
    expect(coveredGroups(sameGroup, groups)).toEqual(["g-eng"]);
    expect(directionTalkSettled(["刚聊一句"], sameGroup, groups)).toBe(false);
    expect(directionTalkSettled(enough, sameGroup, groups)).toBe(true);
  });

  it("一条建议都没有也能收尾：素材够了就收（这正是负责人 14 轮没有结果的那条缺陷）", () => {
    expect(directionTalkSettled(few, [], groups)).toBe(false);
    expect(directionTalkSettled(enough, [], groups)).toBe(true);
  });

  it("目录里没有的专业类不算进覆盖，也不会被当成新大类", () => {
    expect(groupIdOf("c-不存在", groups)).toBeNull();
    expect(coveredGroups([s("c-不存在")], groups)).toEqual([]);
  });
});

describe("方向收口：合并与冻结", () => {
  it("没收尾：新建议并进来，同一专业类只留一条", () => {
    const merged = mergeSuggestions([s("c-1")], [s("c-1"), s("c-2")], groups, false);
    expect(merged.map((item) => item.directionId)).toEqual(["c-1", "c-2"]);
  });

  it("裁到上限：最多三个大类、六个小类，顺序按目录来", () => {
    const many = [s("c-7"), s("c-1"), s("c-4"), s("c-6"), s("c-2"), s("c-5"), s("c-3")];
    const trimmed = trimSuggestions(many, groups);
    // 取前三个有建议的大类：工学(c-1,c-2,c-3) → 理学(c-4,c-5) → 文学(c-6)；农学(c-7) 被大类上限挡掉。
    expect(trimmed.map((item) => item.directionId)).toEqual(["c-1", "c-2", "c-3", "c-4", "c-5", "c-6"]);
    expect(trimmed.length).toBeLessThanOrEqual(DIRECTION_QUOTA.maxClasses);
  });

  it("冻结由调用方决定（收尾轮落定后才冻）：整体不动、连顺序都不变", () => {
    const settledSet = [s("c-1"), s("c-2"), s("c-3"), s("c-4"), s("c-5")];
    const after = mergeSuggestions(settledSet, [s("c-6"), s("c-7")], groups, true);
    expect(after).toEqual(settledSet);
  });

  it("收尾轮自己那一轮以「未冻结」合并：否则它算出来的那套会被旧集合挡掉", () => {
    const notYet = [s("c-1"), s("c-2")];
    const after = mergeSuggestions(notYet, [s("c-3")], groups, false);
    expect(after.map((item) => item.directionId)).toEqual(["c-1", "c-2", "c-3"]);
  });
});
