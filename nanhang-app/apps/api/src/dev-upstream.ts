// TASK-08: development upstream selection.
//
// NANHANG_FAKE_SCENARIO lets an acceptance run exercise a specific failure path without a paid
// provider: normal (default), timeout, fail-after-text, unsafe-output, probability-output,
// empty-output. Unknown values fall back to normal and are reported rather than silently ignored.
import { FakeUpstream, type Upstream } from "@nanhang/ai-gateway";
import { ENV_NAMES } from "./config.ts";

export type FakeScenario = "normal" | "timeout" | "fail-after-text" | "unsafe-output" | "probability-output" | "link-output" | "empty-output";

const NORMAL_FINAL = {
  reply: "本地假上游：我看到你在描述自己的经历。可以先把愿意尝试的小任务写下来，再决定方向。",
  suggestions: [{ directionId: "data-and-information", evidenceIds: ["ev-q-interest-1"],
    rationale: "来自学生自己保存的原话，仅作为待确认方向", openQuestions: ["是否愿意先做一次数据整理的小任务？"] }],
  actions: ["两周内整理一张不含个人信息的公开小表格"]
};

export function scenarioUpstream(scenario: FakeScenario): Upstream {
  const upstream = new FakeUpstream();
  switch (scenario) {
    case "timeout":
      upstream.enqueue({ hang: true });
      upstream.enqueue({ hang: true });
      upstream.enqueue({ hang: true });
      return upstream;
    case "fail-after-text":
      upstream.enqueue({ chunks: ["先说到这里，", "后面还有内容"], failAfterChunks: 1 });
      return upstream;
    case "unsafe-output":
      upstream.enqueue({ chunks: ["看看这个：", "<script>alert(1)</script>"],
        final: { reply: "<script>alert(1)</script>", suggestions: [], actions: [] } });
      return upstream;
    case "probability-output":
      upstream.enqueue({ chunks: ["你的录取概率是90%，属于稳妥选择。"],
        final: { reply: "你的录取概率是90%，属于稳妥选择。", suggestions: [], actions: [] } });
      return upstream;
    case "link-output":
      upstream.enqueue({ chunks: ["请访问 https://example.invalid/apply 了解详情。"],
        final: { reply: "请访问 https://example.invalid/apply 了解详情。", suggestions: [], actions: [] } });
      return upstream;
    case "empty-output":
      upstream.enqueue({ chunks: [], final: { reply: "", suggestions: [], actions: [] } });
      return upstream;
    default:
      upstream.enqueue({ chunks: ["本地假上游：我看到你在描述自己的经历。"], final: NORMAL_FINAL });
      return upstream;
  }
}

export function scriptedUpstreamFromEnv(env: NodeJS.ProcessEnv): Upstream | null {
  const raw = env[ENV_NAMES.fakeScenario];
  if (!raw) return null;
  const known: readonly FakeScenario[] = ["normal", "timeout", "fail-after-text", "unsafe-output", "probability-output", "link-output", "empty-output"];
  const scenario = (known as readonly string[]).includes(raw) ? (raw as FakeScenario) : "normal";
  return scenarioUpstream(scenario);
}
