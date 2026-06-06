import type { ListDatasetsOptions } from "../types";

/**
 * Combine several `ListDatasetsOptions` objects into one, applied left to right.
 *
 * For scalar fields, a later object's defined value overrides an earlier one
 * (`undefined` values never overwrite). The `tags` arrays are unioned across all
 * inputs — preserving first-seen order and dropping duplicates — so tag
 * constraints accumulate rather than replace.
 *
 * Useful for layering a base filter (e.g. a saved view) with ad-hoc overrides
 * from the UI before handing the result to `filterDatasets` or `listDatasets`.
 *
 * @example
 * const base = { status: "verified", tags: ["climate"] };
 * const override = { dataType: "lidar", tags: ["public"] };
 * mergeFilters(base, override);
 * // { status: "verified", dataType: "lidar", tags: ["climate", "public"] }
 */
export function mergeFilters(
  ...filters: Array<ListDatasetsOptions | undefined | null>
): ListDatasetsOptions {
  const result: ListDatasetsOptions = {};
  const tags: string[] = [];
  const tagsSeen = new Set<string>();

  for (const filter of filters) {
    if (!filter) continue;
    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined) continue;
      if (key === "tags") {
        for (const tag of value as string[]) {
          if (!tagsSeen.has(tag)) {
            tagsSeen.add(tag);
            tags.push(tag);
          }
        }
        continue;
      }
      (result as Record<string, unknown>)[key] = value;
    }
  }

  if (tags.length > 0) result.tags = tags;
  return result;
}
