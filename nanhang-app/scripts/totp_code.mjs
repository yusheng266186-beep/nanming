#!/usr/bin/env node
/**
 * 打印当前的 6 位动态码（TOTP，RFC 6238：Base32 密文 + SHA-1 + 30 秒 + 6 位）。
 *
 * 用途：课堂或本机实测时，负责人/老师据此把码发给学生（每人、每个 30 秒窗口一个，一次性）。
 * 参数与服务端严格一致（`apps/api/src/server.ts` 的 `totpCode`），并且接受前后一个窗口的是**服务端**；
 * 本脚本只打印当前窗口的码。两边一致性由 `apps/api/test/totp-code.test.ts` 钉住，避免各写一份悄悄跑偏。
 *
 * 用法（在工作区任意位置）：
 *   NANHANG_TOTP_SECRET=<base32 密文> node nanhang-app/scripts/totp_code.mjs
 *   NANHANG_TOTP_SECRET=<base32 密文> node nanhang-app/scripts/totp_code.mjs --watch   # 每 30 秒自动刷新
 *
 * 不写任何密文到磁盘：密文只从环境变量读，脚本本身不含密钥。
 */
import { createHmac } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Base32 解码（去掉空白、连字符与补位 =；非法字符返回 null，而不是猜）。 */
export function base32Decode(secret) {
  const cleaned = String(secret ?? "").toUpperCase().replace(/[\s-]/g, "").replace(/=+$/, "");
  if (!cleaned) return null;
  let bits = 0;
  let length = 0;
  const out = [];
  for (const char of cleaned) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) return null;
    bits = (bits << 5) | index;
    length += 5;
    if (length >= 8) {
      out.push((bits >>> (length - 8)) & 0xff);
      length -= 8;
    }
  }
  return out.length ? Buffer.from(out) : null;
}

/** 第 counter 个 30 秒窗口的 6 位码；密文非法时返回 null。 */
export function totpCode(secret, counter) {
  const key = base32Decode(secret);
  if (!key) return null;
  const message = Buffer.alloc(8);
  message.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  message.writeUInt32BE(counter % 2 ** 32, 4);
  const digest = createHmac("sha1", key).update(message).digest();
  const offset = digest[19] & 0x0f;
  const number = ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16)
    | (digest[offset + 2] << 8) | digest[offset + 3];
  return String(number % 1_000_000).padStart(6, "0");
}

/** 当前窗口还剩几秒（用来提示「快到期了」）。 */
export function secondsLeft(now = Date.now()) {
  return 30 - Math.floor((now % 30_000) / 1000);
}

function printOnce() {
  const secret = (process.env.NANHANG_TOTP_SECRET ?? "").trim();
  if (!secret) {
    console.error("缺少 NANHANG_TOTP_SECRET：先把它放到环境变量里（与云端函数同一份密文）。");
    process.exitCode = 1;
    return false;
  }
  const code = totpCode(secret, Math.floor(Date.now() / 30_000));
  if (!code) {
    console.error("NANHANG_TOTP_SECRET 不是合法的 Base32 密文（只允许 A–Z 与 2–7）。");
    process.exitCode = 1;
    return false;
  }
  console.log(`${code}   （本窗口还剩 ${secondsLeft()} 秒；服务端另接受前后各一个窗口）`);
  return true;
}

// 只有被直接运行时才打印，便于测试里 import 这两个函数。
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href) {
  if (process.argv.includes("--watch")) {
    if (printOnce()) setInterval(printOnce, 1000 * (secondsLeft() % 30 || 30));
  } else {
    printOnce();
  }
}
