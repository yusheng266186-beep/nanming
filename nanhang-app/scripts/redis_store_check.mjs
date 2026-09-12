// 对着真实 Redis 验一遍共享存储：Lua 脚本的原子性只能在真实例上验。
//
// 用法（连接信息只从环境变量读，不写进仓库、不打印密码）：
//   NANHANG_REDIS_HOST=... NANHANG_REDIS_PORT=... NANHANG_REDIS_PASSWORD=... \
//     node scripts/redis_store_check.mjs
//
// 检查项：建会话/按 token 查会话、额度与并发的原子扣减、重复与冲突、状态迁移、
// 撤销、以及「两个进程同时抢同一个 request_id 时只会有一个成功」的并发竞争。
// 用 nm:chk: 前缀的独立会话，跑完自己清理，不碰真实学生的数据。
import { MemoryStateStore, RedisStateStore, RedisConnection } from "../packages/ai-gateway/dist/index.js";

const host = process.env.NANHANG_REDIS_HOST;
const port = Number(process.env.NANHANG_REDIS_PORT ?? "");
const password = process.env.NANHANG_REDIS_PASSWORD;
if (!host || !password || !Number.isFinite(port) || port <= 0) {
  console.error("缺少 NANHANG_REDIS_HOST / NANHANG_REDIS_PORT / NANHANG_REDIS_PASSWORD");
  process.exit(2);
}

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "通过" : "失败"}  ${name}${detail ? "  — " + detail : ""}`);
};

const session = (id) => ({
  sessionId: id, tokenHash: `hash_${id}`, subjectId: `subject_${id}`, accessKind: "trial_code",
  expiresAt: Date.now() + 3600_000, quotaRemaining: 3, activeRequests: 0, revokedAt: null
});
const key = (sessionId, requestId, runId = "run") =>
  ({ sessionId, runId, taskType: "career_turn", requestId });

const store = new RedisStateStore({ host, port, password, ttlSeconds: 120 });
const peer = new RedisStateStore({ host, port, password, ttlSeconds: 120 }); // 假装是另一个函数实例
const raw = new RedisConnection({ host, port, password });

try {
  check("Redis 可达", await store.available());

  const idA = "sess_chk_a";
  await store.createSession(session(idA));
  const found = await peer.findSessionByTokenHash(`hash_${idA}`);
  check("另一个实例能按 token 找到同一个会话（多实例共享）", found?.sessionId === idA);

  const ttl = await raw.command(["TTL", `nm:sess:${idA}`]);
  check("会话键带过期时间", typeof ttl === "number" && ttl > 0, `TTL=${ttl}s`);

  const first = await store.claim({ key: key(idA, "req_1"), payloadHash: "pay_1", inputRevision: 1, now: Date.now(), limits: { sessionConcurrency: 1, maxAttempts: 3 } });
  check("首次占位成功", first.kind === "created", first.kind);
  const afterClaim = await peer.getSession(idA);
  check("额度被扣掉 1、并发记为 1", afterClaim?.quotaRemaining === 2 && afterClaim?.activeRequests === 1,
    `quota=${afterClaim?.quotaRemaining} active=${afterClaim?.activeRequests}`);

  const duplicate = await peer.claim({ key: key(idA, "req_1"), payloadHash: "pay_1", inputRevision: 1, now: Date.now(), limits: { sessionConcurrency: 1, maxAttempts: 3 } });
  check("同键同负载是 duplicate（不重复计费）", duplicate.kind === "duplicate", duplicate.kind);
  const afterDuplicate = await store.getSession(idA);
  check("重复请求没有再扣额度", afterDuplicate?.quotaRemaining === 2, `quota=${afterDuplicate?.quotaRemaining}`);

  const conflict = await store.claim({ key: key(idA, "req_1"), payloadHash: "pay_OTHER", inputRevision: 1, now: Date.now(), limits: { sessionConcurrency: 1, maxAttempts: 3 } });
  check("同键不同负载是 conflict（409）", conflict.kind === "conflict", conflict.kind);

  const limited = await store.claim({ key: key(idA, "req_2"), payloadHash: "pay_2", inputRevision: 1, now: Date.now(), limits: { sessionConcurrency: 1, maxAttempts: 3 } });
  check("并发上限生效（同一会话第二个在跑就被挡）", limited.kind === "concurrency_limited", limited.kind);

  const moved = await store.transition(first.record.keyId, { status: "succeeded", resultSummary: "{}" }, Date.now());
  check("状态迁移成功", moved?.status === "succeeded", String(moved?.status));
  const afterDone = await peer.getSession(idA);
  check("结束后并发计数归零", afterDone?.activeRequests === 0, `active=${afterDone?.activeRequests}`);
  check("按 request_id 能取回记录", (await peer.getByRequestId(idA, "req_1"))?.payloadHash === "pay_1");

  // 并发竞争：两个实例同时抢同一个 request_id，只能有一个 created
  const idB = "sess_chk_race";
  await store.createSession({ ...session(idB), quotaRemaining: 5 });
  const race = await Promise.all([
    store.claim({ key: key(idB, "req_race"), payloadHash: "same", inputRevision: 1, now: Date.now(), limits: { sessionConcurrency: 4, maxAttempts: 3 } }),
    peer.claim({ key: key(idB, "req_race"), payloadHash: "same", inputRevision: 1, now: Date.now(), limits: { sessionConcurrency: 4, maxAttempts: 3 } }),
    store.claim({ key: key(idB, "req_race"), payloadHash: "same", inputRevision: 1, now: Date.now(), limits: { sessionConcurrency: 4, maxAttempts: 3 } })
  ]);
  const created = race.filter((item) => item.kind === "created").length;
  const dup = race.filter((item) => item.kind === "duplicate").length;
  check("三方同时抢同一个 request_id：只结算一次", created === 1 && dup === 2, `created=${created} duplicate=${dup}`);
  const afterRace = await store.getSession(idB);
  check("并发竞争后额度只扣了 1", afterRace?.quotaRemaining === 4, `quota=${afterRace?.quotaRemaining}`);

  const revoked = await peer.revokeSession(idB, Date.now());
  const afterRevoke = await store.getSession(idB);
  check("撤销会话：记录被删、会话被标记", revoked >= 1 && afterRevoke?.revokedAt !== null,
    `deleted=${revoked} revokedAt=${afterRevoke?.revokedAt}`);

  const memory = new MemoryStateStore();
  check("内存档还在（本地开发用）", memory.kind === "memory" && store.kind === "redis");
} finally {
  // 清理本次检查产生的键
  for (const id of ["sess_chk_a", "sess_chk_race"]) {
    await raw.command(["DEL", `nm:sess:${id}`, `nm:tok:hash_${id}`, `nm:sidx:${id}`]);
  }
  for (const keyId of ["sess_chk_a|run|career_turn|req_1", "sess_chk_a|run|career_turn|req_2", "sess_chk_race|run|career_turn|req_race"]) {
    await raw.command(["DEL", `nm:req:${keyId}`]);
  }
  await raw.command(["DEL", "nm:ridx:sess_chk_a:req_1", "nm:ridx:sess_chk_a:req_2", "nm:ridx:sess_chk_race:req_race"]);
  store.close(); peer.close(); raw.close();

  const failed = results.filter((item) => !item.ok).length;
  console.log(`\n${results.length - failed}/${results.length} 项通过`);
  process.exit(failed === 0 ? 0 : 1);
}
