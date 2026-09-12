import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { SELECTABLE_BATCHES, axisMarks, batchOfferings, type WebState } from "../model.js";
import { Icon } from "../art.js";
import {
  REFERENCE_YEAR, RELATION_CLASSES, clamp, formatRankInterval, groupRouteRows, label, levelLabel,
  pickGroupedCards, scoreRangeForRanks, useNarrow, type PageId
} from "./shared.js";
import type { PoolRow, SchoolPool, ScoreRange } from "../journey-model.js";

/** 池子里放大类分组后每类取几张、合计上限多少（与航线图同一套挑选思路）。 */
const AXIS_CARDS_PER_CLASS = 6;
const AXIS_CARDS_TOTAL = 60;

export interface AxisProps {
  state: WebState;
  setState: Dispatch<SetStateAction<WebState>>;
  page: PageId;
  setPage: Dispatch<SetStateAction<PageId>>;
  notify: (message: string) => void;
  range: ScoreRange | null;
  setRange: Dispatch<SetStateAction<ScoreRange | null>>;
  pool: SchoolPool | null;
  poolStale: boolean;
  poolPending: boolean;
  poolError: string | null;
  matchPool: () => Promise<void>;
  toggleBatch: (batch: string) => void;
}

export function renderAxis({ state, setState, page, setPage, notify, range, setRange, pool, poolStale,
  poolPending, poolError, matchPool, toggleBatch }: AxisProps) {
  // 刻度用真实存在的东西：官方分段表公布的最低分/最高分。项目没有公布的控制线，因此不画线。
  const axisMarkList = axisMarks(state.release, state.form.primary, null);
  const publishedBounds = axisMarkList.filter((mark) => mark.major).map((mark) => mark.score);
  const axisMin = publishedBounds.length > 0 ? Math.min(...publishedBounds) : 300;
  const axisMax = publishedBounds.length > 0 ? Math.max(...publishedBounds) : 700;
  const pct = (value: number) => axisMax > axisMin ? (clamp(value, axisMin, axisMax) - axisMin) / (axisMax - axisMin) * 100 : 0;
  const bandLeft = range ? pct(range.low) : 0;
  const bandWidth = range ? Math.max(0.8, pct(range.high) - pct(range.low)) : 0;
  const rows = pool?.rows ?? [];
  // 池子按大类 → 小类分组（与航线图同一套），手机端收抽屉、宽屏平铺；卡片挑选规则也一致。
  const grouped = groupRouteRows(rows);
  const picked = pickGroupedCards(grouped, AXIS_CARDS_PER_CLASS, AXIS_CARDS_TOTAL);
  const narrowAxis = useNarrow();
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  /** 一张院校专业卡：抬头、专业名与最低分常显；位次/招生数/学费/院校标签是「细节」，
   *  滑动时由 CSS 的 .focus 浮出（负责人 2026-09-12：抽屉式卡片、跟随滑动显示、停留显示当前那张）。 */
  const renderCard = (row: PoolRow) => {
    const entry = row.label;
    const reference = row.reference === "major" ? row.candidate.major_reference : row.candidate.group_reference;
    const interval = reference.reference_rank_interval ?? [];
    const relation = RELATION_CLASSES.find((item) => item.key === reference.relation) ?? null;
    const institutionTags = (entry.institutionTags ?? "").split("/")
      .map((tag) => tag.trim()).filter(Boolean).slice(0, 3);
    const passed = row.candidate.eligibility.status === "PASS";
    const sourceYear = reference.source_year ?? pool?.referenceYear ?? REFERENCE_YEAR;
    const scores = scoreRangeForRanks(state.release, state.form.primary, sourceYear, interval);
    const scoreText = scores
      ? (scores.min === scores.max ? `${scores.min}` : `${scores.min}–${scores.max}`)
      : "未知";
    return <article className={`scard${relation ? ` rel-${relation.cls}` : ""}`} key={entry.offeringId}>
      <div className="scard-top">
        <div className="sc-head">
          <span className="sc-loc"><Icon name="pin" />{entry.institutionName}{entry.institutionCity ? ` · ${entry.institutionCity}` : ""}</span>
          {relation
            ? <span className={`sc-rel ${relation.cls}`}><i />{relation.label}</span>
            : <span className="sc-rel none">暂无比较依据</span>}
        </div>
        <h3 className="song">{entry.majorName}
          {entry.level ? <em className="sc-lv">{levelLabel(entry.level)}</em> : null}</h3>
        <p className="sc-sub">
          {entry.batch}{entry.categoryClass ? ` · ${entry.categoryClass}` : ""}
          {passed ? null : ` · ${label(row.candidate.eligibility.status)}`}
        </p>
      </div>
      <div className="sc-foot">
        <span className="sc-score">{sourceYear} 最低 <b>{scoreText}</b> 分</span>
      </div>
      {/* 细节：位置固定，只做透明度与位移的过渡——滑到哪一张就显示哪一张，页面不会因为
          展开/收起而跳动（这是「丝滑」的关键）。 */}
      <div className="sc-detail">
        <p className="sc-detail-line">
          位次 {formatRankInterval(interval)} · 招 {entry.planCount ?? "—"} 人 ·
          {entry.tuition == null ? " 学费未知" : ` 学费 ${entry.tuition}`}
        </p>
        {institutionTags.length ? <p className="sc-tagline">{institutionTags.join(" · ")}</p> : null}
        {row.reference === "group" ? <p className="fhint">只有专业组依据，具体专业门槛未知。</p> : null}
        {row.candidate.eligibility.pending_requirements.length > 0
          ? <p className="fhint">待核对条件：{row.candidate.eligibility.pending_requirements.map(label).join("、")}。</p> : null}
      </div>
    </article>;
  };

  /** 卡片里的「当前这张」：进入视野中间约 16% 的带子就算聚焦，滑走就交还——
   *  停住时显示的那一张就是它（IntersectionObserver 直接切换 class，不触发 React 重渲染）。 */
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const focusKey = pool ? `${pool.releaseId}:${pool.rows.length}` : "none";
  useEffect(() => {
    const root = cardsRef.current;
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>(".scard"));
    if (!cards.length) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) entry.target.classList.toggle("focus", entry.isIntersecting);
    }, { rootMargin: "-42% 0px -42% 0px", threshold: 0 });
    for (const card of cards) observer.observe(card);
    return () => observer.disconnect();
  }, [focusKey, openCategory]);

  return <section id="page-axis" className={`view${page === "axis" ? " active" : ""}`} aria-label="分数轴">
    <div className="page-head">
      <div><span className="eyebrow">Chapter 05 · 分数轴 · 试风</span>
        <h1 className="song">这段区间里，<em>哪些学校可选。</em></h1>
        <p className="lede">把「定位」页的探索区间放到官方分段表上：区间端点换算成同科类历史位次，与每条院校专业记录的历史录取位次取交集——交集非空才进入结果。前台单位是分数，后台判断用位次。</p></div>
      <div className="head-aside">
        <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
        <p>先看海的宽度，<br />再挑想靠的岸。</p></div>
    </div>
    <div className="axis-hero">
      <div className="axis-head">
        <div><span className="eyebrow">Score Axis · 你的探索区间</span>
          <h2 className="song">区间每宽一分，能看到的院校就多一批；区间只决定先看谁，不决定谁能录取。</h2>
          <p>区间来自「定位」页的考试数据，也可以直接在这一页改上下限。它只决定先看谁，不决定谁能录取。</p></div>
        <div className="delta-box"><div className="dk">探索区间</div>
          <div className="delta-num num"><span>{range ? `${range.low}–${range.high}` : "—"}</span></div></div>
      </div>
      <div className="slider-wrap">
        <div className="slider-scale">
          {/* 刻度只标「公布范围的上下界」与「你的区间两端」，端点贴边对齐避免文字相撞。 */}
          {([axisMin, axisMax, ...(range ? [range.low, range.high] : [])] as const).map((value, index) => {
            const name = index === 0 ? "公布最低" : index === 1 ? "公布最高"
              : value === range?.low ? "区间下限" : "区间上限";
            const major = index < 2;
            const left = pct(value);
            const edge = left <= 1 ? " start" : left >= 99 ? " end" : "";
            return <span className={`stick${major ? " major" : " own"}${edge}`}
              key={`${value}-${name}`} style={{ left: `${left}%` }}>
              {value}<b>{name}</b></span>;
          })}
        </div>
        <div style={{ position: "relative" }}>
          <div className="axis-track" />
          {/* 金带本身就是区间：实心端头标出上下限，不再画两根「当前分」竖线——
              那对竖线会把一段区间掐成一个点。 */}
          {range ? <div className="axis-band" style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }} /> : null}
        </div>
        <div className="slider-foot">
          <span>{axisMin}（公布最低）</span>
          <span>{range ? "金色带就是你的探索区间" : "还没有探索区间 · 在下面填上下限"}</span>
          <span>{axisMax}（公布最高）</span>
        </div>
      </div>
      <div className="grid-2" style={{ marginTop: 18, gap: 14, maxWidth: 460 }}>
        <label className="field"><span className="flab">区间下限</span>
          <input className="inp" type="number" min={0} max={750} inputMode="numeric" aria-label="探索区间下限"
            value={range && Number.isFinite(range.low) ? range.low : ""}
            onChange={(event) => {
              const value = event.target.value === "" ? NaN : Number(event.target.value);
              // 还没有区间时以「另一个端点先等于这个值」起步（原来补 750/0 会平白造出一个 0–750 的巨区间），
              // 学生再改另一头就是一段明确的区间。
              setRange((current) => ({ low: value, high: current?.high ?? value,
                basis: "手动填写的探索区间（不来自考试数据）；可随时修改。" }));
            }} /></label>
        <label className="field"><span className="flab">区间上限</span>
          <input className="inp" type="number" min={0} max={750} inputMode="numeric" aria-label="探索区间上限"
            value={range && Number.isFinite(range.high) ? range.high : ""}
            onChange={(event) => {
              const value = event.target.value === "" ? NaN : Number(event.target.value);
              setRange((current) => ({ low: current?.low ?? value, high: value,
                basis: "手动填写的探索区间（不来自考试数据）；可随时修改。" }));
            }} /></label>
      </div>
      {range ? <p className="fhint" style={{ marginTop: 8 }}>{range.basis}</p> : null}
      {/* 「定位」是按考试数据生成区间的地方，但区间不是只能在那边产生：这一页可以直接填上下限，
          有目标分时还能按 ±10 生成（与「定位」页同一条规则）。已有区间时按钮改成「看区间怎么来的」，
          不再对着已经拿着区间的学生说「去生成」——那正是负责人指出的自相矛盾。 */}
      <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
        {!range && state.form.score !== null ? <button type="button" className="btn sm ghost"
          onClick={() => {
            const score = state.form.score!;
            setRange({ low: Math.max(0, score - 10), high: Math.min(750, score + 10),
              basis: "按高考目标分上下各 10 分生成；不是预测区间。" });
            notify("已按高考目标分 ±10 生成探索区间");
          }}>用目标分 ±10 生成区间</button> : null}
        <button type="button" className="btn sm ghost" onClick={() => setPage("locate")}>
          {range ? "去「定位」看区间怎么来的" : "去「定位」按考试数据生成"}</button>
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
      <div className="res-count">{pool
        ? <>区间内匹配到 <b>{pool.schoolCount}</b> 所院校 · <b>{rows.length}</b> 条专业 × 院校</>
        : <>还没有匹配结果</>}</div>
      <div className="legend">
        <span><i style={{ background: "var(--steady)" }} />按专业自己的历史</span>
        <span><i style={{ background: "var(--reach)" }} />只有专业组历史</span>
      </div>
    </div>
    <div className="chart-actions" style={{ justifyContent: "flex-start", marginBottom: 20 }}>
      <button type="button" className="btn brass" disabled={poolPending || !range}
        onClick={() => void matchPool()}>{poolPending ? "正在匹配院校…" : "用这个区间匹配院校"}</button>
      {poolStale ? <span className="gap neg">选科、批次或区间已改变，旧结果已失效，请重新匹配。</span> : null}
      {range ? null : <span className="gap neg">还没有探索区间——在下面填上下限，或去「定位」按考试数据生成。</span>}
    </div>
    {poolError ? <p className="feedback" role="alert">{poolError}</p> : null}

    {pool ? <div className="panel" style={{ marginBottom: 20 }}>
      <div className="stats">
        <div className="stat"><span className="sk"><Icon name="pin" />院校</span>
          <div className="sv num">{pool.schoolCount}</div>
          <div className="sd">区间内至少有一条记录可参考的院校数</div></div>
        <div className="stat"><span className="sk"><Icon name="layers" />专业 × 院校</span>
          <div className="sv num">{rows.length}</div>
          <div className="sd">历史位次与你的位次跨度有交集的记录</div></div>
        <div className="stat"><span className="sk"><Icon name="axis" />你的位次跨度</span>
          <div className="sv num">{pool.rankRange[1].toLocaleString("zh-CN")}–{pool.rankRange[0].toLocaleString("zh-CN")}</div>
          <div className="sd">由区间两端按 {pool.referenceYear} 年分段表换算</div></div>
        <div className="stat"><span className="sk"><Icon name="wave" />缺历史依据</span>
          <div className="sv num">{pool.missingHistory}</div>
          <div className="sd">条记录没有可用历史，未进入结果，不补造数字</div></div>
      </div>
      <p className="fhint" style={{ marginTop: 10 }}>按 {pool.referenceYear} 年同科类历史位次筛选（发布版本 {pool.releaseId}）；这决定「先看谁」，不构成任何录取判断。</p>
    </div> : null}

    <div className="axis-cards" ref={cardsRef}>
      {rows.length > 0
        ? narrowAxis
          // 手机端：大类收成抽屉，点开看它的小类与卡片（与航线图同款，堆叠与展开动效同源）。
          ? <div className="deck">
            {grouped.map((category) => {
              const key = `axis:${category.name}`;
              const open = openCategory === key;
              const entry = picked.find((item) => item.category.name === category.name);
              return <div className={`stop${open ? " open" : ""}`} key={key}>
                <button type="button" className="stop-head" aria-expanded={open}
                  onClick={() => setOpenCategory(open ? null : key)}>
                  <span className="mk">{category.classes.length} 个专业类</span>
                  <h4>{category.name}</h4>
                  <span className="sc-cat-count">{category.total} 条</span>
                  <span className="stop-cue"><Icon name="chevron" /></span>
                </button>
                {open ? <div className="stop-body">
                  {entry ? entry.classes.map((cls) => <div className="sc-class" key={cls.name}>
                    <div className="sc-class-head">
                      <span>{cls.name}</span>
                      <span>{cls.total} 条{cls.total > cls.rows.length ? ` · 列前 ${cls.rows.length}` : ""}</span>
                    </div>
                    <div className="schools" style={{ marginTop: 0 }}>{cls.rows.map((row) => renderCard(row))}</div>
                  </div>) : <p className="muted-note">这个大类没有展开的卡片。</p>}
                </div> : null}
              </div>;
            })}
          </div>
          // 宽屏：平铺的分组列表——大类标题 → 小类标题 → 卡片。
          : <>{picked.map((entry) => <section className="sc-cat" key={entry.category.name}>
            <div className="sc-cat-head">
              <h4 className="song">{entry.category.name}</h4>
              <span>{entry.category.total} 条 · {entry.category.classes.length} 个专业类</span>
            </div>
            {entry.classes.map((cls) => <div className="sc-class" key={cls.name}>
              <div className="sc-class-head">
                <span>{cls.name}</span>
                <span>{cls.total} 条{cls.total > cls.rows.length ? ` · 列前 ${cls.rows.length}` : ""}</span>
              </div>
              <div className="schools" style={{ marginTop: 0 }}>{cls.rows.map((row) => renderCard(row))}</div>
            </div>)}
          </section>)}</>
        : <div className="empty">
          <Icon name="compass" size="xl" />
          <h3>{poolPending ? "正在匹配院校…" : pool ? "当前区间没有命中记录" : "还没有可展示的院校"}</h3>
          <p>{pool
            ? "可以回到「定位」把区间稍微放宽，再点一次匹配；结果不会自动扩大范围。"
            : range
              ? "区间已经有了：选好批次，点上面的「用这个区间匹配院校」。区间端点超出分段表公布范围时，页面会如实提示。"
              : "先在这一页填上下限（或去「定位」按考试数据生成），选好批次，然后点「用这个区间匹配院校」。区间端点超出分段表公布范围时，页面会如实提示。"}</p>
        </div>}
    </div>
    <p className="fhint" style={{ margin: "22px 2px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
      <Icon name="doc" /><span>院校录取位次来自发布数据；未提供时显示为未知，不编造数字。超过 60 条时先展示前 60 条，完整结果在「航线图」按你的两条线分别给出。</span></p>
    <div className="banner">
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}><Icon name="route" size="lg" />
        <div><h3 className="song">院校池有了，去「航线图」看两条线的结果</h3><p>方向在上一站已经定好：AI 建议线和你的自选线在「航线图」分开列出——一致合成一条，不一致各走一条。</p></div></div>
      <button type="button" className="btn sm brass" style={{ flexShrink: 0 }} onClick={() => setPage("chart")}>去航线图<Icon name="arrow" /></button>
    </div>
  </section>;
}
