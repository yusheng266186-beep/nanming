// TASK-08 (web side): AI turn client with run/revision guarding.
//
// A47: a response that belongs to an older run must never be applied to the current route map.
// The guard is a plain function so it is testable without a DOM, and the fetch call is injected
// so tests never touch the network.
import type { EvidenceRegistry } from "@nanhang/exploration";

/**
 * 思考档位。默认 deep（质量优先），学生可以自己切到更快的档位。
 * 刻意不从 @nanhang/ai-gateway 导入：那个包只在服务端运行，不进浏览器产物。
 */
export type ThinkingTier = "speed" | "standard" | "deep";

export const DEFAULT_THINKING_TIER: ThinkingTier = "deep";

/**
 * 聊法。`guided` 每轮给几个可以直接点的答案（选择作答），`open` 只问问题、不设选项（自由探索）。
 * 默认与北辰一致，先给选项，学生随时可以切到自由探索。
 */
export type ChatMode = "guided" | "open";

export const DEFAULT_CHAT_MODE: ChatMode = "guided";

/**
 * 学生自己保存的原话。随请求发给服务端，服务端据此告诉模型「只能引用这些 ID」，
 * 并校验模型引用的是不是这些 ID——所以模型引用不到学生没说过的话。
 */
export interface AiEvidence {
  readonly evidenceId: string;
  readonly quote: string;
  readonly kind: string;
}

/** 只取服务端会校验的三样，不把页面内部字段（如 messageId）带上行。 */
export function evidenceForRequest(registry: EvidenceRegistry): readonly AiEvidence[] {
  return registry.messages.map(({ evidenceId, quote, kind }) => ({ evidenceId, quote, kind }));
}

export interface AiTurnRequest {
  readonly directionCatalog?: readonly { readonly id: string; readonly name: string }[];
  readonly runId: string;
  readonly requestId: string;
  readonly inputRevision: number;
  readonly userText: string;
  readonly context: readonly { readonly role: "user" | "assistant"; readonly text: string }[];
  /** 学生选的思考档位；不填则服务端用默认档。 */
  readonly tier?: ThinkingTier;
  /** 学生选的聊法；不填则服务端按自由探索处理。 */
  readonly mode?: ChatMode;
  /** 学生已保存的原话；不填则服务端回落到演示注册表（本地演示用）。 */
  readonly evidence?: readonly AiEvidence[];
}

export interface AiTurnOutcome {
  readonly requestId: string;
  readonly status: "applied" | "rejected" | "degraded" | "error";
  readonly reply: string | null;
  readonly reason: string | null;
  /** 选择作答模式下可直接点的答案；其余情况为空数组。 */
  readonly options: readonly string[];
}

