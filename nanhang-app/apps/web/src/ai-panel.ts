// TASK-08 (web side): AI panel state.
//
// The AI feature is opt-in and off by default. When the API is unreachable or the user has not
// enabled it, nothing in the no-AI flow changes. Every displayed AI string is passed through
// `safeText`, and the run stamp is carried so a superseded response can never be applied (A47).
import { beginTurn, runAiTurn, DEFAULT_CHAT_MODE, DEFAULT_THINKING_TIER,
  type AiEvidence, type AiRunStamp, type AiTurnOutcome, type ChatMode, type SseLikeEvent,
  type ThinkingTier } from "./ai-client.js";

export const AI_NOTICE = "AI 建议只使用你已经保存的原话，且必须由你确认后才会进入画像。AI 不能修改资格、位次或数据发布状态。";

/**
 * Where the local API lives. Overridable with VITE_NANHANG_API_BASE at build/dev time;
 * the default matches NANHANG_API_PORT in apps/api so the two line up out of the box.
 */
export const DEFAULT_API_BASE: string = (() => {
  const fromEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_NANHANG_API_BASE;
  return fromEnv && fromEnv.trim() ? fromEnv.trim().replace(/\/$/, "") : "http://127.0.0.1:8790";
})();

export interface AiPanelState {
  readonly enabled: boolean;
  readonly connected: boolean;
  readonly apiBase: string;
  readonly token: string | null;
  readonly pending: boolean;
  readonly reply: string | null;
  readonly status: string | null;
  readonly suggestions: readonly { readonly directionId: string; readonly evidenceIds: readonly string[]; readonly rationale: string }[];
  readonly actions: readonly string[];
  /** Revision the displayed reply was produced for; null when nothing is displayed. */
  readonly replyRevision: number | null;
  /** 学生选的思考档位：想得更透 vs 回得更快，由学生自己决定。 */
  readonly tier: ThinkingTier;
  /** 学生选的聊法：选择作答（给可点的答案）或自由探索（只问问题）。 */
  readonly mode: ChatMode;
  /** 本轮可以直接点的答案；自由探索模式下恒为空。 */
  readonly options: readonly string[];
  /** 谈心页已进入对话阶段（选完聊法、按下「开始谈心」）。 */
  readonly started: boolean;
  /** 对话记录，旧→新。发给模型作为上下文（只带最近几轮），也是聊天页的转录来源。 */
  readonly history: readonly { readonly role: "user" | "assistant"; readonly text: string }[];
}

export const initialAiPanel: AiPanelState = {
  enabled: false, connected: false, apiBase: DEFAULT_API_BASE, token: null,
  pending: false, reply: null, status: null, suggestions: [], actions: [], replyRevision: null,
  tier: DEFAULT_THINKING_TIER, mode: DEFAULT_CHAT_MODE, options: [], started: false, history: []
};

/** 档位只影响下一轮；已经拿到的回复不因为切换档位而作废。 */
export function withTier(state: AiPanelState, tier: ThinkingTier): AiPanelState {
  return { ...state, tier };
}

/**
 * 切换聊法。上一轮的选项属于上一轮的问法，切走时一并清掉——
 * 留着会让学生以为那是新问题下的可选项。
 */
export function withMode(state: AiPanelState, mode: ChatMode): AiPanelState {
  return { ...state, mode, options: [] };
}

/**
 * 学生可见的档位选项。默认档放最前，标签用学生能懂的话，不用内部代号；
 * 每档一句实话说明等待代价——不写「更快更聪明」这种不可能同时成立的承诺。
 */
/**
 * 学生可见的档位选项。默认档放最前，标签用学生能懂的话，不用内部代号；
 * 每档给出一次回答的预估等待时间（eta）与一句实话说明，学生自己权衡深浅。
 */
export const THINKING_CHOICES: readonly { readonly value: ThinkingTier; readonly label: string;
  readonly eta: string; readonly hint: string }[] = [
  { value: "deep", label: "深（默认）", eta: "约 20–40 秒", hint: "模型先想清楚再回答，质量优先，适合聊关键选择。" },
  { value: "standard", label: "标准", eta: "约 10–20 秒", hint: "由服务端决定思考深度，速度与质量居中。" },
  { value: "speed", label: "快", eta: "约 3–8 秒", hint: "不等思考直接回；适合先把话说完、来回多聊几轮。" }
];

