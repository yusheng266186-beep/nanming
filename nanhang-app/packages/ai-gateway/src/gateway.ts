import type { CatalogChoice } from "./catalog-guard.js";
// TASK-08: the AI gateway core.
//
// Responsibilities, in the order the specification requires them:
//   1. validate input (before any state or quota is touched);
//   2. authenticate the session and resolve the subject server-side;
//   3. atomically claim (session_id, run_id, task_type, request_id) — A42/A43;
//   4. run the upstream with timeouts, limited pre-upstream retries and no repeat after first text;
//   5. validate the model output (shape + safety) — A46/A48;
//   6. settle the request and return a result that never bypasses the deterministic rules.
//
// Fail-closed rules: when the shared state store is unavailable the AI path returns 503 and
// there is no in-memory fallback (A44). Public browsing/matching is unaffected because nothing
// in this module is on that path.
import {
  buildExplorationSummary, createEvidenceRegistry, type DirectionProfile, type EvidenceRegistry,
  type RealityConstraint
} from "@nanhang/exploration";
import type {
  AiGatewayConfig, GatewayError, GatewayErrorCode, ReservationKey, ReservationRecord,
  SessionRecord, TaskType, ChatMode, ThinkingTier, UpstreamEvidence
} from "./types.js";
import { reservationKeyId } from "./types.js";
import { MemoryStateStore, type ClaimOutcome, type StateStore } from "./state-store.js";
import { hashPayload, tokenHash } from "./identity.js";
import { profilePayloadHash, turnPayloadHash, validateProfileRequest, validateTurnRequest, type ProfileRequest, type TurnRequest } from "./input-guard.js";
import {
  degradedTurnOutput, registryLookup, scanStreamedText, validateCareerTurnOutput,
  type CareerTurnOutput, type EvidenceLookup,
  type OutputRejection
} from "./output-guard.js";
import { completeEvent, deltaEvent, errorEvent, parseSseStream, sseFrame, sseHeartbeat, sseSequence, startEvent } from "./sse.js";

export interface UpstreamRequest {
  readonly directionCatalog?: readonly CatalogChoice[];
  readonly taskType: TaskType;
  readonly systemPromptId: string;
  readonly modelId: string;
  readonly userText: string;
  readonly context: readonly { readonly role: "user" | "assistant"; readonly text: string }[];
  readonly inputRevision: number;
  readonly offeringId: string | null;
  readonly releaseId: string | null;
  /**
   * 会话注册表里可引用的原话，由网关填入。上游必须把它当成素材而不是指令：
   * 模型只有拿到这些 ID 才可能给出有据可依的方向建议。
   */
  readonly evidence: readonly UpstreamEvidence[];
  /** 学生本轮选的思考档位；null 表示没选，用服务端默认档。 */
  readonly thinkingTier: ThinkingTier | null;
  /** 本轮聊法；null 按自由探索处理（不给选项）。 */
  readonly mode: ChatMode | null;
}

export interface UpstreamChunk {
  readonly text: string;
}

/**
 * The upstream adapter. The production implementation would call the real provider;
 * development uses a local fake. Nothing above this interface knows which is in use.
 */
export interface Upstream {
  readonly kind: string;
  /** Streams text chunks; rejects with UpstreamFailure on timeout or transport error. */
  stream(request: UpstreamRequest, signal: AbortSignal): AsyncIterable<UpstreamChunk>;
  /** Final structured object for the turn, produced after the stream completes. */
  finalize(request: UpstreamRequest, streamedText: string): Promise<unknown>;
}

export class UpstreamFailure extends Error {
  constructor(readonly code: "UPSTREAM_TIMEOUT" | "UPSTREAM_UNAVAILABLE", message: string, readonly started: boolean) {
    super(message);
    this.name = "UpstreamFailure";
  }
}

/**
 * Thrown when streamed text itself trips the safety scan. Distinct from an upstream transport
 * failure because nothing unsafe was shown and the request is not retryable.
 */
