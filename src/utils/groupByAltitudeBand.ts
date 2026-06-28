import type { DatasetMetadata } from "../types";
import {
  ATMOSPHERIC_LAYERS,
  getDatasetAltitudeBand,
  type AltitudeBand,
} from "./altitudeBand";

/**
 * Group datasets by atmospheric layer (via `getDatasetAltitudeBand`), into a
 * `Map` keyed by band name, ordered lowest-altitude-first.
 *
 * Datasets whose altitude midpoint cannot be classified (missing or
 * non-finite `altitudeMin`/`altitudeMax`) are omitted, since they have no
 * meaningful band. Datasets within a band keep their source order. The
 * input is not mutated.
 *
 * @example
 * const byBand = groupDatasetsByAltitudeBand(items);
 * byBand.get("Stratosphere"); // datasets centred in the stratosphere
 *
 * @example
 * // Custom band list
 * const byBand = groupDatasetsByAltitudeBand(items, customBands);
 */
export function groupDatasetsByAltitudeBand(
  datasets: DatasetMetadata[],
  bands: readonly AltitudeBand[] = ATMOSPHERIC_LAYERS,
): Map<string, DatasetMetadata[]> {
  const byBand = new Map<string, DatasetMetadata[]>();

  for (const ds of datasets) {
    const band = getDatasetAltitudeBand(ds, bands);
    if (band === null) continue;

    const existing = byBand.get(band);
    if (existing) existing.push(ds);
    else byBand.set(band, [ds]);
  }

  const order = new Map(bands.map((band, index) => [band.name, index]));
  return new Map(
    [...byBand.entries()].sort(
      (a, b) => (order.get(a[0]) ?? 0) - (order.get(b[0]) ?? 0),
    ),
  );
}
