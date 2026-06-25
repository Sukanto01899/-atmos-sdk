import { describe, expect, test } from "vitest";
import { getDatasetFreshnessScore } from "../src/utils/freshness";
import type { DatasetMetadata } from "../src/types";

const make = (overrides: Partial<DatasetMetadata> = {}): DatasetMetadata => ({
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

const NOW = 1_700_000_000;
const DAY = 24 * 60 * 60;
const YEAR = 365 * DAY;

describe("getDatasetFreshnessScore", () => {
  test("scores 100 for a dataset collected right now", () => {
    const ds = make({ collectionDate: NOW });
    expect(getDatasetFreshnessScore(ds, { nowSeconds: NOW })).toBe(100);
  });

  test("clamps to 100 for a date at or after now (clock skew safety)", () => {
    const ds = make({ collectionDate: NOW + DAY });
    expect(getDatasetFreshnessScore(ds, { nowSeconds: NOW })).toBe(100);
  });

  test("decays linearly toward 0 over the default 365-day window", () => {
    const halfYearOld = make({ collectionDate: NOW - YEAR / 2 });
    expect(getDatasetFreshnessScore(halfYearOld, { nowSeconds: NOW })).toBe(50);
  });

  test("clamps to 0 once older than maxAgeSeconds", () => {
    const ds = make({ collectionDate: NOW - 2 * YEAR });
    expect(getDatasetFreshnessScore(ds, { nowSeconds: NOW })).toBe(0);
  });

  test("treats a missing or non-positive date as 0", () => {
    expect(getDatasetFreshnessScore(make({ collectionDate: 0 }), { nowSeconds: NOW })).toBe(0);
  });

  test("can score against createdAt instead, with a custom window", () => {
    const ds = make({ collectionDate: NOW, createdAt: NOW - 45 * DAY });
    const score = getDatasetFreshnessScore(ds, {
      nowSeconds: NOW,
      dateField: "createdAt",
      maxAgeSeconds: 90 * DAY,
    });
    expect(score).toBe(50);
  });
});
