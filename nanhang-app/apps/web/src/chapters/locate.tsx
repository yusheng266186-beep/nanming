import type { Dispatch, SetStateAction } from "react";
import { axisMarks, scorePosition, withForm, type ExamRecord, type WebState } from "../model.js";
import { examLineDiffs, equivalentPosition, linesInverted, scoreStability, scoreTrend } from "../exam-position.js";
import { rangeFromExams, type ScoreRange } from "../journey-model.js";
import { OFFICIAL_LINES_2026 } from "../reference-lines.js";
import {
  classChanges, formatGap, formatRate, formatScore, friendlyExamLabel, latestExam,
  subjectDistances, trailChart, weakestKnowledge
} from "../quality-huixi.js";
import { Uncharted } from "../theme.js";
import { Icon } from "../art.js";
import { RangeFill } from "../range-fill.js";
import { ExamReadingCards, ExamTrajectoryChart } from "./trajectory.js";
import { REFERENCE_YEAR, clamp, label, type LocateRoute, type PageId, type QualityState } from "./shared.js";

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
  quality: QualityState;
  qualityCode: string;
  setQualityCode: Dispatch<SetStateAction<string>>;
  schoolName: string;
  setSchoolName: Dispatch<SetStateAction<string>>;
  identifySchool: () => Promise<void>;
  /** 走的是哪条路：`manual` 手填几次考试，`school` 荣县一中接入。两条路的页面内容不互相掺杂。 */
  route: LocateRoute;
}

const formatRatio = (ratio: number) => `${ratio >= 0 ? "+" : ""}${(ratio * 100).toFixed(1)}%`;
const formatPercentile = (percentile: number) =>
  `前 ${percentile < 1 ? percentile.toFixed(2) : percentile.toFixed(1)}%`;

/** 小字用的字体栈：与 style.css 的 --song 同一串（SVG 的 presentation attribute 不认 var()，只能写死）。 */
const SONG_FAMILY = "'Noto Serif SC','Songti SC','STSong','SimSun',serif";

