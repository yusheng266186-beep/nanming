import { buildPublishedInput, SELECTABLE_BATCHES } from "@nanhang/match-input";
import { buildMatchResult } from "@nanhang/domain";
import {
  scorePosition,
  type LoadedRelease,
  type OfferingLabel,
} from "@nanhang/release-loader";
import type { NanhangMatchResult100 } from "@nanhang/contracts";
import { lineEquivalent, usableLines } from "./exam-position.js";
import { OFFICIAL_LINES_2026 } from "./reference-lines.js";
import type { ExamRecord } from "./model.js";

export type Track = "PHYSICS" | "HISTORY";
export interface ScoreRange {
  low: number;
  high: number;
  basis: string;
}
export interface Major {
  id: string;
  name: string;
  category: string;
  directionId: string;
}
export interface CatalogDirection {
  id: string;
  name: string;
}
/** 小类（专业类，如「计算机类」）：属于一个大类，并列出类下的真实专业。 */
export interface CatalogClass extends CatalogDirection {
  /** 大类（学科门类）id。 */
  groupId: string;
  /** 大类名；个别记录缺失门类时归入「未分类」。 */
  group: string;
  majors: Major[];
}
/** 大类（学科门类，如「工学」）：方向选择的第一层。 */
export interface CatalogGroup {
  id: string;
  name: string;
  classes: CatalogClass[];
}
export type Candidate = NanhangMatchResult100["candidates"][number];
export interface PoolRow {
  label: OfferingLabel;
  candidate: Candidate;
  reference: "major" | "group";
}
export interface SchoolPool {
  rows: PoolRow[];
  majors: Major[];
  directions: CatalogDirection[];
  groups: CatalogGroup[];
  rankRange: [number, number];
  referenceYear: number;
  releaseId: string;
  schoolCount: number;
  missingHistory: number;
  range: ScoreRange;
}
// Stable IDs encode source labels rather than array positions; a different shard order cannot
// attach a student's selection to a different major. Source spelling is deliberately preserved.
export const majorId = (name: string) =>
  `major:${name.normalize("NFKC").trim()}`;
export const directionId = (name: string) =>
  `catalog:${name.normalize("NFKC").trim()}`;

export function validRange(low: number, high: number): boolean {
  return (
    Number.isInteger(low) &&
    Number.isInteger(high) &&
    low >= 0 &&
    high <= 750 &&
    low <= high
  );
}

/**
 * 一场考试的综合等位分。
 *
 * 负责人 2026-09-12 裁定：特控线口径与本科线口径各占一半、取算术平均，不再把两个口径
 * 各自的值一起丢进 min–max——两条线的口径差不是学生水平的信号，混进去只会把区间撑宽
 * （同一名学生因此从 36 分宽变成 54 分宽）。只有一个口径可用（另一条线缺、为 0、
 * 或两条线高低颠倒）时就用可用的那一个，不拿缺失的那条当 0 参与平均。
 */
