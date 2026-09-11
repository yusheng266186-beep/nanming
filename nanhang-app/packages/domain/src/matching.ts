import type {
  NanhangMatchResult100,
  NanhangPublicDataManifest100,
  NanhangTargetScenario100
} from "@nanhang/contracts";

import { checkScoreBasis } from "./academic.js";
import {
  formalResultAllowed,
  releaseAvailability,
  stagesComparable,
  targetPlanStatus
} from "./data.js";
import {
  checkAdmissionScope,
  combineConditions,
  evaluateSubjectRule,
  type SubjectRule,
  type SubjectSelection
} from "./eligibility.js";
import { checkRegion, checkTuition } from "./preference.js";
import {
  locateRank,
  type AggregateDistributionRow,
  type ExactDistributionRow
} from "./rank.js";
import { compareRankIntervals } from "./reference.js";
import { sortCandidates } from "./sort.js";
import type { RankInterval, ReasonCode, ReferenceRelation, TriState } from "./types.js";

export type PublicationStatus =
  | "RAW"
  | "NORMALIZED"
  | "VALIDATED"
  | "VERIFIED"
  | "PUBLISHED"
  | "QUARANTINED"
  | "SUPERSEDED";

export type AdmissionMetricType =
  | "group_filing_min"
  | "group_admission_min"
  | "major_admission_min"
  | "major_admission_mean"
  | "major_admission_max"
  | "institution_admission_min";

export interface EvidenceDescriptor {
  evidenceId: string;
  subjectType: "offering" | "group" | "major" | "distribution";
  subjectId: string;
  metricType?: AdmissionMetricType;
}

export type MatchingRequirement =
  | {
      kind: "subject";
      requirementId: string;
      rule: SubjectRule;
    }
  | {
      kind: "condition";
      requirementId: string;
      status: "PASS";
    }
  | {
      kind: "condition";
      requirementId: string;
      status: "FAIL" | "UNKNOWN";
      reasonCode: ReasonCode;
    };

export interface HistoricalReferenceRecord {
  recordStatus: PublicationStatus;
  releaseId: string;
  subjectType: "group" | "major";
  subjectId: string;
  sourceYear: number;
  track: "PHYSICS" | "HISTORY";
  batch: string;
  stage: string | null;
  admissionType: string;
  scoreBasis: "gaokao_cultural" | "gaokao_filing";
  metricType: AdmissionMetricType;
  rankInterval: RankInterval;
  evidenceIds: readonly string[];
  comparability?: "COMPARABLE" | "GROUP_CHANGED" | "SOURCE_CONFLICT" | "NOT_ESTABLISHED";
}

export interface MatchingOffering {
  recordStatus: PublicationStatus;
  releaseId: string;
  offeringId: string;
  groupId: string;
  scopeId: string;
  year: number;
  track: "PHYSICS" | "HISTORY";
  batch: string;
  stage: string | null;
  admissionType: string;
  region: string;
  tuition: number | null;
  requirements: readonly MatchingRequirement[];
  history: readonly HistoricalReferenceRecord[];
  directionTags: readonly string[];
  interestReasonRefs: readonly string[];
  evidenceIds: readonly string[];
}

export interface ScoreDistributionSelection {
  recordStatus: PublicationStatus;
  releaseId: string;
  distributionId: string;
  year: number;
  province: "SC";
  track: "PHYSICS" | "HISTORY";
  scoreBasis: "gaokao_cultural" | "gaokao_filing";
  publishedMinScore: number;
  row?: ExactDistributionRow | AggregateDistributionRow;
  evidenceIds: readonly string[];
}

export interface MatchPreferences {
  hardBudget?: number;
  hardRegions?: readonly string[];
  directionPriority?: readonly string[];
  sortBy?: "direction" | "group_history_position" | "major_history_position";
  groupMetric?: "group_filing_min" | "group_admission_min";
}