export function renderLocate({ state, setState, page, setPage, score, trackLabel, notify, range, setRange,
  quality, qualityCode, setQualityCode, schoolName, setSchoolName, identifySchool, route }: LocateProps) {
  const exams = state.form.exams;
  // 0 分与缺考一样不参与稳定性/趋势：0 不是成绩，混进均值会同时压低均值、抬高波动。
  const totals = exams.flatMap((exam) => exam.total !== null && exam.total > 0 ? [exam.total] : []);
  const stability = scoreStability(totals);
  const trend = scoreTrend(totals);
  // 位次与百分位来自官方分段表；没有表或分数不在公布范围时保持 null，页面显示未知。
  const position = scorePosition(state.release, state.form.primary, score);
  const marks = axisMarks(state.release, state.form.primary, score);
  const bandRange = position ? Math.max(1, position.publishedMaxScore - position.publishedMinScore) : 0;
  const bandLeft = position ? (position.score - position.publishedMinScore) / bandRange * 100 : 0;

  // 荣县一中增强模式接入后，考试行来自学校数据：只读、固定，不提供增删改。
  // 只在「学校那条路」上成立：两条路并行、互不掺杂——手填路上不出现只读的学校行，
  // 学校路上也不出现可编辑的手填行（否则切换路线后会看到别人的规则混在自己的数据里）。
  const schoolLocked = route === "school" && quality.status === "ready" && quality.shard !== null;

  // 等位换算取最近一次「有总分且有任一切线」的考试；官方线是已登记的 2026 年四川省控线。
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
    notify(`已把等位分 ${value} 设为高考等价分`);
  };
  const numberField = (ariaLabel: string, placeholder: string, value: number | null,
                       onChange: (value: number | null) => void, disabled = false) =>
    <input className="inp exam-num" type="number" inputMode="numeric" min={0} max={750}
      aria-label={ariaLabel} value={value ?? ""} placeholder={placeholder} disabled={disabled}
      onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} />;

  // —— 荣县一中质量慧析（合并自原「成绩」章）——
  const shardExam = quality.shard ? latestExam(quality.shard) : null;
  const distances = shardExam ? subjectDistances(shardExam) : [];
  const gaps = quality.shard ? weakestKnowledge(quality.shard, 6) : [];
  const moves = quality.shard ? classChanges(quality.shard) : [];
  const examRow = quality.index && shardExam
    ? quality.index.exams.find((row) => row.exam_code === shardExam.exam && row.track === quality.shard?.person.track) ?? null
    : null;
  const examTrend = quality.index?.trend ?? [];
  const lastTrend = examTrend[examTrend.length - 1] ?? null;
  const prevTrend = examTrend[examTrend.length - 2] ?? null;
  const examName = (raw: string) => friendlyExamLabel(raw);

  return <section id="page-locate" className={`view${page === "locate" ? " active" : ""}`} aria-label="定位">
    <div className="page-head">
      <div><span className="eyebrow">Chapter 02 · 定位 · 测深</span>
        <h1 className="song">先看清，<em>我在哪片海域。</em></h1>
        <p className="lede">不给虚假精确的单点数字。几次考试（或学校数据）与它们各自的切线，共同围出一段「真实水平区间」——这才是能站得住脚的起点。</p></div>
      <div className="head-aside">
        <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
        <p>知止而后有定，<br />定而后能静，静而后能安。</p></div>
    </div>

    {/* 荣县一中增强模式直接内嵌在这里：识别后考试行自动填好并锁定，替换掉手输。 */}
    {/* 学校那条路才有接入卡：手填那条路上不出现任何学校入口。 */}
    {route === "school" && (quality.status !== "ready" ? <div className="panel" style={{ marginTop: 20 }}>
      <h3><Icon name="shield" />荣县一中的同学：直接接入学校数据</h3>
      <p className="psub">输入姓名和 6 位查询码。四班已更新的同学使用身份证后六位（末位 X 改填 0），其他同学仍用班主任发放的验证码。服务端核对后读取你本人的成绩记录，自动填好下面的考试行并推导探索区间——不需要手动录入。其他学校的同学跳过这步，直接手填即可。</p>
      <div className="grid-2" style={{ marginTop: 16, gap: 14, maxWidth: 460 }}>
        <label className="field"><span className="flab">学生姓名</span>
          <input className="inp" type="text" autoComplete="off" maxLength={40}
            value={schoolName}
            placeholder="和验证码一起由班主任发放"
            onChange={(event) => setSchoolName(event.target.value)} /></label>
        <label className="field"><span className="flab">6 位查询码</span>
          <input className="inp" type="text" inputMode="numeric" autoComplete="off" maxLength={6}
            value={qualityCode}
            placeholder="例如 246810"
            aria-describedby="locate-identify-hint"
            onChange={(event) => setQualityCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(event) => { if (event.key === "Enter") void identifySchool(); }} /></label>
      </div>
      <div className="hero-act" style={{ marginTop: 16 }}>
        <button type="button" className="btn brass" disabled={quality.status === "loading" || quality.attempts.blocked}
          onClick={() => void identifySchool()}>
          {quality.status === "loading" ? "正在核对…" : "识别并接入"}<Icon name="arrow" /></button>
        {/* 页面拆成两条路之后，「下面可以手填」不再成立：手填在另一条路上。 */}
        <span className="muted-note">没有查询码就回「起航」点「开始起航」，选第一条路（通用模式）手填考试。</span>
      </div>
      <p className="fhint" id="locate-identify-hint">{quality.message
        ?? "姓名和验证码只发送给成绩服务核对（有尝试次数限制），不进入对话，也不发给 AI。"}</p>
    </div>
    : <div className="panel" style={{ marginTop: 20 }}>
      <h3><Icon name="shield" />{quality.shard?.person.name} · {quality.shard?.person.classLabel}</h3>
      <p className="psub">{quality.shard?.person.track} · {quality.shard?.person.combination} · 已接入 {quality.shard?.exams.length} 次考试记录（入学入口考满分口径与正考不同，不作为参考，已剔除），下面这些行来自学校数据，是固定的，不能改；要看逐科位置、航迹与知识短板，见本页下方。</p>
    </div>)}

    {/* 手填那条路：考试行由学生自己录。走学校那条路时这一块不出现——接入后
        学校数据自带考试行，页面上不该再混一份手填的。 */}
    {(route === "manual" || schoolLocked) && <div className="panel" style={{ marginTop: 22 }}>
      <h3><Icon name="log" />{schoolLocked ? "学校带入的近几次考试（只读）" : "录入近几次考试"}</h3>
      {!schoolLocked ? <p className="psub">总分决定稳定性与趋势；填上本次考试的特控线（部分学校称一本线）和本科线，才能得到距线差与下面的高考等位参考。位次不需要填：没有全校人数做分母，它做不了可靠的换算。</p>
        : null}
      {exams.length === 0 ? <p className="muted-note">{schoolLocked
        ? "学校数据里没有可用作参考的考试记录（入学入口考不计入参考）。"
        : "还没有考试记录。点「添加一次考试」，至少填总分；有切线的次还能参与等位换算。"}</p> : null}
      {exams.map((exam, index) => {
        // 两条线高低颠倒时这场不参与等位换算，必须在这一行说出来，不能静默丢掉。
        const inverted = linesInverted(exam);
        const rowLabel = schoolLocked ? (exam.label || `第 ${index + 1} 次`) : `第 ${index + 1} 次`;
        return <div className="exam-row" key={index}>
          <span className="exam-tag" title={exam.label}>{rowLabel}</span>
          {numberField(`第 ${index + 1} 次总分`, "总分", exam.total, (value) => updateExam(index, { total: value }), schoolLocked)}
          {numberField(`第 ${index + 1} 次特控线/一本线`, "特控线", exam.topTotal, (value) => updateExam(index, { topTotal: value }), schoolLocked)}
          {numberField(`第 ${index + 1} 次本科线`, "本科线", exam.undergraduateTotal, (value) => updateExam(index, { undergraduateTotal: value }), schoolLocked)}
          {!schoolLocked && <button type="button" className="rbtn" aria-label={`删除第 ${index + 1} 次考试`}
            onClick={() => removeExam(index)}><Icon name="close" /></button>}
          {/* 行内只留「这场数据有问题」的警告。距线差不再在行里重复一遍——
              下方成绩轨迹下方的读数卡把每次的总分、距两条线的差与较上次的变化都算清楚了，
              行里再挂两枚胶囊只是重复占高度（负责人 2026-09-20：这里太粗糙、空白太多）。 */}
          {inverted ? <span className="exam-diffs">
            <span className="warn">这场本科线高于特控线，未参与等位换算</span>
          </span> : null}
        </div>;
      })}
      {!schoolLocked && <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
        <button type="button" className="btn sm" disabled={exams.length >= 5} onClick={addExam}>
          {exams.length >= 5 ? "最多记录 5 次" : "添加一次考试"}</button>
        <small className="muted-note">切线是你自己考试的那两条线，不是省控线；只填总分的次也参与稳定性统计。</small>
      </div>}
      {/* 成绩分析：只做手填数据真的能支撑的那部分（轨迹 + 距两条线 + 逐次读数）。
          单科分数、年级均分、班级均分只有荣县一中那条路有，这里显式说明去哪儿看，不在这里补造。 */}
      {exams.length > 0 && <div className="exam-analysis">
        <ExamTrajectoryChart exams={exams} />
        <ExamReadingCards exams={exams} />
        <p className="fhint">逐科分数、年级与班级均分差需要学校的成绩数据：在「起航」选「荣县一中 · 增强模式」接入后，这里会多出一张逐科位置表。手填路线不推算这些数字。</p>
      </div>}
    </div>}

    <div className="locate">
      <div>
        <div className="gauge">
          <div className="gauge-top">
            <div><span className="eyebrow plain">{schoolLocked ? "高考等价分 · 学校数据换算" : "高考目标分 · 裸分"}</span>
              <div className="bignum num" style={{ marginTop: 12 }}>{score === null ? <span className="absent">—</span> : score}<small>分</small></div></div>
            <div style={{ textAlign: "right" }}><span className="eyebrow plain">全省位次 · 参考年</span>
              <div className="bignum num" style={{ marginTop: 12, fontSize: 40 }}>
                {position ? position.rank.toLocaleString("zh-CN") : <span className="absent">—</span>}</div>
              {!position && <div style={{ marginTop: 4 }}>
                <Uncharted>{score === null ? "还没有可查的分数" : "该分数官方未列出"}</Uncharted>
              </div>}</div>
          </div>
          <div style={{ marginTop: 26 }}>
            {/* 没有可用的分段表/分数越界时，说明写在条外——条内挤不下长句。 */}
            <div className="bandbar">
              {position
                ? <>
                  <div className="bandfill" style={{ left: `${clamp(bandLeft, 0, 100)}%`, width: "2px" }} />
                  <div className="bandmark" style={{ left: `${clamp(bandLeft, 0, 100)}%` }} />
                  <span className="bandtick" style={{ left: "2%" }}>{position.publishedMinScore}</span>
                  <span className="bandtick line" style={{ left: `${clamp(bandLeft, 6, 94)}%` }}>你 {position.score}</span>
                  <span className="bandtick" style={{ left: "98%" }}>{position.publishedMaxScore}</span>
                </>
                : null}
            </div>
            {!position && <p className="fhint" style={{ marginTop: 8 }}>
              {state.release
                ? "该科类没有可用的官方分段表，或目标分不在公布范围内——位次保持未知，不插值、不外推。"
                : "尚未载入发布数据，位次与范围保持未知。"}</p>}
            <div className="slider-foot" style={{ color: "var(--mut)", marginTop: 9 }}>
              <span>{position ? `官方公布最低 ${position.publishedMinScore} 分` : "官方公布最低分"}</span>
              <span>{position ? `${position.tableYear} 年分段表 · 共 ${position.total.toLocaleString("zh-CN")} 人` : "分段表"}</span>
              <span>{position ? `官方公布最高 ${position.publishedMaxScore} 分` : "官方公布最高分"}</span>
            </div>
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
            <span className="vpill">{schoolLocked ? "高考等价分" : "高考目标分"} <b>{score ?? "未填写"}</b></span>
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
              ? (() => {
                // 标尺按总分区间放大（上下留边距）：「以最高分为 100%」的旧标尺里 550 和 570
                // 几乎一样高，看不出起伏；缩放后柱子的高低差对应分数差，悬停可见当次分数。
                const low = Math.min(...totals);
                const high = Math.max(...totals);
                const floorScore = low - 3 - (high - low) * 0.2;
                const ceilScore = high + 3 + (high - low) * 0.2;
                return totals.map((value, index) => {
                  const height = Math.max(6, Math.round((value - floorScore) / (ceilScore - floorScore) * 100));
                  return <div className={`tbar${index === totals.length - 1 ? " now" : ""}`} key={index}>
                    <span className="col" style={{ height: `${height}%` }} title={`${value} 分`} />
                    <span className="tl">{index + 1}</span>
                  </div>;
                });
              })()
              : <div className="empty-inline">尚未录入考试成绩；此页不生成趋势结论。</div>}
          </div>
          <p className="fhint">曲线越平，说明当前定位越可信；起伏大时，我们用区间而非单点来表达。</p>
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
            <span className="vpill">高考等价分 <b>{entry.item.equivalentScore}</b></span>
            <span className="vpill">位次区间 <b>{entry.item.position
              ? `约 ${entry.item.position.rank.toLocaleString("zh-CN")} 名` : "—"}</b></span>
            <span className="vpill">全省百分位 <b>{entry.item.position
              ? formatPercentile(entry.item.position.percentile) : "—"}</b></span>
          </div>
          {entry.item.position ? <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
            <button type="button" className="btn sm ghost"
              onClick={() => applyEquivalent(entry.item.equivalentScore)}>
              把 {entry.item.equivalentScore} 设为高考等价分</button>
            <small className="muted-note">高考等价分决定起点，探索区间决定匹配范围，随时可在「起航」改回。</small>
          </div> : <p className="fhint" style={{ marginTop: 10 }}>
            等价分不在官方分段表公布范围内，或尚未载入发布数据——不插值、不外推。</p>}
        </div>)}
      </div>
    </div>}

    {/* 探索区间由数据自动生成：有考试按等位换算取 min–max，没有考试按目标分 ±10。
        学生非要改可以改（微调），但不提供「去匹配」按钮——顺序上的下一步是谈心。 */}
    <div className="panel" style={{ marginTop: 22 }}>
      <h3><Icon name="compass" />探索区间（自动生成，可微调）</h3>
      <p className="psub">后面的院校匹配不看单点分数，看这段区间。它由上面的数据自动生成：有几次考试时按各自的切线做等位换算、
        取可用估算的最小—最大值；只有目标分时按上下各 10 分。非要改，可以直接改下面两个数——下一次数据变化时会按新数据重新生成。</p>
      {range
        ? <>
          <div className="vlist" style={{ marginTop: 14 }}>
            <span className="vpill">区间 <b>{range.low}–{range.high}</b> 分</span>
            <span className="vpill">参考 <b>{trackLabel}</b></span>
          </div>
          {/* 上下限是同一段区间的两端：用一支标尺（共用模块）输入，不是两只各自独立的框。
              谁补谁仍按这一页原来的规则——改下限时上限兜 750，改上限时下限兜 0。 */}
          <div style={{ marginTop: 16 }}>
            <RangeFill lowLabel="微调下限" highLabel="微调上限" low={range.low} high={range.high}
              onLow={(value) => setRange((current) => ({ low: value, high: current?.high ?? 750,
                basis: "手动微调过的探索区间；下一次数据变化会重新生成。" }))}
              onHigh={(value) => setRange((current) => ({ low: current?.low ?? 0, high: value,
                basis: "手动微调过的探索区间；下一次数据变化会重新生成。" }))} />
          </div>
          <p className="fhint" style={{ marginTop: 8 }}>{range.basis}</p>
        </>
        : <p className="muted-note" style={{ marginTop: 12 }}>还没有可以生成区间的数据：录入至少一次「总分 + 切线」的考试，或在「起航」填一个高考目标分。</p>}
    </div>

    {/* —— 荣县一中质量慧析（原「成绩」章并入）：学校数据接入后才能看 —— */}
    {schoolLocked && shardExam && <div className="panel" style={{ marginTop: 22 }}>
      <h3><Icon name="layers" />最近一次考试的逐科位置</h3>
      <p className="psub">每一科都给出「本人分数 / 本科线 / 距线差」和与年级、班级均分的差。缺失或异常单元格显示为「—」，不按 0 分计算。这些只描述已经发生的事，不预测录取。</p>
      {examRow && <p className="fhint" style={{ marginTop: 10 }}>
        {examName(shardExam.exam)} 本校 {shardExam.track} 共 {examRow.students} 人参考；一本上线 {examRow.top_count ?? "—"} 人（{formatRate(examRow.top_rate)}），
        本科上线 {examRow.undergraduate_count ?? "—"} 人（{formatRate(examRow.undergraduate_rate)}）。
        {shardExam.trackDiffersFromHome && `该场考试按${shardExam.track}统计（你平时在${quality.shard?.person.track}），位次、分数线与班级均分都取自这一场自己的口径。`}
      </p>}
      {lastTrend && <p className="fhint" style={{ marginTop: 6 }}>年级参考：{examName(lastTrend.exam_code)}全年级 {lastTrend.students} 人参考，
        均分 {formatScore(lastTrend.average)}，一本上线 {lastTrend.top_count ?? "—"} 人{prevTrend
          ? `；上次（${examName(prevTrend.exam_code)}）均分 ${formatScore(prevTrend.average)}` : ""}。</p>}
      <div className="table-wrap" style={{ marginTop: 10 }}>
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

    {schoolLocked && quality.shard && quality.shard.exams.length > 1 && <div className="panel" style={{ marginTop: 22 }}>
      <h3><Icon name="route" />航迹：历次总分与切线</h3>
      <p className="psub">柱子画在统一分数标尺上（左侧是分数刻度），柱顶标着当次总分，越高分越高；两条虚线按每一场考试自己的划线分段画——各场考试的划线深浅不一样，不能共用一条线。柱子到虚线的落差就是当次距线差。更早的考试见下表。</p>
      {(() => {
        // 只画最近 6 次：更早的考试量纲可能不同（如入口考），会把标尺撑宽、压扁近期的高低差；
        // 完整历次见下面的表格。
        const chart = trailChart(quality.shard!.exams.slice(-6));
        if (!chart) return <div className="empty-inline">暂无可绘制的总分记录。</div>;
        return <svg viewBox={`0 0 ${chart.width} ${chart.height}`} width="100%" role="img"
          aria-label="历次考试总分轨迹：柱顶是当次总分，两条虚线按各场考试自己的划线分段画"
          style={{ display: "block", maxWidth: 560 }}>
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
      <p className="fhint">考试代码说明：一册～四册＝第1～4学期期末；「XY」＝第X学期第Y次月考（如 21 为第2学期第1次月考、51 为第5学期第1次月考）；4半＝第4学期半期。</p>
    </div>}

    {schoolLocked && gaps.length > 0 && <div className="panel" style={{ marginTop: 22 }}>
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

    <div className="banner">
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}><Icon name="chat" size="lg" />
        <div><h3 className="song">位置看清了，去和 AI 聊聊你想去哪</h3><p>分数决定「能到哪」，聊出来的方向决定「想去哪」。区间匹配院校随时可以去「分数轴」做；顺序上的下一步是谈心。</p></div></div>
      <button type="button" className="btn sm" style={{ flexShrink: 0 }} onClick={() => setPage("talk")}>去谈心<Icon name="arrow" /></button>
    </div>
  </section>;
}
