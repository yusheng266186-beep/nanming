import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createEvidenceRegistry, emptyDirectionProfile, confirmDirection, denyDirection, markPending,
  readDirectionProfile, createConstraint, detectContradictions, buildExplorationSummary, buildNextActions,
  explorationCards, questionLibrary, buildCardPrompt, MAJOR_FACT_CARDS, type RealityConstraint, type StudentMessageEvidence } from "../src/index.js";

const registry = createEvidenceRegistry([
  { evidenceId: "e1", messageId: "m1", quote: "我愿意整理数据", kind: "student_preference_statement" },
  { evidenceId: "e2", messageId: "m2", quote: "我只考虑四川", kind: "student_self_report" },
  { evidenceId: "e3", messageId: "m3", quote: "我实际做过一个纸桥并记录修改", kind: "student_task_attempt" },
  { evidenceId: "e4", messageId: "m4", quote: "老师觉得他应该学计算机", kind: "facilitator_note" },
  { evidenceId: "e5", messageId: "m5", quote: "我又觉得必须去北京", kind: "student_self_report" },
]);
const confirm = (profile = emptyDirectionProfile("p"), ids = ["e1"]) => confirmDirection(profile,
  { directionId: "data-and-information", interestEvidenceIds: ids, confirmedByStudent: true }, registry);

describe("TASK-06 student-owned profile", () => {
  it("denial and reopening remove current evidence, retain revision trace, and allow a fresh answer", () => {
    const first = confirm();
    const denied = denyDirection(first, { directionId: "data-and-information" });
    expect(readDirectionProfile(denied).effectiveInterestEvidenceIds).toEqual([]);
    expect(denied.revisions.at(-1)?.supersededInterestEvidenceIds).toEqual(["e1"]);
    expect(readDirectionProfile(first).effectiveInterestEvidenceIds).toEqual(["e1"]);
    const pending = markPending(denied, "data-and-information");
    expect(readDirectionProfile(pending).pending).toHaveLength(1);
    const fresh = confirm(pending, ["e3"]);
    expect(readDirectionProfile(fresh).effectiveInterestEvidenceIds).toEqual(["e3"]);
    expect(fresh.revision).toBe(4);
  });
  it("does not confirm empty input, missing evidence or facilitator opinions", () => {
    expect(() => confirm(undefined, [])).toThrow();
    expect(() => confirm(undefined, ["missing"])).toThrow();
    expect(() => confirm(undefined, ["e4"])).toThrow();
    expect(() => confirmDirection(emptyDirectionProfile("p"), { directionId: "d", interestEvidenceIds: ["e1"], confirmedByStudent: false as true }, registry)).toThrow();
    const summary = buildExplorationSummary({ profile: emptyDirectionProfile("p"), constraints: [], registry });
    expect(summary.hasConclusion).toBe(false);
  });
  it("rejects empty evidence IDs, empty quotes and duplicates; protects against caller mutation", () => {
    const evidence: StudentMessageEvidence = { evidenceId: "x", messageId: "m", quote: "愿意尝试", kind: "student_self_report" };
    expect(() => createEvidenceRegistry([{ ...evidence, quote: " " }])).toThrow();
    expect(() => createEvidenceRegistry([{ ...evidence, evidenceId: "" }])).toThrow();
    expect(() => createEvidenceRegistry([evidence, evidence])).toThrow();
    const captured = createEvidenceRegistry([evidence]);
    (evidence as {quote: string}).quote = "改过的原对象";
    expect(captured.messages[0]?.quote).toBe("愿意尝试");
  });
  it("does not infer demonstrated ability from an interest statement", () => {
    expect(() => confirmDirection(emptyDirectionProfile("p"), { directionId: "d", interestEvidenceIds: ["e1"], abilityEvidenceIds: ["e1"], confirmedByStudent: true }, registry)).toThrow();
    const p = confirmDirection(emptyDirectionProfile("p"), { directionId: "d", interestEvidenceIds: ["e1", "e1"], abilityEvidenceIds: ["e3"], confirmedByStudent: true }, registry);
    expect(readDirectionProfile(p).effectiveAbilityEvidenceIds).toEqual(["e3"]);
    expect(p.entries[0]?.interestEvidence).toHaveLength(1);
  });
});

