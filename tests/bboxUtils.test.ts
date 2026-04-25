import { describe, expect, test } from "vitest";
import { isValidBboxDegrees, parseBboxDegrees, toBboxQueryParam } from "../src/utils/bbox";

describe("bbox utils", () => {
  test("validates bbox degree ranges and ordering", () => {
    expect(isValidBboxDegrees({ minLon: -180, minLat: -90, maxLon: 180, maxLat: 90 })).toBe(true);
    expect(isValidBboxDegrees({ minLon: 10, minLat: 0, maxLon: 9, maxLat: 1 })).toBe(false);
    expect(isValidBboxDegrees({ minLon: 10, minLat: 2, maxLon: 11, maxLat: 1 })).toBe(false);
    expect(isValidBboxDegrees({ minLon: 181, minLat: 0, maxLon: 182, maxLat: 1 })).toBe(false);
    expect(isValidBboxDegrees({ minLon: 0, minLat: -91, maxLon: 1, maxLat: 0 })).toBe(false);
  });

  test("parses bbox from string", () => {
    expect(parseBboxDegrees(" -74, 40, -73, 41 ")).toEqual({
      minLon: -74,
      minLat: 40,
      maxLon: -73,
      maxLat: 41,
    });
    expect(parseBboxDegrees("")).toBeNull();
    expect(parseBboxDegrees("1,2,3")).toBeNull();
    expect(parseBboxDegrees("a,b,c,d")).toBeNull();
  });

  test("parses bbox from tuple/object", () => {
    expect(parseBboxDegrees([-74, 40, -73, 41])).toEqual({
      minLon: -74,
      minLat: 40,
      maxLon: -73,
      maxLat: 41,
    });
    expect(parseBboxDegrees({ minLon: -74, minLat: 40, maxLon: -73, maxLat: 41 })).toEqual({
      minLon: -74,
      minLat: 40,
      maxLon: -73,
      maxLat: 41,
    });
    expect(parseBboxDegrees([0, 0, 0, 91])).toBeNull();
  });

  test("builds bbox query param", () => {
    expect(toBboxQueryParam(" -74, 40, -73, 41 ")).toBe("-74,40,-73,41");
    expect(toBboxQueryParam([-74, 40, -73, 41])).toBe("-74,40,-73,41");
    expect(toBboxQueryParam({ minLon: -74, minLat: 40, maxLon: -73, maxLat: 41 })).toBe("-74,40,-73,41");
    expect(toBboxQueryParam("1,2,3")).toBeNull();
  });
});