export class OutputExposure extends Error {
  constructor(readonly detail: string) {
    super(`streamed text rejected: ${detail}`);
    this.name = "OutputExposure";
  }
}

export interface GatewayDeps {
  readonly store: StateStore;
  readonly upstream: Upstream;
  readonly config: AiGatewayConfig;
  /**
   * 显式允许在生产档下使用内存存储（试用期的单实例模式）。
   * 默认 false：生产档遇到内存存储就把 AI 关掉，宁可不给也不按实例内存记账。
   * 打开它的含义是「接受函数重启后会话丢失、并发实例间不复用额度」，必须写在部署说明里。
   */
  readonly allowMemoryStore?: boolean;
  readonly now: () => number;
  readonly registryFor: (sessionId: string) => EvidenceRegistry;
  readonly profileFor: (sessionId: string) => DirectionProfile;
  readonly constraintsFor: (sessionId: string) => readonly RealityConstraint[];
}

export interface GatewayResponse {
  readonly httpStatus: number;
  readonly body: unknown;
}

export interface StreamResult {
  readonly httpStatus: number;
  readonly frames: readonly string[];
}

function errorBody(code: GatewayErrorCode, message: string, requestId: string): GatewayError {
  const retryable = code === "UPSTREAM_TIMEOUT" || code === "UPSTREAM_UNAVAILABLE" || code === "STATE_STORE_UNAVAILABLE" || code === "AI_DISABLED";
  return { code, message, request_id: requestId, retryable };
}

export function statusFor(code: GatewayErrorCode): number {
  switch (code) {
    case "BAD_REQUEST": return 400;
    case "CLIENT_CONTROL_REJECTED": return 400;
    case "UNAUTHENTICATED": return 401;
    case "FORBIDDEN_SUBJECT": return 403;
    case "REQUEST_CONFLICT": return 409;
    case "PAYLOAD_TOO_LARGE": return 413;
    case "QUOTA_EXHAUSTED": return 429;
    case "CONCURRENCY_LIMITED": return 429;
    case "AI_DISABLED": return 503;
    case "STATE_STORE_UNAVAILABLE": return 503;
    case "UPSTREAM_UNAVAILABLE": return 503;
    case "UPSTREAM_TIMEOUT": return 503;
    case "OUTPUT_REJECTED": return 200;
    default: return 503;
  }
}

export class AiGateway {
  constructor(private readonly deps: GatewayDeps) {}

  get config(): AiGatewayConfig {
    return this.deps.config;
  }

  health(): { readonly status: "ok"; readonly ai: boolean; readonly store: string } {
    return { status: "ok", ai: this.aiEnabled(), store: this.deps.store.kind };
  }

  async readiness(): Promise<{ readonly public_data: boolean; readonly ai: boolean; readonly state_store: boolean; readonly upstream: string }> {
    const storeUp = await this.deps.store.available();
    return {
      public_data: true,
      ai: this.aiEnabled() && storeUp,
      state_store: storeUp,
      upstream: this.deps.upstream.kind
    };
  }

  private aiEnabled(): boolean {
    if (this.deps.config.profile !== "production") return true;
    if (this.deps.store.kind !== "memory") return true;
    return this.deps.allowMemoryStore === true;
  }

  /** Creates a session from an already-verified credential. The token value itself is never stored. */
  async createSession(input: {
    readonly token: string;
    readonly subjectId: string;
    readonly accessKind: SessionRecord["accessKind"];
    readonly sessionId?: string;
    readonly now?: number;
  }): Promise<SessionRecord> {
    const now = input.now ?? this.deps.now();
    const record: SessionRecord = {
      sessionId: input.sessionId ?? `sess_${hashPayload(input.token).slice(0, 24)}`,
      tokenHash: tokenHash(input.token),
      subjectId: input.subjectId,
      accessKind: input.accessKind,
      expiresAt: now + this.deps.config.sessionTtlMs,
      quotaRemaining: this.deps.config.quotaPerSession,
      activeRequests: 0,
      revokedAt: null
    };
    await this.deps.store.createSession(record);
    return record;
  }

