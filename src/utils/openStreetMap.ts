export type OpenStreetMapOptions = { zoom?: number; baseUrl?: string };

const normalizeBase = (base: string) => {
  const trimmed = (base ?? "").trim();
  if (!trimmed) {
    return "https://www.openstreetmap.org";
  }
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

const clampZoom = (zoom: number) => {
  if (!Number.isFinite(zoom)) return 11;
  const rounded = Math.round(zoom);
  return Math.min(19, Math.max(0, rounded));
};

export const toOpenStreetMapUrl = (
  latitudeDegrees: number,
  longitudeDegrees: number,
  options?: OpenStreetMapOptions,
): string | null => {
  if (!Number.isFinite(latitudeDegrees) || !Number.isFinite(longitudeDegrees)) {
    return null;
  }

  const baseUrl = normalizeBase(options?.baseUrl ?? "https://www.openstreetmap.org");
  const zoom = clampZoom(options?.zoom ?? 11);
  const lat = String(latitudeDegrees);
  const lon = String(longitudeDegrees);

  return `${baseUrl}/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(
    lon,
  )}#map=${encodeURIComponent(String(zoom))}/${encodeURIComponent(
    lat,
  )}/${encodeURIComponent(lon)}`;
};

export const toOpenStreetMapUrlFromMicroDegrees = (
  latitudeMicroDegrees: number,
  longitudeMicroDegrees: number,
  options?: OpenStreetMapOptions,
): string | null => {
  if (
    !Number.isFinite(latitudeMicroDegrees) ||
    !Number.isFinite(longitudeMicroDegrees)
  ) {
    return null;
  }

  return toOpenStreetMapUrl(
    latitudeMicroDegrees / 1_000_000,
    longitudeMicroDegrees / 1_000_000,
    options,
  );
};

