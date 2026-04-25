export const toMicroDegrees = (degrees: number): number | null => {
  if (!Number.isFinite(degrees)) return null;
  return Math.round(degrees * 1_000_000);
};

export const fromMicroDegrees = (microDegrees: number): number | null => {
  if (!Number.isFinite(microDegrees)) return null;
  return microDegrees / 1_000_000;
};

export const isValidLatitudeDegrees = (latitudeDegrees: number): boolean =>
  Number.isFinite(latitudeDegrees) && latitudeDegrees >= -90 && latitudeDegrees <= 90;

export const isValidLongitudeDegrees = (longitudeDegrees: number): boolean =>
  Number.isFinite(longitudeDegrees) && longitudeDegrees >= -180 && longitudeDegrees <= 180;

export const isValidLatLonDegrees = (latitudeDegrees: number, longitudeDegrees: number): boolean =>
  isValidLatitudeDegrees(latitudeDegrees) && isValidLongitudeDegrees(longitudeDegrees);

export type LatLonDegreesStringOptions = { precision?: number; separator?: string };

export const toLatLonDegreesString = (
  latitudeDegrees: number,
  longitudeDegrees: number,
  options?: LatLonDegreesStringOptions,
): string | null => {
  if (!isValidLatLonDegrees(latitudeDegrees, longitudeDegrees)) return null;

  const precision = options?.precision;
  const separator = options?.separator ?? ",";
  const clampPrecision = (value: number) => Math.min(10, Math.max(0, value));
  const format = (value: number) => {
    if (typeof precision !== "number" || Number.isNaN(precision)) {
      return String(value);
    }
    return value.toFixed(clampPrecision(precision));
  };

  return `${format(latitudeDegrees)}${separator}${format(longitudeDegrees)}`;
};

export const parseLatLonDegrees = (
  input: string,
): { latitudeDegrees: number; longitudeDegrees: number } | null => {
  const trimmed = String(input ?? "").trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/[()]/g, "");
  const parts = normalized
    .split(/[,\s]+/g)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length !== 2) return null;

  const latitudeDegrees = Number(parts[0]);
  const longitudeDegrees = Number(parts[1]);

  if (!isValidLatLonDegrees(latitudeDegrees, longitudeDegrees)) return null;
  return { latitudeDegrees, longitudeDegrees };
};
