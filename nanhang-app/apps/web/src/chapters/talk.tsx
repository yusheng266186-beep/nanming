import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { ANSWER_STARTERS, QUESTIONS, type WebState } from "../model.js";
import { AI_NOTICE, MODE_CHOICES, THINKING_CHOICES, disableAi, enableAi, isReplyStale, withMode, withTier,
  type AiPanelState } from "../ai-panel.js";
import { Icon } from "../art.js";
import { AnswerStarters, ChatBubble, StreamedText, TypingDots } from "../chat.js";
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
}

export function renderTalk({ state, page, setPage, drafts, setDrafts, talkStep, setTalkStep, thinking,
  setThinking, reducedMotion, chatScrollRef, questionsDone, canConfirmDirections, saveAnswer, skip,
  notify, ai, setAi, aiSeq, aiCode, setAiCode, aiDraft, setAiDraft, exchangeCode, sendAi }: TalkProps) {
  const current = QUESTIONS[Math.min(talkStep, QUESTIONS.length - 1)]!;
  const draft = drafts[current.questionId] ?? "";
  const answered = state.answers.find((item) => item.questionId === current.questionId);
  const answeredCurrent = state.answers.filter((item) => item.questionId === current.questionId).length > 0;
  const starters = ANSWER_STARTERS[current.questionId] ?? [];
  // 换题时先显示「正在输入」，再逐字显示问题——与原作的节奏一致（还原为 reduced motion 时省略）。
  const advance = () => {
    const next = Math.min(talkStep + 1, QUESTIONS.length - 1);
    if (next === talkStep) return;
    if (reducedMotion) { setThinking(false); setTalkStep(next); return; }
    setThinking(true);
    setTalkStep(next);
    window.setTimeout(() => setThinking(false), 520);
  };
  return <section id="page-talk" className={`view${page === "talk" ? " active" : ""}`} aria-label="谈心">
    <div className="page-head">
      <div><span className="eyebrow">Chapter 04 · 谈心 · 问心</span>
        <h1 className="song">不急着选专业，<em>先认识你。</em></h1>
        <p className="lede">重点不是选科，而是兴趣、擅长、讨厌的工作环境、动手还是理论、是否读研、能否接受外地。每题都可以跳过，只有你保存的原话才能成为方向证据。</p></div>
      <div className="head-aside">
        <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
        <p>反向的问题，<br />往往比正向更准。</p></div>
    </div>
    <div className="talk">
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
      <div className="banner">
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}><Icon name="gear" size="lg" />
          <div><h3 className="song">AI 只负责理解人，事实一律可溯源</h3><p>兴趣、性格、价值偏好由模型辅助；是否招生、招多少人、去年最低分与位次一律来自数据库。AI 绝不猜录取分数。</p></div></div>
      </div>
      <div className={`panel${ai.enabled ? "" : " off"}`} style={{ marginTop: 18 }} id="ai">
        <h3><Icon name="spark" />可选 AI 谈心</h3>
        <p className="psub"><span className={`badge-status ${ai.enabled ? "CONFIRMED" : "PENDING"}`}>{ai.enabled ? "已启用" : "已关闭（默认）"}</span> · {AI_NOTICE}</p>
        <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 0 }}>
          {!ai.enabled
            ? <button type="button" className="btn sm" onClick={() => setAi(enableAi(ai))}>启用 AI（可选）</button>
            : <button type="button" className="btn sm ghost" onClick={() => { aiSeq.current += 1; setAi(disableAi(ai)); setAiDraft(""); }}>关闭 AI</button>}
        </div>
        {ai.enabled ? <>
          {!ai.connected ? <div className="field" style={{ marginTop: 16 }}>
            <span className="flab">本地访问码</span>
            <div className="dock-row">
              <input className="inp" type="text" value={aiCode} placeholder="本地试用访问码" onChange={(event) => setAiCode(event.target.value)} />
              <button type="button" className="btn sm" onClick={exchangeCode}>兑换访问码</button>
            </div>
            <p className="fhint">本地服务地址：{ai.apiBase}（可用 VITE_NANHANG_API_BASE 覆盖）</p>
          </div> : null}
          <label className="field" style={{ marginTop: 16 }}>
            <span className="flab">你想说的</span>
            <textarea className="inp" rows={3} value={aiDraft} placeholder="用你自己的话描述一段经历；AI 也会要求你本人确认后才生效。"
              onChange={(event) => setAiDraft(event.target.value)} />
          </label>
          <div className="field" style={{ marginTop: 16 }}>
            <span className="flab">聊法 · 由你选</span>
            <div className="voyage-pick">
              {MODE_CHOICES.map((choice) => <button key={choice.value} type="button" className="voyage-card"
                aria-pressed={ai.mode === choice.value}
                onClick={() => setAi(withMode(ai, choice.value))}>
                <span className="vc-name">{choice.label}</span>
                <span className="vc-hint">{choice.hint}</span>
              </button>)}
            </div>
            <p className="fhint">两种都由你定，随时可换、下一轮生效；已经聊过的内容不受影响。</p>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <span className="flab">回答方式</span>
            <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 0 }}>
              {THINKING_CHOICES.map((choice) => <button key={choice.value} type="button"
                className={`btn sm${ai.tier === choice.value ? " brass" : " ghost"}`}
                onClick={() => setAi(withTier(ai, choice.value))}>{choice.label}</button>)}
            </div>
            <p className="fhint">{THINKING_CHOICES.find((choice) => choice.value === ai.tier)?.hint}切换后下一轮生效。</p>
          </div>
          <div className="chart-actions" style={{ justifyContent: "flex-start" }}>
            <button type="button" className="btn sm brass" onClick={() => void sendAi()} disabled={ai.pending || !ai.connected}>{ai.pending ? "等待回复…" : "发送给 AI"}</button>
            <small className="muted-note">AI 不可用时，浏览、探索、匹配与航线图全部照常可用。</small>
          </div>
          {ai.status ? <p className="feedback">{ai.status}</p> : null}
          {ai.reply ? <div className={`ai-reply${isReplyStale(ai, state.generation) ? " stale" : ""}`}>
            {isReplyStale(ai, state.generation) ? <p className="feedback">输入已改变，这条 AI 回复不再对应当前情况；重新发送可获得新的建议。</p> : null}
            {ai.reply}</div> : null}
          {ai.mode === "guided" && ai.options.length > 0 ? <div className="field" style={{ marginTop: 14 }}>
            <span className="flab">可以直接选一个</span>
            <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 0 }}>
              {ai.options.map((option) => <button key={option} type="button" className="btn sm"
                disabled={ai.pending || !ai.connected}
                onClick={() => void sendAi(option)}>{option}</button>)}
            </div>
            <p className="fhint">点一下就以你的名义发出去；不想用就自己写。</p>
          </div> : null}
          {ai.suggestions.length ? <ul className="tick-list" style={{ marginTop: 14 }}>{ai.suggestions.map((item) => <li key={item.rationale}>
            <Icon name="check" /><span><b>{item.directionId}</b>：{item.rationale}<br /><small>证据：{item.evidenceIds.join("、")}（需你在「方向」章节本人确认）</small></span></li>)}</ul> : null}
          {ai.actions.length ? <ul className="tick-list" style={{ marginTop: 14 }}>{ai.actions.map((action) => <li key={action}><Icon name="arrow" /><span>{action}</span></li>)}</ul> : null}
        </> : <p className="muted-note">关闭时不会发起任何网络请求。AI 不能修改资格、位次或数据发布状态。</p>}
      </div>
    </div>
  </section>;
}