export interface BuildMatchResultInput {
  runId: string;
  inputRevision: number;
  mode: "exploration" | "application_support";
  rulesVersion: "nh-rules-1.0.0";
  scenario: NanhangTargetScenario100;
  release: NanhangPublicDataManifest100;
  scopeIds: readonly string[];
  distribution: ScoreDistributionSelection | null;
  evidenceIndex: readonly EvidenceDescriptor[];
  selection: SubjectSelection;
  supportedAdmissionTypes: readonly string[];
  preferences: MatchPreferences;
  offerings: readonly MatchingOffering[];
}

export interface MatchReference {
  relation: ReferenceRelation;
  source_year: number | null;
  metric_type: AdmissionMetricType | null;
  candidate_rank_interval: [number, number] | null;
  reference_rank_interval: [number, number] | null;
  reason_codes: ReasonCode[];
  evidence_ids: string[];
}

type MatchCandidate = NanhangMatchResult100["candidates"][number] & {
  group_reference: MatchReference;
  major_reference: MatchReference;
};

const reasonOrder: readonly ReasonCode[] = [
  "INCOMPLETE_SUBJECTS",
  "SUBJECT_REQUIREMENT_FAILED",
  "UNKNOWN_REQUIREMENT",
  "UNSUPPORTED_SCOPE",
  "SCHOOL_SCORE_UNCALIBRATED",
  "TOTAL_NOT_SOURCE",
  "UNKNOWN_SCORE_BASIS",
  "BONUS_BASIS_MISMATCH",
  "RANK_CONFLICT",
  "NO_OBSERVED_SCORE",
  "OUT_OF_DISTRIBUTION_COVERAGE",
  "MAJOR_HISTORY_MISSING",
  "GROUP_HISTORY_MISSING",
  "GROUP_CHANGED",
  "SOURCE_CONFLICT",
  "TARGET_YEAR_PLAN_MISSING",
  "DATASET_WITHDRAWN",
  "TUITION_UNKNOWN",
  "HARD_PREFERENCE_EXCLUDED",
  "NO_ACADEMIC_INPUT",
  "NO_CALIBRATION_MODEL"
];

function compareAscii(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function uniqueReasons(reasons: readonly ReasonCode[]): ReasonCode[] {
  const present = new Set(reasons);
  return reasonOrder.filter((reason) => present.has(reason));
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareAscii);
}

function copyInterval(interval: RankInterval): [number, number] {
  return [interval[0], interval[1]];
}

function notComparable(
  reason: ReasonCode,
  sourceYear: number | null = null,
  metricType: AdmissionMetricType | null = null,
  evidenceIds: readonly string[] = []
): MatchReference {
  return {
    relation: "NOT_COMPARABLE",
    source_year: sourceYear,
    metric_type: metricType,
    candidate_rank_interval: null,
    reference_rank_interval: null,
    reason_codes: [reason],
    evidence_ids: uniqueStrings(evidenceIds)
  };
}

interface EvidenceLookup {
  byId: ReadonlyMap<string, EvidenceDescriptor>;
  conflicts: ReadonlySet<string>;
}

function buildEvidenceLookup(evidence: readonly EvidenceDescriptor[]): EvidenceLookup {
  const byId = new Map<string, EvidenceDescriptor>();
  const conflicts = new Set<string>();
  for (const descriptor of evidence) {
    if (byId.has(descriptor.evidenceId)) conflicts.add(descriptor.evidenceId);
    else byId.set(descriptor.evidenceId, descriptor);
  }
  return { byId, conflicts };
}

function evidenceMatches(
  lookup: EvidenceLookup,
  evidenceIds: readonly string[],
  expected: {
    subjectType: EvidenceDescriptor["subjectType"];
    subjectId: string;
    metricType?: AdmissionMetricType;
  }
): boolean {
  if (evidenceIds.length === 0 || new Set(evidenceIds).size !== evidenceIds.length) return false;
  return evidenceIds.every((evidenceId) => {
    if (lookup.conflicts.has(evidenceId)) return false;
    const descriptor = lookup.byId.get(evidenceId);
    if (!descriptor) return false;
    if (
      descriptor.subjectType !== expected.subjectType ||
      descriptor.subjectId !== expected.subjectId
    ) {
      return false;
    }
    return expected.metricType === undefined || descriptor.metricType === expected.metricType;
  });
}