/**
 * 学生可见的两种聊法。参考北辰的领航／夜航（一种给现成答案、一种完全自由），
 * 名字与说明都按南溟自己的主题重写：
 *   引航 —— 引航员上船带路，每一步都有现成答案可点，想不出来也不会卡住；
 *   泛舟 —— 取自「泛若不系之舟」（《庄子》，与「南溟」同源），不设路线，随水而行。
 * 默认引航：第一次用的人多半需要扶手，而随时可以自己换。
 */
export const MODE_CHOICES: readonly { readonly value: ChatMode; readonly label: string; readonly hint: string }[] = [
  { value: "guided", label: "引航", hint: "每一步都摆出现成的答案，点一下就算你答了；想不出来时不会卡在这儿。也可以不用它，自己写。" },
  { value: "open", label: "泛舟", hint: "不摆选项，只问问题。想说什么说什么，说多短都行——用自己的话答，它听得更认真。" }
];

/**
 * True when a displayed reply was produced for an earlier input revision. The text stays readable
 * so the student does not lose what was said, but it is visibly marked as no longer current —
 * the same treatment the match result gets, rather than silently mixing old and new context.
 */
export function isReplyStale(state: AiPanelState, currentRevision: number): boolean {
  return state.reply !== null && state.replyRevision !== null && state.replyRevision !== currentRevision;
}

export function enableAi(state: AiPanelState): AiPanelState {
  // Enabling is a deliberate user action and never happens implicitly on page load.
  return { ...state, enabled: true, status: "AI 已启用；请输入老师刚刚发放的 6 位动态码。" };
}

export function disableAi(state: AiPanelState): AiPanelState {
  return { ...state, enabled: false, connected: false, token: null, pending: false, reply: null,
    status: "AI 已关闭。浏览、探索、匹配与航线图不受影响。", suggestions: [], actions: [], replyRevision: null,
    options: [], started: false, history: [] };
}

/** 按下「开始谈心」：进入对话阶段并确保 AI 已启用——谈心页以 AI 谈心为主路径。 */
export function withStarted(state: AiPanelState): AiPanelState {
  return { ...state, started: true, enabled: true };
}

/** 学生发出一句话：立即进入转录（等待回复时也能看到自己说了什么）。 */
export function withUserTurn(state: AiPanelState, text: string): AiPanelState {
  return { ...state, history: [...state.history, { role: "user" as const, text }] };
}

/**
 * 合并一轮结果：保留当前转录（含刚发出的用户消息），追加模型回复。
 * 出错/降级时回复为 null，转录不追加——错误原因走 status 展示。
 */
export function applyTurnResult(current: AiPanelState, result: AiPanelState): AiPanelState {
  return { ...current, ...result,
    history: result.reply
      ? [...current.history, { role: "assistant" as const, text: result.reply }]
      : current.history };
}

export function withSession(state: AiPanelState, token: string): AiPanelState {
  // 连上之后不再挂状态行：负责人 2026-09-20 指出，输入框下面那行「已获得本地试用会话。」
  // 一直压在对话框里。连接状态由对话头部的「已连接」表示；这里同时清掉上一轮的失败提示，
  // 免得重连成功后还留着「动态码无效」这种已经过期的字样。
  return { ...state, connected: true, token, status: null };
}

/** Replaces any HTML-significant character so model text is never interpreted as markup (A46). */
export function safeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[<>]/g, (char) => (char === "<" ? "\u003c" : "\u003e"));
}

export interface AiTurnDeps {
  readonly fetchImpl?: typeof fetch;
}

/**
 * Sends one AI turn.
 *
 * Two stamps are required and they are deliberately separate: `sendStamp` is captured when the
 * request is issued, and `activeStamp` is read again when the response arrives. If the student
 * edited an input while the request was in flight the two differ, and the response is discarded
 * instead of being written into a route map it no longer describes (A47).
 *
 * `history` 是已有的对话记录（含刚发出的这条用户消息之前的部分）；只带最近 8 轮给模型，
 * 让多轮谈心能接得上话，同时限制请求体大小。
 *
 * `evidence` 是学生自己说的话（保存过的原话 + 聊天发言）。它是「建议必须有据可依」的输入：
 * 服务端只让模型引用这些 ID，引用不到的会被输出校验拦下。为空时服务端回落到演示注册表。
 *
 * `directionCatalog` 是本轮允许建议的真实专业目录（来自院校池）。带上它，服务端把提示词
 * 换成这份目录并逐条过滤库外建议；前端再按同样的集合过滤一遍——两道闸，不靠模型自觉。
 */
