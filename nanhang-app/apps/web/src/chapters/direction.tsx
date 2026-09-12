import type { Dispatch, SetStateAction } from "react";
import { DIRECTIONS, confirm, deny, directionCoverage, reopen, summary, type WebState } from "../model.js";
import { ArtSlot, Icon } from "../art.js";
import { DIRECTION_ARTS, label, majorCardFor, type PageId } from "./shared.js";

export interface DirectionProps {
  state: WebState;
  setState: Dispatch<SetStateAction<WebState>>;
  page: PageId;
  setPage: Dispatch<SetStateAction<PageId>>;
  reading: ReturnType<typeof summary>;
  onlyConfirmed: boolean;
  setOnlyConfirmed: Dispatch<SetStateAction<boolean>>;
  canConfirmDirections: boolean;
  fresh: NonNullable<WebState["match"]>["result"] | null;
  setDetail: Dispatch<SetStateAction<string | null>>;
}

export function renderDirection({ state, setState, page, setPage, reading, onlyConfirmed,
  setOnlyConfirmed, canConfirmDirections, fresh, setDetail }: DirectionProps) {
  return <section id="page-direction" className={`view${page === "direction" ? " active" : ""}`} aria-label="方向">
    <div className="page-head">
      <div><span className="eyebrow">Chapter 05 · 方向 · 定罗盘</span>
        <h1 className="song">几个方向簇，<em>而不是一下三十个专业。</em></h1>
        <p className="lede">方向来自你保存的原话。你可以确认、否认、重新打开，也可以什么都不选。最后决定权在你手里。</p></div>
      <div className="head-aside"><p>方向不是标签，<br />是可以随时调整的罗盘。</p></div>
    </div>
    <div className="res-bar">
      <div className="res-count">已确认 <b>{(reading?.confirmed ?? []).length}</b> 个方向簇</div>
      <div className="rfilters">
        <button className={`chip${onlyConfirmed ? " brass on" : ""}`} type="button" aria-pressed={onlyConfirmed}
          onClick={() => setOnlyConfirmed((value) => !value)}>只看已选</button>
        <button className="chip" type="button" onClick={() => setPage("talk")}>重新谈心</button>
      </div>
    </div>
    {!canConfirmDirections
      ? <div className="empty-inline">先到「谈心」保存第一题中属于你自己的具体表达，确认方向才会有证据支撑。</div>
      : (() => {
        const confirmedIds = new Set((reading?.confirmed ?? []).map((item) => item.directionId));
        // 真实覆盖统计：这些方向在本次搜索范围内实际有多少条专业、多少所院校。
        // 它回答的是「有多少」，不是「有多适合」——项目禁止由兴趣推断专业适合度。
        const coverage = new Map(directionCoverage(fresh?.candidates ?? [], state.catalog)
          .map((item) => [item.directionId, item]));
        const visible = DIRECTIONS.map((direction, index) => ({ direction, index }))
          .filter(({ direction }) => !onlyConfirmed || confirmedIds.has(direction.directionId));
        if (visible.length === 0) {
          return <div className="empty-inline">你还没有确认任何方向。关闭「只看已选」可查看全部方向簇，并点开探索事实卡了解它们。</div>;
        }
        return <div className="dir-grid">{visible.map(({ direction, index }) => {
          const entry = [...(reading?.confirmed ?? []), ...(reading?.denied ?? []), ...(reading?.pending ?? [])]
            .find((item) => item.directionId === direction.directionId);
          const status = entry?.status ?? "PENDING";
          const fact = majorCardFor(direction.directionId);
          // 支撑这个方向的本人原话（第一条）。没有就直接不显示引文，不拿系统措辞充数。
          const quote = entry?.interestEvidence[0] ?? null;
          const cover = coverage.get(direction.directionId);
          return <article className={`dcard${status === "CONFIRMED" ? " picked" : ""}`} key={direction.directionId}>
            <div className="dcard-top">
              <ArtSlot name={DIRECTION_ARTS[index % DIRECTION_ARTS.length]!} />
              <span className={`badge-status ${status}`}>{label(status)}</span>
              {cover && cover.offerings > 0
                ? <span className="fit">本次范围 <b>{cover.offerings}</b> 条</span>
                : null}
            </div>
            <div className="dbody">
              <span className="dkick">{direction.directionId}</span>
              <h3 className="song">{direction.title}</h3>
              {/* 内核：这个方向之所以出现在这里，是因为学生自己说过这句话。
                  引号里必须是他的原话，不是系统的转述；没有原话就只能写「尚未保存」。 */}
              {quote
                ? <blockquote className="dquote">{quote.quote}</blockquote>
                : <p className="dwhy">这个方向还没有你自己的原话支撑。回到「谈心」写下一句具体的经历，确认才会有证据。</p>}
              <p className="dwhy">方向来自你保存的原话。这里显示的是它在本次搜索范围里的真实覆盖，不是对你的适配评分——项目不由兴趣推断专业适合度。</p>
              {cover && cover.offerings > 0
                ? <div className="dmajors">
                  <span>专业 {cover.offerings} 条</span>
                  <span>院校 {cover.institutions} 所</span>
                  {cover.categoryClasses.slice(0, 4).map((name) => <span key={name}>{name}</span>)}
                </div>
                : <div className="dmajors">
                  <span>{fresh ? "本次范围内没有命中的专业" : "先运行一次匹配，才能统计覆盖"}</span>
                </div>}
              {fact
                ? <div className="dreal"><Icon name="layers" /><span>专业事实卡（示例）：{fact.majorName} · {fact.exampleInstitution}</span></div>
                : <div className="dreal"><Icon name="spark" /><span>暂无专业事实卡，仅呈现方向名与你自己的证据。</span></div>}
              <div className="dfoot">
                <span>方向簇 · 你拥有最后决定权</span>
                <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn sm ghost" type="button" onClick={() => setDetail(direction.directionId)}>查看探索事实</button>
                  <button className="btn sm brass" type="button" onClick={() => setState((current) => confirm(current, direction.directionId))}>确认</button>
                  <button className="btn sm ghost" type="button" onClick={() => setState((current) => deny(current, direction.directionId))}>否认</button>
                  <button className="btn sm ghost" type="button" onClick={() => { setState((current) => reopen(current, direction.directionId)); setPage("talk"); }}>重答</button>
                </span>
              </div>
            </div>
          </article>;
        })}</div>;
      })()}
    <p className="fhint" style={{ margin: "14px 2px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
      <Icon name="doc" /><span>方向归类是本项目为浏览而做的（按工作簿的专业类字段），不是官方学科目录；覆盖数字来自当前搜索范围内实际命中的专业，随批次与分数变化。</span></p>
    <p className="feedback" aria-live="polite">{state.notice}</p>
    <div className="banner">
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}><Icon name="axis" size="lg" />
        <div><h3 className="song">选好方向，去拖动你的分数轴</h3><p>把分数、专业、院校三维交叉——拖动目标分，看候选一批批变化。</p></div></div>
      <button type="button" className="btn sm brass" style={{ flexShrink: 0 }} onClick={() => setPage("axis")}>进入分数轴<Icon name="arrow" /></button>
    </div>
  </section>;
}
