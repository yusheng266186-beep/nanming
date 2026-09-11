import type { RankInterval, ReasonCode } from "./types.js";

export interface ExactDistributionRow {
  rowType: "exact";
  score: number;
  count: number;
  cumulative: number;
}

export interface AggregateDistributionRow {
  rowType: "aggregate_bin";
  label: string;
  cumulative: number;
}

export type RankLookupResult =
  | {
      status: "located";
      precision: "exact_score";
      rankInterval: RankInterval;
    }
  | {
      status: "aggregate";
      precision: "aggregate_bin";
      rankInterval: null;
      individualRank: null;
    }
  | {
      status: "unavailable";
      reason: Extract<ReasonCode, "NO_OBSERVED_SCORE" | "OUT_OF_DISTRIBUTION_COVERAGE">;
      rankInterval: null;
    };

export function rankIntervalForExactRow(
  count: number,
  cumulative: number
): RankInterval | null {
  if (!Number.isInteger(count) || !Number.isInteger(cumulative)) return null;
  if (count <= 0 || cumulative < count) return null;
  return [cumulative - count + 1, cumulative];
}

export function validateExactDistributionRow(
  row: Pick<ExactDistributionRow, "count" | "cumulative">
): boolean {
  return (
    Number.isInteger(row.count) &&
    Number.isInteger(row.cumulative) &&
    row.count >= 0 &&
    row.cumulative >= 0 &&
    row.cumulative >= row.count
  );
}

export function locateRank(input: {
  requestedScore: number;
  publishedMinScore: number;
  row?: ExactDistributionRow | AggregateDistributionRow;
}): RankLookupResult {
  if (input.requestedScore < input.publishedMinScore) {
    return {
      status: "unavailable",
      reason: "OUT_OF_DISTRIBUTION_COVERAGE",
      rankInterval: null
    };
  }
  if (!input.row) {
    return { status: "unavailable", reason: "NO_OBSERVED_SCORE", rankInterval: null };
  }
  if (input.row.rowType === "aggregate_bin") {
    return {
      status: "aggregate",
      precision: "aggregate_bin",
      rankInterval: null,
      individualRank: null
    };
  }
  if (input.row.count === 0) {
    return { status: "unavailable", reason: "NO_OBSERVED_SCORE", rankInterval: null };
  }
  const rankInterval = rankIntervalForExactRow(input.row.count, input.row.cumulative);
  if (!rankInterval) {
    throw new Error("INVALID_DISTRIBUTION_ROW");
  }
  return { status: "located", precision: "exact_score", rankInterval };
}

export function populationFromLastRow(input: {
  lastCumulative: number;
  tailOmitted: boolean;
}): number | null {
  return input.tailOmitted ? null : input.lastCumulative;
}
