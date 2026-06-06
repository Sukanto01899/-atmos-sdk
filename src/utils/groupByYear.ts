import type { DatasetMetadata } from "../types";

export interface GroupByYearOptions {
  /**
   * Which unix-second timestamp field to bucket on. Default: `"collectionDate"`.
   */
  field?: "collectionDate" | "createdAt";
}

/**
 * Group datasets by the UTC calendar year of a timestamp field, into a `Map`
 * keyed by year (number) in ascending order.
 *
 * Datasets whose chosen field is missing or non-positive are skipped, since they
 * have no meaningful year. Datasets within a year keep their source order. The
 * input is not mutated.
 *
 * @example
 * const byYear = groupDatasetsByYear(items);
 * byYear.get(2024); // datasets collected in 2024
 *
 * @example
 * // Bucket by registration year instead
 * const byYear = groupDatasetsByYear(items, { field: "createdAt" });
 */
export function groupDatasetsByYear(
  datasets: DatasetMetadata[],
  options?: GroupByYearOptions,
): Map<number, DatasetMetadata[]> {
  const field = options?.field ?? "collectionDate";
  const byYear = new Map<number, DatasetMetadata[]>();

  for (const ds of datasets) {
    const seconds = ds[field];
    if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
      continue;
    }
    const year = new Date(seconds * 1000).getUTCFullYear();
    const existing = byYear.get(year);
    if (existing) existing.push(ds);
    else byYear.set(year, [ds]);
  }

  return new Map([...byYear.entries()].sort((a, b) => a[0] - b[0]));
}
