// TASK-08: access-control primitives for the AI path.
//
// Design baseline (SYSTEM_AND_INTERFACE_SPEC.md section 9). These functions are the
// executable form of A40/A41 and the "no client-supplied subject_id" rule.
// Node-only: this module is never imported by the browser bundle.
import { createHash, randomBytes } from "node:crypto";
import type { AccessKind } from "./types.js";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Stable hash of a request payload; object keys are sorted so key order cannot change the hash. */
export function hashPayload(value: unknown): string {
  return sha256Hex(canonicalJson(value));
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function newSessionId(): string {
  return `sess_${randomBytes(12).toString("hex")}`;
}

export function newSubjectId(): string {
  return `subj_${randomBytes(12).toString("hex")}`;
}

/** Only the hash of a session token is ever stored. */
export function tokenHash(token: string): string {
  return sha256Hex(`nanhang-ai-session:${token}`);
}

/**
 * Whether a given access kind may reach academic (grade) APIs.
 * A40: a Beichen TOTP gate only ever grants conversation access, never grade access.
 * Only a school-issued one-time binding could unlock this later, and that path is not open
 * (TASK-13). So every currently issuable credential returns false.
 */
export function academicApiAllowed(request: { readonly kind: AccessKind; readonly studentBinding: string | null }): boolean {
  if (request.kind !== "school_binding") return false;
  return request.studentBinding !== null && request.studentBinding.trim().length > 0;
}

/**
 * A41: knowing another student's identifier must not grant a read.
 * The session subject is authoritative; a different requested subject is always denied.
 */
export function authorizeSubjectRead(sessionSubjectId: string, requestedSubjectId: string): boolean {
  if (!sessionSubjectId || !requestedSubjectId) return false;
  return sessionSubjectId === requestedSubjectId;
}

/**
 * The session binding wins over anything the client sends. A differing client value is an
 * error, not a silent substitution, so callers cannot probe other students by ID.
 */
export function resolveSubjectId(
  sessionSubjectId: string,
  clientProvided: string | null
): { readonly ok: true; readonly subjectId: string } | { readonly ok: false; readonly reason: string } {
  if (!sessionSubjectId) return { ok: false, reason: "SESSION_SUBJECT_MISSING" };
  if (clientProvided === null || clientProvided === "") return { ok: true, subjectId: sessionSubjectId };
  if (clientProvided !== sessionSubjectId) return { ok: false, reason: "SUBJECT_OVERRIDE_REJECTED" };
  return { ok: true, subjectId: sessionSubjectId };
}
