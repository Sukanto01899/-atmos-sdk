import type { DatasetMetadata } from "../types";
import { getDatasetQualityScore } from "./quality";
import { compareDatasetStatusPriority } from "./status";

/**
 * Named sort modes, mirroring the sort options available in the Atmos UI
 * so local and server-side ordering stay consistent.
 */
export type DatasetSortMode =
  | "quality-desc"    // quality score, high → low
  | "recent-desc"     // collectionDate, newest first
  | "recent-asc"      // collectionDate, oldest first
  | "name-asc"        // alphabetical A → Z
  | "name-desc"       // alphabetical Z → A
  | "status-priority" // verified > pending > active > deprecated > unknown
  | "size-desc"       // sizeBytes, largest first
  | "size-asc";       // sizeBytes, smallest first

/**
 * Return a new sorted copy of `datasets` — the original array is never mutated.
 *
 * @example
 * const byQuality = sortDatasets(items, "quality-desc");
 * const newest    = sortDatasets(items, "recent-desc");
 * const az        = sortDatasets(items, "name-asc");
 */
export function sortDatasets(
  datasets: DatasetMetadata[],
  mode: DatasetSortMode,
): DatasetMetadata[] {
  const copy = datasets.slice();

  switch (mode) {
    case "quality-desc":
      return copy.sort(
        (a, b) => getDatasetQualityScore(b) - getDatasetQualityScore(a),
      );

    case "recent-desc":
      return copy.sort((a, b) => (b.collectionDate ?? 0) - (a.collectionDate ?? 0));

    case "recent-asc":
      return copy.sort((a, b) => (a.collectionDate ?? 0) - (b.collectionDate ?? 0));

    case "name-asc":
      return copy.sort((a, b) => a.name.localeCompare(b.name));

    case "name-desc":
      return copy.sort((a, b) => b.name.localeCompare(a.name));

    case "status-priority":
      return copy.sort((a, b) =>
        compareDatasetStatusPriority(a.status, b.status),
      );

    case "size-desc":
      return copy.sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0));

    case "size-asc":
      return copy.sort((a, b) => (a.sizeBytes ?? 0) - (b.sizeBytes ?? 0));

    default:
      return ((_: never) => copy)(mode);
  }
}
