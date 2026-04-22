import { describe, expect, test } from "vitest";
import { SdkClient } from "../src/client/SdkClient";
import type { DatasetMetadata, Transport } from "../src/types";

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

describe("SdkClient.getDatasetSummaryText", () => {
  test("formats a readable summary with links by default", async () => {
    const transport: Transport = {
      request: async (method, path) => {
        expect(method).toBe("GET");
        expect(path).toBe("/datasets/123");
        return baseMetadata();
      },
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    const text = await client.getDatasetSummaryText(123);
    expect(text).toContain("Dataset #123: Delta Wind Profile");
    expect(text).toContain("Type: wind");
    expect(text).toContain("Status: verified");
    expect(text).toContain("Visibility: Public");
    expect(text).toContain("Owner: SP1WINDPROFILE");
    expect(text).toContain("IPFS: QmWindProfileExampleHash");
    expect(text).toContain("Owner explorer: https://explorer.hiro.so/address/");
    expect(text).toContain("IPFS gateway: https://");
    expect(text).toContain("OpenStreetMap: https://www.openstreetmap.org/");
    expect(text).toContain("Google Maps: https://www.google.com/maps");
  });

  test("omits links when includeLinks is false", async () => {
    const transport: Transport = {
      request: async () => baseMetadata(),
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    const text = await client.getDatasetSummaryText(123, { includeLinks: false });
    expect(text).toContain("Dataset #123");
    expect(text).not.toContain("Owner explorer:");
    expect(text).not.toContain("OpenStreetMap:");
  });

  test("omits map links when coordinates are invalid", async () => {
    const transport: Transport = {
      request: async () => ({ ...baseMetadata(), latitude: Number.NaN }),
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    const text = await client.getDatasetSummaryText(123);
    expect(text).not.toContain("OpenStreetMap:");
    expect(text).not.toContain("Google Maps:");
  });
});

