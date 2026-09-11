import {
  buildExplorationSummary, buildNextActions, confirmDirection, createConstraint,
  createEvidenceRegistry, denyDirection, emptyDirectionProfile, explorationCards,
  markPending, questionLibrary, type DirectionProfile, type EvidenceKind,
  type EvidenceRegistry, type RealityConstraint, type StudentMessageEvidence
} from "@nanhang/exploration";
import { buildMatchResult } from "@nanhang/domain";
import { buildPublishedInput as buildInput, type MatchRequest } from "@nanhang/match-input";
import {
  DEFAULT_BATCHES, SELECTABLE_BATCHES,
} from "@nanhang/match-input";
export { DEFAULT_BATCHES, SELECTABLE_BATCHES };
import {
  convertShard, distributionRow, loadRelease, loadShard, referenceYearFor, shardsFor,
  type ComparabilityRecord, type LoadedRelease, type OfferingLabel, type ReleaseIndexEntry
} from "./release-loader.js";
import type { BuildMatchResultInput, EvidenceDescriptor, HistoricalReferenceRecord, MatchingOffering, ScoreDistributionSelection } from "@nanhang/domain";
import type { NanhangMatchResult100, NanhangPublicDataManifest100, NanhangTargetScenario100 } from "@nanhang/contracts";

export const SYNTHETIC_NOTICE = "当前匹配全部使用合成演示数据，不代表真实招生范围、位次、录取概率或报考建议。";
export const EXCEL_NOTICE = "这里是36条未核实Excel样本的开发核对视图。这些数据不会进入匹配，也不会生成招生结论。";
export const SAMPLE_YEARS = [2026, 2027, 2028] as const;
export const ADDITIONAL_OPTIONS = ["CHEMISTRY", "BIOLOGY", "POLITICS", "GEOGRAPHY"] as const;
export const QUESTIONS = questionLibrary();
export const DIRECTIONS = explorationCards().map(({ directionId, title }) => ({ directionId, title }));

/**
 * 回答起点。
 *
 * 谈心页每个问题旁边给几个「不知道怎么开头」时可点的例句；点一下填进输入框，
 * 学生仍要自己改写与保存。
 *
 * 这些句子**只是措辞帮助**：它们不携带任何权重，不参与方向计算，也不产生适配度。
 * 原设计（南溟.html）的问题选项带有 dims/avoid 权重并用它算出「方向适配度 %」，
 * 本项目禁止由兴趣推断专业适合度（见 packages/exploration 的 PROMPT_BOUNDARY 第 2 条），
 * 因此这里刻意只保留「帮学生开口」这一层功能。
 */
export const ANSWER_STARTERS: Record<string, readonly string[]> = {
  "q-interest": [
    "拆开、修好一个东西，弄明白它为什么坏",
    "在电脑前折腾到很晚，想让它跑起来",
    "读了一段故事或文章，想接着写点什么",
    "帮同学讲题，或者张罗一件班里的活动"
  ],
  "q-attempt": [
    "照着教程做了一遍，中途卡住，后来自己想办法绕过",
    "先画了方案再动手，做完发现和想的不一样，改了两版",
    "失败了两次，第三次换了个做法才成"
  ],
  "q-repeat": [
    "整理数据这一类",
    "制作模型这一类",
    "阅读并解释规则这一类",
    "三种都不太想重复"
  ],
  "q-invest": [
    "看几节相关的公开课",
    "动手做一个小作品出来",
    "找一位学长学姐聊一次",
    "读完一本相关的入门书"
  ],
  "q-constraint": [
    "希望离家近一些，最好在省内",
    "家里对学费和生活费有大致预算",
    "要兼顾其他科目，能投入的时间有限",
    "这些条件都还可以商量"
  ],
  "q-correct": [
    "有一两个方向描述说得挺像",
    "有些描述不太像我，想改掉",
    "还想再多了解一些再判断"
  ],
  "q-next": [
    "先看完一节公开课",
    "做一个小练习并记下感受",
    "找人聊一次，听听真实经历",
    "还没想好，先留着这条"
  ]
};
export const SCORE_SEGMENTS = [
  { score: 610, count: 120, cumulative: 7800 },
  { score: 600, count: 150, cumulative: 8000 },
  { score: 590, count: 180, cumulative: 8600 }
] as const;
const SEGMENTS = new Map<number, (typeof SCORE_SEGMENTS)[number]>(SCORE_SEGMENTS.map((row) => [row.score, row]));
const RELEASE_ID = "synthetic-release-web-001";
const REFERENCE_YEAR = 2026;

