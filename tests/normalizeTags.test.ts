import { describe, expect, test } from "vitest";
import { normalizeTags } from "../src/utils/normalizeTags";

describe("normalizeTags", () => {
  test("returns an empty array for null/undefined", () => {
    expect(normalizeTags(null)).toEqual([]);
    expect(normalizeTags(undefined)).toEqual([]);
  });

  test("parses a comma-separated string, trimming and dropping empties", () => {
    expect(normalizeTags("climate, Lidar ,climate,, public")).toEqual([
      "climate",
      "Lidar",
      "public",
    ]);
  });

  test("dedupes case-insensitively by default, keeping first spelling", () => {
    expect(normalizeTags(["Climate", "climate", "CLIMATE"])).toEqual(["Climate"]);
  });

  test("preserves case-variant duplicates when ci dedupe is off", () => {
    expect(
      normalizeTags(["Climate", "climate"], { caseInsensitiveDedupe: false }),
    ).toEqual(["Climate", "climate"]);
  });

  test("lowercases when requested", () => {
    expect(normalizeTags(["Climate", "climate"], { lowercase: true })).toEqual([
      "climate",
    ]);
  });

  test("handles an already-clean array unchanged", () => {
    expect(normalizeTags(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });
});
