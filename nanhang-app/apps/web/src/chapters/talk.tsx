import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { MODE_CHOICES, THINKING_CHOICES, enableAi, withMode, withStarted,
  type AiPanelState } from "../ai-panel.js";
import type { ChatMode, ThinkingTier } from "../ai-client.js";
import { Icon } from "../art.js";
import { AnswerStarters, ChatBubble, TypingDots } from "../chat.js";
import { useScrollLock } from "../scroll-lock.js";
import { coveredGroups, directionTalkSettled } from "../direction-quota.js";
import { QUESTIONS } from "@nanhang/exploration";
import type { CatalogDirection, CatalogGroup, Major } from "../journey-model.js";
import type { PageId } from "./shared.js";

/**
 * 开场白。
 *
 * 两个模式的第一句都必须是**问题**——负责人 2026-09-12 指出：进来只看到一句模式说明，
 * 学生不知道自己该说什么。问题取自内容规格里的第一条（任务经历），不另造问法；
 * `hint` 只说这个模式怎么答；`OPENING_STARTERS` 是引航用的现成答案，点一下才发出去，
 * 属于措辞帮助——不点就什么也不算（与既有「回答起点」的约定一致）。
 */
const OPENING_QUESTION = QUESTIONS[0]!.text;
const OPENING_HINT: Record<ChatMode, string> = {
  guided: "每一步我都会摆几个现成的答案，点一下就算你答了；想自己写也可以。",
  open: "不设路线，用你自己的话答，说多短都行。"
};
const OPENING_STARTERS = [
  "整理过一份表格或清单，把重复和缺漏挑出来",
  "给同学讲过一段流程，还写成了步骤",
  "把一个东西拆开看结构，再装回去",
  "为了一件事查了不少资料，最后做成一页纸"
] as const;

/**
 * 等待时的一行低语（设置里「思考低语」可关）。
 *
 * 负责人 2026-09-20 要求「显示实时的思考内容而不是一直重复一句话」。这里做的是**实时进度**：
 * 按本轮的思考档位给出预期耗时，再按真实经过的秒数推进阶段，句子每秒都在变（带秒数），
 * 不再是原来那三句 2.4 秒一轮的循环。
 *
 * 为什么不是模型的思考原文：本项目的既定边界是「思考内容属于草稿，绝不发给学生」，
 * 而且它不过安全扫描——模型在思考里写一句「可以考虑冲一冲」，那句话就到了学生眼前
 * （见 docs/AI_QIANFAN_SETUP.md「没有搬的，以及原因」）。另外前端目前整包读取响应
 * （`ai-client.ts` 的 runAiTurn 用 await response.text()），本来也拿不到逐字的中间态。
 * 想真正显示模型思考，要先放宽这条边界、再把响应改成流式读取，属于产品决定，不在本轮擅改。
 */
export function whisperLine(seconds: number, tier: ThinkingTier): string {
  // 档位预期耗时取自 THINKING_CHOICES 的实测区间，用作「还要等多久」的粗刻度。
  const expected = tier === "deep" ? 35 : tier === "standard" ? 20 : 8;
  if (seconds < 3) return "溟在读你刚写的那句……";
  if (seconds < expected * 0.6) return `溟在把你的话和已有的方向对一遍（已等 ${seconds} 秒）`;
  if (seconds < expected) return `还在写这一轮回复，不猜分数，只从你说过的事里找线索（已等 ${seconds} 秒）`;
  return `比平时慢一些，仍在等模型返回（已等 ${seconds} 秒）；慢的时候可以先别刷新页面`;
}

export interface TalkProps {
  page: PageId;
  setPage: Dispatch<SetStateAction<PageId>>;
  chatScrollRef: MutableRefObject<HTMLDivElement | null>;
  /** App 侧的实时思考节点：增量由 App 写入，这里只在挂载时回填已有内容。 */
  reasoningRef: MutableRefObject<HTMLDivElement | null>;
  /** 已经收到的思考全文（App 累积）：用于组件重新挂载时回填，避免开头丢失。 */
  reasoningText: MutableRefObject<string>;
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
  /** 等待回答时是否显示那一行低语（设置卡里的开关，默认开）。 */
  whisperOn: boolean;
}

