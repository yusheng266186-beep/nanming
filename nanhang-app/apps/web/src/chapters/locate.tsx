import type { Dispatch, SetStateAction } from "react";
import { QUESTIONS, axisMarks, scorePosition, withForm, type ExamRecord, type WebState } from "../model.js";
import { examLineDiffs, equivalentPosition, scoreStability, scoreTrend } from "../exam-position.js";
import { rangeFromExams, type ScoreRange } from "../journey-model.js";
import { OFFICIAL_LINES_2026 } from "../reference-lines.js";
import { formatGap } from "../quality-huixi.js";
import { Provenance, Uncharted } from "../theme.js";
import { Icon } from "../art.js";
import { REFERENCE_YEAR, clamp, label, type PageId } from "./shared.js";

export interface LocateProps {
  state: WebState;
  setState: Dispatch<SetStateAction<WebState>>;
  page: PageId;
  setPage: Dispatch<SetStateAction<PageId>>;
  score: number | null;
  trackLabel: string;
  notify: (message: string) => void;
  range: ScoreRange | null;
  setRange: Dispatch<SetStateAction<ScoreRange | null>>;
}

const formatRatio = (ratio: number) => `${ratio >= 0 ? "+" : ""}${(ratio * 100).toFixed(1)}%`;
const formatPercentile = (percentile: number) =>
  `前 ${percentile < 1 ? percentile.toFixed(2) : percentile.toFixed(1)}%`;

