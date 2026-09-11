// TASK-08: idempotency, quota and session state.
//
// The interface is intentionally small and every mutating call is a single atomic step:
// a production Redis adapter must implement `claim`, `transition` and `revokeSession`
// with atomic scripts (SET NX / Lua) so that multi-instance deployments keep the same
// guarantees. The in-memory store is development-only and is refused in production.
import type {
  GatewayErrorCode, ReservationKey, ReservationRecord, RequestStatus, SessionRecord
} from "./types.js";
import { reservationKeyId } from "./types.js";

export interface ClaimLimits {
  readonly sessionConcurrency: number;
  readonly maxAttempts: number;
}

export type ClaimOutcome =
  | { readonly kind: "created"; readonly record: ReservationRecord }
  | { readonly kind: "duplicate"; readonly record: ReservationRecord }
  | { readonly kind: "conflict"; readonly record: ReservationRecord }
  | { readonly kind: "quota_exhausted" }
  | { readonly kind: "concurrency_limited" }
  | { readonly kind: "session_missing" }
  | { readonly kind: "unavailable" };

export interface TransitionPatch {
  readonly status?: RequestStatus;
  readonly upstreamStarted?: boolean;
  readonly resultSummary?: string | null;
  readonly errorCode?: GatewayErrorCode | null;
  readonly retryable?: boolean;
  readonly attempts?: number;
}

export interface StateStore {
  readonly kind: string;
  /** False when the shared store cannot be reached. The AI path fails closed; public flow is unaffected. */
  available(): boolean;
  createSession(record: SessionRecord): void;
  findSessionByTokenHash(tokenHash: string): SessionRecord | null;
  getSession(sessionId: string): SessionRecord | null;
  /** Revokes the session and deletes its temporary request records. Returns deleted record count. */
  revokeSession(sessionId: string, now: number): number;
  claim(input: {
    readonly key: ReservationKey;
    readonly payloadHash: string;
    readonly inputRevision: number;
    readonly now: number;
    readonly limits: ClaimLimits;
  }): ClaimOutcome;
  transition(keyId: string, patch: TransitionPatch, now: number): ReservationRecord | null;
  get(keyId: string): ReservationRecord | null;
  getByRequestId(sessionId: string, requestId: string): ReservationRecord | null;
  countRecords(): number;
}

/**
 * Development-only store. Single-threaded JavaScript makes each method atomic;
 * do not use it where multiple processes serve the same session.
 */
export class MemoryStateStore implements StateStore {
  readonly kind = "memory";
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly records = new Map<string, ReservationRecord>();
  private reachable = true;

  /** Test helper: simulate a shared-store outage (A44). */
  setReachable(value: boolean): void {
    this.reachable = value;
  }

  available(): boolean {
    return this.reachable;
  }

  createSession(record: SessionRecord): void {
    this.sessions.set(record.sessionId, record);
  }

  findSessionByTokenHash(tokenHash: string): SessionRecord | null {
    for (const session of this.sessions.values()) if (session.tokenHash === tokenHash) return session;
    return null;
  }

  getSession(sessionId: string): SessionRecord | null {
    return this.sessions.get(sessionId) ?? null;
  }

  revokeSession(sessionId: string, now: number): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;
    session.revokedAt = now;
    session.quotaRemaining = 0;
    let deleted = 0;
    for (const [keyId, record] of [...this.records]) {
      if (record.key.sessionId === sessionId) { this.records.delete(keyId); deleted += 1; }
    }
    this.sessions.delete(sessionId);
    return deleted;
  }

  claim(input: {
    readonly key: ReservationKey;
    readonly payloadHash: string;
    readonly inputRevision: number;
    readonly now: number;
    readonly limits: ClaimLimits;
  }): ClaimOutcome {
    if (!this.reachable) return { kind: "unavailable" };
    const keyId = reservationKeyId(input.key);
    const existing = this.records.get(keyId);
    if (existing) {
      if (existing.payloadHash === input.payloadHash) return { kind: "duplicate", record: existing };
      return { kind: "conflict", record: existing };
    }
    const session = this.sessions.get(input.key.sessionId);
    if (!session || session.revokedAt !== null) return { kind: "session_missing" };
    if (session.activeRequests >= input.limits.sessionConcurrency) return { kind: "concurrency_limited" };
    if (session.quotaRemaining <= 0) return { kind: "quota_exhausted" };
    session.quotaRemaining -= 1;
    session.activeRequests += 1;
    const record: ReservationRecord = {
      keyId, key: input.key, payloadHash: input.payloadHash, inputRevision: input.inputRevision,
      status: "reserved", attempts: 0, upstreamStarted: false, resultSummary: null,
      errorCode: null, retryable: false, createdAt: input.now, updatedAt: input.now
    };
    this.records.set(keyId, record);
    return { kind: "created", record };
  }

  transition(keyId: string, patch: TransitionPatch, now: number): ReservationRecord | null {
    const record = this.records.get(keyId);
    if (!record) return null;
    const before = record.status;
    if (patch.status !== undefined) record.status = patch.status;
    if (patch.upstreamStarted !== undefined) record.upstreamStarted = patch.upstreamStarted;
    if (patch.resultSummary !== undefined) record.resultSummary = patch.resultSummary;
    if (patch.errorCode !== undefined) record.errorCode = patch.errorCode;
    if (patch.retryable !== undefined) record.retryable = patch.retryable;
    if (patch.attempts !== undefined) record.attempts = patch.attempts;
    record.updatedAt = now;
    const after = record.status;
    const openBefore = before === "reserved" || before === "running";
    const openAfter = after === "reserved" || after === "running";
    if (openBefore && !openAfter) {
      const session = this.sessions.get(record.key.sessionId);
      if (session && session.activeRequests > 0) session.activeRequests -= 1;
    }
    if (!openBefore && openAfter) {
      const session = this.sessions.get(record.key.sessionId);
      if (session) session.activeRequests += 1;
    }
    return record;
  }

  get(keyId: string): ReservationRecord | null {
    return this.records.get(keyId) ?? null;
  }

  getByRequestId(sessionId: string, requestId: string): ReservationRecord | null {
    for (const record of this.records.values()) {
      if (record.key.sessionId === sessionId && record.key.requestId === requestId) return record;
    }
    return null;
  }

  countRecords(): number {
    return this.records.size;
  }
}
