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
  ipfsHash: "QmTest",
});

describe("SdkClient.getDatasetOpenStreetMapUrl", () => {
  test("builds an OpenStreetMap URL from dataset metadata", async () => {
    const transport: Transport = {
      request: async (method, path) => {
        expect(method).toBe("GET");
        expect(path).toBe("/datasets/123");
        return baseMetadata();
      },
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    await expect(client.getDatasetOpenStreetMapUrl(123, { zoom: 12 })).resolves.toBe(
      "https://www.openstreetmap.org/?mlat=23.65&mlon=90.55#map=12/23.65/90.55",
    );
  });

  test("returns null when metadata coordinates are invalid", async () => {
    const transport: Transport = {
      request: async () => ({ ...baseMetadata(), latitude: Number.NaN }),
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    await expect(client.getDatasetOpenStreetMapUrl(1)).resolves.toBeNull();
  });
});

