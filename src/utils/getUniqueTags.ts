import type { DatasetMetadata } from "../types";

export interface GetUniqueTagsOptions {
  /** Case-insensitive deduplication. Default: `false`. */
  caseInsensitive?: boolean;
  /** Sort order. Default: `"alpha"`. */
  sort?: "alpha" | "count" | "none";
}

/**
 * Collect all unique tags across a dataset array.
 *
 * Useful for building tag pickers or filter UIs from a local collection
 * without an extra network round-trip.
 *
 * @example
 * const tags = getUniqueTags(items);
 * // ["climate", "lidar", "public", "rainfall", ...]
 *
 * @example
 * // Sort by frequency, case-insensitive
 * const popular = getUniqueTags(items, { sort: "count", caseInsensitive: true });
 */
export function getUniqueTags(
  datasets: DatasetMetadata[],
  options?: GetUniqueTagsOptions,
): string[] {
  const ci = options?.caseInsensitive ?? false;
  const sortMode = options?.sort ?? "alpha";

  const counts = new Map<string, { canonical: string; count: number }>();

  for (const ds of datasets) {
    for (const tag of ds.tags ?? []) {
      const key = ci ? tag.toLowerCase() : tag;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { canonical: tag, count: 1 });
      }
    }
  }

  const entries = [...counts.values()];

  if (sortMode === "count") {
    entries.sort((a, b) => b.count - a.count || a.canonical.localeCompare(b.canonical));
  } else if (sortMode === "alpha") {
    entries.sort((a, b) => a.canonical.localeCompare(b.canonical));
  }

  return entries.map((e) => e.canonical);
}