function assessAcademicRank(
  scenario: NanhangTargetScenario100,
  releaseId: string,
  distribution: ScoreDistributionSelection | null,
  evidence: EvidenceLookup
): { rankInterval: RankInterval | null; reason: ReasonCode | null } {
  if (!distribution || !formalResultAllowed(distribution.recordStatus)) {
    return { rankInterval: null, reason: "NO_OBSERVED_SCORE" };
  }
  if (
    distribution.releaseId !== releaseId ||
    distribution.year !== scenario.reference_year ||
    distribution.province !== scenario.province ||
    distribution.track !== scenario.track
  ) {
    return { rankInterval: null, reason: "SOURCE_CONFLICT" };
  }
  const basisIssue = checkScoreBasis({
    scoreBasis: scenario.score_basis,
    tableBasis: distribution.scoreBasis
  });
  if (basisIssue) return { rankInterval: null, reason: basisIssue };
  if (
    !evidenceMatches(evidence, distribution.evidenceIds, {
      subjectType: "distribution",
      subjectId: distribution.distributionId
    })
  ) {
    return { rankInterval: null, reason: "SOURCE_CONFLICT" };
  }

  const row =
    distribution.row?.rowType === "exact" &&
    distribution.row.score !== scenario.target_score
      ? undefined
      : distribution.row;
  const located = locateRank({
    requestedScore: scenario.target_score,
    publishedMinScore: distribution.publishedMinScore,
    ...(row ? { row } : {})
  });
  if (located.status === "located") {
    return { rankInterval: located.rankInterval, reason: null };
  }
  if (located.status === "unavailable") {
    return { rankInterval: null, reason: located.reason };
  }
  return { rankInterval: null, reason: "NO_OBSERVED_SCORE" };
}

function evaluateEligibility(
  offering: MatchingOffering,
  selection: SubjectSelection,
  supportedAdmissionTypes: readonly string[]
): {
  status: TriState;
  checkedRequirements: string[];
  pendingRequirements: string[];
  reasons: ReasonCode[];
} {
  const statuses: TriState[] = [];
  const checkedRequirements: string[] = [];
  const pendingRequirements: string[] = [];
  const reasons: ReasonCode[] = [];

  const scope = checkAdmissionScope(offering.admissionType, supportedAdmissionTypes);
  statuses.push(scope.status);
  if (scope.reason) reasons.push(scope.reason);

  for (const requirement of offering.requirements) {
    const result =
      requirement.kind === "subject"
        ? evaluateSubjectRule(selection, requirement.rule)
        : { status: requirement.status, ...("reasonCode" in requirement ? { reason: requirement.reasonCode } : {}) };
    statuses.push(result.status);
    if (result.status === "PASS") checkedRequirements.push(requirement.requirementId);
    else pendingRequirements.push(requirement.requirementId);
    if (result.reason) reasons.push(result.reason);
  }

  return {
    status: combineConditions(statuses),
    checkedRequirements: uniqueStrings(checkedRequirements),
    pendingRequirements: uniqueStrings(pendingRequirements),
    reasons: uniqueReasons(reasons)
  };
}

function evaluatePreferences(
  offering: MatchingOffering,
  preferences: MatchPreferences
): { status: TriState; reasons: ReasonCode[] } {
  const statuses: TriState[] = [];
  const reasons: ReasonCode[] = [];
  if (preferences.hardBudget !== undefined) {
    const tuition = checkTuition(offering.tuition, preferences.hardBudget);
    statuses.push(tuition.status);
    if (tuition.reason) reasons.push(tuition.reason);
  }
  if (preferences.hardRegions && preferences.hardRegions.length > 0) {
    const region = checkRegion(offering.region, preferences.hardRegions);
    statuses.push(region.excluded ? "FAIL" : "PASS");
    if (region.reason) reasons.push(region.reason);
  }
  return {
    status: statuses.length === 0 ? "PASS" : combineConditions(statuses),
    reasons: uniqueReasons(reasons)
  };
}

