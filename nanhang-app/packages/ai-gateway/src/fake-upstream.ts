// TASK-08: local fake upstream for development and tests.
//
// No network, no keys, no real model. It exists so the gateway can be exercised end to end
// (including A42 duplicate suppression and timeout handling) without a paid provider.
import type { Upstream, UpstreamChunk, UpstreamRequest } from "./gateway.js";
import { UpstreamFailure } from "./gateway.js";

export interface FakeScript {
  /** Chunks streamed back, in order. Defaults to a neutral reply. */
  readonly chunks?: readonly string[];
  /**
   * 思考块，先于正文下发（kind:"reasoning"）。
   * 2026-09-20 起思考会显示给学生，所以假上游也要能演这一段，本机才验证得了实时思考。
   */
  readonly reasoningChunks?: readonly string[];
  /** Structured object returned by finalize(); defaults to a well-formed, evidence-free reply. */
  readonly final?: unknown;
  /** Emit nothing and hang until the abort signal fires. */
  readonly hang?: boolean;
  /** Reject the stream after this many chunks were emitted (0 = reject immediately). */
  readonly failAfterChunks?: number;
  /** Reject finalize() instead of returning an object. */
  readonly failFinalize?: boolean;
  /** Milliseconds between chunks; used to exercise heartbeats. */
  readonly chunkDelayMs?: number;
}

/** Counts calls so a test can assert that a duplicate request never reached the provider (A42). */
export class FakeUpstream implements Upstream {
  readonly kind = "fake-local";
  private queue: FakeScript[] = [];
  private current: FakeScript | null = null;
  streamCalls = 0;
  finalizeCalls = 0;
  lastRequest: UpstreamRequest | null = null;

  constructor(private readonly defaultScript: FakeScript = {}) {}

  enqueue(script: FakeScript): void {
    this.queue.push(script);
  }

  private next(): FakeScript {
    return this.queue.shift() ?? this.defaultScript;
  }

  /** 块之间的等待，可被中止信号打断；`started` 决定失败按「已出内容」还是「首字节前」归类。 */
  private async wait(ms: number, signal: AbortSignal, started: boolean): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      const onAbort = () => {
        clearTimeout(timer);
        reject(new UpstreamFailure("UPSTREAM_TIMEOUT", "fake upstream aborted", started));
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  async *stream(request: UpstreamRequest, signal: AbortSignal): AsyncIterable<UpstreamChunk> {
    this.streamCalls += 1;
    this.lastRequest = request;
    const script = this.next();
    this.current = script;
    if (script.hang) {
      await new Promise<void>((_resolve, reject) => {
        const onAbort = () => reject(new UpstreamFailure("UPSTREAM_TIMEOUT", "fake upstream aborted", false));
        if (signal.aborted) { onAbort(); return; }
        signal.addEventListener("abort", onAbort, { once: true });
      });
      return;
    }
    const chunks = script.chunks ?? ["这是一段本地假上游回复，仅用于开发验证。"];
    const limit = script.failAfterChunks ?? chunks.length;
    // 思考先走：与真实上游一样，thinking 阶段在正文之前。
    for (const piece of script.reasoningChunks ?? []) {
      if (signal.aborted) throw new UpstreamFailure("UPSTREAM_TIMEOUT", "fake upstream aborted", false);
      if (script.chunkDelayMs) await this.wait(script.chunkDelayMs, signal, false);
      yield { text: piece, kind: "reasoning" as const };
    }
    for (const chunk of chunks.slice(0, limit)) {
      if (signal.aborted) throw new UpstreamFailure("UPSTREAM_TIMEOUT", "fake upstream aborted", this.streamCallsForText());
      if (script.chunkDelayMs) await this.wait(script.chunkDelayMs, signal, true);
      yield { text: chunk };
    }
    if (script.failAfterChunks !== undefined) {
      // The failure is classified as "already started" only when text was actually emitted.
      throw new UpstreamFailure("UPSTREAM_UNAVAILABLE", "fake upstream failed after streaming", script.failAfterChunks > 0);
    }
  }

  private streamCallsForText(): boolean {
    return this.current !== null && (this.current.failAfterChunks ?? 1) > 0;
  }

  async finalize(_request: UpstreamRequest, streamedText: string): Promise<unknown> {
    this.finalizeCalls += 1;
    const script = this.current ?? this.defaultScript;
    if (script.failFinalize) throw new UpstreamFailure("UPSTREAM_UNAVAILABLE", "fake finalize failed", true);
    if (script.final !== undefined) return script.final;
    return { reply: streamedText || "本地假上游未返回文本。", suggestions: [], actions: [] };
  }
}

/** Deterministic upstream whose finalize() returns a caller-supplied object. */
export class ScriptedUpstream implements Upstream {
  readonly kind = "scripted-local";
  constructor(private readonly reply: string, private readonly final: unknown) {}
  async *stream(): AsyncIterable<UpstreamChunk> {
    yield { text: this.reply };
  }
  async finalize(): Promise<unknown> {
    return this.final;
  }
}
