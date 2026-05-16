import type { DatasetDiff, DatasetDiffField, DatasetMetadata } from "../types";

/**
 * Compare two dataset metadata snapshots and return a structured diff.
 *
 * `previous` is the older snapshot; `current` is the newer one.
 *
 * @example
 * const d = diffDatasetMetadata(before, after);
 * if (!d.isIdentical) {
 *   d.changed.forEach(({ field, previous, current }) =>
 *     console.log(`${field}: ${previous} → ${current}`)
 *   );
 * }
 */
export function diffDatasetMetadata(
  previous: DatasetMetadata,
  current: DatasetMetadata,
): DatasetDiff {
  const changed: DatasetDiffField[] = [];
  const added: string[] = [];
  const removed: string[] = [];

  const prev = previous as unknown as Record<string, unknown>;
  const curr = current as unknown as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);

  for (const key of allKeys) {
    const inPrev = Object.prototype.hasOwnProperty.call(prev, key);
    const inCurr = Object.prototype.hasOwnProperty.call(curr, key);

    if (inPrev && !inCurr) {
      removed.push(key);
    } else if (!inPrev && inCurr) {
      added.push(key);
    } else if (JSON.stringify(prev[key]) !== JSON.stringify(curr[key])) {
      changed.push({ field: key, previous: prev[key], current: curr[key] });
    }
  }

  return {
    isIdentical: changed.length === 0 && added.length === 0 && removed.length === 0,
    changed,
    added,
    removed,
  };
}
