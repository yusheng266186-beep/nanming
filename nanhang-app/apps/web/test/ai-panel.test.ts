import { describe, expect, it } from "vitest";
import {
  AI_NOTICE, MODE_CHOICES, THINKING_CHOICES, applyOutcome, askAi, disableAi, enableAi, initialAiPanel,
  isReplyStale, safeText, withMode, withSession
} from "../src/ai-panel.js";

const stamp = { runId: "run-new", inputRevision: 2 };

const sse = (reply: string) => [
  'event: start\ndata: {"request_id":"req","seq":1}\n\n',
  `event: complete\ndata: ${JSON.stringify({ request_id: "req", seq: 2, output: { reply } })}\n\n`
].join("");

describe("AI面板默认关闭且可完全回退", () => {
  it("初始状态不连接、不显示回复", () => {
    expect(initialAiPanel.enabled).toBe(false);
    expect(initialAiPanel.token).toBeNull();
    expect(initialAiPanel.reply).toBeNull();
    expect(AI_NOTICE).toContain("不能修改资格");
  });

  it("未启用时不发起任何网络请求", async () => {
    let called = false;
    const next = await askAi(initialAiPanel, stamp, stamp, "你好", "req", {
      fetchImpl: (async () => { called = true; return new Response(); }) as typeof fetch
    });
    expect(called).toBe(false);
    expect(next.reply).toBeNull();
  });

  it("关闭后清除回复与会话，不残留状态", () => {
    const on = withSession(enableAi(initialAiPanel), "token");
    const off = disableAi({ ...on, reply: "之前的话" });
    expect(off.enabled).toBe(false);
    expect(off.token).toBeNull();
    expect(off.reply).toBeNull();
    expect(off.status).toContain("不受影响");
  });

  it("启用但没有访问码时给出提示且不发请求", async () => {
    const next = await askAi(enableAi(initialAiPanel), stamp, stamp, "你好", "req");
    expect(next.status).toContain("访问码");
  });
});

describe("AI回复的显示安全", () => {
  it("尖括号被替换，模型文本不会被当作标记", () => {
    expect(safeText("<script>alert(1)</script>")).toBe("\u003cscript\u003ealert(1)\u003c/script\u003e");
    expect(safeText(undefined)).toBe("");
  });

  it("正常回复原样展示，但不进入画像", async () => {
    const state = withSession(enableAi(initialAiPanel), "token");
    const next = await askAi(state, stamp, stamp, "我喜欢整理数据", "req", {
      fetchImpl: (async () => new Response(sse("可以先做一次数据整理的小体验。"), { status: 200 })) as typeof fetch
    });
    expect(next.reply).toContain("数据整理");
    expect(next.suggestions).toHaveLength(0);
    expect(next.status).toContain("需你本人确认");
  });

  it("降级回复按降级提示展示而不是普通成功", () => {
    const state = withSession(enableAi(initialAiPanel), "token");
    const next = applyOutcome(state, { requestId: "req", status: "degraded", reply: "本地提示", reason: "reply contains markup", options: [] });
    expect(next.status).toContain("未通过安全校验");
    expect(next.suggestions).toHaveLength(0);
  });

  it("服务不可用时明确说明无AI流程仍可用", () => {
    const state = withSession(enableAi(initialAiPanel), "token");
    const next = applyOutcome(state, { requestId: "req", status: "error", reply: null, reason: "STATE_STORE_UNAVAILABLE", options: [] }, 503);
    expect(next.status).toContain("仍可正常使用");
  });

  it("A47 过期回复被忽略并说明原因", () => {
    const state = withSession(enableAi(initialAiPanel), "token");
    const next = applyOutcome(state, { requestId: "req-old", status: "rejected", reply: null, reason: "STALE_RUN_RESPONSE", options: [] });
    expect(next.status).toContain("过期");
    expect(next.reply).toBeNull();
  });
});

