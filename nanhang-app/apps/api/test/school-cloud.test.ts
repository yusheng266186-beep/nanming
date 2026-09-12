// 云端成绩分片：存储侧只有密文，密钥在函数环境变量里。
// 这里验证三件事：能取到并解出本人分片、密文被改过就拒绝、云端配置优先于本地目录。
import { afterEach, describe, expect, it } from "vitest";
import { createCipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { createSchoolAccess, schoolLookupKey, schoolObjectName, decryptShard } from "../src/school-access.ts";

const servers: Server[] = [];
const folders: string[] = [];
afterEach(async () => {
  for (const server of servers.splice(0))
    await new Promise<void>((resolve) => server.close(() => resolve()));
  for (const path of folders.splice(0)) rmSync(path, { recursive: true, force: true });
});

async function host(config: NodeJS.ProcessEnv, fetcher?: typeof fetch) {
  const server = createServer(createSchoolAccess(config, fetcher ? { fetcher } : {}));
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

const post = (url: string, name: string, code: string) =>
  fetch(url, { method: "POST", body: JSON.stringify({ name, code }) });

function encrypt(key: Buffer, plaintext: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, body, cipher.getAuthTag()]);
}

/** 造一套「云上只有密文」的假环境：本地只放身份索引，分片内容全在内存里。 */
function cloudFixture(key: Buffer) {
  const root = mkdtempSync(join(tmpdir(), "nanming-school-cloud-"));
  folders.push(root);
  const name = "合成甲";
  const code = "123456";
  const shardFile = createHash("sha256").update(code).digest("hex").slice(0, 40) + ".json";
  writeFileSync(join(root, "quality-identity.json"), JSON.stringify({
    version: 1, entries: { [schoolLookupKey(name, code)]: shardFile }
  }));
  const shard = { element: "nanming-quality-huixi-student", person: { name }, exams: [] };
  const object = schoolObjectName(key, shardFile);
  const objects = new Map<string, Buffer>([[object, encrypt(key, Buffer.from(JSON.stringify(shard)))]]);
  objects.set(schoolObjectName(key, "index.json"), encrypt(key, Buffer.from(JSON.stringify({
    exams: [], trend: [], sourceWorkbook: "must-not-leak", issues: [{ raw_value: "must-not-leak" }]
  }))));
  return { root, name, code, shardFile, object, objects };
}

