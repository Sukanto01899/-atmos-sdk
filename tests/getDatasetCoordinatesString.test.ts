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

describe("SdkClient.getDatasetCoordinatesString", () => {
  test("returns lat,lon string with default formatting", async () => {
    const transport: Transport = {
      request: async () => baseMetadata(),
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    await expect(client.getDatasetCoordinatesString(1)).resolves.toBe("23.6500012,90.5499999");
  });

  test("supports precision", async () => {
    const transport: Transport = {
      request: async () => baseMetadata(),
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    await expect(client.getDatasetCoordinatesString(1, { precision: 3 })).resolves.toBe(
      "23.650,90.550",
    );
  });

  test("returns null for invalid coords", async () => {
    const transport: Transport = {
      request: async () => ({ ...baseMetadata(), latitude: Number.NaN }),
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    await expect(client.getDatasetCoordinatesString(1)).resolves.toBeNull();
  });
});