export function renderLocate({ state, setState, page, setPage, score, trackLabel, notify, range, setRange }: LocateProps) {
  const exams = state.form.exams;
  const totals = exams.map((exam) => exam.total).filter((item): item is number => item !== null);
  const stability = scoreStability(totals);
  const trend = scoreTrend(totals);
  // 位次与百分位来自官方分段表；没有表或分数不在公布范围时保持 null，页面显示未知。
  const position = scorePosition(state.release, state.form.primary, score);
  const marks = axisMarks(state.release, state.form.primary, score);
  // 公布范围条：把学生的高考目标分画在「官方公布的最低分 → 最高分」这条真实区间上。
  const bandRange = position ? Math.max(1, position.publishedMaxScore - position.publishedMinScore) : 0;
  const bandLeft = position ? (position.score - position.publishedMinScore) / bandRange * 100 : 0;

  // 等位换算取最近一次「有总分且有任一切线」的考试；官方线是已登记的 2026 年四川省控线。
  // 学生没选科类或发布数据未载入时，等位分仍可算，但一分一段定位显示为未知。
  const equivalentExam = [...exams].reverse()
    .find((exam) => exam.total !== null && (exam.topTotal !== null || exam.undergraduateTotal !== null)) ?? null;
  const officialLines = state.form.primary
    ? { year: OFFICIAL_LINES_2026.year, ...OFFICIAL_LINES_2026.tracks[state.form.primary] }
    : null;
  const equivalent = equivalentExam && officialLines
    ? equivalentPosition(equivalentExam, officialLines, state.release, state.form.primary)
    : null;

  const updateExam = (index: number, patch: Partial<ExamRecord>) => {
    setState((current) => withForm(current, {
      exams: current.form.exams.map((exam, i) => i === index ? { ...exam, ...patch } : exam)
    }));
  };
  const addExam = () => {
    setState((current) => current.form.exams.length >= 5 ? current : withForm(current, {
      exams: [...current.form.exams,
        { label: `第 ${current.form.exams.length + 1} 次`, total: null, rank: null, topTotal: null, undergraduateTotal: null }]
    }));
  };
  const removeExam = (index: number) => {
    setState((current) => withForm(current, { exams: current.form.exams.filter((_, i) => i !== index) }));
  };
  const applyEquivalent = (value: number) => {
    setState((current) => withForm(current, { score: value }));
    notify(`已把等位分 ${value} 设为高考目标分`);
  };
  const numberField = (ariaLabel: string, placeholder: string, value: number | null,
                       onChange: (value: number | null) => void) =>
    <input className="inp exam-num" type="number" inputMode="numeric" min={0} max={750}
      aria-label={ariaLabel} value={value ?? ""} placeholder={placeholder}
      onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} />;

  return <section id="page-locate" className={`view${page === "locate" ? " active" : ""}`} aria-label="定位">
    <div className="page-head">
      <div><span className="eyebrow">Chapter 02 · 定位 · 测深</span>
        <h1 className="song">先看清，<em>我在哪片海域。</em></h1>
        <p className="lede">不给虚假精确的单点数字。成绩、位次、稳定性与趋势共同围出一段「真实水平区间」——这才是能站得住脚的起点。</p></div>
      <div className="head-aside">
        <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
        <p>知止而后有定，<br />定而后能静，静而后能安。</p></div>
    </div>

    <div className="panel" style={{ marginTop: 20 }}>
      <h3><Icon name="log" />录入近几次考试</h3>
      <p className="psub">总分决定稳定性与趋势；填上本次考试的特控线（部分学校称一本线）和本科线，才能得到距线差与下面的高考等位参考。荣县一中的同学在「成绩」页用验证码接入后自动带入，无需重复填写。</p>
      {exams.length === 0 ? <p className="muted-note">还没有录入考试。填了总分，稳定性与趋势才有依据；不填也不影响目标分定位。</p> : null}
      {exams.map((exam, index) => {
        const diffs = examLineDiffs(exam);
        return <div className="exam-row" key={index}>
          <input className="inp exam-label" type="text" value={exam.label}
            aria-label={`第 ${index + 1} 次考试名称`}
            onChange={(event) => updateExam(index, { label: event.target.value })} />
          {numberField(`第 ${index + 1} 次总分`, "总分", exam.total, (value) => updateExam(index, { total: value }))}
          {numberField(`第 ${index + 1} 次位次（校内/全市，选填）`, "位次", exam.rank, (value) => updateExam(index, { rank: value }))}
          {numberField(`第 ${index + 1} 次特控线/一本线`, "特控线", exam.topTotal, (value) => updateExam(index, { topTotal: value }))}
          {numberField(`第 ${index + 1} 次本科线`, "本科线", exam.undergraduateTotal, (value) => updateExam(index, { undergraduateTotal: value }))}
          <button type="button" className="rbtn" aria-label={`删除第 ${index + 1} 次考试`}
            onClick={() => removeExam(index)}><Icon name="close" /></button>
          {diffs.topDiff !== null || diffs.undergraduateDiff !== null ? <span className="exam-diffs">
            {diffs.topDiff !== null ? <span>距特控线 {formatGap(diffs.topDiff)}</span> : null}
            {diffs.undergraduateDiff !== null ? <span>距本科线 {formatGap(diffs.undergraduateDiff)}</span> : null}
          </span> : null}
        </div>;
      })}
      <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
        <button type="button" className="btn sm" disabled={exams.length >= 5} onClick={addExam}>
          {exams.length >= 5 ? "最多记录 5 次" : "添加一次考试"}</button>
        <small className="muted-note">切线是你自己考试的那两条线，不是省控线；只填总分的次也参与稳定性统计。</small>
      </div>
    </div>

    <div className="locate">
      <div>
        <div className="gauge">
          <div className="gauge-top">
            <div><span className="eyebrow plain">高考目标分 · 裸分</span>
              <div className="bignum num" style={{ marginTop: 12 }}>{score === null ? <span className="absent">—</span> : score}<small>分</small></div></div>
            <div style={{ textAlign: "right" }}><span className="eyebrow plain">全省位次 · 参考年</span>
              <div className="bignum num" style={{ marginTop: 12, fontSize: 40 }}>
                {position ? position.rank.toLocaleString("zh-CN") : <span className="absent">—</span>}</div>
              {!position && <div style={{ marginTop: 4 }}>
                <Uncharted>{score === null ? "还没填高考目标分" : "该分数官方未列出"}</Uncharted>
              </div>}</div>
          </div>
          <div style={{ marginTop: 26 }}>
            <div className="bandbar">
              {position
                ? <>
                  <div className="bandfill" style={{ left: `${clamp(bandLeft, 0, 100)}%`, width: "2px" }} />
                  <div className="bandmark" style={{ left: `${clamp(bandLeft, 0, 100)}%` }} />
                  <span className="bandtick" style={{ left: "2%" }}>{position.publishedMinScore}</span>
                  <span className="bandtick line" style={{ left: `${clamp(bandLeft, 6, 94)}%` }}>你 {position.score}</span>
                  <span className="bandtick" style={{ left: "98%" }}>{position.publishedMaxScore}</span>
                </>
                : <div className="band-empty">
                  {state.release
                    ? "该科类没有可用的官方分段表，或目标分不在公布范围内 · 不插值、不外推"
                    : "尚未载入发布数据 · 位次与范围保持未知"}
                </div>}
            </div>
            <div className="slider-foot" style={{ color: "var(--mut)", marginTop: 9 }}>
              <span>{position ? `官方公布最低 ${position.publishedMinScore} 分` : "官方公布最低分"}</span>
              <span>{position ? `${position.tableYear} 年分段表 · 共 ${position.total.toLocaleString("zh-CN")} 人` : "分段表"}</span>
              <span>{position ? `官方公布最高 ${position.publishedMaxScore} 分` : "官方公布最高分"}</span>
            </div>
            <Provenance icon="ruler">
              这条区间是官方分段表实际公布的分数范围。控制线不在发布包内：学校考试的切线请在上方自行录入，
              换算见「高考等位参考」。
            </Provenance>
          </div>
          <div className="stats">
            <div className="stat"><span className="sk"><Icon name="pin" />全省位次</span>
              <div className="sv num">{position ? position.rank.toLocaleString("zh-CN") : <span className="absent">—</span>}</div>
              <div className="sd">{position
                ? `${position.tableYear} 年官方分段表 · 同分 ${position.count} 人`
                : "该分数未在分段表中列出，或尚未载入发布数据"}</div></div>
            <div className="stat"><span className="sk"><Icon name="layers" />全省百分位</span>
              <div className="sv num">{position ? formatPercentile(position.percentile) : "—"}</div>
              <div className="sd">{position
                ? `同科类约 ${position.total.toLocaleString("zh-CN")} 人中的位置`
                : "缺少分段表时不估算百分位"}</div></div>
            <div className="stat"><span className="sk"><Icon name="wave" />近五次稳定性</span>
              <div className="sv num">{stability === null ? "—" : `±${stability.toFixed(1)}`}</div>
              <div className="sd">{stability === null ? "尚未录入考试成绩" : "波动越小，定位越可信"}</div></div>
            <div className="stat"><span className="sk"><Icon name="up" />近期趋势</span>
              <div className="sv num">{trend === null ? "—" : `${trend >= 0 ? "+" : ""}${Math.round(trend * 10) / 10}`}</div>
              <div className="sd">{trend === null ? "尚未录入考试成绩" : "相对上一次的变化（分）"}</div></div>
          </div>
        </div>
        <div className="verdict">
          <span className="eyebrow">Your True Range · 真实水平区间</span>
          <h3 className="song">把你的分数，翻译成一段可以站稳的区间。</h3>
          <div className="vlist">
            <span className="vpill">目标年份 <b>{state.form.targetYear}</b></span>
            <span className="vpill">科类 <b>{trackLabel}</b></span>
            <span className="vpill">再选 <b>{state.form.additional.length ? state.form.additional.map(label).join("、") : "未选择"}</b></span>
            <span className="vpill">高考目标分 <b>{score ?? "未填写"}</b></span>
            <span className="vpill">位次表年份 <b>{position ? position.tableYear : "未知"}</b></span>
            <span className="vpill">参考年 <b>{REFERENCE_YEAR}</b></span>
          </div>
          <p className="small">位次与百分位全部由官方分段表换算；分数不在公布范围时保留为未知，不插值也不外推。</p>
          {marks.length ? <div className="chips" style={{ marginTop: 14 }}>
            {marks.map((mark) => <span className="vpill" key={`${mark.score}-${mark.label}`}>
              {mark.label} <b>{mark.score}</b></span>)}
          </div> : null}
        </div>
      </div>
      <aside>
        <div className="sidecard">
          <span className="eyebrow plain">Stability · 近五次</span>
          <h3 className="song" style={{ marginTop: 10 }}>你的成绩曲线</h3>
          <div className="trend">
            {totals.length >= 2
              ? totals.map((value, index) => {
                const max = Math.max(...totals, 1);
                return <div className={`tbar${index === totals.length - 1 ? " now" : ""}`} key={index}>
                  <span className="col" style={{ height: `${Math.round(value / max * 100)}%` }} />
                  <span className="tl">{index + 1}</span>
                </div>;
              })
              : <div className="empty-inline">尚未录入考试成绩；此页不生成趋势结论。</div>}
          </div>
          <p className="fhint">曲线越平，说明当前定位越可信；起伏大时，我们用区间而非单点来表达。</p>
        </div>
        <div className="sidecard" style={{ marginTop: 22 }}>
          <span className="eyebrow plain">Evidence · 证据链</span>
          <h3 className="song" style={{ marginTop: 10 }}>每个数字都有依据</h3>
          <div className="evi">
            {state.answers.length === 0
              ? <p className="muted-note">还没有保存的本人表达。去「谈心」写下一句话，它才会进入证据链。</p>
              : state.answers.map((answer) => <div className="evi-row" key={answer.evidenceId}>
                <Icon name="doc" /><span><b>{QUESTIONS.find((item) => item.questionId === answer.questionId)?.text ?? answer.questionId}</b><br />{answer.text}</span>
              </div>)}
          </div>
        </div>
      </aside>
    </div>

    {equivalent && (equivalent.top || equivalent.undergraduate) && <div className="panel" style={{ marginTop: 22 }}>
      <h3><Icon name="compass" />高考等位参考（估算，不是预测）</h3>
      <p className="psub">用最近一次带切线的考试「{equivalentExam?.label}」做线差比例换算：距线比例 =（总分 − 本次线）÷ 本次线，
        等位分 = {OFFICIAL_LINES_2026.year} 年同口径省线 ×（1 + 距线比例），再查官方一分一段表。它假设本次考试难度与高考同比例——
        换一次考试或换一种算法，结果就会不同，只当参照，不当结论。</p>
      <div className="grid-2" style={{ marginTop: 14 }}>
        {[equivalent.top && {
          key: "top", title: "按特控线口径", item: equivalent.top
        }, equivalent.undergraduate && {
          key: "undergraduate", title: "按本科线口径", item: equivalent.undergraduate
        }].map((entry) => entry && <div className="sidecard" key={entry.key}>
          <span className="eyebrow plain">{entry.title}</span>
          <div className="vlist" style={{ marginTop: 10 }}>
            <span className="vpill">距线比例 <b>{formatRatio(entry.item.lineRatio)}</b></span>
            <span className="vpill">等位分 <b>{entry.item.equivalentScore}</b></span>
            <span className="vpill">位次区间 <b>{entry.item.position
              ? `约 ${entry.item.position.rank.toLocaleString("zh-CN")} 名` : "—"}</b></span>
            <span className="vpill">全省百分位 <b>{entry.item.position
              ? formatPercentile(entry.item.position.percentile) : "—"}</b></span>
          </div>
          {entry.item.position ? <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
            <button type="button" className="btn sm ghost"
              onClick={() => applyEquivalent(entry.item.equivalentScore)}>
              把 {entry.item.equivalentScore} 设为高考目标分</button>
            <small className="muted-note">高考目标分决定起点，探索区间决定匹配范围，随时可在「起航」改回。</small>
          </div> : <p className="fhint" style={{ marginTop: 10 }}>
            等位分不在官方分段表公布范围内，或尚未载入发布数据——不插值、不外推。</p>}
        </div>)}
      </div>
      <Provenance icon="ruler">
        考试切线由你本人填写；{OFFICIAL_LINES_2026.year} 年特控线与本科线来自{OFFICIAL_LINES_2026.province}
        省教育考试院公开发布；位次区间来自官方一分一段表{equivalent.tableYear ? `（${equivalent.tableYear} 年表）` : ""}。
        等位分是粗略参照：真实高考位置还取决于当年试题与全省人数。
      </Provenance>
    </div>}

    {/* 探索区间是新主流程的枢纽：匹配院校不看单点分数，看这一段区间。
        两条来路都在这里汇合——校外同学按目标分或历考换算，荣县一中的同学识别后自动推导。 */}
    <div className="panel" style={{ marginTop: 22 }}>
      <h3><Icon name="compass" />探索区间（用它匹配院校）</h3>
      <p className="psub">后面的院校匹配不看单点分数，看这段区间：下限到上限之间的院校才会进入结果。
        可以按近几次考试的等位换算自动推导，也可以围绕目标分各取 10 分，再手动微调。</p>
      {range
        ? <div className="vlist" style={{ marginTop: 14 }}>
          <span className="vpill">区间 <b>{range.low}–{range.high}</b> 分</span>
          <span className="vpill">参考 <b>{trackLabel}</b></span>
        </div>
        : <p className="muted-note" style={{ marginTop: 12 }}>还没有生成区间。用下面任一方式生成，或者直接手动填写。</p>}
      <div className="grid-2" style={{ marginTop: 14, gap: 14, maxWidth: 420 }}>
        <label className="field"><span className="flab">区间下限</span>
          <input className="inp" type="number" min={0} max={750} inputMode="numeric" aria-label="探索区间下限"
            value={range && Number.isFinite(range.low) ? range.low : ""}
            onChange={(event) => {
              const value = event.target.value === "" ? NaN : Number(event.target.value);
              setRange((current) => ({ low: value, high: current?.high ?? 750,
                basis: "手动填写的探索区间；可随时修改。" }));
            }} /></label>
        <label className="field"><span className="flab">区间上限</span>
          <input className="inp" type="number" min={0} max={750} inputMode="numeric" aria-label="探索区间上限"
            value={range && Number.isFinite(range.high) ? range.high : ""}
            onChange={(event) => {
              const value = event.target.value === "" ? NaN : Number(event.target.value);
              setRange((current) => ({ low: current?.low ?? 0, high: value,
                basis: "手动填写的探索区间；可随时修改。" }));
            }} /></label>
      </div>
      {range ? <p className="fhint" style={{ marginTop: 8 }}>{range.basis}</p> : null}
      <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 14 }}>
        <button type="button" className="btn sm" disabled={!state.form.primary}
          onClick={() => {
            if (!state.form.primary) { notify("先在「起航」选好首选科目。"); return; }
            const derived = rangeFromExams(exams, state.form.primary);
            if (!derived) { notify("近几次考试至少要有一次「总分 + 任一切线」才能换算；也可以改用目标分。"); return; }
            setRange(derived);
            notify("已按近几次考试的等位换算生成探索区间");
          }}>按近几次考试换算</button>
        <button type="button" className="btn sm" disabled={score === null}
          onClick={() => {
            if (score === null) { notify("先在「起航」填一个高考目标分。"); return; }
            setRange({ low: Math.max(0, score - 10), high: Math.min(750, score + 10),
              basis: "目标分上下各 10 分作为初始探索范围，可自行调整；不是预测区间。" });
            notify("已按目标分 ±10 生成探索区间");
          }}>按目标分 ±10</button>
        {range ? <button type="button" className="btn sm brass" onClick={() => setPage("axis")}>
          拿这个区间去匹配院校<Icon name="arrow" /></button> : null}
      </div>
      <Provenance icon="ruler">
        区间端点在「分数轴」页会换算成同科类历史位次区间，再与院校的历史录取位次取交集；
        它只决定先看哪些院校，不是预测，也不会悄悄扩大。
      </Provenance>
    </div>

    <div className="banner">
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}><Icon name="chat" size="lg" />
        <div><h3 className="song">区间有了，先看看这段海面里有哪些学校</h3><p>下一步用探索区间匹配院校与专业；匹配完再去谈心聊方向，最后按「AI 建议 × 自选」两条线出结果。</p></div></div>
      <button type="button" className="btn sm" style={{ flexShrink: 0 }} onClick={() => setPage("axis")}>去分数轴匹配<Icon name="arrow" /></button>
    </div>
  </section>;
}
