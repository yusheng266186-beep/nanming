import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { MODE_CHOICES, THINKING_CHOICES, enableAi, withMode, withStarted,
  type AiPanelState } from "../ai-panel.js";
import { Icon } from "../art.js";
import { ChatBubble, TypingDots } from "../chat.js";
import type { CatalogDirection, CatalogGroup, Major } from "../journey-model.js";
import type { PageId } from "./shared.js";

export interface TalkProps {
  page: PageId;
  setPage: Dispatch<SetStateAction<PageId>>;
  chatScrollRef: MutableRefObject<HTMLDivElement | null>;
  notify: (message: string) => void;
  ai: AiPanelState;
  setAi: Dispatch<SetStateAction<AiPanelState>>;
  aiCode: string;
  setAiCode: Dispatch<SetStateAction<string>>;
  aiDraft: string;
  setAiDraft: Dispatch<SetStateAction<string>>;
  exchangeCode: () => Promise<void>;
  sendAi: (override?: string) => Promise<void>;
  catalog: { majors: Major[]; directions: CatalogDirection[]; groups: CatalogGroup[] } | null;
  quoteFor: (evidenceId: string) => string | null;
  hasChatted: boolean;
}

export function renderTalk({ page, setPage, chatScrollRef, notify, ai, setAi,
  aiCode, setAiCode, aiDraft, setAiDraft, exchangeCode, sendAi, catalog, quoteFor,
  hasChatted }: TalkProps) {
  // 谈心以 AI 谈心为主路径：进入本页即启用 AI（其它页面的无 AI 可用性不变）。
  useEffect(() => {
    if (page === "talk") setAi((current) => current.enabled ? current : enableAi(current));
  }, [page, setAi]);

  const tierOf = THINKING_CHOICES.find((choice) => choice.value === ai.tier);

  return <section id="page-talk" className={`view${page === "talk" ? " active" : ""}`} aria-label="谈心">
    <div className="page-head">
      <div><span className="eyebrow">Chapter 03 · 谈心 · 问心</span>
        <h1 className="song">不急着选专业，<em>先认识你。</em></h1>
        <p className="lede">谈心由 AI 主持：它只提问、只倾听，听懂你之后才谈方向。是否招生、招多少人、去年最低分一律来自数据库，AI 绝不猜录取分数。</p></div>
      <div className="head-aside">
        <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
        <p>反向的问题，<br />往往比正向更准。</p></div>
    </div>

    {!ai.started ? <div className="panel" style={{ marginTop: 8 }}>
      <h3><Icon name="spark" />选择你的聊法</h3>
      <p className="psub">两种聊法随时可以在对话里互换，已经聊过的内容不受影响。谈心必须与 AI 进行——聊过之后，才能进入「方向」自选专业。</p>
      <div className="voyage-pick" style={{ marginTop: 16 }}>
        {MODE_CHOICES.map((choice) => <button key={choice.value} type="button" className="voyage-card"
          aria-pressed={ai.mode === choice.value}
          onClick={() => setAi(withMode(ai, choice.value))}>
          <span className="vc-name">{choice.label}</span>
          <span className="vc-hint">{choice.hint}</span>
        </button>)}
      </div>
      {/* 思考深度已收进顶栏「溟」→ 设置：同一件事不在两个章节各放一份。 */}
      <p className="fhint" style={{ marginTop: 14 }}>回答的思考深度在顶栏右上角的「溟」→ 设置里，开始前后都可以换。</p>
      <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 18 }}>
        <button type="button" className="btn brass" onClick={() => setAi(withStarted(ai))}>开始谈心<Icon name="arrow" /></button>
        <small className="muted-note">连接需要访问码，由老师发放。</small>
      </div>
    </div>
    : <div className="talk">
      <div className="chat">
        <div className="chat-head">
          <span className="ch-name">溟 · 谈心</span>
          <span className={`ch-state${ai.connected ? " on" : ""}`}>{ai.connected ? "已连接" : "未连接"}</span>
          {tierOf ? <span className="ch-tier" title={tierOf.hint}>深度 {tierOf.label} · {tierOf.eta}</span> : null}
        </div>
        <div className="chat-scroll" ref={chatScrollRef}>
          <ChatBubble from="ai">
            {ai.mode === "guided"
              ? "我们一句一句来。每一步我都会摆几个现成的答案，点一下就算你答了；想自己写也可以。"
              : "泛舟开始。不设路线，想说什么说什么，说多短都行——用自己的话答，它听得更认真。"}
          </ChatBubble>
          {ai.history.map((turn, index) => <ChatBubble key={`${turn.role}-${index}`}
            from={turn.role === "user" ? "me" : "ai"}>
            {turn.text}
          </ChatBubble>)}
          {ai.pending ? <ChatBubble from="ai"><TypingDots label="溟在想 · 稍等" /></ChatBubble> : null}
        </div>
        <div className="dock">
          {!ai.connected ? <>
            <div className="dock-row connect">
              <input className="inp" type="text" value={aiCode} placeholder="输入访问码（老师发放）"
                aria-label="AI 服务访问码"
                onChange={(event) => setAiCode(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") void exchangeCode(); }} />
              <button type="button" className="btn sm" onClick={() => void exchangeCode()}>连接</button>
            </div>
            <p className="fhint">{ai.status ?? "连接后即可开始对话；连不上请检查本地服务或向老师核对访问码。"}</p>
          </> : <>
            {ai.mode === "guided" && ai.options.length > 0 ? <div className="qopts">
              {ai.options.map((option) => <button key={option} type="button" className="qopt"
                disabled={ai.pending} onClick={() => void sendAi(option)}>{option}</button>)}
            </div> : null}
            <div className="dock-row">
              <textarea className="inp" rows={2} value={aiDraft}
                placeholder={ai.mode === "guided" ? "选项都不合适？直接写你的版本……" : "想说的话，直接写下来……"}
                onChange={(event) => setAiDraft(event.target.value)} />
              <button type="button" className="send" aria-label="发送" disabled={ai.pending}
                onClick={() => void sendAi()}><Icon name="arrow" /></button>
            </div>
            {/* 聊法在进对话之前选定（负责人 2026-09-12：进来之后不再给切换按钮）；
                当前档位仍显示在对话头部，学生知道自己这句话是按哪一档答的。 */}
            {ai.status ? <p className="feedback">{ai.status}</p> : null}
          </>}
        </div>
      </div>
      <div className="talk-meta">
        <button type="button" className="tbtn" disabled={!hasChatted}
          onClick={() => { setPage("direction"); notify(hasChatted ? "到「方向」看 AI 的建议，再亲自选一次专业" : "先在对话里聊几句"); }}>去方向 · 选专业<Icon name="arrow" /></button>
      </div>
      {/* AI 的结构化建议：只能来自真实专业目录（与发布库一致），按大类分组展示，每条都引用学生自己的话。
          它是「AI 推荐线」的来源，与学生的自选在「方向」页同等位置。 */}
      {ai.suggestions.length ? <div className="panel" style={{ marginTop: 18 }}>
        <h3><Icon name="layers" />溟的建议（待你选择）</h3>
        <p className="psub">AI 先指出你可能在哪个大类里，再给出大类下的专业类（小类），每一条都引用你的原话。它们只是探索建议——到「方向」页先选大类、再勾小类；不和你的自选比高低。</p>
        {(catalog?.groups ?? []).map((group) => {
          const items = ai.suggestions.filter((item) => group.classes.some((cls) => cls.id === item.directionId));
          if (!items.length) return null;
          return <div key={group.id} style={{ marginTop: 16 }}>
            <span className="eyebrow plain">{group.name} · 溟建议在这一类里探索</span>
            <div className="grid-2" style={{ marginTop: 10 }}>
              {items.map((item) => {
                const cls = group.classes.find((entry) => entry.id === item.directionId)!;
                const quotes = item.evidenceIds.map(quoteFor).filter((quote): quote is string => quote !== null);
                return <div className="sidecard" key={item.directionId}>
                  <span className="eyebrow plain">AI 建议 · 引用了你的话</span>
                  <h3 className="song" style={{ marginTop: 8 }}>{cls.name}</h3>
                  {quotes.map((quote) => <blockquote className="dquote" key={quote}>{quote}</blockquote>)}
                  <p className="dwhy">{item.rationale}</p>
                </div>;
              })}
            </div>
          </div>;
        })}
        <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 14 }}>
          <button type="button" className="btn sm brass" onClick={() => setPage("direction")}>下一步：去方向定两条线<Icon name="arrow" /></button>
          <small className="muted-note">在「方向」先选大类、再勾专业类，亲自选一次；两条线定好后再去「分数轴」匹配院校。</small>
        </div>
      </div> : null}
    </div>}
  </section>;
}
