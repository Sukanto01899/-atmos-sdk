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
  latitude: 23.6500012,
  longitude: 90.5499999,
  ipfsHash: "QmTest",
});

describe("SdkClient.getDatasetCoordinatesMicroDegrees", () => {
  test("returns rounded micro-degree coordinates", async () => {
    const transport: Transport = {
      request: async (method, path) => {
        expect(method).toBe("GET");
        expect(path).toBe("/datasets/123");
        return baseMetadata();
      },
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    await expect(client.getDatasetCoordinatesMicroDegrees(123)).resolves.toEqual({
      latitude: 23_650_001,
      longitude: 90_550_000,
    });
  });

  test("returns null when metadata coordinates are invalid", async () => {
    const transport: Transport = {
      request: async () => ({ ...baseMetadata(), latitude: Number.NaN }),
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    await expect(client.getDatasetCoordinatesMicroDegrees(1)).resolves.toBeNull();
  });
});

