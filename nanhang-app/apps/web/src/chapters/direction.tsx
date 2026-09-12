import type { Dispatch, SetStateAction } from "react";
import { Icon } from "../art.js";
import { makeBranches, majorId,
  type CatalogDirection, type CatalogGroup, type Major, type SchoolPool } from "../journey-model.js";
import type { AiSuggestion } from "../ai-panel.js";
import { type PageId } from "./shared.js";

export interface DirectionProps {
  page: PageId;
  setPage: Dispatch<SetStateAction<PageId>>;
  /** 发布包级专业类目录（与分数无关）：自选清单与 AI 建议的名字解析都用它。 */
  catalog: { majors: Major[]; directions: CatalogDirection[]; groups: CatalogGroup[] } | null;
  pool: SchoolPool | null;
  poolStale: boolean;
  suggestions: readonly AiSuggestion[];
  /** 自选小类（专业类 id，≤10）：进入匹配的方向。 */
  picks: readonly string[];
  /** 已选大类（学科门类 id，≤3）：圈定小类的可选范围。 */
  pickedGroups: readonly string[];
  togglePick: (classId: string) => void;
  toggleGroup: (groupId: string) => void;
  quoteFor: (evidenceId: string) => string | null;
  hasChatted: boolean;
  notify: (message: string) => void;
}

const ROUTE_META = [
  { kind: "shared" as const, title: "共同方向", sub: "两条路在这里相遇——AI 的建议和你的选择都包含它们。" },
  { kind: "ai" as const, title: "AI 建议探索", sub: "从对话中发现——只出现在 AI 建议里的专业。" },
  { kind: "self" as const, title: "我的自主选择", sub: "为自己的想法留一条路——只出现在你自选里的专业。" }
];

