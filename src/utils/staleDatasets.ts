import type { DatasetMetadata } from "../types";
import { isVerifiedDataset } from "./predicates";

export interface StaleDatasetsOptions {
  /**
   * Which unix-second timestamp field to check against. Default: `"collectionDate"`.
   */
  dateField?: "collectionDate" | "createdAt";
  /**
   * Reference "now", in unix seconds. Default: the current time.
   * Pass this in tests (or for reproducible reports) instead of relying on the clock.
   */
  nowSeconds?: number;
}

/**
 * Return the datasets that are unverified and older than `maxAgeSeconds` —
 * the natural complement to `getRecentDatasets`, useful for surfacing
 * records that are overdue for re-validation.
 *
 * Already-verified datasets are never stale. A dataset with a missing or
 * non-positive date is treated as infinitely old (included if unverified),
 * since there is no evidence it was ever current. Does not mutate the
 * input; results keep source order.
 *
 * @example
 * const ninetyDays = 90 * 24 * 60 * 60;
 * const overdue = getStaleDatasets(items, ninetyDays);
 *
 * @example
 * // Check staleness against on-chain registration instead of collection date
 * const overdue = getStaleDatasets(items, ninetyDays, { dateField: "createdAt" });
 */
export function getStaleDatasets(
  datasets: DatasetMetadata[],
  maxAgeSeconds: number,
  options?: StaleDatasetsOptions,
): DatasetMetadata[] {
  const field = options?.dateField ?? "collectionDate";
  const now = options?.nowSeconds ?? Math.floor(Date.now() / 1000);

  return datasets.filter((ds) => {
    if (isVerifiedDataset(ds)) return false;

    const timestamp = ds[field];
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp <= 0) {
      return true;
    }

    return now - timestamp > maxAgeSeconds;
  });
}
