import { describe, expect, test } from "vitest";
import { datasetsWithinBbox } from "../src/utils/withinBbox";
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

const datasets = [
  make("inside", 51.5, -0.1),
  make("on-edge", 51.3, -0.5),
  make("outside-lon", 51.5, 2.0),
  make("outside-lat", 60.0, -0.1),
  make("invalid", Number.NaN, -0.1),
];

// [minLon, minLat, maxLon, maxLat]
const LONDON: [number, number, number, number] = [-0.5, 51.3, 0.3, 51.7];

describe("datasetsWithinBbox", () => {
  test("keeps only datasets inside the bbox (edges inclusive)", () => {
    const result = datasetsWithinBbox(datasets, LONDON);
    expect(result.map((d) => d.name)).toEqual(["inside", "on-edge"]);
  });

  test("accepts a string bbox", () => {
    const result = datasetsWithinBbox(datasets, "-0.5,51.3,0.3,51.7");
    expect(result.map((d) => d.name)).toEqual(["inside", "on-edge"]);
  });

  test("accepts a Bbox object", () => {
    const result = datasetsWithinBbox(datasets, {
      minLon: -0.5,
      minLat: 51.3,
      maxLon: 0.3,
      maxLat: 51.7,
    });
    expect(result.map((d) => d.name)).toEqual(["inside", "on-edge"]);
  });

  test("excludes datasets with invalid coordinates", () => {
    const result = datasetsWithinBbox(datasets, LONDON);
    expect(result.some((d) => d.name === "invalid")).toBe(false);
  });

  test("returns empty for an invalid bbox", () => {
    expect(datasetsWithinBbox(datasets, "not-a-bbox")).toEqual([]);
    expect(datasetsWithinBbox(datasets, [200, 0, 0, 0])).toEqual([]);
  });

  test("does not mutate the source array", () => {
    const copy = [...datasets];
    datasetsWithinBbox(datasets, LONDON);
    expect(datasets).toEqual(copy);
  });
});
