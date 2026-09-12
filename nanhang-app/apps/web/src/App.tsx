import { useEffect, useMemo, useRef, useState } from "react";
import {
  DIRECTIONS, EXCEL_NOTICE, SELECTABLE_BATCHES, comparabilityNote, excelDevelopmentRows,
  initialState, isMatchFresh, loadPublishedRelease, recordAnswer, registerStartTool, resetLocal,
  routeMap, runMatch, skipAnswer, summary, withForm,
  type ExcelRow, type ModelContextLike, type WebState
} from "./model.js";
import { initialAiPanel, askAi, disableAi, withSession, type AiPanelState } from "./ai-panel.js";
import { ArtSlot, BrandMark, Icon, KunArt, Sprite } from "./art.js";
import { AnswerStarters, ChatBubble, StreamedText, TypingDots, prefersReducedMotion } from "./chat.js";
import {
  additionalFromCombination, attemptsMessage, initialQualityAttempts, latestExam, loadQualityIndex,
  loadQualityShard, normalizeCode, recentTotals, registerFailure,
  type LoadedQuality, type QualityAttempts
} from "./quality-huixi.js";
import {
  CHAPTERS, DIRECTION_ARTS, experienceCardFor, initialQualityState, label, majorCardFor,
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
  const [excel, setExcel] = useState<{ rows: ExcelRow[]; error: string | null } | null>(null);
  const [ai, setAi] = useState<AiPanelState>(initialAiPanel);
  const [qualityCode, setQualityCode] = useState("");
  const [quality, setQuality] = useState<QualityState>(initialQualityState);
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
  const chartSvgRef = useRef<SVGSVGElement | null>(null);
  const detailRef = useRef<HTMLDialogElement | null>(null);
  const releaseAbort = useRef<AbortController | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // 新消息或换题后把对话滚到底部，让刚出现的提问可见。
  useEffect(() => {
    const box = chatScrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [page, talkStep, state.answers.length, thinking]);
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
    setMatchPending(false);
    setAi(disableAi(ai));
    setAiDraft("");
    setAiCode("");
    setQualityCode("");
    setQuality(initialQualityState);
    setDrafts({});
    setExcel(null);
    setTalkStep(0);
    setOnlyConfirmed(false);
    setState((current) => resetLocal(current));
    reloadRelease();
    notify("已清除本次探索");
  };
  const download = () => {
    const content = JSON.stringify({ exported_at: new Date().toISOString(), storage: "student_download",
      profile: state.profile, answers: state.answers, form: state.form }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nanhang-exploration-profile.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const loadExcel = async () => {
    try {
      const response = await fetch("/dev/workbook-samples.json");
      if (!response.ok) throw new Error(String(response.status));
      setExcel({ rows: excelDevelopmentRows(await response.json()), error: null });
    } catch { setExcel({ rows: [], error: "核对视图仅在本地开发服务中可用。" }); }
  };

  // 荣县一中增强模式：输入 6 位验证码 → 取回本人分片 → 回填表单并展示成绩面板。
  // 只有拿到分片才算验证通过；失败按次计数，达到上限就停手，不做无上限的试号。
  const verifyQualityCode = async () => {
    if (quality.attempts.blocked || quality.status === "loading") return;
    if (normalizeCode(qualityCode) === null) {
      setQuality((current) => ({ ...current, status: "failed",
        message: "请输入 6 位数字验证码。" }));
      return;
    }
    const seq = ++qualitySeq.current;
    setQuality((current) => ({ ...current, status: "loading", message: null }));
    try {
      const [index, shard] = await Promise.all([
        quality.index ? Promise.resolve(quality.index) : loadQualityIndex(),
        loadQualityShard(qualityCode)
      ]);
      if (seq !== qualitySeq.current) return;
      const exam = latestExam(shard);
      setQuality({ status: "ready", index, shard, attempts: initialQualityAttempts, message: null });
      setQualityCode("");
      // 回填表单：首选科目与再选科目来自本人记录，分数用最近一次总分，历史用最近五次。
      if (exam) {
        const primary = shard.person.track === "物理类" ? "PHYSICS" : "HISTORY";
        // 再选科目按组合原文解析（如「物化地」→ 化+地）。解析不出两门时不猜一个组合出来，
        // 保持学生当前的选择让他自己改——数据里出现新组合时，猜错会把资格判断悄悄带偏。
        const additional = additionalFromCombination(shard.person.combination);
        setState((current) => withForm(current, { primary,
          additional: additional ?? current.form.additional,
          score: Math.round(exam.total), history: recentTotals(shard) }));
      }
      notify(`已接入质量慧析 · ${shard.person.classLabel}`);
      setPage("quality");
    } catch (error) {
      if (seq !== qualitySeq.current) return;
      const attempts = registerFailure(quality.attempts);
      setQuality((current) => ({ ...current, status: "failed", attempts,
        message: attemptsMessage(attempts) }));
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
  const sendAi = async () => {
    const seq = ++aiSeq.current;
    const requestId = `web-req-${state.generation}-${Date.now()}`;
    setAi((current) => ({ ...current, pending: true }));
    const next = await askAi(ai, aiStamp(), aiStamp(), aiDraft, requestId);
    if (seq !== aiSeq.current) return;
    setAi(next);
    if (next.reply) setAiDraft("");
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
  const fresh = isMatchFresh(state) ? state.match?.result ?? null : null;

  // 每个章节只声明它真正用到的字段（结构性子集），这里一次性把页面状态交给它们。
  const ctx = {
    state, setState, page, setPage, drafts, setDrafts, talkStep, setTalkStep, thinking, setThinking,
    reducedMotion, chatScrollRef, questionsDone, canConfirmDirections, saveAnswer, skip, notify,
    ai, setAi, aiSeq, aiCode, setAiCode, aiDraft, setAiDraft, exchangeCode, sendAi,
    quality, qualityCode, setQualityCode, verifyQualityCode,
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

      <details className="developer">
        <summary>开发核对视图：未核实 Excel 样本</summary>
        <p>{EXCEL_NOTICE}</p>
        <button type="button" className="btn sm ghost" onClick={loadExcel}>读取本地样本</button>
        {excel?.error ? <p className="feedback">{excel.error}</p> : null}
        {excel && excel.rows.length ? <div className="dev-wrap"><table className="dev-table">
          <thead><tr><th scope="col">单元格行</th><th scope="col">类别</th><th scope="col">院校</th><th scope="col">专业</th><th scope="col">选科原文</th><th scope="col">计划</th></tr></thead>
          <tbody>{excel.rows.slice(0, 20).map((row) => <tr key={row.sampleId}>
            <td>{row.sourceRow}</td><td>{label(row.track)}</td><td>{row.institution}</td><td>{row.major}</td>
            <td>{row.subjectRequirement ?? "未知"}</td><td>{row.planCount ?? "未知"}</td></tr>)}</tbody>
        </table></div> : null}
        <p className="muted-note">已读取 {excel?.rows.length ?? 0} 条；不会送入匹配。</p>
      </details>
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