  /** @deprecated helper for tests: create a session without going through a credential exchange. */
  async createTestSession(sessionId: string, subjectId: string, token: string): Promise<SessionRecord> {
    return await this.createSession({ token, subjectId, accessKind: "trial_code", sessionId });
  }

  async authenticate(token: string | null): Promise<{ ok: true; session: SessionRecord } | { ok: false; code: GatewayErrorCode }> {
    if (!(await this.deps.store.available())) return { ok: false, code: "STATE_STORE_UNAVAILABLE" };
    if (!token) return { ok: false, code: "UNAUTHENTICATED" };
    const session = await this.deps.store.findSessionByTokenHash(tokenHash(token));
    if (!session) return { ok: false, code: "UNAUTHENTICATED" };
    if (session.revokedAt !== null || session.expiresAt <= this.deps.now()) return { ok: false, code: "UNAUTHENTICATED" };
    return { ok: true, session };
  }

  async revoke(sessionId: string): Promise<{ deleted: number }> {
    if (!(await this.deps.store.available())) return { deleted: 0 };
    return { deleted: await this.deps.store.revokeSession(sessionId, this.deps.now()) };
  }

  /** GET /v1/requests/{request_id} - returns existing state so a retry never pays twice. */
  async requestStatus(session: SessionRecord, requestId: string): Promise<GatewayResponse> {
    const record = await this.deps.store.getByRequestId(session.sessionId, requestId);
    if (!record) return { httpStatus: 404, body: errorBody("BAD_REQUEST", "request_id not found in this session", requestId) };
    return {
      httpStatus: 200,
      body: {
        request_id: record.key.requestId, run_id: record.key.runId, task_type: record.key.taskType,
        status: record.status, retryable: record.retryable,
        result: record.status === "succeeded" ? record.resultSummary : null,
        error: record.errorCode ? errorBody(record.errorCode, record.errorCode, requestId) : null
      }
    };
  }

