// 南溟 · 谈心对话与提问起点的回归检查。
//
// 这些是静态检查（与 presentation.test.ts 同思路）：测试环境是 node，没有 DOM，
// 所以这里断言的是「源码里必须有什么」与「绝不能有什么」。
//
// 最重要的两条守卫：
//   1. 提问起点只能帮学生开口，**不得携带任何权重**。原设计（南溟.html）用选项的
//      dims/avoid 权重算出「方向适配度 %」，而本项目禁止由兴趣推断专业适合度
//      （见 packages/exploration 的 PROMPT_BOUNDARY 第 2 条）。一旦有人给起点加上
//      权重字段，这里就会失败。
//   2. 逐字动画必须尊重 prefers-reduced-motion，且指示器/光标只在动画路径上出现。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ANSWER_STARTERS, QUESTIONS, directionCoverage } from "../src/model.js";
import type { OfferingLabel } from "../src/release-loader.js";

const chat = readFileSync(resolve(import.meta.dirname, "../src/chat.tsx"), "utf8");
const app = readFileSync(resolve(import.meta.dirname, "../src/App.tsx"), "utf8");
const css = readFileSync(resolve(import.meta.dirname, "../src/style.css"), "utf8");

describe("谈心对话", () => {
  it("renders the chat through the shared components rather than inline markup", () => {
    // The page must use the extracted components, so the animation and reduced-motion
    // handling live in one place instead of being re-implemented per page.
    expect(app).toContain("ChatBubble");
    expect(app).toContain("StreamedText");
    expect(app).toContain("TypingDots");
    expect(app).toContain("AnswerStarters");
    // The `.msg ai` / `.msg me` markup must come from ChatBubble, not be written out again.
    expect(app).not.toContain('className="msg ai"');
    expect(app).not.toContain('className="msg me"');
  });

  it("honours prefers-reduced-motion instead of animating unconditionally", () => {
    // chat.tsx must consult the media query and skip the per-character timer when it matches.
    expect(chat).toContain("prefers-reduced-motion:reduce");
    expect(chat).toContain("animate");
    // With animation off the full text is shown immediately: no interval is scheduled.
    expect(chat).toMatch(/if\s*\(!animate\)\s*\{\s*setShown\(main\.length\)/);
    // The page asks for the preference and passes it down.
    expect(app).toContain("prefersReducedMotion()");
    expect(app).toContain("animate={!reducedMotion}");
    // The typing indicator is only entered on the animated path.
    expect(app).toMatch(/if\s*\(reducedMotion\)\s*\{[^}]*setThinking\(false\)/);
  });

  it("keeps the typing indicator and caret out of the accessible text", () => {
    // Decorative animation must not be announced; the dots and caret are aria-hidden.
    expect(chat).toMatch(/className="dots"\s+aria-hidden="true"/);
    expect(chat).toMatch(/className="caret"\s+aria-hidden="true"/);
  });

  it("uses the stylesheet's chat classes so the CSS cannot drift from the markup", () => {
    for (const token of [".chat-scroll", ".msg", ".who", ".bub", ".ask", ".dots", ".caret", ".whisper", ".qopts", ".qopt"]) {
      expect(css).toContain(token);
    }
    // The CSS animations referenced by the chat exist and are reduced-motion aware overall.
    expect(css).toContain("@keyframes msgin");
    expect(css).toContain("@keyframes bop");
    expect(css).toContain("@keyframes blink");
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:reduce\)/);
  });
});