function combinedEquivalent(
  exam: ExamRecord,
  official: { specialControl: number; undergraduate: number },
): number | null {
  const total = exam.total;
  // 总分 0 或缺失一律当「没有这一场」：0 分不是成绩，比例换算会得到 0 并把区间击穿。
  if (total === null || !Number.isFinite(total) || total <= 0 || total > 750) return null;
  const lines = usableLines(exam);
  const values = [
    lines.top === null ? null : lineEquivalent(total, lines.top, official.specialControl),
    lines.undergraduate === null ? null : lineEquivalent(total, lines.undergraduate, official.undergraduate),
  ].flatMap((estimate) => {
    if (!estimate) return [];
    return estimate.equivalentScore >= 0 && estimate.equivalentScore <= 750
      ? [estimate.equivalentScore]
      : [];
  });
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** No raw mock score is silently used as a gaokao score. Every usable exam needs its own line. */
export function rangeFromExams(
  exams: readonly ExamRecord[],
  track: Track,
): ScoreRange | null {
  const official = OFFICIAL_LINES_2026.tracks[track];
  const estimates = exams.flatMap((exam) => {
    const value = combinedEquivalent(exam, official);
    return value === null ? [] : [value];
  });
  if (!estimates.length) return null;
  return {
    low: Math.min(...estimates),
    high: Math.max(...estimates),
    basis:
      "每场考试把特控线口径与本科线口径各占一半取平均，再取各场的最小—最大值；不是预测区间。",
  };
}

export function catalogFromRows(labels: readonly OfferingLabel[]): {
  majors: Major[];
  directions: CatalogDirection[];
  groups: CatalogGroup[];
} {
  // 同名专业只登记一次，但门类跟随首次出现的记录（专业名在目录里跨门类重复极罕见，
  // 真遇到时以先见者为准，不发明第二条同名专业）。
  const majors = new Map<string, { major: Major; group: string }>();
  for (const label of labels) {
    const name = label.majorName.trim();
    if (!name) continue;
    // Missing taxonomy is represented by the real major name, never a made-up discipline.
    const category = label.categoryClass?.trim() || name;
    const group = label.category?.trim() || "";
    const id = majorId(name);
    if (!majors.has(id))
      majors.set(id, {
        major: { id, name, category, directionId: directionId(category) },
        group,
      });
  }
  const sorted = [...majors.values()].sort((a, b) =>
    a.major.name.localeCompare(b.major.name, "zh-CN"),
  );
  // 小类（专业类）聚合出各组下的真实专业；大类（学科门类）再聚合小类——
  // 负责人裁定：方向选择先大类、后小类，AI 建议与学生自选都走这两层。
  const classes = new Map<string, CatalogClass>();
  const groups = new Map<string, CatalogGroup>();
  for (const { major, group } of sorted) {
    const groupName = group || "未分类";
    const groupId = directionId(groupName);
    let cls = classes.get(major.directionId);
    if (!cls) {
      cls = { id: major.directionId, name: major.category, groupId, group: groupName, majors: [] };
      classes.set(major.directionId, cls);
      let grp = groups.get(groupId);
      if (!grp) {
        grp = { id: groupId, name: groupName, classes: [] };
        groups.set(groupId, grp);
      }
      grp.classes.push(cls);
    } else if (!cls.group && group) {
      cls.group = groupName;
      cls.groupId = groupId;
    }
    cls.majors.push(major);
  }
  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, "zh-CN");
  return {
    majors: sorted.map((entry) => entry.major),
    directions: [...classes.values()].map(({ id, name }) => ({ id, name })).sort(byName),
    groups: [...groups.values()]
      .map((grp) => ({ ...grp, classes: [...grp.classes].sort(byName) }))
      .sort(byName),
  };
}

export function referenceOverlaps(
  candidate: Candidate,
  ranks: readonly [number, number],
): "major" | "group" | null {
  for (const kind of ["major", "group"] as const) {
    const reference =
      kind === "major" ? candidate.major_reference : candidate.group_reference;
    const interval = reference.reference_rank_interval;
    if (!interval || reference.relation === "NOT_COMPARABLE") continue;
    // Prefer specific major history. A known, out-of-range major must never sneak in via its group.
    return interval[0] <= ranks[1] && interval[1] >= ranks[0] ? kind : null;
  }
  return null;
}

export async function buildSchoolPool(
  release: LoadedRelease,
  track: Track,
  additional: readonly string[],
  range: ScoreRange,
  batches: readonly string[],
  signal?: AbortSignal,
): Promise<SchoolPool> {
  if (!validRange(range.low, range.high))
    throw new Error("请填写 0—750 之间、下限不高于上限的整数区间。");
  if (additional.length !== 2 || new Set(additional).size !== 2)
    throw new Error("请选择两门不同的再选科目。");
  if (
    !batches.length ||
    batches.some(
      (batch) =>
        !SELECTABLE_BATCHES.includes(
          batch as (typeof SELECTABLE_BATCHES)[number],
        ),
    )
  )
    throw new Error("请至少选择一个支持的批次。");
  if (release.manifest.synthetic || release.manifest.status !== "PUBLISHED")
    throw new Error("当前没有可用的真实发布数据，请稍后重试。");
  const built = await buildPublishedInput(
    {
      track,
      additional,
      score: range.high,
      targetYear: new Date().getFullYear() + 1,
      hardBudget: null,
      confirmedDirections: [],
      batches,
    },
    release,
    signal,
  );
  if (!built) throw new Error("当前发布库没有覆盖所选科目与批次。");
  const year = built.input.scenario.reference_year;
  const low = scorePosition(release, track, range.low, { year });
  const high = scorePosition(release, track, range.high, { year });
  if (!low || !high)
    throw new Error("区间端点超出参考年分段表的公布范围，请调整分数区间。");
  const rankRange: [number, number] = [high.rank - high.count + 1, low.rank];
  const result = buildMatchResult(built.input);
  let missingHistory = 0;
  const rows = result.candidates.flatMap((candidate): PoolRow[] => {
    const label = built.catalog[candidate.offering_id];
    if (!label) return [];
    if (
      !candidate.major_reference.reference_rank_interval &&
      !candidate.group_reference.reference_rank_interval
    )
      missingHistory++;
    const reference = referenceOverlaps(candidate, rankRange);
    return reference ? [{ label, candidate, reference }] : [];
  });
  // Independent choices may include real majors outside the score pool; those yield an honest
  // empty route rather than a silently broadened score range or invented school.
  const catalog = catalogFromRows(
    result.candidates.flatMap((c) =>
      built.catalog[c.offering_id] ? [built.catalog[c.offering_id]!] : [],
    ),
  );
  return {
    rows,
    ...catalog,
    rankRange,
    referenceYear: year,
    releaseId: release.manifest.release_id,
    schoolCount: new Set(rows.map((r) => r.label.institutionName)).size,
    missingHistory,
    range,
  };
}