  /**
   * POST /v1/career/turn - SSE stream. Validation and the atomic claim both happen before any
   * upstream byte is requested, so a duplicate or over-quota request never reaches the provider.
   */
  async careerTurn(session: SessionRecord, raw: unknown, signal?: AbortSignal): Promise<StreamResult> {
    if (!this.aiEnabled()) {
      return { httpStatus: 503, frames: [sseFrame(errorEvent("", sseSequence(), "AI_DISABLED", "AI is disabled in this deployment", false))] };
    }
    const requestId = typeof (raw as { request_id?: unknown })?.request_id === "string" ? (raw as { request_id: string }).request_id : "";
    const sequence = sseSequence();
    if (!(await this.deps.store.available())) {
      return { httpStatus: 503, frames: [sseFrame(errorEvent(requestId, sequence, "STATE_STORE_UNAVAILABLE", "state store unavailable", true))] };
    }
    const validated = validateTurnRequest(raw, this.deps.config);
    if (!validated.ok) {
      return { httpStatus: statusFor(validated.code), frames: [sseFrame(errorEvent(requestId, sequence, validated.code, validated.detail, false))] };
    }
    const request = validated.value;
    const claim = await this.claim(session, "career_turn", request.request_id, request.run_id, hashPayload(turnPayloadHash(request)), request.input_revision);
    if (claim.kind === "conflict") {
      return { httpStatus: 409, frames: [sseFrame(errorEvent(request.request_id, sequence, "REQUEST_CONFLICT", "request_id reused with a different payload", false))] };
    }
    if (claim.kind === "quota_exhausted") {
      return { httpStatus: 429, frames: [sseFrame(errorEvent(request.request_id, sequence, "QUOTA_EXHAUSTED", "session quota exhausted", false))] };
    }
    if (claim.kind === "concurrency_limited") {
      return { httpStatus: 429, frames: [sseFrame(errorEvent(request.request_id, sequence, "CONCURRENCY_LIMITED", "one concurrent AI request per session", true))] };
    }
    if (claim.kind === "session_missing" || claim.kind === "unavailable") {
      const code: GatewayErrorCode = claim.kind === "unavailable" ? "STATE_STORE_UNAVAILABLE" : "UNAUTHENTICATED";
      return { httpStatus: statusFor(code), frames: [sseFrame(errorEvent(request.request_id, sequence, code, code, code === "STATE_STORE_UNAVAILABLE"))] };
    }
    if (claim.kind === "duplicate") {
      // A42: same key, same payload. Nothing new is sent upstream and nothing is charged again.
      const record = claim.record;
      if (record.status === "succeeded" && record.resultSummary !== null) {
        const parsed = safeParse(record.resultSummary);
        return {
          httpStatus: 200,
          frames: [
            sseFrame(startEvent(request.request_id, sequence, this.deps.config.modelId)),
            sseFrame(deltaEvent(request.request_id, sequence, replayText(parsed))),
            sseFrame(completeEvent(request.request_id, sequence, parsed))
          ]
        };
      }
      if (record.status === "failed") {
        return { httpStatus: 200, frames: [sseFrame(errorEvent(request.request_id, sequence, record.errorCode ?? "UPSTREAM_UNAVAILABLE", "previous attempt failed", record.retryable))] };
      }
      // Still reserved/running/unknown: report without re-running, so a client cannot double-charge by reconnecting.
      return {
        httpStatus: 200,
        frames: [
          sseFrame(startEvent(request.request_id, sequence, this.deps.config.modelId)),
          sseFrame(errorEvent(request.request_id, sequence, "CONCURRENCY_LIMITED", `request already ${record.status}`, true))
        ]
      };
    }

    const record = claim.record;
    const upstreamRequest: UpstreamRequest = {
      taskType: "career_turn", systemPromptId: this.deps.config.systemPromptId, modelId: this.deps.config.modelId,
      userText: request.user_text, context: request.context.map(({ role, text }) => ({ role, text })),
      inputRevision: request.input_revision, offeringId: null, releaseId: null,
      directionCatalog: request.direction_catalog ?? [],
      evidence: request.direction_catalog?.length ? request.evidence : this.evidenceForRequest(session, request.evidence), thinkingTier: request.thinking_tier, mode: request.mode
    };
    const frames: string[] = [sseFrame(startEvent(request.request_id, sequence, this.deps.config.modelId))];
    await this.deps.store.transition(record.keyId, { status: "running" }, this.deps.now());

    let streamed = "";
    try {
      streamed = await this.pump(record, upstreamRequest, frames, request.request_id, sequence, signal);
    } catch (error) {
      if (error instanceof OutputExposure) {
        // The unsafe text was withheld, so the client is told plainly and gets a local fallback.
        const degraded = degradedTurnOutput(error.detail);
        await this.deps.store.transition(record.keyId, {
          status: "succeeded", resultSummary: JSON.stringify(degraded), errorCode: "OUTPUT_REJECTED", retryable: false
        }, this.deps.now());
        return {
          httpStatus: 200,
          frames: [...frames, sseFrame(errorEvent(request.request_id, sequence, "OUTPUT_REJECTED", error.detail, false)),
            sseFrame(completeEvent(request.request_id, sequence, degraded))]
        };
      }
      const failure = error instanceof UpstreamFailure ? error : new UpstreamFailure("UPSTREAM_UNAVAILABLE", "upstream failed", true);
      await this.deps.store.transition(record.keyId, { status: "failed", errorCode: failure.code, retryable: true }, this.deps.now());
      return { httpStatus: 503, frames: [...frames, sseFrame(errorEvent(request.request_id, sequence, failure.code, failure.message, true))] };
    }

    let finalObject: unknown;
    try {
      finalObject = await this.deps.upstream.finalize(upstreamRequest, streamed);
    } catch {
      await this.deps.store.transition(record.keyId, { status: "failed", errorCode: "UPSTREAM_UNAVAILABLE", retryable: true }, this.deps.now());
      return { httpStatus: 503, frames: [...frames, sseFrame(errorEvent(request.request_id, sequence, "UPSTREAM_UNAVAILABLE", "upstream finalize failed", true))] };
    }

    const lookup: EvidenceLookup = request.direction_catalog?.length
      ? { allowedEvidenceIds: () => request.evidence.map(e => e.evidenceId), allowedDirectionIds: () => request.direction_catalog!.map(d => d.id) }
      : this.lookupFor(session, request.evidence);
    const accepted = validateCareerTurnOutput(finalObject, lookup);
    if (!accepted.ok) {
      // A46/A48: the raw model text is never forwarded; the client gets an explicit degradation.
      const degraded = degradedTurnOutput(accepted.detail);
      await this.deps.store.transition(record.keyId, {
        status: "succeeded", resultSummary: JSON.stringify(degraded), errorCode: "OUTPUT_REJECTED", retryable: false
      }, this.deps.now());
      return {
        httpStatus: 200,
        frames: [
          ...frames,
          sseFrame(errorEvent(request.request_id, sequence, "OUTPUT_REJECTED", accepted.detail, false)),
          sseFrame(completeEvent(request.request_id, sequence, degraded))
        ]
      };
    }
    await this.deps.store.transition(record.keyId, {
      status: "succeeded", resultSummary: JSON.stringify(accepted.value), errorCode: null, retryable: false
    }, this.deps.now());
    return {
      httpStatus: 200,
      frames: [...frames, sseFrame(completeEvent(request.request_id, sequence, accepted.value,
        accepted.droppedSuggestions ? { dropped_suggestions: accepted.droppedSuggestions } : {}))]
    };
  }

