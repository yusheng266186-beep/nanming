import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const app = readFileSync(resolve(import.meta.dirname, "../src/App.tsx"), "utf8");
const talk = readFileSync(resolve(import.meta.dirname, "../src/chapters/talk.tsx"), "utf8");

describe("谈心 TOTP 动态码入口", () => {
  it("输入只保留六位数字并启用一次性验证码语义", () => {
    expect(talk).toContain('inputMode="numeric"');
    expect(talk).toContain('autoComplete="one-time-code"');
    expect(talk).toContain('maxLength={6}');
    expect(talk).toContain('pattern="[0-9]{6}"');
    expect(talk).toContain('replace(/\\D/g, "").slice(0, 6)');
    expect(talk).toContain("每 30 秒更新且只能使用一次");
  });

  it("区分过期或错误与服务端已消费的动态码", () => {
    expect(app).toContain('detail?.error?.code === "TOTP_REPLAYED"');
    expect(app).toContain("这个动态码已经使用过");
    expect(app).toContain("动态码无效或已过期");
  });
});
