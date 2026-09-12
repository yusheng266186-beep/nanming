import { scorePosition, type LoadedRelease, type ScorePosition } from "@nanhang/release-loader";
import type { ExamRecord } from "./model.js";

/**
 * 考试成绩的定位数学：距线差、稳定性/趋势、线差比例等位估算。
 *
 * 全部是纯函数——不读网络、不读时间、不碰匹配输入。等位估算只是定位页上的一个
 * 显式「估算参考」，绝不进入匹配（match 输入仍然只吃学生手填的情景分）。
 */

/** 一次考试的距线差。负数表示还差多少分；缺分或缺线（线为 0 视为缺）时该口径为 null。 */
export interface ExamLineDiffs {
  topDiff: number | null;
  undergraduateDiff: number | null;
}

export function examLineDiffs(record: ExamRecord): ExamLineDiffs {
  const diff = (line: number | null) =>
    record.total === null || line === null || line <= 0 ? null : record.total - line;
  return { topDiff: diff(record.topTotal), undergraduateDiff: diff(record.undergraduateTotal) };
}

/** 总体标准差（与页面既有口径一致）；不足两条视为不可评估，不编造趋势。 */
export function scoreStability(totals: number[]): number | null {
  if (totals.length < 2) return null;
  const mean = totals.reduce((sum, item) => sum + item, 0) / totals.length;
  return Math.sqrt(totals.reduce((sum, item) => sum + (item - mean) ** 2, 0) / totals.length);
}

/** 最近一次相对上一次的变化；不足两条为 null。 */
export function scoreTrend(totals: number[]): number | null {
  if (totals.length < 2) return null;
  return totals[totals.length - 1]! - totals[totals.length - 2]!;
}

/** 单一口径的线差比例等位结果。 */
export interface LineEquivalent {
  /** 参与换算的本次考试线。 */
  examLine: number;
  /** (总分 − 考试线) ÷ 考试线。保留原始精度，展示层再格式化。 */
  lineRatio: number;
  /** 官方参考年对应线 × (1 + 比例)，四舍五入到整数——一分一段表的行是整数分。 */
  equivalentScore: number;
}

/**
 * 线差比例等位：先用「我的分数偏离本次考试线的比例」，再到官方参考年同口径线上取同比例位置。
 *
 * 比例法对满分口径不同的考试（如入口考与正考）比绝对线差更稳健。它是算术映射，
 * 隐含假设是「本次考试难度与高考同比例」，页面必须把这一点讲清楚。
 */
export function lineEquivalent(total: number, examLine: number, officialLine: number): LineEquivalent | null {
  if (examLine <= 0 || officialLine <= 0) return null;
  const lineRatio = (total - examLine) / examLine;
  return { examLine, lineRatio, equivalentScore: Math.round(officialLine * (1 + lineRatio)) };
}

/** 官方参考年的同口径控制线（特控线 / 本科线），来自 reference-lines.ts 的登记数据。
 *  year 同时决定等位分回查哪一年的分段表——切线校准在哪一年，定位就必须在哪一年。 */
export interface OfficialLines {
  year: number;
  specialControl: number;
  undergraduate: number;
}

/** 一次考试的两种口径等位估算；缺哪个口径的线就缺哪个结果，不互相凑。 */
export interface EquivalentEstimate {
  top: LineEquivalent | null;
  undergraduate: LineEquivalent | null;
}

export function equivalentEstimate(record: ExamRecord, official: OfficialLines): EquivalentEstimate {
  const total = record.total;
  return {
    top: total === null || record.topTotal === null
      ? null
      : lineEquivalent(total, record.topTotal, official.specialControl),
    undergraduate: total === null || record.undergraduateTotal === null
      ? null
      : lineEquivalent(total, record.undergraduateTotal, official.undergraduate)
  };
}

/** 等位分在官方一分一段表上的定位。表缺失或分数不在公布范围时 position 为 null（不插值不外推）。 */
export interface EquivalentPosition extends EquivalentEstimate {
  tableYear: number | null;
  top: (LineEquivalent & { position: ScorePosition | null }) | null;
  undergraduate: (LineEquivalent & { position: ScorePosition | null }) | null;
}

export function equivalentPosition(
  record: ExamRecord, official: OfficialLines,
  release: LoadedRelease | null, track: "PHYSICS" | "HISTORY" | null
): EquivalentPosition {
  const estimate = equivalentEstimate(record, official);
  const locate = (item: LineEquivalent | null) =>
    item === null
      ? null
      : { ...item, position: scorePosition(release, track, item.equivalentScore, { year: official.year }) };
  const tableYear = locate(estimate.top)?.position?.tableYear
    ?? locate(estimate.undergraduate)?.position?.tableYear
    ?? null;
  return { tableYear, top: locate(estimate.top), undergraduate: locate(estimate.undergraduate) };
}
