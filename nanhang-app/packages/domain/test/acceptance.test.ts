import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assessObservedScore,
  boundaryComparisonAllowed,
  checkAdmissionScope,
  checkRegion,
  checkScoreBasis,
  checkTuition,
  combineConditions,
  compareRankIntervals,
  detectRankConflict,
  evaluateSubjectRule,
  formalResultAllowed,
  locateRank,
  planChange,
  populationFromLastRow,
  publishAllowed,
  rankIntervalForExactRow,
  referenceAvailability,
  releaseAvailability,
  sortCandidates,
  stagesComparable,
  targetPlanStatus,
  tracksComparable,
  validateExactDistributionRow,
  type RankInterval,
  type TriState
} from "../src/index.js";

interface AcceptanceCase {
  id: string;
  category: string;
  synthetic: boolean;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
}

const acceptancePath = resolve(import.meta.dirname, "../../../fixtures/acceptance-cases.json");
const acceptance = JSON.parse(readFileSync(acceptancePath, "utf8")) as {
  cases: AcceptanceCase[];
};

function testCase(id: string): AcceptanceCase {
  const found = acceptance.cases.find((item) => item.id === id);
  if (!found) throw new Error(`missing acceptance case ${id}`);
  expect(found.synthetic).toBe(true);
  return found;
}

describe("rank rules A01-A06 and A51", () => {
  it("A01 returns the full tie interval", () => {
    const item = testCase("A01");
    const result = rankIntervalForExactRow(Number(item.input.count), Number(item.input.cumulative));
    expect(result).toEqual(item.expected.rank_interval);
  });

  it("A02 handles a single person without an off-by-one", () => {
    const item = testCase("A02");
    expect(rankIntervalForExactRow(Number(item.input.count), Number(item.input.cumulative))).toEqual(
      item.expected.rank_interval
    );
  });

  it("A03 does not interpolate a zero-count score", () => {
    const item = testCase("A03");
    const result = locateRank({
      requestedScore: Number(item.input.score),
      publishedMinScore: 0,
      row: {
        rowType: "exact",
        score: Number(item.input.score),
        count: Number(item.input.count),
        cumulative: Number(item.input.cumulative)
      }
    });
    expect(result.status).toBe("unavailable");
    if (result.status !== "unavailable") throw new Error("unexpected result");
    expect(result.reason).toBe(item.expected.reason);
  });

  it("A04 refuses to extrapolate below coverage", () => {
    const item = testCase("A04");
    const result = locateRank({
      requestedScore: Number(item.input.requested_score),
      publishedMinScore: Number(item.input.published_min_score)
    });
    expect(result.status).toBe("unavailable");
    if (result.status !== "unavailable") throw new Error("unexpected result");
    expect(result.reason).toBe(item.expected.reason);
  });

  it("A05 preserves aggregate-bin precision", () => {
    const item = testCase("A05");
    const result = locateRank({
      requestedScore: 700,
      publishedMinScore: 0,
      row: {
        rowType: "aggregate_bin",
        label: String(item.input.label),
        cumulative: Number(item.input.cumulative)
      }
    });
    expect(result.status).toBe("aggregate");
    if (result.status !== "aggregate") throw new Error("unexpected result");
    expect(result.precision).toBe(item.expected.precision);
    expect(result.individualRank).toBe(item.expected.individual_rank);
  });

  it("A06 rejects a count larger than the cumulative value", () => {
    const item = testCase("A06");
    expect(
      validateExactDistributionRow({
        count: Number(item.input.count),
        cumulative: Number(item.input.cumulative)
      })
    ).toBe(item.expected.publish_allowed);
  });

  it("A51 does not infer population from an omitted tail", () => {
    const item = testCase("A51");
    expect(
      populationFromLastRow({
        lastCumulative: Number(item.input.last_cumulative),
        tailOmitted: Boolean(item.input.tail_omitted)
      })
    ).toBeNull();
  });
});

