/** Generated from the frozen handoff schema. Do not edit by hand. */

/**
 * 首版结构合同；禁止probability/admission_chance等未定义字段。区间方向、证据存在性与发布范围须业务验证。
 */
export interface NanhangMatchResult100 {
  result_version: "1.0.0";
  run_id: string;
  input_revision: number;
  release_id: string;
  rules_version: "nh-rules-1.0.0";
  mode: "exploration" | "application_support";
  academic_basis: "official_score" | "official_rank" | "target_scenario" | "school_context" | "no_academic_data";
  /**
   * @minItems 1
   */
  coverage: [
    {
      scope_id: string;
      year: number;
      track: "PHYSICS" | "HISTORY";
      batch: string;
      stage: string | null;
      admission_type: string;
      published_offerings: number;
      known_scope_total: number | null;
      exhaustive: boolean;
      missing_notes: string[];
    },
    ...{
      scope_id: string;
      year: number;
      track: "PHYSICS" | "HISTORY";
      batch: string;
      stage: string | null;
      admission_type: string;
      published_offerings: number;
      known_scope_total: number | null;
      exhaustive: boolean;
      missing_notes: string[];
    }[]
  ];
  candidates: {
    offering_id: string;
    eligibility: {
      status: "PASS" | "UNKNOWN";
      checked_requirements: string[];
      pending_requirements: string[];
      reason_codes: (
        | "INCOMPLETE_SUBJECTS"
        | "SUBJECT_REQUIREMENT_FAILED"
        | "UNKNOWN_REQUIREMENT"
        | "UNSUPPORTED_SCOPE"
        | "SCHOOL_SCORE_UNCALIBRATED"
        | "TOTAL_NOT_SOURCE"
        | "UNKNOWN_SCORE_BASIS"
        | "BONUS_BASIS_MISMATCH"
        | "RANK_CONFLICT"
        | "NO_OBSERVED_SCORE"
        | "OUT_OF_DISTRIBUTION_COVERAGE"
        | "MAJOR_HISTORY_MISSING"
        | "GROUP_HISTORY_MISSING"
        | "GROUP_CHANGED"
        | "SOURCE_CONFLICT"
        | "TARGET_YEAR_PLAN_MISSING"
        | "DATASET_WITHDRAWN"
        | "TUITION_UNKNOWN"
        | "HARD_PREFERENCE_EXCLUDED"
        | "NO_ACADEMIC_INPUT"
        | "NO_CALIBRATION_MODEL"
      )[];
    };
    group_reference: {
      [k: string]: any;
    };
    major_reference: {
      [k: string]: any;
    };
    interest_reason_refs: string[];
    preference_status: "PASS" | "UNKNOWN";
    /**
     * @minItems 1
     */
    evidence_ids: [string, ...string[]];
  }[];
  excluded_summary: {
    reason_code:
      | "INCOMPLETE_SUBJECTS"
      | "SUBJECT_REQUIREMENT_FAILED"
      | "UNKNOWN_REQUIREMENT"
      | "UNSUPPORTED_SCOPE"
      | "SCHOOL_SCORE_UNCALIBRATED"
      | "TOTAL_NOT_SOURCE"
      | "UNKNOWN_SCORE_BASIS"
      | "BONUS_BASIS_MISMATCH"
      | "RANK_CONFLICT"
      | "NO_OBSERVED_SCORE"
      | "OUT_OF_DISTRIBUTION_COVERAGE"
      | "MAJOR_HISTORY_MISSING"
      | "GROUP_HISTORY_MISSING"
      | "GROUP_CHANGED"
      | "SOURCE_CONFLICT"
      | "TARGET_YEAR_PLAN_MISSING"
      | "DATASET_WITHDRAWN"
      | "TUITION_UNKNOWN"
      | "HARD_PREFERENCE_EXCLUDED"
      | "NO_ACADEMIC_INPUT"
      | "NO_CALIBRATION_MODEL";
    count: number;
  }[];
  warnings: (
    | "INCOMPLETE_SUBJECTS"
    | "SUBJECT_REQUIREMENT_FAILED"
    | "UNKNOWN_REQUIREMENT"
    | "UNSUPPORTED_SCOPE"
    | "SCHOOL_SCORE_UNCALIBRATED"
    | "TOTAL_NOT_SOURCE"
    | "UNKNOWN_SCORE_BASIS"
    | "BONUS_BASIS_MISMATCH"
    | "RANK_CONFLICT"
    | "NO_OBSERVED_SCORE"
    | "OUT_OF_DISTRIBUTION_COVERAGE"
    | "MAJOR_HISTORY_MISSING"
    | "GROUP_HISTORY_MISSING"
    | "GROUP_CHANGED"
    | "SOURCE_CONFLICT"
    | "TARGET_YEAR_PLAN_MISSING"
    | "DATASET_WITHDRAWN"
    | "TUITION_UNKNOWN"
    | "HARD_PREFERENCE_EXCLUDED"
    | "NO_ACADEMIC_INPUT"
    | "NO_CALIBRATION_MODEL"
  )[];
}
