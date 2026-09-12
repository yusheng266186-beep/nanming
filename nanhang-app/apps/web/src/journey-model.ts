import { buildPublishedInput, SELECTABLE_BATCHES } from "@nanhang/match-input";
import { buildMatchResult } from "@nanhang/domain";
import {
  scorePosition,
  type LoadedRelease,
  type OfferingLabel,
} from "@nanhang/release-loader";
import type { NanhangMatchResult100 } from "@nanhang/contracts";
import { lineEquivalent } from "./exam-position.js";
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

/** No raw mock score is silently used as a gaokao score. Every usable exam needs its own line. */
export function rangeFromExams(
  exams: readonly ExamRecord[],
  track: Track,
): ScoreRange | null {
  const official = OFFICIAL_LINES_2026.tracks[track];
  const estimates = exams.flatMap((exam) => {
    if (
      exam.total === null ||
      !Number.isFinite(exam.total) ||
      exam.total < 0 ||
      exam.total > 750
    )
      return [];
    return [
      [exam.topTotal, official.specialControl],
      [exam.undergraduateTotal, official.undergraduate],
    ].flatMap(([line, target]) => {
      if (line == null || target == null || line <= 0 || line > 750) return [];
      const estimate = lineEquivalent(exam.total!, line, target);
      return estimate &&
        estimate.equivalentScore >= 0 &&
        estimate.equivalentScore <= 750
        ? [estimate.equivalentScore]
        : [];
    });
  });
  if (!estimates.length) return null;
  return {
    low: Math.min(...estimates),
    high: Math.max(...estimates),
    basis:
      "近几次考试按各自切线作比例换算，取可用估算的最小—最大值；不是预测区间。",
  };
}

export function catalogFromRows(labels: readonly OfferingLabel[]): {
  majors: Major[];
  directions: CatalogDirection[];
} {
  const majors = new Map<string, Major>();
  for (const label of labels) {
    const name = label.majorName.trim();
    if (!name) continue;
    // Missing taxonomy is represented by the real major name, never a made-up discipline.
    const category = label.categoryClass?.trim() || name;
    const id = majorId(name);
    if (!majors.has(id))
      majors.set(id, {
        id,
        name,
        category,
        directionId: directionId(category),
      });
  }
  const sorted = [...majors.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "zh-CN"),
  );
  const dirs = new Map<string, CatalogDirection>();
  for (const major of sorted)
    dirs.set(major.directionId, {
      id: major.directionId,
      name: major.category,
    });
  return {
    majors: sorted,
    directions: [...dirs.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "zh-CN"),
    ),
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
  const ai = new Set(
    pool.majors
      .filter((m) => aiDirections.includes(m.directionId))
      .map((m) => m.id),
  );
  const self = new Set(
    selected.filter((id) => pool.majors.some((m) => m.id === id)),
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
    const majors = pool.majors.filter((m) => accepts(m.id));
    if (!majors.length) return [];
    const ids = new Set(majors.map((m) => m.id));
    return [
      {
        kind,
        title,
        majors,
        rows: pool.rows.filter((row) => ids.has(majorId(row.label.majorName))),
      },
    ];
  });
}
