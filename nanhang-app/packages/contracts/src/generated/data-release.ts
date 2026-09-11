/** Generated from the frozen handoff schema. Do not edit by hand. */

export interface NanhangPublicDataManifest100 {
  manifest_version: "1.0.0";
  release_id: string;
  created_at: string;
  schema_version: "1.0.0";
  rules_version: "nh-rules-1.0.0";
  status: "PUBLISHED" | "WITHDRAWN";
  synthetic: boolean;
  /**
   * @minItems 1
   */
  files: [
    {
      path: string;
      sha256: string;
      size_bytes: number;
    },
    ...{
      path: string;
      sha256: string;
      size_bytes: number;
    }[]
  ];
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
  evidence_index_path: string;
}
