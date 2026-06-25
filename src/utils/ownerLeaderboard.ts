import type { DatasetMetadata } from "../types";
import { groupDatasetsByOwner } from "./groupByOwner";
import { getDatasetsQualityStats } from "./quality";

export interface OwnerLeaderboardEntry {
  /** Owner address, or `"unknown"` for datasets with a missing/blank owner. */
  owner: string;
  /** Number of datasets owned. */
  count: number;
  /** Mean `getDatasetQualityScore` across the owner's datasets. */
  averageQualityScore: number;
  /** Median `getDatasetQualityScore` across the owner's datasets. */
  medianQualityScore: number;
}

export interface OwnerLeaderboardOptions {
  /**
   * Rank by average quality score (default) or by dataset count.
   * Ties are broken by the other metric, descending.
   */
  sortBy?: "quality" | "count";
  /** Cap the number of owners returned. Default: no limit. */
  limit?: number;
}

/**
 * Rank owners by dataset count and quality, composing `groupDatasetsByOwner`
 * with `getDatasetsQualityStats`.
 *
 * Sorted by average quality score descending by default; pass
 * `{ sortBy: "count" }` to rank by volume instead. Datasets with a missing
 * or blank owner are grouped under `"unknown"`, same as `groupDatasetsByOwner`.
 *
 * @example
 * const leaderboard = getOwnerLeaderboard(items, { limit: 5 });
 * // [{ owner: "SP1ABC...", count: 12, averageQualityScore: 82.5, medianQualityScore: 85 }, ...]
 *
 * @example
 * // Rank the most prolific owners instead of the highest-quality ones
 * const byVolume = getOwnerLeaderboard(items, { sortBy: "count" });
 */
export function getOwnerLeaderboard(
  datasets: DatasetMetadata[],
  options?: OwnerLeaderboardOptions,
): OwnerLeaderboardEntry[] {
  const sortBy = options?.sortBy ?? "quality";
  const byOwner = groupDatasetsByOwner(datasets);

  const entries: OwnerLeaderboardEntry[] = [];
  for (const [owner, ownerDatasets] of byOwner) {
    const stats = getDatasetsQualityStats(ownerDatasets);
    if (!stats) continue;
    entries.push({
      owner,
      count: stats.count,
      averageQualityScore: stats.average,
      medianQualityScore: stats.median,
    });
  }

  entries.sort((a, b) =>
    sortBy === "count"
      ? b.count - a.count || b.averageQualityScore - a.averageQualityScore
      : b.averageQualityScore - a.averageQualityScore || b.count - a.count,
  );

  return options?.limit != null && options.limit > 0
    ? entries.slice(0, options.limit)
    : entries;
}
