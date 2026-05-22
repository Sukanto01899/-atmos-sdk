import type { DatasetMetadata } from "../types";
import { getDatasetQualityScore } from "./quality";

export interface ScoredDataset {
  dataset: DatasetMetadata;
  score: number;
}

/**
 * Annotate each dataset with its quality score in a single pass.
 *
 * Returns a new array of `{ dataset, score }` pairs without mutating the
 * input. Useful when you need the score alongside the dataset — e.g. for
 * rendering score badges — without calling `getDatasetQualityScore` in every
 * render loop.
 *
 * @example
 * const scored = scoreDatasets(items);
 * scored.forEach(({ dataset, score }) => {
 *   console.log(`${dataset.name}: ${score}/100`);
 * });
 *
 * @example
 * // Sort by score then render
 * const ranked = scoreDatasets(items).sort((a, b) => b.score - a.score);
 *
 * @example
 * // Filter to high-quality only
 * const good = scoreDatasets(items).filter(({ score }) => score >= 70);
 */
export function scoreDatasets(datasets: DatasetMetadata[]): ScoredDataset[] {
  return datasets.map((dataset) => ({
    dataset,
    score: getDatasetQualityScore(dataset),
  }));
}
