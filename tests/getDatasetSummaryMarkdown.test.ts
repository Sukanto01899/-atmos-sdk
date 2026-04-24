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

describe("SdkClient.getDatasetSummaryMarkdown", () => {
  test("formats markdown with links by default", async () => {
    const transport: Transport = {
      request: async () => baseMetadata(),
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    const md = await client.getDatasetSummaryMarkdown(123);
    expect(md).toContain("## Dataset #123: Delta Wind Profile");
    expect(md).toContain("- Type: wind");
    expect(md).toContain("- Status: verified");
    expect(md).toContain("### Links");
    expect(md).toContain("- Owner explorer: https://explorer.hiro.so/address/");
    expect(md).toContain("- IPFS uri: ipfs://QmWindProfileExampleHash");
    expect(md).toContain("- IPFS gateway:");
    expect(md).toContain("- OpenStreetMap: https://www.openstreetmap.org/");
    expect(md).toContain("- Google Maps: https://www.google.com/maps");
  });

  test("omits links when includeLinks is false", async () => {
    const transport: Transport = {
      request: async () => baseMetadata(),
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    const md = await client.getDatasetSummaryMarkdown(123, { includeLinks: false });
    expect(md).toContain("## Dataset #123");
    expect(md).not.toContain("### Links");
    expect(md).not.toContain("OpenStreetMap:");
  });
});

