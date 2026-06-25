import { describe, expect, test } from "vitest";
import { getRelatedTags } from "../src/utils/relatedTags";
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

describe("getRelatedTags", () => {
  test("counts other tags that co-occur with the query tag", () => {
    const related = getRelatedTags(
      [
        make("a", ["climate", "rainfall"]),
        make("b", ["climate", "rainfall"]),
        make("c", ["climate", "lidar"]),
        make("d", ["lidar"]),
      ],
      "climate",
    );

    expect(related).toEqual([
      { tag: "rainfall", count: 2 },
      { tag: "lidar", count: 1 },
    ]);
  });

  test("excludes the query tag itself from results", () => {
    const related = getRelatedTags([make("a", ["climate", "climate"])], "climate");
    expect(related).toEqual([]);
  });

  test("does not double-count repeated co-occurring tags within one dataset", () => {
    const related = getRelatedTags(
      [make("a", ["climate", "rainfall", "rainfall"])],
      "climate",
    );
    expect(related).toEqual([{ tag: "rainfall", count: 1 }]);
  });

  test("returns an empty array when the query tag never occurs", () => {
    expect(getRelatedTags([make("a", ["lidar"])], "climate")).toEqual([]);
  });

  test("matches case-insensitively when requested", () => {
    const related = getRelatedTags(
      [make("a", ["Climate", "Rainfall"])],
      "climate",
      { caseInsensitive: true },
    );
    expect(related).toEqual([{ tag: "Rainfall", count: 1 }]);
  });

  test("respects the limit option", () => {
    const related = getRelatedTags(
      [
        make("a", ["climate", "rainfall"]),
        make("b", ["climate", "rainfall"]),
        make("c", ["climate", "lidar"]),
      ],
      "climate",
      { limit: 1 },
    );
    expect(related).toEqual([{ tag: "rainfall", count: 2 }]);
  });

  test("breaks count ties alphabetically", () => {
    const related = getRelatedTags(
      [make("a", ["climate", "zeta"]), make("b", ["climate", "alpha"])],
      "climate",
    );
    expect(related).toEqual([
      { tag: "alpha", count: 1 },
      { tag: "zeta", count: 1 },
    ]);
  });
});
