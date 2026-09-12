import type { Dispatch, SetStateAction } from "react";
import {
  classChanges, formatGap, formatRate, formatScore, friendlyExamLabel, latestExam,
  subjectDistances, trailChart, weakestKnowledge
} from "../quality-huixi.js";
import { Provenance } from "../theme.js";
import { Icon } from "../art.js";
import { type PageId, type QualityState } from "./shared.js";

export interface QualityProps {
  page: PageId;
  quality: QualityState;
  qualityCode: string;
  setQualityCode: Dispatch<SetStateAction<string>>;
  schoolName: string;
  setSchoolName: Dispatch<SetStateAction<string>>;
  identifySchool: () => Promise<void>;
  setPage: Dispatch<SetStateAction<PageId>>;
  /** 显式跳过学校识别（通用模式）——门禁据此把「成绩」记为已完成。 */
  skipSchool: () => void;
}

export function renderQuality({ page, quality, qualityCode, setQualityCode, schoolName, setSchoolName,
  identifySchool, setPage, skipSchool }: QualityProps) {
  const exam = quality.shard ? latestExam(quality.shard) : null;
  const distances = exam ? subjectDistances(exam) : [];
  const gaps = quality.shard ? weakestKnowledge(quality.shard, 6) : [];
  const moves = quality.shard ? classChanges(quality.shard) : [];
  const index = quality.index;
  const examRow = index && exam
    ? index.exams.find((row) => row.exam_code === exam.exam && row.track === quality.shard?.person.track) ?? null
    : null;
  const examTrend = index?.trend ?? [];
  const lastTrend = examTrend[examTrend.length - 1] ?? null;
  const prevTrend = examTrend[examTrend.length - 2] ?? null;
  const examName = (raw: string) => friendlyExamLabel(raw);
  return <section id="page-quality" className={`view${page === "quality" ? " active" : ""}`} aria-label="成绩">
    <div className="page-head">
      <div><span className="eyebrow">Chapter 03 · 成绩 · 录航迹</span>
        <h1 className="song">先看清成绩，<em>再谈方向。</em></h1>
        <p className="lede">这一页读取学校质量复盘的真实成绩：最近考试、校内位置、距线差与知识短板。它只描述已经发生的事，不预测录取。</p></div>
      <div className="head-aside">
        <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
        <p>成绩是「现在在哪」，<br />方向是「想去哪」。<br />两件事分开看，先看前者。</p></div>
    </div>

    {quality.status !== "ready" && <div className="panel">
      <h3><Icon name="shield" />荣县一中增强模式</h3>
      <p className="psub">输入姓名和班主任发放的 6 位验证码，服务端核对后取回你本人的成绩分片：最近考试、班级与年级位置、知识短板自动带入。不显示任何同学的成绩；识别后探索区间也会按你的考试自动推导。</p>
      <div className="grid-2" style={{ marginTop: 16, gap: 14, maxWidth: 460 }}>
        <label className="field"><span className="flab">学生姓名</span>
          <input className="inp" type="text" autoComplete="off" maxLength={40}
            value={schoolName}
            placeholder="和验证码一起由班主任发放"
            onChange={(event) => setSchoolName(event.target.value)} /></label>
        <label className="field"><span className="flab">6 位验证码</span>
          <input className="inp" type="text" inputMode="numeric" autoComplete="off" maxLength={6}
            value={qualityCode}
            placeholder="例如 246810"
            aria-describedby="quality-hint"
            onChange={(event) => setQualityCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(event) => { if (event.key === "Enter") void identifySchool(); }} /></label>
      </div>
      <div className="hero-act" style={{ marginTop: 16 }}>
        <button type="button" className="btn brass" disabled={quality.status === "loading" || quality.attempts.blocked}
          onClick={() => void identifySchool()}>
          {quality.status === "loading" ? "正在核对…" : "识别并接入"}<Icon name="arrow" />
        </button>
        <button type="button" className="tbtn"
          onClick={() => { skipSchool(); setPage("locate"); }}>先用通用模式</button>
      </div>
      <p className="fhint" id="quality-hint">{quality.message
        ?? "姓名和验证码只发送给成绩服务核对（有尝试次数限制），不进入对话，也不发给 AI。"}</p>
      <p className="fhint">说明：识别由服务端完成核对与限流；连错多次会暂停本页重试，请向班主任核对后再刷新。这里也再声明一次——本页不会因为成绩好就给出「你能上什么学校」的结论。</p>
    </div>}

    {quality.status === "ready" && quality.shard && exam && <div className="panel">
      <h3><Icon name="layers" />{quality.shard.person.name} · {quality.shard.person.classLabel}</h3>
      <p className="psub">{quality.shard.person.track} · {quality.shard.person.combination} · 共 {quality.shard.exams.length} 次考试记录。</p>
      <div className="stats" style={{ marginTop: 18 }}>
        <div className="stat"><span className="sk"><Icon name="pin" />最近考试</span>
          <div className="sv num">{examName(exam.exam)}</div>
          <div className="sd">考试代码 {exam.exam}</div></div>
        <div className="stat"><span className="sk"><Icon name="axis" />赋分总分</span>
          <div className="sv num">{formatScore(exam.total)}</div>
          <div className="sd">本科线 {formatScore(exam.undergraduateTotal)} · 距线 {formatGap(exam.undergraduateDiff)}</div></div>
        <div className="stat"><span className="sk"><Icon name="layers" />校内位置</span>
          <div className="sv num">{exam.gradeRank ?? "—"}<small> / {exam.gradeSize ?? "—"}</small></div>
          <div className="sd">班级 {exam.classRank ?? "—"} / {exam.classSize ?? "—"} · 一本线 {formatScore(exam.topTotal)}</div></div>
        <div className="stat"><span className="sk"><Icon name="wave" />距一本线</span>
          <div className="sv num">{formatGap(exam.topDiff)}</div>
          <div className="sd">一本线 {formatScore(exam.topTotal)}；负数表示还差多少分</div></div>
      </div>
      {examRow && <p className="fhint" style={{ marginTop: 14 }}>
        {examName(exam.exam)} 本校 {exam.track} 共 {examRow.students} 人参考；一本上线 {examRow.top_count ?? "—"} 人（{formatRate(examRow.top_rate)}），
        本科上线 {examRow.undergraduate_count ?? "—"} 人（{formatRate(examRow.undergraduate_rate)}）。
        {exam.trackDiffersFromHome && `该场考试按${exam.track}统计（你平时在${quality.shard?.person.track}），位次、分数线与班级均分都取自这一场自己的口径。`}
      </p>}
      {lastTrend && <p className="fhint" style={{ marginTop: 6 }}>年级参考：{examName(lastTrend.exam_code)}全年级 {lastTrend.students} 人参考，
        均分 {formatScore(lastTrend.average)}，一本上线 {lastTrend.top_count ?? "—"} 人{prevTrend
          ? `；上次（${examName(prevTrend.exam_code)}）均分 ${formatScore(prevTrend.average)}` : ""}。</p>}
    </div>}

    {quality.status === "ready" && quality.shard && <div className="panel">
      <h3><Icon name="axis" />最近一次考试的逐科位置</h3>
      <p className="psub">每一科都给出「本人分数 / 本科线 / 距线差」和与年级、班级均分的差。缺失或异常单元格显示为「—」，不按 0 分计算。</p>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">科目</th><th scope="col">分数</th><th scope="col">本科线</th><th scope="col">距本科线</th>
            <th scope="col">一本线</th><th scope="col">距一本线</th><th scope="col">年级均分差</th><th scope="col">班级均分差</th></tr></thead>
          <tbody>
            {distances.map((row) => <tr key={row.subject}>
              <th scope="row">{row.subject}</th>
              <td className="num">{row.value === null ? "—" : formatScore(row.value)}</td>
              <td className="num">{formatScore(row.undergraduateLine)}</td>
              <td className="num">{formatGap(row.undergraduateGap)}</td>
              <td className="num">{formatScore(row.topLine)}</td>
              <td className="num">{formatGap(row.topGap)}</td>
              <td className="num">{formatGap(row.gradeGap)}</td>
              <td className="num">{formatGap(row.classGap)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <p className="fhint">语数外与物理/历史为原分，化学/生物/政治/地理为赋分。距线差为负数表示还差多少分。</p>
    </div>}

    {quality.status === "ready" && quality.shard && quality.shard.exams.length > 1 && <div className="panel">
      <h3><Icon name="route" />航迹：历次总分与切线</h3>
      <p className="psub">柱子画在统一分数标尺上，越高分越高；两条虚线是最近一次考试的本科线与特控线（一本线），柱子到虚线的落差就是当次距线差。</p>
      {(() => {
        const chart = trailChart(quality.shard.exams);
        if (!chart) return <div className="empty-inline">暂无可绘制的总分记录。</div>;
        return <svg viewBox={`0 0 ${chart.width} ${chart.height}`} width="100%" role="img"
          aria-label="历次考试总分轨迹，含最近一次考试的本科线与特控线参考线" style={{ display: "block", maxWidth: 560 }}>
          <line x1={6} y1={chart.baseline} x2={chart.width - 6} y2={chart.baseline} stroke="#dcd6c6" strokeWidth={1} />
          {chart.lines.map((line) => <g key={line.kind}>
            <line x1={6} y1={line.y} x2={chart.width - 6} y2={line.y}
              stroke={line.kind === "top" ? "#a97b34" : "#7d9a86"} strokeWidth={1.2} strokeDasharray="6 4" />
            <text x={chart.width - 8} y={line.y - 4} textAnchor="end" fontSize="10"
              fill={line.kind === "top" ? "#a97b34" : "#7d9a86"}>{line.label}</text>
          </g>)}
          {chart.bars.map((bar) => <g key={bar.key}>
            {bar.total !== null
              ? <rect x={bar.x} y={bar.y} width={bar.w} height={Math.max(2, bar.h)} rx={3} fill="#12454f" opacity={0.88}>
                <title>{`${bar.full}：${formatScore(bar.total)} 分`}</title>
              </rect>
              : <line className="trail-gap" x1={bar.x + bar.w / 2} y1={chart.baseline - 10} x2={bar.x + bar.w / 2} y2={chart.baseline}
                stroke="#cbc4b0" strokeWidth={2} strokeDasharray="2 2">
                <title>{`${bar.full}：缺考/无来源总分，留空不补零`}</title>
              </line>}
            <text x={bar.x + bar.w / 2} y={chart.height - 8} textAnchor="middle" fontSize="9" fill="#6d7f83">{bar.short}</text>
          </g>)}
        </svg>;
      })()}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">考试</th><th scope="col">总分</th><th scope="col">一本线</th><th scope="col">距一本</th>
            <th scope="col">本科线</th><th scope="col">距本科</th><th scope="col">校内位次</th><th scope="col">考试人数</th></tr></thead>
          <tbody>
            {quality.shard.exams.map((row) => <tr key={row.exam}>
              <th scope="row">{friendlyExamLabel(row.exam)}{row.trackDiffersFromHome ? `（按${row.track}）` : ""}</th>
              <td className="num">{formatScore(row.total)}</td>
              <td className="num">{formatScore(row.topTotal)}</td>
              <td className="num">{formatGap(row.topDiff)}</td>
              <td className="num">{formatScore(row.undergraduateTotal)}</td>
              <td className="num">{formatGap(row.undergraduateDiff)}</td>
              <td className="num">{row.gradeRank ?? "—"}</td>
              <td className="num">{row.gradeSize ?? "—"}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {moves.length > 0 && <p className="fhint">注意：你的班号在 {moves.map((row) => friendlyExamLabel(row.exam)).join("、")} 发生变化，页面按各次考试的原始班号统计，班级均分差也随之切换。</p>}
      <Provenance icon="log">
        总分与两条切线来自学校质量复盘的原始记录；柱子画在统一分数标尺上，缺考场次留空，不补成 0 分，也不与其它场次拉平比较。
      </Provenance>
      <p className="fhint">考试代码说明：一册～四册＝第1～4学期期末；「XY」＝第X学期第Y次月考（如 21 为第2学期第1次月考、51 为第5学期第1次月考）；4半＝第4学期半期。</p>
    </div>}

    {quality.status === "ready" && gaps.length > 0 && <div className="panel">
      <h3><Icon name="layers" />知识点：最该先补的几块</h3>
      <p className="psub">按本人得分率从低到高排列，同时给出年级同知识点的得分率。得分率为 0 说明该题没拿到分，不代表这一块完全不会。</p>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">学科</th><th scope="col">知识点</th><th scope="col">本人得分率</th>
            <th scope="col">年级得分率</th><th scope="col">与年级差</th><th scope="col">考试</th></tr></thead>
          <tbody>
            {gaps.map((row) => <tr key={`${row.exam}-${row.subject}-${row.knowledge}`}>
              <th scope="row">{row.subject}</th>
              <td>{row.knowledge}</td>
              <td className="num">{formatRate(row.rate)}</td>
              <td className="num">{formatRate(row.gradeRate)}</td>
              <td className="num">{row.gradeRate === null ? "—" : formatGap((row.rate - row.gradeRate) * 100)} 个百分点</td>
              <td>{friendlyExamLabel(row.exam)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <p className="fhint">只统计有来源满分且本人有作答的小题；缺少分值的题不参与得分率计算，也不会被补成满分。</p>
    </div>}

    {quality.status === "ready" && <div className="banner">
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}><Icon name="compass" size="lg" />
        <div><h3 className="song">成绩已接入，探索区间也推导好了</h3><p>到「定位」确认这段区间（可手动微调），然后去「分数轴」匹配这段区间里你可以选的院校与专业。</p></div></div>
      <button type="button" className="btn sm" style={{ flexShrink: 0 }} onClick={() => setPage("locate")}>去定位看区间<Icon name="arrow" /></button>
    </div>}
  </section>;
}
