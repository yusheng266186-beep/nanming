// TASK-08: the demo evidence registry for the local API server.
//
// These are synthetic statements with the same shape the web app produces, so the gateway's
// evidence-ID check has something real to validate against. No student data is involved.
import type { StudentMessageEvidence } from "@nanhang/exploration";

/** Development-only access code. Production issuance is a separate, unopened flow (TASK-13). */
export const DEMO_TRIAL_CODE = "local-trial-code";

/** Refers to the P4 academic binding that has no issuance path yet; kept for the A40 assertion. */
export const DEMO_ACADEMIC_BINDING = "binding-not-issued";

export function demoEvidence(): readonly StudentMessageEvidence[] {
  return [
    { evidenceId: "ev-q-interest-1", messageId: "q-interest", quote: "我愿意继续整理公开数据并核对空值",
      kind: "student_preference_statement" },
    { evidenceId: "ev-q-attempt-2", messageId: "q-attempt", quote: "我搭过纸桥并记录了测试方法",
      kind: "student_task_attempt" },
    { evidenceId: "ev-q-constraint-3", messageId: "q-constraint", quote: "家里希望就近，费用也需要考虑",
      kind: "student_self_report" }
  ];
}
