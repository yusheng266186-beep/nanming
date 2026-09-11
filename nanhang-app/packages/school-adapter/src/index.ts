import { createHash, randomUUID } from "node:crypto";

import {
  validateStructure,
  validateStudentProfileSemantics,
  type NanhangStudentProfileEnvelope100
} from "@nanhang/contracts";

export const ACCURACY_V12_SOURCE_COMMIT =
  "6f70eab4e6e9ecadc00149b1387103b45b5d8e2b" as const;

type SubjectCode =
  | "CHINESE"
  | "MATH"
  | "FOREIGN_LANGUAGE"
  | "PHYSICS"
  | "HISTORY"
  | "CHEMISTRY"
  | "BIOLOGY"
  | "POLITICS"
  | "GEOGRAPHY";

type SubjectState =
  | "valid"
  | "missing"
  | "absent"
  | "deferred"
  | "not_applicable"
  | "formula_error"
  | "invalid";

export interface ClassifiedSubjectScore {
  value: number | null;
  state: SubjectState;
}

const textStates: Record<string, SubjectState> = {
  "": "missing",
  "缺考": "absent",
  "未考": "absent",
  "缓考": "deferred",
  "不适用": "not_applicable",
  "#VALUE!": "formula_error",
  "#N/A": "formula_error"
};

export function classifySubjectScore(raw: unknown): ClassifiedSubjectScore {
  if (raw === null || raw === undefined) return { value: null, state: "missing" };
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= 0
      ? { value: raw, state: "valid" }
      : { value: null, state: "invalid" };
  }
  if (typeof raw === "string") {
    const normalized = raw.trim();
    const known = textStates[normalized];
    if (known) return { value: null, state: known };
    if (normalized === "0") return { value: 0, state: "valid" };
    const numeric = Number(normalized);
    if (normalized !== "" && Number.isFinite(numeric) && numeric >= 0) {
      return { value: numeric, state: "valid" };
    }
  }
  return { value: null, state: "invalid" };
}

export interface SourceSubject {
  raw: unknown;
  maxScore: number | null;
  scoreBasis: "raw" | "converted" | "mixed" | "unknown";
}

export interface SelectedStudentRecord {
  stableStudentId?: string | null;
  sourceExamId: string;
  sourceExamLabel: string;
  occurredAt?: string | null;
  examYear?: number | null;
  kind: "gaokao" | "mock" | "school_exam";
  total: number | null;
  totalMaxScore: number | null;
  totalOrigin: "source" | "reconstructed" | "unknown";
  totalScoreBasis:
    | "raw_total"
    | "converted_total"
    | "mixed_total"
    | "gaokao_cultural"
    | "gaokao_filing"
    | "unknown";
  primary: "PHYSICS" | "HISTORY" | null;
  additional: Array<"CHEMISTRY" | "BIOLOGY" | "POLITICS" | "GEOGRAPHY">;
  subjects: Partial<Record<SubjectCode, SourceSubject>>;
  schoolRank?: number | null;
  schoolPopulation?: number | null;
  sourceRef: string;
  sourceDigest?: string | null;
  sourceQualityConfidence?: number | null;
  claimedVerifiedOrigin?: boolean;
}

export interface AdapterOptions {
  targetExamYear: number;
  selectionConfirmedByStudent: boolean;
  stableIdConfirmed: boolean;
  generatedAt: string;
  createLocalId?: () => string;
}

export interface AdapterResult {
  profile: NanhangStudentProfileEnvelope100;
  warnings: string[];
}

function normalizeSubject(input: SourceSubject) {
  const classified = classifySubjectScore(input.raw);
  return {
    value: classified.value,
    state: classified.state,
    max_score: input.maxScore,
    score_basis: input.scoreBasis
  };
}

function sourceCommit(): string {
  return ACCURACY_V12_SOURCE_COMMIT;
}