interface SyntheticArgs {
  track: "PHYSICS" | "HISTORY"; score: number; targetYear: number;
  additional: readonly string[]; hardBudget: number | null; confirmedDirections: readonly string[];
  /** Batches to search. Empty means the caller did not choose, which falls back to the default. */
  batches?: readonly string[];
  releaseStatus?: "PUBLISHED" | "WITHDRAWN";
}

function release(status: "PUBLISHED" | "WITHDRAWN" = "PUBLISHED"): NanhangPublicDataManifest100 {
  return {
    manifest_version: "1.0.0", release_id: RELEASE_ID, created_at: "2026-09-11T00:00:00Z",
    schema_version: "1.0.0", rules_version: "nh-rules-1.0.0", status, synthetic: true,
    files: [{ path: "data/synthetic/web-evidence.json", sha256: "0".repeat(64), size_bytes: 2 }],
    coverage: [{
      scope_id: "syn-sc-physics-b", year: REFERENCE_YEAR, track: "PHYSICS", batch: "本科批演示", stage: "B",
      admission_type: "general", published_offerings: 3, known_scope_total: null, exhaustive: false,
      missing_notes: ["合成演示分片，不代表真实招生覆盖"]
    }],
    evidence_index_path: "data/synthetic/web-evidence.json"
  };
}

function history(offeringId: string, groupId: string, subjectType: "group" | "major",
  interval: readonly [number, number], evidenceId: string): HistoricalReferenceRecord {
  const group = subjectType === "group";
  return {
    recordStatus: "PUBLISHED", releaseId: RELEASE_ID, subjectType, subjectId: group ? groupId : offeringId,
    sourceYear: REFERENCE_YEAR, track: "PHYSICS", batch: "本科批演示", stage: "B", admissionType: "general",
    scoreBasis: "gaokao_cultural", metricType: group ? "group_filing_min" : "major_admission_min",
    rankInterval: interval, evidenceIds: [evidenceId]
  };
}

function offerings(): MatchingOffering[] {
  const common = {
    recordStatus: "PUBLISHED" as const, releaseId: RELEASE_ID, scopeId: "syn-sc-physics-b",
    year: REFERENCE_YEAR, track: "PHYSICS" as const, batch: "本科批演示", stage: "B", admissionType: "general"
  };
  return [
    { ...common, offeringId: "syn-offer-cs", groupId: "syn-group-cs", region: "四川（合成）", tuition: 5500,
      requirements: [{ kind: "subject", requirementId: "syn-req-cs", rule: { kind: "all_of", subjects: ["PHYSICS", "CHEMISTRY"] } }],
      history: [history("syn-offer-cs", "syn-group-cs", "group", [8101, 8200], "syn-ev-g-cs"), history("syn-offer-cs", "syn-group-cs", "major", [9100, 9200], "syn-ev-m-cs")],
      directionTags: ["data-and-information"], interestReasonRefs: ["data-and-information"], evidenceIds: ["syn-ev-offer-cs"] },
    { ...common, offeringId: "syn-offer-mech", groupId: "syn-group-mech", region: "北京（合成）", tuition: 6000,
      requirements: [{ kind: "subject", requirementId: "syn-req-mech", rule: { kind: "all_of", subjects: ["PHYSICS", "CHEMISTRY"] } }],
      history: [history("syn-offer-mech", "syn-group-mech", "group", [6000, 6100], "syn-ev-g-mech"), history("syn-offer-mech", "syn-group-mech", "major", [7000, 7150], "syn-ev-m-mech")],
      directionTags: ["design-and-making"], interestReasonRefs: ["design-and-making"], evidenceIds: ["syn-ev-offer-mech"] },
    { ...common, offeringId: "syn-offer-trade", groupId: "syn-group-trade", region: "四川（合成）", tuition: 4800,
      requirements: [{ kind: "condition", requirementId: "syn-req-trade", status: "UNKNOWN", reasonCode: "UNKNOWN_REQUIREMENT" }],
      history: [history("syn-offer-trade", "syn-group-trade", "group", [12000, 12300], "syn-ev-g-trade"), history("syn-offer-trade", "syn-group-trade", "major", [13000, 13400], "syn-ev-m-trade")],
      directionTags: ["rules-and-social-questions"], interestReasonRefs: ["rules-and-social-questions"], evidenceIds: ["syn-ev-offer-trade"] }
  ];
}