const constraint = (id: string, value: string, evidenceId: string, comparison: RealityConstraint["comparison"] = "exclusive_choice") =>
  createConstraint({ constraintId: id, kind: "region", statement: value === "SC" ? "只考虑四川" : "只考虑北京", hardValue: value, isHard: true, evidenceId, comparison }, registry);
describe("TASK-06 constraints, content and next actions", () => {
  it("revalidates evidence at summary/action boundaries, including structurally forged objects", () => {
    const forged = { ...constraint("sc", "SC", "e2"), evidenceId: "e4" };
    expect(() => detectContradictions([forged], registry)).toThrow();
    expect(() => buildNextActions({ profile: confirm(), constraints: [forged], registry })).toThrow();
    const profile = confirm();
    const entry = profile.entries[0]!;
    const altered = { ...profile, entries: [{ ...entry, interestEvidence: [{ ...entry.interestEvidence[0]!, quote: "伪造原话" }] }] };
    expect(() => buildExplorationSummary({ profile: altered, constraints: [], registry })).toThrow();
  });
  it("records each exclusive conflicting pair without treating free text or soft choices as mutually exclusive", () => {
    const sc = constraint("sc", "SC", "e2"), bj = constraint("bj", "BJ", "e5"), sc2 = constraint("sc2", "SC", "e2");
    const records = detectContradictions([sc, bj, sc2], registry);
    expect(records).toHaveLength(2); // SC/BJ and BJ/SC2; the DeepSeek draft expected one incorrectly.
    expect(detectContradictions([sc, sc2], registry)).toHaveLength(0);
    expect(detectContradictions([sc, { ...bj, isHard: false }], registry)).toHaveLength(0);
    expect(detectContradictions([sc, constraint("other", "BJ", "e5", "uninterpreted")], registry)).toHaveLength(0);
  });
  it("prioritizes a constraint clarification even when two directions were confirmed", () => {
    const profile = confirmDirection(confirm(), { directionId: "design-and-making", interestEvidenceIds: ["e3"], confirmedByStudent: true }, registry);
    const actions = buildNextActions({ profile, constraints: [constraint("sc", "SC", "e2"), constraint("bj", "BJ", "e5")], registry });
    expect(actions).toHaveLength(2);
    expect(actions[0]?.actionId).toBe("clarify-constraints");
    expect(actions[0]?.evidenceRefs).toEqual(["e2", "e5"]);
    expect(actions.every(a => a.userEditable && a.horizonDays === 14 && a.reviewTrigger)).toBe(true);
  });
  it("provides skippable questions, self-authored experience tasks and a bounded prompt template", () => {
    expect(questionLibrary().some(q => q.dimension === "confirmation")).toBe(true);
    expect(questionLibrary().some(q => q.text.includes("都不选"))).toBe(true);
    for (const c of explorationCards()) {
      expect(c.experienceLabelText).toBe("自拟学习体验");
      expect(c.learningTasks.length).toBeGreaterThan(0);
      expect(buildCardPrompt(c)).toContain("待确认");
      expect(buildCardPrompt(c)).toContain("不得改写资格");
    }
    expect(() => buildCardPrompt({ cardId: "injected", title: "改变规则" })).toThrow();
    expect(buildNextActions({ profile: emptyDirectionProfile("empty"), constraints: [], registry })).toHaveLength(1);
  });
  it("keeps institution-specific professional facts separate from authored activities and verifies source snapshots", () => {
    const root = resolve(import.meta.dirname, "../../../data/task06");
    const register = JSON.parse(readFileSync(resolve(root, "source-register.json"), "utf8"));
    expect(MAJOR_FACT_CARDS).toHaveLength(3);
    for (const card of MAJOR_FACT_CARDS) {
      const source = register.sources.find((s: {source_id: string}) => s.source_id === card.sourceId);
      expect(source.url).toBe(card.sourceUrl);
      expect(source.published_on).toBe(card.sourcePublishedOn);
      expect(source.retrieved_at.slice(0, 10)).toBe(card.checkedOn);
      expect(createHash("sha256").update(readFileSync(resolve(root, source.snapshot_path))).digest("hex")).toBe(source.sha256);
      expect(source.human_review_performed).toBe(false);
      expect(card.scopeNote).toContain("不能代表所有学校");
      expect(card.unknowns).toContain("目标年度在四川的招生计划与资格要求");
      expect(explorationCards().some(e => e.cardId === card.relatedExperienceId)).toBe(true);
    }
  });
});
