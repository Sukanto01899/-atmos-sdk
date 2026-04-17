import { describe, expect, test } from "vitest";
import {
  toOpenStreetMapUrl,
  toOpenStreetMapUrlFromMicroDegrees,
} from "../src/utils/openStreetMap";

describe("open street map utils", () => {
  test("returns null for invalid numbers", () => {
    expect(toOpenStreetMapUrl(Number.NaN, 0)).toBeNull();
    expect(toOpenStreetMapUrl(0, Number.POSITIVE_INFINITY)).toBeNull();
    expect(toOpenStreetMapUrlFromMicroDegrees(Number.NaN, 0)).toBeNull();
  });

  test("builds a default url (zoom 11) for degrees", () => {
    expect(toOpenStreetMapUrl(23.65, 90.55)).toBe(
      "https://www.openstreetmap.org/?mlat=23.65&mlon=90.55#map=11/23.65/90.55",
    );
  });

  test("supports custom zoom and baseUrl and clamps zoom", () => {
    expect(toOpenStreetMapUrl(1, 2, { zoom: 25, baseUrl: "https://www.openstreetmap.org/" })).toBe(
      "https://www.openstreetmap.org/?mlat=1&mlon=2#map=19/1/2",
    );
    expect(toOpenStreetMapUrl(1, 2, { zoom: -5, baseUrl: "https://www.openstreetmap.org" })).toBe(
      "https://www.openstreetmap.org/?mlat=1&mlon=2#map=0/1/2",
    );
  });

  test("converts micro-degrees to degrees", () => {
    expect(toOpenStreetMapUrlFromMicroDegrees(23_650_000, 90_550_000)).toBe(
      "https://www.openstreetmap.org/?mlat=23.65&mlon=90.55#map=11/23.65/90.55",
    );
  });
});

