export interface SortableCandidate {
  offeringId: string;
  eligibility: "PASS" | "UNKNOWN";
  manualDirectionPriority: number;
  selectedSortValue: number | null;
}

export function sortCandidates<T extends SortableCandidate>(candidates: readonly T[]): T[] {
  const eligibilityOrder = { PASS: 0, UNKNOWN: 1 } as const;
  return [...candidates].sort((left, right) => {
    const eligibility =
      eligibilityOrder[left.eligibility] - eligibilityOrder[right.eligibility];
    if (eligibility !== 0) return eligibility;
    const direction = left.manualDirectionPriority - right.manualDirectionPriority;
    if (direction !== 0) return direction;
    if (left.selectedSortValue !== right.selectedSortValue) {
      if (left.selectedSortValue === null) return 1;
      if (right.selectedSortValue === null) return -1;
      return left.selectedSortValue - right.selectedSortValue;
    }
    if (left.offeringId < right.offeringId) return -1;
    if (left.offeringId > right.offeringId) return 1;
    return 0;
  });
}
