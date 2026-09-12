import { parseDirectionCatalog, type CatalogChoice } from "./catalog-guard.js";
// TASK-08: input limits and client-control rejection.
//
// A45 is enforced here: the client may submit user-turn text and its own history, but it can
// never choose the system prompt, model, upstream URL or tool definitions. Any such field is
// rejected outright rather than ignored, so a client cannot discover the boundary by probing.
import {
  CHAT_MODES, EVIDENCE_KINDS, type AiGatewayConfig, type ChatMode, type ThinkingTier, type UpstreamEvidence
} from "./types.js";

export const ALLOWED_TURN_FIELDS = ["run_id", "request_id", "input_revision", "user_text", "context", "thinking_tier", "mode", "evidence", "direction_catalog"] as const;
export const ALLOWED_PROFILE_FIELDS = ["run_id", "request_id", "input_revision", "offering_id", "release_id", "context", "evidence"] as const;

/** 学生原话的体量上限：够一次完整谈心的记录，又不至于把请求撑爆。 */
const MAX_EVIDENCE_ITEMS = 40;
const MAX_EVIDENCE_QUOTE_CHARS = 4000;
const MAX_EVIDENCE_TOTAL_CHARS = 48000;
/** 学生可以自己选的思考档位。它是偏好，不是控制面字段：取值只有这三种，服务端只做校验。 */
export const SELECTABLE_THINKING_TIERS: readonly ThinkingTier[] = ["speed", "standard", "deep"];

export type RequestedRole = "user" | "assistant" | "system" | "developer" | "tool";

/** Only user and assistant turns survive validation; a client can never inject the others. */
export interface ContextMessage {
  readonly role: "user" | "assistant";
  readonly text: string;
}

export interface TurnRequest {
  readonly run_id: string;
  readonly request_id: string;
  readonly input_revision: number;
  readonly user_text: string;
  readonly context: readonly ContextMessage[];
  /** 学生选的档位；null 表示没选，用服务端默认档。 */
  readonly thinking_tier: ThinkingTier | null;
  /** 学生选的聊法；null 表示没选，按自由探索处理。 */
  readonly mode: ChatMode | null;
  readonly direction_catalog?: readonly CatalogChoice[];
  /**
   * 学生自己保存的原话（客户端提供）。空数组表示客户端没给，
   * 此时回落到会话注册表（本地演示用）。
   */
  readonly evidence: readonly UpstreamEvidence[];
}

export interface ProfileRequest {
  readonly run_id: string;
  readonly request_id: string;
  readonly input_revision: number;
  readonly offering_id: string | null;
  readonly release_id: string | null;
  /** 同 TurnRequest：客户端给的学生原话，空数组表示回落到会话注册表。 */
  readonly evidence: readonly UpstreamEvidence[];
  readonly context: readonly ContextMessage[];
}

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: "BAD_REQUEST" | "CLIENT_CONTROL_REJECTED" | "PAYLOAD_TOO_LARGE"; readonly detail: string };

const REJECTED_FIELDS = [
  "system", "system_prompt", "systemPrompt", "developer", "model", "model_id", "modelId",
  "upstream", "upstream_url", "upstreamUrl", "base_url", "baseUrl", "api_key", "apiKey",
  "tool", "tools", "tool_choice", "functions", "max_tokens", "maxTokens", "temperature",
  "top_p", "stream_options", "provider", "endpoint", "headers"
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function rejectClientControl(body: Record<string, unknown>): string | null {
  for (const field of REJECTED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) return field;
  }
  return null;
}

function parseContext(raw: unknown, config: AiGatewayConfig): { ok: true; context: ContextMessage[] } | { ok: false; code: "BAD_REQUEST" | "CLIENT_CONTROL_REJECTED" | "PAYLOAD_TOO_LARGE"; detail: string } {
  if (raw === undefined || raw === null) return { ok: true, context: [] };
  if (!Array.isArray(raw)) return { ok: false, code: "BAD_REQUEST", detail: "context must be an array" };
  if (raw.length > config.maxContextMessages) {
    return { ok: false, code: "PAYLOAD_TOO_LARGE", detail: `context must not exceed ${config.maxContextMessages} messages` };
  }
  const context: ContextMessage[] = [];
  let total = 0;
  for (const item of raw) {
    const message = asRecord(item);
    if (!message) return { ok: false, code: "BAD_REQUEST", detail: "context entries must be objects" };
    const role = nonEmptyString(message.role) as RequestedRole | null;
    if (!role) return { ok: false, code: "BAD_REQUEST", detail: "context role is required" };
    if (role !== "user" && role !== "assistant") {
      // A45: a client cannot inject a system/developer/tool turn.
      return { ok: false, code: "CLIENT_CONTROL_REJECTED", detail: `context role ${role} is not client-settable` };
    }
    const text = typeof message.text === "string" ? message.text : null;
    if (text === null) return { ok: false, code: "BAD_REQUEST", detail: "context text must be a string" };
    total += text.length;
    if (total > config.maxContextChars) {
      return { ok: false, code: "PAYLOAD_TOO_LARGE", detail: `context must not exceed ${config.maxContextChars} characters` };
    }
    context.push({ role, text });  }
  return { ok: true, context };
}

