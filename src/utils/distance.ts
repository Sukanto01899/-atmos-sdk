import { isValidLatLonDegrees } from "./coords";

export const haversineDistanceMeters = (
  latitude1Degrees: number,
  longitude1Degrees: number,
  latitude2Degrees: number,
  longitude2Degrees: number,
): number | null => {
  if (!isValidLatLonDegrees(latitude1Degrees, longitude1Degrees)) return null;
  if (!isValidLatLonDegrees(latitude2Degrees, longitude2Degrees)) return null;

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const lat1 = toRadians(latitude1Degrees);
  const lon1 = toRadians(longitude1Degrees);
  const lat2 = toRadians(latitude2Degrees);
  const lon2 = toRadians(longitude2Degrees);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const a =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Mean Earth radius (meters).
  return 6_371_008.8 * c;
};

