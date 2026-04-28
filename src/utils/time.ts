export const isValidUnixSeconds = (unixSeconds: number): boolean =>
  Number.isFinite(unixSeconds) && unixSeconds >= 0 && Number.isInteger(unixSeconds);

export const toIsoStringFromUnixSeconds = (unixSeconds: number): string | null => {
  if (!isValidUnixSeconds(unixSeconds)) return null;
  return new Date(unixSeconds * 1000).toISOString();
};

export const parseUnixSecondsFromIsoString = (isoString: string): number | null => {
  const trimmed = String(isoString ?? "").trim();
  if (!trimmed) return null;

  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) return null;

  const seconds = Math.floor(ms / 1000);
  return isValidUnixSeconds(seconds) ? seconds : null;
};

