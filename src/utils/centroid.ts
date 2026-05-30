import type { DatasetMetadata } from "../types";
import { isValidLatLonDegrees } from "./coords";

export interface DatasetsCentroid {
  /** Mean latitude of all included datasets (degrees). */
  latitude: number;
  /** Mean longitude of all included datasets (degrees). */
  longitude: number;
  /** Midpoint of the altitude range across included datasets, or null when no
   * dataset carries a finite altitude. */
  altitude: number | null;
  /** Number of datasets that contributed to the centroid. */
  count: number;
}

/**
 * Compute the arithmetic centroid (mean latitude/longitude) of a set of
 * datasets. Datasets without valid coordinates are ignored.
 *
 * Uses a planar mean — the same approach as `clusterDatasets` — which is fine
 * for locating a map view but is not a great-circle midpoint, so it is not
 * meaningful for points spanning the antimeridian or a pole.
 *
 * Returns `null` when no dataset has valid coordinates.
 *
 * @example
 * const center = getDatasetsCentroid(clusterMembers);
 * if (center) map.setView([center.latitude, center.longitude]);
 */
export function getDatasetsCentroid(datasets: DatasetMetadata[]): DatasetsCentroid | null {
  let sumLat = 0;
  let sumLon = 0;
  let count = 0;

  let altMin = Infinity;
  let altMax = -Infinity;

  for (const ds of datasets) {
    if (!isValidLatLonDegrees(ds.latitude, ds.longitude)) continue;
    sumLat += ds.latitude;
    sumLon += ds.longitude;
    count += 1;

    if (Number.isFinite(ds.altitudeMin) && ds.altitudeMin < altMin) altMin = ds.altitudeMin;
    if (Number.isFinite(ds.altitudeMax) && ds.altitudeMax > altMax) altMax = ds.altitudeMax;
  }

  if (count === 0) return null;

  const altitude = altMin <= altMax ? (altMin + altMax) / 2 : null;

  return {
    latitude: sumLat / count,
    longitude: sumLon / count,
    altitude,
    count,
  };
}
