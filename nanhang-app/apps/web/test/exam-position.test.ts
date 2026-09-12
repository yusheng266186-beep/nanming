import { describe, expect, it } from "vitest";
import type { LoadedRelease } from "@nanhang/release-loader";
import {
  equivalentEstimate, equivalentPosition, examLineDiffs, lineEquivalent,
  scoreStability, scoreTrend
} from "../src/exam-position.js";
import { OFFICIAL_LINES_2026 } from "../src/reference-lines.js";
import type { ExamRecord } from "../src/model.js";

const exam = (patch: Partial<ExamRecord>): ExamRecord => ({
  label: "测试考试", total: null, rank: null, topTotal: null, undergraduateTotal: null, ...patch
});

describe("距线差：只做减法，缺一侧就缺结果", () => {
  it("有分有线时是减法结果，负数表示还差多少分", () => {
    expect(examLineDiffs(exam({ total: 512, topTotal: 485, undergraduateTotal: 530 })))
      .toEqual({ topDiff: 27, undergraduateDiff: -18 });
  });

  it("缺总分或缺线（含 0 线）时该口径为 null，不按 0 分计算", () => {
    expect(examLineDiffs(exam({ total: 512 }))).toEqual({ topDiff: null, undergraduateDiff: null });
    expect(examLineDiffs(exam({ total: null, topTotal: 485 })).topDiff).toBeNull();
    expect(examLineDiffs(exam({ total: 512, topTotal: 0 })).topDiff).toBeNull();
  });
});

describe("稳定性与趋势：从 locate 页抽出的同一套数学", () => {
  it("总体标准差与末次减前次；不足两条一律 null", () => {
    expect(scoreStability([500, 520])).toBeCloseTo(10, 9);
    expect(scoreTrend([500, 520])).toBe(20);
    expect(scoreStability([500])).toBeNull();
    expect(scoreTrend([])).toBeNull();
  });

  it("空缺的总分不参与统计（调用方先过滤）", () => {
    // 过滤是调用方的责任：这里只保证纯函数收到什么算什么。
    expect(scoreStability([500, 520, 480])).toBeCloseTo(16.329931618876568, 9);
  });
});

describe("线差比例等位：等位分 = 官方线 ×（1 + 距线比例）", () => {
  it("正比例与负比例都按同一公式，四舍五入到整数分", () => {
    expect(lineEquivalent(540, 480, 519)).toEqual({ examLine: 480, lineRatio: 0.125, equivalentScore: 584 });
    expect(lineEquivalent(460, 480, 519)?.equivalentScore).toBe(497);
  });

  it("考试线或官方线无效时返回 null，不制造除零", () => {
    expect(lineEquivalent(540, 0, 519)).toBeNull();
    expect(lineEquivalent(540, 480, 0)).toBeNull();
  });
});

describe("两种口径并列：缺哪条线就缺哪个口径，不互相凑", () => {
  const official = { year: 2026, specialControl: 519, undergraduate: 435 };

  it("双线齐全时两个口径各自换算", () => {
    const result = equivalentEstimate(exam({ total: 540, topTotal: 480, undergraduateTotal: 400 }), official);
    expect(result.top?.equivalentScore).toBe(584);
    expect(result.undergraduate?.equivalentScore).toBe(587);
  });

  it("只有一条线时另一口径为 null", () => {
    const result = equivalentEstimate(exam({ total: 540, topTotal: 480 }), official);
    expect(result.top?.equivalentScore).toBe(584);
    expect(result.undergraduate).toBeNull();
  });
});

describe("等位定位：等位分回到官方一分一段表", () => {
  // 最小发布包：一张 2026 物理类表，只列等位换算测试需要的行；可比性记录放行 2026。
  const release = {
    manifest: {}, index: {}, basePath: "",
    distributions: [{
      distributionId: "fixture-2026-PHYSICS",
      year: 2026, track: "PHYSICS", curriculumSystem: "new_gaokao", scoreBasis: "gaokao_cultural",
      publishedMinScore: 150, publishedMaxScore: 700, unlistedScores: [],
      rows: [
        { score: 584, count: 20, cumulative: 75000, rankInterval: [74981, 75000] },
        { score: 590, count: 22, cumulative: 70000, rankInterval: [69979, 70000] }
      ]
    }],
    comparability: [{ plan_track: "PHYSICS", history_year: 2026, status: "VERIFIED" }]
  } as unknown as LoadedRelease;

  it("等位分命中分段表时给出位次区间与百分位", () => {
    const result = equivalentPosition(exam({ total: 540, topTotal: 480 }), officialLines(), release, "PHYSICS");
    expect(result.tableYear).toBe(2026);
    expect(result.top?.equivalentScore).toBe(584);
    expect(result.top?.position?.rank).toBe(75000);
    expect(result.top?.position?.percentile).toBeCloseTo(75000 / 75000 * 100, 9);
    expect(result.undergraduate).toBeNull();
  });

  it("等位分不在公布行内、未选科类或没有发布数据时保持未知，不插值", () => {
    const offTable = equivalentPosition(exam({ total: 541, topTotal: 480 }), officialLines(), release, "PHYSICS");
    expect(offTable.top?.equivalentScore).toBe(585);
    expect(offTable.top?.position).toBeNull();
    expect(equivalentPosition(exam({ total: 540, topTotal: 480 }), officialLines(), release, null)
      .top?.position).toBeNull();
    expect(equivalentPosition(exam({ total: 540, topTotal: 480 }), officialLines(), null, "PHYSICS")
      .top?.position).toBeNull();
  });

  function officialLines() {
    return { year: 2026, ...OFFICIAL_LINES_2026.tracks.PHYSICS };
  }
});

describe("官方控制线登记数据：数值必须与来源发布一致", () => {
  it("2026 四川：物理类 519/435，历史类 525/455，来源是省教育考试院", () => {
    expect(OFFICIAL_LINES_2026.year).toBe(2026);
    expect(OFFICIAL_LINES_2026.tracks.PHYSICS).toEqual({ specialControl: 519, undergraduate: 435 });
    expect(OFFICIAL_LINES_2026.tracks.HISTORY).toEqual({ specialControl: 525, undergraduate: 455 });
    expect(OFFICIAL_LINES_2026.source.url).toContain("sceea.cn");
    expect(OFFICIAL_LINES_2026.source.publishedAt).toBe("2026-06-25");
  });
});
