import { describe, expect, test } from "vitest";
import { groupDatasetsByYear } from "../src/utils/groupByYear";
import type { DatasetMetadata } from "../src/types";

const make = (
  id: string,
  overrides: Partial<DatasetMetadata> = {},
): DatasetMetadata => ({
  id,
  name: "x",
  description: "",
  dataType: "wind",
  isPublic: true,
  collectionDate: 0,
  altitudeMin: 0,
  altitudeMax: 0,
  latitude: 0,
  longitude: 0,
  ...overrides,
});

// 2024-01-01 and 2023-06-15 in unix seconds (UTC).
const Y2024 = 1704067200;
const Y2023 = 1686787200;

describe("groupDatasetsByYear", () => {
  test("buckets by UTC collection year, ascending", () => {
    const a = make("1", { collectionDate: Y2024 });
    const b = make("2", { collectionDate: Y2023 });
    const c = make("3", { collectionDate: Y2024 });

    const byYear = groupDatasetsByYear([a, b, c]);

    expect([...byYear.keys()]).toEqual([2023, 2024]);
    expect(byYear.get(2024)!.map((d) => d.id)).toEqual(["1", "3"]);
    expect(byYear.get(2023)!.map((d) => d.id)).toEqual(["2"]);
  });

  test("skips datasets with missing or non-positive timestamps", () => {
    const byYear = groupDatasetsByYear([
      make("1", { collectionDate: Y2024 }),
      make("2", { collectionDate: 0 }),
      make("3", { collectionDate: -5 }),
    ]);

    expect([...byYear.keys()]).toEqual([2024]);
    expect(byYear.get(2024)!.map((d) => d.id)).toEqual(["1"]);
  });

  test("can bucket by createdAt instead", () => {
    const byYear = groupDatasetsByYear(
      [make("1", { collectionDate: 0, createdAt: Y2023 })],
      { field: "createdAt" },
    );

    expect([...byYear.keys()]).toEqual([2023]);
  });

  test("returns an empty map for no datasets", () => {
    expect(groupDatasetsByYear([]).size).toBe(0);
  });
});
