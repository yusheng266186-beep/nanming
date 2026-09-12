// 把校内成绩发布物导出成「云端只放密文」的形态。
//
// 为什么这么做：6 位验证码不是安全边界（100 万种组合，秒级穷举），分片文件名又是
// sha256(验证码)[:40]——只要分片目录能被读到，全部学生的码和成绩就等于公开。而云端存储
// （对象存储）天然是一个「拿到 URL 就能下载」的地方，所以这里做两件事：
//   1. 对象名换成 HMAC(密钥, 分片名)：连「哪个文件对应哪个码」都不再从名字里泄露；
//   2. 内容用 AES-256-GCM 加密：密钥只在函数环境变量里，存储侧泄露也读不出人名与成绩。
// 密钥由本脚本生成一次并存在 private/（git 忽略），函数侧用同一个 base64 值。
//
// 用法：node scripts/export_school_cloud.mjs [--out data/quality-huixi/cloud]
import { createCipheriv, createHmac, randomBytes, createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..");
const SHARD_DIR = join(REPO, "data", "quality-huixi", "release", "shards");
const IDENTITY = join(REPO, "..", "private", "quality-identity.json");
const KEY_FILE = join(REPO, "..", "private", "school-cloud-key.txt");
const outIndex = process.argv.indexOf("--out");
const OUT = resolve(outIndex > -1 ? process.argv[outIndex + 1] : join(REPO, "data", "quality-huixi", "cloud"));

/** 密钥：没有就生成一次（base64，32 字节），只落在 private/。 */
function loadKey() {
  if (existsSync(KEY_FILE)) {
    const value = Buffer.from(readFileSync(KEY_FILE, "utf8").trim(), "base64");
    if (value.length !== 32) throw new Error(`${KEY_FILE} 不是 32 字节的 base64 密钥`);
    return value;
  }
  const value = randomBytes(32);
  writeFileSync(KEY_FILE, value.toString("base64") + "\n", { encoding: "utf8", mode: 0o600 });
  console.log(`已生成新密钥：${KEY_FILE}（不打印内容；函数环境变量 NANHANG_SCHOOL_KEY 用它）`);
  return value;
}

const objectName = (key, shardFile) =>
  createHmac("sha256", key).update(shardFile).digest("hex").slice(0, 40) + ".bin";

function encrypt(key, plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, body, cipher.getAuthTag()]);
}

const key = loadKey();
const identity = JSON.parse(readFileSync(IDENTITY, "utf8"));
const shardFiles = readdirSync(SHARD_DIR).filter((name) => name.endsWith(".json"));
mkdirSync(join(OUT, "objects"), { recursive: true });

let bytes = 0;
const objects = {};
// 章节版定位页需要的匿名考试汇总也走密文，核验后由 API 返回。
const sourceIndex = JSON.parse(readFileSync(join(SHARD_DIR, "..", "index.json"), "utf8"));
if (!Array.isArray(sourceIndex.exams) || !Array.isArray(sourceIndex.trend)) throw new Error("SCHOOL_SUMMARY_INVALID");
const summaryPayload = encrypt(key, Buffer.from(JSON.stringify({ exams: sourceIndex.exams, trend: sourceIndex.trend })));
const summaryObject = objectName(key, "index.json");
writeFileSync(join(OUT, "objects", summaryObject), summaryPayload);
bytes += summaryPayload.length;
for (const shardFile of shardFiles) {
  const plaintext = readFileSync(join(SHARD_DIR, shardFile));
  const payload = encrypt(key, plaintext);
  const name = objectName(key, shardFile);
  writeFileSync(join(OUT, "objects", name), payload);
  objects[shardFile] = { object: name, bytes: payload.length, sha256: createHash("sha256").update(payload).digest("hex") };
  bytes += payload.length;
}

const manifest = {
  element: "nanming-school-cloud",
  createdAt: new Date().toISOString(),
  cipher: "aes-256-gcm",
  objectNameRule: "hmac-sha256(server-key, shard-file)[:40] + .bin",
  keyLocation: "private/school-cloud-key.txt（不进仓库、不进对象存储）",
  identityEntries: Object.keys(identity.entries ?? {}).length,
  shards: shardFiles.length,
  summary: { object: summaryObject, bytes: summaryPayload.length, sha256: createHash("sha256").update(summaryPayload).digest("hex") },
  bytes,
  objects
};
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

// 一致性自检：随机抽 5 份解回来，确认与本地分片逐字节相同。
const { createDecipheriv } = await import("node:crypto");
let checked = 0;
for (const shardFile of shardFiles.slice(0, 5)) {
  const payload = readFileSync(join(OUT, "objects", objects[shardFile].object));
  const decipher = createDecipheriv("aes-256-gcm", key, payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(payload.length - 16));
  const plain = Buffer.concat([decipher.update(payload.subarray(12, payload.length - 16)), decipher.final()]);
  if (!plain.equals(readFileSync(join(SHARD_DIR, shardFile)))) throw new Error(`抽查失败：${shardFile}`);
  checked += 1;
}

console.log(
  `已导出 ${shardFiles.length} 份密文分片 → ${OUT}\n` +
  `  总大小 ${(bytes / 1024 / 1024).toFixed(1)} MB（原 ${(shardFiles.reduce((sum, f) => sum + readFileSync(join(SHARD_DIR, f)).length, 0) / 1024 / 1024).toFixed(1)} MB）\n` +
  `  身份索引条目 ${manifest.identityEntries}，抽查解密回读 ${checked} 份一致\n` +
  `  下一步：python scripts/deploy_school_cloud.py 上传到 school/objects/`
);