export function adaptSelectedStudent(
  record: SelectedStudentRecord,
  options: AdapterOptions
): AdapterResult {
  const warnings: string[] = [];
  const createLocalId = options.createLocalId ?? (() => randomUUID());
  const subjectId =
    options.stableIdConfirmed && record.stableStudentId
      ? `school:${createHash("sha256").update(record.stableStudentId).digest("hex").slice(0, 24)}`
      : `local:${createLocalId()}`;

  if (!options.stableIdConfirmed || !record.stableStudentId) {
    warnings.push("STABLE_SUBJECT_ID_MISSING");
  }
  if (record.occurredAt === undefined || record.occurredAt === null) {
    warnings.push("DATE_UNKNOWN");
  }
  if (record.totalOrigin !== "source") warnings.push("TOTAL_NOT_SOURCE");
  if (record.totalScoreBasis === "unknown") warnings.push("SCORE_BASIS_UNKNOWN");
  if (record.claimedVerifiedOrigin) warnings.push("UNTRUSTED_VERIFICATION_CLAIM_IGNORED");
  if (record.sourceQualityConfidence !== undefined && record.sourceQualityConfidence !== null) {
    warnings.push("SOURCE_QUALITY_CONFIDENCE_NOT_ADMISSION_PROBABILITY");
  }

  const subjects = Object.fromEntries(
    Object.entries(record.subjects).map(([code, subject]) => [
      code,
      normalizeSubject(subject as SourceSubject)
    ])
  ) as NanhangStudentProfileEnvelope100["observations"][number]["subjects"];

  const ranks = (
    record.schoolRank === undefined || record.schoolRank === null
      ? []
      : [
          {
            value: record.schoolRank,
            scope: "school" as const,
            population: record.schoolPopulation ?? null,
            tie_convention: "unknown" as const,
            score_basis: record.totalScoreBasis,
            source_status: "imported_unverified" as const
          }
        ]
  ) as NanhangStudentProfileEnvelope100["observations"][number]["ranks"];

  const profile: NanhangStudentProfileEnvelope100 = {
    envelope_version: "1.0.0",
    subject_id: subjectId,
    target_exam_year: options.targetExamYear,
    province: "SC",
    selection: {
      primary: record.primary,
      additional: [
        ...record.additional
      ] as NanhangStudentProfileEnvelope100["selection"]["additional"],
      confirmed_by_student: options.selectionConfirmedByStudent
    },
    observations: [
      {
        exam_id: record.sourceExamId,
        source_exam_label: record.sourceExamLabel,
        occurred_at: record.occurredAt ?? null,
        exam_year: record.examYear ?? null,
        kind: record.kind,
        total: {
          value: record.total,
          max_score: record.totalMaxScore,
          origin: record.totalOrigin,
          score_basis: record.totalScoreBasis
        },
        subjects,
        ranks,
        contextual_lines: [],
        comparison_group_id: null,
        source_refs: [record.sourceRef],
        quality_flags: [...warnings]
      }
    ],
    provenance: {
      origin: "local_import",
      identity_binding: "local_only",
      source_commit: sourceCommit(),
      source_digest: record.sourceDigest ?? null,
      generated_at: options.generatedAt,
      warnings: [...warnings]
    }
  };

  return { profile, warnings };
}

export function canAutoMergeStudentRecords(input: {
  stableIdLeft: string | null;
  stableIdRight: string | null;
}): boolean {
  return (
    input.stableIdLeft !== null &&
    input.stableIdRight !== null &&
    input.stableIdLeft === input.stableIdRight
  );
}

/** Exact public field vocabulary from accuracy-v1.2 app/lib/types.ts. */
export type AccuracyV12Track = "物理类" | "历史类" | "未配置";
export type AccuracyV12SubjectName =
  | "语文"
  | "数学"
  | "英语"
  | "日语"
  | "物理"
  | "历史"
  | "化学"
  | "生物"
  | "政治"
  | "地理";
export type AccuracyV12ScoreCellState =
  | "valid"
  | "missing"
  | "absent"
  | "deferred"
  | "not-applicable"
  | "formula-error"
  | "invalid";

export interface AccuracyV12SourceLocation {
  sheet: string;
  row: number;
  column?: number;
}

export interface AccuracyV12StudentScore {
  exam: string;
  rawExam: string;
  school: string;
  classNo: number;
  name: string;
  track: AccuracyV12Track;
  classType: string;
  combination: string;
  total: number;
  source?: AccuracyV12SourceLocation;
  subjectStates?: Partial<Record<AccuracyV12SubjectName, AccuracyV12ScoreCellState>>;
  totalSource?: "source" | "reconstructed";
  cityRank: number | null;
  schoolRank: number | null;
  subjects: Partial<Record<AccuracyV12SubjectName, number>>;
}