/* 从发布包构建匹配输入已移到 @nanhang/match-input，两套前端共用同一份实现。
   这里保留一个接收 WebState 的薄封装，页面的调用方式不变。 */
export async function buildPublishedInput(
  state: WebState, args: MatchRequest, release: LoadedRelease, signal?: AbortSignal
): Promise<{ input: BuildMatchResultInput; catalog: Record<string, OfferingLabel> } | null> {
  return buildInput(args, release, signal);
}

export function buildSyntheticInput(args: SyntheticArgs): BuildMatchResultInput {
  const segment = SEGMENTS.get(args.score);
  if (!segment) throw new Error("UNKNOWN_SYNTHETIC_SCORE");
  if (args.track !== "PHYSICS") throw new Error("NO_SYNTHETIC_SCOPE");
  // Only ever reached when no published release is loaded; the page says which mode it is in.
  const candidates = offerings();
  const distribution: ScoreDistributionSelection = {
    recordStatus: "PUBLISHED", releaseId: RELEASE_ID, distributionId: "syn-dist-physics",
    year: REFERENCE_YEAR, province: "SC", track: "PHYSICS", scoreBasis: "gaokao_cultural", publishedMinScore: 550,
    row: { rowType: "exact", score: segment.score, count: segment.count, cumulative: segment.cumulative },
    evidenceIds: ["syn-ev-dist-physics"]
  };
  const scenario: NanhangTargetScenario100 = {
    scenario_version: "1.0.0", scenario_id: `syn-${args.targetYear}-${segment.score}`,
    target_exam_year: args.targetYear, reference_year: REFERENCE_YEAR, province: "SC", track: "PHYSICS",
    target_score: segment.score, score_basis: "gaokao_cultural", release_id: RELEASE_ID
  };
  const evidenceIndex: EvidenceDescriptor[] = [
    { evidenceId: "syn-ev-dist-physics", subjectType: "distribution", subjectId: "syn-dist-physics" },
    ...candidates.flatMap((candidate) => [
      { evidenceId: candidate.evidenceIds[0]!, subjectType: "offering" as const, subjectId: candidate.offeringId },
      ...candidate.history.flatMap((item) => item.evidenceIds.map((evidenceId) => ({ evidenceId,
        subjectType: item.subjectType, subjectId: item.subjectId, metricType: item.metricType })))
    ])
  ];
  return {
    runId: `syn-run-${args.targetYear}-${segment.score}`, inputRevision: 1, mode: "exploration",
    rulesVersion: "nh-rules-1.0.0", scenario, release: release(args.releaseStatus), scopeIds: ["syn-sc-physics-b"],
    distribution, evidenceIndex, selection: { primary: "PHYSICS", additional: [...args.additional] },
    supportedAdmissionTypes: ["general"],
    preferences: { directionPriority: [...args.confirmedDirections], sortBy: "direction",
      ...(args.hardBudget === null ? {} : { hardBudget: args.hardBudget }) },
    offerings: candidates
  };
}

