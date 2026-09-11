import { readFileSync } from "node:fs";

import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";

export type ContractName =
  | "student-profile"
  | "target-scenario"
  | "match-result"
  | "data-release";

export interface StructuralValidationResult {
  valid: boolean;
  errors: ErrorObject[];
}

export type ValidationSeverity = "error" | "warning";

export interface SemanticIssue {
  code: string;
  message: string;
  path: string;
  severity: ValidationSeverity;
}

export interface SemanticValidationResult {
  valid: boolean;
  issues: SemanticIssue[];
}

const schemaFiles: Record<ContractName, string> = {
  "student-profile": "student-profile.schema.json",
  "target-scenario": "target-scenario.schema.json",
  "match-result": "match-result.schema.json",
  "data-release": "data-release.schema.json"
};

const addFormats = addFormatsModule as unknown as (
  instance: InstanceType<typeof Ajv2020>
) => void;

// The frozen handoff schemas use constraints such as minItems inside a
// conditional subschema without restating type: "array". That is valid JSON
// Schema and validated by the parent property. strictTypes is therefore a
// compiler lint only and is disabled without weakening runtime validation.
const ajv = new Ajv2020({ allErrors: true, strictSchema: true, strictTypes: false });
addFormats(ajv);

const validators = Object.fromEntries(
  Object.entries(schemaFiles).map(([name, filename]) => {
    const url = new URL(`../schema/${filename}`, import.meta.url);
    const schema = JSON.parse(readFileSync(url, "utf8")) as object;
    return [name, ajv.compile(schema)];
  })
) as Record<ContractName, ValidateFunction>;

export function validateStructure(
  name: ContractName,
  value: unknown
): StructuralValidationResult {
  const validate = validators[name];
  const valid = validate(value);
  return {
    valid,
    errors: valid ? [] : [...(validate.errors ?? [])]
  };
}

