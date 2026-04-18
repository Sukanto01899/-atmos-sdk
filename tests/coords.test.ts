import { describe, expect, test } from "vitest";
import { fromMicroDegrees, toMicroDegrees } from "../src/utils/coords";

describe("coords utils", () => {
  test("converts degrees to rounded micro-degrees", () => {
    expect(toMicroDegrees(0)).toBe(0);
    expect(toMicroDegrees(1)).toBe(1_000_000);
    expect(toMicroDegrees(-1)).toBe(-1_000_000);
    expect(toMicroDegrees(23.6500012)).toBe(23_650_001);
  });

  test("converts micro-degrees to degrees", () => {
    expect(fromMicroDegrees(0)).toBe(0);
    expect(fromMicroDegrees(1_000_000)).toBe(1);
    expect(fromMicroDegrees(-900_123_456)).toBeCloseTo(-900.123456, 6);
  });

  test("returns null for non-finite inputs", () => {
    expect(toMicroDegrees(Number.NaN)).toBeNull();
    expect(toMicroDegrees(Number.POSITIVE_INFINITY)).toBeNull();
    expect(fromMicroDegrees(Number.NaN)).toBeNull();
    expect(fromMicroDegrees(Number.NEGATIVE_INFINITY)).toBeNull();
  });
});

