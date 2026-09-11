import type { ReasonCode, TriState } from "./types.js";

export interface SubjectSelection {
  primary: "PHYSICS" | "HISTORY" | null;
  additional: readonly string[];
}

export type SubjectRule =
  | { kind: "all_of"; subjects: readonly string[] }
  | { kind: "any_of"; subjects: readonly string[] };

export interface EligibilityResult {
  status: TriState;
  reason?: Extract<
    ReasonCode,
    "INCOMPLETE_SUBJECTS" | "SUBJECT_REQUIREMENT_FAILED" | "UNSUPPORTED_SCOPE"
  >;
}

export function combineConditions(conditions: readonly TriState[]): TriState {
  if (conditions.includes("FAIL")) return "FAIL";
  if (conditions.includes("UNKNOWN")) return "UNKNOWN";
  return "PASS";
}

export function evaluateSubjectRule(
  selection: SubjectSelection,
  rule: SubjectRule
): EligibilityResult {
  if (selection.primary === null || selection.additional.length !== 2) {
    return { status: "UNKNOWN", reason: "INCOMPLETE_SUBJECTS" };
  }
  const chosen = new Set([selection.primary, ...selection.additional]);
  const passed =
    rule.kind === "all_of"
      ? rule.subjects.every((subject) => chosen.has(subject))
      : rule.subjects.some((subject) => chosen.has(subject));
  return passed
    ? { status: "PASS" }
    : { status: "FAIL", reason: "SUBJECT_REQUIREMENT_FAILED" };
}

export function checkAdmissionScope(
  admissionType: string,
  supported: readonly string[]
): EligibilityResult {
  return supported.includes(admissionType)
    ? { status: "PASS" }
    : { status: "FAIL", reason: "UNSUPPORTED_SCOPE" };
}
