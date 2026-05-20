import type { DatasetMetadata, SummaryResult } from "../types";
import { getDatasetQualityScore } from "./quality";

/**
 * Compute summary statistics from a local array of datasets.
 *
 * Returns the same shape as `sdk.getSummary()` so the two are
 * interchangeable — use this when the datasets are already loaded and
 * you want to avoid an extra network round-trip.
 *
 * Adds extra optional fields (`withIpfs`, `frozen`, `avgQualityScore`,
 * `topTags`) that the server-side summary endpoint may not return.
 *
 * @example
 * const { items } = await sdk.listDatasetsAll();
 * const stats = summarizeDatasets(items);
 * console.log(stats.total, stats.verified, stats.avgQualityScore);
 * console.log(stats.topTags); // [{ tag: "climate", count: 12 }, …]
 */
export function summarizeDatasets(datasets: DatasetMetadata[]): SummaryResult {
  const statuses: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  let verified = 0;
  let pub = 0;
  let withIpfs = 0;
  let frozen = 0;
  let totalQuality = 0;

  for (const ds of datasets) {
    const status = ds.status ?? "unknown";
    statuses[status] = (statuses[status] ?? 0) + 1;

    if (ds.verified === true || ds.status === "verified") verified += 1;
    if (ds.isPublic === true) pub += 1;
    if (ds.ipfsHash && String(ds.ipfsHash).trim()) withIpfs += 1;
    if (ds.metadataFrozen === true) frozen += 1;
    totalQuality += getDatasetQualityScore(ds);

    for (const tag of ds.tags ?? []) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  const avgQualityScore =
    datasets.length > 0
      ? Math.round((totalQuality / datasets.length) * 10) / 10
      : 0;

  return {
    total: datasets.length,
    verified,
    public: pub,
    statuses,
    withIpfs,
    frozen,
    avgQualityScore,
    topTags,
  };
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
