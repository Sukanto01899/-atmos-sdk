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

describe("SdkClient.getDatasetLinks", () => {
  test("returns a bundle of useful urls", async () => {
    const transport: Transport = {
      request: async (method, path) => {
        expect(method).toBe("GET");
        expect(path).toBe("/datasets/123");
        return baseMetadata();
      },
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    const links = await client.getDatasetLinks(123, { ipfsGatewayBase: "https://cloudflare-ipfs.com" });
    expect(links.ownerExplorerUrl).toContain("https://explorer.hiro.so/address/");
    expect(links.ipfsUri).toBe("ipfs://QmWindProfileExampleHash");
    expect(links.ipfsGatewayUrl).toBe("https://cloudflare-ipfs.com/ipfs/QmWindProfileExampleHash");
    expect(links.openStreetMapUrl).toContain("https://www.openstreetmap.org/");
    expect(links.googleMapsUrl).toContain("https://www.google.com/maps");
  });

  test("nulls out map urls when coordinates are invalid", async () => {
    const transport: Transport = {
      request: async () => ({ ...baseMetadata(), longitude: 181 }),
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    const links = await client.getDatasetLinks(123);
    expect(links.openStreetMapUrl).toBeNull();
    expect(links.googleMapsUrl).toBeNull();
  });
});
