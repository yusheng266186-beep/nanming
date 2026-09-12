import type { Dispatch, SetStateAction } from "react";
import {
  QUALITY_BASE, classChanges, formatGap, formatRate, formatScore, latestExam, subjectDistances,
  trailHeights, weakestKnowledge
} from "../quality-huixi.js";
import { Provenance } from "../theme.js";
import { Icon } from "../art.js";
import { label, type PageId, type QualityState } from "./shared.js";

export interface QualityProps {
  page: PageId;
  quality: QualityState;
  qualityCode: string;
  setQualityCode: Dispatch<SetStateAction<string>>;
  verifyQualityCode: () => Promise<void>;
  setPage: Dispatch<SetStateAction<PageId>>;
}

export function renderQuality({ page, quality, qualityCode, setQualityCode, verifyQualityCode, setPage }: QualityProps) {
  const exam = quality.shard ? latestExam(quality.shard) : null;
  const distances = exam ? subjectDistances(exam) : [];
  const gaps = quality.shard ? weakestKnowledge(quality.shard, 6) : [];
  const moves = quality.shard ? classChanges(quality.shard) : [];
  const index = quality.index;
  const examRow = index && exam
    ? index.exams.find((row) => row.exam_code === exam.exam && row.track === quality.shard?.person.track) ?? null
    : null;
  const examClasses = index && exam ? index.classes.filter((row) => row.exam_code === exam.exam) : [];
  const examInsights = index && exam ? index.insights.filter((row) => row.exam_code === exam.exam) : [];
  const examSegments = index && exam ? index.segments.filter((row) => row.exam_code === exam.exam) : [];
  const examTrend = index?.trend ?? [];
  return <section id="page-quality" className={`view${page === "quality" ? " active" : ""}`} aria-label="成绩">
    <div className="page-head">
      <div><span className="eyebrow">Chapter 03 · 成绩 · 录航迹</span>
        <h1 className="song">先看清成绩，<em>再谈方向。</em></h1>
        <p className="lede">这一页读取学校质量复盘的真实成绩：最近考试、年级与班级位置、距线差与知识点。它只描述已经发生的事，不预测录取。</p></div>
      <div className="head-aside">
        <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
        <p>成绩是「现在在哪」，<br />方向是「想去哪」。<br />两件事分开看，先看前者。</p></div>
    </div>

    {quality.status !== "ready" && <div className="panel">
      <h3><Icon name="shield" />荣县一中增强模式</h3>
      <p className="psub">输入班主任发放的 6 位验证码。系统按验证码取回你本人的成绩分片，不搜索姓名、不显示同学成绩。没有验证码时，本页以外的全部功能照常可用。</p>
      <label className="field" style={{ maxWidth: 280, marginTop: 16 }}>
        <span className="flab">6 位验证码</span>
        <input className="inp" type="text" inputMode="numeric" autoComplete="off" maxLength={6}
          value={qualityCode}
          placeholder="例如 246810"
          aria-describedby="quality-hint"
          onChange={(event) => setQualityCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(event) => { if (event.key === "Enter") void verifyQualityCode(); }} />
      </label>
      <div className="hero-act" style={{ marginTop: 16 }}>
        <button type="button" className="btn brass" disabled={quality.status === "loading" || quality.attempts.blocked}
          onClick={() => void verifyQualityCode()}>
          {quality.status === "loading" ? "正在核对…" : "验证并接入"}<Icon name="arrow" />
        </button>
        <button type="button" className="tbtn" onClick={() => setPage("locate")}>先用通用模式</button>
      </div>
      <p className="fhint" id="quality-hint">{quality.message
        ?? `验证码只用于定位你本人的成绩文件；本机演示数据来自 ${QUALITY_BASE}。`}</p>
      <p className="fhint">说明：6 位数字在离线产物上可被穷举，因此增强模式当前只用于校内/本机演示；正式上线必须改为服务器校验并加限流。这里也再声明一次——本页不会因为成绩好就给出「你能上什么学校」的结论。</p>
    </div>}

    {quality.status === "ready" && quality.shard && exam && <div className="panel">
      <h3><Icon name="layers" />{quality.shard.person.name} · {quality.shard.person.classLabel}</h3>
      <p className="psub">{quality.shard.person.track} · {quality.shard.person.combination} · 共 {quality.shard.exams.length} 次考试记录。</p>
      <Provenance icon="log">
        数据来自质量慧析对学校复盘工作簿的解析，固定版本 <b>{index?.parserCommit.slice(0, 7) ?? "—"}</b>；
        本页只描述已经发生的考试，不预测录取。
      </Provenance>
      <div className="stats" style={{ marginTop: 18 }}>
        <div className="stat"><span className="sk"><Icon name="pin" />最近考试</span>
          <div className="sv num">{exam.exam}</div>
          <div className="sd">{exam.rawLabel}</div></div>
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
        {exam.exam} 本校 {exam.track} 共 {examRow.students} 人参考；一本上线 {examRow.top_count ?? "—"} 人（{formatRate(examRow.top_rate)}），
        本科上线 {examRow.undergraduate_count ?? "—"} 人（{formatRate(examRow.undergraduate_rate)}）。
        {exam.trackDiffersFromHome && `该场考试按${exam.track}统计（你平时在${quality.shard?.person.track}），位次、分数线与班级均分都取自这一场自己的口径。`}
      </p>}
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
      <h3><Icon name="route" />航迹：历次总分与距线变化</h3>
      <p className="psub">只列你自己考过的场次。平均分随考试难度变化，因此不把「分数变化」写成教学增值。</p>
      {/* 航迹：把同一批数字先画成一条看得见的轨迹，下面是逐场明细。
          柱高按各自场次的总分画，缺考的场次留空，不补零。 */}
      <div className="trend" role="img" aria-label="历次考试总分轨迹">
        {(() => {
          const heights = trailHeights(quality.shard!.exams.map((item) => item.total));
          return quality.shard!.exams.map((row, position) => {
            const height = heights[position] ?? null;
            return <div className="tbar" key={`trail-${row.exam}`}
              title={`${row.exam}：${row.total === null ? "缺考/无来源" : `${formatScore(row.total)} 分`}`}>
              {height === null
                ? <span className="trail-gap" aria-hidden="true" />
                : <span className="col" style={{ height: `${height}%` }} />}
              <span className="tl">{row.rawLabel ?? row.exam}</span>
            </div>;
          });
        })()}
      </div>
      <Provenance icon="log">
        柱高按各场次自己的总分画，缺考或没有来源总分的场次留空——不补成 0 分，也不与其它场次拉平比较。
      </Provenance>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">考试</th><th scope="col">总分</th><th scope="col">一本线</th><th scope="col">距一本</th>
            <th scope="col">本科线</th><th scope="col">距本科</th><th scope="col">校内位次</th><th scope="col">考试人数</th></tr></thead>
          <tbody>
            {quality.shard.exams.map((row) => <tr key={row.exam}>
              <th scope="row">{row.exam}{row.trackDiffersFromHome ? `（按${row.track}）` : ""}</th>
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
      {moves.length > 0 && <p className="fhint">注意：你的班号在 {moves.map((row) => row.exam).join("、")} 发生变化，页面按各次考试的原始班号统计，班级均分差也随之切换。</p>}
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
              <td>{row.exam}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <p className="fhint">只统计有来源满分且本人有作答的小题；缺少分值的题不参与得分率计算，也不会被补成满分。</p>
    </div>}

    {quality.status === "ready" && index && <div className="panel">
      <h3><Icon name="compass" />年级与班级的整体位置</h3>
      <p className="psub">以下是匿名汇总，用于判断「我的位置意味着什么」，不含任何同学姓名。</p>
      <div className="grid-2" style={{ gap: 22 }}>
        <div>
          <span className="flab">各科年级均分（最近考试）</span>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">科目</th><th scope="col">年级均分</th><th scope="col">本科有效上线率</th></tr></thead>
              <tbody>
                {index.subjects.filter((row) => row.exam_code === exam?.exam).map((row) => <tr key={row.subject}>
                  <th scope="row">{row.subject}</th>
                  <td className="num">{formatScore(row.average)}</td>
                  <td className="num">{formatRate(row.undergraduate_effective_rate)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <span className="flab">分层人数（最近考试）</span>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">分层</th><th scope="col">人数</th><th scope="col">下一步</th></tr></thead>
              <tbody>
                {examSegments.map((row) => <tr key={row.segment_id}>
                  <th scope="row">{row.label}</th>
                  <td className="num">{row.student_count}</td>
                  <td>{row.intent}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {examClasses.length > 0 && <>
        <span className="flab" style={{ display: "block", marginTop: 20 }}>班级对比（最近考试）</span>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">班级</th><th scope="col">人数</th><th scope="col">均分</th>
              <th scope="col">一本上线</th><th scope="col">本科上线</th><th scope="col">同类组</th></tr></thead>
            <tbody>
              {examClasses.map((row) => <tr key={row.class_no}>
                <th scope="row">{row.label}</th>
                <td className="num">{row.students}</td>
                <td className="num">{formatScore(row.average)}</td>
                <td className="num">{row.top_count ?? "—"}（{formatRate(row.top_rate)}）</td>
                <td className="num">{row.undergraduate_count ?? "—"}（{formatRate(row.undergraduate_rate)}）</td>
                <td>{row.class_type}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </>}
      {examTrend.length > 1 && <>
        <span className="flab" style={{ display: "block", marginTop: 20 }}>年级历次趋势（总分均分与上线人数）</span>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">考试</th><th scope="col">参考人数</th><th scope="col">均分</th>
              <th scope="col">一本上线</th><th scope="col">本科上线</th></tr></thead>
            <tbody>
              {examTrend.map((row) => <tr key={row.exam_code}>
                <th scope="row">{row.exam_code}</th>
                <td className="num">{row.students}</td>
                <td className="num">{formatScore(row.average)}</td>
                <td className="num">{row.top_count ?? "—"}</td>
                <td className="num">{row.undergraduate_count ?? "—"}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </>}
    </div>}

    {quality.status === "ready" && index && examInsights.length > 0 && <div className="panel">
      <h3><Icon name="chat" />质量慧析给出的判断</h3>
      <p className="psub">这些结论来自学校这次复盘的统计口径，针对的是全年级，不是对你个人的评价。</p>
      <div className="dir-grid" style={{ marginTop: 14 }}>
        {examInsights.map((row) => <div className="dcard" key={`${row.exam_code}-${row.insight_id}`}>
          <div className="dc-head"><h4>{row.title}</h4></div>
          <p>{row.finding}</p>
          <p className="muted">{row.action}</p>
        </div>)}
      </div>
    </div>}

    {quality.status === "ready" && index && <div className="panel">
      <h3><Icon name="shield" />数据来源与健康度</h3>
      <ul className="kv">
        <li><span>发布版本</span><b>{index.releaseId}</b></li>
        <li><span>来源工作簿</span><b>{index.sourceWorkbook}</b></li>
        <li><span>解析器版本</span><b>{index.parserCommit.slice(0, 12)}</b></li>
        <li><span>覆盖</span><b>{index.counts.persons} 名学生 · {index.counts.observations} 条成绩 · {index.counts.exams} 次考试</b></li>
        <li><span>识别置信度</span><b>{formatRate(index.dataProfile.overall_confidence)}</b></li>
        <li><span>学科完整度</span><b>{formatRate(index.dataProfile.subject_completeness)}</b></li>
        <li><span>双线完整度</span><b>{formatRate(index.dataProfile.threshold_completeness)}</b></li>
        <li><span>总分重建</span><b>{index.dataProfile.reconstructed_totals ?? 0} 条（本数据始终为 0，缺失总分不重建）</b></li>
      </ul>
      <p className="fhint">{index.scoreBasis.rank}</p>
      {Object.keys(index.issueCounts).length > 0 && <p className="fhint">
        已知数据问题：{Object.entries(index.issueCounts).map(([code, count]) => `${code}×${count}`).join("，")}。
        逐条说明见数据库 data_issue 表与 docs/QUALITY_HUIXI_PIPELINE.md。</p>}
      <p className="fhint">{index.methodology.slice(0, 3).join(" ")}</p>
    </div>}
  </section>;
}
