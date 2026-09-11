/** Generated from the frozen handoff schema. Do not edit by hand. */

/**
 * 结构校验不证明身份、数据来源或语义有效性；school_verified/server_verified必须由服务器认证上下文授予，导入JSON不得自行提升。
 */
export interface NanhangStudentProfileEnvelope100 {
  envelope_version: "1.0.0";
  subject_id: string;
  target_exam_year: number;
  province: "SC";
  selection: {
    primary: ("PHYSICS" | "HISTORY") | null;
    /**
     * @maxItems 2
     */
    additional:
      | []
      | ["CHEMISTRY" | "BIOLOGY" | "POLITICS" | "GEOGRAPHY"]
      | ["CHEMISTRY" | "BIOLOGY" | "POLITICS" | "GEOGRAPHY", "CHEMISTRY" | "BIOLOGY" | "POLITICS" | "GEOGRAPHY"];
    confirmed_by_student: boolean;
  };
  /**
   * @maxItems 100
   */
  observations: {
    exam_id: string;
    source_exam_label: string;
    occurred_at: string | null;
    exam_year: number | null;
    kind: "gaokao" | "mock" | "school_exam";
    total: {
      value: number | null;
      max_score: number | null;
      origin: "source" | "reconstructed" | "unknown";
      score_basis: "raw_total" | "converted_total" | "mixed_total" | "gaokao_cultural" | "gaokao_filing" | "unknown";
    };
    subjects: {
      CHINESE?: {
        [k: string]: any;
      };
      MATH?: {
        [k: string]: any;
      };
      FOREIGN_LANGUAGE?: {
        [k: string]: any;
      };
      PHYSICS?: {
        [k: string]: any;
      };
      HISTORY?: {
        [k: string]: any;
      };
      CHEMISTRY?: {
        [k: string]: any;
      };
      BIOLOGY?: {
        [k: string]: any;
      };
      POLITICS?: {
        [k: string]: any;
      };
      GEOGRAPHY?: {
        [k: string]: any;
      };
    };
    /**
     * @maxItems 5
     */
    ranks:
      | []
      | [
          {
            value: number;
            scope: "school" | "city" | "joint_exam" | "province_gaokao";
            population: number | null;
            tie_convention: "competition" | "dense" | "official_individual" | "cumulative" | "unknown";
            score_basis: string;
            source_status: "imported_unverified" | "user_reported" | "source_confirmed";
          }
        ]
      | [
          {
            value: number;
            scope: "school" | "city" | "joint_exam" | "province_gaokao";
            population: number | null;
            tie_convention: "competition" | "dense" | "official_individual" | "cumulative" | "unknown";
            score_basis: string;
            source_status: "imported_unverified" | "user_reported" | "source_confirmed";
          },
          {
            value: number;
            scope: "school" | "city" | "joint_exam" | "province_gaokao";
            population: number | null;
            tie_convention: "competition" | "dense" | "official_individual" | "cumulative" | "unknown";
            score_basis: string;
            source_status: "imported_unverified" | "user_reported" | "source_confirmed";
          }
        ]
      | [
          {
            value: number;
            scope: "school" | "city" | "joint_exam" | "province_gaokao";
            population: number | null;
            tie_convention: "competition" | "dense" | "official_individual" | "cumulative" | "unknown";
            score_basis: string;
            source_status: "imported_unverified" | "user_reported" | "source_confirmed";
          },
          {
            value: number;
            scope: "school" | "city" | "joint_exam" | "province_gaokao";
            population: number | null;
            tie_convention: "competition" | "dense" | "official_individual" | "cumulative" | "unknown";
            score_basis: string;
            source_status: "imported_unverified" | "user_reported" | "source_confirmed";
          },
          {
            value: number;
            scope: "school" | "city" | "joint_exam" | "province_gaokao";
            population: number | null;
            tie_convention: "competition" | "dense" | "official_individual" | "cumulative" | "unknown";
            score_basis: string;
            source_status: "imported_unverified" | "user_reported" | "source_confirmed";
          }
        ]
      | [
          {
            value: number;
            scope: "school" | "city" | "joint_exam" | "province_gaokao";
            population: number | null;
            tie_convention: "competition" | "dense" | "official_individual" | "cumulative" | "unknown";
            score_basis: string;
            source_status: "imported_unverified" | "user_reported" | "source_confirmed";
          },
          {
            value: number;
            scope: "school" | "city" | "joint_exam" | "province_gaokao";
            population: number | null;
            tie_convention: "competition" | "dense" | "official_individual" | "cumulative" | "unknown";
            score_basis: string;
            source_status: "imported_unverified" | "user_reported" | "source_confirmed";
          },
          {
            value: number;
            scope: "school" | "city" | "joint_exam" | "province_gaokao";
            population: number | null;
            tie_convention: "competition" | "dense" | "official_individual" | "cumulative" | "unknown";
            score_basis: string;
            source_status: "imported_unverified" | "user_reported" | "source_confirmed";
          },
          {
            value: number;
            scope: "school" | "city" | "joint_exam" | "province_gaokao";
            population: number | null;
            tie_convention: "competition" | "dense" | "official_individual" | "cumulative" | "unknown";
            score_basis: string;
            source_status: "imported_unverified" | "user_reported" | "source_confirmed";
          }
        ]
      | [
          {
            value: number;
            scope: "school" | "city" | "joint_exam" | "province_gaokao";
            population: number | null;
            tie_convention: "competition" | "dense" | "official_individual" | "cumulative" | "unknown";
            score_basis: string;
            source_status: "imported_unverified" | "user_reported" | "source_confirmed";
          },
          {
            value: number;
            scope: "school" | "city" | "joint_exam" | "province_gaokao";
            population: number | null;
            tie_convention: "competition" | "dense" | "official_individual" | "cumulative" | "unknown";
            score_basis: string;
            source_status: "imported_unverified" | "user_reported" | "source_confirmed";
          },
          {
            value: number;
            scope: "school" | "city" | "joint_exam" | "province_gaokao";
            population: number | null;
            tie_convention: "competition" | "dense" | "official_individual" | "cumulative" | "unknown";
            score_basis: string;
            source_status: "imported_unverified" | "user_reported" | "source_confirmed";
          },
          {
            value: number;
            scope: "school" | "city" | "joint_exam" | "province_gaokao";
            population: number | null;
            tie_convention: "competition" | "dense" | "official_individual" | "cumulative" | "unknown";
            score_basis: string;
            source_status: "imported_unverified" | "user_reported" | "source_confirmed";
          },
          {
            value: number;
            scope: "school" | "city" | "joint_exam" | "province_gaokao";
            population: number | null;
            tie_convention: "competition" | "dense" | "official_individual" | "cumulative" | "unknown";
            score_basis: string;
            source_status: "imported_unverified" | "user_reported" | "source_confirmed";
          }
        ];
    /**
     * @maxItems 4
     */
    contextual_lines:
      | []
      | [
          {
            line_type: "mock_undergraduate" | "mock_special_control";
            value: number;
            track: "PHYSICS" | "HISTORY";
            source_ref: string;
            population_scope: string | null;
          }
        ]
      | [
          {
            line_type: "mock_undergraduate" | "mock_special_control";
            value: number;
            track: "PHYSICS" | "HISTORY";
            source_ref: string;
            population_scope: string | null;
          },
          {
            line_type: "mock_undergraduate" | "mock_special_control";
            value: number;
            track: "PHYSICS" | "HISTORY";
            source_ref: string;
            population_scope: string | null;
          }
        ]
      | [
          {
            line_type: "mock_undergraduate" | "mock_special_control";
            value: number;
            track: "PHYSICS" | "HISTORY";
            source_ref: string;
            population_scope: string | null;
          },
          {
            line_type: "mock_undergraduate" | "mock_special_control";
            value: number;
            track: "PHYSICS" | "HISTORY";
            source_ref: string;
            population_scope: string | null;
          },
          {
            line_type: "mock_undergraduate" | "mock_special_control";
            value: number;
            track: "PHYSICS" | "HISTORY";
            source_ref: string;
            population_scope: string | null;
          }
        ]
      | [
          {
            line_type: "mock_undergraduate" | "mock_special_control";
            value: number;
            track: "PHYSICS" | "HISTORY";
            source_ref: string;
            population_scope: string | null;
          },
          {
            line_type: "mock_undergraduate" | "mock_special_control";
            value: number;
            track: "PHYSICS" | "HISTORY";
            source_ref: string;
            population_scope: string | null;
          },
          {
            line_type: "mock_undergraduate" | "mock_special_control";
            value: number;
            track: "PHYSICS" | "HISTORY";
            source_ref: string;
            population_scope: string | null;
          },
          {
            line_type: "mock_undergraduate" | "mock_special_control";
            value: number;
            track: "PHYSICS" | "HISTORY";
            source_ref: string;
            population_scope: string | null;
          }
        ];
    comparison_group_id: string | null;
    /**
     * @minItems 1
     * @maxItems 10
     */
    source_refs:
      | [string]
      | [string, string]
      | [string, string, string]
      | [string, string, string, string]
      | [string, string, string, string, string]
      | [string, string, string, string, string, string]
      | [string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string, string, string];
    /**
     * @maxItems 30
     */
    quality_flags: string[];
  }[];
  provenance: {
    origin: "local_import" | "user_entered" | "school_verified" | "user_edited" | "synthetic";
    identity_binding: "none" | "local_only" | "server_verified";
    source_commit: string | null;
    source_digest: string | null;
    generated_at: string;
    /**
     * @maxItems 30
     */
    warnings: string[];
  };
}
