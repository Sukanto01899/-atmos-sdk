import type { DatasetMetadata } from "../types";

export interface MergeDatasetsOptions {
  /**
   * Which array wins when both contain the same ID.
   * - `"first"` (default) — keep the entry from `a`.
   * - `"last"` — keep the entry from `b` (b overrides a).
   */
  prefer?: "first" | "last";
}

/**
 * Merge two dataset arrays into one, deduplicating by `id`.
 *
 * Datasets without an `id` are always included (they cannot be deduplicated).
 * The relative order within each source array is preserved; entries from `a`
 * come before entries from `b` that were not already in `a`.
 *
 * @example
 * // Combine explore + mine results without duplicates
 * const all = mergeDatasets(latestDatasets, myDatasets);
 *
 * @example
 * // Let b override a when IDs collide
 * const updated = mergeDatasets(cached, fresh, { prefer: "last" });
 */
export function mergeDatasets(
  a: DatasetMetadata[],
  b: DatasetMetadata[],
  options?: MergeDatasetsOptions,
): DatasetMetadata[] {
  const prefer = options?.prefer ?? "first";
  const seen = new Map<string, DatasetMetadata>();

  for (const ds of a) {
    const key = ds.id != null ? String(ds.id) : null;
    if (key !== null) seen.set(key, ds);
  }

  for (const ds of b) {
    const key = ds.id != null ? String(ds.id) : null;
    if (key === null || !seen.has(key) || prefer === "last") {
      if (key !== null) seen.set(key, ds);
    }
  }

  // Rebuild in order: a first, then b entries not already from a
  const aKeys = new Set(a.map((ds) => (ds.id != null ? String(ds.id) : null)));
  const result: DatasetMetadata[] = [];

  for (const ds of a) {
    const key = ds.id != null ? String(ds.id) : null;
    result.push(key !== null ? (seen.get(key) ?? ds) : ds);
  }
  for (const ds of b) {
    const key = ds.id != null ? String(ds.id) : null;
    if (key === null || !aKeys.has(key)) {
      result.push(ds);
    }
  }

  return result;
}