describe("academic rules A07-A12 and A50", () => {
  it.each(["A07", "A08"])("%s keeps school results out of province rank matching", (id) => {
    const item = testCase(id);
    const result = assessObservedScore({
      kind: String(item.input.kind ?? "mock") as "mock" | "school_exam",
      totalOrigin: "source",
      calibrationEnabled: Boolean(item.input.calibration_enabled)
    });
    expect(result.academicBasis).toBe("school_context");
    expect(result.relation).toBe("NOT_COMPARABLE");
    if (id === "A08") expect(result.reason).toBe(item.expected.reason);
  });

  it("A09 blocks reconstructed totals", () => {
    const item = testCase("A09");
    expect(
      assessObservedScore({
        kind: "gaokao",
        totalOrigin: String(item.input.total_origin) as "reconstructed",
        calibrationEnabled: false
      }).reason
    ).toBe(item.expected.reason);
  });

  it("A10 catches bonus/table basis mismatches", () => {
    const item = testCase("A10");
    expect(
      checkScoreBasis({
        scoreBasis: String(item.input.score_basis),
        tableBasis: String(item.input.table_basis),
        bonus: Number(item.input.bonus)
      })
    ).toBe(item.expected.reason);
  });

  it("A11 keeps conflicting official rank and table interval visible", () => {
    const item = testCase("A11");
    expect(
      detectRankConflict(
        Number(item.input.official_rank),
        item.input.score_table_interval as RankInterval
      )
    ).toBe(item.expected.reason);
  });

  it("A12 does not mix physics and history tables", () => {
    const item = testCase("A12");
    expect(tracksComparable(String(item.input.candidate_track), String(item.input.table_track))).toBe(
      false
    );
  });

  it("A50 requires a separate target scenario", () => {
    const item = testCase("A50");
    const schoolScore = Number(item.input.school_score);
    const scenarioScore = schoolScore + Number(item.input.scenario_add);
    expect(schoolScore).toBe(item.expected.school_score_unchanged);
    expect(scenarioScore).not.toBe(schoolScore);
    expect(item.expected.separate_scenario_required).toBe(true);
  });
});

describe("eligibility rules A13-A19", () => {
  it("A13 returns UNKNOWN for incomplete subjects", () => {
    const item = testCase("A13");
    const result = evaluateSubjectRule(
      {
        primary: String(item.input.primary) as "PHYSICS",
        additional: item.input.additional as string[]
      },
      { kind: "all_of", subjects: item.input.required_all as string[] }
    );
    expect(result.status).toBe(item.expected.status);
    expect(result.reason).toBe(item.expected.reason);
  });

  it("A14 returns FAIL for a complete non-matching selection", () => {
    const item = testCase("A14");
    expect(
      evaluateSubjectRule(
        {
          primary: String(item.input.primary) as "PHYSICS",
          additional: item.input.additional as string[]
        },
        { kind: "all_of", subjects: item.input.required_all as string[] }
      ).status
    ).toBe(item.expected.status);
  });

  it.each(["A15", "A16"])("%s applies all_of/any_of correctly", (id) => {
    const item = testCase(id);
    const isAll = id === "A15";
    const subjects = (isAll ? item.input.required_all : item.input.required_any) as string[];
    const result = evaluateSubjectRule(
      { primary: "PHYSICS", additional: item.input.additional as string[] },
      { kind: isAll ? "all_of" : "any_of", subjects }
    );
    expect(result.status).toBe(item.expected.subject_rule);
  });

  it.each(["A17", "A18"])("%s applies FAIL > UNKNOWN > PASS precedence", (id) => {
    const item = testCase(id);
    expect(combineConditions(item.input.conditions as TriState[])).toBe(item.expected.status);
  });

  it("A19 excludes unsupported admission scope", () => {
    const item = testCase("A19");
    expect(
      checkAdmissionScope(String(item.input.admission_type), item.input.supported as string[]).reason
    ).toBe(item.expected.reason);
  });
});

