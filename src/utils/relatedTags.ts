import type { DatasetMetadata } from "../types";

export interface RelatedTagsOptions {
  /** Case-insensitive matching for the query tag and co-occurring tags. Default: `false`. */
  caseInsensitive?: boolean;
  /** Cap the number of related tags returned. Default: no limit. */
  limit?: number;
}

export interface RelatedTagEntry {
  /** A tag that co-occurs with the query tag. */
  tag: string;
  /** Number of datasets carrying both the query tag and this tag. */
  count: number;
}

/**
 * Find tags that frequently co-occur with `tag` across a set of datasets —
 * the affinity counterpart to `getUniqueTags`, useful for "related tags"
 * suggestions.
 *
 * Counts each *other* tag once per dataset that carries both `tag` and that
 * tag (repeats within a single dataset are not double-counted). Results are
 * sorted by co-occurrence count descending, then alphabetically. Returns an
 * empty array when `tag` does not occur in `datasets`.
 *
 * @example
 * const related = getRelatedTags(items, "climate");
 * // [{ tag: "rainfall", count: 8 }, { tag: "lidar", count: 3 }, ...]
 *
 * @example
 * // Top 5 only, case-insensitive
 * const related = getRelatedTags(items, "Climate", { caseInsensitive: true, limit: 5 });
 */
export function getRelatedTags(
  datasets: DatasetMetadata[],
  tag: string,
  options?: RelatedTagsOptions,
): RelatedTagEntry[] {
  const ci = options?.caseInsensitive ?? false;
  const needle = ci ? tag.toLowerCase() : tag;

  const counts = new Map<string, { canonical: string; count: number }>();

  for (const ds of datasets) {
    const tags = ds.tags ?? [];
    const matchesQuery = tags.some((t) => (ci ? t.toLowerCase() : t) === needle);
    if (!matchesQuery) continue;

    const seen = new Set<string>();
    for (const other of tags) {
      const key = ci ? other.toLowerCase() : other;
      if (key === needle || seen.has(key)) continue;
      seen.add(key);

      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { canonical: other, count: 1 });
    }
  }

  const entries = [...counts.values()]
    .map(({ canonical, count }) => ({ tag: canonical, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  return options?.limit != null && options.limit > 0
    ? entries.slice(0, options.limit)
    : entries;
}