export interface AccuracyV12ScoreConflict {
  key: string;
  candidates: AccuracyV12StudentScore[];
  resolution: "excluded" | "rank-only";
}

export interface AccuracyV12SelectedInput {
  /**
   * Runtime boundary deliberately accepts unknown because JSON can omit or alter
   * fields even though accuracy-v1.2's declared StudentScore.total is a number.
   */
  selectedScore: unknown;
  scoreConflicts?: readonly AccuracyV12ScoreConflict[];
  sourceQualityConfidence?: number | null;
  sourceDigest?: string | null;
  claimedVerifiedOrigin?: boolean;
}

export interface AccuracyV12SubjectConfirmation {
  maxScore?: number | null;
  scoreBasis?: SourceSubject["scoreBasis"];
}

export interface AccuracyV12AdapterOptions {
  targetExamYear: number;
  selectionConfirmedByStudent: boolean;
  generatedAt: string;
  stableStudentId?: string | null;
  stableIdConfirmed?: boolean;
  occurredAt?: string | null;
  examYear?: number | null;
  kind?: SelectedStudentRecord["kind"];
  totalMaxScore?: number | null;
  totalScoreBasis?: SelectedStudentRecord["totalScoreBasis"];
  subjectConfirmations?: Partial<
    Record<AccuracyV12SubjectName, AccuracyV12SubjectConfirmation>
  >;
  createLocalId?: () => string;
}

export interface AccuracyV12AdapterResult {
  status: "adapted" | "rejected";
  profile: NanhangStudentProfileEnvelope100 | null;
  warnings: string[];
  rejectionReasons: string[];
}

type AccuracyV12RuntimeScore = Omit<AccuracyV12StudentScore, "total" | "subjects"> & {
  total?: unknown;
  subjects: Partial<Record<AccuracyV12SubjectName, unknown>>;
};

const accuracySubjectCodes: Record<AccuracyV12SubjectName, SubjectCode> = {
  语文: "CHINESE",
  数学: "MATH",
  英语: "FOREIGN_LANGUAGE",
  日语: "FOREIGN_LANGUAGE",
  物理: "PHYSICS",
  历史: "HISTORY",
  化学: "CHEMISTRY",
  生物: "BIOLOGY",
  政治: "POLITICS",
  地理: "GEOGRAPHY"
};

const accuracySubjectNames = Object.keys(accuracySubjectCodes) as AccuracyV12SubjectName[];
const accuracyStateMap: Record<AccuracyV12ScoreCellState, SubjectState> = {
  valid: "valid",
  missing: "missing",
  absent: "absent",
  deferred: "deferred",
  "not-applicable": "not_applicable",
  "formula-error": "formula_error",
  invalid: "invalid"
};

