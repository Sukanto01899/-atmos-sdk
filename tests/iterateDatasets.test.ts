import { describe, expect, test, vi } from "vitest";
import { SdkClient } from "../src/client/SdkClient";
import type { DatasetMetadata, ListDatasetsResult, Transport } from "../src/types";

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

describe("iterateDatasets() / listDatasetsPages()", () => {
  test("listDatasetsPages yields each page until nextCursor is empty", async () => {
    const responses: Record<string, ListDatasetsResult> = {
      "/datasets?limit=2": { items: [buildMetadata("1"), buildMetadata("2")], nextCursor: "2" },
      "/datasets?limit=2&cursor=2": { items: [buildMetadata("3")], nextCursor: undefined },
    };

    const request = vi.fn(async (_method: string, path: string) => {
      const response = responses[path];
      if (!response) throw new Error(`unexpected path: ${path}`);
      return response;
    });
    const transport: Transport = { request };

    const client = new SdkClient({
      baseUrl: "https://api.atmos.example",
      transport,
      storage: undefined,
    });

    const pages: ListDatasetsResult[] = [];
    for await (const page of client.listDatasetsPages({ limit: 2 })) {
      pages.push(page);
    }

    expect(pages).toHaveLength(2);
    expect(pages[0].items.map((item) => item.id)).toEqual(["1", "2"]);
    expect(pages[1].items.map((item) => item.id)).toEqual(["3"]);
  });

  test("iterateDatasets yields items in order and respects maxItems", async () => {
    const request = vi.fn(async (_method: string, path: string) => {
      if (path === "/datasets?limit=2") {
        return { items: [buildMetadata("1"), buildMetadata("2")], nextCursor: "2" };
      }
      if (path === "/datasets?limit=1&cursor=2") {
        return { items: [buildMetadata("3")], nextCursor: "3" };
      }
      throw new Error(`unexpected path: ${path}`);
    });
    const transport: Transport = { request };

    const client = new SdkClient({
      baseUrl: "https://api.atmos.example",
      transport,
      storage: undefined,
    });

    const items: string[] = [];
    for await (const item of client.iterateDatasets({ limit: 2, maxItems: 3 })) {
      items.push(String(item.id));
    }

    expect(items).toEqual(["1", "2", "3"]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  test("listDatasetsPages calls onProgress", async () => {
    const request = vi.fn(async (_method: string, path: string) => {
      if (path === "/datasets?limit=1") {
        return { items: [buildMetadata("1")], nextCursor: "1" };
      }
      if (path === "/datasets?limit=1&cursor=1") {
        return { items: [buildMetadata("2")], nextCursor: undefined };
      }
      throw new Error(`unexpected path: ${path}`);
    });
    const transport: Transport = { request };

    const onProgress = vi.fn();
    const client = new SdkClient({
      baseUrl: "https://api.atmos.example",
      transport,
      storage: undefined,
    });

    const pages: ListDatasetsResult[] = [];
    for await (const page of client.listDatasetsPages({ limit: 1, onProgress })) {
      pages.push(page);
    }

    expect(pages).toHaveLength(2);
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls[0][0]).toMatchObject({ pagesFetched: 1, itemsFetched: 1 });
    expect(onProgress.mock.calls[1][0]).toMatchObject({ pagesFetched: 2, itemsFetched: 2 });
  });
});

