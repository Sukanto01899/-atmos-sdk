import type { DatasetId, DatasetMetadata } from "../types";

/**
 * Return only the datasets whose `id` is in the given list, preserving the
 * order of `ids`. Datasets not found in the array are silently skipped.
 *
 * Numeric and string IDs are both accepted and compared as strings.
 *
 * @example
 * const pinned = pickDatasets(items, ["12", "47", "3"]);
 *
 * @example
 * // Works with numeric IDs
 * const selection = pickDatasets(items, [12, 47, 3]);
 */
export function pickDatasets(
  datasets: DatasetMetadata[],
  ids: (DatasetId | number)[],
): DatasetMetadata[] {
  const index = new Map(datasets.map((ds) => [String(ds.id ?? ""), ds]));
  return ids.flatMap((id) => {
    const ds = index.get(String(id));
    return ds ? [ds] : [];
  });
}
