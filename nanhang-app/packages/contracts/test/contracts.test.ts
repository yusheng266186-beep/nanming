import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  validateDataReleaseSemantics,
  validateMatchResultSemantics,
  validateStructure,
  validateStudentProfileSemantics,
  validateTargetScenarioSemantics
} from "../src/index.js";

const fixtures = resolve(import.meta.dirname, "../../../fixtures");

function read(name: string): unknown {
  return JSON.parse(readFileSync(resolve(fixtures, name), "utf8"));
}

describe("handoff contract fixtures", () => {
  it.each([
    ["student-profile", "student-profile.valid.json", true],
    ["student-profile", "student-profile.invalid.json", false],
    ["target-scenario", "target-scenario.valid.json", true],
    ["target-scenario", "target-scenario.invalid.json", false],
    ["match-result", "match-result.valid.json", true],
    ["match-result", "match-result.invalid.json", false]
  ] as const)("validates %s / %s", (contract, file, expected) => {
    expect(validateStructure(contract, read(file)).valid).toBe(expected);
  });

  it("keeps structural and semantic validation independent", () => {
    const profile = read("student-profile.valid.json") as Record<string, unknown>;
    const observations = profile.observations as Array<Record<string, unknown>>;
    const ranks = observations[0]?.ranks as Array<Record<string, unknown>>;
    if (!ranks[0]) throw new Error("fixture rank missing");
    ranks[0].population = 10;

    expect(validateStructure("student-profile", profile).valid).toBe(true);
    const semantic = validateStudentProfileSemantics(profile);
    expect(semantic.valid).toBe(false);
    expect(semantic.issues.map((item) => item.code)).toContain("RANK_EXCEEDS_POPULATION");
  });

  it("rejects identity elevation from imported JSON", () => {
    const profile = read("student-profile.valid.json") as Record<string, unknown>;
    const provenance = profile.provenance as Record<string, unknown>;
    provenance.origin = "school_verified";
    provenance.identity_binding = "server_verified";

    expect(validateStructure("student-profile", profile).valid).toBe(true);
    expect(validateStudentProfileSemantics(profile).issues.map((item) => item.code)).toContain(
      "UNTRUSTED_IDENTITY_CLAIM"
    );
    expect(validateStudentProfileSemantics(profile, { serverAuthenticated: true }).valid).toBe(true);
  });

  it("accepts the semantic positive fixtures", () => {
    expect(validateStudentProfileSemantics(read("student-profile.valid.json")).valid).toBe(true);
    expect(validateTargetScenarioSemantics(read("target-scenario.valid.json")).valid).toBe(true);
    expect(validateMatchResultSemantics(read("match-result.valid.json")).valid).toBe(true);
  });

  it("requires the evidence index to be hashed in a release manifest", () => {
    const manifest = {
      manifest_version: "1.0.0",
      release_id: "synthetic-release-001",
      created_at: "2026-09-10T00:00:00Z",
      schema_version: "1.0.0",
      rules_version: "nh-rules-1.0.0",
      status: "PUBLISHED",
      synthetic: true,
      files: [
        {
          path: "data/offerings.json",
          sha256: "0".repeat(64),
          size_bytes: 2
        }
      ],
      coverage: [
        {
          scope_id: "synthetic-scope",
          year: 2026,
          track: "PHYSICS",
          batch: "undergraduate",
          stage: "B",
          admission_type: "general",
          published_offerings: 0,
          known_scope_total: null,
          exhaustive: false,
          missing_notes: ["合成测试"]
        }
      ],
      evidence_index_path: "data/evidence.json"
    };

    expect(validateStructure("data-release", manifest).valid).toBe(true);
    expect(validateDataReleaseSemantics(manifest).issues.map((item) => item.code)).toContain(
      "EVIDENCE_INDEX_NOT_LISTED"
    );
    manifest.files.push({
      path: "data/evidence.json",
      sha256: "1".repeat(64),
      size_bytes: 2
    });
    expect(validateDataReleaseSemantics(manifest).valid).toBe(true);
  });
});
