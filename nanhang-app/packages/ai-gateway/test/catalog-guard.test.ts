import { describe, expect, it } from "vitest";
import { parseDirectionCatalog } from "../src/catalog-guard.js";
import { validateTurnRequest, turnPayloadHash } from "../src/input-guard.js";
import { validateCareerTurnOutput } from "../src/output-guard.js";
import { withConfig } from "../src/types.js";
import { AiGateway } from "../src/gateway.js";
import { FakeUpstream } from "../src/fake-upstream.js";
import { MemoryStateStore } from "../src/state-store.js";
import {
  createEvidenceRegistry,
  emptyDirectionProfile,
} from "@nanhang/exploration";

const catalog = [{ id: "catalog:合成专业类", name: "合成专业类" }];
describe("AI 的发布库方向边界", () => {
  it("仅接收与库名一致的方向 ID，拒绝控制内容和重复 ID", () => {
    expect(parseDirectionCatalog(catalog)).toEqual(catalog);
    expect(parseDirectionCatalog([...catalog, ...catalog])).toBeNull();
    expect(
      parseDirectionCatalog([{ id: "invented", name: "合成专业类" }]),
    ).toBeNull();
    expect(
      parseDirectionCatalog([{ id: "catalog:<script>", name: "<script>" }]),
    ).toBeNull();
  });
  it("词表通过请求校验且参与幂等内容", () => {
    const parsed = validateTurnRequest(
      {
        run_id: "r",
        request_id: "t",
        input_revision: 0,
        user_text: "合成表达",
        context: [],
        direction_catalog: catalog,
      },
      withConfig(),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok)
      expect(turnPayloadHash(parsed.value)).toMatchObject({
        direction_catalog: catalog,
      });
  });
  it("即使证据正确，库外建议仍被丢弃", () => {
    const result = validateCareerTurnOutput(
      {
        reply: "一起探索你的经历。",
        suggestions: [
          {
            directionId: "编造专业",
            evidenceIds: ["ev"],
            rationale: "合成依据",
          },
        ],
        actions: [],
        options: [],
      },
      {
        allowedEvidenceIds: () => ["ev"],
        allowedDirectionIds: () => catalog.map((c) => c.id),
      },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.suggestions).toEqual([]);
  });
  it("库内 ID 也不能引用学生没说过的话", () => {
    const result = validateCareerTurnOutput(
      {
        reply: "一起探索。",
        suggestions: [
          {
            directionId: catalog[0]!.id,
            evidenceIds: ["伪造原话"],
            rationale: "合成依据",
          },
        ],
        actions: [],
        options: [],
      },
      {
        allowedEvidenceIds: () => ["ev"],
        allowedDirectionIds: () => catalog.map((c) => c.id),
      },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.suggestions).toEqual([]);
  });
  it("实际网关把目录与学生原话传给上游，并过滤库外建议", async () => {
    const suggestions = [catalog[0]!.id, "catalog:捏造方向"].map(
      (directionId) => ({
        directionId,
        evidenceIds: ["student-own"],
        rationale: "来自本次合成学生表达",
        openQuestions: [],
      }),
    );
    const upstream = new FakeUpstream({
      chunks: ["一起看看这些经历。"],
      final: {
        reply: "一起看看这些经历。",
        suggestions,
        actions: [],
        options: [],
      },
    });
    const registry = createEvidenceRegistry([
      {
        evidenceId: "demo",
        messageId: "demo",
        quote: "旧演示原话",
        kind: "student_self_report",
      },
    ]);
    const gateway = new AiGateway({
      store: new MemoryStateStore(),
      upstream,
      config: withConfig(),
      now: () => 1000,
      registryFor: () => registry,
      profileFor: () => emptyDirectionProfile("test"),
      constraintsFor: () => [],
    });
    const session = await gateway.createSession({
      token: "fixture-token",
      subjectId: "fixture-student",
      accessKind: "trial_code",
    });
    const response = await gateway.careerTurn(session, {
      run_id: "r",
      request_id: "catalog-turn",
      input_revision: 1,
      user_text: "这次我自己说的话",
      context: [],
      direction_catalog: catalog,
      evidence: [
        {
          evidenceId: "student-own",
          quote: "这次我自己说的话",
          kind: "student_self_report",
        },
      ],
    });
    expect(response.httpStatus).toBe(200);
    expect(upstream.lastRequest?.directionCatalog).toEqual(catalog);
    expect(upstream.lastRequest?.evidence.map((e) => e.evidenceId)).toEqual([
      "student-own",
    ]);
    const complete = response.frames.find((frame) =>
      frame.startsWith("event: complete"),
    );
    expect(complete).toContain(catalog[0]!.id);
    const payload = JSON.parse(complete!.split("data: ")[1]!);
    expect(payload.output.suggestions).toHaveLength(1);
  });
});