describe("reference rules A20-A28", () => {
  it.each(["A20", "A21", "A22", "A23"])("%s compares closed intervals", (id) => {
    const item = testCase(id);
    expect(
      compareRankIntervals(item.input.candidate as RankInterval, item.input.reference as RankInterval)
    ).toBe(item.expected.relation);
  });

  it("A24 keeps group and major evidence separate", () => {
    const item = testCase("A24");
    const result = referenceAvailability({
      hasGroupHistory: Boolean(item.input.has_group_history),
      hasMajorHistory: Boolean(item.input.has_major_history)
    });
    expect(result.majorRelation).toBe(item.expected.major_relation);
    expect(result.reasons).toContain(item.expected.reason);
  });

  it("A25 requires an explicit comparability review after group changes", () => {
    const item = testCase("A25");
    const result = referenceAvailability({
      hasGroupHistory: true,
      hasMajorHistory: true,
      groupChanged: Boolean(item.input.members_changed)
    });
    expect(result.reasons).toContain(item.expected.reason);
    expect(result.groupRelation).toBe("NOT_COMPARABLE");
  });

  it("A26 reports plan change without changing rank automatically", () => {
    const item = testCase("A26");
    const result = planChange(Number(item.input.plan_old), Number(item.input.plan_new));
    expect(result.displayPlanChange).toBe(item.expected.display_plan_change);
    expect(result.automaticRankAdjustment).toBe(item.expected.automatic_rank_adjustment);
  });

  it("A27 does not use a mean as a minimum boundary", () => {
    const item = testCase("A27");
    expect(boundaryComparisonAllowed(String(item.input.metric_type))).toBe(
      item.expected.boundary_comparison_allowed
    );
  });

  it("A28 does not mix collection and first-stage observations", () => {
    const item = testCase("A28");
    expect(stagesComparable(String(item.input.stage), String(item.input.requested_stage))).toBe(false);
  });
});

describe("data and preference rules A29-A33, A49 and A52", () => {
  it("A29 labels missing target-year plans but keeps exploration open", () => {
    const item = testCase("A29");
    const result = targetPlanStatus(Number(item.input.target_year), Number(item.input.latest_plan_year));
    expect(result.reason).toBe(item.expected.reason);
    expect(result.explorationAllowed).toBe(item.expected.exploration_allowed);
  });

  it("A30 allows only PUBLISHED records in formal results", () => {
    const item = testCase("A30");
    expect(formalResultAllowed(String(item.input.status))).toBe(item.expected.formal_result_allowed);
  });

  it("A31 blocks withdrawn releases", () => {
    const item = testCase("A31");
    expect(releaseAvailability(String(item.input.release_status) as "WITHDRAWN")).toBe(
      item.expected.reason
    );
  });

  it("A32 keeps unknown tuition unknown", () => {
    const item = testCase("A32");
    const result = checkTuition(null, Number(item.input.hard_budget));
    expect(result.status).toBe(item.expected.preference_status);
    expect(result.reason).toBe(item.expected.reason);
  });

  it("A33 does not relax a hard region filter", () => {
    const item = testCase("A33");
    expect(
      checkRegion(String(item.input.offering_region), item.input.hard_region as string[]).excluded
    ).toBe(item.expected.excluded);
  });

  it("A49 and A52 reject missing evidence and private data", () => {
    testCase("A49");
    testCase("A52");
    expect(publishAllowed({ evidenceComplete: false, containsPrivateStudentData: false })).toBe(false);
    expect(publishAllowed({ evidenceComplete: true, containsPrivateStudentData: true })).toBe(false);
  });
});

describe("stable candidate ordering", () => {
  it("partitions by eligibility, priorities and a stable offering id", () => {
    const candidates = [
      { offeringId: "b", eligibility: "PASS" as const, manualDirectionPriority: 1, selectedSortValue: null },
      { offeringId: "c", eligibility: "UNKNOWN" as const, manualDirectionPriority: 0, selectedSortValue: 1 },
      { offeringId: "a", eligibility: "PASS" as const, manualDirectionPriority: 1, selectedSortValue: 5 },
      { offeringId: "d", eligibility: "PASS" as const, manualDirectionPriority: 0, selectedSortValue: 10 }
    ];
    expect(sortCandidates(candidates).map((item) => item.offeringId)).toEqual(["d", "a", "b", "c"]);
  });
});
