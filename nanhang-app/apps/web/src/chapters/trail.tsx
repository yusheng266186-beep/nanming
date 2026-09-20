import { formatGap, formatScore, friendlyExamLabel, trailChart } from "../quality-huixi.js";
import type { QualityStudentExam } from "../quality-types.js";

/**
 * 航迹：历次总分与切线。**两路共用同一套渲染**——荣县一中接入那条路，与手填五次考试那条路。
 *
 * 为什么抽出来：负责人 2026-09-20 明确要求手填那条路「生成和接入荣县一中成绩一样的显示效果」，
 * 也就是复用既有这张图，而不是另做一套像它的东西。同一份 JSX、同一套样式，两条路看到的图完全一样；
 * 差别只在**数据有没有**：位次、考试人数、逐科分数只有学校的成绩库有，手填那路显示「—」。
 *
 * 图在讲什么（与荣县一中那页的说明逐字一致）：柱子画在统一分数标尺上，柱顶标着当次总分；
 * 两条虚线按**每一场考试自己的划线**分段画——各场划线深浅不一样，不能共用一条线；
 * 柱子到虚线的落差就是当次距线差。缺总分的场次画成短虚线，留空不补零。
 */
const SONG_FAMILY = "'Noto Serif SC','Songti SC','STSong','SimSun',serif";

export function ExamTrailChart({ exams, maxWidth = 560, ariaLabel }: {
  readonly exams: readonly QualityStudentExam[];
  readonly maxWidth?: number;
  readonly ariaLabel?: string;
}) {
  // 只画最近 6 次：更早的考试量纲可能不同（如入学入口考），会把标尺撑宽、压扁近期的高低差。
  const chart = trailChart(exams.slice(-6) as QualityStudentExam[]);
  if (!chart) return <div className="empty-inline">暂无可绘制的总分记录。</div>;
  return <svg viewBox={`0 0 ${chart.width} ${chart.height}`} width="100%" role="img"
    aria-label={ariaLabel ?? "历次考试总分轨迹：柱顶是当次总分，两条虚线按各场考试自己的划线分段画"}
    style={{ display: "block", maxWidth }}>
    {chart.grid.map((tick) => <g key={`grid-${tick.value}`}>
      <line x1={chart.padLeft} y1={tick.y} x2={chart.width - 6} y2={tick.y} stroke="#ece5d4" strokeWidth={1} />
      <text x={chart.padLeft - 4} y={tick.y + 3} textAnchor="end" fontSize="8" fontFamily={SONG_FAMILY} fill="#a89f88">{tick.value}</text>
    </g>)}
    <line x1={chart.padLeft} y1={chart.baseline} x2={chart.width - 6} y2={chart.baseline} stroke="#dcd6c6" strokeWidth={1} />
    {chart.lines.map((line, index) => <g key={`${line.kind}-${index}`}>
      <line x1={line.x1} y1={line.y} x2={line.x2} y2={line.y}
        stroke={line.kind === "top" ? "#a97b34" : "#7d9a86"} strokeWidth={1.2} strokeDasharray="5 3" />
      {line.label ? <text x={chart.width - 6} y={line.labelY} textAnchor="end" fontSize="9" fontFamily={SONG_FAMILY}
        fill={line.kind === "top" ? "#a97b34" : "#7d9a86"}>{line.label}</text> : null}
    </g>)}
    {chart.bars.map((bar) => <g key={bar.key}>
      {bar.total !== null
        ? <>
          <rect x={bar.x} y={bar.y} width={bar.w} height={Math.max(2, bar.h)} rx={3} fill="#12454f" opacity={0.88}>
            <title>{`${bar.full}：${formatScore(bar.total)} 分`}</title>
          </rect>
          <text x={bar.x + bar.w / 2} textAnchor="middle" fontSize="8.5" fontFamily={SONG_FAMILY} fontWeight={600}
            fill={bar.h >= 14 ? "#f4efe2" : "#12454f"} y={bar.h >= 14 ? bar.y + 12 : bar.y - 4}>
            {Math.round(bar.total)}</text>
        </>
        : <line className="trail-gap" x1={bar.x + bar.w / 2} y1={chart.baseline - 10} x2={bar.x + bar.w / 2} y2={chart.baseline}
          stroke="#cbc4b0" strokeWidth={2} strokeDasharray="2 2">
          <title>{`${bar.full}：缺考/无来源总分，留空不补零`}</title>
        </line>}
      <text x={bar.x + bar.w / 2} y={chart.height - 8} textAnchor="middle" fontSize="9" fontFamily={SONG_FAMILY} fill="#6d7f83">{bar.short}</text>
    </g>)}
  </svg>;
}

/**
 * 历次成绩表。与图同一份口径：总分、两条线、距线差；位次那两列只有学校数据有，
 * 手填时整列不出现（不是显示一排「—」，而是干脆不占位置——负责人 2026-09-20：那一段空白太多）。
 */
export function ExamTrailTable({ exams, withRanks }: {
  readonly exams: readonly QualityStudentExam[];
  readonly withRanks: boolean;
}) {
  if (exams.length === 0) return null;
  return <div className="table-wrap">
    <table className="table">
      <thead><tr>
        <th scope="col">考试</th><th scope="col">总分</th><th scope="col">一本线</th><th scope="col">距一本</th>
        <th scope="col">本科线</th><th scope="col">距本科</th>
        {withRanks ? <><th scope="col">校内位次</th><th scope="col">考试人数</th></> : null}
      </tr></thead>
      <tbody>
        {exams.map((row) => <tr key={row.exam}>
          <th scope="row">{friendlyExamLabel(row.exam)}{row.trackDiffersFromHome ? `（按${row.track}）` : ""}</th>
          <td className="num">{formatScore(row.total)}</td>
          <td className="num">{formatScore(row.topTotal)}</td>
          <td className="num">{formatGap(row.topDiff)}</td>
          <td className="num">{formatScore(row.undergraduateTotal)}</td>
          <td className="num">{formatGap(row.undergraduateDiff)}</td>
          {withRanks ? <>
            <td className="num">{row.gradeRank ?? "—"}</td>
            <td className="num">{row.gradeSize ?? "—"}</td>
          </> : null}
        </tr>)}
      </tbody>
    </table>
  </div>;
}
