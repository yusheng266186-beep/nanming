/**
 * Load a published data release and turn its shards into matcher input.
 *
 * The release is the sharded JSON written by `pipelines/task03/export_release.py`. This module
 * is the only place that knows the wire format; everything downstream works with the domain
 * types, so a format change is contained here.
 *
 * Two properties matter for what the page may claim:
 *
 * - A shard declares its own constants — release id, year, track, batch, admission type, score
 *   basis. They are read from the shard, never assumed, so a record can never be presented under
 *   a scope it did not come from.
 * - History is exported in the compact tuple form with the field order declared once per shard.
 *   `historyFields` is honoured rather than hard-coded, so an added field does not silently
 *   shift the meaning of every row.
 */
import type {
  HistoricalReferenceRecord,
  MatchingOffering,
  MatchingRequirement,
} from "@nanhang/domain";
import type { EvidenceDescriptor } from "@nanhang/domain";
import type { NanhangPublicDataManifest100 } from "@nanhang/contracts";

export interface ReleaseIndexEntry {
  path: string;
  scopeId: string;
  track: "PHYSICS" | "HISTORY";
  batch: string;
  admissionType: string;
  offerings: number;
  part: number;
  partCount: number;
}

export interface ReleaseIndex {
  shards: ReleaseIndexEntry[];
}

interface RawShard {
  scopeId: string;
  releaseId: string;
  year: number;
  province: string;
  track: "PHYSICS" | "HISTORY";
  batch: string;
  stage: string | null;
  admissionType: string;
  trackBasis?: string;
  scoreBasis: string;
  historyFields: string[];
  groupHistory: Record<string, unknown[][]>;
  offerings: Record<string, unknown>[];
}

export interface DistributionTable {
  distributionId: string;
  year: number;
  track: string;
  curriculumSystem: string | null;
  scoreBasis: string;
  publishedMinScore: number;
  publishedMaxScore: number;
  unlistedScores: number[];
  rows: { score: number; count: number | null; cumulative: number | null;
          rankInterval: [number, number] | null }[];
}

/** One cross-year comparability decision, as recorded in the release. */
export interface ComparabilityRecord {
  link_id: string;
  plan_year: number;
  plan_track: "PHYSICS" | "HISTORY";
  history_year: number;
  history_track: string;
  scope: string;
  status: "VERIFIED" | "NOT_ESTABLISHED" | "QUARANTINED";
  basis: string;
  examined: string;
  not_examined: string | null;
  reviewer: string | null;
  review_date: string | null;
  evidence_ids: string | null;
}

export interface LoadedRelease {
  manifest: NanhangPublicDataManifest100;
  index: ReleaseIndex;
  distributions: DistributionTable[];
  comparability: ComparabilityRecord[];
  basePath: string;
}

/**
 * Where the release is served from.
 *
 * This used to read `import.meta.env` directly, which only type-checks with Vite's client types.
 * The package is compiled by tsc rather than Vite, so the env bag is read through a narrowed cast:
 * the Vite override still applies in an app build, and a plain Node import finds no env and falls
 * back to the served path.
 */
const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;

/**
 * 取数根地址：构建期可用 VITE_NANHANG_RELEASE_BASE 指向对象存储。
 * 空字符串按「没配」处理——CI 里把一个未设置的仓库变量注入 env 会得到空串，
 * 那时若直接采用空串，页面会去请求 /current.json，而不是回落到同源默认路径。
 */
export const RELEASE_BASE: string =
  viteEnv?.VITE_NANHANG_RELEASE_BASE?.trim() || "/data/releases";

export interface LoadReleaseOptions {
  signal?: AbortSignal;
  /**
   * Where the release is served from; defaults to `RELEASE_BASE`.
   *
   * Both front ends serve the same `data/releases` tree, so the default suits them. The parameter
   * exists so a test or a differently-mounted deployment can point elsewhere without mutating a
   * module-level constant.
   */
  basePath?: string;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  // `exactOptionalPropertyTypes` rejects an explicit `signal: undefined`, so the option is only
  // added when a signal was actually supplied.
  const response = await fetch(url, signal ? { signal, cache: "no-store" } : { cache: "no-store" });
  if (!response.ok) throw new Error(`RELEASE_FETCH_${response.status}:${url}`);
  return (await response.json()) as T;
}

