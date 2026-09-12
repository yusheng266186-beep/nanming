import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Icon } from "../art.js";
import { makeBranches, majorId, type SchoolPool } from "../journey-model.js";
import type { AiSuggestion } from "../ai-panel.js";
import { type PageId } from "./shared.js";

export interface DirectionProps {
  page: PageId;
  setPage: Dispatch<SetStateAction<PageId>>;
  pool: SchoolPool | null;
  poolStale: boolean;
  suggestions: readonly AiSuggestion[];
  picks: readonly string[];
  togglePick: (majorId: string) => void;
  quoteFor: (evidenceId: string) => string | null;
  hasChatted: boolean;
  notify: (message: string) => void;
}

const ROUTE_META = [
  { kind: "shared" as const, title: "共同方向", sub: "两条路在这里相遇——AI 的建议和你的选择都包含它们。" },
  { kind: "ai" as const, title: "AI 建议探索", sub: "从对话中发现——只出现在 AI 建议里的专业。" },
  { kind: "self" as const, title: "我的自主选择", sub: "为自己的想法留一条路——只出现在你自选里的专业。" }
];

export function renderDirection({ page, setPage, pool, poolStale, suggestions, picks, togglePick,
  quoteFor, hasChatted, notify }: DirectionProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [visible, setVisible] = useState(36);
  const aiIds = suggestions.map((item) => item.directionId);
  const routes = pool ? makeBranches(pool, aiIds, [...picks]) : [];
  // 覆盖统计只回答「有多少」，不回答「有多适合」——项目禁止由兴趣推断专业适合度。
  const coverageFor = (classId: string) => {
    if (!pool) return { majors: [] as SchoolPool["majors"], offerings: 0, institutions: 0 };
    const majors = pool.majors.filter((major) => major.directionId === classId);
    const ids = new Set(majors.map((major) => major.id));
    const rows = pool.rows.filter((row) => ids.has(majorId(row.label.majorName)));
    return { majors, offerings: rows.length, institutions: new Set(rows.map((row) => row.label.institutionName)).size };
  };
  const filteredMajors = (pool?.majors ?? [])
    .filter((major) => (!filter || major.directionId === filter)
      && (!query || major.name.includes(query) || major.category.includes(query)));
  const pickedMajors = (pool?.majors ?? []).filter((major) => picks.includes(major.id));

  return <section id="page-direction" className={`view${page === "direction" ? " active" : ""}`} aria-label="方向">
    <div className="page-head">
      <div><span className="eyebrow">Chapter 05 · 方向 · 定罗盘</span>
        <h1 className="song">两条来路，<em>都算数。</em></h1>
        <p className="lede">方向不是系统判给你的：AI 会根据你在「谈心」里说过的原话给一条线，你自己再选一条线。
          两条一致就合成一条，不一致就各走各的——最后的专业和院校按两条线分开给你，系统不打分、不排先后。</p></div>
      <div className="head-aside">
        <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
        <p>建议是参考，<br />选择是你自己的。</p></div>
    </div>

    {!hasChatted ? <>
      <div className="empty-inline">先到「谈心」和 AI 聊几句（或用经典问答保存一句你自己的话）——
        聊过之后，这里才会解锁：AI 给出有原话依据的建议，你再亲自选一次专业。这一步不能跳过，跳过它，选专业就失去了认识自己的前提。</div>
      <div className="banner">
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}><Icon name="chat" size="lg" />
          <div><h3 className="song">先聊，再选</h3><p>谈心有两种聊法：引航一步步给你现成的答案起点，泛舟不设路线随便说。说多短都行。</p></div></div>
        <button type="button" className="btn sm brass" style={{ flexShrink: 0 }} onClick={() => setPage("talk")}>去谈心<Icon name="arrow" /></button>
      </div>
    </> : <>
      {!pool ? <>
        <div className="empty-inline">还没有院校池。自选专业要从真实院校池里挑，AI 的建议也要对着真实专业类给——先去「分数轴」用探索区间匹配一次院校。</div>
        <div className="banner">
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}><Icon name="axis" size="lg" />
            <div><h3 className="song">先匹配院校池</h3><p>用「定位」生成的探索区间，把区间内可选的院校与专业捞出来，方向的选择才有落点。</p></div></div>
          <button type="button" className="btn sm brass" style={{ flexShrink: 0 }} onClick={() => setPage("axis")}>去分数轴匹配<Icon name="arrow" /></button>
        </div>
      </> : <>
        {poolStale ? <p className="feedback">选科、批次或区间已改变，下面的覆盖数字按上一次匹配的院校池计算；建议回「分数轴」重新匹配。</p> : null}

        {/* 块一：AI 推荐线——来自谈心，引用原话，展开为池内真实专业。 */}
        <div className="panel" style={{ marginTop: 8 }}>
          <h3><Icon name="chat" />溟的建议（AI 推荐线）</h3>
          <p className="psub">这些专业类来自你聊过的内容，每一条都引用你的原话；它们是探索建议，不是结论，
            也不会因为 AI 提过就排在你的选择前面。</p>
          {suggestions.length === 0
            ? <div className="empty-inline">这次对话还没有形成有依据的建议。多聊一些具体的经历——做过的事、愿意反复做的事——建议会出现在这里，并引用你自己的话。</div>
            : <div className="grid-2" style={{ marginTop: 14 }}>
              {suggestions.map((item) => {
                const name = pool.directions.find((entry) => entry.id === item.directionId)?.name ?? item.directionId;
                const cover = coverageFor(item.directionId);
                const quotes = item.evidenceIds.map(quoteFor).filter((quote): quote is string => quote !== null);
                return <div className="sidecard" key={item.directionId}>
                  <span className="eyebrow plain">AI 建议 · 引用了你的话</span>
                  <h3 className="song" style={{ marginTop: 8 }}>{name}</h3>
                  {quotes.length ? quotes.map((quote) => <blockquote className="dquote" key={quote}>{quote}</blockquote>)
                    : <p className="dwhy">（这条建议引用的原话已不在当前对话里，仅保留理由。）</p>}
                  <p className="dwhy">{item.rationale}</p>
                  <div className="vlist" style={{ marginTop: 10 }}>
                    <span className="vpill">池内专业 <b>{cover.majors.length}</b> 个</span>
                    <span className="vpill">区间内命中 <b>{cover.offerings}</b> 条 · <b>{cover.institutions}</b> 所院校</span>
                  </div>
                  {cover.majors.length ? <div className="dmajors">
                    {cover.majors.slice(0, 6).map((major) => <span key={major.id}>{major.name}</span>)}
                    {cover.majors.length > 6 ? <span>另 {cover.majors.length - 6} 个</span> : null}
                  </div> : null}
                </div>;
              })}
            </div>}
        </div>

        {/* 块二：自选线——从院校池里挑，跟 AI 的建议同等位置。 */}
        <div className="panel" style={{ marginTop: 22 }}>
          <h3><Icon name="compass" />我的专业（自选线）</h3>
          <p className="psub">下面是当前院校池里的真实专业。可以和 AI 建议选一样的，也完全可以不一样——两条线都会保留到最后的航线里。</p>
          <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 14, flexWrap: "wrap" }}>
            <input className="inp" type="search" style={{ maxWidth: 260 }} value={query} aria-label="搜索专业"
              placeholder="按专业名称或专业类查找"
              onChange={(event) => { setQuery(event.target.value); setVisible(36); }} />
            <select className="inp" style={{ maxWidth: 220 }} value={filter} aria-label="按专业类筛选"
              onChange={(event) => { setFilter(event.target.value); setVisible(36); }}>
              <option value="">全部专业类</option>
              {pool.directions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </select>
            <span className="muted-note">找到 {filteredMajors.length} 个专业 · 已选 {picks.length} / 5</span>
          </div>
          <div className="chips" style={{ marginTop: 14 }}>
            {filteredMajors.slice(0, visible).map((major) => (
              <button type="button" key={major.id} className={`chip${picks.includes(major.id) ? " brass on" : ""}`}
                aria-pressed={picks.includes(major.id)}
                onClick={() => togglePick(major.id)}>
                {major.name}<small> {major.category !== major.name ? ` · ${major.category}` : ""}</small>
              </button>))}
          </div>
          {filteredMajors.length === 0 ? <p className="muted-note" style={{ marginTop: 12 }}>院校池里没有找到这个名称，换个关键词试试。</p> : null}
          {filteredMajors.length > visible
            ? <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
              <button type="button" className="btn sm ghost" onClick={() => setVisible((value) => value + 36)}>再显示 36 个</button>
            </div> : null}
          {pickedMajors.length ? <div className="dmajors" style={{ marginTop: 14 }}>
            {pickedMajors.map((major) => <button type="button" key={major.id} className="chip brass on"
              aria-label={`移除 ${major.name}`} onClick={() => togglePick(major.id)}>{major.name} ×</button>)}
          </div> : <p className="fhint" style={{ marginTop: 12 }}>还没有自选。选满至少一个，航线里才会出现「我的自主选择」这条线。</p>}
        </div>

        {/* 块三：两条线的走向——只对照与计数，不裁判、不排权重。 */}
        <div className="panel" style={{ marginTop: 22 }}>
          <h3><Icon name="route" />两条线的走向</h3>
          <p className="psub">相同的专业合并为「共同方向」，各自独有的分两条线；重叠的专业×院校在两条线里都会出现，不去重——它本来就属于两条路。</p>
          <div className="vlist" style={{ marginTop: 14 }}>
            {ROUTE_META.map((meta) => {
              const route = routes.find((item) => item.kind === meta.kind);
              return <span className="vpill" key={meta.kind}>
                {meta.title} <b>{route ? `${route.majors.length} 个专业 · ${route.rows.length} 条记录` : "0"}</b></span>;
            })}
          </div>
          <div className="vlist" style={{ marginTop: 10 }}>
            {routes.length === 0 ? <span className="vpill">两条线都还空着——聊出建议、选好专业后，这里会出现走向。</span> : null}
            {suggestions.length === 0 ? <span className="vpill">AI 线为空：这次对话还没有形成建议。</span> : null}
            {picks.length === 0 ? <span className="vpill">自选线为空：还没有自选专业。</span> : null}
          </div>
          {routes.map((route) => {
            const meta = ROUTE_META.find((item) => item.kind === route.kind)!;
            return <div className="sidecard" style={{ marginTop: 14 }} key={route.kind}>
              <span className="eyebrow plain">{meta.title}</span>
              <p className="fhint" style={{ marginTop: 6 }}>{meta.sub}</p>
              <div className="dmajors" style={{ marginTop: 8 }}>
                {route.majors.slice(0, 10).map((major) => <span key={major.id}>{major.name}</span>)}
                {route.majors.length > 10 ? <span>另 {route.majors.length - 10} 个</span> : null}
              </div>
              <p className="fhint" style={{ marginTop: 8 }}>这条线在区间内命中 {route.rows.length} 条专业 × 院校，完整列表在「航线图」。</p>
            </div>;
          })}
        </div>

        <div className="banner">
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}><Icon name="route" size="lg" />
            <div><h3 className="song">两条线定了，去看你的航线</h3><p>航线图按这两条线把区间内的院校专业分开列给你：一致合一条，不一致各一条。</p></div></div>
          <button type="button" className="btn sm brass" style={{ flexShrink: 0 }}
            onClick={() => { if (!picks.length && !suggestions.length) { notify("两条线都还空着：先聊出建议或自选几个专业。"); return; } setPage("chart"); }}>
            去看航线<Icon name="arrow" /></button>
        </div>
      </>}
    </>}
    <p className="fhint" style={{ margin: "14px 2px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
      <Icon name="doc" /><span>专业与专业类名称全部来自当前发布库与匹配结果；AI 只能从这份目录里挑建议，挑不出的进不了页面。系统不生成任何「适合度」「录取概率」或权重。</span></p>
  </section>;
}
