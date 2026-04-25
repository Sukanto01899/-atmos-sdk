import { describe, expect, test } from "vitest";
import { haversineDistanceMeters } from "../src/utils/distance";

describe("distance utils", () => {
  test("returns null for invalid coords", () => {
    expect(haversineDistanceMeters(Number.NaN, 0, 0, 0)).toBeNull();
    expect(haversineDistanceMeters(0, 0, 91, 0)).toBeNull();
  });

  test("returns 0 for identical points", () => {
    expect(haversineDistanceMeters(23.65, 90.55, 23.65, 90.55)).toBe(0);
  });

  test("computes approximate distance", () => {
    // Dhaka (23.8103, 90.4125) -> Chittagong (22.3569, 91.7832)
    const d = haversineDistanceMeters(23.8103, 90.4125, 22.3569, 91.7832);
    expect(d).not.toBeNull();
    expect(d!).toBeGreaterThan(200_000);
    expect(d!).toBeLessThan(260_000);
  });
});

