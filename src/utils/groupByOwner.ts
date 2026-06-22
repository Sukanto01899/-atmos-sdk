import type { DatasetMetadata } from "../types";

/**
 * Group datasets by `owner`, into a `Map` keyed by owner address.
 *
 * Mirrors `countByOwner`, but returns the full dataset objects per owner
 * instead of just a count. Datasets with a missing or blank owner are
 * grouped under `"unknown"`. Datasets within a group keep their source
 * order. The input is not mutated.
 *
 * @example
 * const byOwner = groupDatasetsByOwner(items);
 * byOwner.get("SP1ABC..."); // datasets owned by that address
 */
export function groupDatasetsByOwner(
  datasets: DatasetMetadata[],
): Map<string, DatasetMetadata[]> {
  const byOwner = new Map<string, DatasetMetadata[]>();

  for (const ds of datasets) {
    const key = ds.owner?.trim() || "unknown";
    const existing = byOwner.get(key);
    if (existing) existing.push(ds);
    else byOwner.set(key, [ds]);
  }

  return byOwner;
}
