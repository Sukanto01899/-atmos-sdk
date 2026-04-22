import { describe, expect, test } from "vitest";
import { SdkClient } from "../src/client/SdkClient";
import type { DatasetMetadata, Transport } from "../src/types";

const baseMetadata = (): DatasetMetadata => ({
  name: "Test Dataset",
  description: "Test description",
  dataType: "wind",
  isPublic: true,
  collectionDate: 1704067200,
  altitudeMin: 0,
  altitudeMax: 0,
  latitude: 23.65,
  longitude: 90.55,
  ipfsHash: "ipfs://QmTestHash",
});

describe("SdkClient.getDatasetIpfsUri", () => {
  test("returns a normalized ipfs:// uri from dataset metadata", async () => {
    const transport: Transport = {
      request: async (method, path) => {
        expect(method).toBe("GET");
        expect(path).toBe("/datasets/123");
        return baseMetadata();
      },
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    await expect(client.getDatasetIpfsUri(123)).resolves.toBe("ipfs://QmTestHash");
  });

  test("returns null when ipfsHash is missing/invalid", async () => {
    const transport: Transport = {
      request: async () => ({ ...baseMetadata(), ipfsHash: "" }),
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    await expect(client.getDatasetIpfsUri(1)).resolves.toBeNull();
  });
});

