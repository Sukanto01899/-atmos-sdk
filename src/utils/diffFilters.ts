import type { ListDatasetsOptions } from "../types";

export interface FilterChange {
  /** The filter field that changed. */
  key: keyof ListDatasetsOptions;
  /** Value in `before` (`undefined` if newly added). */
  before: unknown;
  /** Value in `after` (`undefined` if removed). */
  after: unknown;
}

const equalValues = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a === "object" || typeof b === "object") {
    // Arrays (tags) and objects (bbox) — compare structurally.
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
};

/**
 * Compare two `ListDatasetsOptions` objects and report which fields changed.
 *
 * Each entry carries the `before` and `after` values; a key present in only one
 * side shows `undefined` on the other (i.e. added or removed). Array/object
 * values (`tags`, `bbox`) are compared structurally. Keys are returned in a
 * stable order: those from `before` first, then any new keys from `after`.
 *
 * Handy for change logs, "you changed X" toasts, or deciding whether a refetch
 * is needed.
 *
 * @example
 * diffFilters({ status: "active", tags: ["a"] }, { status: "verified", tags: ["a"] });
 * // [{ key: "status", before: "active", after: "verified" }]
 */
export function diffFilters(
  before: ListDatasetsOptions,
  after: ListDatasetsOptions,
): FilterChange[] {
  const keys: (keyof ListDatasetsOptions)[] = [];
  const seen = new Set<string>();
  for (const key of Object.keys(before)) {
    keys.push(key as keyof ListDatasetsOptions);
    seen.add(key);
  }
  for (const key of Object.keys(after)) {
    if (!seen.has(key)) keys.push(key as keyof ListDatasetsOptions);
  }

  const changes: FilterChange[] = [];
  for (const key of keys) {
    const a = before[key];
    const b = after[key];
    if (!equalValues(a, b)) changes.push({ key, before: a, after: b });
  }
  return changes;
}
