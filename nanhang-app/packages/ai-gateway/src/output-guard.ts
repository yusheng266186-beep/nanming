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
  allowedDirectionIds?(): readonly string[];
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
  /**
   * 「选择作答」模式下可以直接点的答案；自由探索模式恒为空数组。
   * 它只是把学生可能想说的话摆出来，点选后仍然作为学生自己的话发出去。
   */
  readonly options: readonly string[];
}

export type OutputRejection = {
  readonly ok: false;
  readonly code: "OUTPUT_REJECTED";
  readonly detail: string;
};
/**
 * `droppedSuggestions` 记下被丢掉的、没有署证的建议及原因。丢掉而不是整轮作废，
 * 是因为正文本身已经过安全扫描、且没有任何伪造引用会被展示；为了 JSON 里一条建议
 * 把学生刚等到的一整段回复换成「未通过安全校验」，代价大于收益。
 */
export type OutputAcceptance<T> = { readonly ok: true; readonly value: T; readonly droppedSuggestions?: readonly string[] };

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
 *
 * `includeProbabilityClaim: false` 用于**思考通道**：负责人 2026-09-20 明确要求把模型思考
 * 实时显示给学生，并接受草稿里出现「冲一冲」这类说法（思考不是结论，正文与结构化建议
 * 仍照旧严格校验）。所以思考只保留两条真正的技术性拦截——标记（防 XSS）与链接；
 * 命中概率/分层词汇时由调用方改为「停止继续显示思考并说明原因」，而不是把整轮回答作废。
 */
export function scanStreamedText(text: string, options: { includeProbabilityClaim?: boolean } = {}): string | null {
  if (HTML_PATTERN.test(text)) return "streamed text contains markup";
  if (LINK_PATTERN.test(text)) return "streamed text contains a link";
  if (options.includeProbabilityClaim !== false && containsProbabilityClaim(text)) {
    return "streamed text states an admission probability or tier";
  }
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
const MAX_OPTIONS = 4;
const MAX_OPTION_CHARS = 24;

export function validateCareerTurnOutput(raw: unknown, lookup: EvidenceLookup): OutputAcceptance<CareerTurnOutput> | OutputRejection {
  const body = asRecord(raw);
  if (!body) return { ok: false, code: "OUTPUT_REJECTED", detail: "output must be a JSON object" };
  const keys = Object.keys(body);
  if (keys.some((key) => !["reply", "suggestions", "actions", "options"].includes(key))) {
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
  const droppedSuggestions: string[] = [];
  for (const item of rawSuggestions) {
    const suggestion = asRecord(item);
    if (!suggestion) return { ok: false, code: "OUTPUT_REJECTED", detail: "suggestion must be an object" };
    const directionId = typeof suggestion.directionId === "string" ? suggestion.directionId : null;
    if (!directionId) return { ok: false, code: "OUTPUT_REJECTED", detail: "suggestion needs directionId" };
    if (lookup.allowedDirectionIds && !lookup.allowedDirectionIds().includes(directionId)) {
      droppedSuggestions.push(`${directionId}: 不在本轮发布专业目录中`); continue;
    }
    const rationale = typeof suggestion.rationale === "string" ? suggestion.rationale : "";
    const rejectedRationale = scanText(rationale, "suggestion rationale");
    if (rejectedRationale) return rejectedRationale;
    const evidenceIds = suggestion.evidenceIds;
    if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) {
      // 每一条建议都必须引用一条登记在案的原话；引用不到的建议整条丢掉，绝不展示。
      droppedSuggestions.push(`${directionId}: 没有引用任何已登记的原话`);
      continue;
    }
    const resolved: string[] = [];
    let unregistered: string | null = null;
    for (const id of evidenceIds) {
      if (typeof id !== "string" || !allowed.has(id)) { unregistered = String(id); break; }
      resolved.push(id);
    }
    if (unregistered !== null) {
      droppedSuggestions.push(`${directionId}: 引用了不存在的原话 ${unregistered}`);
      continue;
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
  const rawOptions = body.options ?? [];
  if (!Array.isArray(rawOptions)) return { ok: false, code: "OUTPUT_REJECTED", detail: "options must be an array" };
  if (rawOptions.length > MAX_OPTIONS) return { ok: false, code: "OUTPUT_REJECTED", detail: "too many options" };
  const options: string[] = [];
  for (const option of rawOptions) {
    if (typeof option !== "string" || !option.trim()) {
      return { ok: false, code: "OUTPUT_REJECTED", detail: "option must be a non-empty string" };
    }
    const trimmed = option.trim();
    if (trimmed.length > MAX_OPTION_CHARS) {
      return { ok: false, code: "OUTPUT_REJECTED", detail: "option is too long to be a clickable answer" };
    }
    const rejectedOption = scanText(trimmed, "option");
    if (rejectedOption) return rejectedOption;
    options.push(trimmed);
  }
  return {
    ok: true,
    value: { reply: body.reply.trim(), suggestions, actions, options },
    ...(droppedSuggestions.length ? { droppedSuggestions } : {})
  };
}

/**
 * Degraded response used whenever the model output fails validation or the upstream fails.
 * It restates only what the deterministic exploration module already knows and never invents facts.
 */
export function degradedTurnOutput(reason: string): CareerTurnOutput {
  return {
    reply: `AI 回复未通过安全校验，已改为本地提示（${reason}）。你可以继续使用无 AI 的专业浏览与合成参考；你的回答和已确认方向不受影响。`,
    suggestions: [],
    actions: [],
    options: []
  };
}

export { ExplorationError };
