import { describe, expect, test } from "vitest";
import { findDuplicateDatasets } from "../src/utils/findDuplicates";
import type { DatasetMetadata } from "../src/types";

const make = (
  id: string,
  overrides: Partial<DatasetMetadata> = {},
): DatasetMetadata => ({
  id,
  name: "Delta Wind Profile",
  description: "",
  dataType: "wind",
  isPublic: true,
  collectionDate: 0,
  altitudeMin: 0,
  altitudeMax: 0,
  latitude: 23.65,
  longitude: 90.55,
  ipfsHash: "QmHash",
  ...overrides,
});

describe("findDuplicateDatasets", () => {
  test("groups datasets matching on name + coordinates + ipfs", () => {
    const a = make("1");
    const b = make("2");
    const c = make("3", { name: "Something Else" });

    const groups = findDuplicateDatasets([a, b, c]);

    expect(groups).toHaveLength(1);
    expect(groups[0].datasets.map((d) => d.id)).toEqual(["1", "2"]);
  });

  test("returns nothing when all datasets are distinct", () => {
    const groups = findDuplicateDatasets([
      make("1", { ipfsHash: "QmA" }),
      make("2", { ipfsHash: "QmB" }),
    ]);

    expect(groups).toEqual([]);
  });

  test("normalizes name casing and whitespace", () => {
    const a = make("1", { name: "Delta Wind Profile" });
    const b = make("2", { name: "  delta   wind   profile " });

    const groups = findDuplicateDatasets([a, b]);

    expect(groups).toHaveLength(1);
    expect(groups[0].datasets.map((d) => d.id)).toEqual(["1", "2"]);
  });

  test("skips datasets missing a selected signal", () => {
    // ipfsHash is in the default signal set; a blank one cannot be matched.
    const groups = findDuplicateDatasets([
      make("1", { ipfsHash: "" }),
      make("2", { ipfsHash: "   " }),
    ]);

    expect(groups).toEqual([]);
  });

  test("honors a reduced signal set", () => {
    const a = make("1", { ipfsHash: "QmA" });
    const b = make("2", { ipfsHash: "QmB" });

    // Same name + coordinates, different hashes: dupes only when ipfs ignored.
    expect(findDuplicateDatasets([a, b])).toEqual([]);
    const groups = findDuplicateDatasets([a, b], { by: ["name", "coordinates"] });
    expect(groups).toHaveLength(1);
    expect(groups[0].datasets.map((d) => d.id)).toEqual(["1", "2"]);
  });

  test("coordinatePrecision controls how close locations must be", () => {
    const a = make("1", { latitude: 23.6500, longitude: 90.5500 });
    const b = make("2", { latitude: 23.6509, longitude: 90.5500 });

    // At 4 dp the latitudes differ (23.6500 vs 23.6509) → not duplicates.
    expect(findDuplicateDatasets([a, b])).toEqual([]);
    // At 2 dp both round to 23.65 → duplicates.
    const groups = findDuplicateDatasets([a, b], { coordinatePrecision: 2 });
    expect(groups).toHaveLength(1);
  });

  test("does not mutate the input", () => {
    const input = [make("1"), make("2")];
    const snapshot = JSON.stringify(input);
    findDuplicateDatasets(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  test("returns nothing for an empty signal set", () => {
    expect(findDuplicateDatasets([make("1"), make("2")], { by: [] })).toEqual([]);
  });
});
