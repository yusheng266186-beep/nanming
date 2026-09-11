// TASK-08: model output validation.
//
// Two independent gates, because they defend against different failures:
//  1. shape  — the model returned the agreed JSON object with only known fields and known evidence IDs;
//  2. safety — no grading-probability claim, no eligibility/rank/release mutation, no HTML or links.
// A46 and A48 are the safety gate; a rejected response is surfaced as a degraded restatement,
// never rendered as if the model had succeeded.
import { ExplorationError } from "@nanhang/exploration";

export interface AllowedEvidence {
  readonly evidenceId: string;
}

export interface EvidenceLookup {
  /** Returns the registered evidence IDs the model is allowed to cite. */
  allowedEvidenceIds(): readonly string[];
}

export function registryLookup(registry: { readonly messages: readonly AllowedEvidence[] }): EvidenceLookup {
  return { allowedEvidenceIds: () => registry.messages.map((message) => message.evidenceId) };
}

export interface CareerSuggestion {
  readonly directionId: string;
  readonly evidenceIds: readonly string[];
  readonly rationale: string;
  readonly openQuestions: readonly string[];
}

export interface CareerTurnOutput {
  readonly reply: string;
  readonly suggestions: readonly CareerSuggestion[];
  readonly actions: readonly string[];
}

export type OutputRejection = {
  readonly ok: false;
  readonly code: "OUTPUT_REJECTED";
  readonly detail: string;
};
export type OutputAcceptance<T> = { readonly ok: true; readonly value: T };

/** Claims that would present an admission forecast as fact. */
const PROBABILITY_PATTERNS: readonly RegExp[] = [
  /录取概率/,
  /录取几率/,
  /录取可能性\s*[为是]?\s*\d/,
  /被录取的可能性\s*[为是]?\s*\d/,
  /把握\s*[为是]?\s*\d+\s*%/,
  /(?:概率|几率|可能性)\s*[:：]?\s*\d+\s*%/,
  /\d+\s*%\s*(?:的)?(?:概率|几率|可能性|把握)/,
  /\b(?:probability|chance|likelihood)\s*(?:of\s*admission)?\s*(?:is|:)?\s*\d/i,
  /(?:冲刺|主航|稳妥|保底)/,
  /包录|保证录取|一定能(?:被)?录取|稳(?:稳)?录取/
];

/** Fields the model must never be able to author, even inside prose keys. */
const MUTATION_KEYS = [
  "eligibility", "eligibility_status", "rank", "rank_interval", "province_rank",
  "release_status", "release", "data_release", "published", "publish_allowed",
  "preference_status", "confirmed_direction", "score", "total", "tuition"
];

const LINK_PATTERN = /https?:\/\//i;
const HTML_PATTERN = /<\s*(?:script|style|iframe|img|svg|object|embed|a\b|div|span|p\b)/i;

export function containsProbabilityClaim(text: string): boolean {
  return PROBABILITY_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Text-level check applied to each streamed increment before it is emitted, so unsafe model
 * text never leaves the server even in a delta frame. Returns a detail string when the text
 * must be withheld.
 */
export function scanStreamedText(text: string): string | null {
  if (HTML_PATTERN.test(text)) return "streamed text contains markup";
  if (LINK_PATTERN.test(text)) return "streamed text contains a link";
  if (containsProbabilityClaim(text)) return "streamed text states an admission probability or tier";
  return null;
}

function scanText(text: string, where: string): OutputRejection | null {
  if (HTML_PATTERN.test(text)) return { ok: false, code: "OUTPUT_REJECTED", detail: `${where} contains markup` };
  if (LINK_PATTERN.test(text)) return { ok: false, code: "OUTPUT_REJECTED", detail: `${where} contains a link` };
  if (containsProbabilityClaim(text)) return { ok: false, code: "OUTPUT_REJECTED", detail: `${where} states an admission probability or tier` };
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Recursively rejects any attempt by the model to write a protected fact field. */
function scanKeys(value: unknown, path: string): OutputRejection | null {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const rejected = scanKeys(item, `${path}[${index}]`);
      if (rejected) return rejected;
    }
    return null;
  }
  const record = asRecord(value);
  if (!record) return null;
  for (const [key, item] of Object.entries(record)) {
    if (MUTATION_KEYS.includes(key.toLowerCase())) {
      return { ok: false, code: "OUTPUT_REJECTED", detail: `model attempted to set ${path}${key}` };
    }
    const rejected = scanKeys(item, `${path}${key}.`);
    if (rejected) return rejected;
  }
  return null;
}

