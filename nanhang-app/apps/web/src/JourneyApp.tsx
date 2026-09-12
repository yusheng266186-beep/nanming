import { useEffect, useMemo, useRef, useState } from "react";
import { loadRelease, type LoadedRelease } from "@nanhang/release-loader";
import { SELECTABLE_BATCHES } from "@nanhang/match-input";
import { Sprite, Icon, BrandMark, ArtSlot } from "./art.js";
import { DEFAULT_API_BASE } from "./ai-panel.js";
import {
  beginTurn,
  runAiTurn,
  type AiEvidence,
  type ChatMode,
  type ThinkingTier,
} from "./ai-client.js";
import { additionalFromCombination, recentExams } from "./quality-huixi.js";
import type { QualityShard } from "./quality-types.js";
import type { ExamRecord } from "./model.js";
import {
  makeBranches,
  rangeFromExams,
  validRange,
  type SchoolPool,
  type ScoreRange,
  type Track,
  type RouteBranch,
} from "./journey-model.js";
import "./journey.css";

const SUBJECTS = [
  { id: "CHEMISTRY", name: "化学" },
  { id: "BIOLOGY", name: "生物" },
  { id: "POLITICS", name: "政治" },
  { id: "GEOGRAPHY", name: "地理" },
];
const STEPS = ["选择科目", "取得成绩", "AI 谈方向", "我选专业", "我的航线"];
const EMPTY_EXAMS: ExamRecord[] = Array.from({ length: 3 }, (_, i) => ({
  label: `第 ${i + 1} 次考试`,
  total: null,
  rank: null,
  topTotal: null,
  undergraduateTotal: null,
}));
interface Suggestion {
  directionId: string;
  evidenceIds: string[];
  rationale: string;
}
interface Message {
  role: "user" | "assistant";
  text: string;
}
const numeric = (value: string): number | null =>
  value === "" ? null : Number(value);

