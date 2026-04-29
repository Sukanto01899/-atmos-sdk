import { describe, expect, test } from "vitest";
import { SdkClient } from "../src/client/SdkClient";
import type { DatasetMetadata, Transport } from "../src/types";
import { formatDatasetCitationText } from "../src/utils/citation";

const baseMetadata = (): DatasetMetadata => ({
  id: 123,
  name: "Delta Wind Profile",
  description: "Hourly lower-atmosphere wind measurements over the delta.",
  dataType: "wind",
  owner: "SP1WINDPROFILE000000000000000000000001",
  status: "verified",
  isPublic: true,
  collectionDate: 1704067200,
  createdAt: 865432,
  altitudeMin: 120,
  altitudeMax: 3200,
  latitude: 23.65,
  longitude: 90.55,
  ipfsHash: "QmWindProfileExampleHash",
});

describe("formatDatasetCitationText", () => {
  test("formats a single-line citation with optional detailUrl", () => {
    const citation = formatDatasetCitationText(baseMetadata(), {
      detailUrl: "https://app.atmos.example/datasets/123",
      accessedAt: "2026-04-30",
    });

    expect(citation).toContain("Delta Wind Profile.");
    expect(citation).toContain("Atmos Registry dataset #123.");
    expect(citation).toContain("Type: wind.");
    expect(citation).toContain("Owner: SP1WINDPROFILE");
    expect(citation).toContain("Collection date: 1704067200.");
    expect(citation).toContain("Recorded: 865432.");
    expect(citation).toContain("Available at: https://app.atmos.example/datasets/123.");
    expect(citation).toContain("Accessed: 2026-04-30.");
  });

  test("works without a detailUrl", () => {
    const citation = formatDatasetCitationText(baseMetadata(), {
      accessedAt: "2026-04-30",
    });

    expect(citation).toContain("Atmos Registry dataset #123.");
    expect(citation).not.toContain("Available at:");
    expect(citation).toContain("Accessed: 2026-04-30.");
  });
});

describe("SdkClient.getDatasetCitationText", () => {
  test("fetches metadata and formats a citation", async () => {
    const transport: Transport = {
      request: async (method, path) => {
        expect(method).toBe("GET");
        expect(path).toBe("/datasets/123");
        return baseMetadata();
      },
    };

    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });
    const citation = await client.getDatasetCitationText(123, {
      detailUrl: "https://app.atmos.example/datasets/123",
      accessedAt: "2026-04-30",
    });

    expect(citation).toContain("Atmos Registry dataset #123.");
    expect(citation).toContain("Available at: https://app.atmos.example/datasets/123.");
    expect(citation).toContain("Accessed: 2026-04-30.");
  });
});

