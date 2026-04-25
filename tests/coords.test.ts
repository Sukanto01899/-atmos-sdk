import { describe, expect, test } from "vitest";
import {
  fromMicroDegrees,
  isValidLatLonDegrees,
  isValidLatitudeDegrees,
  isValidLongitudeDegrees,
  parseLatLonDegrees,
  toMicroDegrees,
} from "../src/utils/coords";

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

  test("validates lat/lon degree ranges", () => {
    expect(isValidLatitudeDegrees(90)).toBe(true);
    expect(isValidLatitudeDegrees(-90)).toBe(true);
    expect(isValidLatitudeDegrees(90.0001)).toBe(false);
    expect(isValidLatitudeDegrees(Number.NaN)).toBe(false);

    expect(isValidLongitudeDegrees(180)).toBe(true);
    expect(isValidLongitudeDegrees(-180)).toBe(true);
    expect(isValidLongitudeDegrees(180.5)).toBe(false);

    expect(isValidLatLonDegrees(23.65, 90.55)).toBe(true);
    expect(isValidLatLonDegrees(91, 0)).toBe(false);
    expect(isValidLatLonDegrees(0, 181)).toBe(false);
  });

  test("parses lat/lon degree strings", () => {
    expect(parseLatLonDegrees("23.65,90.55")).toEqual({
      latitudeDegrees: 23.65,
      longitudeDegrees: 90.55,
    });
    expect(parseLatLonDegrees(" ( 23.65  90.55 ) ")).toEqual({
      latitudeDegrees: 23.65,
      longitudeDegrees: 90.55,
    });
    expect(parseLatLonDegrees("")).toBeNull();
    expect(parseLatLonDegrees("23.65")).toBeNull();
    expect(parseLatLonDegrees("91,0")).toBeNull();
    expect(parseLatLonDegrees("0,181")).toBeNull();
    expect(parseLatLonDegrees("NaN,0")).toBeNull();
    expect(parseLatLonDegrees("23.65,90.55,0")).toBeNull();
    expect(parseLatLonDegrees("23.65 abc")).toBeNull();
  });
});
