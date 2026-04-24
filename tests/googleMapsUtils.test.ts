import { describe, expect, test } from "vitest";
import {
  toGoogleMapsUrl,
  toGoogleMapsUrlFromMicroDegrees,
} from "../src/utils/googleMaps";

describe("google maps utils", () => {
  test("returns null for invalid numbers", () => {
    expect(toGoogleMapsUrl(Number.NaN, 0)).toBeNull();
    expect(toGoogleMapsUrl(0, Number.POSITIVE_INFINITY)).toBeNull();
    expect(toGoogleMapsUrlFromMicroDegrees(Number.NaN, 0)).toBeNull();
  });

  test("returns null for out-of-range degrees", () => {
    expect(toGoogleMapsUrl(91, 0)).toBeNull();
    expect(toGoogleMapsUrl(0, 181)).toBeNull();
  });

  test("builds a default url (zoom 11) for degrees", () => {
    expect(toGoogleMapsUrl(23.65, 90.55)).toBe(
      "https://www.google.com/maps?q=23.65%2C90.55&z=11",
    );
  });

  test("supports custom zoom and baseUrl and clamps zoom", () => {
    expect(
      toGoogleMapsUrl(1, 2, { zoom: 30, baseUrl: "https://www.google.com/maps/" }),
    ).toBe("https://www.google.com/maps?q=1%2C2&z=21");
    expect(
      toGoogleMapsUrl(1, 2, { zoom: -5, baseUrl: "https://www.google.com/maps" }),
    ).toBe("https://www.google.com/maps?q=1%2C2&z=0");
  });

  test("converts micro-degrees to degrees", () => {
    expect(toGoogleMapsUrlFromMicroDegrees(23_650_000, 90_550_000)).toBe(
      "https://www.google.com/maps?q=23.65%2C90.55&z=11",
    );
  });
});