function addWarning(warnings: string[], warning: string): void {
  if (!warnings.includes(warning)) warnings.push(warning);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSourceLocation(value: unknown): value is AccuracyV12SourceLocation {
  return (
    isRecord(value) &&
    typeof value.sheet === "string" &&
    value.sheet.length > 0 &&
    Number.isInteger(value.row) &&
    Number(value.row) > 0
  );
}

function parseAccuracyScore(value: unknown): AccuracyV12RuntimeScore | null {
  if (!isRecord(value) || !isRecord(value.subjects)) return null;
  if (
    typeof value.exam !== "string" ||
    !value.exam ||
    typeof value.rawExam !== "string" ||
    !value.rawExam ||
    typeof value.school !== "string" ||
    !value.school ||
    !Number.isInteger(value.classNo) ||
    Number(value.classNo) <= 0 ||
    typeof value.name !== "string" ||
    !value.name ||
    !["物理类", "历史类", "未配置"].includes(String(value.track)) ||
    typeof value.classType !== "string" ||
    typeof value.combination !== "string"
  ) {
    return null;
  }
  if (value.source !== undefined && !isSourceLocation(value.source)) return null;
  if (value.subjectStates !== undefined && !isRecord(value.subjectStates)) return null;
  return value as unknown as AccuracyV12RuntimeScore;
}

function sourceRecordKey(score: AccuracyV12RuntimeScore): string {
  return `${score.exam}::${score.classNo}::${score.name}`;
}

function sourceReference(source: AccuracyV12SourceLocation): string {
  return `accuracy-v1.2:${source.sheet}:row:${source.row}`;
}

function sameScoreFingerprint(
  left: Pick<AccuracyV12RuntimeScore, "rawExam" | "total" | "subjects" | "subjectStates">,
  right: Pick<AccuracyV12RuntimeScore, "rawExam" | "total" | "subjects" | "subjectStates">
) {
  const fingerprint = (
    score: Pick<AccuracyV12RuntimeScore, "rawExam" | "total" | "subjects" | "subjectStates">
  ) =>
    JSON.stringify([
      score.rawExam,
      score.total,
      Object.entries(score.subjects).sort(([a], [b]) => a.localeCompare(b)),
      score.subjectStates ?? null
    ]);
  return fingerprint(left) === fingerprint(right);
}

function matchingConflict(
  score: AccuracyV12RuntimeScore,
  conflicts: readonly AccuracyV12ScoreConflict[]
): AccuracyV12ScoreConflict | undefined {
  const byKey = conflicts.find((conflict) => conflict.key === sourceRecordKey(score));
  if (byKey) return byKey;
  if (!score.source) return undefined;
  return conflicts.find((conflict) =>
    conflict.candidates.some(
      (candidate) =>
        candidate.source?.sheet === score.source?.sheet &&
        candidate.source?.row === score.source?.row
    )
  );
}

function mapSelection(
  score: AccuracyV12RuntimeScore,
  warnings: string[]
): Pick<NanhangStudentProfileEnvelope100["selection"], "primary" | "additional"> {
  const combinations: Record<
    string,
    {
      primary: "PHYSICS" | "HISTORY";
      additional: Array<"CHEMISTRY" | "BIOLOGY" | "POLITICS" | "GEOGRAPHY">;
      track: AccuracyV12Track;
    }
  > = {
    物化生: {
      primary: "PHYSICS",
      additional: ["CHEMISTRY", "BIOLOGY"],
      track: "物理类"
    },
    物化地: {
      primary: "PHYSICS",
      additional: ["CHEMISTRY", "GEOGRAPHY"],
      track: "物理类"
    },
    历政地: {
      primary: "HISTORY",
      additional: ["POLITICS", "GEOGRAPHY"],
      track: "历史类"
    }
  };
  const combination = combinations[score.combination];
  if (combination && combination.track === score.track) {
    return {
      primary: combination.primary,
      additional: combination.additional as NanhangStudentProfileEnvelope100["selection"]["additional"]
    };
  }
  if (combination && combination.track !== score.track) {
    addWarning(warnings, "SOURCE_SELECTION_CONFLICT");
    return { primary: null, additional: [] };
  }
  addWarning(warnings, "SOURCE_SELECTION_INCOMPLETE");
  return {
    primary: score.track === "物理类" ? "PHYSICS" : score.track === "历史类" ? "HISTORY" : null,
    additional: []
  };
}

function mapAccuracySubjects(
  score: AccuracyV12RuntimeScore,
  options: AccuracyV12AdapterOptions,
  warnings: string[]
): NanhangStudentProfileEnvelope100["observations"][number]["subjects"] {
  const output: NanhangStudentProfileEnvelope100["observations"][number]["subjects"] = {};
  const foreignLanguages = ["英语", "日语"] as const;
  const presentForeignLanguages = foreignLanguages.filter(
    (subject) => score.subjects[subject] !== undefined || score.subjectStates?.[subject] !== undefined
  );
  if (presentForeignLanguages.length > 1) {
    addWarning(warnings, "FOREIGN_LANGUAGE_CONFLICT");
  }

  for (const subjectName of accuracySubjectNames) {
    if (foreignLanguages.includes(subjectName as (typeof foreignLanguages)[number]) && presentForeignLanguages.length > 1) {
      continue;
    }
    const rawValue = score.subjects[subjectName];
    const sourceState = score.subjectStates?.[subjectName];
    if (rawValue === undefined && sourceState === undefined) continue;

    let state: SubjectState;
    let value: number | null = null;
    if (sourceState !== undefined) {
      state = accuracyStateMap[sourceState] ?? "invalid";
      if (state === "valid" && typeof rawValue === "number" && Number.isFinite(rawValue) && rawValue >= 0) {
        value = rawValue;
      } else if (state === "valid") {
        state = "invalid";
        addWarning(warnings, `SUBJECT_STATE_VALUE_CONFLICT:${subjectName}`);
      } else if (rawValue !== undefined) {
        addWarning(warnings, `SUBJECT_STATE_VALUE_CONFLICT:${subjectName}`);
      }
    } else if (typeof rawValue === "number" && Number.isFinite(rawValue) && rawValue >= 0) {
      state = "valid";
      value = rawValue;
    } else {
      state = "invalid";
    }

    const confirmation = options.subjectConfirmations?.[subjectName];
    const scoreBasis = confirmation?.scoreBasis ?? "unknown";
    if (scoreBasis === "unknown") addWarning(warnings, "SCORE_BASIS_UNKNOWN");
    output[accuracySubjectCodes[subjectName]] = {
      value,
      state,
      max_score: confirmation?.maxScore ?? null,
      score_basis: scoreBasis
    };
  }
  return output;
}

function mapRank(
  value: unknown,
  scope: "school" | "city",
  scoreBasis: SelectedStudentRecord["totalScoreBasis"],
  warnings: string[]
): NanhangStudentProfileEnvelope100["observations"][number]["ranks"][number] | null {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || Number(value) < 1) {
    addWarning(warnings, `INVALID_${scope.toUpperCase()}_RANK_IGNORED`);
    return null;
  }
  return {
    value: Number(value),
    scope,
    population: null,
    tie_convention: "unknown",
    score_basis: scoreBasis,
    source_status: "imported_unverified"
  };
}

