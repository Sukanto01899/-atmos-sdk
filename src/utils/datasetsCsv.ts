import type { DatasetMetadata } from "../types";

export type CsvCell = string | number | boolean | null | undefined;

export type DatasetsCsvOptions = {
  includeHeader?: boolean;
  /**
   * Column order for the CSV. Defaults to a stable, human-friendly subset.
   */
  columns?: Array<
    | "id"
    | "name"
    | "dataType"
    | "status"
    | "isPublic"
    | "owner"
    | "collectionDate"
    | "createdAt"
    | "latitude"
    | "longitude"
    | "altitudeMin"
    | "altitudeMax"
    | "ipfsHash"
    | "verified"
    | "metadataFrozen"
  >;
};

const DEFAULT_COLUMNS: NonNullable<DatasetsCsvOptions["columns"]> = [
  "id",
  "name",
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
    if (column === "id") return metadata.id ?? "";
    if (column === "name") return metadata.name;
    if (column === "dataType") return metadata.dataType;
    if (column === "status") return metadata.status ?? "";
    if (column === "isPublic") return metadata.isPublic;
    if (column === "owner") return metadata.owner ?? "";
    if (column === "collectionDate") return metadata.collectionDate;
    if (column === "createdAt") return metadata.createdAt ?? "";
    if (column === "latitude") return metadata.latitude;
    if (column === "longitude") return metadata.longitude;
    if (column === "altitudeMin") return metadata.altitudeMin;
    if (column === "altitudeMax") return metadata.altitudeMax;
    if (column === "ipfsHash") return metadata.ipfsHash ?? "";
    if (column === "verified") return metadata.verified ?? "";
    if (column === "metadataFrozen") return metadata.metadataFrozen ?? "";
    return "";
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

