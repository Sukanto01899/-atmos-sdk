export const isValidDatasetId = (value: unknown): boolean => {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) && Number.isInteger(value) && value >= 0;
  }
  if (typeof value === "bigint") {
    return value >= 0n;
  }
  return false;
};

export const toDatasetId = (value: unknown): string | null => {
  if (!isValidDatasetId(value)) return null;
  if (typeof value === "string") return value.trim();
  return String(value);
};

