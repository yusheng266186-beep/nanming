// TASK-08: HTTP adapter for the AI gateway.
//
// Transport concerns only: routing, JSON parsing limits, status codes and the SSE response.
// Every decision (idempotency, quota, validation, degradation) lives in @nanhang/ai-gateway,
// so the same rules hold for any future SCF/Express host.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import {
  AiGateway, FakeUpstream, MemoryStateStore, QianfanUpstream, newSessionId, newSessionToken, newSubjectId,
  qianfanOptionsFromEnv, type SessionRecord, type Upstream
} from "@nanhang/ai-gateway";
import { createEvidenceRegistry, emptyDirectionProfile, type EvidenceRegistry } from "@nanhang/exploration";
import { demoEvidence, DEMO_TRIAL_CODE, DEMO_ACADEMIC_BINDING } from "./demo-context.ts";
import { scriptedUpstreamFromEnv } from "./dev-upstream.ts";
import { ENV_NAMES, loadRuntimeConfig, memoryStoreAllowed } from "./config.ts";

const MAX_BODY_BYTES = 64 * 1024;
/** Past this multiple of the limit we stop draining and drop the connection instead of absorbing bytes. */
const DRAIN_MULTIPLIER = 8;

export interface ServerDeps {
  readonly gateway: AiGateway;
  readonly sessionFor?: (token: string) => SessionRecord | null;
}

interface ExchangedSession {
  readonly token: string;
  readonly session: SessionRecord;
}

/**
 * Reads a JSON body with a hard size cap. Once the cap is exceeded we stop buffering but keep
 * draining so the client still receives a proper 413 rather than a connection reset; a body far
 * beyond the cap is aborted outright.
 */
function readBody(request: IncomingMessage): Promise<{ ok: true; value: unknown } | { ok: false; code: "PAYLOAD_TOO_LARGE" | "BAD_REQUEST"; detail: string }> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let exceeded = false;
    let settled = false;
    const finish = (result: { ok: true; value: unknown } | { ok: false; code: "PAYLOAD_TOO_LARGE" | "BAD_REQUEST"; detail: string }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    request.on("data", (chunk: Buffer) => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        exceeded = true;
        if (size > MAX_BODY_BYTES * DRAIN_MULTIPLIER) {
          request.destroy();
          finish({ ok: false, code: "PAYLOAD_TOO_LARGE", detail: "request body too large" });
        }
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (exceeded) { finish({ ok: false, code: "PAYLOAD_TOO_LARGE", detail: "request body too large" }); return; }
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text.trim()) { finish({ ok: true, value: {} }); return; }
      try { finish({ ok: true, value: JSON.parse(text) as unknown }); }
      catch { finish({ ok: false, code: "BAD_REQUEST", detail: "body must be valid JSON" }); }
    });
    request.on("aborted", () => { finish({ ok: false, code: "BAD_REQUEST", detail: "request aborted" }); });
    request.on("error", () => { finish({ ok: false, code: "BAD_REQUEST", detail: "request stream error" }); });
  });
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "content-length": Buffer.byteLength(payload) });
  response.end(payload);
}

/**
 * A failed authentication is 401 only when the credential is the problem. When the shared state
 * store is unreachable the AI path must report 503 so clients distinguish "log in again" from
 * "the service is degraded" (A44).
 */
function sendAuthFailure(response: ServerResponse, code: string): void {
  const status = code === "STATE_STORE_UNAVAILABLE" ? 503 : 401;
  sendJson(response, status, { error: { code, message: code, request_id: "", retryable: status === 503 } });
}

/**
 * 试用访问码。线上必须由 NANHANG_TRIAL_ACCESS_CODE 给出——仓库里那个演示码是公开的，
 * 拿它上线等于没有门。只有开发档才回落到演示码；生产档没配就当作「未配置」，不发会话。
 */
export function trialAccessCode(env: NodeJS.ProcessEnv = process.env): string | null {
  const fromEnv = (env[ENV_NAMES.trialCode] ?? "").trim();
  if (fromEnv) return fromEnv;
  return env[ENV_NAMES.profile] === "production" ? null : DEMO_TRIAL_CODE;
}

/** 定长比较，避免用字符串比较的短路行为泄漏前缀。 */
function secretEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

