import { describe, expect, test } from "vitest";
import { getDatasetsCentroid } from "../src/utils/centroid";
import type { DatasetMetadata } from "../src/types";

const make = (
  latitude: number,
  longitude: number,
  altitudeMin = 0,
  altitudeMax = 0,
): DatasetMetadata => ({
  name: "ds",
  description: "",
  dataType: "test",
  isPublic: true,
  collectionDate: 0,
  altitudeMin,
  altitudeMax,
  latitude,
  longitude,
});

describe("getDatasetsCentroid", () => {
  test("returns null for an empty array", () => {
    expect(getDatasetsCentroid([])).toBeNull();
  });

  test("returns the point itself for a single dataset", () => {
    const c = getDatasetsCentroid([make(51.5, -0.1)]);
    expect(c).toEqual({ latitude: 51.5, longitude: -0.1, altitude: 0, count: 1 });
  });

  test("averages latitude and longitude", () => {
    const c = getDatasetsCentroid([make(0, 0), make(10, 20)]);
    expect(c).not.toBeNull();
    expect(c!.latitude).toBe(5);
    expect(c!.longitude).toBe(10);
    expect(c!.count).toBe(2);
  });

  test("reports the altitude range midpoint", () => {
    const c = getDatasetsCentroid([make(0, 0, 100, 200), make(0, 0, 50, 400)]);
    expect(c!.altitude).toBe(225); // (50 + 400) / 2
  });

  test("ignores datasets with invalid coordinates", () => {
    const c = getDatasetsCentroid([make(10, 10), make(Number.NaN, 10), make(20, 20)]);
    expect(c!.count).toBe(2);
    expect(c!.latitude).toBe(15);
    expect(c!.longitude).toBe(15);
  });

  test("returns null altitude when none are finite", () => {
    const c = getDatasetsCentroid([make(0, 0, Number.NaN, Number.NaN)]);
    expect(c!.altitude).toBeNull();
  });
});