const QUESTION_KIND: Record<string, EvidenceKind> = { "q-interest": "student_preference_statement", "q-attempt": "student_task_attempt" };
const FRIENDLY: Record<string, string> = {
  UNKNOWN_SYNTHETIC_SCORE: "只能选择合成分段表中已有的分数。",
  NO_SYNTHETIC_SCOPE: "合成演示目前只有物理类分片，历史类仍可继续专业探索。",
  MATCH_COVERAGE_NOT_PUBLISHED: "所选类别不在当前合成分片范围内。"
};
const errorMessage = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error);
  return FRIENDLY[raw] ?? `暂时无法完成：${raw}`;
};

export interface AnswerRecord { questionId: string; text: string; evidenceId: string; kind: EvidenceKind; }
export interface WebForm {
  targetYear: number; primary: "PHYSICS" | "HISTORY" | null; additional: string[];
  score: number | null; budget: number | null;
  /** Most recent exam scores, oldest first. Optional: with fewer than two the page says the
   *  stability measure is unavailable instead of inventing a trend. */
  history: number[];
  /** Which batches to search. Each one is a separate set of shards to download, so the student's
   *  choice directly sets how much data the page fetches. */
  batches: string[];
}
export interface WebState {
  form: WebForm; answers: AnswerRecord[]; answerSequence: number; registry: EvidenceRegistry;
  profile: DirectionProfile; generation: number;
  match: { generation: number; result: NanhangMatchResult100 } | null; notice: string | null;
  /** The published release for real-data matching, once loaded. Null means synthetic mode. */
  release: LoadedRelease | null;
  /** Display names for matched offerings, keyed by offeringId. Never indexed by list position. */
  catalog: Record<string, OfferingLabel>;
  releaseStatus: "idle" | "loading" | "ready" | "failed";
  releaseMessage: string | null;
}

export const EMPTY_RELEASE_STATE = {
  release: null as LoadedRelease | null,
  catalog: {} as Record<string, OfferingLabel>,
  releaseStatus: "idle" as const,
  releaseMessage: null as string | null
};

export function initialState(): WebState {
  return { form: { targetYear: 2027, primary: null, additional: [], score: null,
    budget: null, history: [], batches: [...DEFAULT_BATCHES] },
    answers: [], answerSequence: 0, registry: createEvidenceRegistry([]), profile: emptyDirectionProfile("web-profile"),
    generation: 0, match: null, notice: null, ...EMPTY_RELEASE_STATE };
}
/**
 * Clear the student's own exploration.
 *
 * The loaded published release, its display-name catalog and its load status are carried over
 * when the caller passes the current state: they are not the student's data, and dropping them
 * would strand a page that had already loaded real data back in synthetic mode with no reload.
 */
export const resetLocal = (current?: WebState): WebState => ({
  ...initialState(),
  ...(current
    ? { release: current.release, catalog: current.catalog,
        releaseStatus: current.releaseStatus, releaseMessage: current.releaseMessage }
    : {})
});

/**
 * The batches a student may search, in the order the page offers them.
 *
 * These are the two general batches. Special-type admissions (专项计划、提前批、预科 etc.) are
 * published in the release and reachable through the CLI, but are not offered here: their
 * eligibility rules differ from the general batch and presenting them as ordinary choices would
 * misrepresent who may apply. Roughly 4,900 offerings sit outside these two.
 *
 * Both lists now come from `@nanhang/match-input` so the two front ends cannot disagree about
 * which batches are offered. They are re-exported at the top of this module.
 */
export type SelectableBatch = (typeof SELECTABLE_BATCHES)[number];

/**
 * How much data each batch costs, so the choice is informed.
 *
 * Counts come from the loaded manifest's coverage rather than a hard-coded table, so they stay
 * right if the release changes. The figures are published offering counts, not file sizes: a
 * student can compare the two batches without being told a byte number whose meaning is unclear.
 */
