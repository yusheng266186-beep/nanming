// TASK-08: input limits and client-control rejection.
//
// A45 is enforced here: the client may submit user-turn text and its own history, but it can
// never choose the system prompt, model, upstream URL or tool definitions. Any such field is
// rejected outright rather than ignored, so a client cannot discover the boundary by probing.
import type { AiGatewayConfig } from "./types.js";

export const ALLOWED_TURN_FIELDS = ["run_id", "request_id", "input_revision", "user_text", "context"] as const;
export const ALLOWED_PROFILE_FIELDS = ["run_id", "request_id", "input_revision", "offering_id", "release_id", "context"] as const;

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
}

export interface ProfileRequest {
  readonly run_id: string;
  readonly request_id: string;
  readonly input_revision: number;
  readonly offering_id: string | null;
  readonly release_id: string | null;
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
  return { ok: true, value: { ...envelope.value, user_text, context: context.context } };
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
  return { ok: true, value: { ...envelope.value, offering_id, release_id, context: context.context } };
}

/** Payload hash is computed over the validated, whitelisted fields only. */
export function turnPayloadHash(request: TurnRequest): unknown {
  return { user_text: request.user_text, context: request.context, input_revision: request.input_revision };
}
export function profilePayloadHash(request: ProfileRequest): unknown {
  return { offering_id: request.offering_id, release_id: request.release_id, context: request.context, input_revision: request.input_revision };
}
