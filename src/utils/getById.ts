import type { DatasetId, DatasetMetadata } from "../types";

/**
 * Find the first dataset whose `id` matches the given value.
 * Returns `undefined` when no match is found.
 *
 * The comparison is string-based so numeric IDs are coerced automatically:
 * `getDatasetById(items, 42)` and `getDatasetById(items, "42")` both work.
 *
 * @example
 * const ds = getDatasetById(items, "42");
 * if (ds) console.log(ds.name);
 *
 * @example
 * // Works with numeric IDs too
 * const ds = getDatasetById(items, 7);
 */
export function getDatasetById(
  datasets: DatasetMetadata[],
  id: DatasetId | number,
): DatasetMetadata | undefined {
  const needle = String(id);
  return datasets.find((ds) => String(ds.id ?? "") === needle);
}
