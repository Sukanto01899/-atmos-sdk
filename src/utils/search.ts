import type { DatasetMetadata } from "../types";

export interface SearchResult {
  dataset: DatasetMetadata;
  /**
   * Relevance score ≥ 1. Higher means a closer match.
   * Results with score 0 are excluded from the returned array.
   */
  score: number;
}

function scoreField(value: string | undefined | null, query: string): number {
  if (!value) return 0;
  const v = value.toLowerCase();
  if (v === query) return 100;
  if (v.startsWith(query)) return 70;
  if (v.includes(query)) return 40;
  return 0;
}

/**
 * Search a local dataset array for `query` and return results ordered by
 * relevance score (highest first).
 *
 * Unlike `filterDatasets` — which returns a flat yes/no filtered list —
 * `searchDatasets` ranks results so the closest matches appear first.
 *
 * Scoring (cumulative, fields checked in priority order):
 * - Exact name match              → +100
 * - Name starts with query        → +70
 * - Name contains query           → +40
 * - ID exact / starts-with        → +90 / +65
 * - Description starts with       → +55
 * - Description contains          → +30
 * - dataType contains             → +25
 * - Any tag exact match           → +20 per tag
 * - owner contains                → +15
 * - checksum starts with          → +10
 *
 * Datasets with a cumulative score of 0 are excluded.
 *
 * @example
 * const results = searchDatasets(items, "rainfall");
 * for (const { dataset, score } of results) {
 *   console.log(dataset.name, score);
 * }
 *
 * @example
 * // First result only ("best match")
 * const [best] = searchDatasets(items, "SP1K2X");
 */
export function searchDatasets(
  datasets: DatasetMetadata[],
  query: string,
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];

  for (const dataset of datasets) {
    let score = 0;

    // ID — high weight because users often search by known ID
    const id = String(dataset.id ?? "").toLowerCase();
    if (id === q) score += 90;
    else if (id.startsWith(q)) score += 65;
    else if (id.includes(q)) score += 35;

    // Name
    score += scoreField(dataset.name, q);

    // Description
    const desc = (dataset.description ?? "").toLowerCase();
    if (desc.startsWith(q)) score += 55;
    else if (desc.includes(q)) score += 30;

    // dataType
    score += scoreField(dataset.dataType, q) * 0.6; // lower weight

    // Tags — each matching tag adds 20 pts
    for (const tag of dataset.tags ?? []) {
      if (tag.toLowerCase() === q) score += 20;
      else if (tag.toLowerCase().includes(q)) score += 8;
    }

    // Owner address (partial match)
    const owner = (dataset.owner ?? "").toLowerCase();
    if (owner.includes(q)) score += 15;

    // Checksum (prefix)
    const checksum = (dataset.checksum ?? "").toLowerCase();
    if (checksum.startsWith(q)) score += 10;

    if (score > 0) {
      results.push({ dataset, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
