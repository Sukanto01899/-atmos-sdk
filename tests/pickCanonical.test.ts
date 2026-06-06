import { describe, expect, test } from "vitest";
import { pickCanonicalDataset } from "../src/utils/pickCanonical";
import type { DatasetMetadata } from "../src/types";

const make = (
  id: string,
  overrides: Partial<DatasetMetadata> = {},
): DatasetMetadata => ({
  id,
  name: "Delta Wind Profile",
  description: "",
  dataType: "wind",
  isPublic: false,
  collectionDate: 0,
  altitudeMin: 0,
  altitudeMax: 0,
  latitude: 0,
  longitude: 0,
  ...overrides,
});

describe("pickCanonicalDataset", () => {
  test("returns null for an empty array", () => {
    expect(pickCanonicalDataset([])).toBeNull();
  });

  test("returns the only dataset when there is one", () => {
    const a = make("1");
    expect(pickCanonicalDataset([a])).toBe(a);
  });

  test("prefers the higher quality score", () => {
    const low = make("1");
    const high = make("2", { status: "verified", ipfsHash: "QmHash" });
    expect(pickCanonicalDataset([low, high])).toBe(high);
  });

  test("breaks quality ties by completeness", () => {
    // Both have identical quality (0); the second fills more metadata fields.
    const sparse = make("1");
    const complete = make("2", {
      description: "full",
      collectionDate: 100,
      latitude: 23.6,
      longitude: 90.5,
      altitudeMin: 0,
      altitudeMax: 10,
      tags: ["climate"],
    });
    expect(pickCanonicalDataset([sparse, complete])).toBe(complete);
  });

  test("breaks quality+completeness ties by most recent createdAt", () => {
    const older = make("1", { createdAt: 100 });
    const newer = make("2", { createdAt: 200 });
    expect(pickCanonicalDataset([older, newer])).toBe(newer);
  });

  test("keeps the earliest input on a full tie", () => {
    const first = make("1", { createdAt: 100 });
    const second = make("2", { createdAt: 100 });
    expect(pickCanonicalDataset([first, second])).toBe(first);
  });

  test("does not mutate the input", () => {
    const input = [make("1"), make("2", { status: "verified" })];
    const snapshot = JSON.stringify(input);
    pickCanonicalDataset(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
