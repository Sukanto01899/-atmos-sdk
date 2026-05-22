import type { DatasetMetadata } from "../types";

export interface RecentDatasetsOptions {
  /**
   * Which date field to sort on.
   * - `"collectionDate"` (default) — when the data was collected in the field.
   * - `"createdAt"` — when the dataset was registered on-chain.
   */
  dateField?: "collectionDate" | "createdAt";
}

/**
 * Return the `n` most recently dated datasets.
 *
 * The original array is never mutated. Datasets with a missing date sort to
 * the end (treated as epoch 0).
 *
 * @example
 * // Last 10 datasets by collection date
 * const latest = getRecentDatasets(items, 10);
 *
 * @example
 * // Last 5 datasets by on-chain registration date
 * const newest = getRecentDatasets(items, 5, { dateField: "createdAt" });
 */
export function getRecentDatasets(
  datasets: DatasetMetadata[],
  n: number,
  options?: RecentDatasetsOptions,
): DatasetMetadata[] {
  const field = options?.dateField ?? "collectionDate";

  return datasets
    .slice()
    .sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0))
    .slice(0, Math.max(0, n));
}
