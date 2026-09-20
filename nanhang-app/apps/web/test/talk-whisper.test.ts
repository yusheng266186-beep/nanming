// 低语的实时进度：句子随真实等待秒数推进，不再三句一轮地循环。
import { describe, expect, it } from "vitest";
import { whisperLine } from "../src/chapters/talk.js";

describe("等待低语 = 实时进度", () => {
  it("刚发出的头几秒说的是「在读你刚写的那句」", () => {
    expect(whisperLine(0, "deep")).toContain("刚写的那句");
    expect(whisperLine(2, "speed")).toContain("刚写的那句");
  });

  it("随着秒数推进换阶段，并且句子里带真实秒数", () => {
    const early = whisperLine(5, "deep");
    const middle = whisperLine(25, "deep");
    const late = whisperLine(60, "deep");
    expect(early).toContain("5 秒");
    expect(middle).toContain("25 秒");
    expect(late).toContain("60 秒");
    expect(new Set([early, middle, late]).size).toBe(3);
  });

  it("同一个秒数只对应一句话，快档比深档更早进入「比平时慢」", () => {
    expect(whisperLine(9, "speed")).toBe(whisperLine(9, "speed"));
    expect(whisperLine(12, "speed")).toContain("比平时慢");
    expect(whisperLine(12, "deep")).not.toContain("比平时慢");
  });

  it("低语不夹带分数、概率或录取判断（「不猜分数」这类否定说法不算）", () => {
    for (const tier of ["deep", "standard", "speed"] as const) {
      for (const seconds of [0, 4, 9, 19, 34, 90]) {
        const line = whisperLine(seconds, tier).replace(/不猜分数/g, "");
        expect(line).not.toMatch(/概率|冲稳保|录取|分数/);
      }
    }
  });
});
