import type { Dispatch, SetStateAction } from "react";
import { SELECTABLE_BATCHES, axisMarks, batchOfferings, comparabilityNote, isMatchFresh, scorePosition, summary, withForm, type WebState } from "../model.js";
import { Provenance } from "../theme.js";
import { Icon } from "../art.js";
import { REFERENCE_YEAR, clamp, label, type PageId } from "./shared.js";

export interface AxisProps {
  state: WebState;
  setState: Dispatch<SetStateAction<WebState>>;
  page: PageId;
  setPage: Dispatch<SetStateAction<PageId>>;
  score: number | null;
  queueMatch: (source: WebState) => void;
  toggleBatch: (batch: string) => void;
  matching: boolean;
  runNow: () => void;
  comparability: ReturnType<typeof comparabilityNote>;
  fresh: NonNullable<WebState["match"]>["result"] | null;
  catalogueEntry: (offeringId: string) => WebState["catalog"][string] | null;
  reading: ReturnType<typeof summary>;
}

export function renderAxis({ state, setState, page, setPage, score, queueMatch, toggleBatch, matching,
  runNow, comparability, fresh, catalogueEntry, reading }: AxisProps) {
  // 刻度用真实存在的东西：官方分段表公布的最低分/最高分，以及学生自己的情景分。
  // 项目没有公布的控制线，因此不画「本科线/特控线」——那是原设计的示意数据。
  const axisMarkList = axisMarks(state.release, state.form.primary, score);
  const axisPosition = scorePosition(state.release, state.form.primary, score);
  // 滑块范围始终取官方分段表公布的范围，与刻度同源。
  // 早先的做法是从「本次位次结果」推范围，没填分数时退回 300–700，
  // 结果刻度（150/691）被夹到错误位置，和滑块说的范围也对不上。
  const publishedBounds = axisMarkList.filter((mark) => mark.major).map((mark) => mark.score);
  const axisMin = publishedBounds.length > 0 ? Math.min(...publishedBounds) : 300;
  const axisMax = publishedBounds.length > 0 ? Math.max(...publishedBounds) : 700;
  // 没填分数时滑块停在正中，只表示「可以拖」，不假装已有一个分数。
  const sliderValue = clamp(score ?? Math.round((axisMin + axisMax) / 2), axisMin, axisMax);
  const sliderPct = axisMax > axisMin ? (sliderValue - axisMin) / (axisMax - axisMin) * 100 : 0;
  return <section id="page-axis" className={`view${page === "axis" ? " active" : ""}`} aria-label="分数轴">
    <div className="page-head">
      <div><span className="eyebrow">Chapter 06 · 分数轴 · 试风</span>
        <h1 className="song">如果我多考 <em>{score === null ? "—" : score}</em> 分。</h1>
        <p className="lede">前台单位是分数，后台判断用位次 + 线差 + 历史录取数据；位次退到「解释层」，不占主界面。</p></div>
      <div className="head-aside">
        <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
        <p>「努力」太抽象，<br />+20 分能多看到哪一批，<br />是具体、可想象的。</p></div>
    </div>
    <div className="axis-hero">
      <div className="axis-head">
        <div><span className="eyebrow">Score Axis · 拖动你的目标分</span>
          <h2 className="song">目标情景分每提高一分，可比较的候选就会重新排列。</h2>
          <p>拖动下面的金铜滑块，候选实时更新。真正的推荐单位是「专业 × 大学」，不是机械的 ±20 分。</p></div>
        <div className="delta-box"><div className="dk">目标情景分</div>
          <div className="delta-num num"><span>{score ?? "—"}</span></div></div>
      </div>
      <div className="slider-wrap">
        <div className="slider-scale">
          {/* 刻度只标「公布范围的上下界」与「你的情景分」。原来的实现把三个标签都居中排在
              同一高度，两端与刻度数字相撞（150/公布低段/2025 与 300 叠在一起）。这里按位置
              决定对齐方式：左端左对齐、右端右对齐、中间的（情景分）才居中，并让情景分单独
              占一行高度，避免与边界标签重叠。 */}
          {axisMarkList.map((mark) => {
            const pct = axisMax > axisMin ? (clamp(mark.score, axisMin, axisMax) - axisMin) / (axisMax - axisMin) * 100 : 0;
            const edge = pct <= 1 ? " start" : pct >= 99 ? " end" : "";
            return <span className={`stick${mark.major ? " major" : " own"}${edge}`}
              key={`${mark.score}-${mark.label}`} style={{ left: `${pct}%` }}>
              {mark.score}<b>{mark.label}</b></span>;
          })}
        </div>
        <div style={{ position: "relative" }}>
          <div className="axis-prog" style={{ width: `${sliderPct}%` }} />
          <div className="axis-now" style={{ left: `${sliderPct}%` }} />
          <input className="axis" type="range" min={axisMin} max={axisMax} step={1} value={sliderValue} aria-label="目标情景分"
            onChange={(event) => {
              const value = Number(event.target.value);
              const next = withForm(state, { score: value });
              setState(next);
              queueMatch(next);
            }} />
        </div>
        <div className="slider-foot">
          <span>{axisMin}{axisPosition ? "（公布最低）" : ""}</span>
          <span>{axisPosition
            ? `${axisPosition.tableYear} 年官方分段表 · 位次约 ${axisPosition.rank.toLocaleString("zh-CN")} 名`
            : score === null
              // 措辞要区分两件事：没填分数，和没有分段表。原来无论哪种都写「尚未载入分段表」，
              // 学生填了分却看到这句会以为数据没加载成功。
              ? "尚未填写情景分 · 填好后即可定位位次"
              : `参考年 ${REFERENCE_YEAR} · 该分数不在官方公布范围内`}</span>
          <span>{axisMax}{axisPosition ? "（公布最高）" : ""}</span>
        </div>
      </div>
    </div>
    <div className="chain">
      <div className={`chain-seg${state.form.batches.length === SELECTABLE_BATCHES.length ? " on" : ""}`}>
        <div className="ck">已选批次</div><div className="cn">{state.form.batches.length ? state.form.batches.map(label).join(" / ") : "未选择"}</div>
      </div>
      {SELECTABLE_BATCHES.map((batch) => {
        const count = batchOfferings(state.release, state.form.primary, batch);
        const on = state.form.batches.includes(batch);
        return <div className={`chain-seg${on ? " on" : ""}`} key={batch} role="button" tabIndex={0}
          onClick={() => toggleBatch(batch)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") toggleBatch(batch); }}>
          <div className="ck">{label(batch)}</div><div className="cn">{count === null ? "条数未知" : `${count.toLocaleString("zh-CN")} 条专业`}</div>
        </div>;
      })}
    </div>
    <p className="fhint">普通类批次之外还有提前批、专项计划等，本页暂不提供。</p>

    <div className="res-bar" style={{ marginTop: 24 }}>
      <div className="res-count">在目标情景分下，匹配到 <b>{fresh?.candidates.length ?? 0}</b> 个专业 × 院校</div>
      <div className="legend">
        <span><i style={{ background: "var(--reach)" }} />需更好位置</span>
        <span><i style={{ background: "var(--steady)" }} />边界重叠</span>
        <span><i style={{ background: "var(--safe)" }} />符合已检查条件</span>
      </div>
    </div>
    <div className="rfilters" style={{ marginBottom: 20 }}>
      <span className="chip" aria-pressed={false}>已确认方向 {(reading?.confirmed ?? []).length}</span>
      {state.form.additional.map((item) => <span className="chip" key={item}>{label(item)}</span>)}
    </div>

    <div className="chart-actions" style={{ justifyContent: "flex-start", marginBottom: 20 }}>
      <button type="button" className="btn brass" disabled={matching} onClick={runNow}>{matching ? "正在准备数据…" : "运行匹配"}</button>
      {state.match && !isMatchFresh(state) ? <span className="gap neg">输入或画像已改变，旧结果已失效，请重新运行。</span> : null}
    </div>
    {comparability ? <p className="basis">{comparability.basis}{comparability.limits ? ` ${comparability.limits}` : ""}</p> : null}
    {state.release && fresh && fresh.candidates.length > 0 && !comparability
      ? <p className="feedback">未找到该参考年的可比性记录，历史位置关系不应被採用；请核对发布包。</p> : null}
    {fresh && fresh.warnings.length ? <p className="feedback">数据提示：{fresh.warnings.map(label).join("；")}</p> : null}

    <div className="schools">
      {fresh && fresh.candidates.length > 0
        ? fresh.candidates.slice(0, 60).map((candidate) => {
          const entry = catalogueEntry(candidate.offering_id);
          const relation = candidate.group_reference.relation;
          const badge = candidate.eligibility.status === "PASS" ? "safe" : candidate.eligibility.status === "UNKNOWN" ? "plain" : "steady";
          // 标签直接来自工作簿原文，不推断、不评级；没有标签的院校就不显示这一行。
          const tags = (entry?.institutionTags ?? "").split("/").map((item) => item.trim()).filter(Boolean).slice(0, 4);
          return <article className="scard" key={candidate.offering_id}>
            <div className="scard-top">
              <span className={`rbadge ${badge}`}>{label(candidate.eligibility.status)}</span>
              <span className="sc-loc"><Icon name="pin" />{entry?.institutionName ?? "院校名称未随发布包提供"}{entry?.institutionCity ? ` · ${entry.institutionCity}` : ""}</span>
              <h3 className="song">{entry?.majorName ?? label(candidate.offering_id)}</h3>
              <div className="sc-tags">
                {entry?.category ? <span>{entry.category}</span> : null}
                {entry?.categoryClass && entry.categoryClass !== entry.category ? <span>{entry.categoryClass}</span> : null}
                <span>招生数 {entry?.planCount === null || entry?.planCount === undefined ? "未知" : entry.planCount}</span>
                <span>学费 {entry?.tuition === null || entry?.tuition === undefined ? "未知" : `¥${entry.tuition}`}</span>
              </div>
            </div>
            {tags.length ? <div className="sc-tags" style={{ margin: "0 20px 14px" }}>
              {tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div> : null}
            <div className="ranks">
              <div className="rank"><div className="ry">参考年</div><div className="rv num">{candidate.group_reference.source_year ?? REFERENCE_YEAR}</div></div>
              <div className="rank"><div className="ry">组位置</div><div className="rv">{label(relation)}</div></div>
              <div className="rank"><div className="ry">专业</div><div className="rv">{label(candidate.major_reference.relation)}</div></div>
            </div>
            <div className="sc-foot">
              <span className="gap"><b>{label(candidate.preference_status)}</b></span>
              <span className="sc-match"><Icon name="layers" />组与专业证据分开展示</span>
            </div>
            <Provenance>
              组位置取自 {candidate.group_reference.source_year ?? REFERENCE_YEAR} 年专业组记录，
              专业位置取该专业自己的记录；两者分列，缺一项就写「暂无比较依据」。
            </Provenance>
          </article>;
        })
        : <div className="empty">
          <Icon name="compass" size="xl" />
          <h3>{matching ? "正在载入已发布数据…" : "还没有可展示的候选"}</h3>
          <p>填写目标情景分、选择两门再选科目与批次后，点击「运行匹配」。</p>
        </div>}
    </div>
    <p className="fhint" style={{ margin: "22px 2px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
      <Icon name="doc" /><span>院校录取位次来自发布数据；未提供时显示为未知，不编造数字。</span></p>
    <div className="banner">
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}><Icon name="route" size="lg" />
        <div><h3 className="song">看够了？生成你的《南溟航线图》</h3><p>已确认方向、匹配候选与两周行动，一次看清。</p></div></div>
      <button type="button" className="btn sm brass" style={{ flexShrink: 0 }} onClick={() => setPage("chart")}>点亮航线图<Icon name="arrow" /></button>
    </div>
  </section>;
}
