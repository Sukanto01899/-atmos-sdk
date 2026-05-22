import type { DatasetMetadata } from "../types";

export interface MarkdownTableOptions {
  /**
   * Columns to include, in order.
   * Defaults to: id, name, dataType, status, verified, isPublic, collectionDate.
   */
  fields?: (keyof DatasetMetadata)[];
}

const DEFAULT_FIELDS: (keyof DatasetMetadata)[] = [
  "id",
  "name",
  "dataType",
  "status",
  "verified",
  "isPublic",
  "collectionDate",
];

/**
 * Render an array of datasets as a GitHub-flavored Markdown table.
 *
 * Pipe characters inside cell values are escaped automatically.
 * Missing values are rendered as `—`.
 *
 * @example
 * const md = toMarkdownTable(items);
 * // | id | name | dataType | status | verified | isPublic | collectionDate |
 * // |----|------|----------|--------|----------|----------|----------------|
 * // | 1  | …    | csv      | active | true     | true     | 1700000000     |
 *
 * @example
 * // Custom columns
 * const md = toMarkdownTable(items, { fields: ["id", "name", "owner"] });
 */
export function toMarkdownTable(
  datasets: DatasetMetadata[],
  options?: MarkdownTableOptions,
): string {
  const fields = options?.fields ?? DEFAULT_FIELDS;

  const escape = (value: unknown): string =>
    String(value ?? "—").replace(/\|/g, "\\|");

  const header = `| ${fields.join(" | ")} |`;
  const divider = `| ${fields.map(() => "---").join(" | ")} |`;
  const rows = datasets.map(
    (ds) => `| ${fields.map((f) => escape(ds[f])).join(" | ")} |`,
  );

  return [header, divider, ...rows].join("\n");
}
