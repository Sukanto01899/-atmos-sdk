import type { DatasetMetadata } from "../types";

export interface DatasetFreshnessOptions {
  /** Which unix-second timestamp field to score against. Default: `"collectionDate"`. */
  dateField?: "collectionDate" | "createdAt";
  /** Age in seconds at which freshness bottoms out at 0. Default: 365 days. */
  maxAgeSeconds?: number;
  /**
   * Reference "now", in unix seconds. Default: the current time.
   * Pass this in tests (or for reproducible reports) instead of relying on the clock.
   */
  nowSeconds?: number;
}

/**
 * Score a dataset's recency on a 0–100 scale, linearly decaying from 100
 * (just collected) to 0 at `maxAgeSeconds` old — the recency counterpart to
 * `getDatasetQualityScore`, and the per-dataset complement to `getStaleDatasets`.
 *
 * A dataset with a missing or non-positive date scores 0, since there is no
 * evidence it was ever current. Ages beyond `maxAgeSeconds` clamp to 0; a
 * date at or after "now" clamps to 100 (clock skew safety).
 *
 * @example
 * const freshness = getDatasetFreshnessScore(dataset);
 * // 100 for a dataset collected today, decaying toward 0 over the next year
 *
 * @example
 * // Score against on-chain registration instead, with a 90-day window
 * const freshness = getDatasetFreshnessScore(dataset, {
 *   dateField: "createdAt",
 *   maxAgeSeconds: 90 * 24 * 60 * 60,
 * });
 */
export function getDatasetFreshnessScore(
  metadata: DatasetMetadata,
  options?: DatasetFreshnessOptions,
): number {
  const field = options?.dateField ?? "collectionDate";
  const maxAgeSeconds = options?.maxAgeSeconds ?? 365 * 24 * 60 * 60;
  const now = options?.nowSeconds ?? Math.floor(Date.now() / 1000);

  const timestamp = metadata[field];
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp <= 0) {
    return 0;
  }

  const ageSeconds = now - timestamp;
  if (ageSeconds <= 0) return 100;
  if (ageSeconds >= maxAgeSeconds) return 0;

  return Math.round(100 * (1 - ageSeconds / maxAgeSeconds));
}
