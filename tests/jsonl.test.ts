import { describe, expect, test } from "vitest";
import { datasetsToJsonl } from "../src/utils/jsonl";
import type { DatasetMetadata } from "../src/types";

const make = (overrides: Partial<DatasetMetadata>): DatasetMetadata => ({
  name: "ds",
  description: "",
  dataType: "csv",
  isPublic: true,
  collectionDate: 0,
  altitudeMin: 0,
  altitudeMax: 0,
  latitude: 0,
  longitude: 0,
  ...overrides,
});

describe("datasetsToJsonl", () => {
  test("returns an empty string for no datasets", () => {
    expect(datasetsToJsonl([])).toBe("");
  });

  test("emits one JSON object per line with no trailing newline", () => {
    const out = datasetsToJsonl([make({ id: "1" }), make({ id: "2" })]);
    const lines = out.split("\n");
    expect(lines).toHaveLength(2);
    expect(out.endsWith("\n")).toBe(false);
    expect(JSON.parse(lines[0]).id).toBe("1");
    expect(JSON.parse(lines[1]).id).toBe("2");
  });

  test("each line round-trips through JSON.parse", () => {
    const datasets = [make({ id: "a", name: "Soil" }), make({ id: "b", name: "Wind" })];
    const parsed = datasetsToJsonl(datasets)
      .split("\n")
      .map((line) => JSON.parse(line) as DatasetMetadata);
    expect(parsed).toEqual(datasets);
  });

  test("picks and orders a field subset", () => {
    const out = datasetsToJsonl([make({ id: "1", name: "Soil", dataType: "csv" })], {
      fields: ["id", "name", "dataType"],
    });
    expect(out).toBe('{"id":"1","name":"Soil","dataType":"csv"}');
  });

  test("omits undefined fields from the subset", () => {
    const out = datasetsToJsonl([make({ name: "Soil" })], {
      fields: ["id", "name"],
    });
    // id is undefined -> dropped
    expect(out).toBe('{"name":"Soil"}');
  });
});