/** 只保留服务端校验过的字符串数组，避免把任意结构渲染成按钮。 */
function readOptions(output: unknown): readonly string[] {
  const raw = (output as { options?: unknown } | undefined)?.options;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export interface AiRunStamp {
  readonly runId: string;
  readonly inputRevision: number;
}

/**
 * True only when the response was produced for the run and revision currently on screen.
 * This is the single place the check lives, so every caller (SSE, polling, retry) uses it.
 */
export function responseMatchesActiveRun(response: { runId: string; runRevision: number }, active: AiRunStamp): boolean {
  return response.runId === active.runId && response.runRevision === active.inputRevision;
}

export interface PendingTurn {
  readonly stamp: AiRunStamp;
  readonly requestId: string;
}

export function beginTurn(stamp: AiRunStamp, requestId: string): PendingTurn {
  return { stamp, requestId };
}

export interface SseLikeEvent {
  readonly event: string;
  readonly data: Record<string, unknown>;
}

/** Rejects the payload of any event that belongs to a superseded run. */
export function acceptEvent(pending: PendingTurn, active: AiRunStamp, event: SseLikeEvent): AiTurnOutcome | null {
  if (!responseMatchesActiveRun({ runId: pending.stamp.runId, runRevision: pending.stamp.inputRevision }, active)) {
    return { requestId: pending.requestId, status: "rejected", reply: null,
      reason: "STALE_RUN_RESPONSE", options: [] };
  }
  if (event.event === "error") {
    const error = event.data.error as { code?: string; message?: string } | undefined;
    return { requestId: pending.requestId, status: error?.code === "OUTPUT_REJECTED" ? "degraded" : "error",
      reply: null, reason: error?.message ?? error?.code ?? "AI_ERROR", options: [] };
  }
  if (event.event === "complete") {
    const output = event.data.output as { reply?: unknown } | undefined;
    const reply = typeof output?.reply === "string" ? output.reply : null;
    return { requestId: pending.requestId, status: reply ? "applied" : "error", reply,
      reason: reply ? null : "EMPTY_COMPLETION", options: reply ? readOptions(output) : [] };
  }
  return null;
}

/**
 * Wire format for POST /v1/career/turn. Kept separate from the in-app camelCase request so the
 * field names are stated once, in the place that talks to the server, instead of being implied
 * by property names on both sides.
 */
export interface AiTurnWireBody {
  readonly direction_catalog?: readonly { readonly id: string; readonly name: string }[];
  readonly run_id: string;
  readonly request_id: string;
  readonly input_revision: number;
  readonly user_text: string;
  readonly context: readonly { readonly role: "user" | "assistant"; readonly text: string }[];
  readonly thinking_tier?: ThinkingTier;
  readonly mode?: ChatMode;
  readonly evidence?: readonly AiEvidence[];
}

export function toWireBody(request: AiTurnRequest): AiTurnWireBody {
  return {
    ...(request.directionCatalog ? { direction_catalog: request.directionCatalog } : {}),
    run_id: request.runId,
    request_id: request.requestId,
    input_revision: request.inputRevision,
    user_text: request.userText,
    context: request.context.map(({ role, text }) => ({ role, text })),
    ...(request.tier ? { thinking_tier: request.tier } : {}),
    ...(request.mode ? { mode: request.mode } : {}),
    // 学生一条原话都还没存时就不带这个字段，服务端会回落到演示注册表。
    ...(request.evidence && request.evidence.length > 0 ? { evidence: request.evidence } : {})
  };
}

export interface AiClientDeps {
  readonly baseUrl: string;
  readonly token: string | null;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface AiTurnResult {
  readonly httpStatus: number;
  readonly outcome: AiTurnOutcome;
  readonly events: readonly SseLikeEvent[];
}

/** Minimal SSE reader: enough for start/delta/complete/error, no dependency on EventSource. */
export async function runAiTurn(deps: AiClientDeps, pending: PendingTurn, active: AiRunStamp, request: AiTurnRequest): Promise<AiTurnResult> {
  const doFetch = deps.fetchImpl ?? fetch;
  if (!deps.token) {
    return { httpStatus: 401, events: [], outcome: { requestId: pending.requestId, status: "error", reply: null,
      reason: "NOT_AUTHENTICATED", options: [] } };
  }
  const response = await doFetch(`${deps.baseUrl}/v1/career/turn`, {
    method: "POST",
    ...(deps.signal ? { signal: deps.signal } : {}),
    headers: { "content-type": "application/json", authorization: `Bearer ${deps.token}` },
    body: JSON.stringify(toWireBody(request))
  });
  const text = await response.text();
  const events = parseFrames(text);
  let outcome: AiTurnOutcome = { requestId: pending.requestId, status: "error", reply: null,
    reason: `HTTP_${response.status}`, options: [] };
  for (const event of events) {
    const decided = acceptEvent(pending, active, event);
    if (decided) outcome = decided;
  }
  if (response.status !== 200 && outcome.status !== "rejected") {
    outcome = { ...outcome, status: "error", reason: outcome.reason ?? `HTTP_${response.status}` };
  }
  return { httpStatus: response.status, outcome, events };
}

export function parseFrames(body: string): SseLikeEvent[] {
  const events: SseLikeEvent[] = [];
  for (const block of body.split("\n\n")) {
    const lines = block.split("\n").filter(Boolean);
    if (!lines.length) continue;
    let name = "message";
    const dataLines: string[] = [];
    let commentOnly = true;
    for (const line of lines) {
      if (line.startsWith(":")) continue;
      commentOnly = false;
      if (line.startsWith("event:")) name = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (commentOnly) continue;
    try { events.push({ event: name, data: JSON.parse(dataLines.join("\n")) as Record<string, unknown> }); }
    catch { events.push({ event: name, data: {} }); }
  }
  return events;
}
