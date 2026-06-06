import type { ListDatasetsOptions } from "../types";

export interface DescribeFiltersOptions {
  /** Text to return when no filters are active. Default: `"all datasets"`. */
  empty?: string;
  /** Separator between filter clauses. Default: `", "`. */
  separator?: string;
}

/** Format a unix-second timestamp as a UTC `YYYY-MM-DD` date. */
const isoDate = (unixSeconds: number): string =>
  new Date(unixSeconds * 1000).toISOString().slice(0, 10);

const rangeClause = (
  label: string,
  from: number | undefined,
  to: number | undefined,
  format: (value: number) => string,
  unit = "",
): string | null => {
  const hasFrom = from !== undefined;
  const hasTo = to !== undefined;
  if (hasFrom && hasTo) return `${label} ${format(from)}–${format(to)}${unit}`;
  if (hasFrom) return `${label} ≥${format(from)}${unit}`;
  if (hasTo) return `${label} ≤${format(to)}${unit}`;
  return null;
};

/**
 * Render a `ListDatasetsOptions` filter object as a short, human-readable
 * summary — handy for active-filter chips, saved-view labels, or logging.
 *
 * Only filter fields are described; paging/sorting fields (`limit`, `cursor`,
 * `sort`) are ignored. Clauses appear in a stable order regardless of key order
 * in the input.
 *
 * @example
 * describeFilters({ isPublic: true, verified: true, dataType: "lidar" });
 * // "type=lidar, public, verified"
 *
 * @example
 * describeFilters({ altitudeMin: 0, altitudeMax: 5000, tags: ["climate"] });
 * // "altitude 0–5000m, tags: climate"
 */
export function describeFilters(
  filters: ListDatasetsOptions,
  options?: DescribeFiltersOptions,
): string {
  const separator = options?.separator ?? ", ";
  const clauses: string[] = [];

  if (filters.search?.trim()) clauses.push(`search "${filters.search.trim()}"`);
  if (filters.owner) clauses.push(`owner ${filters.owner}`);
  if (filters.dataType) clauses.push(`type=${filters.dataType}`);
  if (filters.status) clauses.push(`status=${filters.status}`);

  // `visibility` and `isPublic` express the same idea; prefer the explicit one.
  if (filters.visibility) clauses.push(filters.visibility);
  else if (filters.isPublic !== undefined) {
    clauses.push(filters.isPublic ? "public" : "private");
  }

  if (filters.verified !== undefined) {
    clauses.push(filters.verified ? "verified" : "unverified");
  }
  if (filters.metadataFrozen !== undefined) {
    clauses.push(filters.metadataFrozen ? "frozen" : "mutable");
  }

  if (filters.bbox !== undefined) clauses.push("within bbox");

  const altitude = rangeClause(
    "altitude",
    filters.altitudeMin,
    filters.altitudeMax,
    String,
    "m",
  );
  if (altitude) clauses.push(altitude);

  const collected = rangeClause("collected", filters.from, filters.to, isoDate);
  if (collected) clauses.push(collected);

  const created = rangeClause(
    "created",
    filters.createdAtFrom,
    filters.createdAtTo,
    isoDate,
  );
  if (created) clauses.push(created);

  if (filters.tags && filters.tags.length > 0) {
    clauses.push(`tags: ${filters.tags.join("+")}`);
  }

  return clauses.length > 0 ? clauses.join(separator) : (options?.empty ?? "all datasets");
}
