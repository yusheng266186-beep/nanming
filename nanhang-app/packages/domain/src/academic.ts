import type { RankInterval, ReasonCode, ReferenceRelation } from "./types.js";

export interface AcademicAssessment {
  academicBasis: "official_score" | "official_rank" | "school_context" | "target_scenario";
  relation: ReferenceRelation;
  reason?: ReasonCode;
}

export function assessObservedScore(input: {
  kind: "gaokao" | "mock" | "school_exam";
  totalOrigin: "source" | "reconstructed" | "unknown";
  calibrationEnabled: boolean;
}): AcademicAssessment {
  if (input.kind !== "gaokao") {
    return {
      academicBasis: "school_context",
      relation: "NOT_COMPARABLE",
      reason: "SCHOOL_SCORE_UNCALIBRATED"
    };
  }
  if (input.totalOrigin !== "source") {
    return {
      academicBasis: "official_score",
      relation: "NOT_COMPARABLE",
      reason: "TOTAL_NOT_SOURCE"
    };
  }
  return { academicBasis: "official_score", relation: "NOT_COMPARABLE" };
}

export function checkScoreBasis(input: {
  scoreBasis: string;
  tableBasis: string;
  bonus?: number;
}): ReasonCode | null {
  if (input.scoreBasis === input.tableBasis) return null;
  if ((input.bonus ?? 0) !== 0) return "BONUS_BASIS_MISMATCH";
  return "UNKNOWN_SCORE_BASIS";
}

export function detectRankConflict(
  officialRank: number,
  scoreTableInterval: RankInterval
): ReasonCode | null {
  return officialRank < scoreTableInterval[0] || officialRank > scoreTableInterval[1]
    ? "RANK_CONFLICT"
    : null;
}

export function tracksComparable(candidateTrack: string, tableTrack: string): boolean {
  return candidateTrack === tableTrack;
}
