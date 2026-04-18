import { describe, expect, test } from "vitest";
import { SdkClient } from "../src/client/SdkClient";
import type { DatasetMetadata, Transport } from "../src/types";

const baseMetadata = (): DatasetMetadata => ({
  id: 123,
  name: "Test Dataset",
  description: "Test description",
  dataType: "wind",
  isPublic: true,
  collectionDate: 1704067200,
  altitudeMin: 10,
  altitudeMax: 20,
  latitude: 23.65,
  longitude: 90.55,
  ipfsHash: "QmTest",
  tags: ["wind"],
  owner: "SP_TEST",
  status: "active",
});

describe("SdkClient.getDatasetGeoJsonFeature", () => {
  test("builds a GeoJSON feature from dataset metadata", async () => {
    const transport: Transport = {
      request: async (method, path) => {
        expect(method).toBe("GET");
        expect(path).toBe("/datasets/123");
        return baseMetadata();
      },
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    await expect(client.getDatasetGeoJsonFeature(123)).resolves.toEqual({
      type: "Feature",
      id: 123,
      geometry: { type: "Point", coordinates: [90.55, 23.65] },
      properties: expect.objectContaining({
        name: "Test Dataset",
        dataType: "wind",
        status: "active",
        owner: "SP_TEST",
        isPublic: true,
        ipfsHash: "QmTest",
      }),
    });
  });

  test("returns null when metadata coordinates are invalid", async () => {
    const transport: Transport = {
      request: async () => ({ ...baseMetadata(), longitude: Number.NaN }),
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    await expect(client.getDatasetGeoJsonFeature(123)).resolves.toBeNull();
  });
});