export async function askAi(
  state: AiPanelState,
  sendStamp: AiRunStamp,
  activeStamp: AiRunStamp,
  userText: string,
  requestId: string,
  deps: AiTurnDeps = {},
  history: readonly { readonly role: "user" | "assistant"; readonly text: string }[] = [],
  evidence: readonly AiEvidence[] = [],
  directionCatalog: readonly { readonly id: string; readonly name: string }[] = []
): Promise<AiPanelState> {
  if (!state.enabled) return state;
  if (!state.token) return { ...state, status: "请先输入 6 位动态码。" };
  if (!userText.trim()) return { ...state, status: "请先写下你想说的话。" };
  const pending = beginTurn(sendStamp, requestId);
  const result = await runAiTurn(
    { baseUrl: state.apiBase, token: state.token, ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}) },
    pending, activeStamp,
    { runId: sendStamp.runId, requestId, inputRevision: sendStamp.inputRevision, userText,
      context: history.slice(-8).map(({ role, text }) => ({ role, text })),
      tier: state.tier, mode: state.mode,
      ...(evidence.length > 0 ? { evidence } : {}),
      ...(directionCatalog.length > 0 ? { directionCatalog } : {}) }
  );
  const next = applyOutcome(state, result.outcome, result.httpStatus, sendStamp.inputRevision);
  return { ...next, suggestions: groundedSuggestions(result.events, directionCatalog, evidence) };
}

export interface AiSuggestion {
  readonly directionId: string;
  readonly evidenceIds: readonly string[];
  readonly rationale: string;
}

/**
 * 从 complete 事件里取结构化建议，并做与输出校验同源的落地过滤：
 * 专业类必须在目录里、引用的原话必须是本轮真的发上去的。两道闸里这是前端这道——
 * 就算服务端漏放了一条库外建议，它也到不了界面。
 */
export function groundedSuggestions(events: readonly SseLikeEvent[],
  catalog: readonly { readonly id: string; readonly name: string }[],
  evidence: readonly AiEvidence[]): readonly AiSuggestion[] {
  if (!catalog.length) return [];
  const completion = ([...events].reverse().find((event) => event.event === "complete")?.data.output) as { suggestions?: unknown } | undefined;
  const raw = completion?.suggestions;
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(catalog.map((item) => item.id));
  const cited = new Set(evidence.map((item) => item.evidenceId));
  return raw.flatMap((item) => {
    const value = item as { directionId?: unknown; rationale?: unknown; evidenceIds?: unknown };
    if (typeof value.directionId !== "string" || !allowed.has(value.directionId)) return [];
    const ids = Array.isArray(value.evidenceIds)
      ? value.evidenceIds.filter((id): id is string => typeof id === "string" && cited.has(id))
      : [];
    if (!ids.length) return [];
    return [{ directionId: value.directionId, evidenceIds: ids, rationale: safeText(value.rationale) }];
  }).slice(0, 4);
}

export function applyOutcome(state: AiPanelState, outcome: AiTurnOutcome, httpStatus = 200, inputRevision: number | null = null): AiPanelState {
  if (outcome.status === "rejected") {
    // A47: the response belonged to an older run; keep the current screen untouched.
    return { ...state, pending: false, status: "已忽略过期的 AI 回复（它属于更早的一次输入）。" };
  }
  if (outcome.status === "error") {
    return { ...state, pending: false, reply: null, suggestions: [], actions: [], options: [], replyRevision: null,
      ...(httpStatus === 401 ? { connected: false, token: null } : {}),
      status: httpStatus === 503
        ? "AI 当前不可用，无 AI 的浏览、探索与匹配仍可正常使用。"
        : httpStatus === 401 ? "会话已过期，请重新输入老师刚刚发放的动态码。"
        : httpStatus === 0 ? "连接中断或等待超时，请稍后重新发送。"
        : `AI 未完成：${outcome.reason ?? "未知原因"}` };
  }
  if (outcome.status === "degraded") {
    return { ...state, pending: false, reply: outcome.reply === null ? null : safeText(outcome.reply),
      suggestions: [], actions: [], options: [], replyRevision: inputRevision,
      status: `AI 回复未通过安全校验，已降级为本地提示（${outcome.reason ?? "已拒绝"}）。` };
  }
  // 正常一轮不再挂状态行（负责人 2026-09-12：删掉那句每次回复都挂一遍的「待确认」声明——
  // 它像一句免责声明，而真正要说的边界在各处都写出了具体来源）。
  // 出错、降级、限流等真实状态仍然照常写进 status。
  return { ...state, pending: false, reply: outcome.reply === null ? null : safeText(outcome.reply),
    options: outcome.options.map(safeText), replyRevision: inputRevision, status: null };
}
