import type { DatasetMetadata } from "../types";

export interface FilterByTagOptions {
  /**
   * How multiple tags are matched:
   * - `"any"` (default) — dataset must have **at least one** of the given tags (OR logic).
   * - `"all"` — dataset must have **every** given tag (AND logic).
   */
  mode?: "any" | "all";
  /** Case-insensitive matching. Default: `false`. */
  caseInsensitive?: boolean;
}

/**
 * Filter datasets by tag membership.
 *
 * Accepts a single tag string or an array. When an array is given the `mode`
 * option controls whether datasets need any one tag (`"any"`, the default) or
 * every tag (`"all"`).
 *
 * The existing `filterDatasets({ tags: [...] })` already performs AND-only tag
 * filtering; this function adds OR-mode and case-insensitive matching as
 * ergonomic alternatives.
 *
 * @example
 * // Datasets tagged "climate" OR "rainfall"
 * const results = filterByTag(items, ["climate", "rainfall"]);
 *
 * @example
 * // Must have both "verified" AND "public" tags
 * const strict = filterByTag(items, ["verified", "public"], { mode: "all" });
 *
 * @example
 * // Case-insensitive single tag
 * const csv = filterByTag(items, "CSV", { caseInsensitive: true });
 */
export function filterByTag(
  datasets: DatasetMetadata[],
  tags: string | string[],
  options?: FilterByTagOptions,
): DatasetMetadata[] {
  const tagList = Array.isArray(tags) ? tags : [tags];
  const mode = options?.mode ?? "any";
  const ci = options?.caseInsensitive ?? false;

  const normalize = (t: string) => (ci ? t.toLowerCase() : t);
  const needles = tagList.map(normalize);

  return datasets.filter((ds) => {
    const haystack = (ds.tags ?? []).map(normalize);
    return mode === "all"
      ? needles.every((n) => haystack.includes(n))
      : needles.some((n) => haystack.includes(n));
  });
}