/**
 * 学生原话。返回 null 表示「客户端没提供」——调用方据此回落到会话注册表；
 * 提供了但格式不对则直接拒绝，不做静默修补。
 */
function parseEvidence(raw: unknown): ValidationResult<readonly UpstreamEvidence[]> | null {
  if (raw === undefined || raw === null) return null;
  if (!Array.isArray(raw)) return { ok: false, code: "BAD_REQUEST", detail: "evidence must be an array" };
  if (raw.length > MAX_EVIDENCE_ITEMS) {
    return { ok: false, code: "PAYLOAD_TOO_LARGE", detail: `evidence must not exceed ${MAX_EVIDENCE_ITEMS} items` };
  }
  const seen = new Set<string>();
  const items: UpstreamEvidence[] = [];
  let total = 0;
  for (const entry of raw) {
    const record = asRecord(entry);
    if (!record) return { ok: false, code: "BAD_REQUEST", detail: "evidence entries must be objects" };
    const unknown = Object.keys(record).find((key) => !["evidenceId", "quote", "kind"].includes(key));
    if (unknown) return { ok: false, code: "BAD_REQUEST", detail: `unknown evidence field ${unknown}` };
    const evidenceId = nonEmptyString(record.evidenceId);
    const quote = nonEmptyString(record.quote);
    const kind = nonEmptyString(record.kind);
    if (!evidenceId) return { ok: false, code: "BAD_REQUEST", detail: "evidenceId is required" };
    if (!quote) return { ok: false, code: "BAD_REQUEST", detail: "evidence quote is required" };
    if (!kind || !EVIDENCE_KINDS.includes(kind)) {
      return { ok: false, code: "BAD_REQUEST", detail: `evidence kind ${String(record.kind)} is not a known source` };
    }
    if (evidenceId.length > 64) return { ok: false, code: "BAD_REQUEST", detail: "evidenceId is too long" };
    if (quote.length > MAX_EVIDENCE_QUOTE_CHARS) {
      return { ok: false, code: "PAYLOAD_TOO_LARGE", detail: `evidence quote must not exceed ${MAX_EVIDENCE_QUOTE_CHARS} characters` };
    }
    // 重复 ID 会让「模型引用了哪一条」变得不可判定，直接拒绝而不是去重。
    if (seen.has(evidenceId)) return { ok: false, code: "BAD_REQUEST", detail: `duplicate evidence id ${evidenceId}` };
    seen.add(evidenceId);
    total += quote.length;
    if (total > MAX_EVIDENCE_TOTAL_CHARS) {
      return { ok: false, code: "PAYLOAD_TOO_LARGE", detail: `evidence must not exceed ${MAX_EVIDENCE_TOTAL_CHARS} characters in total` };
    }
    items.push({ evidenceId, quote, kind });
  }
  return { ok: true, value: items };
}

function parseEnvelope(body: Record<string, unknown>, allowed: readonly string[]): ValidationResult<{ run_id: string; request_id: string; input_revision: number; context: ContextMessage[] }> | { ok: false; code: "BAD_REQUEST" | "CLIENT_CONTROL_REJECTED" | "PAYLOAD_TOO_LARGE"; detail: string } {
  const rejected = rejectClientControl(body);
  if (rejected) return { ok: false, code: "CLIENT_CONTROL_REJECTED", detail: `field ${rejected} is server-controlled` };
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) return { ok: false, code: "BAD_REQUEST", detail: `unknown field ${key}` };
  }
  const run_id = nonEmptyString(body.run_id);
  if (!run_id) return { ok: false, code: "BAD_REQUEST", detail: "run_id is required" };
  const request_id = nonEmptyString(body.request_id);
  if (!request_id) return { ok: false, code: "BAD_REQUEST", detail: "request_id is required" };
  const input_revision = typeof body.input_revision === "number" && Number.isInteger(body.input_revision)
    ? body.input_revision
    : null;
  if (input_revision === null || input_revision < 0) {
    return { ok: false, code: "BAD_REQUEST", detail: "input_revision must be a non-negative integer" };
  }
  return { ok: true, value: { run_id, request_id, input_revision, context: [] } };
}

