import { useEffect, useMemo, useRef, useState } from "react";
import {
  DIRECTIONS, SELECTABLE_BATCHES, comparabilityNote, initialState, isMatchFresh,
  loadPublishedRelease, recordAnswer, registerStartTool, resetLocal, routeMap, runMatch, skipAnswer,
  summary, withForm, type ModelContextLike, type WebState
} from "./model.js";
import { initialAiPanel, applyTurnResult, askAi, disableAi, withSession, withUserTurn, type AiPanelState } from "./ai-panel.js";
import { evidenceForRequest } from "./ai-client.js";
import { ArtSlot, BrandMark, Icon, KunArt, Sprite } from "./art.js";
import { AnswerStarters, ChatBubble, StreamedText, TypingDots, prefersReducedMotion } from "./chat.js";
import {
  additionalFromCombination, attemptsMessage, initialQualityAttempts, latestExam, loadQualityIndex,
  normalizeCode, recentExams, registerFailure,
  type LoadedQuality, type QualityAttempts
} from "./quality-huixi.js";
import type { QualityShard } from "./quality-types.js";
import { buildSchoolPool, makeBranches, rangeFromExams, type SchoolPool, type ScoreRange } from "./journey-model.js";
import {
  CHAPTERS, DIRECTION_ARTS, experienceCardFor, initialQualityState, majorCardFor,
  type PageId, type QualityState
} from "./chapters/shared.js";
import { renderSail } from "./chapters/sail.js";
import { renderLocate } from "./chapters/locate.js";
import { renderQuality } from "./chapters/quality.js";
import { renderTalk } from "./chapters/talk.js";
import { renderDirection } from "./chapters/direction.js";
import { renderAxis } from "./chapters/axis.js";
import { renderChart } from "./chapters/chart.js";

