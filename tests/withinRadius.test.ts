import { describe, expect, test } from "vitest";
import { datasetsWithinRadius } from "../src/utils/withinRadius";
import type { DatasetMetadata } from "../src/types";

const make = (name: string, latitude: number, longitude: number): DatasetMetadata => ({
  name,
  description: "",
  dataType: "test",
  isPublic: true,
  collectionDate: 0,
  altitudeMin: 0,
  altitudeMax: 0,
  latitude,
  longitude,
});

// Dhaka centre.
const CENTER_LAT = 23.8103;
const CENTER_LON = 90.4125;

describe("datasetsWithinRadius", () => {
  const datasets = [
    make("here", CENTER_LAT, CENTER_LON), // 0 m
    make("near", 23.82, 90.42), // ~1.5 km
    make("chittagong", 22.3569, 91.7832), // ~230 km
    make("invalid", Number.NaN, 90.4125),
  ];

  test("returns only datasets inside the radius", () => {
    const result = datasetsWithinRadius(datasets, CENTER_LAT, CENTER_LON, 10_000);
    expect(result.map((e) => e.dataset.name)).toEqual(["here", "near"]);
  });

  test("sorts nearest-first by default", () => {
    const result = datasetsWithinRadius(datasets, CENTER_LAT, CENTER_LON, 1_000_000);
    expect(result.map((e) => e.dataset.name)).toEqual(["here", "near", "chittagong"]);
    expect(result[0].distanceMeters).toBe(0);
  });

  test("preserves source order when sort is disabled", () => {
    const result = datasetsWithinRadius(datasets, CENTER_LAT, CENTER_LON, 1_000_000, {
      sort: false,
    });
    expect(result.map((e) => e.dataset.name)).toEqual(["here", "near", "chittagong"]);
  });

  test("excludes datasets with invalid coordinates", () => {
    const result = datasetsWithinRadius(datasets, CENTER_LAT, CENTER_LON, 1_000_000);
    expect(result.some((e) => e.dataset.name === "invalid")).toBe(false);
  });

  test("returns empty for a negative or NaN radius", () => {
    expect(datasetsWithinRadius(datasets, CENTER_LAT, CENTER_LON, -1)).toEqual([]);
    expect(datasetsWithinRadius(datasets, CENTER_LAT, CENTER_LON, Number.NaN)).toEqual([]);
  });

  test("does not mutate the source array", () => {
    const copy = [...datasets];
    datasetsWithinRadius(datasets, CENTER_LAT, CENTER_LON, 1_000_000);
    expect(datasets).toEqual(copy);
  });
});