export function renderDirection({ page, setPage, catalog, pool, poolStale, suggestions, picks,
  pickedGroups, togglePick, toggleGroup, quoteFor, hasChatted, notify }: DirectionProps) {
  const aiIds = suggestions.map((item) => item.directionId);
  const routes = pool ? makeBranches(pool, aiIds, [...picks]) : [];
  // 专业类里的真实专业来自发布包目录（与分数无关）；区间内命中数只在匹配后有。
  const majorsIn = (classId: string) => catalog?.majors.filter((major) => major.directionId === classId) ?? [];
  // 覆盖统计只回答「有多少」，不回答「有多适合」——项目禁止由兴趣推断专业适合度。
  const coverageFor = (classId: string) => {
    if (!pool) return { offerings: 0, institutions: 0 };
    const ids = new Set(majorsIn(classId).map((major) => major.id));
    const rows = pool.rows.filter((row) => ids.has(majorId(row.label.majorName)));
    return { offerings: rows.length, institutions: new Set(rows.map((row) => row.label.institutionName)).size };
  };
  // AI 建议按大类分组：AI 先指出学生在哪个大类里，再给大类下的专业类（小类）。
  const activeGroups = (catalog?.groups ?? []).filter((group) => pickedGroups.includes(group.id));
  const covered = new Set((catalog?.groups ?? []).flatMap((group) => group.classes.map((cls) => cls.id)));
  const restSuggestions = suggestions.filter((item) => !covered.has(item.directionId));

  return <section id="page-direction" className={`view${page === "direction" ? " active" : ""}`} aria-label="方向">
    <div className="page-head">
      <div><span className="eyebrow">Chapter 04 · 方向 · 定罗盘</span>
        <h1 className="song">两条来路，<em>都算数。</em></h1>
        <p className="lede">方向不是系统判给你的：AI 会根据你在「谈心」里说过的原话给一条线，你自己再选一条线。
          两条一致就合成一条，不一致就各走各的——最后的专业和院校按两条线分开给你，系统不打分、不排先后。</p></div>
      <div className="head-aside">
        <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
        <p>建议是参考，<br />选择是你自己的。</p></div>
    </div>

    {!hasChatted ? <>
      <div className="empty-inline">先到「谈心」和 AI 聊几句——聊过之后，这里才会解锁：AI 给出有原话依据的建议，你再亲自选一次专业。
        这一步不能跳过，跳过它，选专业就失去了认识自己的前提。</div>
      <div className="banner">
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}><Icon name="chat" size="lg" />
          <div><h3 className="song">先聊，再选</h3><p>谈心有两种聊法：引航一步步给你现成的答案起点，泛舟不设路线随便说。说多短都行。</p></div></div>
        <button type="button" className="btn sm brass" style={{ flexShrink: 0 }} onClick={() => setPage("talk")}>去谈心<Icon name="arrow" /></button>
      </div>
    </> : <>
      {!catalog ? <>
        <div className="empty-inline">发布库的专业类目录还没有准备好（发布数据载入后自动出现），稍等或刷新后再试。</div>
      </> : <>
        {poolStale ? <p className="feedback">选科、批次或区间已改变，下面的覆盖数字按上一次匹配的院校池计算；建议回「分数轴」重新匹配。</p> : null}

        {/* 块一：AI 推荐线——来自谈心，引用原话，展开为池内真实专业。 */}
        <div className="panel" style={{ marginTop: 8 }}>
          <h3><Icon name="chat" />溟的建议（AI 推荐线）</h3>
          <p className="psub">这些专业类来自你聊过的内容，每一条都引用你的原话；它们是探索建议，不是结论，
            也不会因为 AI 提过就排在你的选择前面。</p>
          {suggestions.length === 0
            ? <div className="empty-inline">这次对话还没有形成有依据的建议。多聊一些具体的经历——做过的事、愿意反复做的事——建议会出现在这里，并引用你自己的话。</div>
            : <>
              {/* AI 先指出大类，再给大类下的专业类（小类）——两级都来自真实目录。 */}
              {catalog.groups.map((group) => {
                const items = suggestions.filter((item) => group.classes.some((cls) => cls.id === item.directionId));
                if (!items.length) return null;
                return <div key={group.id} style={{ marginTop: 16 }}>
                  <span className="eyebrow plain">{group.name} · 溟建议在这一类里探索</span>
                  <div className="grid-2" style={{ marginTop: 10 }}>
                    {items.map((item) => {
                      const cls = group.classes.find((entry) => entry.id === item.directionId)!;
                      const cover = coverageFor(item.directionId);
                      const quotes = item.evidenceIds.map(quoteFor).filter((quote): quote is string => quote !== null);
                      return <div className="sidecard" key={item.directionId}>
                        <span className="eyebrow plain">AI 建议 · 引用了你的话</span>
                        <h3 className="song" style={{ marginTop: 8 }}>{cls.name}</h3>
                        {quotes.length ? quotes.map((quote) => <blockquote className="dquote" key={quote}>{quote}</blockquote>)
                          : <p className="dwhy">（这条建议引用的原话已不在当前对话里，仅保留理由。）</p>}
                        <p className="dwhy">{item.rationale}</p>
                        <div className="vlist" style={{ marginTop: 10 }}>
                          <span className="vpill">发布库里 <b>{cls.majors.length}</b> 个专业</span>
                          {pool
                            ? <span className="vpill">区间内命中 <b>{cover.offerings}</b> 条 · <b>{cover.institutions}</b> 所院校</span>
                            : <span className="vpill">去「分数轴」匹配后，这里显示区间内命中的院校</span>}
                        </div>
                        {cls.majors.length ? <div className="dmajors">
                          {cls.majors.slice(0, 6).map((major) => <span key={major.id}>{major.name}</span>)}
                          {cls.majors.length > 6 ? <span>另 {cls.majors.length - 6} 个</span> : null}
                        </div> : null}
                      </div>;
                    })}
                  </div>
                </div>;
              })}
              {restSuggestions.length ? <div style={{ marginTop: 16 }}>
                <span className="eyebrow plain">其他建议</span>
                <div className="grid-2" style={{ marginTop: 10 }}>
                  {restSuggestions.map((item) => {
                    const name = catalog.directions.find((entry) => entry.id === item.directionId)?.name ?? item.directionId;
                    const quotes = item.evidenceIds.map(quoteFor).filter((quote): quote is string => quote !== null);
                    return <div className="sidecard" key={item.directionId}>
                      <span className="eyebrow plain">AI 建议 · 引用了你的话</span>
                      <h3 className="song" style={{ marginTop: 8 }}>{name}</h3>
                      {quotes.length ? quotes.map((quote) => <blockquote className="dquote" key={quote}>{quote}</blockquote>) : null}
                      <p className="dwhy">{item.rationale}</p>
                    </div>;
                  })}
                </div>
              </div> : null}
            </>}
        </div>

        {/* 块二：自选线——两级选择（负责人裁定）：先选大类（2–3 个），再在大类里勾小类（5–10 个）。 */}
        <div className="panel" style={{ marginTop: 22 }}>
          <h3><Icon name="compass" />我的方向（自选线）</h3>
          <p className="psub">先选 2–3 个感兴趣的大类，再在大类里勾 5–10 个专业类（小类）；最后按这些方向去「分数轴」匹配院校与专业。可以和 AI 建议选一样的，也完全可以不一样——两条线都会保留到最后的航线里。</p>
          <span className="flab">第一步 · 选大类（已选 {pickedGroups.length} / 3）</span>
          <div className="chips" style={{ marginTop: 10 }}>
            {catalog.groups.map((group) => <button key={group.id} type="button"
              className={`chip${pickedGroups.includes(group.id) ? " brass on" : ""}`}
              aria-pressed={pickedGroups.includes(group.id)}
              onClick={() => toggleGroup(group.id)}>
              {group.name}<small> · {group.classes.length} 类</small>
            </button>)}
          </div>
          {pickedGroups.length === 0 ? <p className="fhint" style={{ marginTop: 12 }}>先点上面的大类；选好后，这里会展开每个大类里的专业类供你勾选。</p> : null}
          {activeGroups.map((group) => <div key={group.id} style={{ marginTop: 18 }}>
            <span className="flab">在「{group.name}」里勾专业类（已勾 {picks.length} / 10）</span>
            <div className="chips" style={{ marginTop: 10 }}>
              {group.classes.map((cls) => <button key={cls.id} type="button"
                className={`chip${picks.includes(cls.id) ? " brass on" : ""}`}
                aria-pressed={picks.includes(cls.id)}
                title={cls.majors.slice(0, 8).map((major) => major.name).join("、") + (cls.majors.length > 8 ? " 等" : "")}
                onClick={() => togglePick(cls.id)}>
                {cls.name}<small> · {cls.majors.length} 个专业</small>
              </button>)}
            </div>
          </div>)}
          {picks.length ? <div className="dmajors" style={{ marginTop: 14 }}>
            {picks.map((id) => <button key={id} type="button" className="chip brass on"
              aria-label={`移除 ${catalog.directions.find((entry) => entry.id === id)?.name ?? id}`}
              onClick={() => togglePick(id)}>{catalog.directions.find((entry) => entry.id === id)?.name ?? id} ×</button>)}
          </div> : <p className="fhint" style={{ marginTop: 12 }}>还没有勾专业类；勾满至少一个，「航线图」里才会出现「我的自主选择」这条线。</p>}
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
            {!pool ? <span className="vpill">还没有院校池：去「分数轴」匹配后，这里显示两条线在区间内的走向。</span> : null}
            {suggestions.length === 0 ? <span className="vpill">AI 线为空：这次对话还没有形成建议。</span> : null}
            {picks.length === 0 ? <span className="vpill">自选线为空：还没有勾选专业类。</span> : null}
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
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}><Icon name="axis" size="lg" />
            <div><h3 className="song">两条线定了，去「分数轴」匹配院校与专业</h3><p>用「定位」生成的探索区间，把区间内可选的院校专业按这两条线捞出来；匹配完成，「航线图」直接给出分线结果。</p></div></div>
          <button type="button" className="btn sm brass" style={{ flexShrink: 0 }}
            onClick={() => { if (!picks.length && !suggestions.length) { notify("两条线都还空着：先聊出建议，或选大类、勾专业类。"); return; } setPage("axis"); }}>
            去分数轴匹配<Icon name="arrow" /></button>
        </div>
      </>}
    </>}
    <p className="fhint" style={{ margin: "14px 2px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
      <Icon name="doc" /><span>专业与专业类名称全部来自当前发布库与匹配结果；AI 只能从这份目录里挑建议，挑不出的进不了页面。系统不生成任何「适合度」「录取概率」或权重。</span></p>
  </section>;
}
