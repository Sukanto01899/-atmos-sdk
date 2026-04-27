import { describe, expect, test } from "vitest";
import { toLatLonDmsString, toLatitudeDmsString, toLongitudeDmsString } from "../src/utils/coords";

describe("dms utils", () => {
  test("formats latitude/longitude as DMS", () => {
    expect(toLatitudeDmsString(23.65)).toBe(`23°39'00.00"N`);
    expect(toLongitudeDmsString(90.55)).toBe(`90°33'00.00"E`);
    expect(toLatitudeDmsString(-23.65)).toBe(`23°39'00.00"S`);
    expect(toLongitudeDmsString(-74)).toBe(`74°00'00.00"W`);
  });

  test("supports seconds precision", () => {
    expect(toLatitudeDmsString(23.65, { secondsPrecision: 0 })).toBe(`23°39'00"N`);
    expect(toLongitudeDmsString(90.5502777778, { secondsPrecision: 1 })).toBe(`90°33'01.0"E`);
  });

  test("handles rounding carry", () => {
    // 12.9999999 degrees rounds to 13 degrees at 0s precision.
    expect(toLatitudeDmsString(12.9999999, { secondsPrecision: 0 })).toBe(`13°00'00"N`);
  });

  test("returns null for invalid inputs", () => {
    expect(toLatitudeDmsString(91)).toBeNull();
    expect(toLongitudeDmsString(181)).toBeNull();
    expect(toLatLonDmsString(23.65, 181)).toBeNull();
  });

  test("formats combined lat/lon DMS", () => {
    expect(toLatLonDmsString(23.65, 90.55)).toEqual({
      lat: `23°39'00.00"N`,
      lon: `90°33'00.00"E`,
      text: `23°39'00.00"N, 90°33'00.00"E`,
    });
  });
});

