import { describe, expect, test, vi } from "vitest";
import { SdkClient } from "../src/client/SdkClient";
import type { DatasetMetadata, Transport } from "../src/types";

describe("getDatasetOwnerExplorerUrl()", () => {
  test("returns null when dataset has no owner", async () => {
    const metadata: DatasetMetadata = {
      id: "1",
      name: "No owner",
      description: "missing owner",
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

    await expect(client.getDatasetOwnerExplorerUrl("1")).resolves.toBeNull();
  });

  test("returns explorer url when owner is present", async () => {
    const metadata: DatasetMetadata = {
      id: "2",
      name: "With owner",
      description: "has owner",
      dataType: "wind",
      isPublic: true,
      collectionDate: 1700000000,
      altitudeMin: 0,
      altitudeMax: 10,
      latitude: 23.7,
      longitude: 90.4,
      owner: "SP123",
    };

    const request = vi.fn(async () => metadata);
    const transport: Transport = { request };
    const client = new SdkClient({
      baseUrl: "https://api.atmos.example",
      transport,
      storage: undefined,
    });

    const url = await client.getDatasetOwnerExplorerUrl("2", { chain: "testnet" });
    expect(url).toBe("https://explorer.hiro.so/address/SP123?chain=testnet");
  });
});

