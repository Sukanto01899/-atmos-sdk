import type { DatasetMetadata } from "../types";
import { haversineDistanceMeters } from "./distance";

export interface NearestDatasetEntry {
  dataset: DatasetMetadata;
  /** Straight-line distance in metres from the query point, or null when the
   * dataset has no valid coordinates. */
  distanceMeters: number | null;
}

/**
 * Sort `datasets` by haversine distance from a query point and return up to
 * `limit` results. Datasets without valid coordinates are placed at the end.
 *
 * Does not mutate the source array.
 *
 * @example
 * const nearby = nearestDatasets(items, 51.5074, -0.1278, 5);
 * for (const { dataset, distanceMeters } of nearby) {
 *   console.log(`${dataset.name}: ${(distanceMeters! / 1000).toFixed(1)} km`);
 * }
 */
export function nearestDatasets(
  datasets: DatasetMetadata[],
  latitude: number,
  longitude: number,
  limit?: number,
): NearestDatasetEntry[] {
  const entries: NearestDatasetEntry[] = datasets.map((dataset) => ({
    dataset,
    distanceMeters: haversineDistanceMeters(latitude, longitude, dataset.latitude, dataset.longitude),
  }));

  entries.sort((a, b) => {
    if (a.distanceMeters === null && b.distanceMeters === null) return 0;
    if (a.distanceMeters === null) return 1;
    if (b.distanceMeters === null) return -1;
    return a.distanceMeters - b.distanceMeters;
  });

  return limit != null && limit > 0 ? entries.slice(0, limit) : entries;
}
