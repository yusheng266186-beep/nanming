// 实时思考通道：从模型思考 → SSE reasoning 帧 → 浏览器 → 界面，链路上每一段的行为。
//
// 负责人 2026-09-20：「我确定低语改为实时的，不要害怕什么冲，就要让学生看到思考过程」。
// 之前思考在 qianfan-upstream 里被直接丢弃，帧协议里也没有这条通道，浏览器还整包读响应，
// 所以「实时」在链路上根本不可能。这三处都改了，这里把关键点钉住：
//   ① 帧解析：reasoning 与 delta 分开取，思考永远不混进正文（纯函数）。
//   ② 流式读取：浏览器边收边回调，不做 `await response.text()` 之后再解析。
//   ③ 界面：思考写进独立的 .thinking 节点，不走 React state（一帧一次 setState 会重渲染爆掉）。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { frameDelta, parseFrames, runAiTurn, type SseLikeEvent } from "../src/ai-client.js";

const src = (relative: string) => readFileSync(resolve(import.meta.dirname, "../src", relative), "utf8");

describe("思考与正文分成两条通道", () => {
  it("frameDelta 认得 reasoning 帧，且正文帧不带思考", () => {
    const reasoning: SseLikeEvent = { event: "reasoning", data: { text: "先想一下" } };
    const delta: SseLikeEvent = { event: "delta", data: { text: "你提到" } };
    expect(frameDelta(reasoning)).toEqual({ reasoning: "先想一下", text: null });
    expect(frameDelta(delta)).toEqual({ reasoning: null, text: "你提到" });
    // start / complete / error 不产生任何文本增量。
    expect(frameDelta({ event: "start", data: { model_id: "m" } })).toEqual({ reasoning: null, text: null });
    expect(frameDelta({ event: "complete", data: { output: { reply: "x" } } })).toEqual({ reasoning: null, text: null });
  });

  it("空串是「思考到此为止」的信号，不是要显示的内容", () => {
    expect(frameDelta({ event: "reasoning", data: { text: "" } })).toEqual({ reasoning: "", text: null });
  });
});

describe("浏览器侧真的是流式读取", () => {
  it("用 getReader 逐块解析，不再等 response.text()", () => {
    const client = src("ai-client.ts");
    expect(client).toContain("response.body.getReader()");
    expect(client).toContain("decode(value, { stream: true })");
    // 兜底仍在（没有 body 的实现可回落到整包读取），但不能是主路径。
    expect(client).toMatch(/else \{\s*feed\(parseFrames\(await response\.text\(\)\)\)/);
  });

  it("每收到一帧就把增量交给界面，并保留原有的事件判定", async () => {
    const chunks = [
      'event: start\ndata: {"request_id":"r","seq":1}\n\n',
      'event: reasoning\ndata: {"request_id":"r","seq":2,"text":"先想一下"}\n\n',
      'event: reasoning\ndata: {"request_id":"r","seq":3,"text":"这个学生"}\n\n',
      'event: delta\ndata: {"request_id":"r","seq":4,"text":"你提到"}\n\n',
      'event: complete\ndata: {"request_id":"r","seq":5,"output":{"reply":"你提到喜欢整理数据。"}}\n\n'
    ];
    // 一帧一个 chunk 地喂进去：中途必须已经回调过，否则不算实时。
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      }
    });
    const seen: { reasoning: string; text: string }[] = [];
    const reasoning: string[] = [];
    const text: string[] = [];
    const result = await runAiTurn(
      { baseUrl: "http://local", token: "t", fetchImpl: (async () => new Response(body, { status: 200 })) as typeof fetch },
      { stamp: { runId: "run-1", inputRevision: 1 }, requestId: "r" },
      { runId: "run-1", inputRevision: 1 },
      { runId: "run-1", requestId: "r", inputRevision: 1, userText: "你好", context: [] },
      { onReasoning: (chunk) => { reasoning.push(chunk); seen.push({ reasoning: chunk, text: "" }); },
        onText: (chunk) => text.push(chunk) }
    );
    expect(reasoning.join("")).toBe("先想一下这个学生");
    expect(text.join("")).toBe("你提到");
    expect(result.outcome.status).toBe("applied");
    expect(result.outcome.reply).toBe("你提到喜欢整理数据。");
    expect(seen.length).toBe(2);
  });
});

describe("界面：思考写在独立节点里", () => {
  it("谈心室有一个 .thinking 节点，App 收到 reasoning 就写进去", () => {
    const talk = src("chapters/talk.tsx");
    const app = src("App.tsx");
    expect(talk).toContain('className="thinking"');
    expect(talk).toContain("ref={reasoningRef}");
    expect(talk).toContain("reasoningText.current");
    expect(app).toContain("onReasoning:");
    expect(app).toContain("node.textContent = reasoningText.current");
    // 思考不能混进待显示的回复文本。
    expect(app).not.toMatch(/onReasoning[\s\S]{0,200}aiDraft/);
  });

  it("思考块有自己的样式，且空的时候不占位", () => {
    const css = src("style.css");
    expect(css).toMatch(/\.thinking\{[^}]*border-left/);
    expect(css).toMatch(/\.thinking:empty\{display:none\}/);
  });
});
