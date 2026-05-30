import { describe, expect, test } from "vitest";
import { validateDatasetMetadata } from "../src/utils/validate";
import type { DatasetMetadata } from "../src/types";

const valid = (): DatasetMetadata => ({
  name: "Soil moisture",
  description: "Field readings",
  dataType: "csv",
  isPublic: true,
  collectionDate: 1_700_000_000,
  altitudeMin: 0,
  altitudeMax: 100,
  latitude: 51.5,
  longitude: -0.1,
});

const fieldsWithErrors = (m: DatasetMetadata) =>
  validateDatasetMetadata(m).errors.map((e) => e.field);

describe("validateDatasetMetadata", () => {
  test("accepts a well-formed metadata object", () => {
    const result = validateDatasetMetadata(valid());
    expect(result).toEqual({ valid: true, errors: [] });
  });

  test("flags empty required text fields", () => {
    const fields = fieldsWithErrors({ ...valid(), name: "  ", description: "" });
    expect(fields).toContain("name");
    expect(fields).toContain("description");
  });

  test("flags out-of-range coordinates", () => {
    const fields = fieldsWithErrors({ ...valid(), latitude: 91, longitude: -200 });
    expect(fields).toContain("latitude");
    expect(fields).toContain("longitude");
  });

  test("flags altitudeMin greater than altitudeMax", () => {
    const fields = fieldsWithErrors({ ...valid(), altitudeMin: 500, altitudeMax: 100 });
    expect(fields).toContain("altitudeMax");
  });

  test("flags invalid collectionDate and createdAt", () => {
    expect(fieldsWithErrors({ ...valid(), collectionDate: -1 })).toContain("collectionDate");
    expect(fieldsWithErrors({ ...valid(), collectionDate: 1.5 })).toContain("collectionDate");
    expect(fieldsWithErrors({ ...valid(), createdAt: -5 })).toContain("createdAt");
  });

  test("ignores createdAt when undefined", () => {
    const result = validateDatasetMetadata(valid());
    expect(result.errors.some((e) => e.field === "createdAt")).toBe(false);
  });

  test("flags an unknown status but accepts known ones", () => {
    expect(fieldsWithErrors({ ...valid(), status: "bogus" as never })).toContain("status");
    expect(validateDatasetMetadata({ ...valid(), status: "verified" }).valid).toBe(true);
  });

  test("collects all problems at once", () => {
    const result = validateDatasetMetadata({
      ...valid(),
      name: "",
      latitude: 999,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
