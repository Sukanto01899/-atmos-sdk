import { describe, expect, test } from "vitest";
import { datasetsToCsv } from "../src/utils/datasetsCsv";
import type { DatasetMetadata } from "../src/types";

const baseMetadata = (): DatasetMetadata => ({
  id: 123,
  name: "Delta Wind Profile",
  description: "Hourly lower-atmosphere wind measurements over the delta.",
  dataType: "wind",
  owner: "SP1WINDPROFILE000000000000000000000001",
  status: "verified",
  verified: true,
  metadataFrozen: true,
  isPublic: true,
  collectionDate: 1704067200,
  createdAt: 865432,
  altitudeMin: 120,
  altitudeMax: 3200,
  latitude: 23.65,
  longitude: 90.55,
  ipfsHash: 'QmWind"Profile,Example\nHash',
});

describe("datasetsToCsv", () => {
  test("writes a header row and escapes cells", () => {
    const csv = datasetsToCsv([baseMetadata()]);
    const headerEnd = csv.indexOf("\n");
    expect(headerEnd).toBeGreaterThan(0);
    const header = csv.slice(0, headerEnd);
    expect(header).toContain("id,name,dataType");
    expect(csv).toContain('"QmWind""Profile,Example\nHash"');
  });

  test("can omit the header row", () => {
    const csv = datasetsToCsv([baseMetadata()], { includeHeader: false });
    expect(csv).not.toContain("id,name,dataType");
    expect(csv).toContain('"QmWind""Profile,Example\nHash"');
  });
});
