import type { ExamRecord } from "../model.js";
import { buildTrajectory, scorePercent, spanReading, type TrajectoryGeometry } from "../exam-trajectory.js";

/**
 * 成绩轨迹图：总分折线 + 每场考试自己的特控线 / 本科线。
 *
 * 只画真实存在的三样（手填的考试就只有这三样）：总分、特控线、本科线。
 * 单科分数、年级均分、班级均分手填拿不到，所以图上不出现它们的任何替代物——
 * 真要那类明细，走荣县一中接入那条路（`schoolLocked` 那块逐科位置表）。
 *
 * 参考线按**每场考试自己的切线**画：切线随考试难度浮动，把五场拉到同一对线上读会读错，
 * 所以每场只连自己那一段（虚线），不做跨场平均。
 */
const W = 320;
const H = 132;
const PAD = { top: 14, right: 10, bottom: 24, left: 26 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function xAt(index: number, count: number): number {
  if (count <= 1) return PAD.left + PLOT_W / 2;
  return PAD.left + (PLOT_W * index) / (count - 1);
}

function yAt(value: number, geometry: TrajectoryGeometry): number {
  return PAD.top + PLOT_H * (1 - scorePercent(value, geometry) / 100);
}

/** 折线路径：不足两点时不画（一个点连不出趋势，也不该假装有）。 */
function linePath(geometry: TrajectoryGeometry, pick: (index: number) => number | null): string {
  const segments: string[] = [];
  let open = false;
  geometry.points.forEach((point, index) => {
    const value = pick(index);
    if (value === null) { open = false; return; }
    const command = open ? "L" : "M";
    segments.push(`${command}${xAt(index, geometry.count).toFixed(1)} ${yAt(value, geometry).toFixed(1)}`);
    open = true;
  });
  return segments.join(" ");
}

export function ExamTrajectoryChart({ exams, title = "成绩轨迹 · 总分与两条线" }: {
  readonly exams: readonly ExamRecord[];
  readonly title?: string;
}) {
  const geometry = buildTrajectory(exams);
  if (geometry.count === 0) {
    return <p className="muted-note">还没有可画的总分：录入至少一次考试的总分，这里会出现轨迹。</p>;
  }

  const totalPath = linePath(geometry, (index) => geometry.points[index]!.total);
  const topPath = linePath(geometry, (index) => geometry.points[index]!.topLine);
  const undergraduatePath = linePath(geometry, (index) => geometry.points[index]!.undergraduateLine);

  return <figure className="traj">
    <figcaption className="traj-cap">
      <span className="eyebrow plain">{title}</span>
      <span className="traj-legend">
        <i className="lg own" />总分
        <i className="lg top" />特控线
        <i className="lg under" />本科线
      </span>
    </figcaption>
    <svg className="traj-svg" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`成绩轨迹：${geometry.count} 次考试的总分，以及每次考试自己的特控线与本科线`}>
      {/* 图框与刻度：分数轴端点标出来，读得出区间落在哪一段 */}
      <g className="traj-axis">
        <line x1={PAD.left} y1={PAD.top + PLOT_H} x2={PAD.left + PLOT_W} y2={PAD.top + PLOT_H} />
        <text x={PAD.left - 5} y={PAD.top + 4} textAnchor="end">{geometry.max}</text>
        <text x={PAD.left - 5} y={PAD.top + PLOT_H} textAnchor="end">{geometry.min}</text>
      </g>

      {/* 每场考试自己的两条切线：只在有该线的那一段连起来，缺线就断开 */}
      {geometry.points.some((point) => point.topLine !== null)
        ? <path className="traj-line top" d={topPath} /> : null}
      {geometry.points.some((point) => point.undergraduateLine !== null)
        ? <path className="traj-line under" d={undergraduatePath} /> : null}

      {/* 总分：折线 + 落点。只看总分线也能读出起伏 */}
      <path className="traj-line own" d={totalPath} />
      {geometry.points.map((point, index) => <g key={point.label + index}>
        {/* 该场两条线各自的刻度点（短线，避免与总分点混淆） */}
        {point.topLine !== null
          ? <circle className="traj-dot top" cx={xAt(index, geometry.count)} cy={yAt(point.topLine, geometry)} r={2.2} /> : null}
        {point.undergraduateLine !== null
          ? <circle className="traj-dot under" cx={xAt(index, geometry.count)} cy={yAt(point.undergraduateLine, geometry)} r={2.2} /> : null}
        <circle className="traj-dot own" cx={xAt(index, geometry.count)} cy={yAt(point.total, geometry)} r={3.4}>
          <title>{`${point.label}：总分 ${point.total}${point.topGap === null ? "" : `，距特控线 ${point.topGap > 0 ? "+" : ""}${point.topGap}`}${point.undergraduateGap === null ? "" : `，距本科线 ${point.undergraduateGap > 0 ? "+" : ""}${point.undergraduateGap}`}`}</title>
        </circle>
        <text className="traj-x" x={xAt(index, geometry.count)} y={H - 8} textAnchor="middle">{index + 1}</text>
      </g>)}
    </svg>
    <p className="traj-note">{spanReading(geometry.span)}</p>
  </figure>;
}

/**
 * 每次考试的读数卡：总分、与两条线的关系、以及这一场相对上一场的变化。
 * 「未提供」是给手填路线的诚实措辞：单科与年级/班级均分不在这里编。
 */
export function ExamReadingCards({ exams }: { readonly exams: readonly ExamRecord[] }) {
  const geometry = buildTrajectory(exams);
  if (geometry.count === 0) return null;
  return <div className="traj-readings">
    {geometry.points.map((point, index) => {
      const previous = index > 0 ? geometry.points[index - 1]!.total : null;
      const delta = previous === null ? null : Math.round((point.total - previous) * 10) / 10;
      return <div className="traj-card" key={point.label + index}>
        <span className="traj-card-tag">{point.label}</span>
        <span className="traj-card-score num">{point.total}<small>分</small></span>
        <span className="traj-card-deltas">
          {point.topGap === null
            ? <em className="absent">未填特控线</em>
            : <b className={point.topGap >= 0 ? "up" : "down"}>距特控线 {point.topGap >= 0 ? "+" : ""}{point.topGap}</b>}
          {point.undergraduateGap === null
            ? <em className="absent">未填本科线</em>
            : <b className={point.undergraduateGap >= 0 ? "up" : "down"}>距本科线 {point.undergraduateGap >= 0 ? "+" : ""}{point.undergraduateGap}</b>}
        </span>
        <span className="traj-card-vs">{delta === null ? "首次录入" : `较上次 ${delta >= 0 ? "+" : ""}${delta} 分`}</span>
      </div>;
    })}
  </div>;
}
