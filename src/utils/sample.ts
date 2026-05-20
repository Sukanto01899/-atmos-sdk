import type { DatasetMetadata } from "../types";

/**
 * Return `n` datasets chosen uniformly at random from `datasets` without
 * replacement. The selection order is also randomised.
 *
 * - When `n >= datasets.length` the entire array is returned in a shuffled
 *   copy (no duplicates, no error).
 * - When `n <= 0` an empty array is returned.
 * - The original array is never mutated.
 *
 * Uses a partial Fisher-Yates shuffle so only `n` swaps are performed
 * regardless of the source array size — O(n) time and space.
 *
 * @example
 * // Pick one at random ("Surprise me")
 * const [pick] = sampleDatasets(items, 1);
 *
 * @example
 * // Pick 5 random verified datasets
 * const verified = items.filter(d => d.verified);
 * const sample = sampleDatasets(verified, 5);
 */
export function sampleDatasets(
  datasets: DatasetMetadata[],
  n: number,
): DatasetMetadata[] {
  if (n <= 0 || datasets.length === 0) return [];

  const count = Math.min(n, datasets.length);
  const pool = datasets.slice(); // shallow copy — source is never mutated

  for (let i = 0; i < count; i += 1) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    // Swap pool[i] and pool[j]
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }

  return pool.slice(0, count);
}
