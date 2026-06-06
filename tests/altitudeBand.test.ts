import { describe, expect, test } from "vitest";
import {
  ATMOSPHERIC_LAYERS,
  classifyAltitude,
  getDatasetAltitudeBand,
  type AltitudeBand,
} from "../src/utils/altitudeBand";
import type { DatasetMetadata } from "../src/types";

const make = (altitudeMin: number, altitudeMax: number): DatasetMetadata => ({
  name: "x",
  description: "",
  dataType: "wind",
  isPublic: true,
  collectionDate: 0,
  altitudeMin,
  altitudeMax,
  latitude: 0,
  longitude: 0,
});

describe("classifyAltitude", () => {
  test("classifies each classical layer", () => {
    expect(classifyAltitude(8_000)).toBe("Troposphere");
    expect(classifyAltitude(30_000)).toBe("Stratosphere");
    expect(classifyAltitude(60_000)).toBe("Mesosphere");
    expect(classifyAltitude(100_000)).toBe("Thermosphere");
    expect(classifyAltitude(1_000_000)).toBe("Exosphere");
  });

  test("boundaries are inclusive-lower, exclusive-upper", () => {
    expect(classifyAltitude(12_000)).toBe("Stratosphere");
    expect(classifyAltitude(11_999)).toBe("Troposphere");
  });

  test("classifies below-sea-level values into the lowest band", () => {
    expect(classifyAltitude(-50)).toBe("Troposphere");
  });

  test("returns null for non-finite input", () => {
    expect(classifyAltitude(NaN)).toBeNull();
    expect(classifyAltitude(Infinity)).toBeNull();
  });

  test("supports a custom band list", () => {
    const bands: AltitudeBand[] = [
      { name: "Surface", min: 0, max: 100 },
      { name: "Boundary layer", min: 100, max: 2_000 },
    ];
    expect(classifyAltitude(50, bands)).toBe("Surface");
    expect(classifyAltitude(500, bands)).toBe("Boundary layer");
    expect(classifyAltitude(5_000, bands)).toBeNull();
  });
});

describe("getDatasetAltitudeBand", () => {
  test("classifies by the midpoint of the altitude window", () => {
    expect(getDatasetAltitudeBand(make(0, 10_000))).toBe("Troposphere");
    // midpoint 31000 → Stratosphere even though min is in the troposphere
    expect(getDatasetAltitudeBand(make(10_000, 52_000))).toBe("Stratosphere");
  });

  test("returns null when altitudes are not finite", () => {
    expect(getDatasetAltitudeBand(make(NaN, 10_000))).toBeNull();
  });
});

test("ATMOSPHERIC_LAYERS spans -Infinity to Infinity without gaps", () => {
  expect(ATMOSPHERIC_LAYERS[0].min).toBe(-Infinity);
  expect(ATMOSPHERIC_LAYERS[ATMOSPHERIC_LAYERS.length - 1].max).toBe(Infinity);
  for (let i = 1; i < ATMOSPHERIC_LAYERS.length; i += 1) {
    expect(ATMOSPHERIC_LAYERS[i].min).toBe(ATMOSPHERIC_LAYERS[i - 1].max);
  }
});