export default function App() {
  const [state, setState] = useState(initialState);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [ai, setAi] = useState<AiPanelState>(initialAiPanel);
  const [qualityCode, setQualityCode] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [quality, setQuality] = useState<QualityState>(initialQualityState);
  // 新主流程的三块状态：探索区间（成绩 → 匹配）、院校池（区间匹配结果）、我的专业自选。
  // poolRun 附带生成时的输入指纹，选科/批次/区间一变，旧池即标记失效。
  const [range, setRange] = useState<ScoreRange | null>(null);
  const [poolRun, setPoolRun] = useState<{ key: string; data: SchoolPool } | null>(null);
  const [poolPending, setPoolPending] = useState(false);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const [aiDraft, setAiDraft] = useState("");
  const [aiCode, setAiCode] = useState("");
  const [page, setPage] = useState<PageId>("sail");
  const [talkStep, setTalkStep] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [showKun, setShowKun] = useState(false);
  const [onlyConfirmed, setOnlyConfirmed] = useState(false);
  const [matchPending, setMatchPending] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  // 谈心页的打字指示：换题后先显示「溟在听」，再开始逐字显示问题。
  const [thinking, setThinking] = useState(false);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  const reading = useMemo(() => summary(state), [state]);
  const map = useMemo(() => {
    try { return routeMap(state); } catch { return null; }
  }, [state]);
  const comparability = useMemo(
    () => comparabilityNote(state.release, state.form.primary,
      state.match?.result.candidates[0]?.group_reference.source_year ?? null),
    [state.release, state.form.primary, state.match]);
  const matching = state.releaseStatus === "loading" || matchPending;

  // Matching is asynchronous, so a response can outlive the input it was issued for. `matchSeq`
  // rejects any response that a newer request has superseded, and the generation check refuses to
  // write a result built from an input the student has since changed.
  const matchSeq = useRef(0);
  const matchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiSeq = useRef(0);
  const qualitySeq = useRef(0);
  const poolSeq = useRef(0);
  const chartSvgRef = useRef<SVGSVGElement | null>(null);
  const detailRef = useRef<HTMLDialogElement | null>(null);
  const releaseAbort = useRef<AbortController | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // 新消息或换题后把对话滚到底部，让刚出现的提问可见。
  useEffect(() => {
    const box = chatScrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [page, talkStep, state.answers.length, thinking, ai.history.length, ai.pending]);
  useEffect(() => () => { if (matchTimer.current !== null) clearTimeout(matchTimer.current); }, []);

  const runMatchSafely = (source: WebState) => {
    const seq = ++matchSeq.current;
    const generation = source.generation;
    setMatchPending(true);
    void runMatch(source).then((next) => {
      if (seq !== matchSeq.current) return;
      setMatchPending(false);
      setState((current) => current.generation === generation ? next : current);
      if (next.generation === generation && next.notice) notify(next.notice);
    });
  };

  // Debounced re-match for the score slider: dragging changes the score many times, but only the
  // value the student settles on is worth a run. Prerequisites are checked so dragging before the
  // course selection is complete does not raise a notice on every step.
  const queueMatch = (source: WebState) => {
    if (!source.form.primary || source.form.additional.length !== 2
      || source.form.batches.length === 0 || source.form.score === null) return;
    if (matchTimer.current !== null) clearTimeout(matchTimer.current);
    matchTimer.current = setTimeout(() => { matchTimer.current = null; runMatchSafely(source); }, 320);
  };

  useEffect(() => {
    const controller = new AbortController();
    const context = (document as unknown as { modelContext?: ModelContextLike }).modelContext;
    registerStartTool(context, (patch) => setState((current) => withForm(current, patch)), controller.signal);
    return () => controller.abort();
  }, []);

  // Load (or reload) the published release. A failure is surfaced and leaves the synthetic flow
  // usable, so a missing or stale release degrades instead of blocking exploration. Reloading is
  // also what lets 「清除本次探索」 restore release usability without stranding the page in
  // synthetic mode, and the previous controller is aborted so an older load cannot overwrite it.
  const reloadRelease = () => {
    releaseAbort.current?.abort();
    const controller = new AbortController();
    releaseAbort.current = controller;
    setState((current) => ({ ...current, releaseStatus: "loading" }));
    void loadPublishedRelease(controller.signal).then((patch) => {
      if (!controller.signal.aborted) setState((current) => ({ ...current, ...patch }));
    });
  };
  useEffect(() => {
    reloadRelease();
    return () => releaseAbort.current?.abort();
  }, []);

  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  // The exploration-fact dialog is native so it gets a backdrop and Escape handling for free.
  useEffect(() => {
    const node = detailRef.current;
    if (!node) return;
    if (detail && !node.open) node.showModal();
    else if (!detail && node.open) node.close();
  }, [detail]);
  const notify = (message: string) => setToast(message);

  // Display names come straight from the release's typed catalog, keyed by offeringId. The
  // OfferingLabel fields are camelCase (institutionName/majorName/...), and the id — never a list
  // index — is what ties a name to its row.
  const catalogueEntry = (offeringId: string) => state.catalog[offeringId] ?? null;

  const toggleBatch = (batch: string) => {
    setState((current) => {
      const has = current.form.batches.includes(batch);
      const next = has
        ? current.form.batches.filter((item) => item !== batch)
        : [...SELECTABLE_BATCHES].filter((item) => current.form.batches.includes(item) || item === batch);
      return withForm(current, { batches: next });
    });
  };

  const saveAnswer = (questionId: string) => {
    const text = drafts[questionId] ?? "";
    setState((current) => recordAnswer(current, questionId, text));
    setDrafts((current) => ({ ...current, [questionId]: "" }));
    notify("已保存为方向证据");
  };
  const skip = (questionId: string) => {
    setState((current) => skipAnswer(current, questionId));
    notify("已跳过本题，不会生成任何方向结论");
  };

  // Clearing drops the student's own exploration but keeps the loaded release and its catalog
  // (they are not the student's data), then reloads the release so a failed load can recover.
  // In-flight work is explicitly invalidated: matchSeq/aiSeq are bumped so a late response cannot
  // overwrite the cleared state, and the debounce timer is cancelled.
  const clear = () => {
    if (matchTimer.current !== null) { clearTimeout(matchTimer.current); matchTimer.current = null; }
    matchSeq.current += 1;
    aiSeq.current += 1;
    qualitySeq.current += 1;
    poolSeq.current += 1;
    setMatchPending(false);
    setPoolPending(false);
    setPoolError(null);
    setPoolRun(null);
    setRange(null);
    setPicks([]);
    setSchoolName("");
    setAi(disableAi(ai));
    setAiDraft("");
    setAiCode("");
    setQualityCode("");
    setQuality(initialQualityState);
    setDrafts({});
    setTalkStep(0);
    setOnlyConfirmed(false);
    setState((current) => resetLocal(current));
    reloadRelease();
    notify("已清除本次探索");
  };
  const download = () => {
    // 双线结果一并导出：AI 建议线与自选线各自的专业类，以及两条路的合并/分路概要。
    const routes = pool ? makeBranches(pool, aiDirectionIds, picks)
      .map((branch) => ({ kind: branch.kind, title: branch.title,
        majors: branch.majors.map((item) => item.name),
        offerings: branch.rows.length })) : [];
    const content = JSON.stringify({ exported_at: new Date().toISOString(), storage: "student_download",
      profile: state.profile, answers: state.answers, form: state.form,
      range, picks: picks.map((id) => pool?.majors.find((major) => major.id === id)?.name ?? id),
      aiSuggestions: ai.suggestions.map((item) => ({
        direction: pool?.directions.find((entry) => entry.id === item.directionId)?.name ?? item.directionId,
        rationale: item.rationale,
        quotes: item.evidenceIds.map(quoteFor).filter((quote): quote is string => quote !== null) })),
      routes,
      note: "历史区间与专业探索结果，不保证录取；专业组参考不等于专业录取线。" }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nanhang-exploration-profile.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // 荣县一中增强模式：姓名 + 6 位验证码 → 服务端核对（/v1/school/identify，带限流）→
  // 取回本人分片 → 回填表单并推导探索区间。失败按次计数，达到上限就停手，不做无上限的试号。
  const identifySchool = async () => {
    if (quality.attempts.blocked || quality.status === "loading") return;
    const name = schoolName.trim();
    if (!name || name.length > 40 || normalizeCode(qualityCode) === null) {
      setQuality((current) => ({ ...current, status: "failed",
        message: "请填写学生姓名和 6 位数字验证码。" }));
      return;
    }
    const seq = ++qualitySeq.current;
    setQuality((current) => ({ ...current, status: "loading", message: null }));
    try {
      const response = await fetch(`${ai.apiBase}/v1/school/identify`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, code: qualityCode }) });
      const body = await response.json() as { shard?: QualityShard; message?: string };
      if (!response.ok || !body.shard) throw new Error(body.message ?? "姓名或验证码不匹配，请向老师核对。");
      if (seq !== qualitySeq.current) return;
      const shard = body.shard;
      const index = quality.index ?? await loadQualityIndex();
      if (seq !== qualitySeq.current) return;
      const exam = latestExam(shard);
      setQuality({ status: "ready", index, shard, attempts: initialQualityAttempts, message: null });
      setQualityCode("");
      setSchoolName("");
      // 回填表单：首选科目与再选科目来自本人记录，分数用最近一次总分，考试用最近五次；
      // 探索区间按这些考试各自的切线做等位换算（min—max），供「分数轴」匹配院校。
      if (exam) {
        const primary = shard.person.track === "物理类" ? "PHYSICS" : "HISTORY";
        // 再选科目按组合原文解析（如「物化地」→ 化+地）。解析不出两门时不猜一个组合出来，
        // 保持学生当前的选择让他自己改——数据里出现新组合时，猜错会把资格判断悄悄带偏。
        const additional = additionalFromCombination(shard.person.combination);
        const recent = recentExams(shard);
        setState((current) => withForm(current, { primary,
          additional: additional ?? current.form.additional,
          score: exam.total !== null ? Math.round(exam.total) : current.form.score, exams: recent }));
        const derived = rangeFromExams(recent, primary);
        if (derived) setRange(derived);
      }
      notify(`已接入质量慧析 · ${shard.person.classLabel}`);
    } catch (error) {
      if (seq !== qualitySeq.current) return;
      const reason = error instanceof Error ? error.message : "识别没有完成，请重试。";
      const attempts = registerFailure(quality.attempts);
      setQuality((current) => ({ ...current, status: "failed", attempts,
        // 第一次失败优先展示服务端给的具体原因（不匹配/未配置/暂不可用），连错才强调次数。
        message: attempts.count <= 1 ? reason : attemptsMessage(attempts) }));
      setQualityCode("");
    }
  };

  const aiStamp = () => ({ runId: `web-run-g${state.generation}`, inputRevision: state.generation });
  const exchangeCode = async () => {
    try {
      const response = await fetch(`${ai.apiBase}/v1/access/exchange`, { method: "POST",
        headers: { "content-type": "application/json" }, body: JSON.stringify({ access_code: aiCode }) });
      if (!response.ok) { setAi((current) => ({ ...current, status: "访问码被拒绝，或本地服务未启动。" })); return; }
      const body = await response.json() as { token: string };
      setAi((current) => withSession(current, body.token));
      setAiCode("");
    } catch { setAi((current) => ({ ...current, status: "无法连接本地 AI 服务；无 AI 流程不受影响。" })); }
  };
  /** 点选 AI 给出的答案时用 override 直接发出，不必先写进草稿再等一轮渲染。 */
  const sendAi = async (override?: string) => {
    const text = (override ?? aiDraft).trim();
    if (!text) { setAi((current) => ({ ...current, status: "请先写下你想说的话。" })); return; }
    const seq = ++aiSeq.current;
    const requestId = `web-req-${state.generation}-${Date.now()}`;
    // 用户消息先进入转录（等待回复时也能看到自己说了什么）；历史带最近 8 轮给模型接上下文。
    const history = [...ai.history, { role: "user" as const, text }];
    setAi((current) => withUserTurn({ ...current, pending: true, ...(override ? { options: [] } : {}) }, text));
    if (!override) setAiDraft("");
    // 学生自己说的每句话都作为「本人的表达」随请求上行（服务端只让模型引用这些话）；
    // 按下「存为方向证据」的原话额外进入方向证据链，决定方向结论能不能生成。
    // 院校池存在时同时上行真实专业目录，AI 的建议只能从里面挑，前端还会再过滤一遍。
    const userTurns = ai.history.filter((turn) => turn.role === "user");
    const chatEvidence = [
      ...userTurns.map((turn, index) => ({ evidenceId: `ev-chat-${index}`, quote: turn.text, kind: "student_self_report" })),
      { evidenceId: `ev-chat-${userTurns.length}`, quote: text, kind: "student_self_report" }
    ];
    const evidence = [...evidenceForRequest(state.registry), ...chatEvidence].slice(-12);
    const next = await askAi(ai, aiStamp(), aiStamp(), text, requestId, {}, history, evidence, poolRun?.data.directions ?? []);
    if (seq !== aiSeq.current) return;
    setAi((current) => applyTurnResult(current, next));
  };

  // 谈心对话里的「存为方向证据」：只有学生主动按下，这句原话才进入证据链。
  // q-interest 是方向确认的主槽位；重复保存会替换上一条——转录本身始终完整保留。
  const saveChatEvidence = (text: string) => {
    setState((current) => recordAnswer(current, "q-interest", text));
    notify("已把这句存为方向证据");
  };

  // —— 新主流程：探索区间 → 院校池 → AI 建议 × 自选 → 双线结果 ——
  // 院校池的输入指纹：选科、批次或区间任一变化，旧池就在界面上标记失效（不静默沿用）。
  const poolKeyNow = [state.form.primary ?? "none", [...state.form.additional].sort().join("+"),
    [...state.form.batches].sort().join("+"), range ? `${range.low}-${range.high}` : "no-range"].join("|");
  const pool = poolRun?.data ?? null;
  const poolStale = poolRun !== null && poolRun.key !== poolKeyNow;

  /** 用当前区间跑一次院校池匹配：区间端点换位次区间，与历史录取位次取交集。 */
  const matchPool = async () => {
    if (!state.form.primary || state.form.additional.length !== 2) { notify("先在「起航」选好首选与两门再选科目。"); return; }
    if (!range) { notify("先在「定位」生成探索区间。"); return; }
    if (!state.form.batches.length) { notify("请至少选择一个批次。"); return; }
    if (!state.release) { notify("发布数据还没有载入，稍等或刷新后再试。"); return; }
    const seq = ++poolSeq.current;
    setPoolPending(true);
    setPoolError(null);
    try {
      const data = await buildSchoolPool(state.release, state.form.primary, state.form.additional, range, state.form.batches);
      if (seq !== poolSeq.current) return;
      setPoolRun({ key: poolKeyNow, data });
      setPicks([]);
      notify(`已匹配 ${data.schoolCount} 所院校 · ${data.rows.length} 条记录`);
    } catch (error) {
      if (seq === poolSeq.current) setPoolError(error instanceof Error ? error.message : "匹配没有完成，请调整范围后重试。");
    } finally {
      if (seq === poolSeq.current) setPoolPending(false);
    }
  };

  /** 自选专业（≤5 个）：换池即清空，不让旧选择悄悄挂到新范围上。 */
  const togglePick = (majorId: string) => {
    setPicks((current) => {
      if (current.includes(majorId)) return current.filter((item) => item !== majorId);
      if (current.length >= 5) { notify("最多选 5 个专业，先聚焦在最想去的几个上。"); return current; }
      return [...current, majorId];
    });
  };

  /** 建议引用的原话：先查保存过的证据，再查聊天转录（ev-chat-序号）。 */
  const userTurns = ai.history.filter((turn) => turn.role === "user");
  const quoteFor = (evidenceId: string): string | null => {
    const saved = state.answers.find((item) => item.evidenceId === evidenceId);
    if (saved) return saved.text;
    const match = /^ev-chat-(\d+)$/.exec(evidenceId);
    const turn = match ? userTurns[Number(match[1])] : undefined;
    return turn ? turn.text : null;
  };

  const runNow = () => {
    setState((current) => ({ ...current, notice: null }));
    runMatchSafely(state);
  };

  const score = state.form.score;
  const trackLabel = state.form.primary === "PHYSICS" ? "物理类" : state.form.primary === "HISTORY" ? "历史类" : "尚未选科";
  const contextLabel = `四川 · ${trackLabel} · ${state.form.targetYear}`;

  const questionsDone = state.answers.length;
  const canConfirmDirections = state.answers.some((item) => item.questionId === "q-interest");
  // 学生是否已经和 AI 聊过：AI 转录里有发言，或经典问答存过原话，都算「聊过」。
  // 自选专业在这一步之后才解锁——这是流程设计：先聊过、认识自己，再选专业。
  const hasChatted = userTurns.length > 0 || canConfirmDirections;
  const aiDirectionIds = ai.suggestions.map((item) => item.directionId);
  const fresh = isMatchFresh(state) ? state.match?.result ?? null : null;

  // 每个章节只声明它真正用到的字段（结构性子集），这里一次性把页面状态交给它们。
  const ctx = {
    state, setState, page, setPage, drafts, setDrafts, talkStep, setTalkStep, thinking, setThinking,
    reducedMotion, chatScrollRef, questionsDone, canConfirmDirections, saveAnswer, skip, notify,
    ai, setAi, aiSeq, aiCode, setAiCode, aiDraft, setAiDraft, exchangeCode, sendAi, saveChatEvidence,
    quality, qualityCode, setQualityCode, identifySchool, schoolName, setSchoolName,
    range, setRange, pool, poolStale, poolPending, poolError, matchPool, picks, togglePick,
    hasChatted, suggestions: ai.suggestions, aiDirectionIds, quoteFor,
    reading, onlyConfirmed, setOnlyConfirmed, fresh, setDetail,
    matching, queueMatch, toggleBatch, runNow, comparability, catalogueEntry, trackLabel,
    map, score, contextLabel, chartSvgRef, download, clear, setShowKun, setToast, toast
  };

  const chapterIndex = CHAPTERS.findIndex((chapter) => chapter.id === page);

  return <main>
    <Sprite />
    <header className="topbar">
      <div className="topbar-in">
        <button type="button" className="brand" aria-label="南溟 · 回到起航" onClick={() => setPage("sail")}>
          <BrandMark />
          <span className="brand-txt"><span className="brand-name">南溟</span><span className="brand-sub">NANMING · 天池</span></span>
        </button>
        <nav className="voyage" aria-label="航程">
          {CHAPTERS.map((chapter, index) => <span key={chapter.id} style={{ display: "contents" }}>
            {index ? <span className={`vline${index <= chapterIndex ? " done" : ""}`} /> : null}
            <button type="button" className={`vstop${index < chapterIndex ? " done" : ""}`}
              aria-current={chapter.id === page ? "step" : undefined} onClick={() => setPage(chapter.id)}>
              <span className="vnum">{chapter.num}</span><span className="vdot" /><span className="vlab">{chapter.k}</span>
            </button>
          </span>)}
        </nav>
        <div className="head-end">
          <button type="button" className="ctx-btn" onClick={() => setPage("locate")}><span>{contextLabel}</span><Icon name="chevron" /></button>
          <button type="button" className="avatar" aria-label="关于南溟 / 设置" onClick={() => setShowKun(true)}>溟</button>
        </div>
      </div>
    </header>

    <div className="wrap">
      {renderSail(ctx)}
      {renderLocate(ctx)}
      {renderQuality(ctx)}
      {renderTalk(ctx)}
      {renderDirection(ctx)}
      {renderAxis(ctx)}
      {renderChart(ctx)}
    </div>

    <footer className="footer">
      <div className="fbrand"><BrandMark /><span>南溟 · 南冥者，天池也</span></div>
      <span className="fnote">设计概念原型 · 未提供的控制线与院校分数一律显示为未知 · 正式填报以本省考试院政策与高校招生章程为准</span>
    </footer>

    <nav className="bottom-nav" aria-label="移动端导航">
      {CHAPTERS.map((chapter) => <button type="button" key={chapter.id}
        aria-current={chapter.id === page ? "step" : undefined} onClick={() => setPage(chapter.id)}>
        <Icon name={chapter.icon} /><span>{chapter.k}</span>
      </button>)}
    </nav>

    <div id="kun-stage" className={showKun ? "show" : ""} role="dialog" aria-label="逍遥游">
      <div className="kun-in">
        <KunArt />
        <div className="kun-quote song">北冥有鱼，其名为鲲。鲲之大，不知其几千里也；化而为鸟，其名为鹏。</div>
        <div className="kun-sign">《庄子 · 逍遥游》 · 北辰识己，南溟启程</div>
        <button type="button" className="btn brass kun-close" onClick={() => setShowKun(false)}>继续我的航行<Icon name="arrow" /></button>
      </div>
    </div>

    <dialog ref={detailRef} aria-label="方向探索事实" onClose={() => setDetail(null)}
      onClick={(event) => { if (event.target === detailRef.current) setDetail(null); }}>
      {detail ? (() => {
        const direction = DIRECTIONS.find((item) => item.directionId === detail);
        const card = experienceCardFor(detail);
        const fact = majorCardFor(detail);
        if (!direction || !card) return null;
        const index = DIRECTIONS.findIndex((item) => item.directionId === direction.directionId);
        return <>
          <button type="button" className="btn sm ghost dlg-close" aria-label="关闭" onClick={() => setDetail(null)}><Icon name="close" /></button>
          <div className="dlg-art"><ArtSlot name={DIRECTION_ARTS[index % DIRECTION_ARTS.length]!} /></div>
          <div className="dlg-body">
            <span className="eyebrow">Exploration Fact · 探索事实</span>
            <h2 className="song">{direction.title}</h2>
            <p className="lead">以下内容来自随前端提供的探索卡与专业事实卡，不属于当前发布包的招生数据，也不构成该方向与任何院校的录取关联。</p>
            <div className="dlg-sec">
              <h3><Icon name="book" />{card.experienceLabelText} · {card.title}</h3>
              <p>可以自己动手尝试的学习体验（只用于认识自己，不产生录取结论）：</p>
              <ul className="tick-list">{card.learningTasks.map((task) => <li key={task}><Icon name="check" /><span>{task}</span></li>)}</ul>
              <p>做完之后问自己：</p>
              <ul className="tick-list">{card.reflectionQuestions.map((question) => <li key={question}><Icon name="spark" /><span>{question}</span></li>)}</ul>
            </div>
            {fact ? <div className="dlg-sec">
              <h3><Icon name="layers" />专业事实卡 · {fact.majorName}</h3>
              <div className="kv"><span>示例院校</span><b>{fact.exampleInstitution}</b></div>
              <div className="kv"><span>资料来源编号</span><b>{fact.sourceId}</b></div>
              <p className="small">{fact.sourceUrl}</p>
              <p className="muted-note">示例院校只用于说明这个专业学什么，不是该方向的录取院校，也不代表你的可达结果。</p>
            </div> : null}
            <div className="dlg-act"><button type="button" className="btn brass" onClick={() => setDetail(null)}>知道了</button></div>
          </div>
        </>;
      })() : null}
    </dialog>

    <div className={`toast${toast ? " show" : ""}`} role="status" aria-live="polite"><Icon name="check" /><span>{toast ?? ""}</span></div>
  </main>;
}
