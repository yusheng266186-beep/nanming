import type { RankInterval, ReferenceRelation, ReasonCode } from "./types.js";

export function isRankInterval(value: RankInterval): boolean {
  return (
    Number.isInteger(value[0]) &&
    Number.isInteger(value[1]) &&
    value[0] >= 1 &&
    value[0] <= value[1]
  );
}

export function compareRankIntervals(
  candidate: RankInterval,
  reference: RankInterval
): ReferenceRelation {
  if (!isRankInterval(candidate) || !isRankInterval(reference)) {
    throw new Error("INVALID_RANK_INTERVAL");
  }
  if (candidate[1] < reference[0]) return "AHEAD_OF_REFERENCE";
  if (candidate[0] > reference[1]) return "BEHIND_REFERENCE";
  return "OVERLAPS_REFERENCE";
}

export function referenceAvailability(input: {
  hasGroupHistory: boolean;
  hasMajorHistory: boolean;
  groupChanged?: boolean;
}): {
  groupRelation: "PENDING" | "NOT_COMPARABLE";
  majorRelation: "PENDING" | "NOT_COMPARABLE";
  reasons: ReasonCode[];
} {
  const reasons: ReasonCode[] = [];
  if (input.groupChanged) reasons.push("GROUP_CHANGED");
  if (!input.hasGroupHistory) reasons.push("GROUP_HISTORY_MISSING");
  if (!input.hasMajorHistory) reasons.push("MAJOR_HISTORY_MISSING");
  return {
    groupRelation:
      input.hasGroupHistory && !input.groupChanged ? "PENDING" : "NOT_COMPARABLE",
    majorRelation:
      input.hasMajorHistory && !input.groupChanged ? "PENDING" : "NOT_COMPARABLE",
    reasons
  };
}