function bearer(request: IncomingMessage): string | null {
  const header = request.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

/**
 * 允许的浏览器来源。开发时是 localhost 的任意端口；线上用 NANHANG_CORS_ORIGINS 逐个列出
 * （逗号分隔，例如 Pages 站点），**不用通配符**——这个接口带凭据，来源必须点名。
 */
const LOCAL_ORIGINS: readonly RegExp[] = [
  /^http:\/\/localhost:(5\d{3}|4\d{3})$/,
  /^http:\/\/127\.0\.0\.1:(5\d{3}|4\d{3})$/
];

function configuredOrigins(): readonly string[] {
  return (process.env.NANHANG_CORS_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
}

function originAllowed(origin: string): boolean {
  if (LOCAL_ORIGINS.some((pattern) => pattern.test(origin))) return true;
  return configuredOrigins().includes(origin);
}

function applyCors(request: IncomingMessage, response: ServerResponse): void {
  const origin = request.headers.origin;
  if (typeof origin !== "string") return;
  if (!originAllowed(origin)) return;
  response.setHeader("access-control-allow-origin", origin);
  response.setHeader("vary", "origin");
  response.setHeader("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
  response.setHeader("access-control-allow-headers", "authorization, content-type");
  response.setHeader("access-control-max-age", "600");
}

export function createApiServer(deps: ServerDeps): Server {
  const { gateway } = deps;
  const sessionsByToken = new Map<string, SessionRecord>();

  const authenticate = (request: IncomingMessage) =>
    gateway.authenticate(bearer(request));

  const server = createServer((request, response) => {
    applyCors(request, response);
    void handle(request, response);
  });

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? "/", "http://localhost");
    const route = `${request.method ?? "GET"} ${url.pathname}`;

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    if (route === "GET /healthz") {
      sendJson(response, 200, gateway.health());
      return;
    }
    if (route === "GET /readyz") {
      sendJson(response, 200, gateway.readiness());
      return;
    }
    if (route === "POST /v1/access/exchange") {
      const body = await readBody(request);
      if (!body.ok) { sendJson(response, body.code === "PAYLOAD_TOO_LARGE" ? 413 : 400, { error: { code: body.code, message: body.detail } }); return; }
      const expected = trialAccessCode();
      if (expected === null) {
        sendJson(response, 503, { error: { code: "AI_DISABLED", message: "access code is not configured on this deployment", request_id: "" } });
        return;
      }
      const code = (body.value as { access_code?: unknown }).access_code;
      if (typeof code !== "string" || !secretEquals(code.trim(), expected)) {
        sendJson(response, 401, { error: { code: "UNAUTHENTICATED", message: "access code rejected", request_id: "" } });
        return;
      }
      const token = newSessionToken();
      const sessionId = newSessionId();
      const session = gateway.createSession({
        token, subjectId: newSubjectId(), accessKind: "trial_code", sessionId
      });
      sessionsByToken.set(token, session);
      sendJson(response, 200, { session_id: session.sessionId, token, quota: session.quotaRemaining, academic_scope: false });
      return;
    }

    if (route === "POST /v1/career/turn") {
      const auth = authenticate(request);
      if (!auth.ok) { sendAuthFailure(response, auth.code); return; }
      const body = await readBody(request);
      if (!body.ok) { sendJson(response, body.code === "PAYLOAD_TOO_LARGE" ? 413 : 400, { error: { code: body.code, message: body.detail } }); return; }
      const controller = new AbortController();
      request.on("close", () => controller.abort());
      const result = await gateway.careerTurn(auth.session, body.value, controller.signal);
      response.writeHead(result.httpStatus, {
        "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store",
        connection: "keep-alive", "x-accel-buffering": "no"
      });
      for (const frame of result.frames) response.write(frame);
      response.end();
      return;
    }

    if (route === "POST /v1/career/profile") {
      const auth = authenticate(request);
      if (!auth.ok) { sendAuthFailure(response, auth.code); return; }
      const body = await readBody(request);
      if (!body.ok) { sendJson(response, body.code === "PAYLOAD_TOO_LARGE" ? 413 : 400, { error: { code: body.code, message: body.detail } }); return; }
      const controller = new AbortController();
      request.on("close", () => controller.abort());
      const result = await gateway.careerProfile(auth.session, body.value, controller.signal);
      sendJson(response, result.httpStatus, result.body);
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/v1/requests/")) {
      const auth = authenticate(request);
      if (!auth.ok) { sendAuthFailure(response, auth.code); return; }
      const requestId = decodeURIComponent(url.pathname.slice("/v1/requests/".length));
      const result = gateway.requestStatus(auth.session, requestId);
      sendJson(response, result.httpStatus, result.body);
      return;
    }

    if (route === "DELETE /v1/session") {
      const auth = authenticate(request);
      if (!auth.ok) { sendAuthFailure(response, auth.code); return; }
      const token = bearer(request);
      if (token) sessionsByToken.delete(token);
      const revoked = gateway.revoke(auth.session.sessionId);
      sendJson(response, 200, { revoked: true, deleted_records: revoked.deleted });
      return;
    }

    // P4 endpoints stay closed: no issuance path exists and no session kind can read grades (A40).
    if (request.method === "GET" && url.pathname === "/v1/me/academic-profile") {
      const auth = authenticate(request);
      if (!auth.ok) { sendAuthFailure(response, auth.code); return; }
      sendJson(response, 403, {
        error: {
          code: "FORBIDDEN_SUBJECT",
          message: auth.session.accessKind === "school_binding"
            ? "academic binding exists but the school-side flow is not open; endpoint disabled by design"
            : "this credential cannot read academic records; a school-issued binding is required",
          request_id: "",
          retryable: false
        }
      });
      return;
    }

    sendJson(response, 404, { error: { code: "BAD_REQUEST", message: `no route for ${route}`, request_id: "", retryable: false } });
  }

  return server;
}

export const DEMO_REPLY = "本地假上游：我看到你在描述自己的经历。可以先把愿意尝试的小任务写下来，再决定方向。";

function demoFakeUpstream(): Upstream {
  // Chunks and final reply are kept identical so the streamed text matches what completes.
  return new FakeUpstream({
    chunks: [DEMO_REPLY],
    final: { reply: DEMO_REPLY, suggestions: [], actions: ["两周内完成一次小体验并记录过程"] }
  });
}

/**
 * 上游选择，三条规则：
 *   1. NANHANG_AI_UPSTREAM=qianfan 时缺配置就直接拒绝启动——显式要真模型却悄悄退回假上游是最坏的情况；
 *   2. 显式 =fake，或设了 NANHANG_FAKE_SCENARIO，用本地假上游（验收失败路径用）；
 *   3. 未指定时，千帆两项必需配置齐全就自动用真模型，否则继续用假上游。
 * 实际生效的是哪一个会出现在启动日志与 /readyz 的 upstream 字段里，不会静默切换。
 */
export function selectUpstream(env: NodeJS.ProcessEnv = process.env): Upstream {
  const requested = (env[ENV_NAMES.upstream] ?? "").trim().toLowerCase();
  const qianfan = qianfanOptionsFromEnv(env);
  if (requested === "qianfan") {
    if (!qianfan) {
      throw new Error(`${ENV_NAMES.upstream}=qianfan 需要同时提供 ${ENV_NAMES.qianfanApiKey} 与 ${ENV_NAMES.qianfanModel}`);
    }
    return new QianfanUpstream(qianfan);
  }
  if (requested && requested !== "fake") {
    throw new Error(`未知的 ${ENV_NAMES.upstream}=${requested}（只支持 qianfan 或 fake）`);
  }
  if (requested === "fake") return scriptedUpstreamFromEnv(env) ?? demoFakeUpstream();
  const scenario = scriptedUpstreamFromEnv(env);
  if (scenario) return scenario;
  return qianfan ? new QianfanUpstream(qianfan) : demoFakeUpstream();
}

export function buildDemoGateway(
  overrides: Record<string, unknown> = {}, env: NodeJS.ProcessEnv = process.env
): { gateway: AiGateway; registry: EvidenceRegistry; store: MemoryStateStore } {
  const config = loadRuntimeConfig(overrides, env);
  const store = new MemoryStateStore();
  const upstream = selectUpstream(env);
  const registry = createEvidenceRegistry(demoEvidence());
  const profile = emptyDirectionProfile("api-profile");
  const gateway = new AiGateway({
    store, upstream, config,
    // 试用期的单实例模式：只有显式设了开关才允许生产档用内存存储。
    allowMemoryStore: memoryStoreAllowed(env),
    now: () => Date.now(),
    registryFor: () => registry,
    profileFor: () => profile,
    constraintsFor: () => []
  });
  return { gateway, registry, store };
}

export { DEMO_TRIAL_CODE, DEMO_ACADEMIC_BINDING };
