// TASK-08 (web side): AI turn client with run/revision guarding.
//
// A47: a response that belongs to an older run must never be applied to the current route map.
// The guard is a plain function so it is testable without a DOM, and the fetch call is injected
// so tests never touch the network.

export interface AiTurnRequest {
  readonly runId: string;
  readonly requestId: string;
  readonly inputRevision: number;
  readonly userText: string;
  readonly context: readonly { readonly role: "user" | "assistant"; readonly text: string }[];
}

export interface AiTurnOutcome {
  readonly requestId: string;
  readonly status: "applied" | "rejected" | "degraded" | "error";
  readonly reply: string | null;
  readonly reason: string | null;
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
      reason: "STALE_RUN_RESPONSE" };
  }
  if (event.event === "error") {
    const error = event.data.error as { code?: string; message?: string } | undefined;
    return { requestId: pending.requestId, status: error?.code === "OUTPUT_REJECTED" ? "degraded" : "error",
      reply: null, reason: error?.message ?? error?.code ?? "AI_ERROR" };
  }
  if (event.event === "complete") {
    const output = event.data.output as { reply?: unknown } | undefined;
    const reply = typeof output?.reply === "string" ? output.reply : null;
    return { requestId: pending.requestId, status: reply ? "applied" : "error", reply,
      reason: reply ? null : "EMPTY_COMPLETION" };
  }
  return null;
}

/**
 * Wire format for POST /v1/career/turn. Kept separate from the in-app camelCase request so the
 * field names are stated once, in the place that talks to the server, instead of being implied
 * by property names on both sides.
 */
export interface AiTurnWireBody {
  readonly run_id: string;
  readonly request_id: string;
  readonly input_revision: number;
  readonly user_text: string;
  readonly context: readonly { readonly role: "user" | "assistant"; readonly text: string }[];
}

export function toWireBody(request: AiTurnRequest): AiTurnWireBody {
  return {
    run_id: request.runId,
    request_id: request.requestId,
    input_revision: request.inputRevision,
    user_text: request.userText,
    context: request.context.map(({ role, text }) => ({ role, text }))
  };
}

export interface AiClientDeps {
  readonly baseUrl: string;
  readonly token: string | null;
  readonly fetchImpl?: typeof fetch;
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
    return { httpStatus: 401, events: [], outcome: { requestId: pending.requestId, status: "error", reply: null, reason: "NOT_AUTHENTICATED" } };
  }
  const response = await doFetch(`${deps.baseUrl}/v1/career/turn`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${deps.token}` },
    body: JSON.stringify(toWireBody(request))
  });
  const text = await response.text();
  const events = parseFrames(text);
  let outcome: AiTurnOutcome = { requestId: pending.requestId, status: "error", reply: null, reason: `HTTP_${response.status}` };
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
