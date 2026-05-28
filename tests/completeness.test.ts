import { describe, expect, test } from "vitest";
import { getDatasetCompletenessScore } from "../src/utils/completeness";
import type { DatasetMetadata } from "../src/types";

/** A fully-filled dataset — all 8 fields present. */
const full = (): DatasetMetadata => ({
  id: "42",
  name: "Delta Wind Profile",
  description: "Hourly lower-atmosphere wind measurements over the delta.",
  dataType: "sensor",
  owner: "SP1WINDPROFILE000000000000000000000001",
  status: "verified",
  isPublic: true,
  collectionDate: 1_704_067_200,
  createdAt: 865_432,
  altitudeMin: 120,
  altitudeMax: 3_200,
  latitude: 23.65,
  longitude: 90.55,
  ipfsHash: "QmHash123",
  tags: ["wind", "hourly"],
});

/** Minimal valid skeleton — all required fields present but optional ones absent. */
const skeleton = (): DatasetMetadata => ({
  name: "",
  description: "",
  dataType: "",
  isPublic: false,
  collectionDate: 0,
  altitudeMin: 0,
  altitudeMax: 0,
  latitude: 0,
  longitude: 0,
});

describe("getDatasetCompletenessScore", () => {
  // ── Shape ─────────────────────────────────────────────────────────────────

  test("always returns total of 8", () => {
    expect(getDatasetCompletenessScore(full()).total).toBe(8);
    expect(getDatasetCompletenessScore(skeleton()).total).toBe(8);
  });

  test("fields array has exactly 8 entries", () => {
    expect(getDatasetCompletenessScore(full()).fields).toHaveLength(8);
  });

  test("every field entry has a string name and a boolean present", () => {
    const { fields } = getDatasetCompletenessScore(full());
    for (const f of fields) {
      expect(typeof f.field).toBe("string");
      expect(typeof f.present).toBe("boolean");
    }
  });

  test("score equals the number of fields where present is true", () => {
    const result = getDatasetCompletenessScore(full());
    const counted = result.fields.filter((f) => f.present).length;
    expect(result.score).toBe(counted);
  });

  // ── Full / empty extremes ──────────────────────────────────────────────────

  test("fully-filled dataset scores 8/8", () => {
    const { score } = getDatasetCompletenessScore(full());
    expect(score).toBe(8);
  });

  test("skeleton (all empty / zero) scores 1/8 — altitudeRange (0,0) is valid sea-level", () => {
    // altitudeMin=0, altitudeMax=0 satisfies isFinite && max >= min, so it
    // counts as a present (sea-level) altitude range even in an otherwise
    // empty skeleton. All other fields are blank/zero.
    const { score, fields } = getDatasetCompletenessScore(skeleton());
    expect(score).toBe(1);
    expect(fields.find((f) => f.field === "altitudeRange")?.present).toBe(true);
  });

  // ── Individual field rules ─────────────────────────────────────────────────

  test("blank name is missing", () => {
    const { fields } = getDatasetCompletenessScore({ ...full(), name: "   " });
    expect(fields.find((f) => f.field === "name")?.present).toBe(false);
  });

  test("blank description is missing", () => {
    const { score } = getDatasetCompletenessScore({ ...full(), description: "" });
    expect(score).toBe(7);
  });

  test("blank dataType is missing", () => {
    const { fields } = getDatasetCompletenessScore({ ...full(), dataType: "\t" });
    expect(fields.find((f) => f.field === "dataType")?.present).toBe(false);
  });

  test("collectionDate of 0 is missing", () => {
    const { score } = getDatasetCompletenessScore({ ...full(), collectionDate: 0 });
    expect(score).toBe(7);
  });

  test("negative collectionDate is missing", () => {
    const { fields } = getDatasetCompletenessScore({ ...full(), collectionDate: -1 });
    expect(fields.find((f) => f.field === "collectionDate")?.present).toBe(false);
  });

  test("lat=0 lon=0 counts as missing coordinates", () => {
    const { score } = getDatasetCompletenessScore({ ...full(), latitude: 0, longitude: 0 });
    expect(score).toBe(7);
  });

  test("lat=0 with non-zero lon counts as present coordinates", () => {
    // Dataset on the equator but with a real longitude
    const { fields } = getDatasetCompletenessScore({ ...full(), latitude: 0, longitude: 45.5 });
    expect(fields.find((f) => f.field === "coordinates")?.present).toBe(true);
  });

  test("non-zero lat with lon=0 counts as present coordinates", () => {
    const { fields } = getDatasetCompletenessScore({ ...full(), latitude: 10.5, longitude: 0 });
    expect(fields.find((f) => f.field === "coordinates")?.present).toBe(true);
  });

  test("inverted altitude range (min > max) is missing", () => {
    const { score } = getDatasetCompletenessScore({ ...full(), altitudeMin: 5_000, altitudeMax: 100 });
    expect(score).toBe(7);
  });

  test("altitudeMin === altitudeMax (single level) is present", () => {
    const { fields } = getDatasetCompletenessScore({ ...full(), altitudeMin: 500, altitudeMax: 500 });
    expect(fields.find((f) => f.field === "altitudeRange")?.present).toBe(true);
  });

  test("blank ipfsHash is missing", () => {
    const { score } = getDatasetCompletenessScore({ ...full(), ipfsHash: "   " });
    expect(score).toBe(7);
  });

  test("absent ipfsHash (undefined) is missing", () => {
    const { fields } = getDatasetCompletenessScore({ ...full(), ipfsHash: undefined });
    expect(fields.find((f) => f.field === "ipfsHash")?.present).toBe(false);
  });

  test("empty tags array is missing", () => {
    const { score } = getDatasetCompletenessScore({ ...full(), tags: [] });
    expect(score).toBe(7);
  });

  test("absent tags (undefined) is missing", () => {
    const { fields } = getDatasetCompletenessScore({ ...full(), tags: undefined });
    expect(fields.find((f) => f.field === "tags")?.present).toBe(false);
  });

  test("single tag is sufficient for tags to be present", () => {
    const { fields } = getDatasetCompletenessScore({ ...full(), tags: ["climate"] });
    expect(fields.find((f) => f.field === "tags")?.present).toBe(true);
  });

  // ── Partial scores ─────────────────────────────────────────────────────────

  test("missing description and tags scores 6/8", () => {
    const { score, fields } = getDatasetCompletenessScore({
      ...full(),
      description: "",
      tags: [],
    });
    expect(score).toBe(6);
    expect(fields.find((f) => f.field === "description")?.present).toBe(false);
    expect(fields.find((f) => f.field === "tags")?.present).toBe(false);
  });

  test("only name filled scores 2/8 (name + sea-level altitudeRange)", () => {
    // skeleton carries altitudeMin=0, altitudeMax=0 which counts as present.
    const { score } = getDatasetCompletenessScore({ ...skeleton(), name: "My dataset" });
    expect(score).toBe(2);
  });
});
