import { describe, expect, it } from "vitest";

import {
  validateMatchResultSemantics,
  validateStructure,
  type NanhangPublicDataManifest100,
  type NanhangTargetScenario100
} from "@nanhang/contracts";

import {
  buildMatchResult,
  type BuildMatchResultInput,
  type EvidenceDescriptor,
  type HistoricalReferenceRecord,
  type MatchingOffering
} from "../src/index.js";

const scenario: NanhangTargetScenario100 = {
  scenario_version: "1.0.0",
  scenario_id: "scenario-2027",
  target_exam_year: 2027,
  reference_year: 2026,
  province: "SC",
  track: "PHYSICS",
  target_score: 500,
  score_basis: "gaokao_cultural",
  release_id: "release-2026"
};

function release(status: "PUBLISHED" | "WITHDRAWN" = "PUBLISHED"): NanhangPublicDataManifest100 {
  return {
    manifest_version: "1.0.0",
    release_id: "release-2026",
    created_at: "2026-09-10T00:00:00Z",
    schema_version: "1.0.0",
    rules_version: "nh-rules-1.0.0",
    status,
    synthetic: true,
    files: [
      { path: "data/evidence.json", sha256: "0".repeat(64), size_bytes: 2 }
    ],
    coverage: [
      {
        scope_id: "scope-main",
        year: 2026,
        track: "PHYSICS",
        batch: "undergraduate",
        stage: "B",
        admission_type: "general",
        published_offerings: 3,
        known_scope_total: 8,
        exhaustive: false,
        missing_notes: ["synthetic partial coverage"]
      },
      {
        scope_id: "scope-other",
        year: 2026,
        track: "PHYSICS",
        batch: "undergraduate",
        stage: "B",
        admission_type: "general",
        published_offerings: 1,
        known_scope_total: 1,
        exhaustive: true,
        missing_notes: []
      }
    ],
    evidence_index_path: "data/evidence.json"
  };
}

function history(
  offeringId: string,
  subjectType: "group" | "major",
  interval: readonly [number, number],
  evidenceId: string
): HistoricalReferenceRecord {
  const isGroup = subjectType === "group";
  return {
    recordStatus: "PUBLISHED",
    releaseId: "release-2026",
    subjectType,
    subjectId: isGroup ? `group-${offeringId}` : offeringId,
    sourceYear: 2026,
    track: "PHYSICS",
    batch: "undergraduate",
    stage: "B",
    admissionType: "general",
    scoreBasis: "gaokao_cultural",
    metricType: isGroup ? "group_filing_min" : "major_admission_min",
    rankInterval: interval,
    evidenceIds: [evidenceId]
  };
}

function offering(
  offeringId: string,
  options: Partial<MatchingOffering> = {}
): MatchingOffering {
  return {
    recordStatus: "PUBLISHED",
    releaseId: "release-2026",
    offeringId,
    groupId: `group-${offeringId}`,
    scopeId: "scope-main",
    year: 2026,
    track: "PHYSICS",
    batch: "undergraduate",
    stage: "B",
    admissionType: "general",
    region: "SC",
    tuition: 5000,
    requirements: [
      {
        kind: "subject",
        requirementId: `subject-${offeringId}`,
        rule: { kind: "all_of", subjects: ["PHYSICS", "CHEMISTRY"] }
      }
    ],
    history: [
      history(offeringId, "group", [1101, 1200], `evidence-group-${offeringId}`),
      history(offeringId, "major", [950, 975], `evidence-major-${offeringId}`)
    ],
    directionTags: ["engineering"],
    interestReasonRefs: [`interest-${offeringId}`],
    evidenceIds: [`evidence-offering-${offeringId}`],
    ...options
  };
}

function evidenceFor(item: MatchingOffering): EvidenceDescriptor[] {
  const descriptors: EvidenceDescriptor[] = item.evidenceIds.map((evidenceId) => ({
    evidenceId,
    subjectType: "offering",
    subjectId: item.offeringId
  }));
  for (const record of item.history) {
    for (const evidenceId of record.evidenceIds) {
      descriptors.push({
        evidenceId,
        subjectType: record.subjectType,
        subjectId: record.subjectId,
        metricType: record.metricType
      });
    }
  }
  return descriptors;
}

