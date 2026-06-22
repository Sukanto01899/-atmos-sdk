import { describe, expect, test } from "vitest";
import { getStaleDatasets } from "../src/utils/staleDatasets";
import type { DatasetMetadata } from "../src/types";

const make = (
  id: string,
  overrides: Partial<DatasetMetadata> = {},
): DatasetMetadata => ({
  id,
  name: id,
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

const NOW = 1_700_000_000;
const DAY = 24 * 60 * 60;

describe("getStaleDatasets", () => {
  test("flags unverified datasets older than maxAgeSeconds", () => {
    const stale = make("old", { collectionDate: NOW - 100 * DAY });
    const fresh = make("new", { collectionDate: NOW - 1 * DAY });

    const result = getStaleDatasets([stale, fresh], 90 * DAY, { nowSeconds: NOW });

    expect(result.map((d) => d.id)).toEqual(["old"]);
  });

  test("never flags verified datasets, even when very old", () => {
    const old = make("old", {
      collectionDate: NOW - 365 * DAY,
      verified: true,
    });

    expect(getStaleDatasets([old], 90 * DAY, { nowSeconds: NOW })).toEqual([]);
  });

  test("treats status === 'verified' as verified too", () => {
    const old = make("old", {
      collectionDate: NOW - 365 * DAY,
      status: "verified",
    });

    expect(getStaleDatasets([old], 90 * DAY, { nowSeconds: NOW })).toEqual([]);
  });

  test("treats a missing or non-positive date as infinitely old", () => {
    const missing = make("missing", { collectionDate: 0 });

    const result = getStaleDatasets([missing], 90 * DAY, { nowSeconds: NOW });

    expect(result.map((d) => d.id)).toEqual(["missing"]);
  });

  test("can check createdAt instead of collectionDate", () => {
    const stale = make("old", {
      collectionDate: NOW,
      createdAt: NOW - 100 * DAY,
    });

    const result = getStaleDatasets([stale], 90 * DAY, {
      nowSeconds: NOW,
      dateField: "createdAt",
    });

    expect(result.map((d) => d.id)).toEqual(["old"]);
  });

  test("returns an empty array when nothing is stale", () => {
    const fresh = make("new", { collectionDate: NOW - 1 * DAY });
    expect(getStaleDatasets([fresh], 90 * DAY, { nowSeconds: NOW })).toEqual([]);
  });
});