export function batchOfferings(release: LoadedRelease | null, track: "PHYSICS" | "HISTORY" | null,
                               batch: string): number | null {
  if (!release || !track) return null;
  const entries = release.manifest.coverage.filter(
    (item) => item.track === track && item.batch === batch);
  if (entries.length === 0) return null;
  return entries.reduce((total, item) => total + item.published_offerings, 0);
}

/**
 * What the page may say about comparing against a reference year.
 *
 * Derived from the recorded comparability link rather than from the year number: the basis, what
 * was examined and what was not all come from the record, so the disclosure cannot drift from the
 * decision that was actually made.
 */
export function comparabilityNote(release: LoadedRelease | null,
                                  track: "PHYSICS" | "HISTORY" | null,
                                  year: number | null): { basis: string; limits: string } | null {
  if (!release || !track || year === null) return null;
  const record: ComparabilityRecord | undefined = release.comparability.find(
    (item) => item.plan_track === track && item.history_year === year && item.status === "VERIFIED");
  if (!record) return null;
  return {
    basis: `${year} 年参考依据：${record.basis}（核实：${record.reviewer ?? "未记录"}，${record.review_date ?? "未记录"}）`,
    limits: record.not_examined ? `未核对：${record.not_examined}` : "",
  };
}

export const RELEASE_LABELS: Record<string, string> = {
  idle: "尚未载入已发布数据。",
  loading: "正在载入已发布数据…",
  ready: "已载入已发布数据。",
  failed: "载入已发布数据失败，继续使用合成演示数据。"
};

/* 由发布包派生的展示数据（位次、分数轴刻度、方向覆盖）已移到 @nanhang/release-loader，
   两套前端共用一份实现。这里重导出，既有的导入路径保持不变。 */
export {
  DIRECTION_CATEGORY_CLASSES, axisMarks, directionCoverage, scorePosition,
  type DirectionCoverage, type ScorePosition,
} from "@nanhang/release-loader";


/**
 * Load the published release. Separate from matching so the page can show load state and so a
 * failure leaves the synthetic flow usable rather than blocking exploration.
 */
export async function loadPublishedRelease(
  signal?: AbortSignal
): Promise<Partial<WebState>> {
  try {
    const release = await loadRelease(signal ? { signal } : {});
    return { release, releaseStatus: "ready",
      releaseMessage: `已载入发布版本 ${release.manifest.release_id}（${release.index.shards.length} 个分片）。` };
  } catch (error) {
    return { release: null, releaseStatus: "failed",
      releaseMessage: `载入已发布数据失败：${error instanceof Error ? error.message : String(error)}。继续使用合成演示数据。` };
  }
}

function batchOfShard(entry: ReleaseIndexEntry): string {
  return entry.batch;
}

/**
 * Build matcher input from the published release.
 *
 * Only the shards covering the student's own track and the two main batches are loaded, and each
 * shard is converted once. The release's own fields supply the scope, year and score basis, so
 * nothing about a record's origin is assumed here.
 */
