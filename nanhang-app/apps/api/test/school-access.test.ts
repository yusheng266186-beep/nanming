import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { createSchoolAccess, schoolLookupKey } from "../src/school-access.ts";

const servers: Server[] = [];
const folders: string[] = [];
afterEach(async () => {
  for (const server of servers.splice(0))
    await new Promise<void>((r) => server.close(() => r()));
  for (const path of folders.splice(0))
    rmSync(path, { recursive: true, force: true });
});
async function host(config: NodeJS.ProcessEnv) {
  const server = createServer(createSchoolAccess(config));
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
const post = (url: string, name: string, code: string) =>
  fetch(url, { method: "POST", body: JSON.stringify({ name, code }) });
describe("姓名与验证码必须同时核对", () => {
  it("姓名标准化且验证码改变会得到不同身份键", () => {
    expect(schoolLookupKey(" 测 试甲 ", "123456")).toBe(
      schoolLookupKey("测试甲", "123456"),
    );
    expect(schoolLookupKey("测试甲", "123456")).not.toBe(
      schoolLookupKey("测试乙", "123456"),
    );
  });
  it("生产未配置私有文件时返回不可用，不探测本地目录", async () => {
    const base = await host({ NANHANG_AI_PROFILE: "production" });
    expect((await post(base, "合成甲", "123456")).status).toBe(503);
  });
  it("正确二元组只返回本人，错名与错码返回相同错误，连续请求会限流", async () => {
    const root = mkdtempSync(join(tmpdir(), "nanming-identity-test-"));
    folders.push(root);
    mkdirSync(join(root, "shards"));
    writeFileSync(join(root, "index.json"), JSON.stringify({ exams: [], trend: [], sourceWorkbook: "private-source" }));
    const shard = "a".repeat(40) + ".json";
    writeFileSync(
      join(root, "shards", shard),
      JSON.stringify({ person: { name: "合成匿名甲" }, exams: [] }),
    );
    const identity = join(root, "identity.json");
    writeFileSync(
      identity,
      JSON.stringify({
        entries: { [schoolLookupKey("合成甲", "123456")]: shard },
      }),
    );
    const base = await host({
      NANHANG_QUALITY_IDENTITY_FILE: identity,
      NANHANG_QUALITY_RELEASE_DIR: root,
    });
    const a = await post(base, "合成乙", "123456"),
      b = await post(base, "合成甲", "999999");
    expect(a.status).toBe(401);
    expect(await a.json()).toEqual(await b.json());
    const success = await post(base, "合成甲", "123456");
    expect(success.status).toBe(200);
    expect(success.headers.get("cache-control")).toBe("no-store");
    expect(await success.json()).toMatchObject({
      shard: { person: { name: "合成匿名甲" } },
    });
    await post(base, "合成甲", "999999");
    await post(base, "合成甲", "999999");
    await post(base, "合成甲", "999999");
    expect((await post(base, "合成甲", "123456")).status).toBe(429);
  });
});
