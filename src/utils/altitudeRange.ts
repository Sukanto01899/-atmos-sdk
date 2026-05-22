import type { DatasetMetadata } from "../types";

export interface AltitudeRange {
  /** Lowest `altitudeMin` value across all datasets (metres). */
  min: number;
  /** Highest `altitudeMax` value across all datasets (metres). */
  max: number;
}

/**
 * Compute the altitude range that spans all datasets in the array.
 *
 * Uses `altitudeMin` for the floor and `altitudeMax` for the ceiling, so the
 * result covers the full extent of every dataset's altitude window.
 *
 * Returns `null` when the array is empty. Useful for rendering altitude scales,
 * axis labels, or colour-mapping atmospheric data by elevation.
 *
 * @example
 * const range = getAltitudeRange(items);
 * if (range) {
 *   console.log(`${range.min} m – ${range.max} m`);
 * }
 *
 * @example
 * // Filter then get range of the subset
 * const stratospheric = items.filter((d) => d.altitudeMin >= 12000);
 * const range = getAltitudeRange(stratospheric);
 */
export function getAltitudeRange(datasets: DatasetMetadata[]): AltitudeRange | null {
  if (datasets.length === 0) return null;

  let min = Infinity;
  let max = -Infinity;

  for (const ds of datasets) {
    if (ds.altitudeMin < min) min = ds.altitudeMin;
    if (ds.altitudeMax > max) max = ds.altitudeMax;
  }

  return { min, max };
}
