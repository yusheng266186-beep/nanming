import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateMatchResultSemantics, validateStructure } from "@nanhang/contracts";
import { buildMatchResult, type BuildMatchResultInput, type EvidenceDescriptor,
  type MatchingOffering } from "@nanhang/domain";
import {
  convertShard, distributionRow, referenceYearFor, shardsFor,
  type ComparabilityRecord, type DistributionTable, type LoadedRelease,
} from "../src/release-loader.js";
import { axisMarks, batchOfferings, scorePosition } from "../src/model.js";
import { buildReleaseCatalog, buildSchoolPool } from "../src/journey-model.js";

/**
 * Integration coverage for the published release.
 *
 * The unit tests elsewhere use synthetic fixtures. These read the actual exported release from
 * disk, so a change to the export format that the loader does not follow fails here instead of
 * silently producing an empty result in the page. The release is a build product; when it is
 * absent (a clean checkout without running the export) the suite skips rather than failing.
 */
const releaseRoot = resolve(import.meta.dirname, "../../../data/releases");
const currentPointer = resolve(releaseRoot, "current.json");
const available = existsSync(currentPointer);

interface ManifestFile { path: string; sha256: string; size_bytes: number }
interface CoverageEntry {
  scope_id: string; year: number; track: "PHYSICS" | "HISTORY"; batch: string;
  stage: string | null; admission_type: string; published_offerings: number;
  known_scope_total: number | null; exhaustive: boolean; missing_notes: string[];
}
interface Manifest {
  manifest_version: "1.0.0"; release_id: string; created_at: string;
  schema_version: "1.0.0"; rules_version: "nh-rules-1.0.0";
  status: "PUBLISHED" | "WITHDRAWN"; synthetic: boolean;
  // The frozen schema requires at least one file and one coverage entry, so the tuple types
  // mirror that rather than using a bare array.
  files: [ManifestFile, ...ManifestFile[]];
  coverage: [CoverageEntry, ...CoverageEntry[]];
  evidence_index_path: string;
}
interface IndexEntry {
  path: string; scopeId: string; track: "PHYSICS" | "HISTORY"; batch: string;
  admissionType: string; offerings: number; part: number; partCount: number;
}
interface ComparabilityFile { records: ComparabilityRecord[] }

let cachedDir: string | null = null;
function dirPath(): string {
  if (cachedDir === null) cachedDir = loadRelease().dir;
  return cachedDir;
}

function loadRelease() {
  const pointer = JSON.parse(readFileSync(currentPointer, "utf8"));
  const dir = resolve(releaseRoot, pointer.current);
  const manifest: Manifest = JSON.parse(readFileSync(resolve(dir, "manifest.json"), "utf8"));
  const index: { shards: IndexEntry[] } = JSON.parse(readFileSync(resolve(dir, "index.json"), "utf8"));
  const distributions: { tables: DistributionTable[] } =
    JSON.parse(readFileSync(resolve(dir, "distributions.json"), "utf8"));
  const comparability: ComparabilityFile =
    JSON.parse(readFileSync(resolve(dir, "comparability.json"), "utf8"));
  return { dir, manifest, index, distributions: distributions.tables,
           comparability: comparability.records };
}

const describeIf = available ? describe : describe.skip;

