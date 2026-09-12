// 取码脚本与服务端必须是同一套算法：口径一旦分叉，老师手机上显示的码到达服务端就会被拒。
//
// 脚本 `scripts/totp_code.mjs` 是给负责人/老师现场取码用的（每人、每个 30 秒窗口一个）；
// 服务端 `apps/api/src/server.ts` 负责校验，并额外接受前后各一个窗口以容忍时钟偏差。
// 这里用同一份密文逐窗口比对两边结果，并钉住「窗口容差」这一条行为。
import { describe, expect, it } from "vitest";
// @ts-expect-error 脚本是 .mjs，没有类型声明；这里只做算法一致性比对。
import { base32Decode, secondsLeft, totpCode as scriptCode } from "../../../scripts/totp_code.mjs";
import { matchingTotpCounter, totpCode as serverCode } from "../src/server.js";

/** 仅用于测试的密文（base32 合法字符表内，非任何真实密钥）。 */
const SECRET = "JBSWY3DPEHPK3PXP"; // 经典 RFC 6238 文档用示例串
const env = { NANHANG_TOTP_SECRET: SECRET } as NodeJS.ProcessEnv;

describe("动态码：脚本与服务端同源", () => {
  it("同一密文、同一窗口，两边算出的六位码完全一致", () => {
    for (const counter of [0, 1, 2, 12345678, 42424242]) {
      expect(scriptCode(SECRET, counter)).toBe(serverCode(SECRET, counter));
    }
  });

  it("都是六位数字", () => {
    for (const counter of [0, 7, 999999]) {
      expect(scriptCode(SECRET, counter)).toMatch(/^\d{6}$/);
    }
  });

  it("窗口容差：服务端接受当前窗口的码，也接受前后各一个；再远就拒", () => {
    const now = 1_700_000_000_000; // 固定时刻，避免测试随时钟变化
    const current = Math.floor(now / 30_000);
    const at = (counter: number) => counter * 30_000 + 15_000; // 该窗口的中间时刻

    expect(matchingTotpCounter(scriptCode(SECRET, current)!, env, at(current))).toBe(current);
    expect(matchingTotpCounter(scriptCode(SECRET, current - 1)!, env, at(current))).toBe(current - 1);
    expect(matchingTotpCounter(scriptCode(SECRET, current + 1)!, env, at(current))).toBe(current + 1);
    // 相隔两个窗口（60 秒前 / 后）应当无效。
    expect(matchingTotpCounter(scriptCode(SECRET, current - 2)!, env, at(current))).toBeNull();
    expect(matchingTotpCounter(scriptCode(SECRET, current + 2)!, env, at(current))).toBeNull();
  });

  it("非法输入一律不猜：非六位、非数字、密文非法或缺失都返回空", () => {
    expect(matchingTotpCounter("12345", env)).toBeNull();
    expect(matchingTotpCounter("12a456", env)).toBeNull();
    expect(matchingTotpCounter("123456", {} as NodeJS.ProcessEnv)).toBeNull();
    expect(matchingTotpCounter("123456", { NANHANG_TOTP_SECRET: "not-base32-!" } as NodeJS.ProcessEnv)).toBeNull();
    expect(base32Decode("not-base32-!")).toBeNull();
    expect(base32Decode("")).toBeNull();
  });

  it("脚本还会提示本窗口还剩几秒（现场发放要知道快到期了）", () => {
    expect(secondsLeft(0)).toBe(30);
    expect(secondsLeft(29_000)).toBe(1);
    expect(secondsLeft(30_000)).toBe(30);
  });
});