describe("云端密文分片", () => {
  it("汇总密文缺失时明确503，不交付一个无法完成定位的成功响应", async () => {
    const key = randomBytes(32);
    const fixture = cloudFixture(key);
    fixture.objects.delete(schoolObjectName(key, "index.json"));
    const fetcher = (async (url: unknown) => {
      const payload = fixture.objects.get(String(url).split("/").pop() ?? "");
      return payload ? new Response(payload) : new Response("missing", { status: 404 });
    }) as typeof fetch;
    const base = await host({ NANHANG_AI_PROFILE: "production",
      NANHANG_QUALITY_IDENTITY_FILE: join(fixture.root, "quality-identity.json"),
      NANHANG_SCHOOL_CLOUD_BASE: "https://example.test/objects", NANHANG_SCHOOL_KEY: key.toString("base64") }, fetcher);
    expect((await post(base, fixture.name, fixture.code)).status).toBe(503);
  });
  it("对象名由密钥派生，同样输入稳定、不同密钥不同", () => {
    const key = randomBytes(32);
    const other = randomBytes(32);
    const shard = "a".repeat(40) + ".json";
    expect(schoolObjectName(key, shard)).toBe(schoolObjectName(key, shard));
    expect(schoolObjectName(key, shard)).not.toBe(schoolObjectName(other, shard));
    expect(schoolObjectName(key, shard)).toMatch(/^[a-f0-9]{40}\.bin$/);
  });

  it("解出本人分片，且对象名里看不出验证码", async () => {
    const key = randomBytes(32);
    const fixture = cloudFixture(key);
    const calls: string[] = [];
    const fetcher = (async (input: unknown) => {
      const url = String(input);
      calls.push(url);
      const body = fixture.objects.get(url.split("/").pop() ?? "");
      return body ? new Response(body, { status: 200 }) : new Response("nope", { status: 404 });
    }) as unknown as typeof fetch;

    const base = await host({
      NANHANG_AI_PROFILE: "production",
      NANHANG_QUALITY_IDENTITY_FILE: join(fixture.root, "quality-identity.json"),
      NANHANG_SCHOOL_CLOUD_BASE: "https://example.cos.ap-chengdu.myqcloud.com/school/objects",
      NANHANG_SCHOOL_KEY: key.toString("base64")
    }, fetcher);

    const ok = await post(base, fixture.name, fixture.code);
    expect(ok.status).toBe(200);
    const body = await ok.json() as { shard: { person: { name: string } }; index: unknown };
    expect(body.shard.person.name).toBe(fixture.name);
    expect(body.index).toEqual({ exams: [], trend: [] });
    expect(JSON.stringify(body)).not.toContain("must-not-leak");
    // 取的是 HMAC 对象名，URL 里不出现 sha256(验证码) 那个文件名
    expect(calls[0]).toContain(fixture.object);
    expect(calls[0]).not.toContain(fixture.shardFile);
  });

  it("密文被改过一个字节就拒绝（GCM 认证失败），不会把坏数据发给学生", async () => {
    const key = randomBytes(32);
    const fixture = cloudFixture(key);
    const tampered = (async () => {
      const body = Buffer.from(fixture.objects.values().next().value as Buffer);
      body[20] = body[20]! ^ 0xff;
      return new Response(body, { status: 200 });
    }) as unknown as typeof fetch;
    const base = await host({
      NANHANG_AI_PROFILE: "production",
      NANHANG_QUALITY_IDENTITY_FILE: join(fixture.root, "quality-identity.json"),
      NANHANG_SCHOOL_CLOUD_BASE: "https://example.cos.ap-chengdu.myqcloud.com/school/objects",
      NANHANG_SCHOOL_KEY: key.toString("base64")
    }, tampered);
    expect((await post(base, fixture.name, fixture.code)).status).toBe(503);
  });

  it("配了云端就不再读本地分片目录：本地那份明文即使存在也不生效", async () => {
    const key = randomBytes(32);
    const fixture = cloudFixture(key);
    const localRelease = join(fixture.root, "release");
    mkdirSync(join(localRelease, "shards"), { recursive: true });
    writeFileSync(join(localRelease, "shards", fixture.shardFile),
      JSON.stringify({ person: { name: "本地明文" }, exams: [] }));
    const failing = (async () => new Response("nope", { status: 404 })) as unknown as typeof fetch;
    const base = await host({
      NANHANG_AI_PROFILE: "production",
      NANHANG_QUALITY_IDENTITY_FILE: join(fixture.root, "quality-identity.json"),
      NANHANG_QUALITY_RELEASE_DIR: localRelease,
      NANHANG_SCHOOL_CLOUD_BASE: "https://example.cos.ap-chengdu.myqcloud.com/school/objects",
      NANHANG_SCHOOL_KEY: key.toString("base64")
    }, failing);
    // 云端取不到就是 401，绝不能悄悄回落到本地明文
    expect((await post(base, fixture.name, fixture.code)).status).toBe(401);
  });

  it("密钥长度不对时按「未配置云端」处理，生产档直接 503", async () => {
    const fixture = cloudFixture(randomBytes(32));
    const base = await host({
      NANHANG_AI_PROFILE: "production",
      NANHANG_QUALITY_IDENTITY_FILE: join(fixture.root, "quality-identity.json"),
      NANHANG_SCHOOL_CLOUD_BASE: "https://example.cos.ap-chengdu.myqcloud.com/school/objects",
      NANHANG_SCHOOL_KEY: Buffer.from("too short").toString("base64")
    });
    expect((await post(base, fixture.name, fixture.code)).status).toBe(503);
  });

  it("decryptShard 对短密文不抛未捕获异常（由调用方统一转 503）", () => {
    expect(() => decryptShard(randomBytes(32), Buffer.alloc(4))).toThrow();
  });
});
