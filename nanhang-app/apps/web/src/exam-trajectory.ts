import type { ExamRecord } from "./model.js";

/**
 * 成绩轨迹图的几何（纯函数，不碰 DOM）。
 *
 * 手填的考试只有三格：总分、特控线（部分学校称一本线）、本科线。所以这张图**只画真实存在的三样**：
 * 总分折线、每场考试自己的特控线与本科线、以及总分与这两条线的距离。
 * 单科、年级均分、班级均分手填拿不到，界面显示「未提供」，不推算、不补造。
 *
 * 「按每场考试自己的切线」是刻意的：切线随考试难度浮动，把五场考试拉到同一对线上读，
 * 早期考试的距线差会被读错——这一点在纯函数层就固定住（每场各自算自己的差）。
 */
export interface TrajectoryPoint {
  readonly index: number;
  readonly label: string;
  readonly total: number;
  /** 该场的特控线 / 本科线；没填就是 null（不参与画线，也不参与比较）。 */
  readonly topLine: number | null;
  readonly undergraduateLine: number | null;
  /** 总分与该场特控线 / 本科线的差；负数表示还差多少分。缺线时为 null。 */
  readonly topGap: number | null;
  readonly undergraduateGap: number | null;
}

export interface TrajectoryGeometry {
  readonly points: readonly TrajectoryPoint[];
  /** 有总分的场次数（少于 2 时界面不给趋势结论）。 */
  readonly count: number;
  /** 分数轴范围（含参考线），用于把分数映射到 0–100 的百分比。 */
  readonly min: number;
  readonly max: number;
  /** 最近一次相对上一次的总分变化；不足两场时为 null。 */
  readonly lastDelta: number | null;
  /** 总分跨度（最高−最低）；不足两场时为 null。 */
  readonly span: number | null;
  /** 有切线的场次里，几次在特控线以上 / 本科线以上。 */
  readonly aboveTop: number;
  readonly aboveUndergraduate: number;
  /** 有效切线场次数（用来判断"几次在线上"这类结论能不能给）。 */
  readonly withLines: number;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/** 把分数映射到 0–100（图里统一用百分比定位，SVG 只管画）。 */
export function scorePercent(value: number, geometry: Pick<TrajectoryGeometry, "min" | "max">): number {
  const span = geometry.max - geometry.min;
  if (span <= 0) return 50;
  return Math.max(0, Math.min(100, ((value - geometry.min) / span) * 100));
}

/**
 * 由考试记录算轨迹几何。
 *
 * @param exams 手填考试（顺序即录入顺序）
 * @param options `padRatio` 上下留白比例，避免折线贴着图框
 */
export function buildTrajectory(
  exams: readonly ExamRecord[],
  options: { readonly padRatio?: number } = {}
): TrajectoryGeometry {
  const usable = exams.filter((exam): exam is ExamRecord & { total: number } =>
    typeof exam.total === "number" && Number.isFinite(exam.total));
  const points: TrajectoryPoint[] = usable.map((exam, index) => {
    const topLine = typeof exam.topTotal === "number" && Number.isFinite(exam.topTotal) ? exam.topTotal : null;
    const undergraduateLine = typeof exam.undergraduateTotal === "number" && Number.isFinite(exam.undergraduateTotal)
      ? exam.undergraduateTotal : null;
    return {
      index,
      label: exam.label?.trim() || `第 ${index + 1} 次`,
      total: exam.total,
      topLine,
      undergraduateLine,
      topGap: topLine === null ? null : round1(exam.total - topLine),
      undergraduateGap: undergraduateLine === null ? null : round1(exam.total - undergraduateLine)
    };
  });

  const candidates = points.flatMap((point) => [point.total, point.topLine, point.undergraduateLine])
    .filter((value): value is number => value !== null);
  const rawMin = candidates.length ? Math.min(...candidates) : 0;
  const rawMax = candidates.length ? Math.max(...candidates) : 1;
  const pad = Math.max(6, (rawMax - rawMin) * (options.padRatio ?? 0.12));

  const totals = points.map((point) => point.total);
  const withLines = points.filter((point) => point.topGap !== null || point.undergraduateGap !== null).length;
  return {
    points,
    count: points.length,
    min: Math.floor(rawMin - pad),
    max: Math.ceil(rawMax + pad),
    lastDelta: totals.length >= 2 ? round1(totals[totals.length - 1]! - totals[totals.length - 2]!) : null,
    span: totals.length >= 2 ? round1(Math.max(...totals) - Math.min(...totals)) : null,
    aboveTop: points.filter((point) => point.topGap !== null && point.topGap >= 0).length,
    aboveUndergraduate: points.filter((point) => point.undergraduateGap !== null && point.undergraduateGap >= 0).length,
    withLines
  };
}

/**
 * 稳定性解读：只用总分跨度给一句实话，不给"能不能上"的判断。
 * 阈值取整数档，方便向学生解释；跨度越小说明当前定位越可信。
 */
export function spanReading(span: number | null): string {
  if (span === null) return "录入两次以上考试后，这里会说明起伏大小。";
  if (span <= 10) return `五次里最高与最低只差 ${span} 分，起伏很小，当前定位比较可信。`;
  if (span <= 25) return `五次里最高与最低差 ${span} 分，属于常见波动，我们仍用区间而不是单点来表达。`;
  return `五次里最高与最低差 ${span} 分，起伏偏大；这时候区间比单点更能反映你的位置。`;
}
