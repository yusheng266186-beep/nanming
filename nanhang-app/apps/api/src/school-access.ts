// 学校成绩识别（荣县一中增强模式）：姓名 + 6 位验证码 → 只返回本人的那一份分片。
//
// 两种取分片的方式，按配置自动选：
//   1. 云端（推荐用于学生在家访问）：分片以密文放在对象存储里，对象名是 HMAC(密钥, 分片名)，
//      内容 AES-256-GCM 加密。密钥只在函数环境变量里——存储侧泄露也读不出人名与成绩，
//      六位码离线可穷举这件事因此不再等于「拿到目录就等于拿到全部学生」。
//   2. 本地（校内/开发）：直接读 data/quality-huixi/release/shards/ 下的明文分片。
// 限流：配了 Redis 就是共享计数（多实例下才有意义），没配就退回进程内计数（本地/单实例）。
import { createDecipheriv, createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isAbsolute, join, resolve, sep } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { RedisConnection } from "@nanhang/ai-gateway";
import { redisOptionsFromEnv } from "./config.ts";

export function schoolLookupKey(name: string, code: string): string {
  const normalized = name.normalize("NFKC").replace(/\s/g, "");
  const codeHash = createHash("sha256").update(code.normalize("NFKC").replace(/\s/g, "").toUpperCase()).digest("hex");
  return createHash("sha256")
    .update(`${normalized}\n${codeHash}`)
    .digest("hex");
}

/** 对象名规则：与 scripts/export_school_cloud.mjs 一致，函数侧据此从分片名推出对象名。 */
export function schoolObjectName(key: Buffer, shardFile: string): string {
  return createHmac("sha256", key).update(shardFile).digest("hex").slice(0, 40) + ".bin";
}

/** 密文格式：[12 字节 IV][密文][16 字节认证标签]。 */
export function decryptShard(key: Buffer, payload: Buffer): string {
  const decipher = createDecipheriv("aes-256-gcm", key, payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(payload.length - 16));
  return Buffer.concat([
    decipher.update(payload.subarray(12, payload.length - 16)),
    decipher.final()
  ]).toString("utf8");
}

/**
 * 本文件所在目录。云函数里 cwd 不一定是代码目录，所以相对路径一律相对这里解析——
 * 打包成 CJS 后 import.meta.url 是空的，退回 __dirname；两者都拿不到才用 cwd。
 */
function moduleDir(): string {
  try {
    return fileURLToPath(new URL(".", import.meta.url));
  } catch {
    return typeof __dirname === "string" ? __dirname : process.cwd();
  }
}

/** 相对路径按代码目录解析；绝对路径原样使用。 */
function locate(value: string): string {
  return isAbsolute(value) ? value : join(moduleDir(), value);
}

/**
 * 相对本文件的路径。打包成 CJS 后 import.meta.url 是空的，这时返回 null——
 * 调用方必须把它当成「这条路没配」而不是顺手抛一个 Invalid URL。
 */
function moduleRelative(relative: string): string | null {
  try {
    return fileURLToPath(new URL(relative, import.meta.url));
  } catch {
    return null;
  }
}

const IP_LIMIT = 120;
const NAME_LIMIT = 5;
const WINDOW_SECONDS = 15 * 60;

/** 一次往返里同时给 IP 与姓名计数；返回各自是否还在额度内。 */
const RATE_SCRIPT = `
local out = {}
for index = 1, #KEYS do
  local count = redis.call('INCR', KEYS[index])
  if count == 1 then redis.call('EXPIRE', KEYS[index], ARGV[1]) end
  out[index] = count
end
return out
`;

interface RateLimiter {
  hit(ip: string, nameKey: string): Promise<boolean>;
  close(): void;
}

function createRateLimiter(env: NodeJS.ProcessEnv): RateLimiter {
  const options = redisOptionsFromEnv(env);
  const memory = new Map<string, { count: number; until: number }>();
  const inProcessHit = (ip: string, nameKey: string): boolean => {
    const now = Date.now();
    for (const [key, value] of memory) if (value.until <= now) memory.delete(key);
    const ipBucket = memory.get(ip) ?? { count: 0, until: now + WINDOW_SECONDS * 1000 };
    const nameBucket = memory.get(nameKey) ?? { count: 0, until: now + WINDOW_SECONDS * 1000 };
    if (ipBucket.count >= IP_LIMIT || nameBucket.count >= NAME_LIMIT || memory.size >= 10000) return false;
    ipBucket.count += 1;
    nameBucket.count += 1;
    memory.set(ip, ipBucket);
    memory.set(nameKey, nameBucket);
    return true;
  };
  if (!options) return { hit: async (ip, nameKey) => inProcessHit(ip, nameKey), close: () => undefined };

  const connection = new RedisConnection(options);
  return {
    async hit(ip: string, nameKey: string): Promise<boolean> {
      try {
        const reply = await connection.eval(RATE_SCRIPT, [`nm:school:ip:${ip}`, nameKey], [String(WINDOW_SECONDS)]);
        if (!Array.isArray(reply)) return inProcessHit(ip, nameKey);
        const ipCount = Number(reply[0] ?? 0);
        const nameCount = Number(reply[1] ?? 0);
        return ipCount <= IP_LIMIT && nameCount <= NAME_LIMIT;
      } catch {
        // 共享计数不可用时退回进程内计数：宁可限流弱一点，也不要因为 Redis 抖动把学生挡在门外。
        return inProcessHit(ip, nameKey);
      }
    },
    close: () => connection.close()
  };
}