function assertValidOutput(profile: NanhangStudentProfileEnvelope100): void {
  const structure = validateStructure("student-profile", profile);
  const semantics = validateStudentProfileSemantics(profile);
  if (!structure.valid || !semantics.valid) {
    throw new Error("SCHOOL_ADAPTER_INVALID_OUTPUT");
  }
}

/**
 * Adapts exactly one caller-selected accuracy-v1.2 StudentScore. It never searches
 * by name, emits classmates, or combines exams. Conflict candidates are used only
 * to reject an excluded row or to retain references for an exact duplicate.
 */
export function adaptAccuracyV12SelectedStudent(
  input: AccuracyV12SelectedInput,
  options: AccuracyV12AdapterOptions
): AccuracyV12AdapterResult {
  const warnings: string[] = [];
  const rejectionReasons: string[] = [];
  const score = parseAccuracyScore(input.selectedScore);
  if (!score) {
    return {
      status: "rejected",
      profile: null,
      warnings,
      rejectionReasons: ["SOURCE_RECORD_INVALID"]
    };
  }

  const conflict = matchingConflict(score, input.scoreConflicts ?? []);
  if (conflict?.resolution === "excluded") {
    return {
      status: "rejected",
      profile: null,
      warnings: ["SOURCE_RECORD_CONFLICT_EXCLUDED"],
      rejectionReasons: ["SOURCE_RECORD_CONFLICT"]
    };
  }
  if (conflict?.resolution === "rank-only") {
    const first = conflict.candidates[0];
    if (
      !first ||
      !sameScoreFingerprint(score, first) ||
      !conflict.candidates.every((candidate) => sameScoreFingerprint(first, candidate))
    ) {
      return {
        status: "rejected",
        profile: null,
        warnings: ["SOURCE_CONFLICT_METADATA_INVALID"],
        rejectionReasons: ["SOURCE_RECORD_CONFLICT"]
      };
    }
    addWarning(warnings, "EXACT_DUPLICATE_SOURCE_ROWS_COLLAPSED");
  }

  const createLocalId = options.createLocalId ?? (() => randomUUID());
  const subjectId =
    options.stableIdConfirmed && options.stableStudentId
      ? `school:${createHash("sha256").update(options.stableStudentId).digest("hex").slice(0, 24)}`
      : `local:${createLocalId()}`;
  if (!options.stableIdConfirmed || !options.stableStudentId) {
    addWarning(warnings, "STABLE_SUBJECT_ID_MISSING");
  }
  if (options.occurredAt === undefined || options.occurredAt === null) {
    addWarning(warnings, "DATE_UNKNOWN");
  }
  if (!options.selectionConfirmedByStudent) {
    addWarning(warnings, "SELECTION_NOT_STUDENT_CONFIRMED");
  }
  if (input.claimedVerifiedOrigin) {
    addWarning(warnings, "UNTRUSTED_VERIFICATION_CLAIM_IGNORED");
  }
  if (input.sourceQualityConfidence !== undefined && input.sourceQualityConfidence !== null) {
    addWarning(warnings, "SOURCE_QUALITY_CONFIDENCE_NOT_ADMISSION_PROBABILITY");
  }

  const sourceTotal =
    typeof score.total === "number" && Number.isFinite(score.total) && score.total >= 0
      ? score.total
      : null;
  const totalOrigin = score.totalSource ?? "unknown";
  const totalScoreBasis = options.totalScoreBasis ?? "unknown";
  const totalValue = totalOrigin === "source" ? sourceTotal : null;
  if (sourceTotal === null) addWarning(warnings, "SOURCE_TOTAL_MISSING_OR_INVALID");
  if (totalOrigin !== "source") addWarning(warnings, "TOTAL_NOT_SOURCE");
  if (totalScoreBasis === "unknown") addWarning(warnings, "SCORE_BASIS_UNKNOWN");

  const selection = mapSelection(score, warnings);
  const subjects = mapAccuracySubjects(score, options, warnings);
  const ranks = [
    mapRank(score.cityRank, "city", totalScoreBasis, warnings),
    mapRank(score.schoolRank, "school", totalScoreBasis, warnings)
  ].filter((rank) => rank !== null) as NanhangStudentProfileEnvelope100["observations"][number]["ranks"];

  const sourceRefs = new Set<string>();
  if (score.source) sourceRefs.add(sourceReference(score.source));
  conflict?.candidates.forEach((candidate) => {
    if (candidate.source) sourceRefs.add(sourceReference(candidate.source));
  });
  if (!sourceRefs.size) {
    sourceRefs.add("accuracy-v1.2:selected-record:source-location-unknown");
    addWarning(warnings, "SOURCE_LOCATION_UNKNOWN");
  }

  const examIdentity = JSON.stringify([score.school, score.exam, score.rawExam]);
  const examId = `accuracy_v1.2:${createHash("sha256").update(examIdentity).digest("hex").slice(0, 24)}`;
  const sourceDigest =
    typeof input.sourceDigest === "string" && /^[0-9a-f]{64}$/.test(input.sourceDigest)
      ? input.sourceDigest
      : null;
  if (input.sourceDigest && sourceDigest === null) addWarning(warnings, "SOURCE_DIGEST_INVALID");

  const profile: NanhangStudentProfileEnvelope100 = {
    envelope_version: "1.0.0",
    subject_id: subjectId,
    target_exam_year: options.targetExamYear,
    province: "SC",
    selection: {
      ...selection,
      confirmed_by_student: options.selectionConfirmedByStudent
    },
    observations: [
      {
        exam_id: examId,
        source_exam_label: score.rawExam,
        occurred_at: options.occurredAt ?? null,
        exam_year: options.examYear ?? null,
        kind: options.kind ?? "school_exam",
        total: {
          value: totalValue,
          max_score: options.totalMaxScore ?? null,
          origin: totalOrigin,
          score_basis: totalScoreBasis
        },
        subjects,
        ranks,
        contextual_lines: [],
        comparison_group_id: null,
        source_refs: [...sourceRefs] as NanhangStudentProfileEnvelope100["observations"][number]["source_refs"],
        quality_flags: [...warnings]
      }
    ],
    provenance: {
      origin: "local_import",
      identity_binding: "local_only",
      source_commit: ACCURACY_V12_SOURCE_COMMIT,
      source_digest: sourceDigest,
      generated_at: options.generatedAt,
      warnings: [...warnings]
    }
  };
  assertValidOutput(profile);
  return { status: "adapted", profile, warnings, rejectionReasons };
}
