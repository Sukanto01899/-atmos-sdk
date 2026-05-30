import type { DatasetMetadata } from "../types";

export interface DatasetsJsonlOptions {
  /**
   * Restrict each emitted object to this subset of fields, in this order.
   * Fields that are `undefined` on a dataset are omitted from its line.
   * When omitted, every own field of each dataset is serialized.
   */
  fields?: Array<keyof DatasetMetadata>;
}

/**
 * Serialize datasets to newline-delimited JSON (NDJSON / JSONL): one compact
 * JSON object per line, separated by `\n`, with no trailing newline.
 *
 * This is the streaming/log-friendly companion to `datasetsToCsv` and
 * `toGeoJson`. The result can be split on `\n` and parsed line-by-line, which
 * is convenient for large exports that should not be held in memory as a single
 * JSON array.
 *
 * @example
 * const jsonl = datasetsToJsonl(items, { fields: ["id", "name", "dataType"] });
 * // {"id":"1","name":"Soil","dataType":"csv"}
 * // {"id":"2","name":"Wind","dataType":"csv"}
 */
export function datasetsToJsonl(
  datasets: DatasetMetadata[],
  options?: DatasetsJsonlOptions,
): string {
  const fields = options?.fields;

  return datasets
    .map((dataset) => {
      if (!fields) return JSON.stringify(dataset);

      const picked: Partial<DatasetMetadata> = {};
      for (const field of fields) {
        if (dataset[field] !== undefined) {
          (picked as Record<string, unknown>)[field as string] = dataset[field];
        }
      }
      return JSON.stringify(picked);
    })
    .join("\n");
}
