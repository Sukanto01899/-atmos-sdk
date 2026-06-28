import { describe, expect, test } from "vitest";
import { diffDatasetCollections } from "../src/utils/diffCollections";
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

describe("diffDatasetCollections", () => {
  test("reports datasets present only in current as added", () => {
    const result = diffDatasetCollections([make("1")], [make("1"), make("2")]);

    expect(result.added.map((d) => d.id)).toEqual(["2"]);
    expect(result.removed).toEqual([]);
    expect(result.changed).toEqual([]);
  });

  test("reports datasets present only in previous as removed", () => {
    const result = diffDatasetCollections([make("1"), make("2")], [make("1")]);

    expect(result.removed.map((d) => d.id)).toEqual(["2"]);
    expect(result.added).toEqual([]);
  });

  test("reports datasets present in both with a changed field as changed", () => {
    const result = diffDatasetCollections(
      [make("1", { name: "Old name" })],
      [make("1", { name: "New name" })],
    );

    expect(result.changed).toHaveLength(1);
    expect(result.changed[0].id).toBe("1");
    expect(result.changed[0].diff.changed).toEqual([
      { field: "name", previous: "Old name", current: "New name" },
    ]);
  });

  test("omits unchanged datasets from changed", () => {
    const result = diffDatasetCollections([make("1")], [make("1")]);
    expect(result.changed).toEqual([]);
  });

  test("matches datasets without an id under the empty-string key", () => {
    const result = diffDatasetCollections(
      [make("1", { id: undefined, name: "Old" })],
      [make("1", { id: undefined, name: "New" })],
    );

    expect(result.changed).toHaveLength(1);
    expect(result.changed[0].id).toBe("");
  });

  test("handles two empty arrays", () => {
    const result = diffDatasetCollections([], []);
    expect(result).toEqual({ added: [], removed: [], changed: [] });
  });
});