/**
 * 发布包级的专业类目录（与分数区间无关）：同一选科与批次下，发布库里全部真实专业与专业类。
 *
 * 「方向」页的自选清单与 AI 的方向目录都用它——流程是先定方向、再按分数匹配，
 * 不能要求学生先跑出院校池才谈方向。目录只枚举发布库里的真实条目，不发明专业。
 * 场景构建需要一个分数才能过分段表校验：取该科类公布的最高分（目录枚举不使用它）。
 */
export async function buildReleaseCatalog(
  release: LoadedRelease,
  track: Track,
  additional: readonly string[],
  batches: readonly string[],
  signal?: AbortSignal,
): Promise<{ majors: Major[]; directions: CatalogDirection[]; groups: CatalogGroup[] }> {
  if (additional.length !== 2 || new Set(additional).size !== 2)
    throw new Error("请选择两门不同的再选科目。");
  if (
    !batches.length ||
    batches.some(
      (batch) =>
        !SELECTABLE_BATCHES.includes(
          batch as (typeof SELECTABLE_BATCHES)[number],
        ),
    )
  )
    throw new Error("请至少选择一个支持的批次。");
  if (release.manifest.synthetic || release.manifest.status !== "PUBLISHED")
    throw new Error("当前没有可用的真实发布数据，请稍等后重试。");
  const table = release.distributions.find((item) => item.track === track);
  if (!table) throw new Error("当前发布库没有该科类的分段表。");
  const built = await buildPublishedInput(
    {
      track,
      additional,
      // 取公布范围中点：场景构建只要求分数落在分段表内，目录枚举不使用这个分数；
      // 中点比最高分更稳——不同年份的公布范围略有差异时也不会越界。
      score: Math.round((table.publishedMinScore + table.publishedMaxScore) / 2),
      targetYear: new Date().getFullYear() + 1,
      hardBudget: null,
      confirmedDirections: [],
      batches,
    },
    release,
    signal,
  );
  if (!built) throw new Error("当前发布库没有覆盖所选科目与批次。");
  return catalogFromRows(Object.values(built.catalog));
}

export interface RouteBranch {
  kind: "shared" | "ai" | "self";
  title: string;
  majors: Major[];
  rows: PoolRow[];
}
export function makeBranches(
  pool: SchoolPool,
  aiDirections: readonly string[],
  selected: readonly string[],
): RouteBranch[] {
  // 两条线现在同一颗粒度：都是专业类（小类）id——AI 线来自谈心建议，自选线来自
  // 「方向」页的两级选择（大类 2–3 个、小类 5–10 个）。一致合并、不一致分路。
  const ai = new Set(
    pool.majors
      .filter((m) => aiDirections.includes(m.directionId))
      .map((m) => m.directionId),
  );
  const self = new Set(
    selected.filter((id) => pool.majors.some((m) => m.directionId === id)),
  );
  const definitions = [
    {
      kind: "shared" as const,
      title: "共同方向",
      accepts: (id: string) => ai.has(id) && self.has(id),
    },
    {
      kind: "ai" as const,
      title: "AI 建议探索",
      accepts: (id: string) => ai.has(id) && !self.has(id),
    },
    {
      kind: "self" as const,
      title: "我的自主选择",
      accepts: (id: string) => self.has(id) && !ai.has(id),
    },
  ];
  return definitions.flatMap(({ kind, title, accepts }) => {
    const majors = pool.majors.filter((m) => accepts(m.directionId));
    if (!majors.length) return [];
    const ids = new Set(majors.map((m) => m.directionId));
    return [
      {
        kind,
        title,
        majors,
        rows: pool.rows.filter((row) => {
          const cls = row.label.categoryClass?.trim();
          return ids.has(directionId(cls || row.label.majorName.trim()));
        }),
      },
    ];
  });
}
