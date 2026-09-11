import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const payload = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../data/task03/workbooks/workbook-samples.json"), "utf8"));

describe("Excel primary intake development samples", () => {
  // The data owner confirmed the workbooks and every historical score/rank pair was independently
  // re-checked against the official score-distribution tables (see
  // data/task03/score-distribution/workbook-crosscheck.json), so the samples carry a completed
  // human review. What the review does NOT change is publication: these samples remain outside
  // any released dataset, and they keep recording unknowns as unknown.
  it("records the completed human review while leaving the samples outside any release", () => {
    expect(payload.ingestion_mode).toBe("XLSX_CELLS_PRIMARY");
    expect(payload.inputs.map((x: any) => x.track_mapping).sort()).toEqual(["HISTORY", "PHYSICS"]);
    expect(payload.publication_status).toBe("NOT_PUBLISHED");
    expect(payload.human_review_performed).toBe(true);
    expect(payload.human_review.reviewer).toBeTruthy();
    expect(payload.human_review.review_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Set(payload.records.map((r: any) => r.sample_id)).size).toBe(payload.records.length);
    for (const r of payload.records) {
      expect(r.human_review_status).toBe("VERIFIED");
      expect(r.publication_status).toBe("VALIDATED_NOT_VERIFIED");
      expect(r.plan.tuition_currency).toBeNull();
      expect(r.plan.tuition_period).toBeNull();
      expect(r.plan.tuition_comparable).toBe(false);
    }
  });

  it("resolves field evidence to the declared workbook, worksheet, row and header", () => {
    for (const r of payload.records) {
      const input = payload.inputs.find((i: any) => i.sha256 === r.source.workbook_sha256);
      expect(input).toBeDefined();
      expect(input.selected_sheet).toBe(r.source.worksheet);
      for (const c of Object.values(r.field_evidence) as any[]) {
        if (!c) continue;
        expect(c.cell).toMatch(new RegExp(`^[A-Z]+${r.source.row}$`));
        expect(c).toHaveProperty("cell_type");
        expect(c).toHaveProperty("formula");
      }
      expect(r.plan.institution_code).toMatch(/^\d+$/);
      expect(typeof r.plan.major_code).toBe("string");
    }
  });

  it("keeps historical year and metric separate and does not infer comparability", () => {
    for (const r of payload.records) {
      for (const h of r.historical_observations) {
        expect([2023, 2024, 2025]).toContain(h.source_year);
        expect(h.historical_track).toBeNull();
        expect(h.historical_batch).toBeNull();
        expect(h.score_basis).toBeNull();
        expect(h.comparability).toBe("NOT_ESTABLISHED");
        expect(h.metric_type).not.toBe("group_filing_min");
        if (h.subject_type === "group") expect(h.metric_type).toBe("group_admission_min");
        if (h.rank !== null) expect(h.rank).toBeGreaterThan(0);
      }
    }
  });

  it("declares partial sample coverage and exposes workbook schema differences", () => {
    expect(payload.sample_scope).toContain("not full coverage");
    for (const input of payload.inputs) {
      expect(input.sample_count).toBeLessThan(input.data_rows);
      expect(input.source_authority).toBe("USER_PROVIDED_NOT_INDEPENDENTLY_VERIFIED");
      expect(input.headers["26计划人数"]).toBeDefined();
      expect(input.headers["25专业组最低分"]).toBeDefined();
    }
    const physics = payload.inputs.find((i: any) => i.track_mapping === "PHYSICS");
    expect(physics.headers["科类"]).toBeUndefined();
    expect(payload.records.filter((r: any) => r.track === "PHYSICS").every((r: any) => r.warnings.includes("TRACK_FROM_EXPLICIT_SHEET_MAPPING"))).toBe(true);
  });
});
