export const toMicroDegrees = (degrees: number): number | null => {
  if (!Number.isFinite(degrees)) return null;
  return Math.round(degrees * 1_000_000);
};

export const fromMicroDegrees = (microDegrees: number): number | null => {
  if (!Number.isFinite(microDegrees)) return null;
  return microDegrees / 1_000_000;
};

