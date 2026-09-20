// TASK-08: development upstream selection.
//
// NANHANG_FAKE_SCENARIO lets an acceptance run exercise a specific failure path without a paid
// provider: normal (default), timeout, fail-after-text, unsafe-output, probability-output,
// empty-output. Unknown values fall back to normal and are reported rather than silently ignored.
import { FakeUpstream, type Upstream } from "@nanhang/ai-gateway";
import { ENV_NAMES } from "./config.ts";

export type FakeScenario = "normal" | "reasoning" | "timeout" | "fail-after-text" | "unsafe-output" | "probability-output" | "link-output" | "empty-output";

const NORMAL_FINAL = {
  reply: "本地假上游：我看到你在描述自己的经历。可以先把愿意尝试的小任务写下来，再决定方向。",
  suggestions: [{ directionId: "data-and-information", evidenceIds: ["ev-q-interest-1"],
    rationale: "来自学生自己保存的原话，仅作为待确认方向", openQuestions: ["是否愿意先做一次数据整理的小任务？"] }],
  actions: ["两周内整理一张不含个人信息的公开小表格"]
};

/**
 * 本机假上游的思考块。
 *
 * 负责人 2026-09-20 要求把模型思考实时显示给学生，所以假上游也要演这一段，
 * 本机才验证得了「实时思考」这条链路（云端真模型是否返回思考由上游决定）。
 * 分块 + chunkDelayMs 拉开间隔，看起来才像真的在想。
 */
const NORMAL_REASONING = [
  "（本地假上游的思考演示）先看这句话里的动作：物理还行、喜欢把乱糟糟的数据整理清楚。",
  "这两条都属于「做过的具体事」，不是抽象的性格词，可以当作线索。",
  "不猜分数，也不提院校；先把愿意尝试的小任务摆出来，再问一句愿不愿意做。"
];

export function scenarioUpstream(scenario: FakeScenario): Upstream {
  const upstream = new FakeUpstream();
  switch (scenario) {
    case "reasoning":
      // 本机专门演「实时思考」的场景（NANHANG_FAKE_SCENARIO=reasoning）：
      // 思考分三块、每块隔 900ms 下发，正文随后。默认档不放这个延迟，
      // 否则每一轮都要多等近 3 秒，自动测试也会被拖过超时。
      upstream.enqueue({ reasoningChunks: NORMAL_REASONING, chunkDelayMs: 900,
        chunks: ["本地假上游：我看到你在描述自己的经历。"], final: NORMAL_FINAL });
      return upstream;
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
  const known: readonly FakeScenario[] = ["normal", "reasoning", "timeout", "fail-after-text", "unsafe-output", "probability-output", "link-output", "empty-output"];
  const scenario = (known as readonly string[]).includes(raw) ? (raw as FakeScenario) : "normal";
  return scenarioUpstream(scenario);
}