describe("提问起点（只帮开口，不参与计算）", () => {
  it("covers every question in the library", () => {
    for (const question of QUESTIONS) {
      const starters = ANSWER_STARTERS[question.questionId];
      expect(starters, `missing starters for ${question.questionId}`).toBeDefined();
      expect(starters!.length).toBeGreaterThan(0);
      for (const text of starters!) expect(text.trim().length).toBeGreaterThan(0);
    }
    // No entry for a question that no longer exists.
    const known = new Set(QUESTIONS.map((question) => question.questionId));
    for (const key of Object.keys(ANSWER_STARTERS)) expect(known.has(key)).toBe(true);
  });

  it("carries no scoring weight of any kind", () => {
    // The whole point: a starter is a phrasing aid. Any weight, dimension or avoidance
    // field would turn it back into the fit-percentage model the project forbids.
    const forbidden = ["dims", "avoid", "weight", "fit", "score", "stable", "reality", "logic", "build", "people", "theory", "money", "grad", "city"];
    for (const [questionId, starters] of Object.entries(ANSWER_STARTERS)) {
      for (const text of starters) {
        expect(typeof text).toBe("string");
        // A plain string cannot carry a weight; guard against the shape changing to objects.
        expect(Object.keys(Object(text)).length).toBeGreaterThanOrEqual(0);
        for (const word of forbidden) {
          expect(text.toLowerCase(), `${questionId}: "${text}" must not mention ${word}`)
            .not.toContain(word);
        }
      }
    }
  });

  it("does not feed starters into any direction decision", () => {
    // Starters may only reach the draft state. They must never be passed to recordAnswer,
    // confirm or any profile function — the student's own saved words are the only evidence.
    const uses = app.match(/ANSWER_STARTERS[^\n]*/g) ?? [];
    expect(uses.length).toBeGreaterThan(0);
    for (const line of uses) {
      expect(line).not.toContain("recordAnswer");
      expect(line).not.toContain("confirm(");
    }
    // The picker only writes into the drafts map.
    expect(app).toMatch(/onPick=\{\(text\)\s*=>\s*setDrafts/);
  });
});

describe("方向覆盖统计（只数数量，不做评分）", () => {
  const label = (overrides: Partial<OfferingLabel>): OfferingLabel => ({
    offeringId: "o", groupId: "g", institutionName: "某大学", institutionCity: null,
    institutionTags: null, majorName: "某专业", majorCode: null, category: null,
    categoryClass: null, planCount: null, tuition: null, level: null,
    batch: "本科批B段", track: "PHYSICS", ...overrides,
  });

  it("counts only offerings whose category class belongs to the direction", () => {
    const catalog: Record<string, OfferingLabel> = {
      a: label({ offeringId: "a", categoryClass: "计算机类", institutionName: "甲大学" }),
      b: label({ offeringId: "b", categoryClass: "计算机类", institutionName: "甲大学" }),
      c: label({ offeringId: "c", categoryClass: "机械类", institutionName: "乙大学" }),
      d: label({ offeringId: "d", categoryClass: "临床医学类", institutionName: "丙大学" }),
    };
    const candidates = [{ offering_id: "a" }, { offering_id: "b" }, { offering_id: "c" }, { offering_id: "d" }];
    const coverage = directionCoverage(candidates, catalog);
    const byId = new Map(coverage.map((item) => [item.directionId, item]));

    const info = byId.get("data-and-information")!;
    expect(info.offerings).toBe(2);
    // Institutions are counted once each, not once per offering.
    expect(info.institutions).toBe(1);
    expect(info.categoryClasses).toEqual(["计算机类"]);

    const making = byId.get("design-and-making")!;
    expect(making.offerings).toBe(1);
    expect(making.categoryClasses).toEqual(["机械类"]);

    // 临床医学类 is not in any direction's list, so it is not silently counted anywhere.
    const total = coverage.reduce((sum, item) => sum + item.offerings, 0);
    expect(total).toBe(3);
  });

  it("treats a missing or blank category as no coverage rather than guessing", () => {
    const catalog: Record<string, OfferingLabel> = {
      a: label({ offeringId: "a", categoryClass: null }),
      b: label({ offeringId: "b", categoryClass: "" }),
    };
    const coverage = directionCoverage([{ offering_id: "a" }, { offering_id: "b" }], catalog);
    expect(coverage.every((item) => item.offerings === 0)).toBe(true);
    // An offering with no catalogue entry at all is skipped, not defaulted.
    const missing = directionCoverage([{ offering_id: "zzz" }], catalog);
    expect(missing.every((item) => item.offerings === 0)).toBe(true);
  });

  it("reports every direction even when nothing matches", () => {
    const coverage = directionCoverage([], {});
    // All three directions are present so the page can say "0" instead of rendering nothing.
    expect(coverage.map((item) => item.directionId).sort()).toEqual(
      ["data-and-information", "design-and-making", "rules-and-social-questions"]);
    for (const item of coverage) {
      expect(item.offerings).toBe(0);
      expect(item.institutions).toBe(0);
      expect(item.categoryClasses).toEqual([]);
    }
  });

  it("exposes no score, fit or ranking field", () => {
    // A coverage number must never grow into an aptitude score. Guard the returned shape.
    const coverage = directionCoverage([], {});
    for (const item of coverage) {
      expect(Object.keys(item).sort()).toEqual(["categoryClasses", "directionId", "institutions", "offerings"]);
    }
    // The page itself must not sort or filter candidates by direction coverage.
    const page = app;
    expect(page).not.toContain("directionFit");
    expect(page).not.toContain("clusterFit");
  });
});
