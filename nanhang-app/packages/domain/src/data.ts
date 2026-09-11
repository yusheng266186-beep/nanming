import type { ReasonCode } from "./types.js";

export function boundaryComparisonAllowed(metricType: string): boolean {
  return ["group_filing_min", "group_admission_min", "major_admission_min"].includes(
    metricType
  );
}

export function stagesComparable(observedStage: string, requestedStage: string): boolean {
  return observedStage === requestedStage;
}

export function targetPlanStatus(targetYear: number, latestPlanYear: number): {
  explorationAllowed: true;
  reason: ReasonCode | null;
} {
  return {
    explorationAllowed: true,
    reason: latestPlanYear < targetYear ? "TARGET_YEAR_PLAN_MISSING" : null
  };
}

export function formalResultAllowed(recordStatus: string): boolean {
  return recordStatus === "PUBLISHED";
}

export function releaseAvailability(status: "PUBLISHED" | "WITHDRAWN"): ReasonCode | null {
  return status === "WITHDRAWN" ? "DATASET_WITHDRAWN" : null;
}

export function planChange(oldCount: number, newCount: number): {
  displayPlanChange: boolean;
  automaticRankAdjustment: false;
} {
  return { displayPlanChange: oldCount !== newCount, automaticRankAdjustment: false };
}

export function publishAllowed(input: {
  evidenceComplete: boolean;
  containsPrivateStudentData: boolean;
}): boolean {
  return input.evidenceComplete && !input.containsPrivateStudentData;
}