const changed = (state: WebState): WebState => ({ ...state, generation: state.generation + 1, notice: null });
const withNotice = (state: WebState, notice: string): WebState => ({ ...state, notice });
export function withForm(state: WebState, patch: Partial<WebForm>): WebState {
  return changed({ ...state, form: { ...state.form, ...patch } });
}
const evidence = (answer: AnswerRecord): StudentMessageEvidence => ({
  evidenceId: answer.evidenceId, messageId: answer.questionId, quote: answer.text, kind: answer.kind
});
function invalidateEvidence(profile: DirectionProfile, evidenceId: string | null): DirectionProfile {
  if (!evidenceId) return profile;
  let next = profile;
  for (const entry of profile.entries) {
    const used = [...entry.interestEvidence, ...entry.abilityEvidence].some((item) => item.evidenceId === evidenceId);
    if (entry.status === "CONFIRMED" && used) next = markPending(next, entry.directionId);
  }
  return next;
}
export function recordAnswer(state: WebState, questionId: string, text: string): WebState {
  if (!text.trim()) return withNotice(state, "回答不能为空；也可以明确选择跳过。");
  const previous = state.answers.find((item) => item.questionId === questionId);
  const answerSequence = state.answerSequence + 1;
  const answers: AnswerRecord[] = [...state.answers.filter((item) => item.questionId !== questionId),
    { questionId, text: text.trim(), evidenceId: `ev-${questionId}-${answerSequence}`,
      kind: QUESTION_KIND[questionId] ?? "student_self_report" }];
  return changed({ ...state, answers, answerSequence, registry: createEvidenceRegistry(answers.map(evidence)),
    profile: invalidateEvidence(state.profile, previous?.evidenceId ?? null) });
}
export function skipAnswer(state: WebState, questionId: string): WebState {
  const previous = state.answers.find((item) => item.questionId === questionId);
  const answers = state.answers.filter((item) => item.questionId !== questionId);
  const next = changed({ ...state, answers, registry: createEvidenceRegistry(answers.map(evidence)),
    profile: invalidateEvidence(state.profile, previous?.evidenceId ?? null) });
  return { ...next, notice: "已跳过。本题不会生成任何方向结论。" };
}
export function confirm(state: WebState, directionId: string): WebState {
  const interest = state.answers.find((item) => item.questionId === "q-interest");
  if (!interest) return withNotice(state, "请先保存第一题中属于你自己的具体表达，再确认方向。");
  const attempt = state.answers.find((item) => item.questionId === "q-attempt");
  try {
    return changed({ ...state, profile: confirmDirection(state.profile, { directionId,
      interestEvidenceIds: [interest.evidenceId], confirmedByStudent: true,
      ...(attempt ? { abilityEvidenceIds: [attempt.evidenceId] } : {}) }, state.registry) });
  } catch (error) { return withNotice(state, errorMessage(error)); }
}
export function deny(state: WebState, directionId: string): WebState {
  return changed({ ...state, profile: denyDirection(state.profile, { directionId }) });
}
export function reopen(state: WebState, directionId: string): WebState {
  const next = changed({ ...state, profile: markPending(state.profile, directionId) });
  return { ...next, notice: "方向已重新打开，请修改问题回答后再确认。" };
}
export function constraintsFor(state: WebState): RealityConstraint[] {
  const answer = state.answers.find((item) => item.questionId === "q-constraint");
  if (!answer) return [];
  return [createConstraint({ constraintId: `constraint-${answer.evidenceId}`, kind: "other", statement: answer.text,
    hardValue: null, isHard: false, evidenceId: answer.evidenceId, comparison: "uninterpreted" }, state.registry)];
}
export function summary(state: WebState) {
  try { return buildExplorationSummary({ profile: state.profile, constraints: constraintsFor(state), registry: state.registry }); }
  catch { return null; }
}
export function isMatchFresh(state: WebState): boolean {
  return state.match !== null && state.match.generation === state.generation;
}
/**
 * Run the match against the published release when one is loaded, falling back to the synthetic
 * fixture otherwise. Async because a real run loads its shards on demand; the synthetic path
 * needs no I/O but goes through the same signature so the caller has one code path.
 */
export async function runMatch(state: WebState, signal?: AbortSignal): Promise<WebState> {
  if (!state.form.primary) return withNotice(state, "请先选择首选科目。");
  if (state.form.additional.length !== 2) return withNotice(state, "再选科目需要正好选择2门。");
  if (state.form.score === null) {
    return withNotice(state, "尚未填写目标情景分。你仍可探索方向；填写分数后才能运行匹配。");
  }
  if (state.form.batches.length === 0) {
    return withNotice(state, "请至少选择一个批次；每个批次会各自下载对应数据。");
  }
  const args = { track: state.form.primary, score: state.form.score,
    targetYear: state.form.targetYear, additional: state.form.additional,
    hardBudget: state.form.budget, batches: state.form.batches,
    confirmedDirections: summary(state)?.confirmed.map((entry) => entry.directionId) ?? [] };
  try {
    if (state.release) {
      const published = await buildPublishedInput(state, args, state.release, signal);
      if (published) {
        return { ...state, catalog: published.catalog, match: { generation: state.generation,
          result: buildMatchResult(published.input) }, notice: null };
      }
      return withNotice(state, "已发布数据中没有覆盖该类别与批次的专业，未生成匹配。");
    }
    return { ...state, match: { generation: state.generation,
      result: buildMatchResult(buildSyntheticInput(args)) }, notice: null };
  } catch (error) { return withNotice(state, errorMessage(error)); }
}