export function renderTalk({ page, setPage, chatScrollRef, reasoningRef, reasoningText, notify, ai, setAi,
  aiCode, setAiCode, aiDraft, setAiDraft, exchangeCode, sendAi, catalog, quoteFor,
  hasChatted, whisperOn }: TalkProps) {
  // 谈心以 AI 谈心为主路径：进入本页即启用 AI（其它页面的无 AI 可用性不变）。
  useEffect(() => {
    if (page === "talk") setAi((current) => current.enabled ? current : enableAi(current));
  }, [page, setAi]);

  const tierOf = THINKING_CHOICES.find((choice) => choice.value === ai.tier);
  // 方向收口：聊够两三个大类、五六个专业类（或轮数兜底）就算这一轮聊完了——借北辰「到量即停」的做法
  // （它的夜航第 5 轮起评估、满 15 轮固定给出；领航满十轮自动点亮星图）。
  // 收口之后**仍然可以接着聊**，只是专业类不再新增：冻结在 App 合并那一层（mergeSuggestions）。
  const catalogGroups = catalog?.groups ?? [];
  const studentTurns = ai.history.filter((turn) => turn.role === "user").map((turn) => turn.text);
  const settled = directionTalkSettled(studentTurns, ai.suggestions, catalogGroups);
  // 等待时的低语：开关在设置卡里（默认开）。显示的是**实时进度**——按真实经过的秒数推进，
  // 每秒变一次；停下时归零，下一轮从第一句重新开始。
  const [waited, setWaited] = useState(0);
  useEffect(() => {
    if (!ai.pending || !whisperOn) { setWaited(0); return; }
    setWaited(0);
    const timer = window.setInterval(() => setWaited((second) => second + 1), 1000);
    return () => window.clearInterval(timer);
  }, [ai.pending, whisperOn]);
  const whisperText = whisperLine(waited, ai.tier);

  /**
   * 实时思考流（负责人 2026-09-20：「就要让学生看到思考过程」）。
   *
   * 增量由 App 在收到 reasoning 帧时直接写 DOM，不走 React state：思考来得很密，
   * 一帧一次 setState 会把整棵对话树重渲染几十次。这里只负责两件事：
   *   ① 把节点交给 App（reasoningRef）；
   *   ② 待回答那一块重新挂载时，把已经攒下的思考回填进去（第一块往往早于 React 重渲染）。
   */
  const fillReasoning = () => {
    const node = reasoningRef.current;
    if (node) node.textContent = reasoningText.current;
  };
  useLayoutEffect(fillReasoning, [ai.pending]);
  useEffect(() => () => { if (reasoningRef.current) reasoningRef.current.textContent = ""; }, []);

  // 「聊完之后」的方向小结卡：收口时自动弹一次（关掉后不再打扰，想再看点底部的「方向小结」）。
  const [summaryOpen, setSummaryOpen] = useState(false);
  const summarySeen = useRef(false);
  useEffect(() => {
    if (!settled || summarySeen.current) return;
    summarySeen.current = true;
    setSummaryOpen(true);
  }, [settled]);
  useScrollLock(summaryOpen);

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
        <small className="muted-note">连接需要 6 位动态码，由老师现场发放。</small>
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
          {/* 开场一定是一个问题（负责人 2026-09-12：不然学生不知道怎么聊起来）。
              引航在问题下面直接摆几个现成答案，点一下就以学生自己的名义发出去；
              泛舟只给问题，让学生用自己的话说。问题取自内容规格的第一条，不另造问法。 */}
          <ChatBubble from="ai">
            {OPENING_QUESTION}
            <span className="whisper">{OPENING_HINT[ai.mode]}</span>
          </ChatBubble>
          {ai.mode === "guided" && ai.history.length === 0
            ? <AnswerStarters starters={OPENING_STARTERS} disabled={ai.pending || !ai.connected}
              onPick={(text) => void sendAi(text)} />
            : null}
          {ai.history.map((turn, index) => <ChatBubble key={`${turn.role}-${index}`}
            from={turn.role === "user" ? "me" : "ai"}>
            {turn.text}
          </ChatBubble>)}
          {ai.pending ? <ChatBubble from="ai"><TypingDots label={whisperOn ? "溟在想 · 稍等（下面就是它的思考过程）" : "溟在想 · 稍等"} />
            {/* 模型思考的实时流：到一块显示一块。它不是回答，样式上也与正文分开（缩进 + 细线 + 更小的字）。 */}
            <div className="thinking" ref={reasoningRef} aria-live="polite" aria-label="溟的思考过程（实时）" />
            {whisperOn ? <span className="whisper whisper-live" key={whisperText}>{whisperText}</span> : null}
          </ChatBubble> : null}
          {/* 收口提示：说清「聊完了、还能聊、但方向不再变」，并把下一步摆出来。 */}
          {settled ? <ChatBubble from="ai">
            {ai.suggestions.length
              ? `方向已经收齐了——跨了 ${coveredGroups(ai.suggestions, catalogGroups).length} 个大类、${ai.suggestions.length} 个专业类。`
              : "这一轮谈心到这里就完成了。"}
            {ai.pending
              ? "溟正在把这一轮整理成清单……"
              : "想接着聊随时可以，只是不再往上加新的专业类了；也可以现在就去「方向」，自己再选一次。"}
            {!ai.pending && !ai.suggestions.length && !catalog?.directions.length
              ? "这次没有聊出可以落地的专业类：回「起航」把选科定下来，AI 才认得出专业类（选科也决定后面能报什么）。"
              : null}
            <span className="whisper">这一轮谈心到这里就算完成。</span>
          </ChatBubble> : null}
        </div>
        <div className="dock">
          {!ai.connected ? <>
            <div className="dock-row connect">
              <input className="inp" type="text" inputMode="numeric" autoComplete="one-time-code"
                maxLength={6} pattern="[0-9]{6}" value={aiCode} placeholder="输入 6 位动态码"
                aria-label="AI 服务动态码"
                onChange={(event) => setAiCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(event) => { if (event.key === "Enter") void exchangeCode(); }} />
              <button type="button" className="btn sm" onClick={() => void exchangeCode()}>连接</button>
            </div>
            <p className="fhint">{ai.status ?? "动态码每 30 秒更新且只能使用一次；请使用老师刚刚发放的当前码。"}</p>
          </> : <>
            {ai.mode === "guided" && ai.options.length > 0 ? <div className="qopts">
              {ai.options.map((option) => <button key={option} type="button" className="qopt"
                disabled={ai.pending} onClick={() => void sendAi(option)}>{option}</button>)}
            </div> : null}
            <div className="dock-row">
              <textarea className="inp" rows={2} value={aiDraft}
                placeholder={settled
                  ? "还想补充就接着说——方向已经收齐，不再新增专业类"
                  : ai.mode === "guided" ? "选项都不合适？直接写你的版本……" : "想说的话，直接写下来……"}
                onChange={(event) => setAiDraft(event.target.value)} />
              <button type="button" className="send" aria-label="发送" disabled={ai.pending}
                onClick={() => void sendAi()}><Icon name="arrow" /></button>
            </div>
            {/* 聊法在进对话之前选定（负责人 2026-09-12：进来之后不再给切换按钮）；
                当前档位仍显示在对话头部，学生知道自己这句话是按哪一档答的。 */}
            {/* 没有专业类目录就说清楚：AI 认不出专业类，聊再多也落不到具体的类上。 */}
            {!catalog?.directions.length ? <p className="fhint">
              还没定选科：专业类清单按选科与批次生成，现在 AI 认不出专业类。先去「起航」把三件事定下来，
              再回来接着聊——已经聊过的内容不受影响。
            </p> : null}
            {/* 这里原来挂一行 `ai.status`（连上后写着「已获得本地试用会话。」）。
                负责人 2026-09-20：连上之后输入框下面一直压着一行小字，删掉。
                连接状态由对话头部的「已连接」承担；失败与过期提示仍由未连接分支的
                `.fhint` 显示，错误不会被静默吞掉。 */}
          </>}
        </div>
      </div>
      {/* 聊完之前不出现：AI 还没给出建议时，去「方向」也看不到 AI 那条线，点了等于没反应。
          AI 一给出建议，这一行和上面的小结卡同时出现（负责人 2026-09-12 的要求）。 */}
      {ai.suggestions.length ? <div className="talk-meta">
        <button type="button" className="tbtn" onClick={() => setSummaryOpen(true)}>方向小结</button>
        <button type="button" className="tbtn"
          onClick={() => { setPage("direction"); notify("到「方向」看 AI 的建议，再亲自选一次专业"); }}>去方向 · 选专业<Icon name="arrow" /></button>
      </div> : null}

      {/* 聊完之后自动弹出的方向小结（与登船卡片同一套浮层）：把 AI 从学生原话里读出来的
          大类 / 小类摆清楚，引用的原话与理由照原样带上。就业方向不在这里编——那要 AI 现场答，
          所以这里只给一个「让溟讲讲」的入口，答案落在对话里。 */}
      {summaryOpen ? <div className="board-backdrop" role="presentation"
        onClick={(event) => { if (event.target === event.currentTarget) setSummaryOpen(false); }}
        onKeyDown={(event) => { if (event.key === "Escape") setSummaryOpen(false); }}>
        <div className="board-card" role="dialog" aria-modal="true" aria-label="溟听出来的方向">
          <button type="button" className="board-close" aria-label="关闭方向小结" autoFocus
            onClick={() => setSummaryOpen(false)}><Icon name="close" /></button>
          <span className="eyebrow">After The Talk · 聊完之后</span>
          <h3 className="song" style={{ marginTop: 10 }}>溟从你的原话里，听出了这几个方向</h3>
          <p className="psub">下面这些专业类是 AI 在你自己的话里挑出来的，每条都带着那句话；它只做整理与筛选，
            不替你决定，也不给录取判断。想了解这些方向以后做什么，让它接着讲。</p>
          {(catalog?.groups ?? []).map((group) => {
            const items = ai.suggestions.filter((item) => group.classes.some((cls) => cls.id === item.directionId));
            if (!items.length) return null;
            return <div key={group.id} style={{ marginTop: 14 }}>
              <span className="eyebrow plain">{group.name}</span>
              <ul className="vlist" style={{ marginTop: 8 }}>
                {items.map((item) => {
                  const cls = group.classes.find((entry) => entry.id === item.directionId)!;
                  return <li className="vpill" key={item.directionId}>{cls.name}</li>;
                })}
              </ul>
              {/* 收尾轮要求每条都带「为什么 + 以后主要做什么工作」，这里原样呈现，不另编。 */}
              <dl className="set-rows" style={{ marginTop: 8 }}>
                {items.map((item) => {
                  const cls = group.classes.find((entry) => entry.id === item.directionId)!;
                  return <div className="set-row tall" key={item.directionId}>
                    <dt>{cls.name}</dt>
                    <dd>{item.rationale}</dd>
                  </div>;
                })}
              </dl>
            </div>;
          })}
          <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 18 }}>
            <button type="button" className="btn brass"
              onClick={() => { setSummaryOpen(false); setPage("direction"); }}>去方向 · 选专业<Icon name="arrow" /></button>
            <button type="button" className="btn sm ghost"
              onClick={() => {
                setSummaryOpen(false);
                void sendAi("这些方向以后主要做什么工作？用你自己的话简单讲讲，不要说录取结论。");
              }}>让溟讲讲就业方向</button>
          </div>
        </div>
      </div> : null}
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
