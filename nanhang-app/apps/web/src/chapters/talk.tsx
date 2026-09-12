import { useEffect, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { ANSWER_STARTERS, QUESTIONS, type WebState } from "../model.js";
import { MODE_CHOICES, THINKING_CHOICES, enableAi, withMode, withStarted, withTier,
  type AiPanelState } from "../ai-panel.js";
import { Icon } from "../art.js";
import { AnswerStarters, ChatBubble, StreamedText, TypingDots } from "../chat.js";
import type { SchoolPool } from "../journey-model.js";
import type { PageId } from "./shared.js";

export interface TalkProps {
  state: WebState;
  page: PageId;
  setPage: Dispatch<SetStateAction<PageId>>;
  drafts: Record<string, string>;
  setDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  talkStep: number;
  setTalkStep: Dispatch<SetStateAction<number>>;
  thinking: boolean;
  setThinking: Dispatch<SetStateAction<boolean>>;
  reducedMotion: boolean;
  chatScrollRef: MutableRefObject<HTMLDivElement | null>;
  questionsDone: number;
  canConfirmDirections: boolean;
  saveAnswer: (questionId: string) => void;
  skip: (questionId: string) => void;
  notify: (message: string) => void;
  ai: AiPanelState;
  setAi: Dispatch<SetStateAction<AiPanelState>>;
  aiSeq: MutableRefObject<number>;
  aiCode: string;
  setAiCode: Dispatch<SetStateAction<string>>;
  aiDraft: string;
  setAiDraft: Dispatch<SetStateAction<string>>;
  exchangeCode: () => Promise<void>;
  sendAi: (override?: string) => Promise<void>;
  saveChatEvidence: (text: string) => void;
  pool: SchoolPool | null;
  quoteFor: (evidenceId: string) => string | null;
  hasChatted: boolean;
}

export function renderTalk({ state, page, setPage, drafts, setDrafts, talkStep, setTalkStep, thinking,
  setThinking, reducedMotion, chatScrollRef, questionsDone, canConfirmDirections, saveAnswer, skip,
  notify, ai, setAi, aiCode, setAiCode, aiDraft, setAiDraft, exchangeCode, sendAi,
  saveChatEvidence, pool, quoteFor, hasChatted }: TalkProps) {
  // 谈心以 AI 谈心为主路径：进入本页即启用 AI（其它页面的无 AI 可用性不变）。
  useEffect(() => {
    if (page === "talk") setAi((current) => current.enabled ? current : enableAi(current));
  }, [page, setAi]);

  // ---- 经典问答（无 AI 兜底）的内部节奏，保持与原实现一致 ----
  const current = QUESTIONS[Math.min(talkStep, QUESTIONS.length - 1)]!;
  const draft = drafts[current.questionId] ?? "";
  const answered = state.answers.find((item) => item.questionId === current.questionId);
  const answeredCurrent = state.answers.filter((item) => item.questionId === current.questionId).length > 0;
  const starters = ANSWER_STARTERS[current.questionId] ?? [];
  const advance = () => {
    const next = Math.min(talkStep + 1, QUESTIONS.length - 1);
    if (next === talkStep) return;
    if (reducedMotion) { setThinking(false); setTalkStep(next); return; }
    setThinking(true);
    setTalkStep(next);
    window.setTimeout(() => setThinking(false), 520);
  };

  // 二选一选完聊法就进入对话；对话里的每句原话都可以由学生亲手存为方向证据。
  const [classicOpen, setClassicOpen] = useState(false);

  const classicFlow = <div className="talk">
    <div className="chat">
      <div className="chat-scroll" ref={chatScrollRef}>
        <ChatBubble from="ai">
          我们一句一句来。你写下的原话会作为方向证据保存；跳过则不会生成任何结论。
        </ChatBubble>
        {state.answers.map((answer) => <ChatBubble from="me" key={answer.evidenceId}>
          {answer.text}
        </ChatBubble>)}
        <ChatBubble from="ai">
          {thinking
            ? <TypingDots label="溟在听 · 想着怎么问你" />
            : <StreamedText key={current.questionId} animate={!reducedMotion}
              main={`第 ${talkStep + 1} 个问题。`}
              ask={current.text} />}
        </ChatBubble>
      </div>
      <div className="dock">
        <AnswerStarters starters={starters} disabled={answeredCurrent}
          onPick={(text) => setDrafts((values) => ({ ...values, [current.questionId]: text }))} />
        <label className="field" style={{ marginBottom: 12 }}>
          <span className="flab">{current.text}</span>
          <textarea className="inp" rows={3} value={draft} aria-label={current.text}
            placeholder={starters.length ? "可以点上面的起点，再改成你自己的话……" : "想说的话，直接写下来……"}
            onChange={(event) => setDrafts((values) => ({ ...values, [current.questionId]: event.target.value }))} />
        </label>
        <p className="expl">{current.explanation}</p>
        <div className="dock-row" style={{ marginTop: 12 }}>
          <button type="button" className="btn sm brass" onClick={() => { saveAnswer(current.questionId); advance(); }}>保存回答<Icon name="arrow" /></button>
          <button type="button" className="btn sm ghost" onClick={() => { skip(current.questionId); advance(); }}>跳过</button>
          {answered ? <span className="muted-note">本题已保存为证据</span> : null}
        </div>
      </div>
    </div>
    <div className="talk-meta">
      <span className="eyebrow plain">第 {talkStep + 1} / {QUESTIONS.length} 问</span>
      <span className="prog"><span style={{ width: `${Math.round(questionsDone / QUESTIONS.length * 100)}%` }} /></span>
      <button type="button" className="tbtn" disabled={!canConfirmDirections} onClick={() => { setPage("direction"); notify(canConfirmDirections ? "已根据你的原话生成待确认方向" : "请先保存第一题中属于你自己的具体表达"); }}>生成我的方向<Icon name="arrow" /></button>
    </div>
  </div>;

  return <section id="page-talk" className={`view${page === "talk" ? " active" : ""}`} aria-label="谈心">
    <div className="page-head">
      <div><span className="eyebrow">Chapter 04 · 谈心 · 问心</span>
        <h1 className="song">不急着选专业，<em>先认识你。</em></h1>
        <p className="lede">谈心由 AI 主持：它只提问、只倾听，你说的话由你亲手保存后才成为方向证据。是否招生、招多少人、去年最低分一律来自数据库，AI 绝不猜录取分数。</p></div>
      <div className="head-aside">
        <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
        <p>反向的问题，<br />往往比正向更准。</p></div>
    </div>

    {!ai.started ? <div className="panel" style={{ marginTop: 8 }}>
      <h3><Icon name="spark" />选择你的聊法</h3>
      <p className="psub">两种聊法随时可以在对话里互换，已经聊过的内容不受影响。</p>
      <div className="voyage-pick" style={{ marginTop: 16 }}>
        {MODE_CHOICES.map((choice) => <button key={choice.value} type="button" className="voyage-card"
          aria-pressed={ai.mode === choice.value}
          onClick={() => setAi(withMode(ai, choice.value))}>
          <span className="vc-name">{choice.label}</span>
          <span className="vc-hint">{choice.hint}</span>
        </button>)}
      </div>
      <div className="field" style={{ marginTop: 18 }}>
        <span className="flab">回答节奏</span>
        <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 0 }}>
          {THINKING_CHOICES.map((choice) => <button key={choice.value} type="button"
            className={`btn sm${ai.tier === choice.value ? " brass" : " ghost"}`}
            onClick={() => setAi(withTier(ai, choice.value))}>{choice.label}</button>)}
        </div>
        <p className="fhint">{THINKING_CHOICES.find((choice) => choice.value === ai.tier)?.hint}</p>
      </div>
      <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 18 }}>
        <button type="button" className="btn brass" onClick={() => setAi(withStarted(ai))}>开始谈心<Icon name="arrow" /></button>
        <small className="muted-note">需要 AI 服务在线；连不上时下面的经典问答照常可用。</small>
      </div>
    </div>
    : <div className="talk">
      <div className="chat">
        <div className="chat-scroll" ref={chatScrollRef}>
          <ChatBubble from="ai">
            {ai.mode === "guided"
              ? "我们一句一句来。每一步我都会摆几个现成的答案，点一下就算你答了；想自己写也可以。"
              : "泛舟开始。不设路线，想说什么说什么，说多短都行——用自己的话答，它听得更认真。"}
          </ChatBubble>
          {ai.history.map((turn, index) => <ChatBubble key={`${turn.role}-${index}`}
            from={turn.role === "user" ? "me" : "ai"}>
            {turn.text}
            {turn.role === "user" ? <span style={{ display: "block", marginTop: 8 }}>
              <button type="button" className="tbtn"
                disabled={state.answers.some((item) => item.text === turn.text)}
                onClick={() => saveChatEvidence(turn.text)}>
                {state.answers.some((item) => item.text === turn.text) ? "已存为方向证据" : "存为方向证据"}
              </button></span> : null}
          </ChatBubble>)}
          {ai.pending ? <ChatBubble from="ai"><TypingDots label="溟在想 · 稍等" /></ChatBubble> : null}
        </div>
        <div className="dock">
          {!ai.connected ? <div className="field">
            <span className="flab">连接 AI 服务</span>
            <div className="dock-row">
              <input className="inp" type="text" value={aiCode} placeholder="访问码"
                onChange={(event) => setAiCode(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") void exchangeCode(); }} />
              <button type="button" className="btn sm" onClick={() => void exchangeCode()}>连接</button>
            </div>
            <p className="fhint">{ai.status ?? `服务地址：${ai.apiBase}（可用 VITE_NANHANG_API_BASE 覆盖）`}。连不上也没关系——下面的经典问答照常可用。</p>
          </div> : <>
            {ai.mode === "guided" && ai.options.length > 0 ? <div className="field" style={{ marginBottom: 12 }}>
              <span className="flab">可以直接选一个</span>
              <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 0 }}>
                {ai.options.map((option) => <button key={option} type="button" className="btn sm"
                  disabled={ai.pending} onClick={() => void sendAi(option)}>{option}</button>)}
              </div>
              <p className="fhint">点一下就以你的名义发出去；不想用就自己写。</p>
            </div> : null}
            <label className="field" style={{ marginBottom: 12 }}>
              <span className="flab">{ai.mode === "guided" ? "或者用自己的话" : "你想说的"}</span>
              <textarea className="inp" rows={3} value={aiDraft}
                placeholder={ai.mode === "guided" ? "选项都不合适？直接写你的版本……" : "想说的话，直接写下来……"}
                onChange={(event) => setAiDraft(event.target.value)} />
            </label>
            <div className="dock-row" style={{ marginTop: 4, flexWrap: "wrap" }}>
              <button type="button" className="btn sm brass" onClick={() => void sendAi()}
                disabled={ai.pending}>{ai.pending ? "等待回复…" : "发送"}</button>
              {MODE_CHOICES.map((choice) => <button key={choice.value} type="button"
                className={`chip${ai.mode === choice.value ? " brass on" : ""}`}
                aria-pressed={ai.mode === choice.value}
                onClick={() => setAi(withMode(ai, choice.value))}>{choice.label}</button>)}
              {THINKING_CHOICES.map((choice) => <button key={choice.value} type="button"
                className={`chip${ai.tier === choice.value ? " on" : ""}`}
                aria-pressed={ai.tier === choice.value}
                onClick={() => setAi(withTier(ai, choice.value))}>{choice.label}</button>)}
            </div>
            <p className="fhint">聊法与节奏下一轮生效。你说的每句话都会作为「你自己的表达」提供给 AI（它只能引用你说过的）；按下「存为方向证据」的，才会进入方向结论。</p>
            {ai.status ? <p className="feedback">{ai.status}</p> : null}
          </>}
        </div>
      </div>
      <div className="talk-meta">
        <span className="eyebrow plain">方向证据 {questionsDone} 条</span>
        <button type="button" className="tbtn" disabled={!hasChatted}
          onClick={() => { setPage("direction"); notify(hasChatted ? "到「方向」看 AI 的建议，再亲自选一次专业" : "先在对话里聊几句，或用经典问答保存一句原话"); }}>去方向 · 选专业<Icon name="arrow" /></button>
      </div>
      {/* AI 的结构化建议：只能来自真实专业目录（与院校池一致），每条都引用学生自己的话。
          它是「AI 推荐线」的来源，与学生的自选在「方向」页同等位置。 */}
      {ai.suggestions.length ? <div className="panel" style={{ marginTop: 18 }}>
        <h3><Icon name="layers" />溟的建议（待你选择）</h3>
        <p className="psub">这些专业类来自你刚才聊到的内容，每一条都引用你的原话。它们只是探索建议——到「方向」页看它们包含的真实专业，再决定保不保留；不和你的自选比高低。</p>
        <div className="grid-2" style={{ marginTop: 14 }}>
          {ai.suggestions.map((item) => {
            const name = pool?.directions.find((entry) => entry.id === item.directionId)?.name ?? item.directionId;
            const quotes = item.evidenceIds.map(quoteFor).filter((quote): quote is string => quote !== null);
            return <div className="sidecard" key={item.directionId}>
              <span className="eyebrow plain">AI 建议 · 引用了你的话</span>
              <h3 className="song" style={{ marginTop: 8 }}>{name}</h3>
              {quotes.map((quote) => <blockquote className="dquote" key={quote}>{quote}</blockquote>)}
              <p className="dwhy">{item.rationale}</p>
            </div>;
          })}
        </div>
        <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 14 }}>
          <button type="button" className="btn sm brass" onClick={() => setPage("direction")}>去方向 · 选专业<Icon name="arrow" /></button>
          <small className="muted-note">建议要配合你的自选一起看：两条线同等位置。</small>
        </div>
      </div> : null}
      <div className="banner">
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}><Icon name="gear" size="lg" />
          <div><h3 className="song">AI 只负责理解人，事实一律可溯源</h3><p>兴趣、性格、价值偏好由模型辅助；是否招生、招多少人、去年最低分与位次一律来自数据库。AI 绝不猜录取分数。</p></div></div>
      </div>
    </div>}

    <details className="panel" style={{ marginTop: 18 }} open={classicOpen}
      onToggle={(event) => setClassicOpen((event.target as HTMLDetailsElement).open)}>
      <summary>不用 AI？经典问答模式（逐题保存，效果相同）</summary>
      {classicOpen ? classicFlow : null}
    </details>
  </section>;
}
