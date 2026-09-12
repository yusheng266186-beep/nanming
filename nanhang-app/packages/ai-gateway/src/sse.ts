// TASK-08: SSE framing (SYSTEM_AND_INTERFACE_SPEC.md section 7).
//
// Events are start / delta / complete / error, each carrying request_id and seq.
// Heartbeats are SSE comments and never appear as a business delta.
export interface SseEvent {
  readonly event: "start" | "delta" | "complete" | "error";
  readonly request_id: string;
  readonly seq: number;
  readonly data: Record<string, unknown>;
}

export function sseFrame(event: SseEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify({ request_id: event.request_id, seq: event.seq, ...event.data })}\n\n`;
}

export function sseHeartbeat(): string {
  return `: heartbeat\n\n`;
}

export interface SseSequence {
  next(): number;
}

export function sseSequence(): SseSequence {
  let seq = 0;
  return { next: () => { seq += 1; return seq; } };
}

export function startEvent(requestId: string, sequence: SseSequence, modelId: string): SseEvent {
  return { event: "start", request_id: requestId, seq: sequence.next(), data: { model_id: modelId } };
}

export function deltaEvent(requestId: string, sequence: SseSequence, text: string): SseEvent {
  return { event: "delta", request_id: requestId, seq: sequence.next(), data: { text } };
}

/**
 * `notes` 是给运维排查用的附加字段（例如本轮丢掉了哪几条没有署证的建议）。
 * 学生端只读 data.output，多出来的键不改变任何展示。
 */
export function completeEvent(requestId: string, sequence: SseSequence, output: unknown,
  notes: Record<string, unknown> = {}): SseEvent {
  return { event: "complete", request_id: requestId, seq: sequence.next(), data: { output, ...notes } };
}

export function errorEvent(requestId: string, sequence: SseSequence, code: string, message: string, retryable: boolean): SseEvent {
  return { event: "error", request_id: requestId, seq: sequence.next(),
    data: { error: { code, message, request_id: requestId, retryable } } };
}

/**
 * Parse an SSE stream body back into events. Used by tests and by the local client adapter;
 * comment lines (heartbeats) are ignored as business increments.
 */
export function parseSseStream(body: string): Array<{ event: string; data: Record<string, unknown> }> {
  const events: Array<{ event: string; data: Record<string, unknown> }> = [];
  for (const block of body.split("\n\n")) {
    const lines = block.split("\n").filter(Boolean);
    if (!lines.length) continue;
    let name = "message";
    const dataLines: string[] = [];
    let commentOnly = true;
    for (const line of lines) {
      if (line.startsWith(":")) continue;
      commentOnly = false;
      if (line.startsWith("event:")) name = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (commentOnly) continue;
    const payload = dataLines.join("\n");
    try {
      events.push({ event: name, data: JSON.parse(payload) as Record<string, unknown> });
    } catch {
      events.push({ event: name, data: { raw: payload } });
    }
  }
  return events;
}