export function validateTurnRequest(raw: unknown, config: AiGatewayConfig): ValidationResult<TurnRequest> {
  const body = asRecord(raw);
  if (!body) return { ok: false, code: "BAD_REQUEST", detail: "body must be a JSON object" };
  const envelope = parseEnvelope(body, ALLOWED_TURN_FIELDS);
  if (!envelope.ok) return envelope;
  const user_text = typeof body.user_text === "string" ? body.user_text : null;
  if (user_text === null) return { ok: false, code: "BAD_REQUEST", detail: "user_text must be a string" };
  if (!user_text.trim()) return { ok: false, code: "BAD_REQUEST", detail: "user_text must not be empty" };
  if (user_text.length > config.maxInputChars) {
    return { ok: false, code: "PAYLOAD_TOO_LARGE", detail: `user_text must not exceed ${config.maxInputChars} characters` };
  }
  const context = parseContext(body.context, config);
  if (!context.ok) return context;
  const rawTier = body.thinking_tier;
  let thinking_tier: ThinkingTier | null = null;
  if (rawTier !== undefined && rawTier !== null) {
    if (!SELECTABLE_THINKING_TIERS.includes(rawTier as ThinkingTier)) {
      return { ok: false, code: "BAD_REQUEST", detail: "thinking_tier must be speed, standard or deep" };
    }
    thinking_tier = rawTier as ThinkingTier;
  }
  const rawMode = body.mode;
  let mode: ChatMode | null = null;
  if (rawMode !== undefined && rawMode !== null) {
    if (!CHAT_MODES.includes(rawMode as ChatMode)) {
      return { ok: false, code: "BAD_REQUEST", detail: "mode must be guided or open" };
    }
    mode = rawMode as ChatMode;
  }
  const evidence = parseEvidence(body.evidence);
  if (evidence && !evidence.ok) return evidence;
  const catalog = parseDirectionCatalog(body.direction_catalog);
  if (!catalog) return { ok: false, code: "BAD_REQUEST", detail: "invalid published direction catalog" };
  return {
    ok: true,
    value: { direction_catalog: catalog, ...envelope.value, user_text, context: context.context, thinking_tier, mode,
      evidence: evidence ? evidence.value : [] }
  };
}

export function validateProfileRequest(raw: unknown, config: AiGatewayConfig): ValidationResult<ProfileRequest> {
  const body = asRecord(raw);
  if (!body) return { ok: false, code: "BAD_REQUEST", detail: "body must be a JSON object" };
  const envelope = parseEnvelope(body, ALLOWED_PROFILE_FIELDS);
  if (!envelope.ok) return envelope;
  // Facts are rebuilt server-side from the release; the client only names IDs, never values.
  const offering_id = body.offering_id === undefined || body.offering_id === null ? null : nonEmptyString(body.offering_id);
  if (body.offering_id !== undefined && body.offering_id !== null && !offering_id) {
    return { ok: false, code: "BAD_REQUEST", detail: "offering_id must be a non-empty string or null" };
  }
  const release_id = body.release_id === undefined || body.release_id === null ? null : nonEmptyString(body.release_id);
  if (body.release_id !== undefined && body.release_id !== null && !release_id) {
    return { ok: false, code: "BAD_REQUEST", detail: "release_id must be a non-empty string or null" };
  }
  const context = parseContext(body.context, config);
  if (!context.ok) return context;
  const evidence = parseEvidence(body.evidence);
  if (evidence && !evidence.ok) return evidence;
  return {
    ok: true,
    value: { ...envelope.value, offering_id, release_id, context: context.context,
      evidence: evidence ? evidence.value : [] }
  };
}

/**
 * Payload hash is computed over the validated, whitelisted fields only.
 * The thinking tier and the chat mode are deliberately excluded: they change how the answer is
 * shaped (how long the model thinks, whether options are offered), not what was asked, so a retry
 * that only flipped one of them must not be reported as a payload conflict.
 */
export function turnPayloadHash(request: TurnRequest): unknown {
  return { user_text: request.user_text, context: request.context, input_revision: request.input_revision,
    direction_catalog: request.direction_catalog ?? [],
    evidence: request.evidence };
}
export function profilePayloadHash(request: ProfileRequest): unknown {
  return { offering_id: request.offering_id, release_id: request.release_id, context: request.context,
    input_revision: request.input_revision, evidence: request.evidence };
}