function inputFor(
  offerings: readonly MatchingOffering[],
  overrides: Partial<BuildMatchResultInput> = {}
): BuildMatchResultInput {
  return {
    runId: "run-001",
    inputRevision: 2,
    mode: "exploration",
    rulesVersion: "nh-rules-1.0.0",
    scenario,
    release: release(),
    scopeIds: ["scope-main"],
    distribution: {
      recordStatus: "PUBLISHED",
      releaseId: "release-2026",
      distributionId: "distribution-2026",
      year: 2026,
      province: "SC",
      track: "PHYSICS",
      scoreBasis: "gaokao_cultural",
      publishedMinScore: 150,
      row: { rowType: "exact", score: 500, count: 100, cumulative: 1000 },
      evidenceIds: ["evidence-distribution"]
    },
    evidenceIndex: [
      {
        evidenceId: "evidence-distribution",
        subjectType: "distribution",
        subjectId: "distribution-2026"
      },
      ...offerings.flatMap(evidenceFor)
    ],
    selection: {
      primary: "PHYSICS",
      additional: ["CHEMISTRY", "BIOLOGY"]
    },
    supportedAdmissionTypes: ["general"],
    preferences: {
      hardBudget: 6000,
      hardRegions: ["SC"],
      directionPriority: ["engineering", "science"],
      sortBy: "group_history_position"
    },
    offerings,
    ...overrides
  };
}

