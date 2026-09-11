/** Generated from the frozen handoff schema. Do not edit by hand. */

/**
 * 与真实考试档案分开存储；实际表的计分口径和可用范围由业务验证。首版不含加分情景，gaokao_filing仅在明确无加分且口径兼容时可用。
 */
export interface NanhangTargetScenario100 {
  scenario_version: "1.0.0";
  scenario_id: string;
  target_exam_year: number;
  reference_year: number;
  province: "SC";
  track: "PHYSICS" | "HISTORY";
  target_score: number;
  score_basis: "gaokao_cultural" | "gaokao_filing";
  release_id: string;
}
