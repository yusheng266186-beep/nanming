// TASK-08: AI gateway core types and run configuration.
// No DOM, no network, no LLM execution, no current-time reads (callers inject `now`).
export type TaskType = "career_turn" | "career_profile";

/**
 * 学生可选的思考档位。`deep` 是默认档（质量优先）：模型先想清楚再回答，代价是等待时间变长。
 * 档位由学生自己选，服务端只做取值校验；具体下发什么由上游适配器决定。
 */
export type ThinkingTier = "speed" | "standard" | "deep";

/**
 * 聊法。`guided` 每轮给几个可以直接选的答案（学生点一下就能答），`open` 只问问题、不设选项。
 * 与北辰的领航／夜航同构，但取值名保持中性，界面文案由前端决定。
 */
export type ChatMode = "guided" | "open";
export const CHAT_MODES: readonly ChatMode[] = ["guided", "open"];

/**
 * 学生自己保存的原话（证据）。它由客户端随请求发上来，服务端只用它做两件事：
 * 告诉模型可以引用哪些 ID，以及校验模型引用的是不是这些 ID。
 * 模型不能引用客户端没给过的 ID——这条是「建议必须有据可依」的实现方式。
 */
export interface UpstreamEvidence {
  readonly evidenceId: string;
  readonly quote: string;
  readonly kind: string;
}

/** 学生原话的四种来源，与 @nanhang/exploration 的 EvidenceKind 一致。 */
export const EVIDENCE_KINDS: readonly string[] = [
  "student_preference_statement", "student_task_attempt", "student_self_report", "facilitator_note"
];

export type RequestStatus = "reserved" | "running" | "succeeded" | "failed" | "unknown";

/** Transport status of the local HTTP adapter; mirrors SYSTEM_AND_INTERFACE_SPEC.md section 6. */
export type HttpStatus = 200 | 400 | 401 | 403 | 409 | 413 | 429 | 503;

export type GatewayErrorCode =
  | "BAD_REQUEST"
  | "CLIENT_CONTROL_REJECTED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN_SUBJECT"
  | "REQUEST_CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "QUOTA_EXHAUSTED"
  | "CONCURRENCY_LIMITED"
  | "AI_DISABLED"
  | "STATE_STORE_UNAVAILABLE"
  | "UPSTREAM_UNAVAILABLE"
  | "UPSTREAM_TIMEOUT"
  | "OUTPUT_REJECTED";

export interface GatewayError {
  readonly code: GatewayErrorCode;
  readonly message: string;
  readonly request_id: string;
  readonly retryable: boolean;
}

/**
 * Run limits. Defaults follow the engineering budget in SYSTEM_AND_INTERFACE_SPEC.md section 8
 * and are adjustable run configuration, not measured model performance.
 */
export interface AiGatewayConfig {
  readonly profile: "development" | "production";
  readonly maxInputChars: number;
  readonly maxContextMessages: number;
  readonly maxContextChars: number;
  readonly maxEvidenceIds: number;
  readonly firstByteTimeoutMs: number;
  readonly totalTimeoutMs: number;
  readonly heartbeatMs: number;
  readonly sessionConcurrency: number;
  readonly quotaPerSession: number;
  readonly maxPreUpstreamRetries: number;
  readonly maxAttempts: number;
  readonly sessionTtlMs: number;
  readonly modelId: string;
  readonly systemPromptId: string;
}

export const DEFAULT_CONFIG: AiGatewayConfig = {
  profile: "development",
  maxInputChars: 4000,
  maxContextMessages: 20,
  maxContextChars: 32000,
  maxEvidenceIds: 200,
  firstByteTimeoutMs: 30000,
  totalTimeoutMs: 90000,
  heartbeatMs: 15000,
  sessionConcurrency: 1,
  quotaPerSession: 20,
  maxPreUpstreamRetries: 2,
  maxAttempts: 3,
  sessionTtlMs: 60 * 60 * 1000,
  modelId: "fake-local-v1",
  systemPromptId: "career-exploration-v1"
};

export function withConfig(overrides: Partial<AiGatewayConfig> = {}): AiGatewayConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

export interface ReservationKey {
  readonly sessionId: string;
  readonly runId: string;
  readonly taskType: TaskType;
  readonly requestId: string;
}

export function reservationKeyId(key: ReservationKey): string {
  return `${key.sessionId}|${key.runId}|${key.taskType}|${key.requestId}`;
}

export interface ReservationRecord {
  readonly keyId: string;
  readonly key: ReservationKey;
  readonly payloadHash: string;
  readonly inputRevision: number;
  status: RequestStatus;
  attempts: number;
  upstreamStarted: boolean;
  resultSummary: string | null;
  errorCode: GatewayErrorCode | null;
  retryable: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SessionRecord {
  readonly sessionId: string;
  readonly tokenHash: string;
  readonly subjectId: string;
  readonly accessKind: AccessKind;
  readonly expiresAt: number;
  quotaRemaining: number;
  activeRequests: number;
  revokedAt: number | null;
}

/**
 * How a session was admitted.
 * `school_binding` is reserved for the TASK-13 school-issued one-time binding; it is not
 * reachable today (no issuance path exists), but keeping it in the union lets the academic
 * gate be written as an allow-list instead of a deny-list.
 */
export type AccessKind = "trial_code" | "beichen_totp" | "anonymous" | "school_binding";

export interface SessionSnapshot {
  readonly sessionId: string;
  readonly quotaRemaining: number;
  readonly expiresAt: number;
}
