import { describe, expect, test } from "vitest";
import { groupDatasetsByTag } from "../src/utils/groupByTag";
import type { DatasetMetadata } from "../src/types";

const make = (name: string, tags?: string[]): DatasetMetadata => ({
  name,
  description: "",
  dataType: "csv",
  isPublic: true,
  collectionDate: 0,
  altitudeMin: 0,
  altitudeMax: 0,
  latitude: 0,
  longitude: 0,
  tags,
});

describe("groupDatasetsByTag", () => {
  test("places a dataset under every tag it carries", () => {
    const a = make("a", ["climate", "lidar"]);
    const b = make("b", ["climate"]);
    const groups = groupDatasetsByTag([a, b]);

    expect([...groups.keys()]).toEqual(["climate", "lidar"]);
    expect(groups.get("climate")!.map((d) => d.name)).toEqual(["a", "b"]);
    expect(groups.get("lidar")!.map((d) => d.name)).toEqual(["a"]);
  });

  test("omits untagged datasets by default", () => {
    const groups = groupDatasetsByTag([make("a", ["x"]), make("b"), make("c", [])]);
    expect([...groups.keys()]).toEqual(["x"]);
  });

  test("buckets untagged datasets under untaggedKey when provided", () => {
    const groups = groupDatasetsByTag([make("a", ["x"]), make("b")], {
      untaggedKey: "(untagged)",
    });
    expect(groups.get("(untagged)")!.map((d) => d.name)).toEqual(["b"]);
  });

  test("groups case-insensitively under the first-seen spelling", () => {
    const groups = groupDatasetsByTag([make("a", ["Climate"]), make("b", ["climate"])], {
      caseInsensitive: true,
    });
    expect([...groups.keys()]).toEqual(["Climate"]);
    expect(groups.get("Climate")!.map((d) => d.name)).toEqual(["a", "b"]);
  });

  test("does not list a dataset twice when it repeats a tag", () => {
    const groups = groupDatasetsByTag([make("a", ["climate", "Climate"])], {
      caseInsensitive: true,
    });
    expect(groups.get("climate")!.map((d) => d.name)).toEqual(["a"]);
  });

  test("returns an empty map for empty input", () => {
    expect(groupDatasetsByTag([]).size).toBe(0);
  });
});