  /**
   * POST /v1/career/profile - the non-streaming, idempotent variant.
   * Same claim discipline, so a retry of an identical request returns the stored summary (A42)
   * and a different payload under the same request_id is refused with 409 (A43).
   */
  async careerProfile(session: SessionRecord, raw: unknown, signal?: AbortSignal): Promise<GatewayResponse> {
    if (!this.aiEnabled()) return { httpStatus: 503, body: errorBody("AI_DISABLED", "AI is disabled in this deployment", "") };
    const validated = validateProfileRequest(raw, this.deps.config);
    if (!validated.ok) {
      const requestId = typeof (raw as { request_id?: unknown })?.request_id === "string" ? (raw as { request_id: string }).request_id : "";
      return { httpStatus: statusFor(validated.code), body: errorBody(validated.code, validated.detail, requestId) };
    }
    const request: ProfileRequest = validated.value;
    if (!(await this.deps.store.available())) {
      return { httpStatus: 503, body: errorBody("STATE_STORE_UNAVAILABLE", "state store unavailable", request.request_id) };
    }
    const claim = await this.claim(session, "career_profile", request.request_id, request.run_id, hashPayload(profilePayloadHash(request)), request.input_revision);
    if (claim.kind === "conflict") return { httpStatus: 409, body: errorBody("REQUEST_CONFLICT", "request_id reused with a different payload", request.request_id) };
    if (claim.kind === "quota_exhausted") return { httpStatus: 429, body: errorBody("QUOTA_EXHAUSTED", "session quota exhausted", request.request_id) };
    if (claim.kind === "concurrency_limited") return { httpStatus: 429, body: errorBody("CONCURRENCY_LIMITED", "one concurrent AI request per session", request.request_id) };
    if (claim.kind === "session_missing") return { httpStatus: 401, body: errorBody("UNAUTHENTICATED", "session no longer valid", request.request_id) };
    if (claim.kind === "unavailable") return { httpStatus: 503, body: errorBody("STATE_STORE_UNAVAILABLE", "state store unavailable", request.request_id) };
    if (claim.kind === "duplicate") {
      const record = claim.record;
      if (record.status === "succeeded" && record.resultSummary) {
        return { httpStatus: 200, body: { request_id: request.request_id, status: record.status, result: safeParse(record.resultSummary) } };
      }
      if (record.status === "failed") {
        return { httpStatus: record.errorCode === "OUTPUT_REJECTED" ? 200 : 503,
          body: errorBody(record.errorCode ?? "UPSTREAM_UNAVAILABLE", "previous attempt failed", request.request_id) };
      }
      return { httpStatus: 202, body: { request_id: request.request_id, status: record.status, retryable: true } };
    }

    const record = claim.record;
    const upstreamRequest: UpstreamRequest = {
      taskType: "career_profile", systemPromptId: this.deps.config.systemPromptId, modelId: this.deps.config.modelId,
      userText: "", context: request.context.map(({ role, text }) => ({ role, text })),
      inputRevision: request.input_revision, offeringId: request.offering_id, releaseId: request.release_id,
      evidence: this.evidenceForRequest(session, request.evidence), thinkingTier: null, mode: null
    };
    await this.deps.store.transition(record.keyId, { status: "running", upstreamStarted: true }, this.deps.now());
    try {
      const text = await this.pumpText(record, upstreamRequest, signal);
      const finalObject = await this.deps.upstream.finalize(upstreamRequest, text);
      const lookup = this.lookupFor(session, request.evidence);
      const accepted = validateCareerTurnOutput(finalObject, lookup);
      if (!accepted.ok) {
        const degraded = degradedTurnOutput(accepted.detail);
        await this.deps.store.transition(record.keyId, { status: "succeeded", resultSummary: JSON.stringify(degraded), errorCode: "OUTPUT_REJECTED" }, this.deps.now());
        return { httpStatus: 200, body: { request_id: request.request_id, status: "succeeded", degraded: true, result: degraded } };
      }
      await this.deps.store.transition(record.keyId, { status: "succeeded", resultSummary: JSON.stringify(accepted.value) }, this.deps.now());
      return { httpStatus: 200, body: { request_id: request.request_id, status: "succeeded", result: accepted.value } };
    } catch (error) {
      if (error instanceof OutputExposure) {
        const degraded = degradedTurnOutput(error.detail);
        await this.deps.store.transition(record.keyId, { status: "succeeded", resultSummary: JSON.stringify(degraded), errorCode: "OUTPUT_REJECTED" }, this.deps.now());
        return { httpStatus: 200, body: { request_id: request.request_id, status: "succeeded", degraded: true, result: degraded } };
      }
      const failure = error instanceof UpstreamFailure ? error : new UpstreamFailure("UPSTREAM_UNAVAILABLE", "upstream failed", true);
      // A conservative bound: an interrupted run may already have consumed upstream cost,
      // so it is recorded as unknown rather than auto-refunded (specification section 8).
      await this.deps.store.transition(record.keyId, { status: "unknown", errorCode: failure.code, retryable: true }, this.deps.now());
      return { httpStatus: 503, body: errorBody(failure.code, failure.message, request.request_id) };
    }
  }

