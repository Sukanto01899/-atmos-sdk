import { describe, expect, test } from "vitest";
import { getDatasetQualityScore } from "../src/utils/quality";
import type { DatasetMetadata } from "../src/types";

const baseMetadata = (): DatasetMetadata => ({
  id: 123,
  name: "Delta Wind Profile",
  description: "Hourly lower-atmosphere wind measurements over the delta.",
  dataType: "wind",
  owner: "SP1WINDPROFILE000000000000000000000001",
  status: "active",
  isPublic: false,
  collectionDate: 1704067200,
  createdAt: 865432,
  altitudeMin: 120,
  altitudeMax: 3200,
  latitude: 23.65,
  longitude: 90.55,
});

describe("getDatasetQualityScore", () => {
  test("scores verified + ipfs + frozen + public", () => {
    const score = getDatasetQualityScore({
      ...baseMetadata(),
      status: "verified",
      ipfsHash: "QmHash",
      metadataFrozen: true,
      isPublic: true,
    });

    expect(score).toBe(45 + 30 + 15 + 10);
  });

  test("treats metadata.verified=true as verified", () => {
    const score = getDatasetQualityScore({
      ...baseMetadata(),
      verified: true,
      isPublic: true,
    });

    expect(score).toBe(45 + 10);
  });

  test("ignores blank ipfsHash", () => {
    const score = getDatasetQualityScore({
      ...baseMetadata(),
      ipfsHash: "   ",
      isPublic: true,
    });

    expect(score).toBe(10);
  });
});

