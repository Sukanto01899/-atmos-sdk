import { describe, expect, test } from "vitest";
import { toGeoUri, toGeoUriFromMicroDegrees } from "../src/utils/geoUri";

describe("geo uri utils", () => {
  test("returns null for invalid numbers", () => {
    expect(toGeoUri(Number.NaN, 0)).toBeNull();
    expect(toGeoUri(0, Number.POSITIVE_INFINITY)).toBeNull();
    expect(toGeoUriFromMicroDegrees(Number.NaN, 0)).toBeNull();
  });

  test("returns null for out-of-range degrees", () => {
    expect(toGeoUri(91, 0)).toBeNull();
    expect(toGeoUri(0, 181)).toBeNull();
  });

  test("builds a default geo uri", () => {
    expect(toGeoUri(23.65, 90.55)).toBe("geo:23.65,90.55");
  });

  test("supports label", () => {
    expect(toGeoUri(23.65, 90.55, { label: "Dhaka" })).toBe(
      "geo:23.65,90.55?q=23.65%2C90.55(Dhaka)",
    );
  });

  test("supports query (overrides label)", () => {
    expect(toGeoUri(23.65, 90.55, { label: "Dhaka", query: "Dhaka, Bangladesh" })).toBe(
      "geo:23.65,90.55?q=Dhaka%2C%20Bangladesh",
    );
  });

  test("supports micro-degrees", () => {
    expect(toGeoUriFromMicroDegrees(23_650_000, 90_550_000)).toBe("geo:23.65,90.55");
  });
});

