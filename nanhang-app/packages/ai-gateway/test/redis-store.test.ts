// TASK-08: 共享存储（Redis）的线级测试。
//
// 这里用本机 socket 假装一台 Redis：验证的是**我们这一侧**的行为——命令编码、AUTH、
// 断开重连、超时、键名与 TTL 的用法。Lua 脚本的原子性只能在真 Redis 上验，
// 由 scripts/redis_store_check.mjs 对着真实实例跑（文档里写了怎么跑）。
import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server, type Socket } from "node:net";
import type { AddressInfo } from "node:net";
import { RedisConnection, parseReply, RedisStateStore } from "../src/index.js";

interface FakeRedis {
  readonly server: Server;
  readonly port: number;
  readonly commands: string[][];
  readonly sockets: Socket[];
  reply: (command: string[]) => string | null;
  close(): Promise<void>;
}

async function fakeRedis(): Promise<FakeRedis> {
  const commands: string[][] = [];
  const sockets: Socket[] = [];
  const state: { reply: (command: string[]) => string | null } = {
    reply: () => "+OK\r\n"
  };
  const server = createServer((socket) => {
    sockets.push(socket);
    let buffer = Buffer.alloc(0);
    socket.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        const parsed = parseCommand(buffer);
        if (!parsed) return;
        buffer = buffer.subarray(parsed.consumed);
        commands.push(parsed.args);
        const reply = state.reply(parsed.args);
        if (reply !== null) socket.write(reply);
      }
    });
    socket.on("error", () => { /* 测试里主动断开是常态 */ });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  return {
    server, port, commands, sockets,
    get reply() { return state.reply; },
    set reply(value) { state.reply = value; },
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  };
}

/** 只解析客户端发来的命令数组（RESP 的 * + $ 两种）。 */
function parseCommand(buffer: Buffer): { args: string[]; consumed: number } | null {
  const headerEnd = buffer.indexOf("\r\n");
  if (headerEnd === -1) return null;
  if (String.fromCharCode(buffer[0]!) !== "*") return null;
  const count = Number(buffer.toString("utf8", 1, headerEnd));
  let cursor = headerEnd + 2;
  const args: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const lineEnd = buffer.indexOf("\r\n", cursor);
    if (lineEnd === -1) return null;
    const length = Number(buffer.toString("utf8", cursor + 1, lineEnd));
    const start = lineEnd + 2;
    if (buffer.length < start + length + 2) return null;
    args.push(buffer.toString("utf8", start, start + length));
    cursor = start + length + 2;
  }
  return { args, consumed: cursor };
}

let active: FakeRedis | null = null;
afterEach(async () => {
  await active?.close();
  active = null;
});

describe("RESP 解析", () => {
  it("认得简单字符串、整数、批量字符串、数组与空值", () => {
    expect(parseReply(Buffer.from("+OK\r\n"), 0)).toMatchObject({ value: "OK", consumed: 5 });
    expect(parseReply(Buffer.from(":42\r\n"), 0)).toMatchObject({ value: 42 });
    expect(parseReply(Buffer.from("$3\r\nabc\r\n"), 0)).toMatchObject({ value: "abc", consumed: 9 });
    expect(parseReply(Buffer.from("$-1\r\n"), 0)).toMatchObject({ value: null });
    expect(parseReply(Buffer.from("*2\r\n$1\r\na\r\n:7\r\n"), 0)).toMatchObject({ value: ["a", 7] });
  });

  it("数据不完整时返回 null，不吞掉半条回复", () => {
    expect(parseReply(Buffer.from("$5\r\nab"), 0)).toBeNull();
    expect(parseReply(Buffer.from("*2\r\n$1\r\na\r\n"), 0)).toBeNull();
  });

  it("错误回复带上原因", () => {
    const parsed = parseReply(Buffer.from("-ERR bad\r\n"), 0);
    expect(parsed?.error).toBe("ERR bad");
  });
});

describe("连接行为", () => {
  it("配置了密码就先 AUTH，再执行命令", async () => {
    active = await fakeRedis();
    const connection = new RedisConnection({ host: "127.0.0.1", port: active.port, password: "s3cret" });
    await connection.command(["PING"]);
    expect(active.commands.map((args) => args[0])).toEqual(["AUTH", "PING"]);
    expect(active.commands[0]![1]).toBe("s3cret");
    connection.close();
  });

  it("服务器返回错误时抛出 RedisError，而不是静默当成功", async () => {
    active = await fakeRedis();
    active.reply = () => "-ERR unknown command\r\n";
    const connection = new RedisConnection({ host: "127.0.0.1", port: active.port });
    await expect(connection.command(["NOPE"])).rejects.toThrow(/unknown command/);
    connection.close();
  });

  it("连接被断开后，下一次命令会自动重连", async () => {
    active = await fakeRedis();
    const connection = new RedisConnection({ host: "127.0.0.1", port: active.port });
    expect(await connection.ping()).toBe(true);
    for (const socket of active.sockets) socket.destroy();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(await connection.ping()).toBe(true);
    connection.close();
  });

  it("无人应答时命令超时，探活返回 false 而不抛错", async () => {
    active = await fakeRedis();
    active.reply = () => null; // 收下命令但不回
    const connection = new RedisConnection({ host: "127.0.0.1", port: active.port, commandTimeoutMs: 60 });
    await expect(connection.command(["PING"])).rejects.toThrow(/timed out/);
    expect(await connection.ping()).toBe(false);
    connection.close();
  });
});