const MAX_REPLY_CHARS = 2000;
const MAX_SUGGESTIONS = 5;
const MAX_ACTIONS = 2;

export function validateCareerTurnOutput(raw: unknown, lookup: EvidenceLookup): OutputAcceptance<CareerTurnOutput> | OutputRejection {
  const body = asRecord(raw);
  if (!body) return { ok: false, code: "OUTPUT_REJECTED", detail: "output must be a JSON object" };
  const keys = Object.keys(body);
  if (keys.some((key) => !["reply", "suggestions", "actions"].includes(key))) {
    return { ok: false, code: "OUTPUT_REJECTED", detail: "output has unknown fields" };
  }
  if (typeof body.reply !== "string" || !body.reply.trim()) {
    return { ok: false, code: "OUTPUT_REJECTED", detail: "reply is required" };
  }
  if (body.reply.length > MAX_REPLY_CHARS) {
    return { ok: false, code: "OUTPUT_REJECTED", detail: "reply is too long" };
  }
  const rejectedText = scanText(body.reply, "reply");
  if (rejectedText) return rejectedText;
  const keyRejection = scanKeys(body, "");
  if (keyRejection) return keyRejection;

  const allowed = new Set(lookup.allowedEvidenceIds());
  const rawSuggestions = body.suggestions ?? [];
  if (!Array.isArray(rawSuggestions)) return { ok: false, code: "OUTPUT_REJECTED", detail: "suggestions must be an array" };
  if (rawSuggestions.length > MAX_SUGGESTIONS) return { ok: false, code: "OUTPUT_REJECTED", detail: "too many suggestions" };
  const suggestions: CareerSuggestion[] = [];
  for (const item of rawSuggestions) {
    const suggestion = asRecord(item);
    if (!suggestion) return { ok: false, code: "OUTPUT_REJECTED", detail: "suggestion must be an object" };
    const directionId = typeof suggestion.directionId === "string" ? suggestion.directionId : null;
    if (!directionId) return { ok: false, code: "OUTPUT_REJECTED", detail: "suggestion needs directionId" };
    const rationale = typeof suggestion.rationale === "string" ? suggestion.rationale : "";
    const rejectedRationale = scanText(rationale, "suggestion rationale");
    if (rejectedRationale) return rejectedRationale;
    const evidenceIds = suggestion.evidenceIds;
    if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) {
      // Every claim must cite a registered evidence ID; an uncited suggestion is discarded as ungrounded.
      return { ok: false, code: "OUTPUT_REJECTED", detail: "suggestion must cite registered evidence" };
    }
    const resolved: string[] = [];
    for (const id of evidenceIds) {
      if (typeof id !== "string" || !allowed.has(id)) {
        return { ok: false, code: "OUTPUT_REJECTED", detail: `evidence id ${String(id)} is not registered` };
      }
      resolved.push(id);
    }
    const openQuestions = Array.isArray(suggestion.openQuestions)
      ? suggestion.openQuestions.filter((value): value is string => typeof value === "string")
      : [];
    for (const question of openQuestions) {
      const rejectedQuestion = scanText(question, "open question");
      if (rejectedQuestion) return rejectedQuestion;
    }
    suggestions.push({ directionId, evidenceIds: resolved, rationale, openQuestions });
  }
  const rawActions = body.actions ?? [];
  if (!Array.isArray(rawActions)) return { ok: false, code: "OUTPUT_REJECTED", detail: "actions must be an array" };
  if (rawActions.length > MAX_ACTIONS) return { ok: false, code: "OUTPUT_REJECTED", detail: "too many actions" };
  const actions: string[] = [];
  for (const action of rawActions) {
    if (typeof action !== "string" || !action.trim()) {
      return { ok: false, code: "OUTPUT_REJECTED", detail: "action must be a non-empty string" };
    }
    const rejectedAction = scanText(action, "action");
    if (rejectedAction) return rejectedAction;
    actions.push(action);
  }
  return { ok: true, value: { reply: body.reply.trim(), suggestions, actions } };
}

/**
 * Degraded response used whenever the model output fails validation or the upstream fails.
 * It restates only what the deterministic exploration module already knows and never invents facts.
 */
export function degradedTurnOutput(reason: string): CareerTurnOutput {
  return {
    reply: `AI 回复未通过安全校验，已改为本地提示（${reason}）。你可以继续使用无 AI 的专业浏览与合成参考；你的回答和已确认方向不受影响。`,
    suggestions: [],
    actions: []
  };
}

export { ExplorationError };
