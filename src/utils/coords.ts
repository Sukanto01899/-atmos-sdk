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