describe("RedisStateStore 的键与 TTL", () => {
  it("一次性动态码用 SET NX EX 原子消费，重复使用返回 false", async () => {
    active = await fakeRedis();
    let first = true;
    active.reply = (args) => {
      if (args[0] === "SET" && args[1] === "nm:once:totp:proof") {
        if (first) { first = false; return "+OK\r\n"; }
        return "$-1\r\n";
      }
      return "+OK\r\n";
    };
    const store = new RedisStateStore({ host: "127.0.0.1", port: active.port });
    expect(await store.consumeOnce("totp:proof", 120)).toBe(true);
    expect(await store.consumeOnce("totp:proof", 120)).toBe(false);
    const command = active.commands.find((args) => args[1] === "nm:once:totp:proof")!;
    expect(command).toEqual(["SET", "nm:once:totp:proof", "1", "NX", "EX", "120"]);
    store.close();
  });

  it("建会话时写会话键与 token 索引，都带过期时间", async () => {
    active = await fakeRedis();
    const store = new RedisStateStore({ host: "127.0.0.1", port: active.port, ttlSeconds: 120 });
    await store.createSession({
      sessionId: "sess_1", tokenHash: "hash_1", subjectId: "sub_1", accessKind: "trial_code",
      expiresAt: 1000, quotaRemaining: 20, activeRequests: 0, revokedAt: null
    });
    const sets = active.commands.filter((args) => args[0] === "SET");
    expect(sets).toHaveLength(2);
    expect(sets[0]![1]).toBe("nm:sess:sess_1");
    expect(sets[0]!.slice(-2)).toEqual(["EX", "120"]);
    expect(sets[1]![1]).toBe("nm:tok:hash_1");
    expect(sets[1]![2]).toBe("sess_1");
    store.close();
  });

  it("token 查会话：先查索引再取会话内容", async () => {
    active = await fakeRedis();
    const session = {
      sessionId: "sess_9", tokenHash: "hash_9", subjectId: "sub_9", accessKind: "trial_code",
      expiresAt: 999, quotaRemaining: 5, activeRequests: 0, revokedAt: null
    };
    active.reply = (args) => {
      if (args[0] === "GET" && args[1] === "nm:tok:hash_9") return "$6\r\nsess_9\r\n";
      if (args[0] === "GET" && args[1] === "nm:sess:sess_9") return `$${Buffer.byteLength(JSON.stringify(session))}\r\n${JSON.stringify(session)}\r\n`;
      return "$-1\r\n";
    };
    const store = new RedisStateStore({ host: "127.0.0.1", port: active.port });
    expect((await store.findSessionByTokenHash("hash_9"))?.sessionId).toBe("sess_9");
    expect(await store.findSessionByTokenHash("hash_unknown")).toBeNull();
    store.close();
  });

  it("探活有缓存：一秒内不重复 PING", async () => {
    active = await fakeRedis();
    const store = new RedisStateStore({ host: "127.0.0.1", port: active.port, availabilityCacheMs: 5000 });
    await store.available();
    await store.available();
    await store.available();
    expect(active.commands.filter((args) => args[0] === "PING")).toHaveLength(1);
    store.close();
  });

  it("Redis 不可达时 available() 返回 false（AI 侧据此关闭，公共数据不受影响）", async () => {
    const store = new RedisStateStore({ host: "127.0.0.1", port: 1, connectTimeoutMs: 200, commandTimeoutMs: 200 });
    expect(await store.available()).toBe(false);
    store.close();
  });

  it("claim 走 EVAL，并把键与参数按约定排好", async () => {
    active = await fakeRedis();
    active.reply = (args) => (args[0] === "EVAL" ? "*1\r\n$15\r\nsession_missing\r\n" : "+OK\r\n");
    const store = new RedisStateStore({ host: "127.0.0.1", port: active.port, ttlSeconds: 60 });
    const outcome = await store.claim({
      key: { sessionId: "sess_1", runId: "run_1", taskType: "career_turn", requestId: "req_1" },
      payloadHash: "pay_1", inputRevision: 1, now: 500, limits: { sessionConcurrency: 1, maxAttempts: 3 }
    });
    expect(outcome.kind).toBe("session_missing");
    const evalCall = active.commands.find((args) => args[0] === "EVAL")!;
    expect(evalCall[2]).toBe("4"); // KEYS 数量：会话、记录、会话索引、请求索引
    expect(evalCall[3]).toBe("nm:sess:sess_1");
    expect(evalCall[4]).toBe("nm:req:sess_1|run_1|career_turn|req_1");
    expect(evalCall[5]).toBe("nm:sidx:sess_1");
    expect(evalCall[6]).toBe("nm:ridx:sess_1:req_1");
    store.close();
  });

  it("transition 用 keyId 反推会话键，保证会话计数与记录在同一个脚本里改", async () => {
    active = await fakeRedis();
    active.reply = (args) => (args[0] === "EVAL" ? "$-1\r\n" : "+OK\r\n");
    const store = new RedisStateStore({ host: "127.0.0.1", port: active.port });
    await store.transition("sess_7|run_7|career_turn|req_7", { status: "succeeded" }, 900);
    const evalCall = active.commands.find((args) => args[0] === "EVAL")!;
    expect(evalCall[3]).toBe("nm:req:sess_7|run_7|career_turn|req_7");
    expect(evalCall[4]).toBe("nm:sess:sess_7");
    store.close();
  });
});
