import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

export function schoolLookupKey(name: string, code: string): string {
  const normalized = name.normalize("NFKC").replace(/\s/g, "");
  const codeHash = createHash("sha256").update(code).digest("hex");
  return createHash("sha256").update(`${normalized}\n${codeHash}`).digest("hex");
}

/** Per-instance limit; production requires shared limiting and privately mounted files. */
export function createSchoolAccess(env: NodeJS.ProcessEnv = process.env) {
  const attempts = new Map<string, { count: number; until: number }>();
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const send = (status: number, value: unknown) => {
      response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      response.end(JSON.stringify(value));
    };
    const now = Date.now();
    for (const [key,value] of attempts) if (value.until <= now) attempts.delete(key);
    const ip = request.socket.remoteAddress ?? "unknown";
    const bucket = attempts.get(ip) ?? { count: 0, until: now + 15 * 60_000 };
    if (bucket.count >= 5 || attempts.size >= 10000) { send(429, { message: "尝试次数过多，请 15 分钟后重试。" }); return; }
    bucket.count++; attempts.set(ip,bucket);
    let content = "";
    try {
      for await (const chunk of request) {
        content += String(chunk);
        if (Buffer.byteLength(content) > 1024) { send(413, {message:"输入过长。"}); return; }
      }
      const body = JSON.parse(content) as { name?: unknown; code?: unknown };
      if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 40 || typeof body.code !== "string" || !/^\d{6}$/.test(body.code)) {
        send(400, { message: "请填写姓名和六位数字验证码。" }); return;
      }
      // Never implicitly expose the school's local files in a cloud production configuration.
      if (env.NANHANG_AI_PROFILE === "production" && (!env.NANHANG_QUALITY_IDENTITY_FILE || !env.NANHANG_QUALITY_RELEASE_DIR)) {
        send(503, { message: "学校成绩服务尚未配置，请联系老师或使用校外录入。" }); return;
      }
      const indexPath = env.NANHANG_QUALITY_IDENTITY_FILE ?? resolve("../private/quality-identity.json");
      const directory = resolve(env.NANHANG_QUALITY_RELEASE_DIR ?? "data/quality-huixi/release");
      const index = JSON.parse(readFileSync(indexPath,"utf8")) as { entries: Record<string,string> };
      const shard = index.entries[schoolLookupKey(body.name, body.code)];
      if (!shard || !/^[a-f0-9]{40}\.json$/.test(shard)) { send(401, {message:"姓名或验证码不匹配，请向老师核对。"}); return; }
      const path = resolve(directory,"shards",shard);
      if (!path.startsWith(directory+sep)) { send(401,{message:"姓名或验证码不匹配，请向老师核对。"}); return; }
      const data = JSON.parse(readFileSync(path,"utf8"));
      // Success also consumes a slot: knowing one valid pair must not allow limitless probes.
      send(200, { shard: data });
    } catch {
      send(503, { message: "学校成绩服务暂不可用，请稍后重试或联系老师。" });
    }
  };
}
