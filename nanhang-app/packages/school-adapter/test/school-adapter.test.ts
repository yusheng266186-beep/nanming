import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { validateStructure, validateStudentProfileSemantics } from "@nanhang/contracts";

import {
  adaptSelectedStudent,
  adaptAccuracyV12SelectedStudent,
  canAutoMergeStudentRecords,
  classifySubjectScore,
  type AccuracyV12ScoreConflict,
  type AccuracyV12StudentScore,
  type SelectedStudentRecord
} from "../src/index.js";

const baseRecord: SelectedStudentRecord = {
  stableStudentId: null,
  sourceExamId: "synthetic-exam-51",
  sourceExamLabel: "51",
  kind: "school_exam",
  total: 480,
  totalMaxScore: 750,
  totalOrigin: "source",
  totalScoreBasis: "unknown",
  primary: "PHYSICS",
  additional: ["CHEMISTRY", "BIOLOGY"],
  subjects: {
    CHINESE: { raw: 0, maxScore: 150, scoreBasis: "raw" },
    MATH: { raw: "缺考", maxScore: 150, scoreBasis: "raw" }
  },
  schoolRank: 25,
  sourceRef: "synthetic-workbook:row34",
  sourceQualityConfidence: 0.98,
  claimedVerifiedOrigin: true
};

const options = {
  targetExamYear: 2027,
  selectionConfirmedByStudent: true,
  stableIdConfirmed: false,
  generatedAt: "2026-09-10T00:00:00Z",
  createLocalId: () => "synthetic-local-001"
};

describe("single-student school adapter A34-A39", () => {
  it("A34 preserves a real zero score", () => {
    expect(classifySubjectScore(0)).toEqual({ value: 0, state: "valid" });
  });

  it("A35 keeps absence distinct from zero", () => {
    expect(classifySubjectScore("缺考")).toEqual({ value: null, state: "absent" });
  });

  it("A36 never merges records by name or class without a stable id", () => {
    expect(canAutoMergeStudentRecords({ stableIdLeft: null, stableIdRight: null })).toBe(false);
    expect(canAutoMergeStudentRecords({ stableIdLeft: "a", stableIdRight: "b" })).toBe(false);
    expect(canAutoMergeStudentRecords({ stableIdLeft: "a", stableIdRight: "a" })).toBe(true);
  });

  it("A37 does not turn exam label 51 into a date", () => {
    const result = adaptSelectedStudent(baseRecord, options);
    expect(result.profile.observations[0]?.source_exam_label).toBe("51");
    expect(result.profile.observations[0]?.occurred_at).toBeNull();
  });

  it("A38 does not map source quality confidence to admission probability", () => {
    const result = adaptSelectedStudent(baseRecord, options);
    expect(JSON.stringify(result.profile)).not.toContain("admission_probability");
    expect(result.warnings).toContain("SOURCE_QUALITY_CONFIDENCE_NOT_ADMISSION_PROBABILITY");
  });

  it("A39 ignores a file's self-declared verified origin", () => {
    const result = adaptSelectedStudent(baseRecord, options);
    expect(result.profile.provenance.identity_binding).toBe("local_only");
    expect(result.profile.provenance.origin).toBe("local_import");
    expect(result.warnings).toContain("UNTRUSTED_VERIFICATION_CLAIM_IGNORED");
  });

  it("emits a structurally and semantically valid one-person envelope", () => {
    const result = adaptSelectedStudent(baseRecord, options);
    expect(validateStructure("student-profile", result.profile).valid).toBe(true);
    expect(validateStudentProfileSemantics(result.profile).valid).toBe(true);
    expect(result.profile.observations).toHaveLength(1);
  });
});

const accuracyFixture = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, "fixtures/accuracy-v1.2.synthetic.json"),
    "utf8"
  )
) as {
  selected: AccuracyV12StudentScore;
  missingTotal: unknown;
  exactDuplicate: AccuracyV12ScoreConflict;
  scoreConflict: AccuracyV12ScoreConflict;
  sameNameAcrossClasses: AccuracyV12StudentScore[];
};

const accuracyOptions = {
  targetExamYear: 2027,
  selectionConfirmedByStudent: false,
  generatedAt: "2026-09-10T00:00:00Z",
  createLocalId: () => "accuracy-local-001"
};