  /**
   * 可引用的学生原话：客户端给了就用客户端的，没给才回落到会话注册表（本地演示）。
   * 提示词与输出校验必须用同一份，否则会出现「模型引用了校验不认的 ID」这种假失败。
   */
  private evidenceForRequest(session: SessionRecord, provided: readonly UpstreamEvidence[]): readonly UpstreamEvidence[] {
    if (provided.length > 0) return provided.slice(0, this.deps.config.maxEvidenceIds);
    return this.evidenceFor(session);
  }

  /** 与 evidenceForRequest 配套的校验口径：只认这一次请求里出现过的 ID。 */
  private lookupFor(session: SessionRecord, provided: readonly UpstreamEvidence[]): EvidenceLookup {
    if (provided.length > 0) {
      return { allowedEvidenceIds: () => provided.map((item) => item.evidenceId) };
    }
    return registryLookup(this.deps.registryFor(session.sessionId));
  }

  /** 会话注册表 → 上游可引用的原话。上限用配置里的 maxEvidenceIds，避免提示词无限增长。 */
  private evidenceFor(session: SessionRecord): readonly UpstreamEvidence[] {
    return this.deps.registryFor(session.sessionId).messages
      .slice(0, this.deps.config.maxEvidenceIds)
      .map((message) => ({ evidenceId: message.evidenceId, quote: message.quote, kind: message.kind }));
  }

