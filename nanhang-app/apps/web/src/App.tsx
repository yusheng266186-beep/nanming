import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  DIRECTIONS, SELECTABLE_BATCHES, comparabilityNote, initialState, isMatchFresh,
  loadPublishedRelease, registerStartTool, resetLocal, routeMap, runMatch,
  summary, withForm, type ModelContextLike, type WebState
} from "./model.js";
import { initialAiPanel, applyTurnResult, askAi, disableAi, withSession, withUserTurn, type AiPanelState } from "./ai-panel.js";
import { FINAL_TURN_INSTRUCTION, directionTalkSettled, mergeSuggestions } from "./direction-quota.js";
import { evidenceForRequest } from "./ai-client.js";
import { ArtSlot, BrandMark, Icon, KunArt, Sprite } from "./art.js";
import { AnswerStarters, ChatBubble, StreamedText, TypingDots, prefersReducedMotion } from "./chat.js";
import {
  additionalFromCombination, attemptsMessage, initialQualityAttempts, latestExam,
  normalizeCode, recentExams, registerFailure, withoutEntryExams,
  type LoadedQuality, type QualityAttempts
} from "./quality-huixi.js";
import type { QualityShard } from "./quality-types.js";
import { buildReleaseCatalog, buildSchoolPool, makeBranches, rangeFromExams,
  type CatalogDirection, type CatalogGroup, type Major, type SchoolPool, type ScoreRange } from "./journey-model.js";
import { equivalentPosition } from "./exam-position.js";
import { OFFICIAL_LINES_2026 } from "./reference-lines.js";
import { DEBUG_ACCESS_CODE, DEBUG_MODE } from "./debug.js";
import {
  CHAPTERS, DIRECTION_ARTS, experienceCardFor, initialQualityState, majorCardFor,
  type LocateRoute, type PageId, type QualityState
} from "./chapters/shared.js";
import {
  canOpen, isDone, lockHint, stageDone, stageOf, unlockedStage, type ProgressInput
} from "./progress.js";
import { renderSail } from "./chapters/sail.js";
import { renderLocate } from "./chapters/locate.js";
import { renderTalk } from "./chapters/talk.js";
import { renderDirection } from "./chapters/direction.js";
import { renderAxis } from "./chapters/axis.js";
import { renderChart } from "./chapters/chart.js";
import { renderSettings } from "./chapters/settings.js";
import { useScrollLock } from "./scroll-lock.js";