function requireAccuracyProfile(
  result: ReturnType<typeof adaptAccuracyV12SelectedStudent>
) {
  expect(result.status).toBe("adapted");
  if (!result.profile) throw new Error(`expected profile, got ${result.rejectionReasons.join(",")}`);
  return result.profile;
}

describe("accuracy-v1.2 real-shape single-student adapter", () => {
  it("maps the fixed StudentScore fields while preserving zero and absence", () => {
    const result = adaptAccuracyV12SelectedStudent(
      {
        selectedScore: accuracyFixture.selected,
        sourceQualityConfidence: 0.98,
        sourceDigest: "a".repeat(64)
      },
      accuracyOptions
    );
    const profile = requireAccuracyProfile(result);
    const observation = profile.observations[0]!;

    expect(observation.source_exam_label).toBe("51物");
    expect(observation.subjects.CHINESE).toMatchObject({ value: 0, state: "valid" });
    expect(observation.subjects.MATH).toMatchObject({ value: null, state: "absent" });
    expect(observation.ranks.map((rank) => [rank.scope, rank.value])).toEqual([
      ["city", 105],
      ["school", 25]
    ]);
    expect(observation.ranks.every((rank) => rank.population === null)).toBe(true);
    expect(profile.selection).toEqual({
      primary: "PHYSICS",
      additional: ["CHEMISTRY", "BIOLOGY"],
      confirmed_by_student: false
    });
    expect(profile.observations).toHaveLength(1);
    expect(JSON.stringify(profile)).not.toContain("合成同学甲");
    expect(JSON.stringify(profile)).not.toContain("admission_probability");
    expect(profile.provenance.source_commit).toBe(
      "6f70eab4e6e9ecadc00149b1387103b45b5d8e2b"
    );
    expect(validateStructure("student-profile", profile).valid).toBe(true);
    expect(validateStudentProfileSemantics(profile).valid).toBe(true);
  });

  it("keeps date, full marks and score basis unknown when the source has no metadata", () => {
    const result = adaptAccuracyV12SelectedStudent(
      { selectedScore: accuracyFixture.selected },
      accuracyOptions
    );
    const observation = requireAccuracyProfile(result).observations[0]!;

    expect(observation.occurred_at).toBeNull();
    expect(observation.exam_year).toBeNull();
    expect(observation.total).toMatchObject({ max_score: null, score_basis: "unknown" });
    expect(Object.values(observation.subjects).every((subject) => subject.max_score === null)).toBe(
      true
    );
    expect(Object.values(observation.subjects).every((subject) => subject.score_basis === "unknown"))
      .toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining(["DATE_UNKNOWN", "SCORE_BASIS_UNKNOWN"])
    );
  });

  it("does not reconstruct a missing source total from available subjects", () => {
    const result = adaptAccuracyV12SelectedStudent(
      { selectedScore: accuracyFixture.missingTotal },
      { ...accuracyOptions, createLocalId: () => "accuracy-local-missing-total" }
    );
    const profile = requireAccuracyProfile(result);

    expect(profile.observations[0]!.total).toEqual({
      value: null,
      max_score: null,
      origin: "unknown",
      score_basis: "unknown"
    });
    expect(result.warnings).toContain("SOURCE_TOTAL_MISSING_OR_INVALID");
    expect(validateStudentProfileSemantics(profile).valid).toBe(true);
  });

  it("collapses only source-declared exact duplicates and retains both row references", () => {
    const result = adaptAccuracyV12SelectedStudent(
      {
        selectedScore: accuracyFixture.exactDuplicate.candidates[1],
        scoreConflicts: [accuracyFixture.exactDuplicate]
      },
      accuracyOptions
    );
    const profile = requireAccuracyProfile(result);

    expect(result.warnings).toContain("EXACT_DUPLICATE_SOURCE_ROWS_COLLAPSED");
    expect(profile.observations[0]!.source_refs).toEqual([
      "accuracy-v1.2:学生基础:row:35",
      "accuracy-v1.2:学生基础:row:34"
    ]);
    expect(profile.observations).toHaveLength(1);
  });

  it("rejects an excluded conflicting source key instead of choosing the last record", () => {
    const result = adaptAccuracyV12SelectedStudent(
      {
        selectedScore: accuracyFixture.scoreConflict.candidates[1],
        scoreConflicts: [accuracyFixture.scoreConflict]
      },
      accuracyOptions
    );

    expect(result.status).toBe("rejected");
    expect(result.profile).toBeNull();
    expect(result.rejectionReasons).toEqual(["SOURCE_RECORD_CONFLICT"]);
    expect(result.warnings).toContain("SOURCE_RECORD_CONFLICT_EXCLUDED");
  });

  it("does not merge equal names across classes or expose the source name", () => {
    const [left, right] = accuracyFixture.sameNameAcrossClasses;
    const leftResult = adaptAccuracyV12SelectedStudent(
      { selectedScore: left },
      { ...accuracyOptions, createLocalId: () => "same-name-class-3" }
    );
    const rightResult = adaptAccuracyV12SelectedStudent(
      { selectedScore: right },
      { ...accuracyOptions, createLocalId: () => "same-name-class-4" }
    );
    const leftProfile = requireAccuracyProfile(leftResult);
    const rightProfile = requireAccuracyProfile(rightResult);

    expect(leftProfile.subject_id).not.toBe(rightProfile.subject_id);
    expect(leftProfile.observations[0]!.total.value).toBe(470);
    expect(rightProfile.observations[0]!.total.value).toBe(460);
    expect(JSON.stringify([leftProfile, rightProfile])).not.toContain("合成同名学生");
  });

  it("suppresses reconstructed totals even if a numeric value is present", () => {
    const result = adaptAccuracyV12SelectedStudent(
      {
        selectedScore: { ...accuracyFixture.selected, totalSource: "reconstructed" }
      },
      accuracyOptions
    );
    const total = requireAccuracyProfile(result).observations[0]!.total;

    expect(total.value).toBeNull();
    expect(total.origin).toBe("reconstructed");
    expect(result.warnings).toContain("TOTAL_NOT_SOURCE");
  });

  it("ignores spoofed verification and keeps local-only identity without a stable id", () => {
    const result = adaptAccuracyV12SelectedStudent(
      {
        selectedScore: accuracyFixture.selected,
        claimedVerifiedOrigin: true,
        sourceQualityConfidence: 1
      },
      accuracyOptions
    );
    const profile = requireAccuracyProfile(result);

    expect(profile.provenance.origin).toBe("local_import");
    expect(profile.provenance.identity_binding).toBe("local_only");
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        "STABLE_SUBJECT_ID_MISSING",
        "UNTRUSTED_VERIFICATION_CLAIM_IGNORED",
        "SOURCE_QUALITY_CONFIDENCE_NOT_ADMISSION_PROBABILITY"
      ])
    );
  });

  it("keeps an unknown or conflicting selection incomplete instead of guessing electives", () => {
    const result = adaptAccuracyV12SelectedStudent(
      {
        selectedScore: {
          ...accuracyFixture.selected,
          track: "未配置",
          combination: "待配置"
        }
      },
      accuracyOptions
    );
    const profile = requireAccuracyProfile(result);

    expect(profile.selection.primary).toBeNull();
    expect(profile.selection.additional).toEqual([]);
    expect(result.warnings).toContain("SOURCE_SELECTION_INCOMPLETE");
  });

  it("accepts confirmed metadata only when the caller supplies it explicitly", () => {
    const result = adaptAccuracyV12SelectedStudent(
      { selectedScore: accuracyFixture.selected },
      {
        ...accuracyOptions,
        selectionConfirmedByStudent: true,
        occurredAt: "2026-05-20",
        examYear: 2026,
        totalMaxScore: 750,
        totalScoreBasis: "converted_total",
        subjectConfirmations: {
          语文: { maxScore: 150, scoreBasis: "raw" },
          数学: { maxScore: 150, scoreBasis: "raw" },
          英语: { maxScore: 150, scoreBasis: "raw" },
          物理: { maxScore: 100, scoreBasis: "raw" },
          化学: { maxScore: 100, scoreBasis: "converted" },
          生物: { maxScore: 100, scoreBasis: "converted" }
        }
      }
    );
    const profile = requireAccuracyProfile(result);

    expect(profile.observations[0]!.occurred_at).toBe("2026-05-20");
    expect(profile.observations[0]!.total.score_basis).toBe("converted_total");
    expect(profile.observations[0]!.subjects.CHEMISTRY?.score_basis).toBe("converted");
    expect(result.warnings).not.toContain("DATE_UNKNOWN");
    expect(result.warnings).not.toContain("SCORE_BASIS_UNKNOWN");
  });
});
