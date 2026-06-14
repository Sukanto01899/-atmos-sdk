import type { DatasetMetadata } from "../types";

export type CsvCell = string | number | boolean | null | undefined;

export type DatasetsCsvOptions = {
  includeHeader?: boolean;
  /** Column order for the CSV. Accepts any field name; defaults to a stable human-friendly subset. */
  columns?: string[];
};

const DEFAULT_COLUMNS: string[] = [
  "id",
  "name",
  "description",
  "dataType",
  "status",
  "isPublic",
  "owner",
  "collectionDate",
  "createdAt",
  "latitude",
  "longitude",
  "altitudeMin",
  "altitudeMax",
  "ipfsHash",
  "verified",
  "metadataFrozen",
];

const escapeCsvCell = (cell: CsvCell): string => {
  if (cell === null || cell === undefined) return "";
  const value = typeof cell === "string" ? cell : String(cell);
  const needsQuotes =
    value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r");
  if (!needsQuotes) return value;
  return `"${value.replace(/"/g, '""')}"`;
};

const toRow = (metadata: DatasetMetadata, columns: string[]): CsvCell[] =>
  columns.map((column) => {
    const value = (metadata as unknown as Record<string, unknown>)[column];
    return (value === undefined ? "" : value) as CsvCell;
  });

export const datasetsToCsv = (
  datasets: DatasetMetadata[],
  options?: DatasetsCsvOptions,
): string => {
  const includeHeader = options?.includeHeader ?? true;
  const columns = options?.columns ?? DEFAULT_COLUMNS;
  const lines: string[] = [];

  if (includeHeader) {
    lines.push(columns.map((col) => escapeCsvCell(col)).join(","));
  }

  datasets.forEach((dataset) => {
    const row = toRow(dataset, columns);
    lines.push(row.map(escapeCsvCell).join(","));
  });

  return lines.join("\n");
};

