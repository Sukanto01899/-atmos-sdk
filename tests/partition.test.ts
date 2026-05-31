import { describe, expect, test } from "vitest";
import { partitionDatasets } from "../src/utils/partition";
import { isVerifiedDataset } from "../src/utils/predicates";
import type { DatasetMetadata } from "../src/types";

const make = (overrides: Partial<DatasetMetadata>): DatasetMetadata => ({
  name: "ds",
  description: "",
  dataType: "csv",
  isPublic: true,
  collectionDate: 0,
  altitudeMin: 0,
  altitudeMax: 0,
  latitude: 0,
  longitude: 0,
  ...overrides,
});

describe("partitionDatasets", () => {
  test("splits by predicate, preserving source order on each side", () => {
    const a = make({ name: "a", verified: true });
    const b = make({ name: "b", verified: false });
    const c = make({ name: "c", status: "verified" });
    const d = make({ name: "d" });

    const [pass, fail] = partitionDatasets([a, b, c, d], isVerifiedDataset);
    expect(pass.map((x) => x.name)).toEqual(["a", "c"]);
    expect(fail.map((x) => x.name)).toEqual(["b", "d"]);
  });

  test("passes the index to the predicate", () => {
    const items = [make({ name: "0" }), make({ name: "1" }), make({ name: "2" })];
    const [pass, fail] = partitionDatasets(items, (_ds, i) => i % 2 === 0);
    expect(pass.map((x) => x.name)).toEqual(["0", "2"]);
    expect(fail.map((x) => x.name)).toEqual(["1"]);
  });

  test("handles an all-pass and all-fail split", () => {
    const items = [make({}), make({})];
    expect(partitionDatasets(items, () => true)).toEqual([items, []]);
    expect(partitionDatasets(items, () => false)).toEqual([[], items]);
  });

  test("returns two empty arrays for empty input", () => {
    expect(partitionDatasets([], () => true)).toEqual([[], []]);
  });

  test("does not mutate the source array", () => {
    const items = [make({ name: "a" }), make({ name: "b" })];
    const copy = [...items];
    partitionDatasets(items, () => true);
    expect(items).toEqual(copy);
  });
});
