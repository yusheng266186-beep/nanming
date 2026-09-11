// 从已发布数据构建匹配输入。
//
// 抽到共享包的原因与 release-loader 相同：项目有两套前端，而「加载哪些分片、用哪一年做参考、
// 组线与专业线分别取哪个指标」这些判断一旦在两套前端里各写一份，就会在某一套里悄悄出错。
// 两套前端都调用这里，因此它们对同一份发布数据给出同样的输入。
import {
  distributionRow, loadShard, referenceYearFor, shardsFor, convertShard,
  type LoadedRelease, type OfferingLabel,
} from "@nanhang/release-loader";
import type {
  BuildMatchResultInput, EvidenceDescriptor, ScoreDistributionSelection,
} from "@nanhang/domain";
import type { NanhangTargetScenario100 } from "@nanhang/contracts";

/** 一次匹配请求的参数。批次为空表示调用方未选择，退回默认批次。 */
export interface MatchRequest {
  track: "PHYSICS" | "HISTORY";
  score: number;
  targetYear: number;
  additional: readonly string[];
  hardBudget: number | null;
  confirmedDirections: readonly string[];
  /** 要搜索的批次。为空时使用 `defaultBatches`。 */
  batches?: readonly string[];
  hardRegions?: readonly string[];
}

/** 默认搜索批次：本科普通批。 */
export const DEFAULT_BATCHES: readonly string[] = ["本科批B段"];

/** 学生在页面上可以选择的批次，按页面展示顺序。 */
export const SELECTABLE_BATCHES = ["本科批B段", "高职(专科)批"] as const;

export async function buildPublishedInput(
  args: MatchRequest, release: LoadedRelease, signal?: AbortSignal
): Promise<{ input: BuildMatchResultInput; catalog: Record<string, OfferingLabel> } | null> {
  const wanted = args.batches && args.batches.length > 0 ? args.batches : DEFAULT_BATCHES;
  const entries = shardsFor(release, args.track, wanted);
  if (entries.length === 0) return null;
  const offerings = [];
  const evidenceIndex: EvidenceDescriptor[] = [];
  // Display names are carried alongside the matcher input so the page can show a school and major
  // by their offeringId. Keying by id (not list position) keeps one school's name from attaching
  // to another row once candidates are sorted or filtered.
  const catalog: Record<string, OfferingLabel> = {};
  for (const entry of entries) {
    const shard = await loadShard(release, entry.path, signal);
    const converted = convertShard(shard);
    offerings.push(...converted.offerings);
    evidenceIndex.push(...converted.evidenceIndex);
    Object.assign(catalog, converted.catalog);
  }
  if (offerings.length === 0) return null;

  // The rank lookup and the historical references must come from the same year, so the year is
  // chosen from the history actually present rather than from the plan year.
  const historyYears = new Set<number>();
  for (const offering of offerings) {
    for (const record of offering.history) historyYears.add(record.sourceYear);
  }
  const year = referenceYearFor(release, args.track, [...historyYears]);
  if (year === null) throw new Error("NO_COMPARABLE_REFERENCE_YEAR");
  const table = release.distributions.find(
    (item) => item.year === year && item.track === args.track);
  if (!table) throw new Error("NO_DISTRIBUTION_FOR_REFERENCE_YEAR");
  const row = distributionRow(table, args.score);
  if (!row) throw new Error("SCORE_NOT_IN_PUBLISHED_TABLE");

  const distribution: ScoreDistributionSelection = {
    recordStatus: "PUBLISHED", releaseId: release.manifest.release_id,
    distributionId: table.distributionId, year: table.year, province: "SC",
    track: args.track, scoreBasis: "gaokao_cultural",
    publishedMinScore: table.publishedMinScore, row,
    evidenceIds: [`EV-DISTRIBUTION-${table.distributionId}`]
  };
  evidenceIndex.push({ evidenceId: `EV-DISTRIBUTION-${table.distributionId}`,
    subjectType: "distribution", subjectId: table.distributionId });

  const scenario: NanhangTargetScenario100 = {
    scenario_version: "1.0.0", scenario_id: `${release.manifest.release_id}-${args.targetYear}-${args.score}`,
    target_exam_year: args.targetYear, reference_year: table.year, province: "SC",
    track: args.track, target_score: args.score, score_basis: "gaokao_cultural",
    release_id: release.manifest.release_id
  };
  // The matcher compares against one reference year at a time and treats more than one record for
  // the same subject and metric as a conflict, so each offering keeps only the chosen year's
  // history. Earlier years stay in the release and are reachable by changing the reference year.
  const scoped = offerings.map((offering) => ({
    ...offering,
    history: offering.history.filter((record) => record.sourceYear === table.year),
  }));
  // The evidence index is filtered to the records this run can actually cite. Resolving that with
  // a nested scan is O(evidence × offerings) — over a hundred million comparisons for one real
  // batch, which blocked the page for minutes — so the ids go into a set first.
  const citedEvidence = new Set<string>();
  for (const offering of scoped) {
    for (const evidenceId of offering.evidenceIds) citedEvidence.add(evidenceId);
    // History records cite their own ids, which the reference check resolves separately, so they
    // must survive this filter too.
    for (const record of offering.history) {
      for (const evidenceId of record.evidenceIds) citedEvidence.add(evidenceId);
    }
  }
  const scopedEvidence = evidenceIndex.filter((descriptor) =>
    descriptor.subjectType === "distribution" || citedEvidence.has(descriptor.evidenceId));
  const scopeIds = [...new Set(offerings.map((item) => item.scopeId))];
  const supportedAdmissionTypes = [...new Set(offerings.map((item) => item.admissionType))];
  return { input: {
    runId: `run-${release.manifest.release_id}-${args.targetYear}-${args.score}`,
    inputRevision: 1, mode: "exploration", rulesVersion: "nh-rules-1.0.0",
    scenario, release: release.manifest, scopeIds, distribution, evidenceIndex: scopedEvidence,
    selection: { primary: args.track, additional: [...args.additional] },
    supportedAdmissionTypes,
    preferences: {
      directionPriority: [...args.confirmedDirections], sortBy: "direction",
      // The workbook records a group 最低分 under its own header, which is group_admission_min.
      // The matcher's default is group_filing_min (投档最低), a different metric that this source
      // does not contain; leaving the default in place made every group reference report
      // GROUP_HISTORY_MISSING even though the group's history was present.
      groupMetric: "group_admission_min",
      ...(args.hardBudget === null ? {} : { hardBudget: args.hardBudget }),
      ...(args.hardRegions && args.hardRegions.length > 0 ? { hardRegions: [...args.hardRegions] } : {}),
    },
    offerings: scoped
  }, catalog };
}
