// TASK-08 (web side): AI panel state.
//
// The AI feature is opt-in and off by default. When the API is unreachable or the user has not
// enabled it, nothing in the no-AI flow changes. Every displayed AI string is passed through
// `safeText`, and the run stamp is carried so a superseded response can never be applied (A47).
import { beginTurn, runAiTurn, type AiRunStamp, type AiTurnOutcome } from "./ai-client.js";

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
}

export const initialAiPanel: AiPanelState = {
  enabled: false, connected: false, apiBase: DEFAULT_API_BASE, token: null,
  pending: false, reply: null, status: null, suggestions: [], actions: [], replyRevision: null
};

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
  return { ...state, enabled: true, status: "AI 已启用；仍需连接本地服务并兑换访问码。" };
}

export function disableAi(state: AiPanelState): AiPanelState {
  return { ...state, enabled: false, connected: false, token: null, pending: false, reply: null,
    status: "AI 已关闭。浏览、探索、匹配与航线图不受影响。", suggestions: [], actions: [], replyRevision: null };
}

export function withSession(state: AiPanelState, token: string): AiPanelState {
  return { ...state, connected: true, token, status: "已获得本地试用会话。" };
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
 */
export async function askAi(
  state: AiPanelState,
  sendStamp: AiRunStamp,
  activeStamp: AiRunStamp,
  userText: string,
  requestId: string,
  deps: AiTurnDeps = {}
): Promise<AiPanelState> {
  if (!state.enabled) return state;
  if (!state.token) return { ...state, status: "请先兑换本地访问码。" };
  if (!userText.trim()) return { ...state, status: "请先写下你想说的话。" };
  const pending = beginTurn(sendStamp, requestId);
  const result = await runAiTurn(
    { baseUrl: state.apiBase, token: state.token, ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}) },
    pending, activeStamp,
    { runId: sendStamp.runId, requestId, inputRevision: sendStamp.inputRevision, userText, context: [] }
  );
  return applyOutcome(state, result.outcome, result.httpStatus, sendStamp.inputRevision);
}

export function applyOutcome(state: AiPanelState, outcome: AiTurnOutcome, httpStatus = 200, inputRevision: number | null = null): AiPanelState {
  if (outcome.status === "rejected") {
    // A47: the response belonged to an older run; keep the current screen untouched.
    return { ...state, pending: false, status: "已忽略过期的 AI 回复（它属于更早的一次输入）。" };
  }
  if (outcome.status === "error") {
    return { ...state, pending: false, reply: null, suggestions: [], actions: [], replyRevision: null,
      status: httpStatus === 503
        ? "AI 当前不可用，无 AI 的浏览、探索与匹配仍可正常使用。"
        : `AI 未完成：${outcome.reason ?? "未知原因"}` };
  }
  if (outcome.status === "degraded") {
    return { ...state, pending: false, reply: outcome.reply === null ? null : safeText(outcome.reply),
      suggestions: [], actions: [], replyRevision: inputRevision,
      status: `AI 回复未通过安全校验，已降级为本地提示（${outcome.reason ?? "已拒绝"}）。` };
  }
  return { ...state, pending: false, reply: outcome.reply === null ? null : safeText(outcome.reply),
    replyRevision: inputRevision, status: "AI 建议仅作待确认方向，需你本人确认。" };
}
