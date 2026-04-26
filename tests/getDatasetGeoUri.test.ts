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

describe("SdkClient.getDatasetGeoUri", () => {
  test("builds a geo: uri using dataset name as label by default", async () => {
    const transport: Transport = {
      request: async () => baseMetadata(),
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    await expect(client.getDatasetGeoUri(123)).resolves.toBe(
      "geo:23.65,90.55?q=23.65%2C90.55(Delta%20Wind%20Profile)",
    );
  });

  test("supports custom query", async () => {
    const transport: Transport = {
      request: async () => baseMetadata(),
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    await expect(client.getDatasetGeoUri(123, { query: "Dhaka, Bangladesh" })).resolves.toBe(
      "geo:23.65,90.55?q=Dhaka%2C%20Bangladesh",
    );
  });

  test("returns null for invalid coords", async () => {
    const transport: Transport = {
      request: async () => ({ ...baseMetadata(), longitude: 181 }),
    };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    await expect(client.getDatasetGeoUri(123)).resolves.toBeNull();
  });
});

