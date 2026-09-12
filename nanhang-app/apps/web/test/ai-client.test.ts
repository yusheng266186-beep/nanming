import { describe, expect, it } from "vitest";
import { acceptEvent, beginTurn, evidenceForRequest, parseFrames, responseMatchesActiveRun, runAiTurn, toWireBody } from "../src/ai-client.js";

const active = { runId: "run-new", inputRevision: 2 };

describe("A47 旧运行的结果不能污染当前航线图", () => {
  it("运行或修订不一致时判定为不匹配", () => {
    expect(responseMatchesActiveRun({ runId: "run-new", runRevision: 2 }, active)).toBe(true);
    expect(responseMatchesActiveRun({ runId: "run-old", runRevision: 2 }, active)).toBe(false);
    expect(responseMatchesActiveRun({ runId: "run-new", runRevision: 1 }, active)).toBe(false);
  });

  it("旧run的complete事件被拒绝且不产生回复", () => {
    const pending = beginTurn({ runId: "run-old", inputRevision: 1 }, "req-old");
    const result = acceptEvent(pending, active, { event: "complete",
      data: { request_id: "req-old", seq: 3, output: { reply: "旧结果" } } });
    expect(result?.status).toBe("rejected");
    expect(result?.reply).toBeNull();
    expect(result?.reason).toBe("STALE_RUN_RESPONSE");
  });

  it("当前run的complete事件被采纳", () => {
    const pending = beginTurn(active, "req-new");
    const result = acceptEvent(pending, active, { event: "complete",
      data: { request_id: "req-new", seq: 3, output: { reply: "新结果" } } });
    expect(result?.status).toBe("applied");
    expect(result?.reply).toBe("新结果");
  });

  it("delta事件不产生可应用结果，只有complete才落地", () => {
    const pending = beginTurn(active, "req-new");
    expect(acceptEvent(pending, active, { event: "delta", data: { text: "半句" } })).toBeNull();
    expect(acceptEvent(pending, active, { event: "start", data: {} })).toBeNull();
  });

  it("OUTPUT_REJECTED 归为降级而不是普通错误", () => {
    const pending = beginTurn(active, "req-new");
    const degraded = acceptEvent(pending, active, { event: "error",
      data: { error: { code: "OUTPUT_REJECTED", message: "reply contains markup" } } });
    expect(degraded?.status).toBe("degraded");
    const failed = acceptEvent(pending, active, { event: "error",
      data: { error: { code: "UPSTREAM_TIMEOUT", message: "timeout" } } });
    expect(failed?.status).toBe("error");
  });
});

describe("AI客户端", () => {
  it("缺少凭证时不发起请求", async () => {
    let called = false;
    const result = await runAiTurn({ baseUrl: "http://localhost", token: null, fetchImpl: (async () => { called = true; return new Response(); }) as typeof fetch },
      beginTurn(active, "req"), active, { runId: "run-new", requestId: "req", inputRevision: 2, userText: "你好", context: [] });
    expect(called).toBe(false);
    expect(result.httpStatus).toBe(401);
    expect(result.outcome.reason).toBe("NOT_AUTHENTICATED");
  });

  it("解析SSE并在同一run下采纳回复", async () => {
    const body = [
      'event: start\ndata: {"request_id":"req","seq":1}\n\n',
      'event: delta\ndata: {"request_id":"req","seq":2,"text":"你好"}\n\n',
      'event: complete\ndata: {"request_id":"req","seq":3,"output":{"reply":"你好，我们可以从具体经历开始。"}}\n\n'
    ].join("");
    const result = await runAiTurn({ baseUrl: "http://localhost", token: "t",
      fetchImpl: (async () => new Response(body, { status: 200 })) as typeof fetch },
      beginTurn(active, "req"), active, { runId: "run-new", requestId: "req", inputRevision: 2, userText: "你好", context: [] });
    expect(result.httpStatus).toBe(200);
    expect(result.outcome.status).toBe("applied");
    expect(result.outcome.reply).toContain("具体经历");
  });

  it("HTTP失败归类为错误且不产生回复", async () => {
    const result = await runAiTurn({ baseUrl: "http://localhost", token: "t",
      fetchImpl: (async () => new Response('{"error":{"code":"QUOTA_EXHAUSTED"}}', { status: 429 })) as typeof fetch },
      beginTurn(active, "req"), active, { runId: "run-new", requestId: "req", inputRevision: 2, userText: "你好", context: [] });
    expect(result.httpStatus).toBe(429);
    expect(result.outcome.status).toBe("error");
    expect(result.outcome.reply).toBeNull();
  });

  it("注释心跳行不产生事件", () => {
    const events = parseFrames(': heartbeat\n\n' + 'event: delta\ndata: {"text":"x"}\n\n');
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toBe("delta");
  });
});

describe("线格式与契约一致", () => {
  it("发送的请求体使用服务端约定的字段名", async () => {
    let sent: unknown = null;
    await runAiTurn({ baseUrl: "http://localhost", token: "t",
      fetchImpl: (async (_url: string, init: RequestInit) => { sent = JSON.parse(String(init.body)); return new Response("", { status: 200 }); }) as unknown as typeof fetch },
      beginTurn(active, "req"), active,
      { runId: "run-1", requestId: "req-1", inputRevision: 3, userText: "你好", context: [{ role: "user", text: "之前说过的" }] });
    expect(sent).toEqual({
      run_id: "run-1", request_id: "req-1", input_revision: 3, user_text: "你好",
      context: [{ role: "user", text: "之前说过的" }]
    });
  });

  it("请求体不含服务端受控字段", () => {
    const wire = JSON.stringify(toWireBody({ runId: "r", requestId: "q", inputRevision: 1, userText: "x", context: [] }));
    for (const field of ["system", "model", "upstream_url", "api_key", "tools"]) {
      expect(wire).not.toContain(field);
    }
    // 学生选了档位才带上这个字段；没选就不发，由服务端用默认档
    expect(wire).not.toContain("thinking_tier");
  });

  it("学生在界面上选的思考档位随请求发给服务端", () => {
    const wire = toWireBody({ runId: "r", requestId: "q", inputRevision: 1, userText: "x", context: [], tier: "speed" });
    expect(wire.thinking_tier).toBe("speed");
  });

  it("学生自己的原话随请求上行；一条都没有时不带这个字段", () => {
    const evidence = [{ evidenceId: "ev-1", quote: "我自己的原话", kind: "student_self_report" }];
    const withEvidence = toWireBody({ runId: "r", requestId: "q", inputRevision: 1, userText: "x", context: [], evidence });
    expect(withEvidence.evidence).toEqual(evidence);
    // 没有原话时不带字段，服务端据此回落到演示注册表（本地演示路径不变）
    expect(toWireBody({ runId: "r", requestId: "q", inputRevision: 1, userText: "x", context: [] }).evidence).toBeUndefined();
  });

  it("evidenceForRequest 只带服务端会校验的三样，不把页面内部字段带上行", () => {
    const mapped = evidenceForRequest({ messages: [
      { evidenceId: "ev-1", messageId: "q-interest", quote: "我愿意继续整理公开数据", kind: "student_preference_statement" }
    ] });
    expect(mapped).toEqual([{ evidenceId: "ev-1", quote: "我愿意继续整理公开数据", kind: "student_preference_statement" }]);
    expect(Object.keys(mapped[0] ?? {})).toEqual(["evidenceId", "quote", "kind"]);
  });
});