describeIf("published release integration", () => {
  it("exports a manifest whose coverage is internally consistent", () => {
    const { manifest, index } = loadRelease();
    expect(manifest.manifest_version).toBe("1.0.0");
    expect(manifest.status).toBe("PUBLISHED");
    expect(manifest.synthetic).toBe(false);
    expect(manifest.release_id).toMatch(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/);
    expect(manifest.files.length).toBeGreaterThan(0);

    // Every shard in the index is declared in the manifest's file list, and every coverage entry
    // corresponds to at least one shipped shard. Neither list may drift from the other.
    const files = new Set(manifest.files.map((item) => item.path));
    for (const shard of index.shards) expect(files.has(shard.path)).toBe(true);
    const coverageScopes = new Set(manifest.coverage.map((item) => item.scope_id));
    for (const shard of index.shards) expect(coverageScopes.has(shard.scopeId)).toBe(true);
    const indexScopes = new Set(index.shards.map((item) => item.scopeId));
    for (const coverage of manifest.coverage) expect(indexScopes.has(coverage.scope_id)).toBe(true);

    // The published offering count per scope matches what the shards actually carry.
    const counted = new Map<string, number>();
    for (const shard of index.shards) {
      counted.set(shard.scopeId, (counted.get(shard.scopeId) ?? 0) + shard.offerings);
    }
    for (const coverage of manifest.coverage) {
      expect(counted.get(coverage.scope_id)).toBe(coverage.published_offerings);
    }
  });

  it("serves distribution tables whose rows carry a derivable rank interval", () => {
    const { distributions } = loadRelease();
    expect(distributions.length).toBeGreaterThan(0);
    for (const table of distributions) {
      expect(table.rows.length).toBeGreaterThan(0);
      const scores = table.rows.map((row) => row.score);
      // A published table is laid out from the top score down, and its cumulative count rises as
      // the score falls. Both properties are what make a rank interval meaningful.
      for (let index = 1; index < scores.length; index += 1) {
        expect(scores[index]!).toBeLessThan(scores[index - 1]!);
        const previous = table.rows[index - 1]!;
        const current = table.rows[index]!;
        if (previous.cumulative !== null && current.cumulative !== null) {
          expect(current.cumulative).toBeGreaterThan(previous.cumulative);
        }
      }
      for (const row of table.rows) {
        if (row.count === null || row.cumulative === null) {
          expect(row.rankInterval).toBeNull();
          continue;
        }
        expect(row.rankInterval).toEqual([
          row.cumulative - row.count + 1, row.cumulative,
        ]);
        expect(row.rankInterval![0]).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("loads a shard, converts it, and produces candidates against published history", () => {
    const { dir, manifest, index, distributions } = loadRelease();
    // A mid-sized shard keeps the test fast while still exercising real rows and real history.
    const candidates = index.shards
      .filter((shard) => shard.track === "PHYSICS" && shard.batch === "本科批B段"
        && shard.offerings > 200)
      .sort((left, right) => left.offerings - right.offerings);
    const shard = candidates[0] ?? index.shards
      .filter((item) => item.track === "PHYSICS")
      .sort((left, right) => left.offerings - right.offerings)[0];
    expect(shard).toBeDefined();

    const raw = JSON.parse(readFileSync(resolve(dir, shard!.path), "utf8"));
    const converted = convertShard(raw);
    expect(converted.offerings.length).toBe(shard!.offerings);
    expect(converted.evidenceIndex.length).toBeGreaterThan(0);

    const offering = converted.offerings.find((item) => item.history.length > 0);
    expect(offering).toBeDefined();

    // The reference year must be one that has both history and a published table.
    const historyYears = new Set(converted.offerings.flatMap((item) =>
      item.history.map((record) => record.sourceYear)));
    const tableYears = new Set(distributions
      .filter((table) => table.track === "PHYSICS").map((table) => table.year));
    const referenceYear = Math.max(...[...historyYears].filter((year) => tableYears.has(year)));
    expect(Number.isFinite(referenceYear)).toBe(true);
    const table = distributions.find(
      (item) => item.year === referenceYear && item.track === "PHYSICS");
    expect(table).toBeDefined();
    const score = 690;
    const row = distributionRow(table!, score);
    expect(row).not.toBeNull();

    const scoped: MatchingOffering[] = converted.offerings.map((item) => ({
      ...item,
      history: item.history.filter((record) => record.sourceYear === referenceYear),
    }));
    // Only an established link may be compared. Rows from a year without one must come back as
    // NOT_COMPARABLE rather than borrowing another year's relation.
    for (const offering of scoped) {
      for (const record of offering.history) {
        expect(record.comparability).toBe("COMPARABLE");
      }
    }
    // Mirrors buildPublishedInput: the kept ids are the offerings' own citations plus every
    // history record's, because the matcher resolves those two roles separately. Filtering on the
    // offering ids alone drops the history descriptors and every reference degrades to
    // *_HISTORY_MISSING.
    const keptIds = new Set<string>();
    for (const offering of scoped) {
      for (const evidenceId of offering.evidenceIds) keptIds.add(evidenceId);
      for (const record of offering.history) {
        for (const evidenceId of record.evidenceIds) keptIds.add(evidenceId);
      }
    }
    const evidenceIndex: EvidenceDescriptor[] = converted.evidenceIndex.filter((descriptor) =>
      keptIds.has(descriptor.evidenceId));
    evidenceIndex.push({ evidenceId: `EV-DISTRIBUTION-${table!.distributionId}`,
      subjectType: "distribution", subjectId: table!.distributionId });

    const coverage = manifest.coverage.find((item) => item.scope_id === shard!.scopeId);
    expect(coverage).toBeDefined();
    const input: BuildMatchResultInput = {
      runId: "test-release-run", inputRevision: 1, mode: "exploration",
      rulesVersion: "nh-rules-1.0.0",
      scenario: {
        scenario_version: "1.0.0", scenario_id: "test-release-scenario",
        target_exam_year: 2027, reference_year: referenceYear, province: "SC",
        track: "PHYSICS", target_score: score, score_basis: "gaokao_cultural",
        release_id: manifest.release_id,
      },
      release: manifest,
      scopeIds: [shard!.scopeId],
      distribution: {
        recordStatus: "PUBLISHED", releaseId: manifest.release_id,
        distributionId: table!.distributionId, year: table!.year, province: "SC",
        track: "PHYSICS", scoreBasis: "gaokao_cultural",
        publishedMinScore: table!.publishedMinScore, row: row!,
        evidenceIds: [`EV-DISTRIBUTION-${table!.distributionId}`],
      },
      evidenceIndex,
      selection: { primary: "PHYSICS", additional: ["CHEMISTRY", "BIOLOGY"] },
      supportedAdmissionTypes: [shard!.admissionType],
      // Mirrors buildPublishedInput: the workbook's group column is 组最低分, recorded as
      // group_admission_min. The matcher would otherwise default to group_filing_min, a metric
      // this source does not contain.
      preferences: { sortBy: "direction", groupMetric: "group_admission_min" },
      offerings: scoped,
    };
    const result = buildMatchResult(input);
    expect(validateStructure("match-result", result).valid).toBe(true);
    expect(validateMatchResultSemantics(result).valid).toBe(true);
    // The rank must have been located, so the run is comparing against published numbers rather
    // than reporting NO_OBSERVED_SCORE for every candidate.
    expect(result.warnings).not.toContain("NO_OBSERVED_SCORE");
    expect(result.candidates.length).toBeGreaterThan(0);
    for (const candidate of result.candidates) {
      expect(candidate.eligibility.status).not.toBe("FAIL");
      expect(candidate.eligibility.reason_codes).not.toContain("SUBJECT_REQUIREMENT_FAILED");
    }

    // The references must actually compare. Asserting only that candidates exist let two bugs
    // through: an empty offering evidence list (every candidate excluded as SOURCE_CONFLICT) and
    // group history registered under the wrong subject (every reference degraded to
    // NOT_COMPARABLE). Both produced "results" while showing the student nothing usable.
    expect(result.excluded_summary.map((item) => item.reason_code))
      .not.toContain("SOURCE_CONFLICT");
    const compared = result.candidates.filter((candidate) =>
      candidate.group_reference.relation !== "NOT_COMPARABLE"
      || candidate.major_reference.relation !== "NOT_COMPARABLE");
    expect(compared.length).toBeGreaterThan(0);
    for (const candidate of compared) {
      if (candidate.group_reference.relation !== "NOT_COMPARABLE") {
        expect(candidate.group_reference.reason_codes).toEqual([]);
        expect(candidate.group_reference.reference_rank_interval).not.toBeNull();
        // The relation must be one the closed-interval comparison can produce, and the interval
        // must be the candidate's own, not the reference's.
        expect(["AHEAD_OF_REFERENCE", "BEHIND_REFERENCE", "OVERLAPS_REFERENCE"])
          .toContain(candidate.group_reference.relation);
        expect(candidate.group_reference.candidate_rank_interval).not.toBeNull();
      }
    }
    // Every cited id must resolve with the subject the matcher asks for; a missing or
    // wrong-subject descriptor is what silently degrades a reference.
    const byId = new Map(evidenceIndex.map((item) => [item.evidenceId, item]));
    for (const offering of scoped) {
      for (const evidenceId of offering.evidenceIds) {
        const descriptor = byId.get(evidenceId);
        expect(descriptor, `offering ${offering.offeringId} cites ${evidenceId}`).toBeDefined();
        expect(descriptor!.subjectType).toBe("offering");
        expect(descriptor!.subjectId).toBe(offering.offeringId);
      }
      for (const record of offering.history) {
        for (const evidenceId of record.evidenceIds) {
          const descriptor = byId.get(evidenceId);
          expect(descriptor, `history ${record.subjectId} cites ${evidenceId}`).toBeDefined();
          expect(descriptor!.subjectType).toBe(record.subjectType);
          expect(descriptor!.subjectId).toBe(record.subjectId);
          expect(descriptor!.metricType).toBe(record.metricType);
        }
      }
    }
  });
  it("records a comparability decision for every year that has a published table", () => {
    const { comparability, distributions } = loadRelease();
    // A year with a table but no decision would let a reader assume comparability from the year
    // alone, which is the failure this file guards against: either the comparison is established
    // with a named reviewer, or it is explicitly not established.
    // The workbook files each year's history under a specific published track: the physics sheet
    // carries 物理类 for 2025 and 理科 for 2024/2023, the history sheet 历史类 and 文科. A decision
    // is required for each of those pairs that has a published table — 2023 published only a 理科
    // table, so the history sheet has nothing to decide for that year.
    const historyTracks: Record<string, Record<number, string>> = {
      PHYSICS: { 2025: "PHYSICS", 2024: "SCIENCE", 2023: "SCIENCE" },
      HISTORY: { 2025: "HISTORY", 2024: "ARTS", 2023: "ARTS" },
    };
    const published = new Set(distributions.map((table) => `${table.year}|${table.track}`));
    for (const planTrack of ["PHYSICS", "HISTORY"] as const) {
      const decided = new Map(comparability
        .filter((record) => record.plan_track === planTrack)
        .map((record) => [`${record.history_year}|${record.history_track}`, record]));
      for (const [yearText, tableTrack] of Object.entries(historyTracks[planTrack]!)) {
        const key = `${yearText}|${tableTrack}`;
        if (!published.has(key)) continue; // no table for that year and system: nothing to decide
        expect(decided.has(key)).toBe(true);
        expect(decided.get(key)!.history_track).toBe(tableTrack);
      }
      for (const record of comparability.filter((item) => item.plan_track === planTrack)) {
        expect(["VERIFIED", "NOT_ESTABLISHED", "QUARANTINED"]).toContain(record.status);
        expect(record.basis.length).toBeGreaterThan(0);
        if (record.status === "VERIFIED") {
          // An established comparison must name who established it and what was examined, and it
          // must state what was not examined rather than leaving that blank.
          expect(record.reviewer).toBeTruthy();
          expect(record.review_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(record.examined.length).toBeGreaterThan(0);
          expect(record.not_examined && record.not_examined.length).toBeGreaterThan(0);
          expect(record.evidence_ids).toBeTruthy();
        } else {
          expect(record.reviewer).toBeNull();
        }
      }
    }
  });

  it("only selects a reference year whose comparison is established", () => {
    const { manifest, index, distributions, comparability } = loadRelease();
    const release: LoadedRelease = {
      manifest, index, distributions, comparability, basePath: "",
    };
    for (const planTrack of ["PHYSICS", "HISTORY"] as const) {
      const years = [2023, 2024, 2025, 2026];
      const year = referenceYearFor(release, planTrack, years);
      expect(year).toBe(2025);
      // 2024/2023 have tables and history but are the 文理分科 system, so they must not be chosen
      // even though they are present and would otherwise look usable.
      expect(year).not.toBe(2024);
      expect(year).not.toBe(2023);
    }
  });

  it("does not present an unestablished year as comparable", () => {
    const { dir, manifest, index, distributions, comparability } = loadRelease();
    const shard = index.shards
      .filter((item) => item.track === "PHYSICS" && item.offerings > 200)
      .sort((left, right) => left.offerings - right.offerings)[0];
    const raw = JSON.parse(readFileSync(resolve(dir, shard!.path), "utf8"));
    const converted = convertShard(raw);
    const unestablished = comparability.find(
      (record) => record.plan_track === "PHYSICS" && record.status === "NOT_ESTABLISHED");
    expect(unestablished).toBeDefined();
    // The loader must carry the recorded status through. A 2024/2023 record that arrives as
    // COMPARABLE would be the silent upgrade this test exists to prevent.
    const year = unestablished!.history_year;
    const record = converted.offerings
      .flatMap((offering) => offering.history)
      .find((item) => item.sourceYear === year);
    if (record) expect(record.comparability).toBe("NOT_ESTABLISHED");
    const release: LoadedRelease = {
      manifest, index, distributions, comparability, basePath: "",
    };
    const chosen = referenceYearFor(release, "PHYSICS", [year]);
    expect(chosen).toBeNull();
  });
  it("limits a match to the batches the student selected", () => {
    const { manifest, index, distributions, comparability } = loadRelease();
    const release: LoadedRelease = { manifest, index, distributions, comparability, basePath: "" };
    // The selection changes which shards are read, so the scope set must follow it exactly:
    // asking for one batch must not quietly pull in the other.
    const undergraduate = shardsFor(release, "PHYSICS", ["本科批B段"]);
    const vocational = shardsFor(release, "PHYSICS", ["高职(专科)批"]);
    const both = shardsFor(release, "PHYSICS", ["本科批B段", "高职(专科)批"]);

    expect(undergraduate.length).toBeGreaterThan(0);
    expect(vocational.length).toBeGreaterThan(0);
    expect(both.length).toBe(undergraduate.length + vocational.length);
    expect(undergraduate.every((entry) => entry.batch === "本科批B段")).toBe(true);
    expect(vocational.every((entry) => entry.batch === "高职(专科)批")).toBe(true);
    // No scope may appear in both selections.
    const undergradScopes = new Set(undergraduate.map((entry) => entry.scopeId));
    expect(vocational.some((entry) => undergradScopes.has(entry.scopeId))).toBe(false);

    // Choosing one batch must fetch strictly less than choosing both, which is the point of the
    // control: the student's choice sets the download.
    const bytes = (entries: readonly { path: string }[]) => entries.reduce(
      (total, entry) => total + readFileSync(resolve(dirPath(), entry.path)).length, 0);
    expect(bytes(undergraduate)).toBeLessThan(bytes(both));
    expect(bytes(vocational)).toBeLessThan(bytes(both));
  });

  it("reports the offering count for each selectable batch", () => {
    const { manifest, index, distributions, comparability } = loadRelease();
    const release: LoadedRelease = { manifest, index, distributions, comparability, basePath: "" };
    for (const batch of ["本科批B段", "高职(专科)批"]) {
      const count = batchOfferings(release, "PHYSICS", batch);
      expect(count).toBeGreaterThan(0);
      // The figure shown to the student must equal what the coverage actually publishes, so the
      // label cannot drift from the data it describes.
      const declared = manifest.coverage
        .filter((item) => item.track === "PHYSICS" && item.batch === batch)
        .reduce((total, item) => total + item.published_offerings, 0);
      expect(count).toBe(declared);
      const shipped = index.shards
        .filter((item) => item.track === "PHYSICS" && item.batch === batch)
        .reduce((total, item) => total + item.offerings, 0);
      expect(declared).toBe(shipped);
    }
    // A track that is not selected yields no count rather than a misleading zero.
    expect(batchOfferings(release, null, "本科批B段")).toBeNull();
  });

  it("converts a score into the rank the published table actually lists", () => {
    const { manifest, index, distributions, comparability } = loadRelease();
    const release: LoadedRelease = { manifest, index, distributions, comparability, basePath: "" };
    const physics = distributions.filter((item) => item.track === "PHYSICS");
    const reference = referenceYearFor(release, "PHYSICS", physics.map((item) => item.year));
    expect(reference).toBe(2025);
    const table = physics.find((item) => item.year === reference)!;
    // Take a row the table really contains so the expectation comes from the data, not a constant.
    const row = table.rows.find((item) => item.count !== null && item.cumulative !== null
      && item.score > table.publishedMinScore)!;

    const position = scorePosition(release, "PHYSICS", row.score);
    expect(position).not.toBeNull();
    expect(position!.tableYear).toBe(reference);
    expect(position!.rank).toBe(row.cumulative);
    expect(position!.count).toBe(row.count);
    // The percentile is that rank against the deepest cumulative count in the same table.
    const total = table.rows.reduce(
      (max, item) => item.cumulative !== null && item.cumulative > max ? item.cumulative : max, 0);
    expect(position!.total).toBe(total);
    expect(position!.percentile).toBeCloseTo(row.cumulative! / total * 100, 6);
    // The published range is carried through so the page can draw it instead of inventing a line.
    expect(position!.publishedMinScore).toBe(table.publishedMinScore);
    expect(position!.publishedMaxScore).toBe(table.publishedMaxScore);
    expect(position!.isReferenceYear).toBe(true);
  });

  it("keeps the rank unknown when the score is outside the published rows", () => {
    const { manifest, index, distributions, comparability } = loadRelease();
    const release: LoadedRelease = { manifest, index, distributions, comparability, basePath: "" };
    const table = distributions.find((item) => item.track === "PHYSICS" && item.year === 2025)!;
    // Below the published minimum must stay unknown: no extrapolation.
    expect(scorePosition(release, "PHYSICS", table.publishedMinScore - 1)).toBeNull();
    // A score the table skips must stay unknown too: no interpolation.
    const listed = new Set(table.rows.map((item) => item.score));
    const skipped = table.rows.map((item) => item.score)
      .filter((score) => score - 1 >= table.publishedMinScore && !listed.has(score - 1));
    expect(skipped.length).toBeGreaterThan(0);
    expect(scorePosition(release, "PHYSICS", skipped[0]! - 1)).toBeNull();
    // Without a release, a track or a score there is nothing to convert.
    expect(scorePosition(null, "PHYSICS", 600)).toBeNull();
    expect(scorePosition(release, null, 600)).toBeNull();
    expect(scorePosition(release, "PHYSICS", null)).toBeNull();
  });

  it("marks the axis with published bounds rather than an invented control line", () => {
    const { manifest, index, distributions, comparability } = loadRelease();
    const release: LoadedRelease = { manifest, index, distributions, comparability, basePath: "" };
    const marks = axisMarks(release, "PHYSICS", 600);
    const table = distributions.find((item) => item.track === "PHYSICS" && item.year === 2025)!;
    // Both ends of the published range are present, and both are real published scores.
    const scores = marks.filter((mark) => mark.major).map((mark) => mark.score);
    expect(scores).toContain(table.publishedMinScore);
    expect(scores).toContain(table.publishedMaxScore);
    // Labels must say what the number is; a bare number with no provenance is not acceptable.
    for (const mark of marks) expect(mark.label.length).toBeGreaterThan(0);
    // The labels must not claim a control line the release does not publish.
    for (const mark of marks) {
      expect(mark.label).not.toContain("本科线");
      expect(mark.label).not.toContain("特控线");
    }
    // Nothing is emitted without a release to read the bounds from.
    expect(axisMarks(null, "PHYSICS", 600)).toEqual([]);
    expect(axisMarks(release, null, 600)).toEqual([]);
  });

  it("carries the workbook's own category onto the offering label", () => {
    const { index } = loadRelease();
    const entry = index.shards.find((item) => item.track === "PHYSICS" && item.batch === "本科批B段")!;
    const shard = JSON.parse(readFileSync(resolve(dirPath(), entry.path), "utf8"));
    const converted = convertShard(shard);
    const labels = Object.values(converted.catalog);
    const withCategory = labels.filter((label) => label.category !== null);
    // The field must come through for the rows that have one, and stay null where the workbook
    // left it blank — never a placeholder string.
    expect(withCategory.length).toBeGreaterThan(0);
    expect(labels.filter((label) => label.category === null)
      .every((label) => label.category === null)).toBe(true);
    // Every category that appears must be one the source actually used.
    const sourceCategories = new Set<string>(shard.offerings
      .map((row: { category?: unknown }) => row.category)
      .filter((value: unknown): value is string => typeof value === "string" && value.length > 0));
    for (const label of withCategory) expect(sourceCategories.has(label.category!)).toBe(true);
    // Institution tags likewise come through verbatim for the schools that have them.
    const tagged = labels.filter((label) => label.institutionTags !== null);
    expect(tagged.length).toBeGreaterThan(0);
  });

  it("发布包级专业类目录与分数区间无关：覆盖该科类批次下的全部真实专业", async () => {
    const { dir, manifest, index, distributions, comparability } = loadRelease();
    const release: LoadedRelease = { manifest, index, distributions, comparability, basePath: "test-release://r" };
    // buildPublishedInput 按 index 里的路径去取 offering 分片；测试桩把请求落回磁盘上的发布目录。
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const relative = String(input).replace("test-release://r/", "");
      return new Response(readFileSync(resolve(dir, relative), "utf8"), { status: 200 });
    }) as typeof fetch;
    try {
      // 「方向」页的目录：先定方向、再按分数匹配，所以目录不能依赖院校池。
      const catalog = await buildReleaseCatalog(release, "PHYSICS", ["CHEMISTRY", "BIOLOGY"], ["本科批B段"]);
      expect(catalog.directions.length).toBeGreaterThan(10);
      expect(catalog.majors.length).toBeGreaterThanOrEqual(catalog.directions.length);
      // 与窄分数区间的院校池对比：池只含区间内命中的专业类，目录必须包含池外条目。
      const pool = await buildSchoolPool(
        release, "PHYSICS", ["CHEMISTRY", "BIOLOGY"], { low: 685, high: 691, basis: "t" }, ["本科批B段"]);
      const poolDirs = new Set(pool.directions.map((entry) => entry.id));
      expect(catalog.directions.length).toBeGreaterThanOrEqual(pool.directions.length);
      expect(catalog.directions.some((entry) => !poolDirs.has(entry.id))).toBe(true);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
