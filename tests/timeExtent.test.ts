import { describe, expect, test } from "vitest";
import { getDatasetTimeExtent } from "../src/utils/timeExtent";
import type { DatasetMetadata } from "../src/types";

const make = (overrides: Partial<DatasetMetadata>): DatasetMetadata => ({
  name: "ds",
  description: "",
  dataType: "csv",
  isPublic: true,
  collectionDate: 1_700_000_000,
  altitudeMin: 0,
  altitudeMax: 0,
  latitude: 0,
  longitude: 0,
  ...overrides,
});

describe("getDatasetTimeExtent", () => {
  test("returns null for an empty array", () => {
    expect(getDatasetTimeExtent([])).toBeNull();
  });

  test("spans the earliest and latest collectionDate by default", () => {
    const extent = getDatasetTimeExtent([
      make({ collectionDate: 200 }),
      make({ collectionDate: 100 }),
      make({ collectionDate: 300 }),
    ]);
    expect(extent).toEqual({ earliest: 100, latest: 300, count: 3 });
  });

  test("uses createdAt when requested", () => {
    const extent = getDatasetTimeExtent(
      [make({ createdAt: 50 }), make({ createdAt: 80 })],
      "createdAt",
    );
    expect(extent).toEqual({ earliest: 50, latest: 80, count: 2 });
  });

  test("ignores missing and invalid timestamps", () => {
    const extent = getDatasetTimeExtent(
      [
        make({ createdAt: 100 }),
        make({ createdAt: undefined }),
        make({ createdAt: -1 }),
        make({ createdAt: 1.5 }),
        make({ createdAt: 400 }),
      ],
      "createdAt",
    );
    expect(extent).toEqual({ earliest: 100, latest: 400, count: 2 });
  });

  test("returns null when no dataset has a valid value for the field", () => {
    expect(getDatasetTimeExtent([make({ createdAt: undefined })], "createdAt")).toBeNull();
  });

  test("handles a single dataset (earliest === latest)", () => {
    const extent = getDatasetTimeExtent([make({ collectionDate: 1234 })]);
    expect(extent).toEqual({ earliest: 1234, latest: 1234, count: 1 });
  });
});