describe("两种聊法：选择作答与自由探索", () => {
  const connected = () => withSession(enableAi(initialAiPanel), "token");

  it("默认是引航，两种聊法都给一句实话说明", () => {
    expect(initialAiPanel.mode).toBe("guided");
    expect(MODE_CHOICES.map((choice) => choice.value)).toEqual(["guided", "open"]);
    expect(MODE_CHOICES.map((choice) => choice.label)).toEqual(["引航", "泛舟"]);
    for (const choice of MODE_CHOICES) expect(choice.hint.length).toBeGreaterThan(10);
  });

  it("选择作答时把可点的答案带到面板上", () => {
    const next = applyOutcome(connected(),
      { requestId: "r", status: "applied", reply: "正文", reason: null, options: ["先把名单排一遍", "我还没想过"] }, 200, 1);
    expect(next.options).toEqual(["先把名单排一遍", "我还没想过"]);
  });

  it("出错、降级与关闭都不留下可点的答案", () => {
    const applied = applyOutcome(connected(),
      { requestId: "r", status: "applied", reply: "正文", reason: null, options: ["A"] }, 200, 1);
    expect(applied.options).toEqual(["A"]);
    expect(applyOutcome(applied, { requestId: "r", status: "error", reply: null, reason: "X", options: [] }, 503, 1).options).toEqual([]);
    expect(applyOutcome(applied, { requestId: "r", status: "degraded", reply: "本地提示", reason: "markup", options: [] }, 200, 1).options).toEqual([]);
    expect(disableAi(applied).options).toEqual([]);
  });

  it("切换聊法会清掉上一轮的选项，但保留已经拿到的回复", () => {
    const applied = applyOutcome(connected(),
      { requestId: "r", status: "applied", reply: "正文", reason: null, options: ["A", "B"] }, 200, 1);
    const switched = withMode(applied, "open");
    expect(switched.mode).toBe("open");
    expect(switched.options).toEqual([]);
    expect(switched.reply).toBe("正文");
  });

  it("两种聊法都会随请求发给服务端", async () => {
    const sent: Record<string, unknown>[] = [];
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)) as Record<string, unknown>);
      return new Response(sse("回复"), { status: 200 });
    }) as unknown as typeof fetch;
    await askAi(connected(), stamp, stamp, "你好", "req-g", { fetchImpl });
    await askAi(withMode(connected(), "open"), stamp, stamp, "你好", "req-o", { fetchImpl });
    expect(sent[0]?.mode).toBe("guided");
    expect(sent[1]?.mode).toBe("open");
  });
});

describe("A47 端到端：旧run的SSE不会写入面板", () => {
  it("请求发出后当前run已变化时，回复不被采纳", async () => {
    const oldStamp = { runId: "run-old", inputRevision: 1 };
    // The student changed an input while the request was in flight, so the active stamp moved on.
    const movedOn = { runId: "run-new", inputRevision: 2 };
    const state = withSession(enableAi(initialAiPanel), "token");
    const next = await askAi(state, oldStamp, movedOn, "旧的一轮", "req-old", {
      fetchImpl: (async () => new Response(sse("这是旧运行的结果"), { status: 200 })) as typeof fetch
    });
    expect(next.reply).toBeNull();
    expect(next.status).toContain("过期");
  });
});

describe("已显示的AI回复会随输入变化可见地失效", () => {
  const connected = () => withSession(enableAi(initialAiPanel), "token");

  it("回复在产生它的修订下是当前的", () => {
    const state = applyOutcome(connected(), { requestId: "r", status: "applied", reply: "建议内容", reason: null, options: [] }, 200, 5);
    expect(isReplyStale(state, 5)).toBe(false);
  });

  it("修订推进后标记为失效但仍保留原文", () => {
    const state = applyOutcome(connected(), { requestId: "r", status: "applied", reply: "建议内容", reason: null, options: [] }, 200, 5);
    const later = { ...state };
    expect(isReplyStale(later, 6)).toBe(true);
    expect(later.reply).toBe("建议内容");
  });

  it("出错或清除后不再有失效标记", () => {
    const failed = applyOutcome(connected(), { requestId: "r", status: "error", reply: null, reason: "X", options: [] }, 503, 5);
    expect(isReplyStale(failed, 9)).toBe(false);
    const off = disableAi(applyOutcome(connected(), { requestId: "r", status: "applied", reply: "x", reason: null, options: [] }, 200, 5));
    expect(isReplyStale(off, 9)).toBe(false);
  });
});
