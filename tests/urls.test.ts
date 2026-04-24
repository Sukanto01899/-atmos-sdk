import { describe, expect, test } from "vitest";
import { SdkClient } from "../src/client/SdkClient";
import type { Transport } from "../src/types";

describe("URL helpers", () => {
  test("builds datasets + export URLs from baseUrl", () => {
    const transport: Transport = { request: async () => ({}) };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    expect(client.getDatasetUrl(123)).toBe("https://api.atmos.example/datasets/123");
    expect(client.getDatasetsUrl({ search: "wind" })).toBe(
      "https://api.atmos.example/datasets?search=wind",
    );
    expect(client.getDatasetsCsvUrl({ tags: ["wind", "hourly"] })).toBe(
      "https://api.atmos.example/datasets.csv?tags=wind%2Chourly",
    );
    expect(client.getDatasetsGeoJsonUrl({ bbox: [90, 23, 91, 24] })).toBe(
      "https://api.atmos.example/datasets.geojson?bbox=90%2C23%2C91%2C24",
    );

    expect(client.getDatasetsExportUrls({ search: "wind" })).toEqual({
      jsonUrl: "https://api.atmos.example/datasets?search=wind",
      csvUrl: "https://api.atmos.example/datasets.csv?search=wind",
      geoJsonUrl: "https://api.atmos.example/datasets.geojson?search=wind",
    });
  });

  test("builds health/tags/summary URLs", () => {
    const transport: Transport = { request: async () => ({}) };
    const client = new SdkClient({ baseUrl: "https://api.atmos.example/", transport });

    expect(client.getHealthUrl()).toBe("https://api.atmos.example/health");
    expect(client.getTagsUrl({ search: "wind", limit: 25, cursor: "abc" })).toBe(
      "https://api.atmos.example/tags?search=wind",
    );
    expect(client.getSummaryUrl({ visibility: "public", tags: ["wind"] })).toBe(
      "https://api.atmos.example/summary?visibility=public&tags=wind",
    );
  });
});
