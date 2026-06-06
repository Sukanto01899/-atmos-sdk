import { describe, expect, test } from "vitest";
import {
  getDatasetQualityGrade,
  getDatasetQualityScore,
  qualityScoreToGrade,
} from "../src/utils/quality";
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

describe("qualityScoreToGrade", () => {
  test("maps scores to letter grades at each threshold", () => {
    expect(qualityScoreToGrade(100)).toBe("A");
    expect(qualityScoreToGrade(90)).toBe("A");
    expect(qualityScoreToGrade(89)).toBe("B");
    expect(qualityScoreToGrade(75)).toBe("B");
    expect(qualityScoreToGrade(74)).toBe("C");
    expect(qualityScoreToGrade(50)).toBe("C");
    expect(qualityScoreToGrade(49)).toBe("D");
    expect(qualityScoreToGrade(25)).toBe("D");
    expect(qualityScoreToGrade(24)).toBe("F");
    expect(qualityScoreToGrade(0)).toBe("F");
  });

  test("clamps out-of-range scores", () => {
    expect(qualityScoreToGrade(-10)).toBe("F");
    expect(qualityScoreToGrade(150)).toBe("A");
  });
});

describe("getDatasetQualityGrade", () => {
  test("grades a fully-qualified dataset as A / Excellent", () => {
    const rating = getDatasetQualityGrade({
      ...baseMetadata(),
      status: "verified",
      ipfsHash: "QmHash",
      metadataFrozen: true,
      isPublic: true,
    });

    expect(rating).toEqual({ score: 100, grade: "A", label: "Excellent" });
  });

  test("grades a bare dataset as F / Minimal", () => {
    const rating = getDatasetQualityGrade(baseMetadata());

    expect(rating).toEqual({ score: 0, grade: "F", label: "Minimal" });
  });

  test("grades verified + ipfs as B / Good", () => {
    const rating = getDatasetQualityGrade({
      ...baseMetadata(),
      verified: true,
      ipfsHash: "QmHash",
    });

    expect(rating).toEqual({ score: 75, grade: "B", label: "Good" });
  });
});