export default function App() {
  const [state, setState] = useState(initialState);
  const [, setDrafts] = useState<Record<string, string>>({});
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
  // 两级方向选择（负责人裁定）：先选 2–3 个大类（学科门类），再在大类里勾 5–10 个
  // 小类（专业类）；进入匹配的是小类，大类负责圈定范围。
  const [pickedGroups, setPickedGroups] = useState<string[]>([]);
  // 发布包级专业类目录（与分数区间无关）：方向页的自选清单与 AI 的方向目录都用它。
  // 流程是先定方向、再按分数匹配——不能等院校池跑出来才谈方向。
  const [catalogRun, setCatalogRun] = useState<{ key: string;
    data: { majors: Major[]; directions: CatalogDirection[]; groups: CatalogGroup[] } } | null>(null);
  // 章节门禁：学生按下「先用通用模式」算一次显式跳过；maxStage 记住本会话解锁到哪一段（只增不减）。
  const [maxStage, setMaxStage] = useState(0);
  const [aiDraft, setAiDraft] = useState("");
  // 调试模式预填本地演示访问码：点「连接」就能进对话，不用手敲。
  const [aiCode, setAiCode] = useState(DEBUG_MODE ? DEBUG_ACCESS_CODE : "");
  const [page, setPage] = useState<PageId>("sail");
  const [talkStep, setTalkStep] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [showKun, setShowKun] = useState(false);
  // 设置卡片：思考深度与清除本人数据都收在这里，顶栏右上角的「溟」是唯一入口。
  const [settingsOpen, setSettingsOpen] = useState(false);
  // 定位章的两条路（负责人 2026-09-12 定）：手填几次考试，或荣县一中接入学校数据。
  // 默认走通用模式；登船卡片里选哪条就跳到对应页面，两条路都通向「谈心」。
  const [route, setRoute] = useState<LocateRoute>("manual");
  // 登船卡片里有没有真的选过入口（两条路都算）。门禁把「起航」定义为：选科 + 选过入口——
  // 负责人 2026-09-13：点了「开始起航」就放行定位是错的，没选入口进去只会看到一页空的。
  const [entryChosen, setEntryChosen] = useState(false);
  // 设置卡里的两个开关（只影响这台设备的显示，不写盘；刷新回到默认）。
  // 低语 = 等回答时显示一行「溟在做什么」的阶段提示（不是模型思考）；动效关掉 = 与系统「减少动态效果」同一套处理。
  const [whisperOn, setWhisperOn] = useState(true);
  // 收尾轮是否已经落定（落定后方向集合冻结，不再增减）。
  const [finalDone, setFinalDone] = useState(false);
  const finalTurnRef = useRef(false);
  const [motionOff, setMotionOff] = useState(false);
  const [onlyConfirmed, setOnlyConfirmed] = useState(false);
  const [matchPending, setMatchPending] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  // 谈心页的打字指示：换题后先显示「溟在听」，再开始逐字显示问题。
  const [thinking, setThinking] = useState(false);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  // 设置卡片也是浮层：开着的时候一样锁住整页滚动（与登船卡片同一套做法）。
  useScrollLock(settingsOpen);
  // 「界面动效」开关：关掉时在 html 上打一个属性，样式表里与系统「减少动态效果」同一套选择器处理。
  useEffect(() => {
    const root = document.documentElement;
    if (motionOff) root.dataset.motion = "off";
    else delete root.dataset.motion;
    return () => { delete root.dataset.motion; };
  }, [motionOff]);

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
  const catalogSeq = useRef(0);
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

  // 探索区间自动生成（负责人裁定：区间由数据来，不由学生填）：有考试按各自切线做等位
  // 换算取 min–max；没有考试但有目标分时按上下各 10 分。学生仍可在定位页微调，
  // 但下一次数据变化会按新数据重新生成——改数据比保手调更重要。
  const examsKey = state.form.exams.map((exam) => `${exam.total}/${exam.topTotal}/${exam.undergraduateTotal}`).join("|");
  useEffect(() => {
    if (!state.form.primary) return;
    const derived = rangeFromExams(state.form.exams, state.form.primary);
    if (derived) { setRange(derived); return; }
    if (state.form.score !== null) {
      setRange({ low: Math.max(0, state.form.score - 10), high: Math.min(750, state.form.score + 10),
        basis: "按当前分数上下各 10 分自动生成，可在「定位」微调；不是预测区间。" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.form.primary, state.form.score, examsKey]);

  // 发布包目录自动构建：选科+两门再选就绪即拉全量专业类（不需要探索区间，更不需要院校池）；
  // 选科/批次变化按指纹换新，旧目录静默失效（目录是基础数据，失败时如实显示为空）。
  const catalogKey = [state.form.primary ?? "none", [...state.form.additional].sort().join("+"),
    [...(state.form.batches.length ? state.form.batches : SELECTABLE_BATCHES)].sort().join("+")].join("|");
  const catalog = catalogRun?.key === catalogKey ? catalogRun.data : null;
  useEffect(() => {
    if (!state.release || !state.form.primary || state.form.additional.length !== 2) return;
    const seq = ++catalogSeq.current;
    const batches = state.form.batches.length ? state.form.batches : [...SELECTABLE_BATCHES];
    buildReleaseCatalog(state.release, state.form.primary, state.form.additional, batches)
      .then((data) => { if (seq === catalogSeq.current) setCatalogRun({ key: catalogKey, data }); })
      .catch(() => { if (seq === catalogSeq.current) setCatalogRun(null); });
  }, [state.release, state.form.primary, state.form.additional, catalogKey]);

  // 收尾轮的触发：聊够（方向覆盖到量或轮数兜底）且已连上时，由界面自动发起一次，只发一次。
  useEffect(() => {
    if (finalTurnRef.current || finalDone) return;
    if (!ai.enabled || !ai.connected || ai.pending) return;
    const studentTurns = ai.history.filter((turn) => turn.role === "user").map((turn) => turn.text);
    if (!directionTalkSettled(studentTurns, ai.suggestions, catalog?.groups ?? [])) return;
    finalTurnRef.current = true;
    void runFinalTurn();
  }, [ai.enabled, ai.connected, ai.pending, ai.history, ai.suggestions, catalog, finalDone]);

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
    setPickedGroups([]);
    setSchoolName("");
    if (ai.token) {
      void fetch(`${ai.apiBase}/v1/session`, { method: "DELETE",
        headers: { authorization: `Bearer ${ai.token}` }, signal: AbortSignal.timeout(15_000)
      }).then((response) => {
        if (!response.ok && response.status !== 401) notify("本页已清除，云端会话清理未完成，将按服务端期限过期。");
      }).catch(() => notify("本页已清除，暂时无法连接云端清理会话，将按服务端期限过期。"));
    }
    setAi(disableAi(ai));
    setAiDraft("");
    setAiCode("");
    setQualityCode("");
    setQuality(initialQualityState);
    setDrafts({});
    setTalkStep(0);
    setOnlyConfirmed(false);
    // 门禁也一并归零：清除本次探索之后，仍然要从「起航」一步步来。
    setMaxStage(0);
    setEntryChosen(false);
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
      range, picks: picks.map((id) => catalog?.directions.find((entry) => entry.id === id)?.name ?? id),
      groups: pickedGroups.map((id) => catalog?.groups.find((entry) => entry.id === id)?.name ?? id),
      aiSuggestions: ai.suggestions.map((item) => ({
        direction: catalog?.directions.find((entry) => entry.id === item.directionId)?.name ?? item.directionId,
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
        message: "请填写学生姓名和 6 位数字查询码，身份证末位 X 请填 0。" }));
      return;
    }
    const seq = ++qualitySeq.current;
    setQuality((current) => ({ ...current, status: "loading", message: null }));
    try {
      const response = await fetch(`${ai.apiBase}/v1/school/identify`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, code: qualityCode }) });
      const body = await response.json() as { shard?: QualityShard; index?: LoadedQuality["index"]; message?: string };
      if (!response.ok || !body.shard) throw new Error(body.message ?? "姓名或验证码不匹配，请向老师核对。");
      if (seq !== qualitySeq.current) return;
      // 入口考（入学测试）满分口径与正考不同且全校无切线，负责人裁定不作为参考依据：
      // 在入口处就剔除，考试行、稳定性、趋势、航迹、知识短板一律看不到它。
      const shard = withoutEntryExams(body.shard);
      const index = body.index;
      if (!index || !Array.isArray(index.exams) || !Array.isArray(index.trend)) {
        throw new Error("成绩汇总暂不可用，请稍后重试或联系老师。");
      }
      if (seq !== qualitySeq.current) return;
      const exam = latestExam(shard);
      setQuality({ status: "ready", index, shard, attempts: initialQualityAttempts, message: null });
      setQualityCode("");
      setSchoolName("");
      // 回填表单：首选科目与再选科目来自本人记录，考试用最近五次；探索区间按这些考试
      // 各自的切线做等位换算（min—max），供「分数轴」匹配院校。
      if (exam) {
        const primary = shard.person.track === "物理类" ? "PHYSICS" : "HISTORY";
        // 再选科目按组合原文解析（如「物化地」→ 化+地）。解析不出两门时不猜一个组合出来，
        // 保持学生当前的选择让他自己改——数据里出现新组合时，猜错会把资格判断悄悄带偏。
        const additional = additionalFromCombination(shard.person.combination);
        const recent = recentExams(shard);
        // 分数用「高考等价分」：最近一次带切线的考试按线差比例换算到省控线口径。
        // 学校各场考试划线深浅不一，裸分总分没有可比性；没有可换算的考试时才退回最近一次总分。
        const equivExam = [...recent].reverse()
          .find((item) => item.total !== null && (item.topTotal !== null || item.undergraduateTotal !== null)) ?? null;
        const equiv = equivExam
          ? equivalentPosition(equivExam,
            { year: OFFICIAL_LINES_2026.year, ...OFFICIAL_LINES_2026.tracks[primary] }, state.release, primary)
          : null;
        const equivScore = equiv?.top?.equivalentScore ?? equiv?.undergraduate?.equivalentScore
          ?? (exam.total !== null ? Math.round(exam.total) : null);
        setState((current) => withForm(current, { primary,
          additional: additional ?? current.form.additional,
          score: equivScore ?? current.form.score, exams: recent }));
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
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { error?: { code?: string } } | null;
        const replayed = detail?.error?.code === "TOTP_REPLAYED";
        setAi((current) => ({ ...current,
          status: replayed ? "这个动态码已经使用过，请向老师获取当前新码。" : "动态码无效或已过期，请向老师获取当前新码。" }));
        return;
      }
      const body = await response.json() as { token: string };
      setAi((current) => withSession(current, body.token));
      setAiCode("");
    } catch { setAi((current) => ({ ...current, status: "暂时无法连接 AI 服务；无 AI 流程不受影响。" })); }
  };
  /** 点选 AI 给出的答案时用 override 直接发出，不必先写进草稿再等一轮渲染。 */
  const sendAi = async (override?: string) => {
    if (ai.pending) return;
    const text = (override ?? aiDraft).trim();
    if (!text) { setAi((current) => ({ ...current, status: "请先写下你想说的话。" })); return; }
    if (text.length > 4000) { setAi((current) => ({ ...current, status: "这段话较长，请分成每次不超过 4000 字发送。" })); return; }
    const seq = ++aiSeq.current;
    const requestId = `web-req-${state.generation}-${Date.now()}`;
    // 用户消息先进入转录（等待回复时也能看到自己说了什么）；历史带最近 8 轮给模型接上下文。
    const history = [...ai.history, { role: "user" as const, text }];
    setAi((current) => withUserTurn({ ...current, pending: true, ...(override ? { options: [] } : {}) }, text));
    if (!override) setAiDraft("");
    // 学生自己说的每句话都作为「本人的表达」随请求上行（服务端只让模型引用这些话）；
    // 按下「存为方向证据」的原话额外进入方向结论的依据，决定方向结论能不能生成。
    // 院校池存在时同时上行真实专业目录，AI 的建议只能从里面挑，前端还会再过滤一遍。
    const userTurns = ai.history.filter((turn) => turn.role === "user");
    const chatEvidence = [
      ...userTurns.map((turn, index) => ({ evidenceId: `ev-chat-${index}`, quote: turn.text, kind: "student_self_report" })),
      { evidenceId: `ev-chat-${userTurns.length}`, quote: text, kind: "student_self_report" }
    ];
    const evidence = [...evidenceForRequest(state.registry), ...chatEvidence].slice(-12);
    const next = await askAi(ai, aiStamp(), aiStamp(), text, requestId, {}, history, evidence, catalog?.directions ?? []);
    if (seq !== aiSeq.current) return;
    setAi((current) => {
      const merged = applyTurnResult(current, next);
      // 方向收口（借北辰：到量即停，之后仍可继续聊但画像不再变）：聊够之后专业类不再新增，
      // 冻结在已经收齐的那一套上；没收齐就把这一轮的新建议并进来，并裁到上限（3 大类 / 6 小类）。
      const groups = catalog?.groups ?? [];
      // 冻结的时机是「收尾轮已经落定」——收尾轮之前一直照常并入（否则它自己算出来的那套也会被挡掉）。
      const withSuggestions = { ...merged, suggestions: mergeSuggestions(current.suggestions, merged.suggestions, groups, finalDone) };
      // 调试模式：本地假上游不会返回结构化建议，这里注入两条示例建议（挂在发布包目录里
      // 真实存在的专业类上，引用学生的第一句原话），让「AI 推荐线」的界面能被验收。
      if (!DEBUG_MODE || withSuggestions.suggestions.length > 0 || !catalog) return withSuggestions;
      // 两级示例：一个大类 + 它下面两个专业类，贴合「先大类、后小类」的选择结构。
      const group = [...catalog.groups].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
        .find((entry) => entry.classes.length >= 2) ?? catalog.groups[0];
      const sample = group ? group.classes.slice(0, 2) : [];
      return { ...withSuggestions, suggestions: sample.map((entry) => ({
        directionId: entry.id,
        evidenceIds: userTurns.length ? ["ev-chat-0"] : [],
        rationale: "（调试示例）从你聊到的内容看，可以先探索这个专业类；验收通过后请换真实模型复核。"
      })) };
    });
  };

  // 谈心对话里的原话随每轮请求作为「本人的表达」上行（见 sendAi），方向结论由
  // AI 建议与学生的自选两条线在「方向」页生成，不再需要单独的证据保存动作。

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
      // 自选专业挂在发布包目录上（与分数无关），匹配不清空它——方向先定、匹配在后。
      notify(`已匹配 ${data.schoolCount} 所院校 · ${data.rows.length} 条记录`);
    } catch (error) {
      if (seq === poolSeq.current) setPoolError(error instanceof Error ? error.message : "匹配没有完成，请调整范围后重试。");
    } finally {
      if (seq === poolSeq.current) setPoolPending(false);
    }
  };

  /** 自选小类（专业类，≤10 个）：挂在发布包目录上，与分数区间无关，匹配不清理。 */
  const togglePick = (classId: string) => {
    setPicks((current) => {
      if (current.includes(classId)) return current.filter((item) => item !== classId);
      if (current.length >= 10) { notify("最多选 10 个专业类，先聚焦在最想去的几类上。"); return current; }
      return [...current, classId];
    });
  };

  /**
   * 选大类（学科门类，≤3 个）：先大类、后小类。取消一个大类时，把它里面已勾的
   * 小类一并取消——大类是范围，范围撤了范围里的选择不再成立。
   */
  const toggleGroup = (groupId: string) => {
    setPickedGroups((current) => {
      if (current.includes(groupId)) {
        const classIds = new Set(catalog?.groups.find((entry) => entry.id === groupId)
          ?.classes.map((cls) => cls.id) ?? []);
        setPicks((picked) => picked.filter((id) => !classIds.has(id)));
        return current.filter((item) => item !== groupId);
      }
      if (current.length >= 3) { notify("最多选 3 个大类；先取消一个，再换别的。"); return current; }
      return [...current, groupId];
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

  // 学生是否已经和 AI 聊过：AI 转录里有发言即算；聊过之后才解锁自选专业（流程设计）。
  // 调试模式下直接放行，让「方向」「航线图」不必先走完对话也能验收。
  const hasChatted = userTurns.length > 0;
  const aiDirectionIds = ai.suggestions.map((item) => item.directionId);
  const fresh = isMatchFresh(state) ? state.match?.result ?? null : null;

  // —— 章节门禁（见 progress.ts）——
  // 完成状态始终按当前数据实时算；解锁段位只增不减，所以「回看」不会被中途改数据卡住。
  const progress: ProgressInput = {
    state, rangeKnown: range !== null, poolReady: pool !== null,
    picks: picks.length, suggestionCount: ai.suggestions.length,
    chatted: hasChatted, entryChosen
  };
  const derivedStage = unlockedStage(progress);
  useEffect(() => {
    setMaxStage((current) => (derivedStage > current ? derivedStage : current));
  }, [derivedStage]);
  const openStage = Math.max(maxStage, derivedStage);
  // 门禁就是这个门禁：调试模式也不再旁路（负责人 2026-09-13——他验收时看到的正是旁路造成的
  // 「没选入口定位就开着」）。调试模式仍保留示例 AI 建议、预填访问码与角标。
  const gateOpen = (id: PageId) => canOpen(id, progress, openStage);

  /**
   * 唯一的页面切换入口：章节里的按钮、导航条、页头全部走这里。
   * 没解锁就只给一句指名道姓的提示（「先完成『定位』（生成探索区间）」），不跳页。
   * 类型与 useState 的 setter 一致，章节组件那边一行都不用改。
   */
  const goTo: Dispatch<SetStateAction<PageId>> = (value) => {
    const id = typeof value === "function" ? value(page) : value;
    if (gateOpen(id)) { setPage(id); return; }
    notify(lockHint(id, progress));
  };

  /** 选定位的哪条路：定下路线后立刻进「定位」，进去看到的就是那条路对应的页面。 */
  const chooseRoute = (next: LocateRoute) => {
    setEntryChosen(true);
    setRoute(next);
    goTo("locate");
  };

  /**
   * 收尾轮（借北辰的「报告轮」）：谈够之后**由界面发起一次专门的生成请求**，
   * 只把学生自己的原话当素材（不重复发 AI 正文），要求一次拿到完整结果；
   * 之后方向集合冻结——可以接着聊，但不再增减（北辰：星图生成后画像不再变）。
   *
   * 这条指令不是学生说的话：所以它**不进转写**（对话框里看不到），也**不进可引用证据**
   * （否则模型会去引用一句系统指令，界面还会把它当学生的原话展示）。
   */
  const runFinalTurn = async () => {
    const seq = ++aiSeq.current;
    const userTurns = ai.history.filter((turn) => turn.role === "user");
    const chatEvidence = userTurns.map((turn, index) => (
      { evidenceId: `ev-chat-${index}`, quote: turn.text, kind: "student_self_report" as const }));
    const evidence = [...evidenceForRequest(state.registry), ...chatEvidence].slice(-12);
    const next = await askAi(ai, aiStamp(), aiStamp(), FINAL_TURN_INSTRUCTION,
      `web-final-${state.generation}-${Date.now()}`, {}, ai.history, evidence, catalog?.directions ?? []);
    if (seq !== aiSeq.current) return;
    setAi((current) => {
      const merged = applyTurnResult(current, next);
      const suggestions = mergeSuggestions(current.suggestions, merged.suggestions, catalog?.groups ?? [], false);
      return { ...merged, suggestions };
    });
    setFinalDone(true);
  };

  // 每个章节只声明它真正用到的字段（结构性子集），这里一次性把页面状态交给它们。
  const ctx = {
    // 章节里所有跳转都经过 goTo：没解锁的章节点了只会得到提示，不会跳页。
    state, setState, page, setPage: goTo, talkStep, setTalkStep, thinking, setThinking,
    reducedMotion, chatScrollRef, notify,
    ai, setAi, aiSeq, aiCode, setAiCode, aiDraft, setAiDraft, exchangeCode, sendAi,
    quality, qualityCode, setQualityCode, identifySchool, schoolName, setSchoolName,
    range, setRange, pool, poolStale, poolPending, poolError, matchPool, picks, pickedGroups, togglePick, toggleGroup,
    catalog, hasChatted, suggestions: ai.suggestions, aiDirectionIds, quoteFor,
    reading, onlyConfirmed, setOnlyConfirmed, fresh, setDetail,
    matching, queueMatch, toggleBatch, runNow, comparability, catalogueEntry, trackLabel,
    map, score, contextLabel, chartSvgRef, download, setShowKun, setToast, toast,
    route, chooseRoute, whisperOn
  };

  const chapterIndex = CHAPTERS.findIndex((chapter) => chapter.id === page);
  /** 导航条上每一步的状态：locked（还没轮到）/ done（已完成，可以回看）/ 当前。 */
  const stepState = (id: PageId) => ({
    open: gateOpen(id),
    done: isDone(id, progress),
    hint: gateOpen(id) ? null : lockHint(id, progress)
  });

  return <main>
    <Sprite />
    {DEBUG_MODE ? <div className="debug-flag" role="status" aria-label="调试模式开启中">调试模式 · 示例数据</div> : null}
    <header className="topbar">
      <div className="topbar-in">
        {/* 品牌标记与「溟」分工：左边是《逍遥游》的彩蛋，右边进设置。 */}
        <button type="button" className="brand" aria-label="南溟 · 逍遥游" onClick={() => setShowKun(true)}>
          <BrandMark />
          <span className="brand-txt"><span className="brand-name">南溟</span><span className="brand-sub">NANMING · 天池</span></span>
        </button>
        <nav className="voyage" aria-label="航程">
          {CHAPTERS.map((chapter, index) => {
            const step = stepState(chapter.id);
            return <span key={chapter.id} style={{ display: "contents" }}>
              {index ? <span className={`vline${stageDone(stageOf(CHAPTERS[index - 1]!.id), progress) ? " done" : ""}`} /> : null}
              <button type="button"
                className={`vstop${step.done ? " done" : ""}${step.open ? "" : " locked"}`}
                aria-current={chapter.id === page ? "step" : undefined}
                aria-disabled={step.open ? undefined : true}
                {...(step.hint ? { title: step.hint } : {})}
                onClick={() => goTo(chapter.id)}>
                <span className="vnum">{chapter.num}</span><span className="vdot" /><span className="vlab">{chapter.k}</span>
              </button>
            </span>;
          })}
        </nav>
        <div className="head-end">
          {/* 顶栏原来这里还有一个「四川 · 物理类 · 2027」的上下文按钮（点它去「定位」）。
              负责人 2026-09-12 让删掉：它与航程条上的「定位」重复，且读数在定位页顶部本来就有。
              `.ctx-btn` 的样式留在 style.css 里（另一条线的窄屏守卫测试仍在断言它），只是不再有标记。 */}
          <button type="button" className="avatar" aria-label="设置" onClick={() => setSettingsOpen(true)}>溟</button>
        </div>
      </div>
    </header>

    <div className="wrap">
      {renderSail(ctx)}
      {renderLocate(ctx)}
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
      {CHAPTERS.map((chapter) => {
        const step = stepState(chapter.id);
        return <button type="button" key={chapter.id}
          className={`${step.done ? "done" : ""}${step.open ? "" : " locked"}`}
          aria-current={chapter.id === page ? "step" : undefined}
          aria-disabled={step.open ? undefined : true}
          {...(step.hint ? { title: step.hint } : {})}
          onClick={() => goTo(chapter.id)}>
          <Icon name={chapter.icon} /><span>{chapter.k}</span>
        </button>;
      })}
    </nav>

    {/* 设置卡片：任何一页都能打开；Esc、点背景、右上角关闭按钮都能退出。 */}
    {renderSettings({
      open: settingsOpen, onClose: () => setSettingsOpen(false), ai, setAi, clear,
      route, releaseId: state.release?.manifest.release_id ?? null,
      whisperOn, setWhisperOn, motionOff, setMotionOff
    })}

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