export default function JourneyApp() {
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [track, setTrack] = useState<Track | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [source, setSource] = useState<"external" | "school">("external");
  const [scoreMode, setScoreMode] = useState<"target" | "exams">("target");
  const [target, setTarget] = useState<number | null>(null);
  const [range, setRange] = useState<ScoreRange | null>(null);
  const [exams, setExams] = useState<ExamRecord[]>(EMPTY_EXAMS);
  const [batches, setBatches] = useState<string[]>([
    ...SELECTABLE_BATCHES.slice(0, 1),
  ]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [school, setSchool] = useState<QualityShard | null>(null);
  const [schoolBusy, setSchoolBusy] = useState(false);
  const [release, setRelease] = useState<LoadedRelease | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [pool, setPool] = useState<SchoolPool | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ChatMode>("guided");
  const [tier, setTier] = useState<ThinkingTier>("deep");
  const [history, setHistory] = useState<Message[]>([]);
  const [evidence, setEvidence] = useState<AiEvidence[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [demoService, setDemoService] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [visible, setVisible] = useState(36);
  const [branchLimit, setBranchLimit] = useState<Record<string, number>>({});
  const [confirmReset, setConfirmReset] = useState(false);
  const [printing, setPrinting] = useState(false);
  const revision = useRef(0);
  const runId = useRef(crypto.randomUUID());
  const request = useRef<AbortController | null>(null);
  const worker = useRef<Worker | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null);
  const chatEnd = useRef<HTMLDivElement | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError(null);
    void loadRelease({ signal: controller.signal })
      .then((value) => {
        if (value.manifest.synthetic || value.manifest.status !== "PUBLISHED")
          throw new Error("当前发布数据不可用。");
        if (!controller.signal.aborted) setRelease(value);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setLoadError(
            "招生数据暂时没有载入。请检查网络后重试，结果不会使用示例数据代替。",
          );
      });
    return () => controller.abort();
  }, [reload]);
  useEffect(
    () => () => {
      mounted.current = false;
      request.current?.abort();
      worker.current?.terminate();
    },
    [],
  );
  useEffect(() => {
    heading.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);
  useEffect(() => {
    if (!pending) {
      setSeconds(0);
      return;
    }
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [pending]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [history, pending]);
  useEffect(() => {
    if (!printing) return;
    const frame = requestAnimationFrame(() => {
      window.print();
      setPrinting(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [printing]);
  const branch = useMemo(
    () =>
      pool
        ? makeBranches(
            pool,
            suggestions.map((s) => s.directionId),
            selected,
          )
        : [],
    [pool, suggestions, selected],
  );
  const canSubjects = track !== null && subjects.length === 2;
  const filteredMajors = useMemo(
    () =>
      pool?.majors.filter(
        (m) =>
          (!filter || m.directionId === filter) &&
          (!query || m.name.includes(query) || m.category.includes(query)),
      ) ?? [],
    [pool, query, filter],
  );
  const aiNames =
    pool?.directions.filter((d) =>
      suggestions.some((s) => s.directionId === d.id),
    ) ?? [];
  const go = (next: number) => {
    setError(null);
    setStep(next);
    setFurthest((f) => Math.max(f, next));
  };
  const invalidate = () => {
    revision.current++;
    worker.current?.terminate();
    request.current?.abort();
    setBusy(false);
    setPending(false);
    setSchoolBusy(false);
    setConnecting(false);
    setPool(null);
    setSuggestions([]);
    setOptions([]);
    setHistory([]);
    setEvidence([]);
    setSelected([]);
    setFurthest(canSubjects ? 1 : 0);
    setError(null);
  };
  const changeTrack = (value: Track) => {
    if (value === track) return;
    invalidate();
    setTrack(value);
    setSchool(null);
    setRange(null);
  };
  const changeSubject = (id: string) => {
    if (!subjects.includes(id) && subjects.length === 2) return;
    invalidate();
    setSchool(null);
    setRange(null);
    setSubjects((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  };
  const useTarget = (value: number | null) => {
    invalidate();
    setTarget(value);
    setRange(
      value === null
        ? null
        : {
            low: Math.max(0, value - 10),
            high: Math.min(750, value + 10),
            basis:
              "目标分上下各 10 分作为初始探索范围，可自行调整；不是录取概率。",
          },
    );
  };
  const deriveRange = (records: ExamRecord[]) => {
    if (!track) return;
    const next = rangeFromExams(records, track);
    setRange(next);
    if (!next)
      setError(
        "请至少填写一次总分和该场考试的特控线或本科线，或改用目标分数。",
      );
  };
  const identify = async () => {
    if (!name.trim() || !/^\d{6}$/.test(code)) {
      setError("请填写学生姓名和六位数字验证码。");
      return;
    }
    const stamp = revision.current;
    setSchoolBusy(true);
    setError(null);
    const controller = new AbortController();
    request.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${DEFAULT_API_BASE}/v1/school/identify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), code }),
        signal: controller.signal,
      });
      const result = (await response.json()) as {
        shard?: QualityShard;
        message?: string;
      };
      if (!response.ok || !result.shard)
        throw new Error(result.message ?? "学校成绩未能载入。");
      if (stamp !== revision.current) return;
      const shard = result.shard;
      const actual = shard.person.track === "物理类" ? "PHYSICS" : "HISTORY";
      const actualSubjects = additionalFromCombination(
        shard.person.combination,
      );
      if (
        actual !== track ||
        !actualSubjects ||
        actualSubjects.slice().sort().join() !== subjects.slice().sort().join()
      )
        throw new Error(
          "学校记录的选科与刚才选择不同，请返回核对选科后重新识别。",
        );
      setSchool(shard);
      setName("");
      setCode("");
      const recent = recentExams({
        ...shard,
        exams: shard.exams.filter((exam) => exam.track === shard.person.track),
      });
      setExams(recent);
      deriveRange(recent);
    } catch (e) {
      if (stamp === revision.current)
        setError(
          e instanceof Error && e.name !== "AbortError"
            ? e.message
            : "识别超时或已取消，请重试。",
        );
    } finally {
      clearTimeout(timer);
      if (stamp === revision.current) setSchoolBusy(false);
    }
  };
  const match = () => {
    if (
      !release ||
      !track ||
      !range ||
      !validRange(range.low, range.high) ||
      !batches.length
    )
      return;
    const stamp = revision.current;
    setBusy(true);
    setError(null);
    worker.current?.terminate();
    const job = new Worker(new URL("./journey-worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = job;
    job.onmessage = (
      event: MessageEvent<{ ok: boolean; pool?: SchoolPool; message?: string }>,
    ) => {
      job.terminate();
      if (stamp !== revision.current || !mounted.current) return;
      setBusy(false);
      if (event.data.ok && event.data.pool) {
        setPool(event.data.pool);
        setSuggestions([]);
        setSelected([]);
      } else setError(event.data.message ?? "匹配没有完成，请调整范围后重试。");
    };
    job.onerror = () => {
      job.terminate();
      if (stamp === revision.current) {
        setBusy(false);
        setError("匹配未能完成，请重试。");
      }
    };
    job.postMessage([release, track, subjects, range, batches]);
  };
  const connect = async () => {
    if (!accessCode.trim()) return;
    setConnecting(true);
    setError(null);
    const stamp = revision.current;
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${DEFAULT_API_BASE}/v1/access/exchange`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ access_code: accessCode }),
        signal: controller.signal,
      });
      const data = (await response.json()) as { token?: string };
      if (!response.ok || !data.token)
        throw new Error("对话连接未成功，请核对访问码或稍后重试。");
      if (stamp === revision.current) {
        setToken(data.token);
        setAccessCode("");
      }
      const ready = (await fetch(`${DEFAULT_API_BASE}/readyz`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .catch(() => null)) as { upstream?: string } | null;
      if (stamp === revision.current)
        setDemoService(ready?.upstream === "fake-local");
    } catch (e) {
      if (stamp === revision.current)
        setError(
          e instanceof Error && e.name !== "AbortError"
            ? e.message
            : "连接超时，请重试。",
        );
    } finally {
      clearTimeout(timer);
      if (stamp === revision.current) setConnecting(false);
    }
  };
  const send = async (text = draft) => {
    const clean = text.trim();
    if (!pool || !token || pending || !clean || clean.length > 500) return;
    const stamp = revision.current;
    const controller = new AbortController();
    request.current = controller;
    const requestId = crypto.randomUUID();
    const currentEvidence: AiEvidence = {
      evidenceId: `ev-${requestId}`,
      quote: clean,
      kind: "student_self_report",
    };
    const nextEvidence = [...evidence, currentEvidence].slice(-12);
    const before = history.slice(-8);
    setFurthest(2);
    setEvidence(nextEvidence);
    setHistory((h) => [...h, { role: "user", text: clean }]);
    setDraft("");
    setPending(true);
    setError(null);
    setSuggestions([]);
    setOptions([]);
    const active = { runId: runId.current, inputRevision: stamp };
    const timer = setTimeout(() => controller.abort(), 310000);
    try {
      const result = await runAiTurn(
        { baseUrl: DEFAULT_API_BASE, token, signal: controller.signal },
        beginTurn(active, requestId),
        active,
        {
          runId: active.runId,
          requestId,
          inputRevision: stamp,
          userText: clean,
          context: before,
          tier,
          mode,
          evidence: nextEvidence,
          directionCatalog: pool.directions,
        },
      );
      if (stamp !== revision.current || controller.signal.aborted) return;
      if (result.outcome.status !== "applied")
        throw new Error(
          "这次 AI 没有完成回复。你的话已保留，可以重试；不会切换成固定问答。",
        );
      const completion = [...result.events]
        .reverse()
        .find((e) => e.event === "complete")?.data.output as
        | { suggestions?: Suggestion[] }
        | undefined;
      const allowed = new Set(pool.directions.map((d) => d.id));
      const allowedEvidence = new Set(nextEvidence.map((e) => e.evidenceId));
      const grounded = (completion?.suggestions ?? []).filter(
        (s) =>
          allowed.has(s.directionId) &&
          s.evidenceIds.length > 0 &&
          s.evidenceIds.every((id) => allowedEvidence.has(id)),
      );
      setSuggestions(grounded);
      setOptions(mode === "guided" ? [...result.outcome.options] : []);
      setHistory((h) => [
        ...h,
        { role: "assistant", text: result.outcome.reply ?? "" },
      ]);
    } catch (e) {
      if (stamp === revision.current) {
        setError(
          controller.signal.aborted
            ? "已停止等待，你的输入已保留。可以换快档重试。"
            : e instanceof Error
              ? e.message
              : "对话暂不可用，请重试。",
        );
        setDraft(clean);
      }
    } finally {
      clearTimeout(timer);
      if (stamp === revision.current) setPending(false);
    }
  };
  const changeMode = (value: ChatMode) => {
    if (pending) return;
    setMode(value);
    setOptions([]);
  };
  const toggleMajor = (id: string) => {
    setSelected((items) =>
      items.includes(id) ? items.filter((x) => x !== id) : [...items, id],
    );
    setBranchLimit({});
  };
  const reset = () => {
    if (token)
      void fetch(`${DEFAULT_API_BASE}/v1/session`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      }).catch(() => {});
    invalidate();
    setToken(null);
    setTrack(null);
    setSubjects([]);
    setSchool(null);
    setRange(null);
    setTarget(null);
    setExams(EMPTY_EXAMS);
    setName("");
    setCode("");
    setDraft("");
    setAccessCode("");
    setQuery("");
    setFilter("");
    setSource("external");
    setScoreMode("target");
    setFurthest(0);
    setStep(0);
    setConfirmReset(false);
    runId.current = crypto.randomUUID();
  };
  const download = () => {
    if (!pool) return;
    const report = {
      createdAt: new Date().toISOString(),
      releaseId: pool.releaseId,
      referenceYear: pool.referenceYear,
      subjects: [track, ...subjects],
      range: pool.range,
      note: "历史区间与专业探索结果，不保证录取；专业组参考不等于专业录取线。",
      routes: branch.map((b) => ({
        title: b.title,
        majors: b.majors.map((m) => m.name),
        offerings: b.rows.map((r) => ({
          school: r.label.institutionName,
          major: r.label.majorName,
          offeringId: r.label.offeringId,
          reference: r.reference,
          eligibility: r.candidate.eligibility.status,
        })),
      })),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "南溟-我的航线.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const scoreFields = (
    <div className="j-exams">
      {exams.map((exam, i) => (
        <fieldset key={i}>
          <legend>{exam.label || `第 ${i + 1} 次考试`}</legend>
          <div className="j-fields">
            {(
              [
                { key: "total", label: "总分" },
                { key: "topTotal", label: "本次特控线" },
                { key: "undergraduateTotal", label: "本次本科线" },
              ] as const
            ).map((field) => (
              <label key={field.key}>
                {field.label}
                <input
                  type="number"
                  min="0"
                  max="750"
                  step="1"
                  value={exam[field.key] ?? ""}
                  disabled={source === "school"}
                  onChange={(e) => {
                    invalidate();
                    setRange(null);
                    setExams((items) =>
                      items.map((item, n) =>
                        n === i
                          ? { ...item, [field.key]: numeric(e.target.value) }
                          : item,
                      ),
                    );
                  }}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
  const poolSummary = pool && (
    <div className="j-pool" aria-live="polite">
      <span className="j-eyebrow">成绩范围已准备好</span>
      <div className="j-metrics">
        <div>
          <strong>{pool.schoolCount}</strong>
          <span>所院校</span>
        </div>
        <div>
          <strong>{pool.rows.length}</strong>
          <span>条院校专业记录</span>
        </div>
        <div>
          <strong>
            {pool.range.low}–{pool.range.high}
          </strong>
          <span>分 · 当前探索区间</span>
        </div>
      </div>
      <p>
        按 {pool.referenceYear}{" "}
        年同科类历史位次筛选；先保留这个范围，再根据专业方向细选。
      </p>
      {pool.missingHistory > 0 && (
        <small>
          {pool.missingHistory} 条记录缺少可用历史依据，未进入区间结果。
        </small>
      )}
      {pool.rows.length === 0 && (
        <p>
          当前区间没有命中记录。可返回调整区间；仍可聊专业，最终结果会如实显示没有匹配项。
        </p>
      )}
    </div>
  );
  const renderBranch = (item: RouteBranch) => (
    <section className={`j-route j-route-${item.kind}`} key={item.kind}>
      <header>
        <span className="j-eyebrow">
          {item.kind === "shared"
            ? "两条路在这里相遇"
            : item.kind === "ai"
              ? "从对话中发现"
              : "为自己的想法留一条路"}
        </span>
        <h2>{item.title}</h2>
        <p>
          {item.majors.length} 个库内专业 · 当前区间 {item.rows.length} 条记录
        </p>
      </header>
      <div className="j-tags">
        {item.majors.slice(0, 12).map((m) => (
          <span key={m.id}>{m.name}</span>
        ))}
        {item.majors.length > 12 && (
          <span>另 {item.majors.length - 12} 个</span>
        )}
      </div>
      {item.rows.length === 0 ? (
        <div className="j-empty">
          专业在库内，但当前分数区间、选科和批次没有命中院校专业。保留这条选择，不自动扩大范围。
        </div>
      ) : (
        <div className="j-results">
          {item.rows
            .slice(
              0,
              printing ? item.rows.length : (branchLimit[item.kind] ?? 6),
            )
            .map((row) => (
              <article key={row.label.offeringId}>
                <div className="j-card-top">
                  <span>
                    {row.label.institutionCity ?? "地区未注明"} ·{" "}
                    {row.label.batch}
                  </span>
                  <span>
                    {row.candidate.eligibility.status === "PASS"
                      ? "已知选科条件符合"
                      : "还有条件待核实"}
                  </span>
                </div>
                <h3>{row.label.institutionName}</h3>
                <p className="j-major-title">{row.label.majorName}</p>
                <p>
                  {pool!.referenceYear} 年
                  {row.reference === "major" ? "专业录取" : "专业组"}参考 ·
                  历史位次{" "}
                  {(
                    (row.reference === "major"
                      ? row.candidate.major_reference
                      : row.candidate.group_reference
                    ).reference_rank_interval ?? []
                  ).join("–")}
                </p>
                {row.reference === "group" && (
                  <p className="j-caution">
                    只有专业组依据，具体专业门槛未知。
                  </p>
                )}
                <details>
                  <summary>查看来源与条件</summary>
                  <p>
                    计划人数：{row.label.planCount ?? "未注明"} · 专业组：
                    {row.label.groupId}
                  </p>
                  <p>发布版本：{pool!.releaseId}</p>
                  <p className="j-break">记录：{row.label.offeringId}</p>
                  <p className="j-break">
                    依据：
                    {(row.reference === "major"
                      ? row.candidate.major_reference
                      : row.candidate.group_reference
                    ).evidence_ids.join("、")}
                  </p>
                  {row.candidate.eligibility.pending_requirements.length >
                    0 && (
                    <p>
                      待核实条件：
                      {row.candidate.eligibility.pending_requirements.join(
                        "、",
                      )}
                    </p>
                  )}
                </details>
              </article>
            ))}
        </div>
      )}
      {item.rows.length > (branchLimit[item.kind] ?? 6) && (
        <button
          className="j-secondary"
          onClick={() =>
            setBranchLimit((values) => ({
              ...values,
              [item.kind]: (values[item.kind] ?? 6) + 24,
            }))
          }
        >
          再看 24 条
        </button>
      )}
    </section>
  );

  return (
    <div className="journey">
      <Sprite />
      <a className="j-skip" href="#journey-main">
        跳到主要内容
      </a>
      <header className="j-header">
        <a
          className="j-brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go(0);
          }}
          aria-label="南溟，返回选科"
        >
          <BrandMark />
          <span>
            南溟<small>从此处，望向更远</small>
          </span>
        </a>
        <div className="j-header-right">
          <span className="j-label">四川 · 高考目标探索</span>
          <button
            className="j-text-button"
            onClick={() => setConfirmReset(true)}
          >
            重新开始
          </button>
        </div>
      </header>
      <nav className="j-steps" aria-label="探索进度">
        {STEPS.map((title, i) => (
          <button
            key={title}
            aria-current={step === i ? "step" : undefined}
            disabled={i > furthest || (i > 1 && !pool)}
            onClick={() => go(i)}
          >
            <span>{i < step ? "✓" : `0${i + 1}`}</span>
            <b>{title}</b>
          </button>
        ))}
      </nav>
      <main id="journey-main" className="j-main">
        <div className="j-page-heading">
          <span className="j-eyebrow">航程 {`0${step + 1}`} / 05</span>
          <h1 ref={heading} tabIndex={-1}>
            {
              [
                "先选科，再看远方。",
                "从你的成绩出发。",
                "聊一聊，你想走的方向。",
                "也给自己的想法一次机会。",
                "两条来路，一张属于你的航线。 ",
              ][step]
            }
          </h1>
          <p>
            {
              [
                "语文、数学、外语之外，告诉我们你的首选科目和两门再选科目。",
                "选择一种方式取得成绩，我们会先准备分数区间内的院校。",
                "两种聊法，同一位 AI。建议来自你说过的话，方向来自真实专业库。",
                "AI 的建议和你的选择都值得保留。相同的合并，不同的分别看结果。",
                "这里保留相同方向，也尊重不同选择。所有院校专业都来自本次发布库。",
              ][step]
            }
          </p>
        </div>
        {loadError && (
          <div className="j-alert" role="alert">
            {loadError}
            <button onClick={() => setReload((n) => n + 1)}>重新载入</button>
          </div>
        )}
        {error && (
          <div className="j-alert" role="alert">
            {error}
          </div>
        )}
        {step === 0 && (
          <div className="j-opening">
            <section className="j-panel">
              <fieldset>
                <legend>
                  首选科目 <small>选 1 门</small>
                </legend>
                <div className="j-two">
                  {(
                    [
                      {
                        id: "PHYSICS",
                        name: "物理",
                        hint: "从规律与结构理解世界",
                      },
                      {
                        id: "HISTORY",
                        name: "历史",
                        hint: "从时间与人文理解世界",
                      },
                    ] as const
                  ).map((item) => (
                    <button
                      className="j-choice"
                      key={item.id}
                      aria-pressed={track === item.id}
                      onClick={() => changeTrack(item.id)}
                    >
                      <span className="j-choice-symbol">
                        {item.id === "PHYSICS" ? "◈" : "◎"}
                      </span>
                      <strong>{item.name}</strong>
                      <small>{item.hint}</small>
                      <i>{track === item.id ? "✓" : "+"}</i>
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>
                  再选科目 <small>已选 {subjects.length} / 2</small>
                </legend>
                <div className="j-subjects">
                  {SUBJECTS.map((item) => (
                    <button
                      key={item.id}
                      aria-pressed={subjects.includes(item.id)}
                      disabled={
                        !subjects.includes(item.id) && subjects.length === 2
                      }
                      onClick={() => changeSubject(item.id)}
                    >
                      {item.name}
                      <span>{subjects.includes(item.id) ? "✓" : "+"}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="j-next">
                <p>后续院校专业会先检查你的选科条件。</p>
                <button
                  className="j-primary"
                  disabled={!canSubjects}
                  onClick={() => go(1)}
                >
                  下一步 · 取得成绩 <span>→</span>
                </button>
              </div>
            </section>
            <aside className="j-ocean">
              <ArtSlot name="sea" />
              <div>
                <span className="j-eyebrow">你的选择，是这次航程的起点</span>
                <p>
                  先找到能看见的海岸，
                  <br />
                  再决定想去的远方。
                </p>
              </div>
              <span className="j-orbit j-orbit-one" />
              <span className="j-orbit j-orbit-two" />
            </aside>
          </div>
        )}
        {step === 1 && (
          <section className="j-panel">
            <div className="j-source" role="group" aria-label="成绩来源">
              <button
                className="j-choice"
                aria-pressed={source === "external"}
                onClick={() => {
                  if (source !== "external") {
                    invalidate();
                    setSource("external");
                    setRange(null);
                    setExams(EMPTY_EXAMS);
                    setSchool(null);
                  }
                }}
              >
                <strong>校外考生</strong>
                <small>目标分数，或近几次考试</small>
              </button>
              <button
                className="j-choice"
                aria-pressed={source === "school"}
                onClick={() => {
                  if (source !== "school") {
                    invalidate();
                    setSource("school");
                    setRange(null);
                    setSchool(null);
                  }
                }}
              >
                <strong>荣县一中</strong>
                <small>姓名 + 验证码，接入专属分析</small>
              </button>
            </div>
            {source === "external" ? (
              <>
                <div className="j-tabs" role="group" aria-label="分数录入方式">
                  <button
                    aria-pressed={scoreMode === "target"}
                    onClick={() => {
                      invalidate();
                      setScoreMode("target");
                      setRange(null);
                      setTarget(null);
                    }}
                  >
                    我有目标分数
                  </button>
                  <button
                    aria-pressed={scoreMode === "exams"}
                    onClick={() => {
                      invalidate();
                      setScoreMode("exams");
                      setRange(null);
                    }}
                  >
                    用近几次考试
                  </button>
                </div>
                {scoreMode === "target" ? (
                  <label className="j-target">
                    我的高考目标分数
                    <div>
                      <input
                        aria-label="高考目标分数"
                        type="number"
                        min="0"
                        max="750"
                        step="1"
                        value={target ?? ""}
                        placeholder="例如 560"
                        onChange={(e) => useTarget(numeric(e.target.value))}
                      />
                      <span>/ 750</span>
                    </div>
                  </label>
                ) : (
                  <>
                    <p className="j-hint">
                      按时间从早到晚填写。总分之外，请填写该次考试的一条参考线；不同考试不直接平均成高考分数。
                    </p>
                    {scoreFields}
                    <div className="j-actions">
                      <button
                        className="j-secondary"
                        disabled={exams.length >= 5}
                        onClick={() => {
                          invalidate();
                          setRange(null);
                          setExams((items) => [
                            ...items,
                            {
                              label: `第 ${items.length + 1} 次考试`,
                              total: null,
                              rank: null,
                              topTotal: null,
                              undergraduateTotal: null,
                            },
                          ]);
                        }}
                      >
                        添加一次考试
                      </button>
                      <button
                        className="j-secondary"
                        onClick={() => deriveRange(exams)}
                      >
                        计算探索区间
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {!school ? (
                  <div className="j-school">
                    <Icon name="i-chartmap" />
                    <h2>接入你的专属成绩分析</h2>
                    <p>
                      姓名和验证码只发送给成绩服务，不保存到浏览器，也不发送给
                      AI。
                    </p>
                    <div className="j-fields">
                      <label>
                        学生姓名
                        <input
                          autoComplete="off"
                          maxLength={40}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </label>
                      <label>
                        六位验证码
                        <input
                          type="password"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={6}
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                        />
                      </label>
                    </div>
                    <button
                      className="j-primary"
                      disabled={schoolBusy}
                      onClick={() => void identify()}
                    >
                      {schoolBusy ? "正在识别…" : "识别并读取成绩"}
                    </button>
                  </div>
                ) : (
                  <div className="j-school-ready">
                    <h2>成绩已接入 · {school.person.classLabel}</h2>
                    <button
                      className="j-text-button"
                      onClick={() => {
                        invalidate();
                        setSchool(null);
                        setRange(null);
                      }}
                    >
                      重新识别
                    </button>
                    <p>
                      已读取最近 {exams.length}{" "}
                      场考试，按本人的选科与每场切线计算。
                    </p>
                    <details>
                      <summary>查看本次使用的成绩</summary>
                      {scoreFields}
                    </details>
                    {!range && (
                      <button
                        className="j-secondary"
                        onClick={() => {
                          setSource("external");
                          setScoreMode("target");
                          setTarget(null);
                          setSchool(null);
                        }}
                      >
                        数据不足，改用目标分数
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
            {range && (
              <fieldset className="j-range">
                <legend>确认这次要看的分数区间</legend>
                <div className="j-range-fields">
                  <label>
                    下限
                    <input
                      type="number"
                      min="0"
                      max="750"
                      value={Number.isFinite(range.low) ? range.low : ""}
                      onChange={(e) => {
                        invalidate();
                        setRange({
                          ...range,
                          low:
                            e.target.value === ""
                              ? NaN
                              : Number(e.target.value),
                        });
                      }}
                    />
                  </label>
                  <span>—</span>
                  <label>
                    上限
                    <input
                      type="number"
                      min="0"
                      max="750"
                      value={Number.isFinite(range.high) ? range.high : ""}
                      onChange={(e) => {
                        invalidate();
                        setRange({
                          ...range,
                          high:
                            e.target.value === ""
                              ? NaN
                              : Number(e.target.value),
                        });
                      }}
                    />
                  </label>
                  <span>分</span>
                </div>
                <p>{range.basis}</p>
              </fieldset>
            )}
            <fieldset className="j-batches">
              <legend>搜索批次</legend>
              {SELECTABLE_BATCHES.map((batch) => (
                <label key={batch}>
                  <input
                    type="checkbox"
                    checked={batches.includes(batch)}
                    onChange={() => {
                      invalidate();
                      setBatches((values) =>
                        values.includes(batch)
                          ? values.filter((x) => x !== batch)
                          : [...values, batch],
                      );
                    }}
                  />
                  {batch}
                </label>
              ))}
            </fieldset>
            {!pool ? (
              <div className="j-next">
                <p>先按历史参考区间找院校，再结合专业方向筛选。</p>
                <button
                  className="j-primary"
                  disabled={
                    busy ||
                    !release ||
                    !range ||
                    !validRange(range.low, range.high) ||
                    batches.length === 0 ||
                    (source === "school" && !school)
                  }
                  onClick={match}
                >
                  {busy
                    ? "正在匹配院校…"
                    : !release && !loadError
                      ? "正在载入招生数据…"
                      : "确认范围 · 匹配院校"}
                </button>
              </div>
            ) : (
              <>
                {poolSummary}
                <div className="j-next">
                  <p>下一步仅提供 AI 聊天，帮助你探索专业方向。</p>
                  <button className="j-primary" onClick={() => go(2)}>
                    进入 AI 谈方向 →
                  </button>
                </div>
              </>
            )}
          </section>
        )}
        {step === 2 && pool && (
          <div className="j-talk-layout">
            <section className="j-panel j-chat-panel">
              <div className="j-modes" role="group" aria-label="AI 聊天模式">
                <button
                  disabled={pending}
                  aria-pressed={mode === "guided"}
                  onClick={() => changeMode("guided")}
                >
                  <strong>引航 · AI 引导</strong>
                  <small>AI 逐步提问，给你几个回应起点</small>
                </button>
                <button
                  disabled={pending}
                  aria-pressed={mode === "open"}
                  onClick={() => changeMode("open")}
                >
                  <strong>泛舟 · 自由聊</strong>
                  <small>不设回答选项，用自己的话表达</small>
                </button>
              </div>
              {demoService && (
                <div className="j-alert" role="status">
                  当前连接的是本地模拟上游，回复用于技术演示。真实专业探索需要配置模型服务。
                </div>
              )}
              {!token ? (
                <div className="j-connect">
                  <h2>与溟聊一会儿</h2>
                  <p>
                    选好聊法后，使用老师提供的对话访问码连接。它与成绩验证码不同。
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void connect();
                    }}
                  >
                    <label>
                      对话访问码
                      <input
                        type="password"
                        autoComplete="off"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                      />
                    </label>
                    <button
                      className="j-primary"
                      disabled={connecting || !accessCode.trim()}
                    >
                      {connecting ? "连接中…" : "连接 AI 对话"}
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="j-conversation" aria-label="与 AI 的对话">
                    {history.length === 0 && (
                      <div className="j-welcome">
                        <Icon name="i-wing" />
                        <h2>从一件小事说起</h2>
                        <p>
                          最近有什么事情，你愿意多花一点时间去弄明白？
                          <br />
                          写在下面，让 AI 了解你的经历。
                        </p>
                        <small>
                          这是开场提示，发送后才会请求
                          AI。每条发出的原话用于本次建议依据。
                        </small>
                      </div>
                    )}
                    {history.map((m, i) => (
                      <div className={`j-message j-message-${m.role}`} key={i}>
                        <span>{m.role === "user" ? "我" : "溟"}</span>
                        <p>{m.text}</p>
                      </div>
                    ))}
                    {pending && (
                      <div className="j-wait" role="status">
                        <span className="j-dots">
                          <i />
                          <i />
                          <i />
                        </span>
                        <span>
                          {seconds < 15
                            ? "溟在读你的话…"
                            : seconds < 45
                              ? "正在结合你的经历和专业库思考…"
                              : "还在等待模型回复，你可以停止后重试。"}{" "}
                          已等 {seconds} 秒
                        </span>
                        <button onClick={() => request.current?.abort()}>
                          停止等待
                        </button>
                      </div>
                    )}
                    <div ref={chatEnd} />
                  </div>
                  <form
                    className="j-composer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void send();
                    }}
                  >
                    {mode === "guided" && options.length > 0 && (
                      <div
                        className="j-options"
                        aria-label="本轮 AI 提供的回应"
                      >
                        {options.map((option) => (
                          <button
                            type="button"
                            key={option}
                            disabled={pending}
                            onClick={() => setDraft(option)}
                          >
                            {option}
                          </button>
                        ))}
                        <small>点选只填入输入框，修改或确认后再发送。</small>
                      </div>
                    )}
                    <label htmlFor="j-draft">
                      想说的话
                      <textarea
                        id="j-draft"
                        rows={3}
                        maxLength={500}
                        value={draft}
                        disabled={pending}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="说说你做过的事、喜欢的课，或不想走的方向…"
                      />
                    </label>
                    <div className="j-compose-bottom">
                      <label>
                        思考档位
                        <select
                          disabled={pending}
                          value={tier}
                          onChange={(e) =>
                            setTier(e.target.value as ThinkingTier)
                          }
                        >
                          <option value="deep">深入思考</option>
                          <option value="standard">标准</option>
                          <option value="speed">快速回应</option>
                        </select>
                      </label>
                      <span>{draft.length}/500</span>
                      <button
                        className="j-primary"
                        disabled={pending || !draft.trim()}
                      >
                        发送 →
                      </button>
                    </div>
                  </form>
                </>
              )}
            </section>
            <aside className="j-panel j-chat-aside">
              <span className="j-eyebrow">这次对话的目的地</span>
              <h2>方向要有来处。</h2>
              <p>
                AI
                建议探索专业类，不替你下适合与否的定论。具体专业和院校始终从库里取。
              </p>
              <div className="j-mini-pool">
                <b>
                  {pool.range.low}–{pool.range.high} 分
                </b>
                <span>{pool.schoolCount} 所区间内院校已准备好</span>
              </div>
              {aiNames.length ? (
                <>
                  <h3>当前建议</h3>
                  {suggestions.map((s) => (
                    <article key={s.directionId}>
                      <strong>
                        {
                          pool.directions.find((d) => d.id === s.directionId)
                            ?.name
                        }
                      </strong>
                      <p>{s.rationale}</p>
                      <details>
                        <summary>来自你说过的话</summary>
                        {s.evidenceIds.map((id) => (
                          <blockquote key={id}>
                            {evidence.find((e) => e.evidenceId === id)?.quote}
                          </blockquote>
                        ))}
                      </details>
                    </article>
                  ))}
                  <button
                    className="j-primary"
                    disabled={pending}
                    onClick={() => go(3)}
                  >
                    保留建议 · 我再选一次 →
                  </button>
                </>
              ) : (
                <div className="j-empty">
                  还没有足够依据形成方向建议。先聊具体经历，建议会出现在这里。
                </div>
              )}
            </aside>
          </div>
        )}
        {step === 3 && pool && (
          <section className="j-panel">
            <div className="j-choice-intro">
              <div>
                <span className="j-eyebrow">AI 建议探索</span>
                <div className="j-tags">
                  {aiNames.map((d) => (
                    <span key={d.id}>{d.name}</span>
                  ))}
                </div>
              </div>
              <p>
                下面是当前选科与批次下的真实专业。你可以选相同的，也可以保留不同想法；不在分数区间内的专业会显示暂无院校命中。
              </p>
            </div>
            <div className="j-search">
              <label>
                搜索专业
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setVisible(36);
                  }}
                  placeholder="按专业名称或专业类查找"
                />
              </label>
              <label>
                专业类
                <select
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setVisible(36);
                  }}
                >
                  <option value="">全部专业类</option>
                  {pool.directions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="j-hint">
              找到 {filteredMajors.length} 个专业 · 已选 {selected.length} 个
            </p>
            <div className="j-major-grid">
              {filteredMajors.slice(0, visible).map((m) => (
                <button
                  key={m.id}
                  className="j-major-option"
                  aria-pressed={selected.includes(m.id)}
                  onClick={() => toggleMajor(m.id)}
                >
                  <small>{m.category}</small>
                  <strong>{m.name}</strong>
                  <span>
                    {selected.includes(m.id) ? "✓ 已选择" : "+ 加入我的选择"}
                  </span>
                </button>
              ))}
            </div>
            {!filteredMajors.length && (
              <div className="j-empty">
                专业库没有找到这个名称，换个关键词试试。
              </div>
            )}
            {filteredMajors.length > visible && (
              <button
                className="j-secondary"
                onClick={() => setVisible((n) => n + 36)}
              >
                再显示 36 个
              </button>
            )}
            {selected.length > 0 && (
              <div className="j-selected">
                <h3>我的选择</h3>
                {pool.majors
                  .filter((m) => selected.includes(m.id))
                  .map((m) => (
                    <button
                      key={m.id}
                      onClick={() => toggleMajor(m.id)}
                      aria-label={`移除 ${m.name}`}
                    >
                      {m.name} ×
                    </button>
                  ))}
              </div>
            )}
            <div className="j-next">
              <p>
                相同专业合并一次；AI 方向中的其他专业和你的不同选择分别保留。
              </p>
              <button
                className="j-primary"
                disabled={selected.length === 0}
                onClick={() => go(4)}
              >
                生成我的航线 →
              </button>
            </div>
          </section>
        )}
        {step === 4 && pool && (
          <>
            <div className="j-result-summary">
              <div>
                <strong>
                  {pool.range.low}–{pool.range.high}
                  <small>分</small>
                </strong>
                <p>
                  {track === "PHYSICS" ? "物理" : "历史"} +{" "}
                  {subjects
                    .map((id) => SUBJECTS.find((s) => s.id === id)?.name)
                    .join(" + ")}{" "}
                  · {pool.referenceYear} 年历史参考
                </p>
              </div>
              <div className="j-actions">
                <button className="j-secondary" onClick={download}>
                  下载结果
                </button>
                <button
                  className="j-secondary"
                  onClick={() => setPrinting(true)}
                >
                  打印航线
                </button>
              </div>
            </div>
            <p className="j-hint">
              区间筛选依据历史位次，不保证下一年录取。AI
              方向展开为库内专业，再与自主选择按专业名称合并；不同招生项目仍保留各自记录。
            </p>
            {branch.map(renderBranch)}
            <div className="j-actions j-end-actions">
              <button className="j-secondary" onClick={() => go(1)}>
                调整分数范围
              </button>
              <button className="j-secondary" onClick={() => go(2)}>
                继续和 AI 聊聊
              </button>
              <button className="j-primary" onClick={() => go(3)}>
                修改我的专业选择
              </button>
            </div>
          </>
        )}
      </main>
      <footer className="j-footer">
        <span>南溟 · 北冥有鱼，其名为鲲。</span>
        <span>每一个方向，都留给你自己决定。</span>
      </footer>
      {confirmReset && (
        <div
          className="j-modal-backdrop"
          onKeyDown={(e) => {
            if (e.key === "Escape") setConfirmReset(false);
            if (e.key === "Tab") {
              const buttons =
                e.currentTarget.querySelectorAll<HTMLButtonElement>("button");
              const first = buttons[0];
              const last = buttons[buttons.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
              }
            }
          }}
        >
          <section
            className="j-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <h2 id="reset-title">重新开始这次探索？</h2>
            <p>清除当前成绩、聊天与选择。已下载到你设备的结果不会被删除。</p>
            <div className="j-actions">
              <button
                autoFocus
                className="j-secondary"
                onClick={() => setConfirmReset(false)}
              >
                继续当前探索
              </button>
              <button className="j-primary" onClick={reset}>
                清除并重新开始
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
