import { isValidLatLonDegrees, toLatLonDegreesString } from "./coords";

export type GeoUriOptions = { label?: string; query?: string };

export const toGeoUri = (
  latitudeDegrees: number,
  longitudeDegrees: number,
  options?: GeoUriOptions,
): string | null => {
  if (!isValidLatLonDegrees(latitudeDegrees, longitudeDegrees)) return null;

  const coords = toLatLonDegreesString(latitudeDegrees, longitudeDegrees);
  if (!coords) return null;

  const label = String(options?.label ?? "").trim();
  const query = String(options?.query ?? "").trim();

  if (query) {
    return `geo:${coords}?q=${encodeURIComponent(query)}`;
  }

  if (label) {
    return `geo:${coords}?q=${encodeURIComponent(`${coords}(${label})`)}`;
  }

  return `geo:${coords}`;
};

export const toGeoUriFromMicroDegrees = (
  latitudeMicroDegrees: number,
  longitudeMicroDegrees: number,
  options?: GeoUriOptions,
): string | null => {
  if (!Number.isFinite(latitudeMicroDegrees) || !Number.isFinite(longitudeMicroDegrees)) {
    return null;
  }

  return toGeoUri(latitudeMicroDegrees / 1_000_000, longitudeMicroDegrees / 1_000_000, options);
};

