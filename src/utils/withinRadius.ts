import type { DatasetMetadata } from "../types";
import { haversineDistanceMeters } from "./distance";

export interface DatasetWithinRadiusEntry {
  dataset: DatasetMetadata;
  /** Straight-line distance in metres from the centre point. */
  distanceMeters: number;
}

export interface DatasetsWithinRadiusOptions {
  /** Sort the results by ascending distance. Default: true. */
  sort?: boolean;
}

/**
 * Return every dataset whose coordinates fall within `radiusMeters` of the
 * centre point, paired with its haversine distance. Unlike `nearestDatasets`
 * this returns *all* matches rather than a top-K, and excludes datasets that
 * are outside the radius or lack valid coordinates.
 *
 * Does not mutate the source array. Results are sorted nearest-first by default.
 *
 * @example
 * const nearby = datasetsWithinRadius(items, 51.5074, -0.1278, 10_000);
 * for (const { dataset, distanceMeters } of nearby) {
 *   console.log(`${dataset.name}: ${(distanceMeters / 1000).toFixed(1)} km`);
 * }
 */
export function datasetsWithinRadius(
  datasets: DatasetMetadata[],
  latitude: number,
  longitude: number,
  radiusMeters: number,
  options?: DatasetsWithinRadiusOptions,
): DatasetWithinRadiusEntry[] {
  if (!(radiusMeters >= 0)) return [];

  const entries: DatasetWithinRadiusEntry[] = [];
  for (const dataset of datasets) {
    const distanceMeters = haversineDistanceMeters(
      latitude,
      longitude,
      dataset.latitude,
      dataset.longitude,
    );
    if (distanceMeters === null || distanceMeters > radiusMeters) continue;
    entries.push({ dataset, distanceMeters });
  }

  if (options?.sort !== false) {
    entries.sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  return entries;
}