interface SchoolAccessOptions {
  readonly fetcher?: typeof fetch;
}

export function createSchoolAccess(env: NodeJS.ProcessEnv = process.env, options: SchoolAccessOptions = {}) {
  const limiter = createRateLimiter(env);
  const doFetch = options.fetcher ?? fetch;
  return async (
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> => {
    const send = (status: number, value: unknown) => {
      response.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      });
      response.end(JSON.stringify(value));
    };
    const ip = request.socket.remoteAddress ?? "unknown";
    const chunks: Buffer[] = [];
    let bytes = 0;
    try {
      for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > 1024) {
          send(413, { message: "输入过长。" });
          return;
        }
        chunks.push(buffer);
      }
      let body: { name?: unknown; code?: unknown } | null;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        send(400, { message: "请求格式不正确。" });
        return;
      }
      if (
        !body ||
        typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.length > 40 ||
        typeof body.code !== "string" ||
        !/^\d{6}$/.test(body.code.normalize("NFKC").replace(/\s/g, ""))
      ) {
        send(400, { message: "请填写姓名和六位数字查询码，身份证末位 X 请填 0。" });
        return;
      }
      // 姓名与 IP 分别计数：学校常共用一个出口 IP，只按 IP 限会让一个班互相拖累。
      const nameKey = `nm:school:name:${createHash("sha256")
        .update(body.name.normalize("NFKC").replace(/\s/g, ""))
        .digest("hex")}`;
      if (!(await limiter.hit(ip, nameKey))) {
        send(429, { message: "尝试次数过多，请 15 分钟后重试。" });
        return;
      }
      const cloudBase = (env.NANHANG_SCHOOL_CLOUD_BASE ?? "").trim().replace(/\/$/, "");
      const cloudKey = env.NANHANG_SCHOOL_KEY ? Buffer.from(env.NANHANG_SCHOOL_KEY, "base64") : null;
      const identityPath = (env.NANHANG_QUALITY_IDENTITY_FILE ?? "").trim();
      const releaseDir = (env.NANHANG_QUALITY_RELEASE_DIR ?? "").trim();
      const cloudReady = Boolean(cloudBase && cloudKey && cloudKey.length === 32);
      // 生产档必须显式配置，绝不隐式去读学校的本地目录。
      if (env.NANHANG_AI_PROFILE === "production" && !(cloudReady || (identityPath && releaseDir))) {
        send(503, { message: "学校成绩服务尚未配置，请联系老师或使用校外录入。" });
        return;
      }
      const indexPath = identityPath ? locate(identityPath) : moduleRelative("../../../../private/quality-identity.json");
      if (!indexPath) {
        send(503, { message: "学校成绩服务暂不可用，请稍后重试或联系老师。" });
        return;
      }
      const index = JSON.parse(readFileSync(indexPath, "utf8")) as { entries: Record<string, string> };
      const shard = index.entries[schoolLookupKey(body.name, body.code)];
      if (!shard || !/^[a-f0-9]{40}\.json$/.test(shard)) {
        send(401, { message: "姓名或验证码不匹配，请向老师核对。" });
        return;
      }
      let data: unknown;
      let summary: { exams: unknown[]; trend: unknown[] };
      if (cloudReady && cloudKey) {
        const objectUrl = `${cloudBase}/${schoolObjectName(cloudKey, shard)}`;
        const fetched = await doFetch(objectUrl, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
        if (!fetched.ok) {
          send(401, { message: "姓名或验证码不匹配，请向老师核对。" });
          return;
        }
        data = JSON.parse(decryptShard(cloudKey, Buffer.from(await fetched.arrayBuffer())));
        const indexResponse = await doFetch(`${cloudBase}/${schoolObjectName(cloudKey, "index.json")}`, {
          cache: "no-store", signal: AbortSignal.timeout(15_000)
        });
        if (!indexResponse.ok) throw new Error("SCHOOL_SUMMARY_UNAVAILABLE");
        summary = JSON.parse(decryptShard(cloudKey, Buffer.from(await indexResponse.arrayBuffer())));
      } else {
        const directory = releaseDir ? resolve(releaseDir) : moduleRelative("../../../data/quality-huixi/release");
        if (!directory) {
          send(503, { message: "学校成绩服务暂不可用，请稍后重试或联系老师。" });
          return;
        }
        const path = resolve(directory, "shards", shard);
        if (!path.startsWith(directory + sep)) {
          send(401, { message: "姓名或验证码不匹配，请向老师核对。" });
          return;
        }
        data = JSON.parse(readFileSync(path, "utf8"));
        summary = JSON.parse(readFileSync(resolve(directory, "index.json"), "utf8"));
      }
      if (!Array.isArray(summary.exams) || !Array.isArray(summary.trend)) throw new Error("SCHOOL_SUMMARY_INVALID");
      // 成功也占一个名额：知道一对有效凭据不能变成无限次探测。
      // 只回页面实际使用的匿名汇总，不带源文件路径、问题原值或其他班级明细。
      send(200, { shard: data, index: { exams: summary.exams, trend: summary.trend } });
    } catch (error) {
      // 不把细节发给学生，但要留在函数日志里：这里曾经把「身份索引读不到」吞成一个看不出原因的 503。
      console.error("school identify failed:", error instanceof Error ? (error.stack ?? error.message) : String(error));
      send(503, { message: "学校成绩服务暂不可用，请稍后重试或联系老师。" });
    }
  };
}
