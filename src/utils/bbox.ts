import type { Bbox } from "../types";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const isValidBboxDegrees = (bbox: Bbox): boolean => {
  if (
    !isFiniteNumber(bbox.minLon) ||
    !isFiniteNumber(bbox.minLat) ||
    !isFiniteNumber(bbox.maxLon) ||
    !isFiniteNumber(bbox.maxLat)
  ) {
    return false;
  }

  if (bbox.minLon < -180 || bbox.minLon > 180) return false;
  if (bbox.maxLon < -180 || bbox.maxLon > 180) return false;
  if (bbox.minLat < -90 || bbox.minLat > 90) return false;
  if (bbox.maxLat < -90 || bbox.maxLat > 90) return false;

  if (bbox.minLon > bbox.maxLon) return false;
  if (bbox.minLat > bbox.maxLat) return false;

  return true;
};

export const parseBboxDegrees = (
  input: string | [number, number, number, number] | Bbox,
): Bbox | null => {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const parts = trimmed
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length !== 4) return null;
    const nums = parts.map((p) => Number(p));
    if (nums.some((n) => !Number.isFinite(n))) return null;
    const bbox: Bbox = { minLon: nums[0], minLat: nums[1], maxLon: nums[2], maxLat: nums[3] };
    return isValidBboxDegrees(bbox) ? bbox : null;
  }

  if (Array.isArray(input)) {
    if (input.length !== 4) return null;
    const bbox: Bbox = { minLon: input[0], minLat: input[1], maxLon: input[2], maxLat: input[3] };
    return isValidBboxDegrees(bbox) ? bbox : null;
  }

  if (typeof input === "object" && input !== null) {
    const bbox = input as Bbox;
    return isValidBboxDegrees(bbox) ? bbox : null;
  }

  return null;
};

export const toBboxQueryParam = (
  input: string | [number, number, number, number] | Bbox,
): string | null => {
  const bbox = parseBboxDegrees(input);
  if (!bbox) return null;
  return `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;
};

