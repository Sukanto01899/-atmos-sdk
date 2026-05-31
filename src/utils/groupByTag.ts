import type { DatasetMetadata } from "../types";

export interface GroupDatasetsByTagOptions {
  /** Group case-insensitively, keying by the first-seen spelling. Default: `false`. */
  caseInsensitive?: boolean;
  /**
   * Key collecting datasets that carry no tags. Set to `null` (default) to omit
   * them from the result entirely.
   */
  untaggedKey?: string | null;
}

/**
 * Group datasets by tag into a `Map` of tag → datasets.
 *
 * Because `tags` is array-valued, a dataset appears under every tag it carries
 * (unlike `groupDatasetsByField`, which assigns each dataset to a single key).
 * Insertion order of both tags and datasets follows the source array.
 *
 * Does not mutate the input.
 *
 * @example
 * const byTag = groupDatasetsByTag(items);
 * byTag.get("climate"); // every dataset tagged "climate"
 *
 * @example
 * // Case-insensitive, and bucket untagged datasets under "(untagged)"
 * const byTag = groupDatasetsByTag(items, {
 *   caseInsensitive: true,
 *   untaggedKey: "(untagged)",
 * });
 */
export function groupDatasetsByTag(
  datasets: DatasetMetadata[],
  options?: GroupDatasetsByTagOptions,
): Map<string, DatasetMetadata[]> {
  const ci = options?.caseInsensitive ?? false;
  const untaggedKey = options?.untaggedKey ?? null;

  const groups = new Map<string, DatasetMetadata[]>();
  // Maps a lowercased tag to the first-seen canonical spelling.
  const canonical = new Map<string, string>();

  const push = (key: string, dataset: DatasetMetadata) => {
    const existing = groups.get(key);
    if (existing) existing.push(dataset);
    else groups.set(key, [dataset]);
  };

  for (const ds of datasets) {
    const tags = ds.tags ?? [];
    if (tags.length === 0) {
      if (untaggedKey !== null) push(untaggedKey, ds);
      continue;
    }

    // De-dupe tags within a single dataset so it is not listed twice per group.
    const seen = new Set<string>();
    for (const tag of tags) {
      const lookup = ci ? tag.toLowerCase() : tag;
      if (seen.has(lookup)) continue;
      seen.add(lookup);

      let key = tag;
      if (ci) {
        const known = canonical.get(lookup);
        if (known) key = known;
        else canonical.set(lookup, tag);
      }
      push(key, ds);
    }
  }

  return groups;
}
