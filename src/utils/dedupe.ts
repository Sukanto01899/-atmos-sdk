import type { DatasetMetadata } from "../types";

/**
 * Remove duplicate datasets from an array, keeping the **first** occurrence
 * of each unique value for the chosen key field.
 *
 * Defaults to deduplication by `id`. Datasets whose key field is `null` or
 * `undefined` are treated as unique and always kept.
 *
 * @example
 * // Remove duplicates by dataset ID (default)
 * const unique = deduplicateDatasets(items);
 *
 * // Remove duplicates by owner address
 * const onePerOwner = deduplicateDatasets(items, "owner");
 *
 * // Remove duplicates by IPFS hash
 * const uniqueFiles = deduplicateDatasets(items, "ipfsHash");
 */
export function deduplicateDatasets(
  datasets: DatasetMetadata[],
  by: keyof DatasetMetadata = "id",
): DatasetMetadata[] {
  const seen = new Set<string>();
  const result: DatasetMetadata[] = [];

  for (const ds of datasets) {
    const raw = ds[by];
    if (raw == null) {
      result.push(ds);
      continue;
    }
    const key = String(raw);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(ds);
    }
  }

  return result;
}
