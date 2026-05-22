import type { Bbox, DatasetMetadata } from "../types";

/**
 * Compute the smallest bounding box that covers all dataset coordinates.
 *
 * Returns `null` when the array is empty. Useful for setting the initial
 * viewport of a map so all visible datasets are in frame.
 *
 * @example
 * const bounds = getCoordBounds(items);
 * if (bounds) {
 *   map.fitBounds([
 *     [bounds.minLat, bounds.minLon],
 *     [bounds.maxLat, bounds.maxLon],
 *   ]);
 * }
 *
 * @example
 * // Works with a single dataset too
 * const bounds = getCoordBounds([myDataset]);
 * // bounds.minLat === bounds.maxLat (single point)
 */
export function getCoordBounds(datasets: DatasetMetadata[]): Bbox | null {
  if (datasets.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  for (const ds of datasets) {
    if (ds.latitude < minLat) minLat = ds.latitude;
    if (ds.latitude > maxLat) maxLat = ds.latitude;
    if (ds.longitude < minLon) minLon = ds.longitude;
    if (ds.longitude > maxLon) maxLon = ds.longitude;
  }

  return { minLat, maxLat, minLon, maxLon };
}
