import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateMatchResultSemantics, validateStructure } from "@nanhang/contracts";
import { buildMatchResult } from "@nanhang/domain";
import {
  buildSyntheticInput, confirm, deny, excelDevelopmentRows, initialState, isMatchFresh,
  recordAnswer, registerStartTool, reopen, runMatch, skipAnswer, summary, withForm,
  type ModelContextLike
} from "../src/model.js";

const selection = { primary: "PHYSICS" as const, additional: ["CHEMISTRY", "BIOLOGY"] };
const ready = () => withForm(initialState(), { ...selection, score: 600 });
const synthetic = (score: number) => ({ track: "PHYSICS" as const, score, targetYear: 2027,
  additional: selection.additional, hardBudget: null, confirmedDirections: [] });

describe("TASK-07 无AI学生流程", () => {
  it("允许缺成绩继续探索，并拒绝不在合成分段表中的分数", async () => {
    const noScore = await runMatch(withForm(initialState(), selection));
    expect(noScore.match).toBeNull();
    expect(noScore.notice).toContain("仍可探索");
    expect(summary(noScore)?.hasConclusion).toBe(false);
    expect(() => buildSyntheticInput(synthetic(602))).toThrowError("UNKNOWN_SYNTHETIC_SCORE");
  });

  it("修改任何输入或画像后让旧结果可见地失效", async () => {
    const built = await runMatch(ready());
    expect(isMatchFresh(built)).toBe(true);
    const changed = withForm(built, { targetYear: 2028 });
    expect(changed.match).not.toBeNull();
    expect(isMatchFresh(changed)).toBe(false);
    expect(isMatchFresh(deny(built, "data-and-information"))).toBe(false);
  });

  it("跳过、否认和重答不产生替学生确认的结论", () => {
    const answered = recordAnswer(initialState(), "q-interest", "我愿意继续整理公开数据并核对空值");
    expect(summary(answered)?.hasConclusion).toBe(false);
    const confirmed = confirm(answered, "data-and-information");
    expect(summary(confirmed)?.confirmed).toHaveLength(1);
    const denied = deny(confirmed, "data-and-information");
    expect(summary(denied)?.denied).toHaveLength(1);
    const unrelatedEdit = recordAnswer(denied, "q-next", "两周内整理一张小表");
    expect(summary(unrelatedEdit)?.denied).toHaveLength(1);
    expect(summary(reopen(unrelatedEdit, "data-and-information"))?.pending).toHaveLength(1);
    expect(summary(skipAnswer(confirmed, "q-interest"))?.effectiveInterestEvidenceIds).toEqual([]);
  });

  it("Excel核对视图读取真实键且与合成匹配隔离", async () => {
    const raw = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../data/task03/workbooks/workbook-samples.json"), "utf8"));
    const rows = excelDevelopmentRows(raw);
    expect(rows).toHaveLength(36);
    expect(rows[0]?.sourceRow).toBeGreaterThan(0);
    expect(JSON.stringify(buildSyntheticInput(synthetic(600)))).not.toContain(rows[0]!.institution);
    expect(JSON.stringify((await runMatch(ready())).match!.result)).not.toContain(rows[0]!.sampleId);
  });

  it("合成结果通过结构与语义验证，离散分数产生不同位次", async () => {
    const result = (await runMatch(ready())).match!.result;
    expect(validateStructure("match-result", result).valid).toBe(true);
    expect(validateMatchResultSemantics(result).valid).toBe(true);
    expect(buildSyntheticInput(synthetic(610)).distribution?.row).not.toEqual(buildSyntheticInput(synthetic(590)).distribution?.row);
  });

  it("覆盖选科缺失、无历史类分片和预算空结果", async () => {
    expect((await runMatch(withForm(initialState(), { additional: selection.additional }))).notice).toContain("首选科目");
    expect((await runMatch(withForm(initialState(), { primary: "PHYSICS", additional: ["CHEMISTRY"], score: 600 }))).notice).toContain("正好");
    expect((await runMatch(withForm(ready(), { primary: "HISTORY" }))).notice).toContain("历史类");
    expect((await runMatch(withForm(ready(), { budget: 4000 }))).match?.result.candidates).toHaveLength(0);
    const withdrawn = buildSyntheticInput({ ...synthetic(600), releaseStatus: "WITHDRAWN" });
    const withdrawnResult = buildMatchResult(withdrawn);
    expect(withdrawnResult.candidates).toHaveLength(0);
    expect(withdrawnResult.warnings).toContain("DATASET_WITHDRAWN");
  });

  it("注册的起点工具复用页面状态并拒绝非法输入", async () => {
    let tool: Parameters<ModelContextLike["registerTool"]>[0] | undefined;
    const context: ModelContextLike = { registerTool(value) { tool = value; } };
    let patch: unknown;
    registerStartTool(context, (value) => { patch = value; });
    await Promise.resolve();
    expect(tool?.name).toBe("configure_exploration_start");
    expect(tool?.execute({ targetYear: 2027, primary: "PHYSICS", additional: ["CHEMISTRY", "BIOLOGY"] })).toEqual({ status: "configured", scoreRequiredForMatching: false });
    expect(patch).toEqual({ targetYear: 2027, primary: "PHYSICS", additional: ["CHEMISTRY", "BIOLOGY"] });
    expect(() => tool?.execute({ targetYear: 2030, primary: null, additional: [] })).toThrow("INVALID_TARGET_YEAR");
  });
});
