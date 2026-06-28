import type { DatasetDiff, DatasetMetadata } from "../types";
import { diffDatasetMetadata } from "./diff";

export interface DatasetCollectionDiffEntry {
  id: string;
  previous: DatasetMetadata;
  current: DatasetMetadata;
  diff: DatasetDiff;
}

export interface DatasetCollectionDiff {
  /** Datasets present in `current` but not in `previous`. */
  added: DatasetMetadata[];
  /** Datasets present in `previous` but not in `current`. */
  removed: DatasetMetadata[];
  /** Datasets present in both snapshots with at least one changed field. */
  changed: DatasetCollectionDiffEntry[];
}

/**
 * Compare two snapshots of a dataset collection, matched by `id`, and report
 * what was added, removed, and changed.
 *
 * Unlike `diffDatasetMetadata` (which diffs a single known pair), this
 * matches datasets across two arrays first — handy for comparing successive
 * `listDatasetsAll()` snapshots or polling results, without rolling your own
 * id-matching logic.
 *
 * Datasets are matched by `String(id ?? "")`, the same coercion
 * `getDatasetById` uses — datasets unchanged in every field are omitted from
 * `changed`.
 *
 * @example
 * const { added, removed, changed } = diffDatasetCollections(before, after);
 * console.log(`${added.length} new, ${removed.length} gone, ${changed.length} updated`);
 *
 * @example
 * // Inspect what changed on a specific dataset
 * const entry = changed.find((e) => e.id === "42");
 * entry?.diff.changed.forEach(({ field, previous, current }) =>
 *   console.log(`${field}: ${previous} → ${current}`),
 * );
 */
export function diffDatasetCollections(
  previous: DatasetMetadata[],
  current: DatasetMetadata[],
): DatasetCollectionDiff {
  const key = (ds: DatasetMetadata) => String(ds.id ?? "");
  const previousById = new Map(previous.map((ds) => [key(ds), ds]));
  const currentById = new Map(current.map((ds) => [key(ds), ds]));

  const added = current.filter((ds) => !previousById.has(key(ds)));
  const removed = previous.filter((ds) => !currentById.has(key(ds)));

  const changed: DatasetCollectionDiffEntry[] = [];
  for (const [id, prevDs] of previousById) {
    const currDs = currentById.get(id);
    if (!currDs) continue;

    const diff = diffDatasetMetadata(prevDs, currDs);
    if (!diff.isIdentical) {
      changed.push({ id, previous: prevDs, current: currDs, diff });
    }
  }

  return { added, removed, changed };
}