function referenceFor(
  offering: MatchingOffering,
  subjectType: "group" | "major",
  metricType: "group_filing_min" | "group_admission_min" | "major_admission_min",
  scenario: NanhangTargetScenario100,
  releaseId: string,
  candidateRank: RankInterval | null,
  academicReason: ReasonCode | null,
  evidence: EvidenceLookup
): MatchReference {
  const subjectId = subjectType === "group" ? offering.groupId : offering.offeringId;
  const missingReason: ReasonCode =
    subjectType === "group" ? "GROUP_HISTORY_MISSING" : "MAJOR_HISTORY_MISSING";
  const records = offering.history.filter(
    (record) =>
      record.subjectType === subjectType &&
      record.subjectId === subjectId &&
      record.sourceYear === scenario.reference_year &&
      record.metricType === metricType &&
      record.releaseId === releaseId &&
      formalResultAllowed(record.recordStatus)
  );
  if (records.length === 0) return notComparable(missingReason, scenario.reference_year);
  if (records.length !== 1) return notComparable("SOURCE_CONFLICT", scenario.reference_year);

  const record = records[0];
  if (!record) return notComparable(missingReason, scenario.reference_year);
  const metadataMatches =
    record.track === scenario.track &&
    record.batch === offering.batch &&
    stagesComparable(record.stage ?? "", offering.stage ?? "") &&
    record.admissionType === offering.admissionType &&
    record.scoreBasis === scenario.score_basis;
  const recordEvidenceMatches = evidenceMatches(evidence, record.evidenceIds, {
    subjectType,
    subjectId,
    metricType
  });
  if (!metadataMatches || !recordEvidenceMatches) {
    return notComparable("SOURCE_CONFLICT", record.sourceYear, record.metricType);
  }
  if (record.comparability === "GROUP_CHANGED") {
    return notComparable("GROUP_CHANGED", record.sourceYear, record.metricType, record.evidenceIds);
  }
  if (record.comparability === "SOURCE_CONFLICT") {
    return notComparable("SOURCE_CONFLICT", record.sourceYear, record.metricType, record.evidenceIds);
  }
  if (record.comparability === "NOT_ESTABLISHED") {
    // No cross-year comparability link has been established for this history year, so the record
    // cannot support a relation even though the number itself is sound. Reported as history
    // missing rather than silently compared: the frozen match-result schema has no dedicated code
    // for "not established", and of the available codes the missing-history ones are the accurate
    // description of what the student can use. Treating it as comparable would be the one
    // unacceptable option, because it would present a cross-year claim the data does not support.
    return notComparable(missingReason, record.sourceYear, record.metricType, record.evidenceIds);
  }
  if (!candidateRank || academicReason) {
    return notComparable(
      academicReason ?? "NO_ACADEMIC_INPUT",
      record.sourceYear,
      record.metricType,
      record.evidenceIds
    );
  }

  return {
    relation: compareRankIntervals(candidateRank, record.rankInterval),
    source_year: record.sourceYear,
    metric_type: record.metricType,
    candidate_rank_interval: copyInterval(candidateRank),
    reference_rank_interval: copyInterval(record.rankInterval),
    reason_codes: [],
    evidence_ids: uniqueStrings(record.evidenceIds)
  };
}

function historySortValue(reference: MatchReference): number | null {
  if (
    reference.relation === "NOT_COMPARABLE" ||
    !reference.candidate_rank_interval ||
    !reference.reference_rank_interval
  ) {
    return null;
  }
  return (
    reference.candidate_rank_interval[0] +
    reference.candidate_rank_interval[1] -
    reference.reference_rank_interval[0] -
    reference.reference_rank_interval[1]
  );
}

function directionPriority(offering: MatchingOffering, priorities: readonly string[]): number {
  if (priorities.length === 0) return 0;
  let best = priorities.length;
  for (const tag of offering.directionTags) {
    const index = priorities.indexOf(tag);
    if (index >= 0 && index < best) best = index;
  }
  return best;
}

