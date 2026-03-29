import { describe, expect, test, vi } from "vitest";
import { SdkClient } from "../src/client/SdkClient";
import type { DatasetMetadata, Transport } from "../src/types";

const buildMetadata = (id: string): DatasetMetadata => ({
  id,
  name: `Dataset ${id}`,
  description: `Description ${id}`,
  dataType: "wind",
  isPublic: true,
  collectionDate: 1700000000,
  altitudeMin: 0,
  altitudeMax: 10,
  latitude: 23.7,
  longitude: 90.4,
});

describe("getMetadataBatch()", () => {
  test("returns empty array when no ids", async () => {
    const transport: Transport = { request: vi.fn() };
    const client = new SdkClient({
      baseUrl: "https://api.atmos.example",
      transport,
      storage: undefined,
    });

    await expect(client.getMetadataBatch([])).resolves.toEqual([]);
    expect(transport.request).not.toHaveBeenCalled();
  });

  test("fetches each dataset and returns results in input order", async () => {
    const request = vi.fn(async (_method: string, path: string) => {
      const match = path.match(/^\/datasets\/(.+)$/);
      if (!match) throw new Error("unexpected path");
      return buildMetadata(match[1]);
    });
    const transport: Transport = { request };

    const client = new SdkClient({
      baseUrl: "https://api.atmos.example",
      transport,
      storage: undefined,
    });

    const results = await client.getMetadataBatch(["2", "1"], { concurrency: 2 });

    expect(request).toHaveBeenCalledTimes(2);
    expect(results).toEqual([
      { item: "2", status: "fulfilled", result: buildMetadata("2") },
      { item: "1", status: "fulfilled", result: buildMetadata("1") },
    ]);
  });

  test("marks a failing item as rejected (without stopping by default)", async () => {
    const request = vi.fn(async (_method: string, path: string) => {
      if (path === "/datasets/bad") {
        throw new Error("boom");
      }
      const match = path.match(/^\/datasets\/(.+)$/);
      if (!match) throw new Error("unexpected path");
      return buildMetadata(match[1]);
    });
    const transport: Transport = { request };

    const client = new SdkClient({
      baseUrl: "https://api.atmos.example",
      transport,
      storage: undefined,
    });

    const results = await client.getMetadataBatch(["good", "bad", "good2"], {
      concurrency: 1,
    });

    expect(results[0].status).toBe("fulfilled");
    expect(results[1].status).toBe("rejected");
    expect(results[2].status).toBe("fulfilled");
  });
});

