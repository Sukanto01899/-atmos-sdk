import type { DatasetMetadata } from "../types";

export type DatasetCitationOptions = {
  /**
   * Optional human-facing link to the dataset detail page (app or explorer).
   * Example: "https://app.atmos.example/?detail=1&lineage=123"
   */
  detailUrl?: string | null;
  /**
   * Access date used in the citation (ISO date string `YYYY-MM-DD` is recommended).
   * Defaults to today's date in UTC when omitted.
   */
  accessedAt?: string | Date;
};

const toAccessDate = (value?: string | Date): string => {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return new Date().toISOString().slice(0, 10);
  }
  // Let callers pass full ISO strings; keep just the date portion.
  return trimmed.slice(0, 10);
};

export const formatDatasetCitationText = (
  metadata: DatasetMetadata,
  options?: DatasetCitationOptions,
): string => {
  const safe = (value: unknown) => String(value ?? "").trim();
  const datasetId = safe(metadata.id);

  const parts = [
    safe(metadata.name) ? `${safe(metadata.name)}.` : "",
    datasetId ? `Atmos Registry dataset #${datasetId}.` : "Atmos Registry dataset.",
    safe(metadata.dataType) ? `Type: ${safe(metadata.dataType)}.` : "",
    metadata.owner ? `Owner: ${safe(metadata.owner)}.` : "",
    Number.isFinite(metadata.collectionDate)
      ? `Collection date: ${safe(metadata.collectionDate)}.`
      : "",
    typeof metadata.createdAt === "number" ? `Recorded: ${safe(metadata.createdAt)}.` : "",
    options?.detailUrl ? `Available at: ${safe(options.detailUrl)}.` : "",
    `Accessed: ${toAccessDate(options?.accessedAt)}.`,
  ].filter(Boolean);

  return parts.join(" ");
};

