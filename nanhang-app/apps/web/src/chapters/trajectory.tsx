import type { ExamRecord } from "../model.js";
import { buildTrajectory, spanReading } from "../exam-trajectory.js";

/**
 * 逐次读数卡：每次考试的总分、与两条线的关系、以及相对上一次的变化。
 *
 * 说明（2026-09-20 的取舍）：这里**只有读数卡**，没有折线图。原因是我先做过一版折线图，
 * 但负责人指出「这两个不用起来吗」——要求复用荣县一中那条路**本来就有**的
 * 「航迹：历次总分与切线」（柱顶标总分、两条虚线按各场考试自己的划线分段画）。
 * 于是图统一走 `chapters/trail.tsx` 的共用组件（两条路同一套渲染），
 * 这里只保留图上放不下的逐次读数，避免同一页出现两张讲同一件事的图。
 *
 * 读数卡只做减法与差值：缺线就写「未填」，手填拿不到的单科、年级/班级均分不在这里补造。
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
    {geometry.span !== null ? <p className="traj-note">{spanReading(geometry.span)}</p> : null}
  </div>;
}
