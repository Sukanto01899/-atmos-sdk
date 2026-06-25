import { describe, expect, test } from "vitest";
import { getOwnerLeaderboard } from "../src/utils/ownerLeaderboard";
import type { DatasetMetadata } from "../src/types";

const make = (
  id: string,
  owner: string | undefined,
  overrides: Partial<DatasetMetadata> = {},
): DatasetMetadata => ({
  id,
  name: id,
  description: "",
  dataType: "wind",
  owner,
  isPublic: true,
  collectionDate: 0,
  altitudeMin: 0,
  altitudeMax: 0,
  latitude: 0,
  longitude: 0,
  ...overrides,
});

describe("getOwnerLeaderboard", () => {
  test("ranks owners by average quality score, descending, by default", () => {
    const leaderboard = getOwnerLeaderboard([
      make("1", "SP1LOW", { isPublic: true }), // 10 (isPublic only)
      make("2", "SP2HIGH", { verified: true, ipfsHash: "QmHash" }), // 85 (verified + ipfs + isPublic)
    ]);

    expect(leaderboard.map((e) => e.owner)).toEqual(["SP2HIGH", "SP1LOW"]);
    expect(leaderboard[0]).toEqual({
      owner: "SP2HIGH",
      count: 1,
      averageQualityScore: 85,
      medianQualityScore: 85,
    });
  });

  test("can rank by dataset count instead", () => {
    const leaderboard = getOwnerLeaderboard(
      [
        make("1", "SP1PROLIFIC", { verified: true }), // 55 (verified + isPublic)
        make("2", "SP1PROLIFIC", {}), // 10 (isPublic only)
        make("3", "SP2SINGLE", { verified: true, ipfsHash: "QmHash" }), // 85
      ],
      { sortBy: "count" },
    );

    expect(leaderboard.map((e) => e.owner)).toEqual(["SP1PROLIFIC", "SP2SINGLE"]);
    expect(leaderboard[0].count).toBe(2);
    expect(leaderboard[0].averageQualityScore).toBe(32.5);
  });

  test("groups missing/blank owners under unknown", () => {
    const leaderboard = getOwnerLeaderboard([make("1", undefined)]);
    expect(leaderboard.map((e) => e.owner)).toEqual(["unknown"]);
  });

  test("respects the limit option", () => {
    const leaderboard = getOwnerLeaderboard(
      [
        make("1", "SP1", { verified: true, ipfsHash: "QmHash" }), // 75
        make("2", "SP2", { verified: true }), // 45
        make("3", "SP3", {}), // 0
      ],
      { limit: 2 },
    );

    expect(leaderboard.map((e) => e.owner)).toEqual(["SP1", "SP2"]);
  });

  test("returns an empty array for no datasets", () => {
    expect(getOwnerLeaderboard([])).toEqual([]);
  });
});
