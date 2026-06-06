import type { DatasetMetadata } from "../types";

export interface AltitudeBand {
  /** Layer name. */
  name: string;
  /** Inclusive lower bound in metres. */
  min: number;
  /** Exclusive upper bound in metres (`Infinity` for the topmost band). */
  max: number;
}

/**
 * The classical atmospheric layers, by altitude in metres. The lowest band's
 * `min` is `-Infinity` so below-sea-level values still classify, and the top
 * band's `max` is `Infinity`.
 */
export const ATMOSPHERIC_LAYERS: readonly AltitudeBand[] = [
  { name: "Troposphere", min: -Infinity, max: 12_000 },
  { name: "Stratosphere", min: 12_000, max: 50_000 },
  { name: "Mesosphere", min: 50_000, max: 85_000 },
  { name: "Thermosphere", min: 85_000, max: 600_000 },
  { name: "Exosphere", min: 600_000, max: Infinity },
];

/**
 * Classify an altitude (metres) into a named band. Defaults to the classical
 * atmospheric layers but accepts any custom band list (e.g. boundary-layer
 * subdivisions). Returns `null` when the value is not finite or falls outside
 * every band.
 *
 * @example
 * classifyAltitude(8000);   // "Troposphere"
 * classifyAltitude(30000);  // "Stratosphere"
 */
export function classifyAltitude(
  meters: number,
  bands: readonly AltitudeBand[] = ATMOSPHERIC_LAYERS,
): string | null {
  if (!Number.isFinite(meters)) return null;
  for (const band of bands) {
    if (meters >= band.min && meters < band.max) return band.name;
  }
  return null;
}

/**
 * Classify a dataset by the midpoint of its `[altitudeMin, altitudeMax]` window,
 * so a dataset spanning a range is assigned to the band its centre falls in.
 *
 * @example
 * getDatasetAltitudeBand({ ...ds, altitudeMin: 0, altitudeMax: 10000 });
 * // "Troposphere" (midpoint 5000 m)
 */
export function getDatasetAltitudeBand(
  dataset: DatasetMetadata,
  bands: readonly AltitudeBand[] = ATMOSPHERIC_LAYERS,
): string | null {
  const { altitudeMin, altitudeMax } = dataset;
  if (!Number.isFinite(altitudeMin) || !Number.isFinite(altitudeMax)) return null;
  return classifyAltitude((altitudeMin + altitudeMax) / 2, bands);
}
