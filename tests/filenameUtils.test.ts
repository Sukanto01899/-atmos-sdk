import { describe, expect, test } from "vitest";
import { sanitizeFilename, toDatasetFilename } from "../src/utils/filename";
import type { DatasetMetadata } from "../src/types";

describe("filename utils", () => {
  test("sanitizes invalid filesystem characters", () => {
    expect(sanitizeFilename(`a<>:"/\\|?*b`)).toBe("a---------b");
    expect(sanitizeFilename("  spaced   name  ")).toBe("spaced name");
    expect(sanitizeFilename("")).toBeNull();
  });

  test("supports options", () => {
    expect(sanitizeFilename("Hello:World", { replacement: "_" })).toBe("Hello_World");
    expect(sanitizeFilename("Hello World", { lower: true })).toBe("hello world");
    expect(sanitizeFilename("a".repeat(300), { maxLength: 10 })?.length).toBe(10);
  });

  test("builds dataset filenames", () => {
    const md: DatasetMetadata = {
      id: "DS_001",
      name: "Delta Wind Profile",
      description: "",
      dataType: "wind",
      isPublic: true,
      collectionDate: 1,
      altitudeMin: 0,
      altitudeMax: 0,
      latitude: 0,
      longitude: 0,
    };

    expect(toDatasetFilename(md)).toBe("delta-wind-profile");
    expect(toDatasetFilename(md, { extension: "json" })).toBe("delta-wind-profile.json");
  });

  test("falls back to id when name is empty", () => {
    const md: DatasetMetadata = {
      id: "DS_001",
      name: "",
      description: "",
      dataType: "wind",
      isPublic: true,
      collectionDate: 1,
      altitudeMin: 0,
      altitudeMax: 0,
      latitude: 0,
      longitude: 0,
    };
    expect(toDatasetFilename(md, { extension: "csv" })).toBe("DS_001.csv");
  });
});
