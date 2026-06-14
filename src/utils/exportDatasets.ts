import type { DatasetMetadata } from "../types";
import { datasetsToCsv, type DatasetsCsvOptions } from "./datasetsCsv";

export type ExportFormat = "json" | "csv";

export type ExportDatasetsOptions = {
  /** Extra fields merged into the top-level JSON object alongside `datasets`. Ignored for CSV. */
  meta?: Record<string, unknown>;
  /** JSON indentation spaces (default 2). Ignored for CSV. */
  indent?: number;
  /** CSV serialization options. Ignored for JSON. */
  csv?: DatasetsCsvOptions;
};

/**
 * Serialize a dataset collection into a downloadable `Blob`.
 *
 * - `"json"` — produces `{ generatedAt, ...meta, datasets: [...] }` as `application/json`.
 * - `"csv"`  — produces a UTF-8 BOM-prefixed CSV as `text/csv`.
 *
 * @example
 * const blob = exportDatasets(items, "csv");
 * const url = URL.createObjectURL(blob);
 *
 * @example
 * const blob = exportDatasets(items, "json", {
 *   meta: { source: "filtered-view", totalVisible: items.length },
 * });
 */
export const exportDatasets = (
  datasets: DatasetMetadata[],
  format: ExportFormat,
  options?: ExportDatasetsOptions,
): Blob => {
  if (format === "csv") {
    const csv = datasetsToCsv(datasets, options?.csv);
    return new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    ...(options?.meta ?? {}),
    datasets,
  };
  return new Blob([JSON.stringify(payload, null, options?.indent ?? 2)], {
    type: "application/json;charset=utf-8",
  });
};
