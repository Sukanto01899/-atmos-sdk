import type { DatasetMetadata, SummaryResult } from "../types";

/**
 * Compute summary statistics from a local array of datasets.
 *
 * Returns the same shape as `sdk.getSummary()` so the two are
 * interchangeable — use this when the datasets are already loaded and
 * you want to avoid an extra network round-trip.
 *
 * @example
 * const { items } = await sdk.listDatasetsAll();
 * const stats = summarizeDatasets(items);
 * console.log(stats.total, stats.verified, stats.statuses);
 */
export function summarizeDatasets(datasets: DatasetMetadata[]): SummaryResult {
  const statuses: Record<string, number> = {};
  let verified = 0;
  let pub = 0;

  for (const ds of datasets) {
    const status = ds.status ?? "unknown";
    statuses[status] = (statuses[status] ?? 0) + 1;

    if (ds.verified === true || ds.status === "verified") verified += 1;
    if (ds.isPublic === true) pub += 1;
  }

  return { total: datasets.length, verified, public: pub, statuses };
}

/**
 * Partition a dataset array into groups keyed by the string value of any
 * metadata field. Non-string values are coerced with `String()`.
 * Datasets where the field is `null` or `undefined` are placed under the
 * key `"unknown"`.
 *
 * @example
 * const byType   = groupDatasetsByField(items, "dataType");
 * const byStatus = groupDatasetsByField(items, "status");
 * const byOwner  = groupDatasetsByField(items, "owner");
 *
 * // byType → { "csv": [...], "imagery": [...], ... }
 */
export function groupDatasetsByField<K extends keyof DatasetMetadata>(
  datasets: DatasetMetadata[],
  field: K,
): Record<string, DatasetMetadata[]> {
  const groups: Record<string, DatasetMetadata[]> = {};

  for (const ds of datasets) {
    const raw = ds[field];
    const key = raw == null ? "unknown" : String(raw);
    if (!groups[key]) groups[key] = [];
    groups[key].push(ds);
  }

  return groups;
}
