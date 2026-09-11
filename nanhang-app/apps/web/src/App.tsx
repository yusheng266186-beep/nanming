import { useEffect, useMemo, useRef, useState } from "react";
import {
  ADDITIONAL_OPTIONS, ANSWER_STARTERS, DIRECTIONS, EXCEL_NOTICE, QUESTIONS, RELEASE_LABELS, SAMPLE_YEARS,
  SCORE_SEGMENTS, SELECTABLE_BATCHES, SYNTHETIC_NOTICE, axisMarks, batchOfferings, comparabilityNote,
  confirm, deny, directionCoverage, excelDevelopmentRows, initialState, isMatchFresh, loadPublishedRelease,
  recordAnswer, registerStartTool, reopen, resetLocal, routeMap, runMatch, scorePosition, skipAnswer,
  summary, withForm, type ExcelRow, type ModelContextLike, type WebState
} from "./model.js";
import { MAJOR_FACT_CARDS, explorationCards } from "@nanhang/exploration";
import { AI_NOTICE, askAi, disableAi, enableAi, initialAiPanel, isReplyStale, withSession, type AiPanelState } from "./ai-panel.js";
import { ArtSlot, BrandMark, Icon, KunArt, Sprite, type ArtName } from "./art.js";
import { Provenance, Uncharted } from "./theme.js";
import { AnswerStarters, ChatBubble, StreamedText, TypingDots, prefersReducedMotion } from "./chat.js";
import {
  QUALITY_BASE, formatGap, formatRate, formatScore, initialQualityAttempts, latestExam,
  loadQualityIndex, loadQualityShard, normalizeCode, recentTotals, registerFailure,
  subjectDistances, attemptsMessage, weakestKnowledge, classChanges, trailHeights,
  type QualityAttempts, type LoadedQuality
} from "./quality-huixi.js";

/**
 * The displayed reference year.
 *
 * The release chooses its own reference year from the history actually present; when a candidate
 * carries no source year we fall back to this constant rather than guessing a different one.
 */
const REFERENCE_YEAR = 2025;

const labels: Record<string, string> = {
  PHYSICS: "物理", HISTORY: "历史", CHEMISTRY: "化学", BIOLOGY: "生物", POLITICS: "政治", GEOGRAPHY: "地理",
  "本科批B段": "本科批B段", "高职(专科)批": "高职（专科）批",
  PASS: "符合已检查条件", UNKNOWN: "待核对", CONFIRMED: "已确认", DENIED: "已否认", PENDING: "待探索",
  AHEAD_OF_REFERENCE: "历史位置较有余量", BEHIND_REFERENCE: "需要更好位置", OVERLAPS_REFERENCE: "同分或边界重叠",
  NOT_COMPARABLE: "暂无比较依据", DATASET_WITHDRAWN: "数据版本已撤回，不能继续使用", TARGET_YEAR_PLAN_MISSING: "目标年度计划尚未发布",
  "syn-offer-cs": "计算机方向（合成）", "syn-offer-mech": "机械方向（合成）", "syn-offer-trade": "经贸方向（合成）"
};
const label = (value: unknown) => labels[String(value)] ?? String(value);

const CHAPTERS = [
  { id: "sail", num: "01", k: "起航", icon: "sail", art: "sea" },
  { id: "locate", num: "02", k: "定位", icon: "compass", art: "sea" },
  { id: "quality", num: "03", k: "成绩", icon: "log", art: "harbor" },
  { id: "talk", num: "04", k: "谈心", icon: "chat", art: "harbor" },
  { id: "direction", num: "05", k: "方向", icon: "layers", art: "compass" },
  { id: "axis", num: "06", k: "分数轴", icon: "axis", art: "lighthouse" },
  { id: "chart", num: "07", k: "航线图", icon: "route", art: "sea" }
] as const;
type PageId = (typeof CHAPTERS)[number]["id"];

/**
 * 荣县一中增强模式在本页的状态。
 *
 * `index` 与 `shard` 分开存放：年级/班级汇总是所有人共享的一份，学生本人的分片只有验证
 * 通过后才取回。验证失败只累计次数，不保留任何已取到的数据。
 */
interface QualityState {
  status: "idle" | "loading" | "ready" | "failed";
  index: LoadedQuality["index"] | null;
  shard: LoadedQuality["shard"] | null;
  attempts: QualityAttempts;
  message: string | null;
}
const initialQualityState: QualityState = { status: "idle", index: null, shard: null,
  attempts: initialQualityAttempts, message: null };

const DIRECTION_ARTS: ArtName[] = ["compass", "harbor", "lighthouse", "sea"];
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** The exploration experience card for a direction, and its linked professional fact card. */
const DIRECTION_CARDS = explorationCards();
const experienceCardFor = (directionId: string) =>
  DIRECTION_CARDS.find((card) => card.directionId === directionId) ?? null;
const majorCardFor = (directionId: string) => {
  const card = experienceCardFor(directionId);
  return card ? MAJOR_FACT_CARDS.find((major) => major.relatedExperienceId === card.cardId) ?? null : null;
};

/**
 * The historical position relations a match can report, and how they are drawn.
 *
 * These are the real relation categories of a candidate against its reference-year record, so the
 * route chart classifies what the matcher actually returned instead of asserting fixed score
 * scenarios. `route` colours sit on the light chart, `poster` colours on the dark export.
 */
const RELATION_CLASSES = [
  { key: "BEHIND_REFERENCE", label: "需更好位置", route: "#a97b34", poster: "#c89b52", dash: "6 10", width: 2, y: 78, cls: "far" },
  { key: "OVERLAPS_REFERENCE", label: "同分或边界重叠", route: "#12454f", poster: "#8fd0c0", dash: "", width: 2.6, y: 158, cls: "main" },
  { key: "AHEAD_OF_REFERENCE", label: "历史位置较有余量", route: "#7d9a86", poster: "#9fbdb6", dash: "2 7", width: 2, y: 238, cls: "safe" }
] as const;

const escapeXml = (value: string): string =>
  value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char] ?? char));

