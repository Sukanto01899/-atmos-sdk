import { isValidLatLonDegrees } from "./coords";

export type GoogleMapsOptions = { zoom?: number; baseUrl?: string };

const normalizeBase = (base: string) => {
  const trimmed = (base ?? "").trim();
  if (!trimmed) {
    return "https://www.google.com/maps";
  }
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

const clampZoom = (zoom: number) => {
  if (!Number.isFinite(zoom)) return 11;
  const rounded = Math.round(zoom);
  return Math.min(21, Math.max(0, rounded));
};

export const toGoogleMapsUrl = (
  latitudeDegrees: number,
  longitudeDegrees: number,
  options?: GoogleMapsOptions,
): string | null => {
  if (!isValidLatLonDegrees(latitudeDegrees, longitudeDegrees)) {
    return null;
  }

  const baseUrl = normalizeBase(options?.baseUrl ?? "https://www.google.com/maps");
  const zoom = clampZoom(options?.zoom ?? 11);
  const lat = String(latitudeDegrees);
  const lon = String(longitudeDegrees);

  return `${baseUrl}?q=${encodeURIComponent(`${lat},${lon}`)}&z=${encodeURIComponent(String(zoom))}`;
};

export const toGoogleMapsUrlFromMicroDegrees = (
  latitudeMicroDegrees: number,
  longitudeMicroDegrees: number,
  options?: GoogleMapsOptions,
): string | null => {
  if (
    !Number.isFinite(latitudeMicroDegrees) ||
    !Number.isFinite(longitudeMicroDegrees)
  ) {
    return null;
  }

  return toGoogleMapsUrl(
    latitudeMicroDegrees / 1_000_000,
    longitudeMicroDegrees / 1_000_000,
    options,
  );
};
