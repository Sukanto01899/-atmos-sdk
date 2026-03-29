import { describe, expect, test, vi } from "vitest";
import { SdkClient } from "../src/client/SdkClient";
import type { DatasetMetadata, Transport } from "../src/types";

describe("getDatasetIpfsGatewayUrl()", () => {
  test("returns null when dataset has no ipfsHash", async () => {
    const metadata: DatasetMetadata = {
      id: "1",
      name: "No IPFS",
      description: "missing ipfsHash",
      dataType: "wind",
      isPublic: true,
      collectionDate: 1700000000,
      altitudeMin: 0,
      altitudeMax: 10,
      latitude: 23.7,
      longitude: 90.4,
    };

    const request = vi.fn(async () => metadata);
    const transport: Transport = { request };
    const client = new SdkClient({
      baseUrl: "https://api.atmos.example",
      transport,
      storage: undefined,
    });

    await expect(client.getDatasetIpfsGatewayUrl("1")).resolves.toBeNull();
  });

  test("returns an ipfs.io url by default", async () => {
    const metadata: DatasetMetadata = {
      id: "2",
      name: "With IPFS",
      description: "has ipfsHash",
      dataType: "wind",
      isPublic: true,
      collectionDate: 1700000000,
      altitudeMin: 0,
      altitudeMax: 10,
      latitude: 23.7,
      longitude: 90.4,
      ipfsHash: "ipfs://QmHash",
    };

    const request = vi.fn(async (_method: string, path: string) => {
      expect(path).toBe("/datasets/2");
      return metadata;
    });
    const transport: Transport = { request };
    const client = new SdkClient({
      baseUrl: "https://api.atmos.example",
      transport,
      storage: undefined,
    });

    const url = await client.getDatasetIpfsGatewayUrl("2");
    expect(url).toBe("https://ipfs.io/ipfs/QmHash");
  });

  test("accepts custom gateway base", async () => {
    const metadata: DatasetMetadata = {
      id: "3",
      name: "With IPFS",
      description: "has ipfsHash",
      dataType: "wind",
      isPublic: true,
      collectionDate: 1700000000,
      altitudeMin: 0,
      altitudeMax: 10,
      latitude: 23.7,
      longitude: 90.4,
      ipfsHash: "QmHash",
    };

    const request = vi.fn(async () => metadata);
    const transport: Transport = { request };
    const client = new SdkClient({
      baseUrl: "https://api.atmos.example",
      transport,
      storage: undefined,
    });

    const url = await client.getDatasetIpfsGatewayUrl(
      "3",
      "https://cloudflare-ipfs.com",
    );
    expect(url).toBe("https://cloudflare-ipfs.com/ipfs/QmHash");
  });
});

