import type { DatasetMetadata, DatasetStatus } from "../types";

/**
 * Count how many datasets have each `status` value.
 *
 * Returns a plain object mapping each status string to its frequency, sorted
 * by count descending. Datasets with a missing status are counted under
 * `"unknown"`.
 *
 * Pairs well with `countByDataType` when you want a full breakdown of a
 * dataset collection.
 *
 * @example
 * const counts = countByStatus(items);
 * // { verified: 8, active: 5, pending: 2, deprecated: 1 }
 *
 * @example
 * // Check ratio of verified datasets
 * const { verified = 0 } = countByStatus(items);
 * const pct = ((verified / items.length) * 100).toFixed(1);
 * console.log(`${pct}% verified`);
 */
export function countByStatus(
  datasets: DatasetMetadata[],
): Partial<Record<DatasetStatus | "unknown", number>> {
  const counts: Partial<Record<DatasetStatus | "unknown", number>> = {};

  for (const ds of datasets) {
    const key = (ds.status ?? "unknown") as DatasetStatus | "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number)),
  ) as Partial<Record<DatasetStatus | "unknown", number>>;
}
