import type { DatasetMetadata } from "../types";
import { isValidUnixSeconds } from "./time";

/** Timestamp field on `DatasetMetadata` to compute the extent over. */
export type DatasetTimeField = "collectionDate" | "createdAt";

export interface DatasetTimeExtent {
  /** Earliest timestamp across the datasets (unix seconds). */
  earliest: number;
  /** Latest timestamp across the datasets (unix seconds). */
  latest: number;
  /** Number of datasets that contributed a valid timestamp. */
  count: number;
}

/**
 * Compute the time span covered by a set of datasets, over `collectionDate`
 * (default) or `createdAt`.
 *
 * Datasets whose chosen field is missing or not a valid unix timestamp are
 * ignored. Returns `null` when no dataset has a valid value. The temporal
 * sibling to `getAltitudeRange` / `getCoordBounds` — handy for a timeline
 * slider's bounds.
 *
 * @example
 * const extent = getDatasetTimeExtent(items);
 * if (extent) {
 *   console.log(toIsoStringFromUnixSeconds(extent.earliest));
 *   console.log(toIsoStringFromUnixSeconds(extent.latest));
 * }
 *
 * @example
 * // Span of upload times instead of collection times
 * const uploads = getDatasetTimeExtent(items, "createdAt");
 */
export function getDatasetTimeExtent(
  datasets: DatasetMetadata[],
  field: DatasetTimeField = "collectionDate",
): DatasetTimeExtent | null {
  let earliest = Infinity;
  let latest = -Infinity;
  let count = 0;

  for (const ds of datasets) {
    const value = ds[field];
    if (value === undefined || !isValidUnixSeconds(value)) continue;
    if (value < earliest) earliest = value;
    if (value > latest) latest = value;
    count += 1;
  }

  if (count === 0) return null;

  return { earliest, latest, count };
}
