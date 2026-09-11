import type { ReasonCode } from "./types.js";

export function checkTuition(
  tuition: number | null,
  hardBudget: number
): { status: "PASS" | "FAIL" | "UNKNOWN"; reason?: ReasonCode } {
  if (tuition === null) return { status: "UNKNOWN", reason: "TUITION_UNKNOWN" };
  if (tuition > hardBudget) return { status: "FAIL", reason: "HARD_PREFERENCE_EXCLUDED" };
  return { status: "PASS" };
}

export function checkRegion(offeringRegion: string, hardRegions: readonly string[]): {
  excluded: boolean;
  reason?: ReasonCode;
} {
  return hardRegions.includes(offeringRegion)
    ? { excluded: false }
    : { excluded: true, reason: "HARD_PREFERENCE_EXCLUDED" };
}
