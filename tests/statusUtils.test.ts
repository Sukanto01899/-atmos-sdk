import { describe, expect, test } from "vitest";
import { compareDatasetStatusPriority, getDatasetStatusPriority } from "../src/utils/status";

describe("status utils", () => {
  test("prioritizes verified > pending > active > deprecated > unknown", () => {
    expect(getDatasetStatusPriority("verified")).toBe(4);
    expect(getDatasetStatusPriority("pending")).toBe(3);
    expect(getDatasetStatusPriority("active")).toBe(2);
    expect(getDatasetStatusPriority("deprecated")).toBe(1);
    expect(getDatasetStatusPriority("rejected")).toBe(0);
    expect(getDatasetStatusPriority("")).toBe(0);
    expect(getDatasetStatusPriority(null)).toBe(0);
  });

  test("compares priorities (descending)", () => {
    expect(compareDatasetStatusPriority("verified", "pending")).toBeLessThan(0);
    expect(compareDatasetStatusPriority("active", "verified")).toBeGreaterThan(0);
    expect(compareDatasetStatusPriority("unknown", "unknown")).toBe(0);
  });
});

