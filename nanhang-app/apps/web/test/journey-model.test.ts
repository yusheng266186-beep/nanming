import { describe, expect, it } from "vitest";
import {
  catalogFromRows,
  makeBranches,
  rangeFromExams,
  referenceOverlaps,
  validRange,
  type Candidate,
  type SchoolPool,
} from "../src/journey-model.js";
import type { OfferingLabel } from "@nanhang/release-loader";
import type { ExamRecord } from "../src/model.js";

const label = (name: string, school = "合成测试学校"): OfferingLabel => ({
  offeringId: `fixture-${name}-${school}`,
  groupId: "fixture-group",
  institutionName: school,
  institutionCity: null,
  institutionTags: null,
  majorName: name,
  majorCode: null,
  category: "测试门类",
  categoryClass: name === "测试专业甲" ? "测试类甲" : "测试类乙",
  planCount: 2,
  tuition: null,
  level: null,
  batch: "本科批B段",
  track: "PHYSICS",
});
const candidate = (
  major: [number, number] | null,
  group: [number, number] | null,
): Candidate =>
  ({
    offering_id: "fixture",
    major_reference: {
      reference_rank_interval: major,
      relation: major ? "AHEAD_OF_REFERENCE" : "NOT_COMPARABLE",
    },
    group_reference: {
      reference_rank_interval: group,
      relation: group ? "AHEAD_OF_REFERENCE" : "NOT_COMPARABLE",
    },
  }) as unknown as Candidate;
const labels = [label("测试专业甲"), label("测试专业乙")];
const pool: SchoolPool = {
  ...catalogFromRows(labels),
  rows: labels.map((l) => ({
    label: l,
    candidate: candidate([100, 100], null),
    reference: "major",
  })),
  rankRange: [90, 110],
  referenceYear: 2025,
  releaseId: "fixture",
  schoolCount: 1,
  missingHistory: 0,
  range: { low: 500, high: 520, basis: "fixture" },
};
const exam = (
  total: number | null,
  topTotal: number | null,
  undergraduateTotal: number | null,
): ExamRecord => ({
  label: "合成考试",
  total,
  topTotal,
  undergraduateTotal,
  rank: null,
});

describe("五步流程的区间与分路规则", () => {
  it("区间拒绝空值、反向、小数和越界，不任意修正", () => {
    expect(validRange(500, 520)).toBe(true);
    for (const [low, high] of [
      [520, 500],
      [NaN, 500],
      [-1, 300],
      [600, 751],
      [500.5, 510],
    ])
      expect(validRange(low!, high!)).toBe(false);
  });
  it("没有该场参考线时不把模考原分直接换成高考成绩", () =>
    expect(rangeFromExams([exam(580, null, null)], "PHYSICS")).toBeNull());
  it("学校原始缺考不作为零分；同一场两个口径各占一半取平均", () => {
    // 特控线口径 519 × 500/500 = 519；本科线口径 435 × 500/400 = 543.75 → 544（口径内先取整）；
    // 平均 (519 + 544) / 2 = 531.5 → 532。两个口径不再各算一个值并列进 min–max（那会把区间撑宽），
    // 缺考那一场完全不参与。
    const range = rangeFromExams(
      [exam(null, 500, 400), exam(500, 500, 400)],
      "PHYSICS",
    );
    expect(range?.low).toBe(532);
    expect(range?.high).toBe(532);
  });
  it("总分填 0 当作没有这一场，不把区间击穿到 0", () => {
    // 0 分不是成绩：比例换算会得到 0，曾经让整段区间变成 0–555，并让院校池匹配报错。
    const withZero = rangeFromExams([exam(0, 500, 400), exam(520, 500, 400)], "PHYSICS");
    const without = rangeFromExams([exam(520, 500, 400)], "PHYSICS");
    expect(withZero).toEqual(without);
    expect(withZero!.low).toBeGreaterThan(0);
  });
  it("只有一条线可用时就用这一条，不拿缺失的那条当 0 平均", () => {
    // 519 × 560/520 = 558.9 → 559；若把缺失的本科线口径当 0 平均，会得到 280。
    const range = rangeFromExams([exam(560, 520, null)], "PHYSICS");
    expect(range?.low).toBe(559);
    expect(range?.high).toBe(559);
  });
  it("两条切线高低颠倒时这一场不参与换算", () => {
    // 本科线 600 高于特控线 500 是数据矛盾：真实的批次线永远是本科线更低。
    expect(rangeFromExams([exam(560, 500, 600)], "PHYSICS")).toBeNull();
  });
  it("只从实际库名建词表，同名专业在不同学校仍有稳定 ID", () => {
    const a = catalogFromRows([
      label("测试专业甲"),
      label("测试专业甲", "另一合成学校"),
    ]);
    const b = catalogFromRows([
      label("测试专业甲", "另一合成学校"),
      label("测试专业甲"),
    ]);
    expect(a).toEqual(b);
    expect(a.majors).toHaveLength(1);
    expect(a.directions[0]?.name).toBe("测试类甲");
  });
  it("专业已知但不在区间时，不借专业组参考混入", () =>
    expect(
      referenceOverlaps(candidate([200, 200], [100, 100]), [90, 110]),
    ).toBeNull());
  it("只有组依据时明确标记 group；缺两种依据就排除", () => {
    expect(referenceOverlaps(candidate(null, [100, 100]), [90, 110])).toBe(
      "group",
    );
    expect(referenceOverlaps(candidate(null, null), [90, 110])).toBeNull();
  });
  it("边界相交算命中，不把不相交区间算进去", () => {
    expect(referenceOverlaps(candidate([110, 120], null), [90, 110])).toBe(
      "major",
    );
    expect(
      referenceOverlaps(candidate([111, 120], null), [90, 110]),
    ).toBeNull();
  });
  it("相同选择只出现一次，不同选择保留两路", () => {
    const ai = pool.majors[0]!,
      other = pool.majors[1]!;
    const shared = makeBranches(pool, [ai.directionId], [ai.id]);
    expect(shared.map((b) => b.kind)).toEqual(["shared"]);
    expect(shared[0]?.rows).toHaveLength(1);
    expect(
      makeBranches(pool, [ai.directionId], [other.id]).map((b) => b.kind),
    ).toEqual(["ai", "self"]);
  });
  it("忽略模型编造或旧发布库 ID；自主选择无分数命中仍保留空路", () => {
    expect(makeBranches(pool, ["编造方向"], ["不存在的专业"])).toEqual([]);
    const narrow = { ...pool, rows: [] };
    const result = makeBranches(narrow, [], [pool.majors[0]!.id]);
    expect(result[0]?.kind).toBe("self");
    expect(result[0]?.rows).toEqual([]);
  });
});
