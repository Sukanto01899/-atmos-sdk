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

describe("SdkClient.getDatasetGoogleMapsUrl", () => {
  test("builds a Google Maps URL from dataset metadata", async () => {
    const transport: Transport = {
      request: async (method, path) => {
        expect(method).toBe("GET");
        expect(path).toBe("/datasets/123");
        return baseMetadata();
      },
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    await expect(client.getDatasetGoogleMapsUrl(123, { zoom: 12 })).resolves.toBe(
      "https://www.google.com/maps?q=23.65%2C90.55&z=12",
    );
  });

  test("returns null when metadata coordinates are invalid", async () => {
    const transport: Transport = {
      request: async () => ({ ...baseMetadata(), latitude: 91 }),
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    await expect(client.getDatasetGoogleMapsUrl(1)).resolves.toBeNull();
  });
});