/** Read the pointer, then the manifest it names. */
export async function loadRelease(options: LoadReleaseOptions = {}): Promise<LoadedRelease> {
  const base = options.basePath ?? RELEASE_BASE;
  const signal = options.signal;
  const pointer = await getJson<{ current: string; manifest: string }>(
    `${base}/current.json`, signal);
  const manifest = await getJson<NanhangPublicDataManifest100>(
    `${base}/${pointer.manifest}`, signal);
  const basePath = `${base}/${pointer.current}`;
  const index = await getJson<ReleaseIndex>(`${basePath}/index.json`, signal);
  const distributions = await getJson<{ tables: DistributionTable[] }>(
    `${basePath}/distributions.json`, signal);
  // Comparability is required, not optional: without it the page cannot tell which years may be
  // compared, and defaulting to "comparable" is exactly the failure this guards against.
  const comparability = await getJson<{ records: ComparabilityRecord[] }>(
    `${basePath}/comparability.json`, signal);
  return { manifest, index, distributions: distributions.tables,
           comparability: comparability.records, basePath };
}

/** Shards for one track and batch, in part order. */
export function shardsFor(release: LoadedRelease, track: "PHYSICS" | "HISTORY",
                          batches: readonly string[]): ReleaseIndexEntry[] {
  const wanted = new Set(batches);
  return release.index.shards
    .filter((entry) => entry.track === track && wanted.has(entry.batch))
    .sort((left, right) => (left.scopeId + left.admissionType).localeCompare(
      right.scopeId + right.admissionType) || left.part - right.part);
}

/**
 * Loaded shards, keyed by their release-relative path.
 *
 * A shard is read when the student first searches its batch and again when the slider re-runs the
 * match. The payload is immutable build output, so caching the in-flight promise both avoids the
 * second network round-trip and de-duplicates concurrent requests for the same file. A failed
 * fetch is evicted so a later attempt can retry instead of pinning the error.
 */
const shardCache = new Map<string, Promise<RawShard>>();

export async function loadShard(release: LoadedRelease, path: string,
                                signal?: AbortSignal): Promise<RawShard> {
  const key = `${release.basePath}/${path}`;
  const cached = shardCache.get(key);
  if (cached) return cached;
  const pending = getJson<RawShard>(key, signal);
  shardCache.set(key, pending);
  try {
    return await pending;
  } catch (error) {
    shardCache.delete(key);
    throw error;
  }
}

/**
 * Turn one compact history tuple into a reference record.
 *
 * Field order comes from the shard's `historyFields`, and a tuple whose length does not match is
 * rejected rather than partially read: silently defaulting a missing value would turn "unknown"
 * into a number that looks real.
 */
function historyRecord(fields: string[], tuple: unknown[], shard: RawShard,
                       subjectType: "group" | "major", subjectId: string,
                       evidenceId: string): HistoricalReferenceRecord | null {
  if (tuple.length !== fields.length) return null;
  const row: Record<string, unknown> = {};
  fields.forEach((field, index) => { row[field] = tuple[index]; });
  const metricType = String(row.metricType ?? "");
  const sourceYear = Number(row.sourceYear);
  const rank = Number(row.rank);
  if (!metricType || !Number.isInteger(sourceYear) || !Number.isFinite(rank)) return null;
  const scoreBasis = shard.scoreBasis === "gaokao_filing" ? "gaokao_filing" : "gaokao_cultural";
  // The recorded status is carried through unchanged. A year whose comparison is not established
  // must stay that way here: turning it into COMPARABLE would present a cross-year claim the data
  // does not support, and the domain type's narrower value set is not a reason to upgrade it.
  const recorded = String(row.comparability ?? "");
  const comparability: HistoricalReferenceRecord["comparability"] =
    recorded === "COMPARABLE" || recorded === "GROUP_CHANGED" || recorded === "SOURCE_CONFLICT"
      ? recorded
      : "NOT_ESTABLISHED";
  return {
    recordStatus: "PUBLISHED",
    releaseId: shard.releaseId,
    subjectType,
    subjectId,
    sourceYear,
    // The exam's track definition for an earlier year is not stated row by row in the source, so
    // the shard's plan-year track is carried as the *sheet* the numbers were filed on, and the
    // comparability field says whether a cross-year claim is supported at all.
    track: shard.track,
    batch: shard.batch,
    stage: shard.stage,
    admissionType: shard.admissionType,
    scoreBasis,
    metricType: metricType as HistoricalReferenceRecord["metricType"],
    rankInterval: [rank, rank],
    evidenceIds: [evidenceId],
    comparability,
  };
}

