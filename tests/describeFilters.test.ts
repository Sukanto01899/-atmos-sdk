import { describe, expect, test } from "vitest";
import { describeFilters } from "../src/utils/describeFilters";

describe("describeFilters", () => {
  test("returns the empty placeholder for no filters", () => {
    expect(describeFilters({})).toBe("all datasets");
    expect(describeFilters({}, { empty: "everything" })).toBe("everything");
  });

  test("describes simple equality filters", () => {
    expect(
      describeFilters({ isPublic: true, verified: true, dataType: "lidar" }),
    ).toBe("type=lidar, public, verified");
  });

  test("renders private / unverified / mutable negatives", () => {
    expect(
      describeFilters({ isPublic: false, verified: false, metadataFrozen: false }),
    ).toBe("private, unverified, mutable");
  });

  test("prefers visibility over isPublic", () => {
    expect(describeFilters({ visibility: "private", isPublic: true })).toBe("private");
  });

  test("formats an altitude range with units", () => {
    expect(describeFilters({ altitudeMin: 0, altitudeMax: 5000 })).toBe(
      "altitude 0–5000m",
    );
    expect(describeFilters({ altitudeMin: 100 })).toBe("altitude ≥100m");
    expect(describeFilters({ altitudeMax: 200 })).toBe("altitude ≤200m");
  });

  test("formats date ranges as UTC ISO dates", () => {
    // 2024-01-01 and 2024-06-01 in unix seconds.
    expect(describeFilters({ from: 1704067200, to: 1717200000 })).toBe(
      "collected 2024-01-01–2024-06-01",
    );
    expect(describeFilters({ createdAtFrom: 1704067200 })).toBe(
      "created ≥2024-01-01",
    );
  });

  test("joins tags with +", () => {
    expect(describeFilters({ tags: ["climate", "public"] })).toBe(
      "tags: climate+public",
    );
  });

  test("ignores blank search and paging fields", () => {
    expect(
      describeFilters({ search: "   ", limit: 50, cursor: "abc", sort: "name" }),
    ).toBe("all datasets");
  });

  test("honors a custom separator", () => {
    expect(
      describeFilters({ isPublic: true, verified: true }, { separator: " | " }),
    ).toBe("public | verified");
  });

  test("combines many clauses in a stable order", () => {
    expect(
      describeFilters({
        tags: ["a"],
        dataType: "csv",
        search: "rain",
        verified: true,
      }),
    ).toBe('search "rain", type=csv, verified, tags: a');
  });
});
