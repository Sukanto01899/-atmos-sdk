import { describe, expect, test } from "vitest";
import { isValidDatasetId, toDatasetId } from "../src/utils/datasetId";

describe("dataset id utils", () => {
  test("validates dataset ids", () => {
    expect(isValidDatasetId("123")).toBe(true);
    expect(isValidDatasetId("  abc  ")).toBe(true);
    expect(isValidDatasetId("")).toBe(false);
    expect(isValidDatasetId("   ")).toBe(false);
    expect(isValidDatasetId(0)).toBe(true);
    expect(isValidDatasetId(123)).toBe(true);
    expect(isValidDatasetId(-1)).toBe(false);
    expect(isValidDatasetId(1.5)).toBe(false);
    expect(isValidDatasetId(Number.NaN)).toBe(false);
    expect(isValidDatasetId(0n)).toBe(true);
    expect(isValidDatasetId(-1n)).toBe(false);
    expect(isValidDatasetId(null)).toBe(false);
  });

  test("normalizes dataset ids to strings", () => {
    expect(toDatasetId(" 123 ")).toBe("123");
    expect(toDatasetId(123)).toBe("123");
    expect(toDatasetId(123n)).toBe("123");
    expect(toDatasetId("")).toBeNull();
    expect(toDatasetId(-1)).toBeNull();
  });
});

