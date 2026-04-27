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

export type DmsStringOptions = { secondsPrecision?: number };

const clampSecondsPrecision = (precision: number) => Math.min(6, Math.max(0, Math.round(precision)));

const toDmsParts = (
  degrees: number,
  secondsPrecision: number,
): { degrees: number; minutes: number; seconds: number } | null => {
  if (!Number.isFinite(degrees)) return null;

  const abs = Math.abs(degrees);
  let d = Math.floor(abs);
  let minutesFloat = (abs - d) * 60;
  let m = Math.floor(minutesFloat);
  let secondsFloat = (minutesFloat - m) * 60;

  const factor = Math.pow(10, secondsPrecision);
  let s = Math.round(secondsFloat * factor) / factor;

  if (s >= 60) {
    s = 0;
    m += 1;
  }
  if (m >= 60) {
    m = 0;
    d += 1;
  }

  return { degrees: d, minutes: m, seconds: s };
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const toDmsString = (
  degrees: number,
  hemispherePositive: string,
  hemisphereNegative: string,
  options?: DmsStringOptions,
): string | null => {
  const precision = clampSecondsPrecision(options?.secondsPrecision ?? 2);
  const parts = toDmsParts(degrees, precision);
  if (!parts) return null;

  const hemi = degrees < 0 ? hemisphereNegative : hemispherePositive;
  const seconds = precision === 0 ? String(Math.round(parts.seconds)) : parts.seconds.toFixed(precision);

  return `${parts.degrees}°${pad2(parts.minutes)}'${seconds.padStart(precision > 0 ? 3 + precision : 2, "0")}"${hemi}`;
};

export const toLatitudeDmsString = (latitudeDegrees: number, options?: DmsStringOptions): string | null => {
  if (!isValidLatitudeDegrees(latitudeDegrees)) return null;
  return toDmsString(latitudeDegrees, "N", "S", options);
};

export const toLongitudeDmsString = (longitudeDegrees: number, options?: DmsStringOptions): string | null => {
  if (!isValidLongitudeDegrees(longitudeDegrees)) return null;
  return toDmsString(longitudeDegrees, "E", "W", options);
};

export const toLatLonDmsString = (
  latitudeDegrees: number,
  longitudeDegrees: number,
  options?: DmsStringOptions,
): { lat: string; lon: string; text: string } | null => {
  if (!isValidLatLonDegrees(latitudeDegrees, longitudeDegrees)) return null;
  const lat = toLatitudeDmsString(latitudeDegrees, options);
  const lon = toLongitudeDmsString(longitudeDegrees, options);
  if (!lat || !lon) return null;
  return { lat, lon, text: `${lat}, ${lon}` };
};
