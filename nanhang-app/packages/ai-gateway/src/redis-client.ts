// TASK-08: 极小的 RESP 客户端。
//
// 只为了把会话状态放进共享存储：AUTH + 普通命令 + EVAL（Lua 脚本）三种能力，
// 不引入第三方依赖，免得把一个新的运行时依赖带进云函数的打包体积与供应链里。
// 一次连接里命令串行执行；连接断了下一次命令会重连（云函数实例长时间空闲后
// 平台会掐掉空闲连接，重连必须是常态而不是异常）。
import { createConnection, type Socket } from "node:net";

export type RedisValue = string | number | null | RedisValue[];

export interface RedisOptions {
  readonly host: string;
  readonly port: number;
  readonly password?: string;
  readonly connectTimeoutMs?: number;
  readonly commandTimeoutMs?: number;
}

export class RedisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedisError";
  }
}

/** 把 RESP 回复编码成命令数组（只有字符串与数字，够用）。 */
function encode(args: readonly (string | number)[]): Buffer {
  const parts: string[] = [`*${args.length}\r\n`];
  for (const arg of args) {
    const text = String(arg);
    parts.push(`$${Buffer.byteLength(text)}\r\n${text}\r\n`);
  }
  return Buffer.from(parts.join(""), "utf8");
}

interface Pending {
  resolve(value: RedisValue): void;
  reject(error: Error): void;
  timer: NodeJS.Timeout;
}

export class RedisConnection {
  private socket: Socket | null = null;
  private buffer = Buffer.alloc(0);
  private queue: Pending[] = [];
  private connecting: Promise<void> | null = null;
  private closed = false;

  constructor(private readonly options: RedisOptions) {}

  // 冷连接要算上 DNS 解析：实测首次解析加握手可以到 0.5 秒，2 秒的预算会被 DNS 吃光
  // （换来一次「存储不可用」，AI 就被关掉了）。连上之后同一条连接的命令只要十几毫秒。
  private get commandTimeoutMs(): number { return this.options.commandTimeoutMs ?? 5000; }
  private get connectTimeoutMs(): number { return this.options.connectTimeoutMs ?? 5000; }

  /** 建立连接（需要时 AUTH）。并发调用共享同一次连接过程。 */
  private ensureConnected(): Promise<void> {
    if (this.closed) return Promise.reject(new RedisError("connection is closed"));
    if (this.socket && !this.socket.destroyed) return Promise.resolve();
    if (this.connecting) return this.connecting;
    this.connecting = new Promise<void>((resolve, reject) => {
      const socket = createConnection({ host: this.options.host, port: this.options.port });
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new RedisError("redis connect timed out"));
      }, this.connectTimeoutMs);
      const fail = (error: Error) => {
        clearTimeout(timer);
        this.socket = null;
        this.connecting = null;
        reject(error);
      };
      socket.once("error", fail);
      socket.once("connect", () => {
        clearTimeout(timer);
        socket.off("error", fail);
        socket.on("error", () => { this.abort(new RedisError("redis connection error")); });
        socket.on("close", () => { this.abort(new RedisError("redis connection closed")); });
        socket.on("data", (chunk: Buffer) => { this.onData(chunk); });
        this.socket = socket;
        this.connecting = null;
        if (this.options.password) {
          this.enqueue(["AUTH", this.options.password]).then(() => resolve(), reject);
        } else {
          resolve();
        }
      });
    });
    return this.connecting;
  }

  /** 连接断开：正在等待的命令全部失败，下一次命令会重连。 */
  private abort(error: Error): void {
    const pending = this.queue;
    this.queue = [];
    for (const item of pending) {
      clearTimeout(item.timer);
      item.reject(error);
    }
    this.socket = null;
    this.connecting = null;
    this.buffer = Buffer.alloc(0);
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      const parsed = parseReply(this.buffer, 0);
      if (!parsed) return;
      this.buffer = this.buffer.subarray(parsed.consumed);
      const item = this.queue.shift();
      if (!item) return;
      clearTimeout(item.timer);
      if (parsed.error) item.reject(new RedisError(parsed.error));
      else item.resolve(parsed.value);
    }
  }

  private enqueue(args: readonly (string | number)[]): Promise<RedisValue> {
    return new Promise<RedisValue>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.queue = this.queue.filter((item) => item.timer !== timer);
        reject(new RedisError(`redis command timed out: ${String(args[0])}`));
      }, this.commandTimeoutMs);
      this.queue.push({ resolve, reject, timer });
      const socket = this.socket;
      if (!socket || socket.destroyed) {
        reject(new RedisError("redis is not connected"));
        return;
      }
      socket.write(encode(args));
    });
  }

  async command(args: readonly (string | number)[]): Promise<RedisValue> {
    await this.ensureConnected();
    return await this.enqueue(args);
  }

  async eval(script: string, keys: readonly string[], argv: readonly (string | number)[]): Promise<RedisValue> {
    return await this.command(["EVAL", script, String(keys.length), ...keys, ...argv]);
  }

  /**
   * 探活：连不上或超时都当作不可用，不抛给调用方。
   * 只丢掉当前这条连接（下次命令自动重连），不把客户端本身标记为关闭——
   * 否则一次网络抖动就会让这个函数实例永久失去共享存储。
   */
  async ping(): Promise<boolean> {
    try {
      await this.command(["PING"]);
      return true;
    } catch {
      this.abort(new RedisError("redis ping failed"));
      this.socket?.destroy();
      this.socket = null;
      return false;
    }
  }

  close(): void {
    this.closed = true;
    this.abort(new RedisError("connection closed by client"));
    this.socket?.destroy();
    this.socket = null;
  }
}

interface ParsedReply {
  readonly value: RedisValue;
  readonly consumed: number;
}

/**
 * 解析一条完整回复；数据不完整时返回 null（调用方继续等）。
 * 支持 RESP2 的 +simple / -error / :int / $bulk / *array。
 */
export function parseReply(buffer: Buffer, offset: number): (ParsedReply & { error?: string }) | null {
  if (offset >= buffer.length) return null;
  const marker = String.fromCharCode(buffer[offset]!);
  const lineEnd = buffer.indexOf("\r\n", offset, "utf8");
  if (lineEnd === -1) return null;
  const line = buffer.toString("utf8", offset + 1, lineEnd);
  const next = lineEnd + 2;
  switch (marker) {
    case "+":
      return { value: line, consumed: next - offset };
    case "-":
      return { value: null, consumed: next - offset, error: line };
    case ":":
      return { value: Number(line), consumed: next - offset };
    case "$": {
      const length = Number(line);
      if (length === -1) return { value: null, consumed: next - offset };
      if (buffer.length < next + length + 2) return null;
      const text = buffer.toString("utf8", next, next + length);
      return { value: text, consumed: next + length + 2 - offset };
    }
    case "*": {
      const count = Number(line);
      if (count === -1) return { value: null, consumed: next - offset };
      const items: RedisValue[] = [];
      let cursor = next;
      for (let index = 0; index < count; index += 1) {
        const item = parseReply(buffer, cursor);
        if (!item) return null;
        if (item.error) return { value: null, consumed: item.consumed, error: item.error };
        items.push(item.value);
        cursor += item.consumed;
      }
      return { value: items, consumed: cursor - offset };
    }
    default:
      return { value: null, consumed: next - offset, error: `unknown reply marker ${marker}` };
  }
}