describe("deterministic MatchResult integration", () => {
  it("composes rank, eligibility, references, coverage, preferences and contract output", () => {
    const result = buildMatchResult(inputFor([offering("offering-a")]));

    expect(validateStructure("match-result", result).valid).toBe(true);
    expect(validateMatchResultSemantics(result).valid).toBe(true);
    expect(result.coverage).toEqual([release().coverage[0]]);
    expect(result.warnings).toEqual(["TARGET_YEAR_PLAN_MISSING"]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.group_reference).toMatchObject({
      relation: "AHEAD_OF_REFERENCE",
      metric_type: "group_filing_min",
      candidate_rank_interval: [901, 1000],
      reference_rank_interval: [1101, 1200]
    });
    expect(result.candidates[0]?.major_reference).toMatchObject({
      relation: "OVERLAPS_REFERENCE",
      metric_type: "major_admission_min",
      reference_rank_interval: [950, 975]
    });
    expect(JSON.stringify(result)).not.toMatch(/probability|admission_chance/);
  });

  it("uses only PUBLISHED offerings in the selected published coverage", () => {
    const published = offering("published");
    const verified = offering("verified", { recordStatus: "VERIFIED" });
    const otherScope = offering("other-scope", { scopeId: "scope-other" });
    const result = buildMatchResult(inputFor([verified, otherScope, published]));

    expect(result.coverage.map((item) => item.scope_id)).toEqual(["scope-main"]);
    expect(result.candidates.map((item) => item.offering_id)).toEqual(["published"]);
  });

  it("does not use VERIFIED-only history as a published reference", () => {
    const item = offering("unpublished-history", {
      history: [
        {
          ...history(
            "unpublished-history",
            "group",
            [1101, 1200],
            "evidence-group-unpublished-history"
          ),
          recordStatus: "VERIFIED"
        },
        {
          ...history(
            "unpublished-history",
            "major",
            [950, 975],
            "evidence-major-unpublished-history"
          ),
          recordStatus: "VERIFIED"
        }
      ]
    });
    const result = buildMatchResult(inputFor([item]));

    expect(result.candidates[0]?.group_reference.reason_codes).toEqual([
      "GROUP_HISTORY_MISSING"
    ]);
    expect(result.candidates[0]?.major_reference.reason_codes).toEqual([
      "MAJOR_HISTORY_MISSING"
    ]);
  });

  it("rejects wrong-granularity evidence without contaminating the other reference", () => {
    const item = offering("granularity");
    const evidence = inputFor([item]).evidenceIndex.map((descriptor) =>
      descriptor.evidenceId === "evidence-group-granularity"
        ? { ...descriptor, subjectType: "major" as const, subjectId: "granularity" }
        : descriptor
    );
    const result = buildMatchResult(inputFor([item], { evidenceIndex: evidence }));
    const candidate = result.candidates[0];

    expect(candidate?.group_reference).toMatchObject({
      relation: "NOT_COMPARABLE",
      reason_codes: ["SOURCE_CONFLICT"],
      candidate_rank_interval: null,
      reference_rank_interval: null
    });
    expect(candidate?.major_reference.relation).toBe("OVERLAPS_REFERENCE");
    expect(validateMatchResultSemantics(result).valid).toBe(true);
  });

  it("never fills a missing major line from an available group line", () => {
    const item = offering("group-only");
    item.history = item.history.filter((record) => record.subjectType === "group");
    const result = buildMatchResult(inputFor([item]));
    const candidate = result.candidates[0];

    expect(candidate?.group_reference.relation).toBe("AHEAD_OF_REFERENCE");
    expect(candidate?.major_reference).toMatchObject({
      relation: "NOT_COMPARABLE",
      metric_type: null,
      candidate_rank_interval: null,
      reference_rank_interval: null,
      reason_codes: ["MAJOR_HISTORY_MISSING"]
    });
  });

  it("returns an auditable empty result for a withdrawn release", () => {
    const item = offering("withdrawn");
    const result = buildMatchResult(
      inputFor([item], { release: release("WITHDRAWN") })
    );

    expect(result.candidates).toEqual([]);
    expect(result.warnings).toEqual(["DATASET_WITHDRAWN"]);
    expect(result.excluded_summary).toEqual([
      { reason_code: "DATASET_WITHDRAWN", count: 1 }
    ]);
    expect(validateStructure("match-result", result).valid).toBe(true);
  });

  it("preserves missing rank, history and tuition as explicit unknown states", () => {
    const item = offering("missing", { history: [], tuition: null });
    const result = buildMatchResult(inputFor([item], { distribution: null }));
    const candidate = result.candidates[0];

    expect(result.warnings).toEqual(["NO_OBSERVED_SCORE", "TARGET_YEAR_PLAN_MISSING"]);
    expect(candidate?.preference_status).toBe("UNKNOWN");
    expect(candidate?.group_reference.reason_codes).toEqual(["GROUP_HISTORY_MISSING"]);
    expect(candidate?.major_reference.reason_codes).toEqual(["MAJOR_HISTORY_MISSING"]);
  });

  it("keeps an empty result when hard preferences exclude every offering", () => {
    const item = offering("outside", { region: "OTHER" });
    const result = buildMatchResult(inputFor([item]));

    expect(result.candidates).toEqual([]);
    expect(result.excluded_summary).toEqual([
      { reason_code: "HARD_PREFERENCE_EXCLUDED", count: 1 }
    ]);
    expect(result.coverage[0].missing_notes).toEqual(["synthetic partial coverage"]);
  });

  it("produces the same stable ordering for every input order", () => {
    const a = offering("a", { directionTags: ["science"] });
    const b = offering("b", { directionTags: ["science"] });
    const c = offering("c", {
      directionTags: ["engineering"],
      requirements: [
        {
          kind: "condition",
          requirementId: "pending-c",
          status: "UNKNOWN",
          reasonCode: "UNKNOWN_REQUIREMENT"
        }
      ]
    });
    const d = offering("d", { directionTags: ["engineering"] });
    const forward = buildMatchResult(inputFor([a, b, c, d]));
    const reverse = buildMatchResult(inputFor([d, c, b, a]));
    const expected = ["d", "a", "b", "c"];

    expect(forward.candidates.map((item) => item.offering_id)).toEqual(expected);
    expect(reverse.candidates.map((item) => item.offering_id)).toEqual(expected);
    expect(reverse).toEqual(forward);
  });
  it("treats a history record with no established comparability as unusable", () => {
    // The whole point of the comparability link: a number can be individually sound and still not
    // support a cross-year claim. Both references must come back NOT_COMPARABLE with a
    // history-missing code, and the relation must not fall through to a comparison.
    const withoutLink = offering("offering-no-link", {
      history: [
        { ...history("offering-no-link", "group", [1101, 1200], "evidence-group-no-link"),
          comparability: "NOT_ESTABLISHED" },
        { ...history("offering-no-link", "major", [950, 975], "evidence-major-no-link"),
          comparability: "NOT_ESTABLISHED" }
      ]
    });
    const result = buildMatchResult(inputFor([withoutLink]));
    expect(validateStructure("match-result", result).valid).toBe(true);
    const candidate = result.candidates.find((item) => item.offering_id === "offering-no-link");
    expect(candidate).toBeDefined();
    expect(candidate!.group_reference.relation).toBe("NOT_COMPARABLE");
    expect(candidate!.major_reference.relation).toBe("NOT_COMPARABLE");
    expect(candidate!.group_reference.reason_codes).toContain("GROUP_HISTORY_MISSING");
    expect(candidate!.major_reference.reason_codes).toContain("MAJOR_HISTORY_MISSING");
    // No rank interval may be presented for a comparison that was not established.
    expect(candidate!.group_reference.reference_rank_interval).toBeNull();
    expect(candidate!.major_reference.reference_rank_interval).toBeNull();
    expect(candidate!.group_reference.candidate_rank_interval).toBeNull();

    // The same offering with an established link does compare, so the guard is what changed the
    // outcome rather than some unrelated cause.
    const withLink = offering("offering-compared", {
      history: [
        { ...history("offering-compared", "group", [1101, 1200], "evidence-group-compared"),
          comparability: "COMPARABLE" },
        { ...history("offering-compared", "major", [950, 975], "evidence-major-compared"),
          comparability: "COMPARABLE" }
      ]
    });
    const compared = buildMatchResult(inputFor([withLink]));
    const comparedCandidate = compared.candidates.find(
      (item) => item.offering_id === "offering-compared");
    expect(comparedCandidate!.group_reference.relation).not.toBe("NOT_COMPARABLE");
  });
});
