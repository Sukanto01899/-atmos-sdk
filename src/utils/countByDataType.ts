import type { DatasetMetadata } from "../types";

/**
 * Count how many datasets belong to each `dataType`.
 *
 * Returns a plain object mapping each data-type string to its frequency.
 * Datasets with a missing or blank `dataType` are counted under `"unknown"`.
 *
 * The result is sorted by count descending so the most common type comes first.
 *
 * @example
 * const counts = countByDataType(items);
 * // { csv: 12, imagery: 5, lidar: 3, unknown: 1 }
 *
 * @example
 * // Render as a list
 * Object.entries(countByDataType(items)).forEach(([type, n]) => {
 *   console.log(`${type}: ${n}`);
 * });
 */
export function countByDataType(
  datasets: DatasetMetadata[],
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const ds of datasets) {
    const key = ds.dataType?.trim() || "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => b[1] - a[1]),
  );
}
