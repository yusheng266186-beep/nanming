// TASK-08: 共享状态存储（Redis）。
//
// 与 MemoryStateStore 同一套语义，但每一步都是**一个 Lua 脚本**：云函数会同时起多个实例，
// 「先读再写」的做法会让两个学生的并发请求互相覆盖（超卖额度、重复结算、并发数算错）。
// 所有键统一前缀 `nm:`，和同一台实例上别的项目互不打扰；键都带 TTL，学生不用也不会堆积。
import type {
  ReservationKey, ReservationRecord, SessionRecord
} from "./types.js";
import { reservationKeyId } from "./types.js";
import type {
  ClaimLimits, ClaimOutcome, StateStore, TransitionPatch
} from "./state-store.js";
import { RedisConnection, type RedisOptions } from "./redis-client.js";

const PREFIX = "nm:";
const sessionKey = (sessionId: string) => `${PREFIX}sess:${sessionId}`;
const tokenKey = (tokenHash: string) => `${PREFIX}tok:${tokenHash}`;
const recordKey = (keyId: string) => `${PREFIX}req:${keyId}`;
const sessionIndexKey = (sessionId: string) => `${PREFIX}sidx:${sessionId}`;
const requestIndexKey = (sessionId: string, requestId: string) => `${PREFIX}ridx:${sessionId}:${requestId}`;
const consumedKey = (key: string) => `${PREFIX}once:${key}`;

/**
 * 占位（claim）。返回值是一个数组，第一项是结果类型：
 *   {kind, record?} —— record 用字符串回传，避免用 cjson 再编码一次。
 * 额度与并发都在同一个脚本里判断并扣减，脚本内不会被打断。
 */
const CLAIM_SCRIPT = `
local existing = redis.call('GET', KEYS[2])
if existing then
  local rec = cjson.decode(existing)
  if rec.payloadHash == ARGV[3] then return {'duplicate', existing} end
  return {'conflict', existing}
end
local raw = redis.call('GET', KEYS[1])
if not raw then return {'session_missing'} end
local session = cjson.decode(raw)
if session.revokedAt ~= cjson.null then return {'session_missing'} end
if session.quotaRemaining <= 0 then return {'quota_exhausted'} end
if session.activeRequests >= tonumber(ARGV[6]) then return {'concurrency_limited'} end
session.quotaRemaining = session.quotaRemaining - 1
session.activeRequests = session.activeRequests + 1
redis.call('SET', KEYS[1], cjson.encode(session), 'EX', ARGV[7])
redis.call('SET', KEYS[2], ARGV[5], 'EX', ARGV[7])
redis.call('SADD', KEYS[3], ARGV[1])
redis.call('EXPIRE', KEYS[3], ARGV[7])
redis.call('SET', KEYS[4], ARGV[1], 'EX', ARGV[7])
return {'created', ARGV[5]}
`;

/**
 * 状态迁移。补丁里可能出现 JSON null（清空 resultSummary / errorCode），
 * cjson 解出来是 cjson.null，赋值回去编码仍是 null，语义保持一致。
 * 会话的 activeRequests 只在「进行中 ⇄ 已结束」跨越时增减，和内存档一致。
 */
const TRANSITION_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return nil end
local record = cjson.decode(raw)
local before = record.status
local patch = cjson.decode(ARGV[1])
for field, value in pairs(patch) do record[field] = value end
record.updatedAt = tonumber(ARGV[2])
redis.call('SET', KEYS[1], cjson.encode(record), 'EX', ARGV[3])
local openBefore = (before == 'reserved' or before == 'running')
local openAfter = (record.status == 'reserved' or record.status == 'running')
if openBefore ~= openAfter then
  local sraw = redis.call('GET', KEYS[2])
  if sraw then
    local session = cjson.decode(sraw)
    if openBefore then
      if session.activeRequests > 0 then session.activeRequests = session.activeRequests - 1 end
    else
      session.activeRequests = session.activeRequests + 1
    end
    redis.call('SET', KEYS[2], cjson.encode(session), 'EX', ARGV[3])
  end
end
return cjson.encode(record)
`;

/** 撤销：会话留一条已撤销的短命墓碑（token 查询仍能查到并拒绝），请求记录与索引一并删掉。 */
const REVOKE_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 0 end
local session = cjson.decode(raw)
session.revokedAt = tonumber(ARGV[2])
session.quotaRemaining = 0
redis.call('SET', KEYS[1], cjson.encode(session), 'EX', 300)
local keyIds = redis.call('SMEMBERS', KEYS[2])
local deleted = 0
for index = 1, #keyIds do
  redis.call('DEL', ARGV[1] .. keyIds[index])
  deleted = deleted + 1
end
redis.call('DEL', KEYS[2])
return deleted
`;

export interface RedisStoreOptions extends RedisOptions {
  /** 会话与记录在 Redis 里的存活时间（秒）。默认按网关的会话 TTL 来。 */
  readonly ttlSeconds?: number;
  /** 探活结果的缓存时间（毫秒），避免每个请求都 PING 一次。 */
  readonly availabilityCacheMs?: number;
  readonly now?: () => number;
}

export class RedisStateStore implements StateStore {
  readonly kind = "redis";
  private readonly connection: RedisConnection;
  private readonly ttlSeconds: number;
  private readonly availabilityCacheMs: number;
  private lastCheck = 0;
  private lastValue = false;