function issue(
  code: string,
  message: string,
  path: string,
  severity: ValidationSeverity = "error"
): SemanticIssue {
  return { code, message, path, severity };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export interface StudentSemanticContext {
  serverAuthenticated?: boolean;
}

export function validateStudentProfileSemantics(
  value: unknown,
  context: StudentSemanticContext = {}
): SemanticValidationResult {
  const issues: SemanticIssue[] = [];
  if (!validateStructure("student-profile", value).valid || !isRecord(value)) {
    return {
      valid: false,
      issues: [issue("SCHEMA_INVALID", "档案必须先通过结构校验", "$")]
    };
  }

  const selection = value.selection as Record<string, unknown>;
  const additional = asArray(selection.additional);
  if (selection.primary === null || additional.length !== 2) {
    issues.push(
      issue(
        "INCOMPLETE_SUBJECTS",
        "首选科目和两门再选科目尚未完整，资格只能保持待核对",
        "$.selection",
        "warning"
      )
    );
  }

  const seenExams = new Map<string, string>();
  for (const [index, rawObservation] of asArray(value.observations).entries()) {
    const observation = rawObservation as Record<string, unknown>;
    const base = `$.observations[${index}]`;
    const examId = String(observation.exam_id);
    const fingerprint = JSON.stringify(observation);
    const previous = seenExams.get(examId);
    if (previous !== undefined) {
      issues.push(
        issue(
          previous === fingerprint ? "DUPLICATE_EXAM_ID" : "EXAM_ID_CONFLICT",
          previous === fingerprint
            ? "相同考试记录重复出现"
            : "相同 exam_id 出现内容冲突，相关比较必须暂停",
          `${base}.exam_id`,
          previous === fingerprint ? "warning" : "error"
        )
      );
    } else {
      seenExams.set(examId, fingerprint);
    }

    const total = observation.total as Record<string, unknown>;
    if (
      typeof total.value === "number" &&
      typeof total.max_score === "number" &&
      total.value > total.max_score
    ) {
      issues.push(issue("TOTAL_EXCEEDS_MAX", "总分超过满分", `${base}.total.value`));
    }
    if (total.value !== null && total.origin !== "source") {
      issues.push(
        issue(
          "TOTAL_NOT_SOURCE",
          "非明确源总分不得进入招生定位",
          `${base}.total.origin`,
          "warning"
        )
      );
    }
    if (
      observation.kind === "gaokao" &&
      !["gaokao_cultural", "gaokao_filing"].includes(String(total.score_basis))
    ) {
      issues.push(
        issue(
          "UNKNOWN_SCORE_BASIS",
          "高考成绩必须声明文化分或投档分口径",
          `${base}.total.score_basis`
        )
      );
    }

    for (const [subjectCode, rawSubject] of Object.entries(
      observation.subjects as Record<string, unknown>
    )) {
      const subject = rawSubject as Record<string, unknown>;
      if (
        typeof subject.value === "number" &&
        typeof subject.max_score === "number" &&
        subject.value > subject.max_score
      ) {
        issues.push(
          issue(
            "SUBJECT_EXCEEDS_MAX",
            `${subjectCode} 分数超过满分`,
            `${base}.subjects.${subjectCode}.value`
          )
        );
      }
    }

    for (const [rankIndex, rawRank] of asArray(observation.ranks).entries()) {
      const rank = rawRank as Record<string, unknown>;
      const rankPath = `${base}.ranks[${rankIndex}]`;
      if (
        typeof rank.population === "number" &&
        typeof rank.value === "number" &&
        rank.value > rank.population
      ) {
        issues.push(
          issue("RANK_EXCEEDS_POPULATION", "名次不能超过参照人数", `${rankPath}.value`)
        );
      }
      if (observation.kind !== "gaokao" && rank.scope === "province_gaokao") {
        issues.push(
          issue(
            "NON_GAOKAO_PROVINCE_RANK",
            "校考或模考名次不得伪装为省高考位次",
            `${rankPath}.scope`
          )
        );
      }
    }
  }

  const provenance = value.provenance as Record<string, unknown>;
  if (
    !context.serverAuthenticated &&
    (provenance.origin === "school_verified" ||
      provenance.identity_binding === "server_verified")
  ) {
    issues.push(
      issue(
        "UNTRUSTED_IDENTITY_CLAIM",
        "导入 JSON 不能自行提升为学校或服务器已认证身份",
        "$.provenance"
      )
    );
  }

  return { valid: issues.every((item) => item.severity !== "error"), issues };
}

export interface TargetScenarioSemanticContext {
  filingBasisConfirmed?: boolean;
}

export function validateTargetScenarioSemantics(
  value: unknown,
  context: TargetScenarioSemanticContext = {}
): SemanticValidationResult {
  if (!validateStructure("target-scenario", value).valid || !isRecord(value)) {
    return {
      valid: false,
      issues: [issue("SCHEMA_INVALID", "目标情景必须先通过结构校验", "$")]
    };
  }
  const issues: SemanticIssue[] = [];
  if (value.score_basis === "gaokao_filing" && !context.filingBasisConfirmed) {
    issues.push(
      issue(
        "BONUS_BASIS_UNCONFIRMED",
        "投档分情景只有在确认无加分且与分段表口径兼容后才能定位",
        "$.score_basis"
      )
    );
  }
  return { valid: issues.every((item) => item.severity !== "error"), issues };
}

const groupMetrics = new Set(["group_filing_min", "group_admission_min"]);
const majorMetrics = new Set(["major_admission_min"]);

function validateInterval(
  raw: unknown,
  path: string,
  issues: SemanticIssue[]
): void {
  if (!Array.isArray(raw) || raw.length !== 2) return;
  const low = raw[0];
  const high = raw[1];
  if (typeof low === "number" && typeof high === "number" && low > high) {
    issues.push(issue("INVALID_RANK_INTERVAL", "位次区间必须从较好位次到较差位次", path));
  }
}

export function validateMatchResultSemantics(value: unknown): SemanticValidationResult {
  const issues: SemanticIssue[] = [];
  if (!validateStructure("match-result", value).valid || !isRecord(value)) {
    return {
      valid: false,
      issues: [issue("SCHEMA_INVALID", "匹配结果必须先通过结构校验", "$")]
    };
  }

  for (const [index, rawCandidate] of asArray(value.candidates).entries()) {
    const candidate = rawCandidate as Record<string, unknown>;
    const group = candidate.group_reference as Record<string, unknown>;
    const major = candidate.major_reference as Record<string, unknown>;
    validateInterval(
      group.candidate_rank_interval,
      `$.candidates[${index}].group_reference.candidate_rank_interval`,
      issues
    );
    validateInterval(
      group.reference_rank_interval,
      `$.candidates[${index}].group_reference.reference_rank_interval`,
      issues
    );
    validateInterval(
      major.candidate_rank_interval,
      `$.candidates[${index}].major_reference.candidate_rank_interval`,
      issues
    );
    validateInterval(
      major.reference_rank_interval,
      `$.candidates[${index}].major_reference.reference_rank_interval`,
      issues
    );
    if (group.relation !== "NOT_COMPARABLE" && !groupMetrics.has(String(group.metric_type))) {
      issues.push(
        issue(
          "GROUP_METRIC_MISMATCH",
          "专业组参考只能使用专业组投档或录取最低指标",
          `$.candidates[${index}].group_reference.metric_type`
        )
      );
    }
    if (major.relation !== "NOT_COMPARABLE" && !majorMetrics.has(String(major.metric_type))) {
      issues.push(
        issue(
          "MAJOR_METRIC_MISMATCH",
          "专业参考边界只能使用专业录取最低指标",
          `$.candidates[${index}].major_reference.metric_type`
        )
      );
    }
  }

  return { valid: issues.every((item) => item.severity !== "error"), issues };
}

export function validateDataReleaseSemantics(value: unknown): SemanticValidationResult {
  const issues: SemanticIssue[] = [];
  if (!validateStructure("data-release", value).valid || !isRecord(value)) {
    return {
      valid: false,
      issues: [issue("SCHEMA_INVALID", "数据发布清单必须先通过结构校验", "$")]
    };
  }

  const paths = new Set<string>();
  for (const [index, rawFile] of asArray(value.files).entries()) {
    const file = rawFile as Record<string, unknown>;
    const path = String(file.path);
    if (paths.has(path)) {
      issues.push(
        issue("DUPLICATE_RELEASE_PATH", "发布清单不能重复声明同一文件", `$.files[${index}].path`)
      );
    }
    paths.add(path);
  }
  if (!paths.has(String(value.evidence_index_path))) {
    issues.push(
      issue(
        "EVIDENCE_INDEX_NOT_LISTED",
        "证据索引必须作为带哈希的发布文件列入 files",
        "$.evidence_index_path"
      )
    );
  }

  return { valid: issues.every((item) => item.severity !== "error"), issues };
}
