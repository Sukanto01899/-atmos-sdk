import { describe, expect, test } from "vitest";
import { groupDatasetsByOwner } from "../src/utils/groupByOwner";
import type { DatasetMetadata } from "../src/types";

const make = (name: string, owner?: string): DatasetMetadata => ({
  name,
  description: "",
  dataType: "csv",
  isPublic: true,
  collectionDate: 0,
  altitudeMin: 0,
  altitudeMax: 0,
  latitude: 0,
  longitude: 0,
  owner,
});

describe("groupDatasetsByOwner", () => {
  test("groups datasets under their owner, preserving source order", () => {
    const a = make("a", "SP1ABC");
    const b = make("b", "SP2DEF");
    const c = make("c", "SP1ABC");
    const groups = groupDatasetsByOwner([a, b, c]);

    expect([...groups.keys()]).toEqual(["SP1ABC", "SP2DEF"]);
    expect(groups.get("SP1ABC")!.map((d) => d.name)).toEqual(["a", "c"]);
    expect(groups.get("SP2DEF")!.map((d) => d.name)).toEqual(["b"]);
  });

  test("buckets missing or blank owners under unknown", () => {
    const groups = groupDatasetsByOwner([
      make("a", "SP1ABC"),
      make("b"),
      make("c", "  "),
    ]);

    expect(groups.get("unknown")!.map((d) => d.name)).toEqual(["b", "c"]);
  });

  test("trims whitespace around owner addresses", () => {
    const groups = groupDatasetsByOwner([make("a", "  SP1ABC  ")]);
    expect([...groups.keys()]).toEqual(["SP1ABC"]);
  });

  test("returns an empty map for empty input", () => {
    expect(groupDatasetsByOwner([]).size).toBe(0);
  });
});
