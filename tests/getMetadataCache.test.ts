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

describe("getMetadata() caching", () => {
  test("de-dupes concurrent requests for the same id", async () => {
    let resolveRequest: ((value: DatasetMetadata) => void) | null = null;
    const request = vi.fn(async (_method: string, path: string) => {
      const match = path.match(/^\/datasets\/(.+)$/);
      if (!match) throw new Error("unexpected path");
      return await new Promise<DatasetMetadata>((resolve) => {
        resolveRequest = resolve;
      });
    });
    const transport: Transport = { request };

    const client = new SdkClient({
      baseUrl: "https://api.atmos.example",
      transport,
      storage: undefined,
    });

    const p1 = client.getMetadata("1");
    const p2 = client.getMetadata("1");
    expect(request).toHaveBeenCalledTimes(1);

    resolveRequest?.(buildMetadata("1"));

    await expect(p1).resolves.toEqual(buildMetadata("1"));
    await expect(p2).resolves.toEqual(buildMetadata("1"));
  });

  test("caches results up to maxAgeMs", async () => {
    vi.useFakeTimers();
    try {
      const request = vi.fn(async (_method: string, path: string) => {
        const match = path.match(/^\/datasets\/(.+)$/);
        if (!match) throw new Error("unexpected path");
        return buildMetadata(match[1]);
      });
      const transport: Transport = { request };

      const client = new SdkClient({
        baseUrl: "https://api.atmos.example",
        transport,
        cache: { maxAgeMs: 1000 },
        storage: undefined,
      });

      await expect(client.getMetadata("2")).resolves.toEqual(buildMetadata("2"));
      await expect(client.getMetadata("2")).resolves.toEqual(buildMetadata("2"));
      expect(request).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1001);
      await expect(client.getMetadata("2")).resolves.toEqual(buildMetadata("2"));
      expect(request).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  test("supports manual cache invalidation", async () => {
    const request = vi.fn(async (_method: string, path: string) => {
      const match = path.match(/^\/datasets\/(.+)$/);
      if (!match) throw new Error("unexpected path");
      return buildMetadata(match[1]);
    });
    const transport: Transport = { request };

    const client = new SdkClient({
      baseUrl: "https://api.atmos.example",
      transport,
      cache: { maxAgeMs: 10_000 },
      storage: undefined,
    });

    await client.getMetadata("3");
    await client.getMetadata("3");
    expect(request).toHaveBeenCalledTimes(1);

    client.invalidateMetadataCache("3");

    await client.getMetadata("3");
    expect(request).toHaveBeenCalledTimes(2);
  });
});