/** Turn a self-contained SVG poster into a PNG download. Resolves false when the browser refuses. */
function svgStringToPng(svg: string, width: number, height: number, filename: string): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!context) { resolve(false); return; }
      context.fillStyle = "#08202a";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob((png) => {
        if (!png) { resolve(false); return; }
        const out = URL.createObjectURL(png);
        const anchor = document.createElement("a");
        anchor.href = out;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        setTimeout(() => { URL.revokeObjectURL(out); anchor.remove(); }, 1500);
        resolve(true);
      }, "image/png");
    };
    image.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
    image.src = url;
  });
}

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

  const toggleSubject = (code: string) => {
    setState((current) => {
      const next = current.form.additional.includes(code)
        ? current.form.additional.filter((item) => item !== code)
        : [...current.form.additional, code].slice(-2);
      return withForm(current, { additional: next });
    });
  };
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
        const additional = shard.person.combination === "物化地"
          ? ["CHEMISTRY", "GEOGRAPHY"]
          : shard.person.combination === "历政地"
            ? ["POLITICS", "GEOGRAPHY"]
            : ["CHEMISTRY", "BIOLOGY"];
        setState((current) => withForm(current, { primary, additional,
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

  const chapterIcon = (name: string) => <Icon name={name} />;

  const renderSail = () => <section id="page-sail" className={`view${page === "sail" ? " active" : ""}`} aria-label="起航">
    <div className="hero">
      <div className="hero-copy">
        <div className="hero-hi"><Icon name="wave" /><span>适千里者，三月聚粮</span></div>
        <h1 className="song">北冥有鱼，<br />今将<em>徙于南溟。</em></h1>
        <p className="hero-quote">这不是一张志愿名单，而是一张属于你的《高考航线图》。<br />先看清此刻的海面，再决定扬帆的方向。
          <span>Every far shore begins with today&apos;s provision.</span></p>
        <div className="hero-act">
          <button type="button" className="btn brass" onClick={() => setPage("locate")}>开始起航<Icon name="arrow" /></button>
          <button type="button" className="tbtn" onClick={() => setPage("axis")}>先看看分数轴<Icon name="axis" /></button>
        </div>
        <div className="hero-foot">南溟用真实数据与你自己保存的原话，拼出一张能落地的航线。</div>
      </div>
      <div className="hero-art">
        <ArtSlot name="sea" />
        <button type="button" className="pole-star" aria-label="北辰" onClick={() => setShowKun(true)}><Icon name="star" /></button>
        <div className="art-tag">SET SAIL — 01</div>
        <div className="art-cap"><p>每一个远方，<br />都从今天开始准备。</p><span className="vert">南冥者，天池也</span></div>
      </div>
    </div>

    <div className="section">
      <div className="sec-head"><div><span className="eyebrow">Chapter 01 · 起航 · 北冥有鱼</span><h2 style={{ marginTop: 12 }}>选择你的登船方式</h2><p>两条入口，都通向同一片海。荣县一中增强模式是「加分项」，不是使用前提。</p></div></div>
      <div className="entry-grid">
        <button type="button" className={`entry${state.form.primary ? " picked" : ""}`} onClick={() => setPage("locate")}>
          <span className="eidx">01</span>
          <span className="elab"><Icon name="compass" />全国通用模式</span>
          <h3>自选科 + 自填情景分</h3>
          <p>任何省份、任何层次的同学都能用。选择你的选科组合，填入目标情景分，南溟按发布数据与合成演示为你定位。</p>
          <span className="efoot"><span>无需验证 · 立即开始</span><i className="carrow"><Icon name="arrow" /></i></span>
        </button>
        <button type="button" className={`entry deep${quality.status === "ready" ? " picked" : ""}`}
          onClick={() => setPage("quality")}>
          <span className="eidx">02</span>
          <span className="elab"><Icon name="shield" />荣县一中 · 增强模式</span>
          <h3>{quality.status === "ready" ? `已接入 · ${quality.shard?.person.classLabel ?? ""}` : "验证后读取质量慧析"}</h3>
          <p>{quality.status === "ready"
            ? "最近成绩、年级与班级位置、线差与知识点已读取。你仍可修改任何一项，增强模式只提供依据，不替你决定方向。"
            : "用班主任发放的 6 位验证码读取你自己的成绩记录，自动带入最近考试、班级与年级位置。不按姓名查询，也不显示任何同学的成绩。"}</p>
          <span className="efoot"><span>{quality.status === "ready" ? "增强能力 · 已启用" : "需要 6 位验证码"}</span><i className="carrow"><Icon name="arrow" /></i></span>
        </button>
      </div>

      {/* 选科与情景分必须在这里能设置，否则「选择你的选科组合」只是文案：
          位次、资格与匹配都依赖首选科目，没有它整页只能显示未知。 */}
      <div className="panel" style={{ marginTop: 22 }}>
        <h3><Icon name="compass" />先定下三件事</h3>
        <p className="psub">首选科目与再选科目决定「这个专业我能不能报」；情景分决定位次。两者都填好，后面的定位与匹配才有依据。</p>
        <div className="grid-2" style={{ marginTop: 18, gap: 22 }}>
          <div className="field">
            <span className="flab">首选科目</span>
            <div className="chips">
              {(["PHYSICS", "HISTORY"] as const).map((item) => <button type="button" key={item}
                className={`chip${state.form.primary === item ? " brass on" : ""}`}
                aria-pressed={state.form.primary === item}
                onClick={() => { setState((current) => withForm(current, { primary: current.form.primary === item ? null : item })); setToast(`首选科目：${label(item)}类`); }}>
                {label(item)}类
              </button>)}
            </div>
            <p className="fhint">2025 年起四川采用 3+1+2，物理类与历史类是两套独立的计划与位次。</p>
          </div>
          <div className="field">
            <span className="flab">再选科目（正好 2 门）</span>
            <div className="chips">
              {ADDITIONAL_OPTIONS.map((item) => {
                const on = state.form.additional.includes(item);
                const full = state.form.additional.length >= 2;
                return <button type="button" key={item}
                  className={`chip${on ? " brass on" : ""}`} aria-pressed={on}
                  onClick={() => {
                    if (!on && full) { setToast("再选科目正好 2 门，先取消一门再选。"); return; }
                    setState((current) => withForm(current, {
                      additional: current.form.additional.includes(item)
                        ? current.form.additional.filter((value) => value !== item)
                        : [...current.form.additional, item],
                    }));
                  }}>{label(item)}</button>;
              })}
            </div>
            <p className="fhint">选满 2 门才能判断资格。不确定的要求会显示「待核对」，不会被当成满足。</p>
          </div>
        </div>
        <label className="field" style={{ marginTop: 20, maxWidth: 320 }}>
          <span className="flab">目标情景分（可不填）</span>
          <input className="inp" type="number" min={0} max={750} inputMode="numeric"
            value={state.form.score ?? ""} placeholder="例如 600"
            onChange={(event) => setState((current) => withForm(current, { score: event.target.value ? Number(event.target.value) : null }))} />
        </label>
        <div className="chart-actions" style={{ justifyContent: "flex-start", marginTop: 18 }}>
          <button type="button" className="btn brass" onClick={() => setPage("locate")}>定好了，去定位<Icon name="arrow" /></button>
          <span className="muted-note">
            {state.form.primary
              ? `当前：${label(state.form.primary)}类 · 再选 ${state.form.additional.length ? state.form.additional.map(label).join("、") : "未选"} · 情景分 ${state.form.score ?? "未填"}`
              : "还没有选首选科目，位次与资格都会显示为未知。"}
          </span>
        </div>
        {toast ? <p className="feedback" aria-live="polite">{toast}</p> : null}
      </div>
    </div>

    <aside className="banner" data-mode={state.release ? "published" : "synthetic"}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <Icon name="shield" size="lg" />
        <div>
          <h3 className="song">{state.release ? `已载入发布数据 ${state.release.manifest.release_id}` : "当前为合成演示数据"}</h3>
          <p>{state.release
            ? "匹配使用已发布数据版本；历史年份的科类定义未逐行给出时，跨年比较按无法比较处理。"
            : SYNTHETIC_NOTICE}</p>
          <p className="muted-note">{RELEASE_LABELS[state.releaseStatus]}{state.releaseMessage ? ` ${state.releaseMessage}` : ""}</p>
        </div>
      </div>
    </aside>

    <div className="section">
      <div className="sec-head"><div><span className="eyebrow">The Voyage · 六章航程</span><h2 style={{ marginTop: 12 }}>一条航线，六次靠岸</h2><p>从看清水平，到聊出方向，再拖动分数看着候选一批批变化。</p></div></div>
      <div className="trio">
        <div className="mini"><span className="mk"><Icon name="compass" />02 定位</span><h4>看清此刻的海面</h4><p>情景分 → 位次 → 稳定性 → 趋势。控制线数据尚未随发布包提供时，南溟会诚实标注未知，而不是编造一条线。</p></div>
        <div className="mini"><span className="mk"><Icon name="chat" />03 谈心</span><h4>六到八个真问题</h4><p>每题都可以跳过。只有你保存的原话才能成为方向证据，AI 只提问，不替你下结论。</p></div>
        <div className="mini"><span className="mk"><Icon name="route" />06 航线图</span><h4>下一段路怎么走</h4><p>已确认方向、可用候选与两周行动，合成一张可打印的航线图。</p></div>
      </div>
    </div>

    <div className="quote-strip"><p>鲲之大，不知其几千里也；化而为鸟，其名为鹏。</p><span>—— 《庄子 · 逍遥游》</span></div>
  </section>;

  const renderLocate = () => {
    const history = state.form.history;
    const stability = history.length >= 2
      ? Math.sqrt(history.reduce((sum, item) => sum + (item - history.reduce((a, b) => a + b, 0) / history.length) ** 2, 0) / history.length)
      : null;
    const trend = history.length >= 2 ? history[history.length - 1]! - history[history.length - 2]! : null;
    // 位次与百分位来自官方分段表；没有表或分数不在公布范围时保持 null，页面显示未知。
    const position = scorePosition(state.release, state.form.primary, score);
    const marks = axisMarks(state.release, state.form.primary, score);
    // 公布范围条：把学生的情景分画在「官方公布的最低分 → 最高分」这条真实区间上。
    const bandRange = position ? Math.max(1, position.publishedMaxScore - position.publishedMinScore) : 0;
    const bandLeft = position ? (position.score - position.publishedMinScore) / bandRange * 100 : 0;
    return <section id="page-locate" className={`view${page === "locate" ? " active" : ""}`} aria-label="定位">
      <div className="page-head">
        <div><span className="eyebrow">Chapter 02 · 定位 · 测深</span>
          <h1 className="song">先看清，<em>我在哪片海域。</em></h1>
          <p className="lede">不给虚假精确的单点数字。成绩、位次、稳定性与趋势共同围出一段「真实水平区间」——这才是能站得住脚的起点。</p></div>
        <div className="head-aside">
          <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
          <p>知止而后有定，<br />定而后能静，静而后能安。</p></div>
      </div>
      <div className="locate">
        <div>
          <div className="gauge">
            <div className="gauge-top">
              <div><span className="eyebrow plain">目标情景分 · 裸分</span>
                <div className="bignum num" style={{ marginTop: 12 }}>{score === null ? <span className="absent">—</span> : score}<small>分</small></div></div>
              <div style={{ textAlign: "right" }}><span className="eyebrow plain">全省位次 · 参考年</span>
                <div className="bignum num" style={{ marginTop: 12, fontSize: 40 }}>
                  {position ? position.rank.toLocaleString("zh-CN") : <span className="absent">—</span>}</div>
                {!position && <div style={{ marginTop: 4 }}>
                  <Uncharted>{score === null ? "还没填情景分" : "该分数官方未列出"}</Uncharted>
                </div>}</div>
            </div>
            <div style={{ marginTop: 26 }}>
              <div className="bandbar">
                {position
                  ? <>
                    <div className="bandfill" style={{ left: `${clamp(bandLeft, 0, 100)}%`, width: "2px" }} />
                    <div className="bandmark" style={{ left: `${clamp(bandLeft, 0, 100)}%` }} />
                    <span className="bandtick" style={{ left: "2%" }}>{position.publishedMinScore}</span>
                    <span className="bandtick line" style={{ left: `${clamp(bandLeft, 6, 94)}%` }}>你 {position.score}</span>
                    <span className="bandtick" style={{ left: "98%" }}>{position.publishedMaxScore}</span>
                  </>
                  : <div className="band-empty">
                    {state.release
                      ? "该科类没有可用的官方分段表，或情景分不在公布范围内 · 不插值、不外推"
                      : "尚未载入发布数据 · 位次与范围保持未知"}
                  </div>}
              </div>
              <div className="slider-foot" style={{ color: "var(--mut)", marginTop: 9 }}>
                <span>{position ? `官方公布最低 ${position.publishedMinScore} 分` : "官方公布最低分"}</span>
                <span>{position ? `${position.tableYear} 年分段表 · 共 ${position.total.toLocaleString("zh-CN")} 人` : "分段表"}</span>
                <span>{position ? `官方公布最高 ${position.publishedMaxScore} 分` : "官方公布最高分"}</span>
              </div>
              <Provenance icon="ruler">
                这条区间是官方分段表实际公布的分数范围，不是本科线或特控线——发布包未提供控制线，因此不做线差计算。
              </Provenance>
            </div>
            <div className="stats">
              <div className="stat"><span className="sk"><Icon name="pin" />全省位次</span>
                <div className="sv num">{position ? position.rank.toLocaleString("zh-CN") : <span className="absent">—</span>}</div>
                <div className="sd">{position
                  ? `${position.tableYear} 年官方分段表 · 同分 ${position.count} 人`
                  : "该分数未在分段表中列出，或尚未载入发布数据"}</div></div>
              <div className="stat"><span className="sk"><Icon name="layers" />全省百分位</span>
                <div className="sv num">{position ? `前 ${position.percentile < 1 ? position.percentile.toFixed(2) : position.percentile.toFixed(1)}%` : "—"}</div>
                <div className="sd">{position
                  ? `同科类约 ${position.total.toLocaleString("zh-CN")} 人中的位置`
                  : "缺少分段表时不估算百分位"}</div></div>
              <div className="stat"><span className="sk"><Icon name="wave" />近五次稳定性</span>
                <div className="sv num">{stability === null ? "—" : `±${stability.toFixed(1)}`}</div>
                <div className="sd">{stability === null ? "尚未填写近五次成绩" : "波动越小，定位越可信"}</div></div>
              <div className="stat"><span className="sk"><Icon name="up" />近期趋势</span>
                <div className="sv num">{trend === null ? "—" : `${trend >= 0 ? "+" : ""}${trend}`}</div>
                <div className="sd">{trend === null ? "尚未填写近五次成绩" : "相对上一次的变化"}</div></div>
            </div>
          </div>
          <div className="verdict">
            <span className="eyebrow">Your True Range · 真实水平区间</span>
            <h3 className="song">把你的分数，翻译成一段可以站稳的区间。</h3>
            <div className="vlist">
              <span className="vpill">目标年份 <b>{state.form.targetYear}</b></span>
              <span className="vpill">科类 <b>{trackLabel}</b></span>
              <span className="vpill">再选 <b>{state.form.additional.length ? state.form.additional.map(label).join("、") : "未选择"}</b></span>
              <span className="vpill">情景分 <b>{score ?? "未填写"}</b></span>
              <span className="vpill">位次表年份 <b>{position ? position.tableYear : "未知"}</b></span>
              <span className="vpill">参考年 <b>{REFERENCE_YEAR}</b></span>
            </div>
            <p className="small">位次与百分位全部由官方分段表换算；分数不在公布范围时保留为未知，不插值也不外推。</p>
            {marks.length ? <div className="chips" style={{ marginTop: 14 }}>
              {marks.map((mark) => <span className="vpill" key={`${mark.score}-${mark.label}`}>
                {mark.label} <b>{mark.score}</b></span>)}
            </div> : null}
          </div>
        </div>
        <aside>
          <div className="sidecard">
            <span className="eyebrow plain">Stability · 近五次</span>
            <h3 className="song" style={{ marginTop: 10 }}>你的成绩曲线</h3>
            <div className="trend">
              {history.length >= 2
                ? history.map((value, index) => {
                  const max = Math.max(...history, 1);
                  return <div className={`tbar${index === history.length - 1 ? " now" : ""}`} key={index}>
                    <span className="col" style={{ height: `${Math.round(value / max * 100)}%` }} />
                    <span className="tl">{index + 1}</span>
                  </div>;
                })
                : <div className="empty-inline">尚未填写近五次成绩；此页不生成趋势结论。</div>}
            </div>
            <p className="fhint">曲线越平，说明当前定位越可信；起伏大时，我们用区间而非单点来表达。</p>
          </div>
          <div className="sidecard" style={{ marginTop: 22 }}>
            <span className="eyebrow plain">Evidence · 证据链</span>
            <h3 className="song" style={{ marginTop: 10 }}>每个数字都有依据</h3>
            <div className="evi">
              {state.answers.length === 0
                ? <p className="muted-note">还没有保存的本人表达。去「谈心」写下一句话，它才会进入证据链。</p>
                : state.answers.map((answer) => <div className="evi-row" key={answer.evidenceId}>
                  <Icon name="doc" /><span><b>{QUESTIONS.find((item) => item.questionId === answer.questionId)?.text ?? answer.questionId}</b><br />{answer.text}</span>
                </div>)}
            </div>
          </div>
        </aside>
      </div>
      <div className="banner">
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}><Icon name="chat" size="lg" />
          <div><h3 className="song">看清位置之后，聊聊你想去哪</h3><p>分数决定「能到哪」，兴趣决定「想去哪」。下一步，我们用六到八个问题聊出你的专业方向。</p></div></div>
        <button type="button" className="btn sm" style={{ flexShrink: 0 }} onClick={() => setPage("talk")}>去谈心<Icon name="arrow" /></button>
      </div>
    </section>;
  };

  const renderTalk = () => {
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
            <div className="chart-actions" style={{ justifyContent: "flex-start" }}>
              <button type="button" className="btn sm brass" onClick={sendAi} disabled={ai.pending || !ai.connected}>{ai.pending ? "等待回复…" : "发送给 AI"}</button>
              <small className="muted-note">AI 不可用时，浏览、探索、匹配与航线图全部照常可用。</small>
            </div>
            {ai.status ? <p className="feedback">{ai.status}</p> : null}
            {ai.reply ? <div className={`ai-reply${isReplyStale(ai, state.generation) ? " stale" : ""}`}>
              {isReplyStale(ai, state.generation) ? <p className="feedback">输入已改变，这条 AI 回复不再对应当前情况；重新发送可获得新的建议。</p> : null}
              {ai.reply}</div> : null}
            {ai.suggestions.length ? <ul className="tick-list" style={{ marginTop: 14 }}>{ai.suggestions.map((item) => <li key={item.rationale}>
              <Icon name="check" /><span><b>{item.directionId}</b>：{item.rationale}<br /><small>证据：{item.evidenceIds.join("、")}（需你在「方向」章节本人确认）</small></span></li>)}</ul> : null}
            {ai.actions.length ? <ul className="tick-list" style={{ marginTop: 14 }}>{ai.actions.map((action) => <li key={action}><Icon name="arrow" /><span>{action}</span></li>)}</ul> : null}
          </> : <p className="muted-note">关闭时不会发起任何网络请求。AI 不能修改资格、位次或数据发布状态。</p>}
        </div>
      </div>
    </section>;
  };

  const renderDirection = () => <section id="page-direction" className={`view${page === "direction" ? " active" : ""}`} aria-label="方向">
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

  const renderQuality = () => {
    const exam = quality.shard ? latestExam(quality.shard) : null;
    const distances = exam ? subjectDistances(exam) : [];
    const gaps = quality.shard ? weakestKnowledge(quality.shard, 6) : [];
    const moves = quality.shard ? classChanges(quality.shard) : [];
    const index = quality.index;
    const examRow = index && exam
      ? index.exams.find((row) => row.exam_code === exam.exam && row.track === quality.shard?.person.track) ?? null
      : null;
    const examClasses = index && exam ? index.classes.filter((row) => row.exam_code === exam.exam) : [];
    const examInsights = index && exam ? index.insights.filter((row) => row.exam_code === exam.exam) : [];
    const examSegments = index && exam ? index.segments.filter((row) => row.exam_code === exam.exam) : [];
    const examTrend = index?.trend ?? [];
    return <section id="page-quality" className={`view${page === "quality" ? " active" : ""}`} aria-label="成绩">
      <div className="page-head">
        <div><span className="eyebrow">Chapter 03 · 成绩 · 录航迹</span>
          <h1 className="song">先看清成绩，<em>再谈方向。</em></h1>
          <p className="lede">这一页读取学校质量复盘的真实成绩：最近考试、年级与班级位置、距线差与知识点。它只描述已经发生的事，不预测录取。</p></div>
        <div className="head-aside">
          <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
          <p>成绩是「现在在哪」，<br />方向是「想去哪」。<br />两件事分开看，先看前者。</p></div>
      </div>

      {quality.status !== "ready" && <div className="panel">
        <h3><Icon name="shield" />荣县一中增强模式</h3>
        <p className="psub">输入班主任发放的 6 位验证码。系统按验证码取回你本人的成绩分片，不搜索姓名、不显示同学成绩。没有验证码时，本页以外的全部功能照常可用。</p>
        <label className="field" style={{ maxWidth: 280, marginTop: 16 }}>
          <span className="flab">6 位验证码</span>
          <input className="inp" type="text" inputMode="numeric" autoComplete="off" maxLength={6}
            value={qualityCode}
            placeholder="例如 246810"
            aria-describedby="quality-hint"
            onChange={(event) => setQualityCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(event) => { if (event.key === "Enter") void verifyQualityCode(); }} />
        </label>
        <div className="hero-act" style={{ marginTop: 16 }}>
          <button type="button" className="btn brass" disabled={quality.status === "loading" || quality.attempts.blocked}
            onClick={() => void verifyQualityCode()}>
            {quality.status === "loading" ? "正在核对…" : "验证并接入"}<Icon name="arrow" />
          </button>
          <button type="button" className="tbtn" onClick={() => setPage("locate")}>先用通用模式</button>
        </div>
        <p className="fhint" id="quality-hint">{quality.message
          ?? `验证码只用于定位你本人的成绩文件；本机演示数据来自 ${QUALITY_BASE}。`}</p>
        <p className="fhint">说明：6 位数字在离线产物上可被穷举，因此增强模式当前只用于校内/本机演示；正式上线必须改为服务器校验并加限流。这里也再声明一次——本页不会因为成绩好就给出「你能上什么学校」的结论。</p>
      </div>}

      {quality.status === "ready" && quality.shard && exam && <div className="panel">
        <h3><Icon name="layers" />{quality.shard.person.name} · {quality.shard.person.classLabel}</h3>
        <p className="psub">{quality.shard.person.track} · {quality.shard.person.combination} · 共 {quality.shard.exams.length} 次考试记录。</p>
        <Provenance icon="log">
          数据来自质量慧析对学校复盘工作簿的解析，固定版本 <b>{index?.parserCommit.slice(0, 7) ?? "—"}</b>；
          本页只描述已经发生的考试，不预测录取。
        </Provenance>
        <div className="stats" style={{ marginTop: 18 }}>
          <div className="stat"><span className="sk"><Icon name="pin" />最近考试</span>
            <div className="sv num">{exam.exam}</div>
            <div className="sd">{exam.rawLabel}</div></div>
          <div className="stat"><span className="sk"><Icon name="axis" />赋分总分</span>
            <div className="sv num">{formatScore(exam.total)}</div>
            <div className="sd">本科线 {formatScore(exam.undergraduateTotal)} · 距线 {formatGap(exam.undergraduateDiff)}</div></div>
          <div className="stat"><span className="sk"><Icon name="layers" />校内位置</span>
            <div className="sv num">{exam.gradeRank ?? "—"}<small> / {exam.gradeSize ?? "—"}</small></div>
            <div className="sd">班级 {exam.classRank ?? "—"} / {exam.classSize ?? "—"} · 一本线 {formatScore(exam.topTotal)}</div></div>
          <div className="stat"><span className="sk"><Icon name="wave" />距一本线</span>
            <div className="sv num">{formatGap(exam.topDiff)}</div>
            <div className="sd">一本线 {formatScore(exam.topTotal)}；负数表示还差多少分</div></div>
        </div>
        {examRow && <p className="fhint" style={{ marginTop: 14 }}>
          {exam.exam} 本校 {exam.track} 共 {examRow.students} 人参考；一本上线 {examRow.top_count ?? "—"} 人（{formatRate(examRow.top_rate)}），
          本科上线 {examRow.undergraduate_count ?? "—"} 人（{formatRate(examRow.undergraduate_rate)}）。
          {exam.trackDiffersFromHome && `该场考试按${exam.track}统计（你平时在${quality.shard?.person.track}），位次、分数线与班级均分都取自这一场自己的口径。`}
        </p>}
      </div>}

      {quality.status === "ready" && quality.shard && <div className="panel">
        <h3><Icon name="axis" />最近一次考试的逐科位置</h3>
        <p className="psub">每一科都给出「本人分数 / 本科线 / 距线差」和与年级、班级均分的差。缺失或异常单元格显示为「—」，不按 0 分计算。</p>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">科目</th><th scope="col">分数</th><th scope="col">本科线</th><th scope="col">距本科线</th>
              <th scope="col">一本线</th><th scope="col">距一本线</th><th scope="col">年级均分差</th><th scope="col">班级均分差</th></tr></thead>
            <tbody>
              {distances.map((row) => <tr key={row.subject}>
                <th scope="row">{row.subject}</th>
                <td className="num">{row.value === null ? "—" : formatScore(row.value)}</td>
                <td className="num">{formatScore(row.undergraduateLine)}</td>
                <td className="num">{formatGap(row.undergraduateGap)}</td>
                <td className="num">{formatScore(row.topLine)}</td>
                <td className="num">{formatGap(row.topGap)}</td>
                <td className="num">{formatGap(row.gradeGap)}</td>
                <td className="num">{formatGap(row.classGap)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <p className="fhint">语数外与物理/历史为原分，化学/生物/政治/地理为赋分。距线差为负数表示还差多少分。</p>
      </div>}

      {quality.status === "ready" && quality.shard && quality.shard.exams.length > 1 && <div className="panel">
        <h3><Icon name="route" />航迹：历次总分与距线变化</h3>
        <p className="psub">只列你自己考过的场次。平均分随考试难度变化，因此不把「分数变化」写成教学增值。</p>
        {/* 航迹：把同一批数字先画成一条看得见的轨迹，下面是逐场明细。
            柱高按各自场次的总分画，缺考的场次留空，不补零。 */}
        <div className="trend" role="img" aria-label="历次考试总分轨迹">
          {(() => {
            const heights = trailHeights(quality.shard.exams.map((item) => item.total));
            return quality.shard!.exams.map((row, position) => {
              const height = heights[position] ?? null;
              return <div className="tbar" key={`trail-${row.exam}`}
                title={`${row.exam}：${row.total === null ? "缺考/无来源" : `${formatScore(row.total)} 分`}`}>
                {height === null
                  ? <span className="trail-gap" aria-hidden="true" />
                  : <span className="col" style={{ height: `${height}%` }} />}
                <span className="tl">{row.rawLabel ?? row.exam}</span>
              </div>;
            });
          })()}
        </div>
        <Provenance icon="log">
          柱高按各场次自己的总分画，缺考或没有来源总分的场次留空——不补成 0 分，也不与其它场次拉平比较。
        </Provenance>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">考试</th><th scope="col">总分</th><th scope="col">一本线</th><th scope="col">距一本</th>
              <th scope="col">本科线</th><th scope="col">距本科</th><th scope="col">校内位次</th><th scope="col">考试人数</th></tr></thead>
            <tbody>
              {quality.shard.exams.map((row) => <tr key={row.exam}>
                <th scope="row">{row.exam}{row.trackDiffersFromHome ? `（按${row.track}）` : ""}</th>
                <td className="num">{formatScore(row.total)}</td>
                <td className="num">{formatScore(row.topTotal)}</td>
                <td className="num">{formatGap(row.topDiff)}</td>
                <td className="num">{formatScore(row.undergraduateTotal)}</td>
                <td className="num">{formatGap(row.undergraduateDiff)}</td>
                <td className="num">{row.gradeRank ?? "—"}</td>
                <td className="num">{row.gradeSize ?? "—"}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        {moves.length > 0 && <p className="fhint">注意：你的班号在 {moves.map((row) => row.exam).join("、")} 发生变化，页面按各次考试的原始班号统计，班级均分差也随之切换。</p>}
      </div>}

      {quality.status === "ready" && gaps.length > 0 && <div className="panel">
        <h3><Icon name="layers" />知识点：最该先补的几块</h3>
        <p className="psub">按本人得分率从低到高排列，同时给出年级同知识点的得分率。得分率为 0 说明该题没拿到分，不代表这一块完全不会。</p>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">学科</th><th scope="col">知识点</th><th scope="col">本人得分率</th>
              <th scope="col">年级得分率</th><th scope="col">与年级差</th><th scope="col">考试</th></tr></thead>
            <tbody>
              {gaps.map((row) => <tr key={`${row.exam}-${row.subject}-${row.knowledge}`}>
                <th scope="row">{row.subject}</th>
                <td>{row.knowledge}</td>
                <td className="num">{formatRate(row.rate)}</td>
                <td className="num">{formatRate(row.gradeRate)}</td>
                <td className="num">{row.gradeRate === null ? "—" : formatGap((row.rate - row.gradeRate) * 100)} 个百分点</td>
                <td>{row.exam}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <p className="fhint">只统计有来源满分且本人有作答的小题；缺少分值的题不参与得分率计算，也不会被补成满分。</p>
      </div>}

      {quality.status === "ready" && index && <div className="panel">
        <h3><Icon name="compass" />年级与班级的整体位置</h3>
        <p className="psub">以下是匿名汇总，用于判断「我的位置意味着什么」，不含任何同学姓名。</p>
        <div className="grid-2" style={{ gap: 22 }}>
          <div>
            <span className="flab">各科年级均分（最近考试）</span>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th scope="col">科目</th><th scope="col">年级均分</th><th scope="col">本科有效上线率</th></tr></thead>
                <tbody>
                  {index.subjects.filter((row) => row.exam_code === exam?.exam).map((row) => <tr key={row.subject}>
                    <th scope="row">{row.subject}</th>
                    <td className="num">{formatScore(row.average)}</td>
                    <td className="num">{formatRate(row.undergraduate_effective_rate)}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <span className="flab">分层人数（最近考试）</span>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th scope="col">分层</th><th scope="col">人数</th><th scope="col">下一步</th></tr></thead>
                <tbody>
                  {examSegments.map((row) => <tr key={row.segment_id}>
                    <th scope="row">{row.label}</th>
                    <td className="num">{row.student_count}</td>
                    <td>{row.intent}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {examClasses.length > 0 && <>
          <span className="flab" style={{ display: "block", marginTop: 20 }}>班级对比（最近考试）</span>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">班级</th><th scope="col">人数</th><th scope="col">均分</th>
                <th scope="col">一本上线</th><th scope="col">本科上线</th><th scope="col">同类组</th></tr></thead>
              <tbody>
                {examClasses.map((row) => <tr key={row.class_no}>
                  <th scope="row">{row.label}</th>
                  <td className="num">{row.students}</td>
                  <td className="num">{formatScore(row.average)}</td>
                  <td className="num">{row.top_count ?? "—"}（{formatRate(row.top_rate)}）</td>
                  <td className="num">{row.undergraduate_count ?? "—"}（{formatRate(row.undergraduate_rate)}）</td>
                  <td>{row.class_type}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </>}
        {examTrend.length > 1 && <>
          <span className="flab" style={{ display: "block", marginTop: 20 }}>年级历次趋势（总分均分与上线人数）</span>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">考试</th><th scope="col">参考人数</th><th scope="col">均分</th>
                <th scope="col">一本上线</th><th scope="col">本科上线</th></tr></thead>
              <tbody>
                {examTrend.map((row) => <tr key={row.exam_code}>
                  <th scope="row">{row.exam_code}</th>
                  <td className="num">{row.students}</td>
                  <td className="num">{formatScore(row.average)}</td>
                  <td className="num">{row.top_count ?? "—"}</td>
                  <td className="num">{row.undergraduate_count ?? "—"}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </>}
      </div>}

      {quality.status === "ready" && index && examInsights.length > 0 && <div className="panel">
        <h3><Icon name="chat" />质量慧析给出的判断</h3>
        <p className="psub">这些结论来自学校这次复盘的统计口径，针对的是全年级，不是对你个人的评价。</p>
        <div className="dir-grid" style={{ marginTop: 14 }}>
          {examInsights.map((row) => <div className="dcard" key={`${row.exam_code}-${row.insight_id}`}>
            <div className="dc-head"><h4>{row.title}</h4></div>
            <p>{row.finding}</p>
            <p className="muted">{row.action}</p>
          </div>)}
        </div>
      </div>}

      {quality.status === "ready" && index && <div className="panel">
        <h3><Icon name="shield" />数据来源与健康度</h3>
        <ul className="kv">
          <li><span>发布版本</span><b>{index.releaseId}</b></li>
          <li><span>来源工作簿</span><b>{index.sourceWorkbook}</b></li>
          <li><span>解析器版本</span><b>{index.parserCommit.slice(0, 12)}</b></li>
          <li><span>覆盖</span><b>{index.counts.persons} 名学生 · {index.counts.observations} 条成绩 · {index.counts.exams} 次考试</b></li>
          <li><span>识别置信度</span><b>{formatRate(index.dataProfile.overall_confidence)}</b></li>
          <li><span>学科完整度</span><b>{formatRate(index.dataProfile.subject_completeness)}</b></li>
          <li><span>双线完整度</span><b>{formatRate(index.dataProfile.threshold_completeness)}</b></li>
          <li><span>总分重建</span><b>{index.dataProfile.reconstructed_totals ?? 0} 条（本数据始终为 0，缺失总分不重建）</b></li>
        </ul>
        <p className="fhint">{index.scoreBasis.rank}</p>
        {Object.keys(index.issueCounts).length > 0 && <p className="fhint">
          已知数据问题：{Object.entries(index.issueCounts).map(([code, count]) => `${code}×${count}`).join("，")}。
          逐条说明见数据库 data_issue 表与 docs/QUALITY_HUIXI_PIPELINE.md。</p>}
        <p className="fhint">{index.methodology.slice(0, 3).join(" ")}</p>
      </div>}
    </section>;
  };

  const renderAxis = () => {
    // 刻度用真实存在的东西：官方分段表公布的最低分/最高分，以及学生自己的情景分。
    // 项目没有公布的控制线，因此不画「本科线/特控线」——那是原设计的示意数据。
    const axisMarkList = axisMarks(state.release, state.form.primary, score);
    const axisPosition = scorePosition(state.release, state.form.primary, score);
    // 滑块范围始终取官方分段表公布的范围，与刻度同源。
    // 早先的做法是从「本次位次结果」推范围，没填分数时退回 300–700，
    // 结果刻度（150/691）被夹到错误位置，和滑块说的范围也对不上。
    const publishedBounds = axisMarkList.filter((mark) => mark.major).map((mark) => mark.score);
    const axisMin = publishedBounds.length > 0 ? Math.min(...publishedBounds) : 300;
    const axisMax = publishedBounds.length > 0 ? Math.max(...publishedBounds) : 700;
    // 没填分数时滑块停在正中，只表示「可以拖」，不假装已有一个分数。
    const sliderValue = clamp(score ?? Math.round((axisMin + axisMax) / 2), axisMin, axisMax);
    const sliderPct = axisMax > axisMin ? (sliderValue - axisMin) / (axisMax - axisMin) * 100 : 0;
    return <section id="page-axis" className={`view${page === "axis" ? " active" : ""}`} aria-label="分数轴">
      <div className="page-head">
        <div><span className="eyebrow">Chapter 06 · 分数轴 · 试风</span>
          <h1 className="song">如果我多考 <em>{score === null ? "—" : score}</em> 分。</h1>
          <p className="lede">前台单位是分数，后台判断用位次 + 线差 + 历史录取数据；位次退到「解释层」，不占主界面。</p></div>
        <div className="head-aside">
          <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
          <p>「努力」太抽象，<br />+20 分能多看到哪一批，<br />是具体、可想象的。</p></div>
      </div>
      <div className="axis-hero">
        <div className="axis-head">
          <div><span className="eyebrow">Score Axis · 拖动你的目标分</span>
            <h2 className="song">目标情景分每提高一分，可比较的候选就会重新排列。</h2>
            <p>拖动下面的金铜滑块，候选实时更新。真正的推荐单位是「专业 × 大学」，不是机械的 ±20 分。</p></div>
          <div className="delta-box"><div className="dk">目标情景分</div>
            <div className="delta-num num"><span>{score ?? "—"}</span></div></div>
        </div>
        <div className="slider-wrap">
          <div className="slider-scale">
            {/* 刻度只标「公布范围的上下界」与「你的情景分」。原来的实现把三个标签都居中排在
                同一高度，两端与刻度数字相撞（150/公布低段/2025 与 300 叠在一起）。这里按位置
                决定对齐方式：左端左对齐、右端右对齐、中间的（情景分）才居中，并让情景分单独
                占一行高度，避免与边界标签重叠。 */}
            {axisMarkList.map((mark) => {
              const pct = axisMax > axisMin ? (clamp(mark.score, axisMin, axisMax) - axisMin) / (axisMax - axisMin) * 100 : 0;
              const edge = pct <= 1 ? " start" : pct >= 99 ? " end" : "";
              return <span className={`stick${mark.major ? " major" : " own"}${edge}`}
                key={`${mark.score}-${mark.label}`} style={{ left: `${pct}%` }}>
                {mark.score}<b>{mark.label}</b></span>;
            })}
          </div>
          <div style={{ position: "relative" }}>
            <div className="axis-prog" style={{ width: `${sliderPct}%` }} />
            <div className="axis-now" style={{ left: `${sliderPct}%` }} />
            <input className="axis" type="range" min={axisMin} max={axisMax} step={1} value={sliderValue} aria-label="目标情景分"
              onChange={(event) => {
                const value = Number(event.target.value);
                const next = withForm(state, { score: value });
                setState(next);
                queueMatch(next);
              }} />
          </div>
          <div className="slider-foot">
            <span>{axisMin}{axisPosition ? "（公布最低）" : ""}</span>
            <span>{axisPosition
              ? `${axisPosition.tableYear} 年官方分段表 · 位次约 ${axisPosition.rank.toLocaleString("zh-CN")} 名`
              : score === null
                // 措辞要区分两件事：没填分数，和没有分段表。原来无论哪种都写「尚未载入分段表」，
                // 学生填了分却看到这句会以为数据没加载成功。
                ? "尚未填写情景分 · 填好后即可定位位次"
                : `参考年 ${REFERENCE_YEAR} · 该分数不在官方公布范围内`}</span>
            <span>{axisMax}{axisPosition ? "（公布最高）" : ""}</span>
          </div>
        </div>
      </div>
    <div className="chain">
      <div className={`chain-seg${state.form.batches.length === SELECTABLE_BATCHES.length ? " on" : ""}`}>
        <div className="ck">已选批次</div><div className="cn">{state.form.batches.length ? state.form.batches.map(label).join(" / ") : "未选择"}</div>
      </div>
      {SELECTABLE_BATCHES.map((batch) => {
        const count = batchOfferings(state.release, state.form.primary, batch);
        const on = state.form.batches.includes(batch);
        return <div className={`chain-seg${on ? " on" : ""}`} key={batch} role="button" tabIndex={0}
          onClick={() => toggleBatch(batch)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") toggleBatch(batch); }}>
          <div className="ck">{label(batch)}</div><div className="cn">{count === null ? "条数未知" : `${count.toLocaleString("zh-CN")} 条专业`}</div>
        </div>;
      })}
    </div>
    <p className="fhint">普通类批次之外还有提前批、专项计划等，本页暂不提供。</p>

    <div className="res-bar" style={{ marginTop: 24 }}>
      <div className="res-count">在目标情景分下，匹配到 <b>{fresh?.candidates.length ?? 0}</b> 个专业 × 院校</div>
      <div className="legend">
        <span><i style={{ background: "var(--reach)" }} />需更好位置</span>
        <span><i style={{ background: "var(--steady)" }} />边界重叠</span>
        <span><i style={{ background: "var(--safe)" }} />符合已检查条件</span>
      </div>
    </div>
    <div className="rfilters" style={{ marginBottom: 20 }}>
      <span className="chip" aria-pressed={false}>已确认方向 {(reading?.confirmed ?? []).length}</span>
      {state.form.additional.map((item) => <span className="chip" key={item}>{label(item)}</span>)}
    </div>

    <div className="chart-actions" style={{ justifyContent: "flex-start", marginBottom: 20 }}>
      <button type="button" className="btn brass" disabled={matching} onClick={runNow}>{matching ? "正在准备数据…" : "运行匹配"}</button>
      {state.match && !isMatchFresh(state) ? <span className="gap neg">输入或画像已改变，旧结果已失效，请重新运行。</span> : null}
    </div>
    {comparability ? <p className="basis">{comparability.basis}{comparability.limits ? ` ${comparability.limits}` : ""}</p> : null}
    {state.release && fresh && fresh.candidates.length > 0 && !comparability
      ? <p className="feedback">未找到该参考年的可比性记录，历史位置关系不应被採用；请核对发布包。</p> : null}
    {fresh && fresh.warnings.length ? <p className="feedback">数据提示：{fresh.warnings.map(label).join("；")}</p> : null}

    <div className="schools">
      {fresh && fresh.candidates.length > 0
        ? fresh.candidates.slice(0, 60).map((candidate) => {
          const entry = catalogueEntry(candidate.offering_id);
          const relation = candidate.group_reference.relation;
          const badge = candidate.eligibility.status === "PASS" ? "safe" : candidate.eligibility.status === "UNKNOWN" ? "plain" : "steady";
          // 标签直接来自工作簿原文，不推断、不评级；没有标签的院校就不显示这一行。
          const tags = (entry?.institutionTags ?? "").split("/").map((item) => item.trim()).filter(Boolean).slice(0, 4);
          return <article className="scard" key={candidate.offering_id}>
            <div className="scard-top">
              <span className={`rbadge ${badge}`}>{label(candidate.eligibility.status)}</span>
              <span className="sc-loc"><Icon name="pin" />{entry?.institutionName ?? "院校名称未随发布包提供"}{entry?.institutionCity ? ` · ${entry.institutionCity}` : ""}</span>
              <h3 className="song">{entry?.majorName ?? label(candidate.offering_id)}</h3>
              <div className="sc-tags">
                {entry?.category ? <span>{entry.category}</span> : null}
                {entry?.categoryClass && entry.categoryClass !== entry.category ? <span>{entry.categoryClass}</span> : null}
                <span>招生数 {entry?.planCount === null || entry?.planCount === undefined ? "未知" : entry.planCount}</span>
                <span>学费 {entry?.tuition === null || entry?.tuition === undefined ? "未知" : `¥${entry.tuition}`}</span>
              </div>
            </div>
            {tags.length ? <div className="sc-tags" style={{ margin: "0 20px 14px" }}>
              {tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div> : null}
            <div className="ranks">
              <div className="rank"><div className="ry">参考年</div><div className="rv num">{candidate.group_reference.source_year ?? REFERENCE_YEAR}</div></div>
              <div className="rank"><div className="ry">组位置</div><div className="rv">{label(relation)}</div></div>
              <div className="rank"><div className="ry">专业</div><div className="rv">{label(candidate.major_reference.relation)}</div></div>
            </div>
            <div className="sc-foot">
              <span className="gap"><b>{label(candidate.preference_status)}</b></span>
              <span className="sc-match"><Icon name="layers" />组与专业证据分开展示</span>
            </div>
            <Provenance>
              组位置取自 {candidate.group_reference.source_year ?? REFERENCE_YEAR} 年专业组记录，
              专业位置取该专业自己的记录；两者分列，缺一项就写「暂无比较依据」。
            </Provenance>
          </article>;
        })
        : <div className="empty">
          <Icon name="compass" size="xl" />
          <h3>{matching ? "正在载入已发布数据…" : "还没有可展示的候选"}</h3>
          <p>填写目标情景分、选择两门再选科目与批次后，点击「运行匹配」。</p>
        </div>}
    </div>
    <p className="fhint" style={{ margin: "22px 2px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
      <Icon name="doc" /><span>院校录取位次来自发布数据；未提供时显示为未知，不编造数字。</span></p>
    <div className="banner">
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}><Icon name="route" size="lg" />
        <div><h3 className="song">看够了？生成你的《南溟航线图》</h3><p>已确认方向、匹配候选与两周行动，一次看清。</p></div></div>
      <button type="button" className="btn sm brass" style={{ flexShrink: 0 }} onClick={() => setPage("chart")}>点亮航线图<Icon name="arrow" /></button>
    </div>
  </section>;
  };

  const renderChart = () => {
    const confirmed = map?.confirmed ?? [];
    const candidates = map?.candidates ?? [];
    const actions = map?.actions ?? [];
    const withScore = score !== null;

    // The three routes are not score scenarios. Each one buckets the matcher's real candidates by
    // their group record's historical reference relation, so a line reports where the student's
    // rank stands against last year's record — never an admission prediction.
    const relationGroups = RELATION_CLASSES.map((relation) => ({
      ...relation,
      items: candidates.filter((candidate) => candidate.group_reference.relation === relation.key)
    }));
    const drawable = relationGroups.some((group) => group.items.length > 0);

    const copyText = async () => {
      const lines = [
        `南溟航线图 · ${contextLabel}`,
        `情景分：${score ?? "未填写"}（参考年 ${REFERENCE_YEAR}）`,
        `已确认方向：${confirmed.map((item) => item.title).join("、") || "暂无"}`,
        `候选：${candidates.length ? `${candidates.length} 项` : "尚不能比较或结果已失效"}`,
        ...relationGroups.map((group) => `历史参考：${group.label} —— ${group.items.length} 项`),
        ...actions.map((action) => `行动：${action.title} —— ${action.detail}`)
      ];
      try {
        if (!navigator.clipboard) throw new Error("CLIPBOARD_UNAVAILABLE");
        await navigator.clipboard.writeText(lines.join("\n"));
        notify("已复制文字版航线图");
      } catch {
        notify("复制失败：浏览器未提供剪贴板权限，请改用「打印 / 另存为 PDF」。");
      }
    };
    // Save the drawn route chart as a real raster PNG. The on-screen SVG is serialized (so it
    // carries the current relations and labels), given an explicit size, then drawn to a canvas.
    // PNG export needs no print dialog; when the browser refuses the blob we fall back to printing.
    const savePng = async () => {
      const node = chartSvgRef.current;
      if (!node) { notify("当前浏览器无法导出图片，请改用「打印 / 另存为 PDF」。"); return; }
      const clone = node.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("width", "1000");
      clone.setAttribute("height", "320");
      const svg = new XMLSerializer().serializeToString(clone);
      const ok = await svgStringToPng(svg, 1000, 320, `南溟航线图-${state.form.targetYear}-${score ?? "未填分"}.png`);
      notify(ok ? "已保存 PNG 航线图" : "图片生成失败：浏览器拒绝导出，请改用「打印 / 另存为 PDF」。");
    };
    return <section id="page-chart" className={`view${page === "chart" ? " active" : ""}`} aria-label="航线图">
      <div className="page-head">
        <div><span className="eyebrow">Chapter 07 · 航线图 · 抟扶摇</span>
          <h1 className="song">你的<em>《南溟航线图》</em></h1>
          <p className="lede">已确认方向、候选与两周行动。这不是导出一个表格，而是一次有仪式感的启程。</p></div>
        <div className="head-aside">
          <svg className="head-rose" aria-hidden="true"><use href="#rose" /></svg>
          <p>水击三千里，<br />抟扶摇而上者九万里。</p></div>
      </div>
      <div className="chart-stage">
        <div className="chart-head">
          <span className="eyebrow">Chart of the Southern Deep</span>
          <h2 className="song">{withScore ? `从 ${score} 分的海面，到你想去的那片。` : "先填写目标情景分，航线才会亮起。"}</h2>
          <p className="sub">三条航线来自匹配结果中的历史参考关系分组，只反映你的位次与参考年记录的关系，不是录取预测，也不代表三种分数情景。</p>
          <div className="seal"><span className="song">南溟<br />航线</span></div>
        </div>
        <div className="routes">
          <svg ref={chartSvgRef} viewBox="0 0 1000 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="三条历史参考关系航线示意图">
            <defs><linearGradient id="rtSea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#eef0e6" /><stop offset="1" stopColor="#dfe6dd" /></linearGradient></defs>
            <rect width="1000" height="320" fill="url(#rtSea)" />
            <g stroke="#cbc4b0" strokeWidth={0.6} opacity={0.5}><path d="M0 300h1000M0 40h1000" /></g>
            {drawable ? <>
              {relationGroups.map((group) => <path key={group.key}
                d={`M96 ${group.y}C276 ${group.y - 26} 664 ${group.y + 22} 884 ${group.y}`}
                stroke={group.route} strokeWidth={group.width} strokeDasharray={group.dash || undefined} fill="none" strokeLinecap="round" />)}
              <g transform="translate(96,238)"><path d="M-16 0h32l-6 11h-20Z" fill="#0f262e" /><path d="M0 0V-26" stroke="#0f262e" strokeWidth={2} /><path d="M0-24 15-3H0Z" fill="#a97b34" /></g>
              <text x="90" y="272" fontSize="11" fill="#6d7f83" textAnchor="middle" fontFamily="sans-serif">现在 · {score} 分</text>
              {relationGroups.map((group) => <text key={group.key} x="898" y={group.y + 4} fontSize="13" fill={group.route} fontFamily="'Cormorant Garamond',serif" fontWeight={600}>{group.label} {group.items.length}</text>)}
              {confirmed.slice(0, 3).map((item, index) =>
                <text key={item.directionId} x={296} y={148 + index * 17} fontSize="12.5" fill="#2c444c" fontFamily="'Noto Serif SC',serif">{item.title}</text>)}
            </> : <text x="500" y="170" fontSize="14" fill="#6d7f83" textAnchor="middle" fontFamily="sans-serif">{withScore ? "还没有可绘制的结果，先运行一次匹配" : "尚未填写目标情景分"}</text>}
          </svg>
        </div>
        <div className="route-legend">
          {RELATION_CLASSES.map((relation) => <span className={`rl ${relation.cls}`} key={relation.key}>
            <span className="swatch" />{relation.label} · 历史参考
          </span>)}
        </div>
        <Provenance icon="chartmap">
          三条航线按<b>历史参考关系</b>分组：每条候选的位次与参考年记录逐条比较后再归类，
          不是按分数段人为划分。参考年记录来自发布包，未建立可比关系的年份不参与比较。
        </Provenance>
      </div>
      <div className="chart-cols">
        <div className="panel">
          <h3><Icon name="lighthouse" />专业灯塔</h3>
          <p className="psub">已确认方向，以及它们在你这个层次能到达的院校。</p>
          {confirmed.length === 0
            ? <p className="muted-note">还没有已确认方向。去「方向」确认后，灯塔才会亮起。</p>
            : confirmed.map((item) => <div className="beacon" key={item.directionId}>
              <span className="bi"><Icon name="lighthouse" /></span>
              <div><h4 className="song">{item.title}</h4>
                <p>方向标签缺失：暂无描述、专业清单与适配度。</p>
                <div className="bschools">方向与具体专业、院校的对应关系未随发布包提供，南溟不按列表顺序推断「可达」结论。</div>
              </div>
            </div>)}
        </div>
        <div className="panel">
          <h3><Icon name="up" />这 N 分，从哪几科拿回来</h3>
          <p className="psub">把「再努力一点」变成具体到每一科的分数目标。</p>
          <p className="muted-note">单科分数尚未接入：学校增强模式未开放，南溟不会凭空拆分各科提分空间。开放后，此处会按你的实际短板重算。</p>
          <p className="gain-note">这是提分优先级建议，不是承诺。</p>
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 22 }}>
        <h3><Icon name="shield" />保底路线 · 每条路都能通向远方</h3>
        <p className="psub">班里不止十几个人与自己有关。梦想院校 → 冲刺本科 → 普通本科 → 职业本科 → 优质高职 → 专升本，全链条都在图上。</p>
        <div className="safety">
          {[
            { icon: "up", k: "冲刺本科", t: "在当前层次之上，保留少量冲一冲的选择。" },
            { icon: "book", k: "普通本科", t: "与情景分匹配的主力区间。" },
            { icon: "shield", k: "职业本科", t: "与普通本科同等层次、同等学历学位，侧重产教融合与就业。" },
            { icon: "anchor", k: "订单/定向培养", t: "部分高职有企业订单班、公费师范、定向医学生，入学即锁定就业方向。" },
            { icon: "spark", k: "复读的取舍", t: "是否复读需结合稳定性与心理承受力，南溟不给出轻率建议。" }
          ].map((row) => <div className="srow" key={row.k}>
            <span className="sicon"><Icon name={row.icon} /></span>
            <div><h4 className="song">{row.k}</h4><p>{row.t}</p></div>
          </div>)}
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 22 }}>
        <h3><Icon name="route" />两周行动</h3>
        <p className="psub">航线图不是终点，而是可以立刻开始的几步。</p>
        {actions.length === 0
          ? <p className="muted-note">还没有可执行的行动；先保存一句你自己的表达并确认方向。</p>
          : <div className="safety">{actions.map((action) => <div className="srow" key={action.actionId}>
            <span className="sicon"><Icon name="arrow" /></span>
            <div><h4 className="song">{action.title}</h4><p>{action.detail}</p>
              <p className="muted-note">{action.horizonDays} 天内 · {action.reviewTrigger}</p></div>
          </div>)}</div>}
      </div>
      <div className="blessing">
        <span className="eyebrow">A Word For You · 写给你</span>
        <p className="song">愿你既有仰望星空的方向，也有脚踏实地的航线。远方很远，但每一次起航，都从今天这一分开始。</p>
        <div className="sign">—— 南 溟</div>
      </div>
      <div className="panel" style={{ marginTop: 22 }}>
        <h3><Icon name="doc" />本人数据</h3>
        <p className="psub">默认只留在当前内存；刷新页面即清空。只有主动下载时才会写入你的设备。</p>
        <div className="chart-actions" style={{ justifyContent: "flex-start" }}>
          <button type="button" className="btn sm" onClick={download}>下载本人 JSON</button>
          <button type="button" className="btn sm ghost" onClick={clear}>清除本次探索</button>
        </div>
      </div>
      <div className="chart-actions">
        <button type="button" className="btn brass" disabled={!drawable} onClick={() => { void savePng(); }}><Icon name="down" />保存为 PNG 图片</button>
        <button type="button" className="btn ghost" onClick={() => window.print()}><Icon name="doc" />打印 / 另存为 PDF</button>
        <button type="button" className="btn ghost" onClick={copyText}><Icon name="layers" />复制文字版</button>
        <button type="button" className="btn ghost" onClick={() => setPage("axis")}><Icon name="axis" />回去调分数</button>
      </div>
    </section>;
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
      {renderSail()}
      {renderLocate()}
      {renderQuality()}
      {renderTalk()}
      {renderDirection()}
      {renderAxis()}
      {renderChart()}

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
        {chapterIcon(chapter.icon)}<span>{chapter.k}</span>
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
