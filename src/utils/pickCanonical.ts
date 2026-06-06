import type { DatasetMetadata } from "../types";
import { getDatasetCompletenessScore } from "./completeness";
import { getDatasetQualityScore } from "./quality";

/**
 * Choose the single "best" dataset from a list — typically a group of suspected
 * duplicates from `findDuplicateDatasets` — to treat as the canonical record.
 *
 * Selection order, each a tie-breaker for the previous:
 *   1. highest quality score (`getDatasetQualityScore`)
 *   2. highest completeness score (`getDatasetCompletenessScore`)
 *   3. most recently created (`createdAt`; missing treated as oldest)
 *   4. earliest position in the input (stable)
 *
 * Returns `null` for an empty array. Does not mutate the input.
 *
 * @example
 * const groups = findDuplicateDatasets(items);
 * const canonical = groups.map((g) => pickCanonicalDataset(g.datasets));
 */
export function pickCanonicalDataset(
  datasets: DatasetMetadata[],
): DatasetMetadata | null {
  if (datasets.length === 0) return null;

  let best = datasets[0];
  let bestQuality = getDatasetQualityScore(best);
  let bestCompleteness = getDatasetCompletenessScore(best).score;

  for (let i = 1; i < datasets.length; i += 1) {
    const candidate = datasets[i];
    const quality = getDatasetQualityScore(candidate);
    if (quality !== bestQuality) {
      if (quality > bestQuality) {
        best = candidate;
        bestQuality = quality;
        bestCompleteness = getDatasetCompletenessScore(candidate).score;
      }
      continue;
    }

    const completeness = getDatasetCompletenessScore(candidate).score;
    if (completeness !== bestCompleteness) {
      if (completeness > bestCompleteness) {
        best = candidate;
        bestCompleteness = completeness;
      }
      continue;
    }

    if ((candidate.createdAt ?? 0) > (best.createdAt ?? 0)) {
      best = candidate;
    }
  }

  return best;
}
