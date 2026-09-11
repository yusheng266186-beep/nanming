import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const appRoot = resolve(import.meta.dirname, "../../..");
const task03Root = resolve(appRoot, "data/task03");

function readJson(path: string): any {
  return JSON.parse(readFileSync(resolve(task03Root, path), "utf8"));
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(resolve(appRoot, path))).digest("hex");
}

describe("TASK-03 bounded official-source sample", () => {
  const samples = readJson("structured-samples.json");
  const verification = readJson("verification-records.json");

  // The data owner confirmed these records; the confirmation is recorded per record, and the
  // rows still stay outside any published release. The legacy OCR samples are also marked as
  // superseded by the full 2026 extraction, which is the run that now feeds the database.
  it("records the completed human review while keeping every row outside a published release", () => {
    expect(samples.publication_status).toBe("NOT_PUBLISHED");
    expect(samples.human_review_performed).toBe(true);
    expect(samples.records).toHaveLength(17);
    // The status flow is RAW→NORMALIZED→VALIDATED→VERIFIED→PUBLISHED; the review moved these
    // records from VALIDATED to VERIFIED while publication stays out of scope here.
    expect(samples.records.every((record: any) => record.publication_status === "VALIDATED_AND_VERIFIED")).toBe(true);
    expect(samples.records.every((record: any) => record.review.human_review_performed === true)).toBe(true);
    expect(samples.records.every((record: any) => record.review.human_review_status === "VERIFIED")).toBe(true);
    expect(samples.records.every((record: any) => record.review.reviewer)).toBeTruthy();
  });

  it("preserves registered hashes for every official snapshot and OCR output", () => {
    const latest = readJson("source-snapshot-register.json");
    const register = JSON.parse(readFileSync(resolve(appRoot, latest.latest_register_path), "utf8"));
    expect(register.entries).toHaveLength(10);
    for (const entry of register.entries) {
      expect(sha256(entry.snapshot_path)).toBe(entry.sha256);
    }
    const extraction = readJson(`extraction/${register.run_id}/extraction-run.json`);
    expect(extraction.outputs).toHaveLength(5);
    for (const output of extraction.outputs) {
      expect(sha256(output.ocr_output_path)).toBe(output.ocr_output_sha256);
      expect(output.source_sha256).toBe(
        register.entries.find((entry: any) => entry.asset_id === output.asset_id)?.sha256
      );
    }
  });

  it("keeps group inheritance stable without claiming unsampled offerings", () => {
    const plan = samples.records.filter((record: any) => record.entity_type === "plan_record");
    expect(plan.some((record: any) => record.extraction.automated_status === "CONFLICT")).toBe(true);
    expect(
      plan.some(
        (record: any) =>
          record.extraction.automated_status === "CONFLICT" && record.extraction.ocr_major_code_found === false
      )
    ).toBe(true);
    const groups = new Map<string, { total: number; selected: number }>();
    for (const row of plan) {
      const key = `${row.track}/${row.institution_code}/${row.group_code}`;
      const previous = groups.get(key);
      if (previous) {
        expect(row.group_plan_count).toBe(previous.total);
        previous.selected += row.plan_count;
      } else {
        groups.set(key, { total: row.group_plan_count, selected: row.plan_count });
      }
    }
    for (const group of groups.values()) expect(group.selected).toBeLessThanOrEqual(group.total);
    expect(groups.get("PHYSICS/0327/505")).toEqual({ total: 3, selected: 3 });
    expect(groups.get("PHYSICS/0308/107")).toEqual({ total: 6, selected: 3 });
    expect(groups.get("HISTORY/0308/101")).toEqual({ total: 15, selected: 8 });
  });

  it("retains the OCR-missing rank field as null and labels excerpts as non-exhaustive", () => {
    const ranks = samples.records.filter((record: any) => record.entity_type === "score_distribution_point");
    expect(ranks).toHaveLength(6);
    expect(ranks.every((record: any) => record.excerpt_scope.includes("非全表"))).toBe(true);
    const missing = ranks.find((record: any) => record.sample_id === "rank-physics-679");
    expect(missing.people_at_score).toBeNull();
    expect(missing.unknown_fields).toContain("people_at_score");
    expect(missing.extraction.automated_status).toBe("MISSING");
    expect(missing.review.source_comparison_status).toBe("MISSING");
  });

  it("does not relabel group admission minima as filing or major minima", () => {
    const observations = samples.records.filter((record: any) => record.entity_type === "admission_observation");
    expect(observations).toHaveLength(4);
    expect(observations.some((record: any) => record.metric_type === "group_filing_min")).toBe(false);
    for (const record of observations) {
      expect(["group_admission_min", "major_admission_min"]).toContain(record.metric_type);
      if (record.metric_type === "group_admission_min") expect(record.offering_name).toBeNull();
      if (record.metric_type === "major_admission_min") expect(record.offering_name).not.toBeNull();
      expect(record.batch).toBeNull();
      expect(record.admission_type).toBeNull();
      expect(record.score_basis).toBeNull();
      expect(record.unknown_fields).toEqual(expect.arrayContaining(["batch", "admission_type", "score_basis"]));
    }
  });

  it("keeps verification states explicit and traceable to a named reviewer", () => {
    expect(verification.records).toHaveLength(samples.records.length);
    expect(verification.human_review_performed).toBe(true);
    expect(verification.human_review.reviewer).toBeTruthy();
    expect(verification.human_review.review_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(verification.records.every((record: any) => record.human_review_status === "VERIFIED")).toBe(true);
    expect(new Set(verification.records.map((record: any) => record.sample_id)).size).toBe(samples.records.length);
  });
});
