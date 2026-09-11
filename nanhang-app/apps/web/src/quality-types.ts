/**
 * 荣县一中成绩发布产物的类型。
 *
 * 字段与 `pipelines/quality-huixi/export_release.py` 写出的 JSON 一一对应；这里是只读视图，
 * 不在前端做任何清洗或补值。数值缺失一律为 `null`，页面必须显示为「—」而不是 0。
 */

export interface QualityCounts {
  persons: number;
  observations: number;
  itemResponses: number;
  questions: number;
  knowledgeRows: number;
  exams: number;
}

export interface QualityExamTrack {
  exam_code: string;
  ordinal: number;
  raw_labels: string;
  is_order_known: number;
  student_rows: number;
  track: string | null;
  students: number | null;
  top_eligible: number | null;
  undergraduate_eligible: number | null;
  top_count: number | null;
  top_rate: number | null;
  undergraduate_count: number | null;
  undergraduate_rate: number | null;
}

export interface QualityThreshold {
  exam_code: string;
  track: string;
  top_total: number | null;
  undergraduate_total: number | null;
}

export interface QualityTrendPoint {
  exam_code: string;
  students: number;
  average: number | null;
  top_count: number | null;
  undergraduate_count: number | null;
}

export interface QualityClassSummary {
  exam_code: string;
  class_no: number;
  label: string;
  track: string;
  class_type: string;
  students: number;
  average: number;
  top_count: number | null;
  top_rate: number | null;
  top_metric_status: string | null;
  undergraduate_count: number | null;
  undergraduate_rate: number | null;
  undergraduate_metric_status: string | null;
  subject_averages: string;
}

export interface QualityClassBenchmark {
  exam_code: string;
  class_no: number;
  peer_group: string;
  peer_average: number;
  average_delta: number;
  peer_top_rate: number | null;
  top_rate_delta: number | null;
  peer_undergraduate_rate: number | null;
  undergraduate_rate_delta: number | null;
  peer_rank: number;
  peer_size: number;
}

export interface QualityClassSubject {
  exam_code: string;
  class_no: number;
  subject: string;
  students: number;
  average: number;
  max: number;
  top_effective_count: number | null;
  top_effective_rate: number | null;
  undergraduate_effective_count: number | null;
  undergraduate_effective_rate: number | null;
  effective_line: number | null;
  effective_rate: number | null;
}

export interface QualitySubjectSummary {
  exam_code: string;
  subject: string;
  students: number;
  average: number;
  max: number;
  top_eligible: number;
  undergraduate_eligible: number;
  top_effective_count: number | null;
  top_effective_rate: number | null;
  undergraduate_effective_count: number | null;
  undergraduate_effective_rate: number | null;
  effective_line: number | null;
  effective_rate: number | null;
}

export interface QualitySegment {
  exam_code: string;
  segment_id: string;
  label: string;
  intent: string;
  student_count: number;
  rate: number;
  average: number;
}

export interface QualityDistributionBin {
  exam_code: string;
  bin_label: string;
  start: number;
  end: number;
  student_count: number;
  rate: number;
}

export interface QualityKnowledgeSummary {
  exam_code: string;
  subject: string;
  knowledge: string;
  question_count: number;
  response_count: number;
  earned: number;
  possible: number;
  rate: number;
  priority: string;
}

export interface QualityInsight {
  exam_code: string;
  insight_id: string;
  tone: string;
  title: string;
  finding: string;
  action: string;
}

export interface QualityRecommendation {
  exam_code: string;
  ordinal: number;
  text: string;
}

export interface QualityFieldMatch {
  field: string;
  column_index: number | null;
  header: string;
  strategy: string;
  confidence: number;
}

export interface QualityCapability {
  capability_id: string;
  label: string;
  available: number;
  confidence: number;
  reason: string;
}

export interface QualityDataProfile {
  profile_pk: number;
  overall_confidence: number | null;
  score_header_row: number | null;
  subject_completeness: number | null;
  threshold_completeness: number | null;
  item_coverage: number | null;
  reconstructed_totals: number | null;
  skipped_rows: number | null;
  rejected_rows: number | null;
}

