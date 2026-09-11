/**
 * Step 1 of the 荣县一中 quality pipeline: parse the school workbook with the
 * pinned accuracy-v1.2 parser and export one JSON document.
 *
 * The parser and the analytics functions are the ones shipped by
 * `yusheng266186-beep/zhiliang-huixi-new-` at the pinned commit. This script only
 * calls them, records their output verbatim, and never edits the reference tree.
 *
 * Usage (from the reference checkout so that `tsx` and `xlsx` resolve there):
 *
 *   cd <refRoot>
 *   node --import tsx <this file> <workbook.xlsx> <out.json>
 *
 * `<refRoot>` is the current working directory and must be checked out at
 * ACCURACY_V12_COMMIT; the export refuses a different revision.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const ACCURACY_V12_COMMIT = "6f70eab4e6e9ecadc00149b1387103b45b5d8e2b";

const refRoot = process.cwd();
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: refRoot, encoding: "utf8" }).trim();
if (head !== ACCURACY_V12_COMMIT) {
  console.error(`reference checkout is at ${head}, expected ${ACCURACY_V12_COMMIT}`);
  process.exit(2);
}

const [, , workbookPath, outPath] = process.argv;
if (!workbookPath || !outPath) {
  console.error("usage: export_dataset.ts <workbook.xlsx> <out.json>");
  process.exit(2);
}

const load = (relative: string) => import(pathToFileURL(join(refRoot, relative)).href);
const { parseGradeWorkbook } = await load("app/lib/parser.ts");
const { buildQualityReport } = await load("app/lib/report-model.ts");
const analytics = await load("app/lib/analytics.ts");
const { classSummaries, classBenchmarks, subjectSummaries, criticalStudents, segmentSummary,
        matchedChange, knowledgeSummaries, onlineSummary, buildExecutiveInsights } = analytics;
const { getClassProfile, relevantSubjects } = await load("app/lib/class-config.ts");

const SUBJECTS = ["语文", "数学", "英语", "日语", "物理", "历史", "化学", "生物", "政治", "地理"];

const bytes = readFileSync(workbookPath);
const sourceName = workbookPath.split(/[\\/]/).pop()!;
const dataset = await parseGradeWorkbook(new File([bytes], sourceName));
const exams = dataset.exams;

/**
 * Names stay in this document.
 *
 * It is a local intermediate: the database and the teacher-side code export are built from it.
 * Privacy is enforced where students are actually served — the release step writes one shard per
 * student keyed by a random lookup code, so no page ever loads the whole grade.
 */
const perExam = exams.map((exam) => {
  const rows = dataset.scores.filter((score) => score.exam === exam);
  const report = buildQualityReport(dataset, { exam, track: "全部", classNo: "全部", reportType: "年级质量分析" });
  return {
    exam,
    students: rows.length,
    online: {
      topCount: report.summary.topCount,
      topRate: report.summary.topRate,
      undergraduateCount: report.summary.undergraduateCount,
      undergraduateRate: report.summary.undergraduateRate,
      topCriticalCount: report.summary.topCriticalCount,
      undergraduateCriticalCount: report.summary.undergraduateCriticalCount
    },
    stats: report.stats,
    distribution: report.distribution,
    classes: classSummaries(dataset, exam, "全部"),
    benchmarks: classBenchmarks(dataset, exam, "全部"),
    subjects: subjectSummaries(dataset, exam, "全部", "全部"),
    segments: segmentSummary(dataset, exam, "全部", "全部"),
    critical: criticalStudents(dataset, exam, "全部", "全部").map((student) => ({
      classNo: student.classNo, name: student.name, total: student.total,
      topDiff: student.topDiff, undergraduateDiff: student.undergraduateDiff,
      criticalTiers: student.criticalTiers, weakSubjects: student.weakSubjects
    })),
    knowledge: SUBJECTS
      .flatMap((subject) => knowledgeSummaries(dataset, exam, subject, "全部", "全部")
        .map((entry) => ({ subject, ...entry }))),
    change: (() => { const value = matchedChange(dataset, exam, "全部", "全部");
      return { count: value.count, previousExam: value.previousExam, delta: Number.isFinite(value.delta) ? value.delta : null,
               lineDelta: Number.isFinite(value.lineDelta) ? value.lineDelta : null, message: value.message }; })(),
    insights: buildExecutiveInsights(dataset, exam, "全部", "全部"),
    trend: report.trend.map((point) => ({ ...point, track: "全部", classNo: "全部" })),
    recommendations: report.recommendations,
    methodology: report.methodology
  };
});