export interface ExcelRow {
  sampleId: string; track: string; institution: string; group: string; major: string;
  region: string; subjectRequirement: string | null; planCount: number | null; sourceRow: number;
}
export function excelDevelopmentRows(raw: unknown): ExcelRow[] {
  const records = (raw as { records?: unknown } | null)?.records;
  if (!Array.isArray(records)) return [];
  return records.flatMap((item) => {
    const row = item as Record<string, unknown>;
    const plan = row.plan as Record<string, unknown> | undefined;
    const source = row.source as Record<string, unknown> | undefined;
    if (!plan || !source) return [];
    return [{ sampleId: String(row.sample_id), track: String(row.track), institution: String(plan.institution_name),
      group: String(plan.group_code), major: String(plan.major_name), region: String(plan.region),
      subjectRequirement: typeof plan.subject_requirement_source === "string" ? plan.subject_requirement_source : null,
      planCount: typeof plan.plan_count === "number" ? plan.plan_count : null, sourceRow: Number(source.row) }];
  });
}
export function routeMap(state: WebState) {
  const reading = summary(state);
  const fresh = isMatchFresh(state) ? state.match?.result : null;
  return { confirmed: DIRECTIONS.filter((direction) => reading?.confirmed.some((entry) => entry.directionId === direction.directionId)),
    candidates: fresh?.candidates ?? [], excluded: fresh?.excluded_summary ?? [], warnings: fresh?.warnings ?? [],
    actions: buildNextActions({ profile: state.profile, constraints: constraintsFor(state), registry: state.registry }),
    stale: state.match !== null && !isMatchFresh(state) };
}

export interface ModelContextLike {
  registerTool(tool: { name: string; title: string; description: string; inputSchema: object;
    annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute(input: unknown): unknown },
    options?: { signal?: AbortSignal }): void | Promise<void>;
}
export function registerStartTool(context: ModelContextLike | undefined, update: (patch: Partial<WebForm>) => void,
  signal?: AbortSignal): void {
  if (!context) return;
  void Promise.resolve(context.registerTool({ name: "configure_exploration_start", title: "设置探索起点",
    description: "设置目标年份、首选科目和两门再选科目；成绩仍可留空。",
    inputSchema: { type: "object", properties: {
      targetYear: { type: "integer", enum: [...SAMPLE_YEARS] },
      primary: { type: ["string", "null"], enum: ["PHYSICS", "HISTORY", null] },
      additional: { type: "array", items: { type: "string", enum: [...ADDITIONAL_OPTIONS] }, maxItems: 2, uniqueItems: true }
    }, required: ["targetYear", "primary", "additional"], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      const value = input as Partial<WebForm>;
      if (!SAMPLE_YEARS.includes(value.targetYear as never)) throw new Error("INVALID_TARGET_YEAR");
      if (value.primary !== null && value.primary !== "PHYSICS" && value.primary !== "HISTORY") throw new Error("INVALID_PRIMARY");
      if (!Array.isArray(value.additional) || value.additional.length > 2 ||
        value.additional.some((item) => !ADDITIONAL_OPTIONS.includes(item as never))) throw new Error("INVALID_ADDITIONAL_SUBJECTS");
      update({ targetYear: value.targetYear, primary: value.primary, additional: [...value.additional] });
      return { status: "configured", scoreRequiredForMatching: false };
    } }, signal ? { signal } : undefined)).catch(() => undefined);
}