export interface QualityIssue {
  issue_code: string;
  level: string;
  module: string | null;
  exam_code: string | null;
  field: string | null;
  state: string | null;
  raw_value: string | null;
  message: string;
  affected_count: number | null;
}

export interface QualityConflict {
  conflict_key: string;
  resolution: string;
  candidates: number;
  note: string;
}

export interface QualityClassProfile {
  class_no: number;
  class_label: string;
  track: string;
  combination: string;
  class_type: string;
  students: number;
}

export interface QualityIndex {
  element: "nanming-quality-huixi-index";
  schemaVersion: string;
  releaseId: string;
  createdAt: string;
  school: string;
  parserRepo: string;
  parserCommit: string;
  sourceWorkbook: string;
  sourceWorkbookBytes: number;
  datasetSha256: string;
  identityRule: string;
  counts: QualityCounts;
  scoreBasis: Record<string, string>;
  exams: QualityExamTrack[];
  thresholds: QualityThreshold[];
  thresholdSubjects: Array<{ exam_code: string; track: string; tier: string; subject: string; line: number }>;
  trend: QualityTrendPoint[];
  classes: QualityClassSummary[];
  classBenchmarks: QualityClassBenchmark[];
  classSubjects: QualityClassSubject[];
  subjects: QualitySubjectSummary[];
  segments: QualitySegment[];
  distributions: QualityDistributionBin[];
  knowledge: QualityKnowledgeSummary[];
  insights: QualityInsight[];
  recommendations: QualityRecommendation[];
  methodology: string[];
  dataProfile: QualityDataProfile;
  fieldMatches: QualityFieldMatch[];
  capabilities: QualityCapability[];
  issueCounts: Record<string, number>;
  issues: QualityIssue[];
  conflicts: QualityConflict[];
  classProfiles: QualityClassProfile[];
}

export interface QualitySubjectRow {
  subject: string;
  value: number | null;
  state: string;
  topLine: number | null;
  undergraduateLine: number | null;
  gradeAverage: number | null;
  classAverage: number | null;
}

export interface QualityKnowledgeArea {
  knowledge: string;
  earned: number;
  possible: number;
  rate: number;
  questionResponses: number;
  gradeRate: number | null;
  priority: string | null;
}

export interface QualityKnowledgeBlock {
  subject: string;
  areas: QualityKnowledgeArea[];
}

export interface QualityStudentExam {
  exam: string;
  rawLabel: string;
  ordinal: number;
  classNo: number;
  /** 该场考试自己的科类；美术班考试为历史类，可能与本人主科类不同。 */
  track: string;
  trackDiffersFromHome: boolean;
  total: number;
  cityRank: number | null;
  schoolRank: number | null;
  classRank: number | null;
  classSize: number | null;
  gradeRank: number | null;
  gradeSize: number | null;
  sourceSchoolRank: number | null;
  sourceCityRank: number | null;
  sourceRankNote: string;
  topTotal: number | null;
  undergraduateTotal: number | null;
  topDiff: number | null;
  undergraduateDiff: number | null;
  subjectPresent: number;
  subjectExpected: number;
  subjects: QualitySubjectRow[];
  knowledge: QualityKnowledgeBlock[];
}

export interface QualityShard {
  element: "nanming-quality-huixi-student";
  schemaVersion: string;
  releaseId: string;
  createdAt: string;
  school: string;
  person: {
    publicId: string;
    name: string;
    track: string;
    combination: string;
    classNo: number;
    classLabel: string;
    classType: string;
    examCount: number;
  };
  exams: QualityStudentExam[];
  notes: string[];
}

export interface QualityManifest {
  element: "nanming-quality-huixi-release";
  schemaVersion: string;
  releaseId: string;
  createdAt: string;
  school: string;
  parserCommit: string;
  sourceWorkbook: string;
  datasetSha256: string;
  counts: QualityCounts;
  shardCount: number;
  shardNaming: string;
  codeStrength: string;
  sha256: Record<string, string>;
}