function evidenceIdOf(subjectType: "group" | "major", subjectId: string, sourceYear: number,
                      metricType: string): string {
  return `EV-${subjectType.toUpperCase()}-${subjectId}-${sourceYear}-${metricType}`;
}

/**
 * Human-readable labels for one offering, read straight from its shard row.
 *
 * The matcher works with offering ids only, so the page keeps this separate map keyed by
 * `offeringId`. Names are carried by that stable id and never by list position: a candidate's
 * index changes with sorting and filtering, so joining on an array subscript would attach one
 * school's name to another row. Fields the source does not publish stay null rather than being
 * filled with a placeholder.
 */
export interface OfferingLabel {
  offeringId: string;
  groupId: string;
  institutionName: string;
  institutionCity: string | null;
  institutionTags: string | null;
  majorName: string;
  majorCode: string | null;
  /** 学科门类（如「工学」「医学」），来源工作簿原文。 */
  category: string | null;
  /** 专业类（如「计算机类」「电子信息类」），来源工作簿原文。 */
  categoryClass: string | null;
  planCount: number | null;
  tuition: number | null;
  level: string | null;
  batch: string;
  track: "PHYSICS" | "HISTORY";
}

export interface ShardConversion {
  offerings: MatchingOffering[];
  evidenceIndex: EvidenceDescriptor[];
  /** Display names for the converted offerings, keyed by offeringId. */
  catalog: Record<string, OfferingLabel>;
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Convert a shard's offerings into domain offerings plus their evidence descriptors. */
export function convertShard(shard: RawShard): ShardConversion {
  const offerings: MatchingOffering[] = [];
  const catalog: Record<string, OfferingLabel> = {};
  // The matcher resolves evidence twice with different expectations: a candidate's own ids must
  // resolve as ("offering", offeringId), and a history record's ids as ("group", groupId) or
  // ("major", offeringId) with the record's metric. One id therefore cannot serve both roles, and
  // the roles get distinct ids. Descriptors are deduplicated by id because a repeated id is
  // treated as a conflict by the matcher, which would make every reference unusable — group
  // history in particular is shared by all the offerings in that group.
  const descriptors = new Map<string, EvidenceDescriptor>();
  const register = (descriptor: EvidenceDescriptor) => {
    if (!descriptors.has(descriptor.evidenceId)) descriptors.set(descriptor.evidenceId, descriptor);
  };

  for (const raw of shard.offerings) {
    const offeringId = String(raw.offeringId);
    const groupId = String(raw.groupId);
    const history: HistoricalReferenceRecord[] = [];

    for (const tuple of shard.groupHistory[groupId] ?? []) {
      const metricType = String(tuple[shard.historyFields.indexOf("metricType")] ?? "");
      const sourceYear = Number(tuple[shard.historyFields.indexOf("sourceYear")]);
      const record = historyRecord(shard.historyFields, tuple, shard, "group", groupId,
        evidenceIdOf("group", groupId, sourceYear, metricType));
      if (record) {
        history.push(record);
        register({ evidenceId: record.evidenceIds[0]!, subjectType: "group",
          subjectId: groupId, metricType: record.metricType });
      }
    }
    for (const tuple of (raw.majorHistory as unknown[][]) ?? []) {
      const metricType = String(tuple[shard.historyFields.indexOf("metricType")] ?? "");
      const sourceYear = Number(tuple[shard.historyFields.indexOf("sourceYear")]);
      const record = historyRecord(shard.historyFields, tuple, shard, "major", offeringId,
        evidenceIdOf("major", offeringId, sourceYear, metricType));
      if (record) {
        history.push(record);
        register({ evidenceId: record.evidenceIds[0]!, subjectType: "major",
          subjectId: offeringId, metricType: record.metricType });
      }
    }
    // The offering's own citation, separate from its history records so both checks can pass.
    const offeringEvidenceId = `EV-OFFERING-${offeringId}`;
    register({ evidenceId: offeringEvidenceId, subjectType: "offering", subjectId: offeringId });

    const requirement = raw.requirement as
      { requirementId: string; kind: string; subjects: string[] } | undefined;
    const requirements: MatchingRequirement[] = [];
    if (requirement?.kind === "all_of") {
      requirements.push({ kind: "subject", requirementId: requirement.requirementId,
        rule: { kind: "all_of", subjects: requirement.subjects } });
    } else if (requirement?.kind === "unlimited") {
      // 「不限」is a requirement that is satisfied by construction, not an absent one, so it is
      // recorded as a checked-and-passed condition rather than left off the list.
      requirements.push({ kind: "condition", requirementId: requirement.requirementId,
        status: "PASS" });
    } else {
      // An unparsed requirement stays UNKNOWN; it is never read as "unlimited".
      requirements.push({ kind: "condition", requirementId: requirement?.requirementId ?? "REQ-?",
        status: "UNKNOWN", reasonCode: "UNKNOWN_REQUIREMENT" });
    }

    catalog[offeringId] = {
      offeringId,
      groupId,
      institutionName: String(raw.institutionName ?? offeringId),
      institutionCity: textOrNull(raw.institutionCity),
      institutionTags: textOrNull(raw.institutionTags),
      majorName: String(raw.majorName ?? "未知专业"),
      majorCode: textOrNull(raw.majorCode),
      category: textOrNull(raw.category),
      categoryClass: textOrNull(raw.categoryClass),
      planCount: typeof raw.planCount === "number" ? raw.planCount : null,
      tuition: typeof raw.tuition === "number" ? raw.tuition : null,
      level: textOrNull(raw.level),
      batch: shard.batch,
      track: shard.track,
    };

    offerings.push({
      recordStatus: "PUBLISHED",
      releaseId: shard.releaseId,
      offeringId,
      groupId,
      scopeId: shard.scopeId,
      year: shard.year,
      track: shard.track,
      batch: shard.batch,
      stage: shard.stage,
      admissionType: shard.admissionType,
      region: String(raw.institutionProvince ?? ""),
      tuition: typeof raw.tuition === "number" ? raw.tuition : null,
      requirements,
      history,
      directionTags: [],
      interestReasonRefs: [],
      // The offering cites its own evidence id, which resolves as ("offering", offeringId). Its
      // history records cite themselves separately, so neither check borrows the other's id.
      evidenceIds: [offeringEvidenceId],
    });
  }
  return { offerings, evidenceIndex: [...descriptors.values()], catalog };
}

/**
 * The year a match compares against.
 *
 * The matcher requires the same year for three things: the score-distribution table that locates
 * the rank, and the historical reference records. The plan year (2026) has published plans but no
 * admission history yet, so comparing against it would find nothing. The reference year is
 * therefore the latest year that has *both* a published table and history — 2025 for this release —
 * which also matches the target-scenario semantics the product spec defines ("假设在该年取得该
 * 分数的历史情景"). Years without a table are skipped rather than silently mixed.
 */
/**
 * The year a match compares against.
 *
 * Three things must hold for the same year: a published score-distribution table to locate the
 * rank, historical reference records, and an established comparability link between that year and
 * the plan year. The plan year (2026) has plans but no admission history of its own, so the
 * reference year is the latest year satisfying all three — 2025 in this release. A year with a
 * table and history but no established link is skipped, because comparing against it would assert
 * a cross-year equivalence nobody has verified.
 */
export function referenceYearFor(release: LoadedRelease, planTrack: "PHYSICS" | "HISTORY",
                                 availableYears: readonly number[]): number | null {
  const withTable = new Set(release.distributions
    .filter((table) => table.track === planTrack)
    .map((table) => table.year));
  const comparable = new Set(release.comparability
    .filter((record) => record.status === "VERIFIED" && record.plan_track === planTrack)
    .map((record) => record.history_year));
  const usable = availableYears.filter((year) => withTable.has(year) && comparable.has(year));
  return usable.length > 0 ? Math.max(...usable) : null;
}

/** The exact distribution row for a score, or null when the table does not list it. */
export function distributionRow(table: DistributionTable, score: number) {
  const row = table.rows.find((item) => item.score === score);
  if (!row || row.count === null || row.cumulative === null) return null;
  return { rowType: "exact" as const, score: row.score, count: row.count,
           cumulative: row.cumulative };
}

/**
 * The latest published distribution table for a track, and the rank a score maps to.
 *
 * Everything shown comes from the table itself: the rank is the row's cumulative count, and the
 * percentile is that rank against the table's largest cumulative count (the deepest listed
 * score). When the score falls outside the published rows, or no table exists for the track, the
 * result is null and the page says the figure is not available rather than interpolating one.
 */
export interface RankLookup {
  tableYear: number;
  score: number;
  rank: number;
  count: number;
  total: number;
  percentile: number;
}

export function rankLookup(release: LoadedRelease, track: "PHYSICS" | "HISTORY",
                           score: number): RankLookup | null {
  const tables = release.distributions.filter((table) => table.track === track);
  if (tables.length === 0) return null;
  const table = tables.reduce((latest, current) => current.year > latest.year ? current : latest);
  const row = table.rows.find((item) => item.score === score);
  if (!row || row.cumulative === null || row.count === null) return null;
  const total = table.rows.reduce(
    (max, item) => item.cumulative !== null && item.cumulative > max ? item.cumulative : max, 0);
  if (total <= 0) return null;
  return { tableYear: table.year, score, rank: row.cumulative, count: row.count,
           total, percentile: row.cumulative / total * 100 };
}

/* ------------------------------------------------------------------
   由发布包派生的展示数据

   这些都是对 LoadedRelease 的纯函数，两套前端共用，避免各写一份而漂移。
   ------------------------------------------------------------------ */

/**
 * 定位页要展示的「分数 → 位次」结果，全部来自官方分段表。
 *
 * `tableYear`/`rowScore` 保证页面能说清这是哪一年的哪一行；`isReferenceYear` 用来提示
 * 这个位次属于参考年，而不是学生目标年的真实排名（目标年的表还没发布）。
 */
export interface ScorePosition {
  tableYear: number;
  score: number;
  rank: number;
  count: number;
  total: number;
  percentile: number;
  /** 该表公布的最低分与最高分，用来画「官方公布范围」而不是编造一条控制线。 */
  publishedMinScore: number;
  publishedMaxScore: number;
  /** 是否为学生本次匹配实际使用的参考年。 */
  isReferenceYear: boolean;
}

/**
 * 用官方分段表把分数换算成位次。
 *
 * 默认取**匹配实际使用的参考年**那一张表，而不是最新一年：历史位置比较、参考记录与位次
 * 必须来自同一年，否则页面会拿 2026 年的表去解释 2025 年的记录。`rankLookup` 取最新表，
 * 因此这里显式按参考年选表，并在表里逐行核对分数是否真的被列出。
 *
 * `options.year` 允许调用方显式指定年份（如线差等位换算校准在 2026 年切线上，就应查
 * 2026 年的表而不是匹配参考年）；此时 `isReferenceYear` 为 false，提示这不是匹配用的
 * 参考年定位。
 *
 * 只读发布包里的表；分数不在公布范围、或该科类没有表时返回 null，页面据此显示未知，
 * 绝不插值或外推。这里不做「录取概率」之类推断——位次只是把分数翻译成位置。
 */
export function scorePosition(release: LoadedRelease | null, track: "PHYSICS" | "HISTORY" | null,
                              score: number | null, options?: { year?: number }): ScorePosition | null {
  if (!release || !track || score === null) return null;
  const tables = release.distributions.filter((item) => item.track === track);
  if (tables.length === 0) return null;
  const referenceYear = options?.year
    ?? referenceYearFor(release, track, tables.map((item) => item.year));
  const table = tables.find((item) => item.year === referenceYear) ?? null;
  if (!table) return null;
  const row = table.rows.find((item) => item.score === score);
  if (!row || row.cumulative === null || row.count === null) return null;
  const total = table.rows.reduce(
    (max, item) => item.cumulative !== null && item.cumulative > max ? item.cumulative : max, 0);
  if (total <= 0) return null;
  return {
    tableYear: table.year,
    score,
    rank: row.cumulative,
    count: row.count,
    total,
    percentile: row.cumulative / total * 100,
    publishedMinScore: table.publishedMinScore,
    publishedMaxScore: table.publishedMaxScore,
    isReferenceYear: options?.year === undefined,
  };
}

/**
 * 方向簇到「专业类」的归类。
 *
 * 用工作簿原文的专业类名（categoryClass）做匹配，用来回答一个真实问题：
 * 「这个方向在本次搜索的批次里，实际覆盖多少条专业、多少所院校」。
 *
 * 这不是官方学科目录，也不是对学生的适配度评价——它是本项目为了浏览而做的归类，
 * 因此页面必须照原样说明。学生的方向结论仍然只来自他自己保存的原话。
 */
export const DIRECTION_CATEGORY_CLASSES: Record<string, readonly string[]> = {
  "data-and-information": [
    "计算机类", "电子信息类", "数学类", "统计学类", "物理学类",
    "管理科学与工程类", "电子商务类", "图书情报与档案管理类",
  ],
  "design-and-making": [
    "机械类", "材料类", "自动化类", "电气类", "土木类", "建筑类",
    "能源动力类", "交通运输类", "航空航天类", "设计学类", "力学类",
  ],
  "rules-and-social-questions": [
    "法学类", "经济学类", "金融学类", "工商管理类", "教育学类",
    "中国语言文学类", "外国语言文学类", "新闻传播学类", "公共管理类",
    "社会学类", "政治学类", "历史学类", "哲学类",
  ],
};

export interface DirectionCoverage {
  directionId: string;
  /** 本次搜索范围内，属于该方向的专业条数。 */
  offerings: number;
  /** 涉及的不同院校数。 */
  institutions: number;
  /** 命中的真实专业类名，按条数从多到少。 */
  categoryClasses: string[];
}

/**
 * 统计每个方向在给定候选集合里的真实覆盖。
 *
 * 只做计数与去重，不排序候选、不产生任何评分：数值回答的是「有多少」，不是「有多合适」。
 * catalog 来自发布包，缺失的条目不参与统计，也不补默认值。
 */
export function directionCoverage(
  candidates: readonly { offering_id: string }[],
  catalog: Record<string, OfferingLabel>
): DirectionCoverage[] {
  return Object.entries(DIRECTION_CATEGORY_CLASSES).map(([directionId, classes]) => {
    const wanted = new Set(classes);
    const institutions = new Set<string>();
    const hitClasses = new Map<string, number>();
    let offerings = 0;
    for (const candidate of candidates) {
      const label = catalog[candidate.offering_id];
      const categoryClass = label?.categoryClass ?? null;
      if (!categoryClass || !wanted.has(categoryClass)) continue;
      offerings += 1;
      if (label?.institutionName) institutions.add(label.institutionName);
      hitClasses.set(categoryClass, (hitClasses.get(categoryClass) ?? 0) + 1);
    }
    return {
      directionId,
      offerings,
      institutions: institutions.size,
      categoryClasses: [...hitClasses.entries()]
        .sort((left, right) => right[1] - left[1] || (left[0] < right[0] ? -1 : 1))
        .map(([name]) => name),
    };
  });
}

/**
 * 参考年在分数轴上的关键刻度。
 *
 * 项目没有公布的控制线（本科线/特控线），所以刻度用真实存在的东西：分段表公布的
 * 最低分与最高分，以及参考年的参考点（分数轴上下限）。这些都能在发布包里逐条查到，
 * 不像原设计那样画三条示意线。
 */
export function axisMarks(release: LoadedRelease | null, track: "PHYSICS" | "HISTORY" | null,
                          score: number | null): { score: number; label: string; major: boolean }[] {
  if (!release || !track) return [];
  const tables = release.distributions.filter((item) => item.track === track);
  if (tables.length === 0) return [];
  const referenceYear = referenceYearFor(release, track, tables.map((item) => item.year));
  const table = tables.find((item) => item.year === referenceYear) ?? null;
  if (!table) return [];
  const marks: { score: number; label: string; major: boolean }[] = [
    { score: table.publishedMinScore, label: `公布低段 ${table.year}`, major: true },
    { score: table.publishedMaxScore, label: `公布高段 ${table.year}`, major: true },
  ];
  // 「分数」而不是「目标分/情景分」：这个数可能是学生手填的目标，也可能是学校数据换算的等价分。
  if (score !== null) marks.push({ score, label: "你的分数", major: false });
  return marks;
}
