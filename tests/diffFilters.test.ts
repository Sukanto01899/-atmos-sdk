import { describe, expect, test } from "vitest";
import { diffFilters } from "../src/utils/diffFilters";

describe("diffFilters", () => {
  test("returns nothing when filters are equal", () => {
    expect(diffFilters({ status: "active" }, { status: "active" })).toEqual([]);
  });

  test("reports a changed scalar", () => {
    expect(diffFilters({ status: "active" }, { status: "verified" })).toEqual([
      { key: "status", before: "active", after: "verified" },
    ]);
  });

  test("reports added and removed keys with undefined on the missing side", () => {
    const changes = diffFilters({ owner: "SP1" }, { dataType: "csv" });
    expect(changes).toEqual([
      { key: "owner", before: "SP1", after: undefined },
      { key: "dataType", before: undefined, after: "csv" },
    ]);
  });

  test("compares tag arrays structurally", () => {
    expect(diffFilters({ tags: ["a", "b"] }, { tags: ["a", "b"] })).toEqual([]);
    expect(diffFilters({ tags: ["a"] }, { tags: ["a", "b"] })).toEqual([
      { key: "tags", before: ["a"], after: ["a", "b"] },
    ]);
  });

  test("compares bbox objects structurally", () => {
    const bbox = { minLon: 0, minLat: 0, maxLon: 1, maxLat: 1 };
    expect(diffFilters({ bbox }, { bbox: { ...bbox } })).toEqual([]);
  });

  test("keeps a stable key order: before keys first, then new after keys", () => {
    const changes = diffFilters(
      { status: "active", owner: "SP1" },
      { owner: "SP2", dataType: "csv" },
    );
    expect(changes.map((c) => c.key)).toEqual(["status", "owner", "dataType"]);
  });
});
