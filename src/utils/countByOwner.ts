import type { DatasetMetadata } from "../types";

/**
 * Count how many datasets belong to each `owner`.
 *
 * Returns a plain object mapping each owner string to its frequency, sorted
 * by count descending. Datasets with a missing or blank `owner` are counted
 * under `"unknown"`.
 *
 * @example
 * const counts = countByOwner(items);
 * // { "SP1ABC...": 14, "SP2DEF...": 6, unknown: 1 }
 *
 * @example
 * // Top owner
 * const [[topOwner, n]] = Object.entries(countByOwner(items));
 * console.log(`${topOwner} has ${n} datasets`);
 */
export function countByOwner(
  datasets: DatasetMetadata[],
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const ds of datasets) {
    const key = ds.owner?.trim() || "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => b[1] - a[1]),
  );
}
