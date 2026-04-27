import { describe, expect, test } from "vitest";
import { slugify, toDatasetSlug } from "../src/utils/slug";
import type { DatasetMetadata } from "../src/types";

describe("slug utils", () => {
  test("slugifies basic strings", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("  multiple   spaces  ")).toBe("multiple-spaces");
    expect(slugify("Already-Slug")).toBe("already-slug");
  });

  test("handles accents and punctuation", () => {
    expect(slugify("Café Déjà vu!")).toBe("cafe-deja-vu");
    expect(slugify("wind/data:type")).toBe("wind-data-type");
  });

  test("supports options", () => {
    expect(slugify("Hello World", { separator: "_", lower: false })).toBe("Hello_World");
    expect(slugify("Hello World", { maxLength: 5 })).toBe("hello");
    expect(slugify("----", { separator: "-" })).toBeNull();
  });

  test("builds dataset slug from metadata", () => {
    const md: DatasetMetadata = {
      id: "123",
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
    expect(toDatasetSlug(md)).toBe("delta-wind-profile");
  });

  test("falls back to id when name cannot slugify", () => {
    const md: DatasetMetadata = {
      id: "DS_001",
      name: "----",
      description: "",
      dataType: "wind",
      isPublic: true,
      collectionDate: 1,
      altitudeMin: 0,
      altitudeMax: 0,
      latitude: 0,
      longitude: 0,
    };
    expect(toDatasetSlug(md)).toBe("DS_001");
  });
});