/** Per-track online summary, which the whole-grade summary above cannot show. */
const perExamTrack = exams.flatMap((exam) => ["物理类", "历史类"].map((track) => {
  const rows = dataset.scores.filter((score) => score.exam === exam && score.track === track);
  const summary = onlineSummary(dataset, exam, rows);
  return { exam, track, students: rows.length, topCount: summary.topCount, topRate: summary.topRate,
           undergraduateCount: summary.undergraduateCount, undergraduateRate: summary.undergraduateRate,
           topEligible: summary.topEligible, undergraduateEligible: summary.undergraduateEligible };
}));

/** Per-class subject averages come from subjectSummaries so the class page matches the grade page. */
const perExamClassSubject = exams.flatMap((exam) => [...new Set(dataset.scores
  .filter((score) => score.exam === exam).map((score) => score.classNo))].sort((a, b) => a - b)
  .flatMap((classNo) => subjectSummaries(dataset, exam, "全部", classNo).map((summary) => ({
    exam, classNo, subject: summary.subject, count: summary.count, average: summary.average, max: summary.max,
    topEffectiveCount: summary.topEffectiveCount, topEffectiveRate: summary.topEffectiveRate,
    undergraduateEffectiveCount: summary.undergraduateEffectiveCount,
    undergraduateEffectiveRate: summary.undergraduateEffectiveRate,
    effectiveLine: summary.effectiveLine, effectiveRate: summary.effectiveRate
  }))));

/** Per-class critical lists, which is how a head teacher reads the same numbers. */
const perExamClassCritical = perExam.flatMap((entry) => [...new Set(dataset.scores
  .filter((score) => score.exam === entry.exam).map((score) => score.classNo))].map((classNo) => ({
    exam: entry.exam,
    classNo,
    critical: criticalStudents(dataset, entry.exam, "全部", classNo).map((student) => ({
      name: student.name, total: student.total, topDiff: student.topDiff,
      undergraduateDiff: student.undergraduateDiff, criticalTiers: student.criticalTiers,
      weakSubjects: student.weakSubjects
    }))
  })));

/**
 * Item-level totals stay out of this export on purpose.
 *
 * The per-student knowledge roll-up is a plain group-by over `itemResponses` and `questionBanks`,
 * both exported here verbatim; the database build performs it so this document keeps only the
 * parser's own output. The build cross-checks its totals against `analysis.perExam[].knowledge`,
 * which is the accuracy-v1.2 summary for the same questions.
 */
const payload = {
  element: "nanming-quality-huixi-export",
  schemaVersion: "1.0.0",
  exportedAt: new Date().toISOString(),
  source: {
    name: sourceName,
    bytes: bytes.byteLength,
    parserRepo: "yusheng266186-beep/zhiliang-huixi-new-",
    parserCommit: ACCURACY_V12_COMMIT
  },
  school: dataset.school,
  exams,
  classes: [...new Set(dataset.scores.map((score) => score.classNo))].sort((a, b) => a - b)
    .map((classNo) => getClassProfile(classNo, dataset.scores.find((score) => score.classNo === classNo)?.rawExam ?? "")),
  subjectOrder: Object.fromEntries(["物理类", "历史类"].map((track) => [track, relevantSubjects(
    { classNo: track === "物理类" ? 1 : 10, track, combination: track === "物理类" ? "物化生" : "历政地", type: "", label: "" }
  )])),
  scores: dataset.scores,
  thresholds: dataset.thresholds,
  scoreIssues: dataset.scoreIssues ?? [],
  scoreConflicts: (dataset.scoreConflicts ?? []).map((conflict) => ({
    key: conflict.key,
    resolution: conflict.resolution,
    candidates: conflict.candidates
  })),
  rejectedCount: dataset.rejectedCount ?? 0,
  profile: dataset.profile,
  issues: dataset.issues,
  questionBanks: dataset.questionBanks,
  itemResponseCount: dataset.itemResponses.length,
  itemResponses: dataset.itemResponses,
  analysis: { perExam, perExamTrack, perExamClassSubject, perExamClassCritical },
  sheets: dataset.sheets
};

writeFileSync(outPath, JSON.stringify(payload), "utf8");

const summary = {
  school: dataset.school,
  exams: exams.length,
  scores: dataset.scores.length,
  students: new Set(dataset.scores.map((score) => `${score.classNo}::${score.name}`)).size,
  classes: payload.classes.length,
  itemResponses: dataset.itemResponses.length,
  questions: Object.values(dataset.questionBanks).reduce((sum, bank) => sum + bank.length, 0),
  thresholds: dataset.thresholds.length,
  skippedRows: dataset.profile?.skippedRows ?? 0,
  conflicts: payload.scoreConflicts.reduce((acc: Record<string, number>, conflict) => {
    acc[conflict.resolution] = (acc[conflict.resolution] ?? 0) + 1;
    return acc;
  }, {}),
  perExam: perExam.map((entry) => ({ exam: entry.exam, students: entry.students,
    critical: entry.critical.length, knowledge: entry.knowledge.length,
    change: entry.change.delta }))
};
console.log(JSON.stringify(summary, null, 2));