  constructor(private readonly options: RedisStoreOptions) {
    this.connection = new RedisConnection(options);
    this.ttlSeconds = options.ttlSeconds ?? 3600;
    this.availabilityCacheMs = options.availabilityCacheMs ?? 1000;
  }

  async available(): Promise<boolean> {
    const now = this.options.now?.() ?? Date.now();
    if (now - this.lastCheck < this.availabilityCacheMs) return this.lastValue;
    this.lastValue = await this.connection.ping();
    this.lastCheck = now;
    return this.lastValue;
  }

  async consumeOnce(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.connection.command([
      "SET", consumedKey(key), "1", "NX", "EX", String(Math.max(1, Math.floor(ttlSeconds)))
    ]);
    return result === "OK";
  }

  async createSession(record: SessionRecord): Promise<void> {
    await this.connection.command(["SET", sessionKey(record.sessionId), JSON.stringify(record), "EX", String(this.ttlSeconds)]);
    if (record.tokenHash) {
      await this.connection.command(["SET", tokenKey(record.tokenHash), record.sessionId, "EX", String(this.ttlSeconds)]);
    }
  }

  async findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const sessionId = await this.connection.command(["GET", tokenKey(tokenHash)]);
    if (typeof sessionId !== "string") return null;
    return await this.getSession(sessionId);
  }

  async getSession(sessionId: string): Promise<SessionRecord | null> {
    const raw = await this.connection.command(["GET", sessionKey(sessionId)]);
    return typeof raw === "string" ? (JSON.parse(raw) as SessionRecord) : null;
  }

  async revokeSession(sessionId: string, now: number): Promise<number> {
    const deleted = await this.connection.eval(REVOKE_SCRIPT, [sessionKey(sessionId), sessionIndexKey(sessionId)],
      [PREFIX + "req:", String(now)]);
    return typeof deleted === "number" ? deleted : 0;
  }

  async claim(input: {
    readonly key: ReservationKey;
    readonly payloadHash: string;
    readonly inputRevision: number;
    readonly now: number;
    readonly limits: ClaimLimits;
  }): Promise<ClaimOutcome> {
    const keyId = reservationKeyId(input.key);
    const record: ReservationRecord = {
      keyId, key: input.key, payloadHash: input.payloadHash, inputRevision: input.inputRevision,
      status: "reserved", attempts: 0, upstreamStarted: false, resultSummary: null,
      errorCode: null, retryable: false, createdAt: input.now, updatedAt: input.now
    };
    const reply = await this.connection.eval(CLAIM_SCRIPT,
      [sessionKey(input.key.sessionId), recordKey(keyId), sessionIndexKey(input.key.sessionId),
        requestIndexKey(input.key.sessionId, input.key.requestId)],
      [keyId, input.key.sessionId, input.payloadHash, String(input.inputRevision), JSON.stringify(record),
        String(input.limits.sessionConcurrency), String(this.ttlSeconds)]);
    if (!Array.isArray(reply) || typeof reply[0] !== "string") {
      throw new Error("unexpected claim reply from redis");
    }
    const kind = reply[0];
    const raw = typeof reply[1] === "string" ? reply[1] : null;
    switch (kind) {
      case "created":
      case "duplicate":
      case "conflict":
        return { kind, record: JSON.parse(raw ?? JSON.stringify(record)) as ReservationRecord };
      case "quota_exhausted": return { kind: "quota_exhausted" };
      case "concurrency_limited": return { kind: "concurrency_limited" };
      case "session_missing": return { kind: "session_missing" };
      default: throw new Error(`unknown claim outcome ${kind}`);
    }
  }

  async transition(keyId: string, patch: TransitionPatch, now: number): Promise<ReservationRecord | null> {
    const applied = await this.connection.eval(TRANSITION_SCRIPT,
      [recordKey(keyId), sessionKey(sessionIdOf(keyId))],
      [JSON.stringify(patch), String(now), String(this.ttlSeconds)]);
    return typeof applied === "string" ? (JSON.parse(applied) as ReservationRecord) : null;
  }

  async get(keyId: string): Promise<ReservationRecord | null> {
    const raw = await this.connection.command(["GET", recordKey(keyId)]);
    return typeof raw === "string" ? (JSON.parse(raw) as ReservationRecord) : null;
  }

  async getByRequestId(sessionId: string, requestId: string): Promise<ReservationRecord | null> {
    const keyId = await this.connection.command(["GET", requestIndexKey(sessionId, requestId)]);
    if (typeof keyId !== "string") return null;
    return await this.get(keyId);
  }

  /** 只用于诊断与测试；键不多时 SCAN 足够，不在请求热路径上。 */
  async countRecords(): Promise<number> {
    let cursor = "0";
    let count = 0;
    do {
      const reply = await this.connection.command(["SCAN", cursor, "MATCH", `${PREFIX}req:*`, "COUNT", "500"]);
      if (!Array.isArray(reply) || !Array.isArray(reply[1])) break;
      cursor = String(reply[0]);
      count += (reply[1] as unknown[]).length;
    } while (cursor !== "0");
    return count;
  }

  close(): void {
    this.connection.close();
  }
}

/** keyId 形如 `sessionId|runId|taskType|requestId`，取回 sessionId 用于同脚本内改会话计数。 */
function sessionIdOf(keyId: string): string {
  const index = keyId.indexOf("|");
  return index === -1 ? keyId : keyId.slice(0, index);
}
