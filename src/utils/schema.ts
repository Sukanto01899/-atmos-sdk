export type SchemaType =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "object"
  | "array"
  | "unknown"
  | "mixed";

const coerceStringType = (value: string): SchemaType => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "unknown";
  if (trimmed === "true" || trimmed === "false") return "boolean";
  if (/^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) return "number";
  return "string";
};

const valueType = (value: unknown, coerceStrings: boolean): SchemaType => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  switch (typeof value) {
    case "string":
      return coerceStrings ? coerceStringType(value) : "string";
    case "number":
      return Number.isFinite(value) ? "number" : "unknown";
    case "boolean":
      return "boolean";
    case "object":
      return "object";
    default:
      return "unknown";
  }
};

const mergeTypes = (a: SchemaType | undefined, b: SchemaType): SchemaType => {
  if (!a) return b;
  if (a === b) return a;
  if (a === "unknown") return b;
  if (b === "unknown") return a;
  return "mixed";
};

export const inferSchema = (
  rows: Record<string, unknown>[],
  options?: { coerceStrings?: boolean },
): Record<string, SchemaType> => {
  const schema: Record<string, SchemaType> = {};
  const coerceStrings = options?.coerceStrings ?? false;

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      const t = valueType(value, coerceStrings);
      schema[key] = mergeTypes(schema[key], t);
    }
  }

  return schema;
};

