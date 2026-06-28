import { describe, expect, test } from "vitest";
import { groupDatasetsByAltitudeBand } from "../src/utils/groupByAltitudeBand";
import type { AltitudeBand } from "../src/utils/altitudeBand";
import type { DatasetMetadata } from "../src/types";

const make = (
  id: string,
  altitudeMin: number,
  altitudeMax: number,
): DatasetMetadata => ({
  id,
  name: id,
  description: "",
  dataType: "wind",
  isPublic: true,
  collectionDate: 0,
  altitudeMin,
  altitudeMax,
  latitude: 0,
  longitude: 0,
});

describe("groupDatasetsByAltitudeBand", () => {
  test("groups datasets by the atmospheric layer of their altitude midpoint", () => {
    const surface = make("1", 0, 1000); // midpoint 500 -> Troposphere
    const stratospheric = make("2", 15_000, 25_000); // midpoint 20000 -> Stratosphere
    const alsoSurface = make("3", 2000, 4000); // midpoint 3000 -> Troposphere

    const byBand = groupDatasetsByAltitudeBand([surface, stratospheric, alsoSurface]);

    expect([...byBand.keys()]).toEqual(["Troposphere", "Stratosphere"]);
    expect(byBand.get("Troposphere")!.map((d) => d.id)).toEqual(["1", "3"]);
    expect(byBand.get("Stratosphere")!.map((d) => d.id)).toEqual(["2"]);
  });

  test("orders bands lowest-altitude-first regardless of input order", () => {
    const thermospheric = make("hi", 100_000, 200_000);
    const surface = make("lo", 0, 1000);

    const byBand = groupDatasetsByAltitudeBand([thermospheric, surface]);

    expect([...byBand.keys()]).toEqual(["Troposphere", "Thermosphere"]);
  });

  test("omits datasets with missing or non-finite altitudes", () => {
    const valid = make("1", 0, 1000);
    const invalid = { ...make("2", 0, 1000), altitudeMin: Number.NaN };

    const byBand = groupDatasetsByAltitudeBand([valid, invalid]);

    expect(byBand.get("Troposphere")!.map((d) => d.id)).toEqual(["1"]);
  });

  test("supports a custom band list", () => {
    const customBands: AltitudeBand[] = [
      { name: "Low", min: -Infinity, max: 1000 },
      { name: "High", min: 1000, max: Infinity },
    ];

    const byBand = groupDatasetsByAltitudeBand(
      [make("1", 0, 500), make("2", 2000, 3000)],
      customBands,
    );

    expect([...byBand.keys()]).toEqual(["Low", "High"]);
  });

  test("returns an empty map for no datasets", () => {
    expect(groupDatasetsByAltitudeBand([]).size).toBe(0);
  });
});
