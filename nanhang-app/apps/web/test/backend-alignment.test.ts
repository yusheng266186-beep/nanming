import { describe, expect, it } from "vitest";
import { beginTurn, runAiTurn } from "../src/ai-client.js";
import { applyOutcome, askAi, initialAiPanel } from "../src/ai-panel.js";
import { validateTurnRequest, withConfig } from "@nanhang/ai-gateway";
import { readFileSync } from "node:fs";

describe("章节版后端对齐", () => {
  const stamp = { runId: "align", inputRevision: 1 };
  it("过期会话重新露出访问码入口", () => {
    expect(applyOutcome({ ...initialAiPanel, connected: true, token: "expired", pending: true },
      { requestId: "expired", status: "error", reply: null, reason: "HTTP_401", options: [] }, 401))
      .toMatchObject({ connected: false, token: null, pending: false });
  });
  it("真实客户端的长发言、十二条原话与八条上下文能通过网关", async () => {
    const quote = "我想探索计算机专业。".repeat(100);
    let checked = false;
    const fetchImpl = (async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      expect(validateTurnRequest(body, withConfig()).ok).toBe(true);
      checked = true;
      return new Response("", { status: 503 });
    }) as typeof fetch;
    const result = await askAi({ ...initialAiPanel, enabled: true, token: "synthetic", pending: true },
      stamp, stamp, quote, "request", { fetchImpl },
      Array.from({ length: 8 }, () => ({ role: "user" as const, text: quote })),
      Array.from({ length: 12 }, (_, i) => ({ evidenceId: `ev-${i}`, kind: "student_self_report", quote })),
      [{ id: "catalog:计算机类", name: "计算机类" }]);
    expect(checked).toBe(true);
    expect(result.pending).toBe(false);
  });
  it("断网返回可收尾结果，不抛异常让聊天永久等待", async () => {
    const result = await runAiTurn({ baseUrl: "https://example.test", token: "synthetic",
      fetchImpl: async () => { throw new TypeError("network down"); } }, beginTurn(stamp, "req"), stamp,
      { runId: stamp.runId, requestId: "req", inputRevision: 1, userText: "你好", context: [] });
    expect(result.outcome).toMatchObject({ status: "error", reason: "NETWORK_ERROR" });
  });
  it("当前入口不再依赖 Pages 不存在的静态成绩目录", () => {
    const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    expect(app).not.toContain("loadQualityIndex");
    expect(app).toContain("const index = body.index");
  });
});
