import type { DatasetMetadata } from "../types";
import { getDatasetQualityScore } from "./quality";

export interface TopDatasetsOptions {
  /** Sort order. Default: `"desc"` (highest quality first). */
  order?: "desc" | "asc";
  /**
   * Exclude datasets whose quality score is below this threshold (0–100).
   * Applied before sorting and slicing.
   */
  minScore?: number;
}

/**
 * Return the top `n` datasets ranked by quality score.
 *
 * The original array is never mutated. Ties are stable (preserved from the
 * input order).
 *
 * @example
 * // Best 5 datasets
 * const best = getTopDatasets(items, 5);
 *
 * @example
 * // Worst 3 datasets (lowest quality first)
 * const worst = getTopDatasets(items, 3, { order: "asc" });
 *
 * @example
 * // Top 10 datasets with at least a score of 70
 * const verified = getTopDatasets(items, 10, { minScore: 70 });
 */
export function getTopDatasets(
  datasets: DatasetMetadata[],
  n: number,
  options?: TopDatasetsOptions,
): DatasetMetadata[] {
  const order = options?.order ?? "desc";
  const minScore = options?.minScore;

  const pool =
    minScore !== undefined
      ? datasets.filter((ds) => getDatasetQualityScore(ds) >= minScore)
      : datasets;

  const sorted = pool.slice().sort((a, b) => {
    const diff = getDatasetQualityScore(b) - getDatasetQualityScore(a);
    return order === "desc" ? diff : -diff;
  });

  return sorted.slice(0, Math.max(0, n));
}
