import { describe, expect, test, vi } from "vitest";
import { SdkClient } from "../src/client/SdkClient";
import type { Transport } from "../src/types";

describe("listDatasets()", () => {
  test("uses query params (no GET body)", async () => {
    const request = vi.fn(async () => ({ items: [], nextCursor: undefined }));
    const transport: Transport = { request };

    const client = new SdkClient({
      baseUrl: "https://api.atmos.example",
      transport,
      storage: undefined,
    });

    await client.listDatasets({
      search: "wind",
      owner: "SP123",
      status: "verified",
      isPublic: true,
      verified: true,
      metadataFrozen: false,
      bbox: { minLon: 90, minLat: 23, maxLon: 91, maxLat: 24 },
      altitudeMin: 100,
      altitudeMax: 5000,
      createdAtFrom: 870000,
      createdAtTo: 880000,
      limit: 10,
      cursor: "abc",
    });

    expect(request).toHaveBeenCalledTimes(1);
    const [method, path, options] = request.mock.calls[0];
    expect(method).toBe("GET");
    expect(path).toBe(
      "/datasets?search=wind&owner=SP123&status=verified&isPublic=true&verified=true&metadataFrozen=false&bbox=90%2C23%2C91%2C24&altitudeMin=100&altitudeMax=5000&createdAtFrom=870000&createdAtTo=880000&limit=10&cursor=abc",
    );
    expect(options).toBeUndefined();
  });
});