  private async claim(session: SessionRecord, taskType: TaskType, requestId: string, runId: string, payloadHash: string, inputRevision: number): Promise<ClaimOutcome> {
    const key: ReservationKey = { sessionId: session.sessionId, runId, taskType, requestId };
    return await this.deps.store.claim({
      key, payloadHash, inputRevision, now: this.deps.now(),
      limits: { sessionConcurrency: this.deps.config.sessionConcurrency, maxAttempts: this.deps.config.maxAttempts }
    });
  }

  /** Streams upstream text with first-byte and total timeouts; retries only before any text arrives. */
  private async pump(record: ReservationRecord, request: UpstreamRequest, frames: string[], requestId: string, sequence: ReturnType<typeof sseSequence>, outer?: AbortSignal): Promise<string> {
    let attempts = 0;
    let lastFailure: UpstreamFailure | null = null;
    while (attempts < this.deps.config.maxAttempts) {
      attempts += 1;
      await this.deps.store.transition(record.keyId, { attempts, status: "running" }, this.deps.now());
      const controller = new AbortController();
      const onOuterAbort = () => controller.abort();
      outer?.addEventListener("abort", onOuterAbort, { once: true });
      let gotText = false;
      let text = "";
      const firstByteTimer = setTimeout(() => controller.abort(new UpstreamFailure("UPSTREAM_TIMEOUT", "first byte timeout", gotText)), this.deps.config.firstByteTimeoutMs);
      const totalTimer = setTimeout(() => controller.abort(new UpstreamFailure("UPSTREAM_TIMEOUT", "total timeout", gotText)), this.deps.config.totalTimeoutMs);
      let heartbeat = setInterval(() => { frames.push(sseHeartbeat()); }, this.deps.config.heartbeatMs);
      try {
        for await (const chunk of this.deps.upstream.stream(request, controller.signal)) {
          if (!gotText) {
            gotText = true;
            clearTimeout(firstByteTimer);
            await this.deps.store.transition(record.keyId, { upstreamStarted: true }, this.deps.now());
          }
          // Scan before emitting: unsafe text must never reach the client, not even in a delta frame.
          const exposure = scanStreamedText(text + chunk.text);
          if (exposure) {
            throw new OutputExposure(exposure);
          }
          text += chunk.text;
          frames.push(sseFrame(deltaEvent(requestId, sequence, chunk.text)));
        }
        clearTimeout(totalTimer);
        return text;
      } catch (error) {
        clearTimeout(totalTimer);
        // A safety rejection is neither a transport failure nor retryable: bubble it up as-is.
        if (error instanceof OutputExposure) throw error;
        const failure = error instanceof UpstreamFailure
          ? error
          : new UpstreamFailure(controller.signal.aborted ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE", "upstream error", gotText);
        lastFailure = failure;
        if (gotText) throw failure; // text already displayed: never auto-regenerate
        if (attempts >= this.deps.config.maxAttempts || attempts > this.deps.config.maxPreUpstreamRetries + 1) throw failure;
      } finally {
        clearTimeout(firstByteTimer);
        outer?.removeEventListener("abort", onOuterAbort);
        clearInterval(heartbeat);
      }
    }
    throw lastFailure ?? new UpstreamFailure("UPSTREAM_UNAVAILABLE", "upstream failed", false);
  }

  private async pumpText(record: ReservationRecord, request: UpstreamRequest, outer?: AbortSignal): Promise<string> {
    const frames: string[] = [];
    return this.pump(record, request, frames, record.key.requestId, sseSequence(), outer);
  }
}

function safeParse(text: string): unknown {
  try { return JSON.parse(text) as unknown; } catch { return null; }
}

function replayText(value: unknown): string {
  if (value && typeof value === "object" && typeof (value as { reply?: unknown }).reply === "string") {
    return (value as { reply: string }).reply;
  }
  return "";
}

export { MemoryStateStore, parseSseStream, buildExplorationSummary, createEvidenceRegistry };
export type { EvidenceRegistry, DirectionProfile, RealityConstraint, OutputRejection };