function coverageMatchesOffering(
  coverage: NanhangPublicDataManifest100["coverage"][number],
  offering: MatchingOffering
): boolean {
  return (
    coverage.scope_id === offering.scopeId &&
    coverage.year === offering.year &&
    coverage.track === offering.track &&
    coverage.batch === offering.batch &&
    coverage.stage === offering.stage &&
    coverage.admission_type === offering.admissionType
  );
}

export function buildMatchResult(input: BuildMatchResultInput): NanhangMatchResult100 {
  if (input.scenario.release_id !== input.release.release_id) {
    throw new Error("MATCH_RELEASE_MISMATCH");
  }
  if (
    input.rulesVersion !== input.release.rules_version ||
    input.rulesVersion !== "nh-rules-1.0.0"
  ) {
    throw new Error("MATCH_RULES_VERSION_MISMATCH");
  }

  const requestedScopeIds = new Set(input.scopeIds);
  const selectedCoverage = input.release.coverage
    .filter(
      (coverage) =>
        requestedScopeIds.has(coverage.scope_id) && coverage.track === input.scenario.track
    )
    .map((item) => ({ ...item, missing_notes: [...item.missing_notes] }))
    .sort((left, right) => compareAscii(left.scope_id, right.scope_id));
  if (selectedCoverage.length === 0 || selectedCoverage.length !== requestedScopeIds.size) {
    throw new Error("MATCH_COVERAGE_NOT_PUBLISHED");
  }
  const firstCoverage = selectedCoverage[0];
  if (!firstCoverage) throw new Error("MATCH_COVERAGE_NOT_PUBLISHED");
  const coverage: NanhangMatchResult100["coverage"] = [
    firstCoverage,
    ...selectedCoverage.slice(1)
  ];

  const excludedCounts = new Map<ReasonCode, number>();
  const addExcluded = (reasons: readonly ReasonCode[]): void => {
    for (const reason of uniqueReasons(reasons)) {
      excludedCounts.set(reason, (excludedCounts.get(reason) ?? 0) + 1);
    }
  };

  const inSelectedPublishedScope = input.offerings.filter((offering) => {
    if (
      offering.releaseId !== input.release.release_id ||
      !formalResultAllowed(offering.recordStatus)
    ) {
      return false;
    }
    const scope = selectedCoverage.find((item) => item.scope_id === offering.scopeId);
    return scope ? coverageMatchesOffering(scope, offering) : false;
  });

  const releaseIssue = releaseAvailability(input.release.status);
  if (releaseIssue) {
    if (inSelectedPublishedScope.length > 0) {
      excludedCounts.set("DATASET_WITHDRAWN", inSelectedPublishedScope.length);
    }
    return {
      result_version: "1.0.0",
      run_id: input.runId,
      input_revision: input.inputRevision,
      release_id: input.release.release_id,
      rules_version: input.rulesVersion,
      mode: input.mode,
      academic_basis: "target_scenario",
      coverage,
      candidates: [],
      excluded_summary: reasonOrder
        .filter((reason) => excludedCounts.has(reason))
        .map((reason) => ({ reason_code: reason, count: excludedCounts.get(reason) ?? 0 })),
      warnings: [releaseIssue]
    };
  }

  const evidence = buildEvidenceLookup(input.evidenceIndex);
  const academic = assessAcademicRank(
    input.scenario,
    input.release.release_id,
    input.distribution,
    evidence
  );
  const warnings: ReasonCode[] = academic.reason ? [academic.reason] : [];
  const targetPlanMissing = selectedCoverage.some(
    (item) => targetPlanStatus(input.scenario.target_exam_year, item.year).reason !== null
  );
  if (targetPlanMissing) warnings.push("TARGET_YEAR_PLAN_MISSING");

  const groupMetric = input.preferences.groupMetric ?? "group_filing_min";
  const priorities = input.preferences.directionPriority ?? [];
  const sortBy = input.preferences.sortBy ?? "direction";
  const sortable: Array<{
    output: MatchCandidate;
    offeringId: string;
    eligibility: "PASS" | "UNKNOWN";
    manualDirectionPriority: number;
    selectedSortValue: number | null;
  }> = [];
  const publishedOfferingCounts = new Map<string, number>();
  for (const offering of inSelectedPublishedScope) {
    publishedOfferingCounts.set(
      offering.offeringId,
      (publishedOfferingCounts.get(offering.offeringId) ?? 0) + 1
    );
  }

  for (const offering of input.offerings) {
    if (
      offering.releaseId !== input.release.release_id ||
      !formalResultAllowed(offering.recordStatus)
    ) {
      continue;
    }
    const scope = selectedCoverage.find((item) => item.scope_id === offering.scopeId);
    if (!scope) continue;
    if ((publishedOfferingCounts.get(offering.offeringId) ?? 0) > 1) {
      addExcluded(["SOURCE_CONFLICT"]);
      continue;
    }
    if (!coverageMatchesOffering(scope, offering)) {
      addExcluded(["SOURCE_CONFLICT"]);
      continue;
    }
    if (
      !evidenceMatches(evidence, offering.evidenceIds, {
        subjectType: "offering",
        subjectId: offering.offeringId
      })
    ) {
      addExcluded(["SOURCE_CONFLICT"]);
      continue;
    }

    const eligibility = evaluateEligibility(
      offering,
      input.selection,
      input.supportedAdmissionTypes
    );
    if (eligibility.status === "FAIL") {
      addExcluded(eligibility.reasons);
      continue;
    }
    const preference = evaluatePreferences(offering, input.preferences);
    if (preference.status === "FAIL") {
      addExcluded(preference.reasons);
      continue;
    }

    const groupReference = referenceFor(
      offering,
      "group",
      groupMetric,
      input.scenario,
      input.release.release_id,
      academic.rankInterval,
      academic.reason,
      evidence
    );
    const majorReference = referenceFor(
      offering,
      "major",
      "major_admission_min",
      input.scenario,
      input.release.release_id,
      academic.rankInterval,
      academic.reason,
      evidence
    );
    const candidateEvidence = uniqueStrings([
      ...offering.evidenceIds,
      ...groupReference.evidence_ids,
      ...majorReference.evidence_ids
    ]);
    const firstEvidence = candidateEvidence[0];
    if (!firstEvidence) {
      addExcluded(["SOURCE_CONFLICT"]);
      continue;
    }
    const output: MatchCandidate = {
      offering_id: offering.offeringId,
      eligibility: {
        status: eligibility.status,
        checked_requirements: eligibility.checkedRequirements,
        pending_requirements: eligibility.pendingRequirements,
        reason_codes: eligibility.reasons
      },
      group_reference: groupReference,
      major_reference: majorReference,
      interest_reason_refs: uniqueStrings(offering.interestReasonRefs),
      preference_status: preference.status,
      evidence_ids: [firstEvidence, ...candidateEvidence.slice(1)]
    };
    const selectedSortValue =
      sortBy === "group_history_position"
        ? historySortValue(groupReference)
        : sortBy === "major_history_position"
          ? historySortValue(majorReference)
          : null;
    sortable.push({
      output,
      offeringId: offering.offeringId,
      eligibility: eligibility.status,
      manualDirectionPriority: directionPriority(offering, priorities),
      selectedSortValue
    });
  }

  return {
    result_version: "1.0.0",
    run_id: input.runId,
    input_revision: input.inputRevision,
    release_id: input.release.release_id,
    rules_version: input.rulesVersion,
    mode: input.mode,
    academic_basis: "target_scenario",
    coverage,
    candidates: sortCandidates(sortable).map((item) => item.output),
    excluded_summary: reasonOrder
      .filter((reason) => excludedCounts.has(reason))
      .map((reason) => ({ reason_code: reason, count: excludedCounts.get(reason) ?? 0 })),
    warnings: uniqueReasons(warnings)
  };
}
