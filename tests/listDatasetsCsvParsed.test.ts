import { describe, expect, test, vi } from "vitest";
import { SdkClient } from "../src/client/SdkClient";
import type { Transport } from "../src/types";

describe("listDatasetsCsvParsed()", () => {
  test("fetches datasets.csv and parses rows (handles UTF-8 BOM)", async () => {
    const csv = "\uFEFFid,name\n1,Alpha\n2,Beta\n";
    const request = vi.fn(async () => csv);
    const transport: Transport = { request };

    const client = new SdkClient({
      baseUrl: "https://api.atmos.example",
      transport,
      storage: undefined,
    });

    const result = await client.listDatasetsCsvParsed({ owner: "SP123" }, 10);

    expect(request).toHaveBeenCalledTimes(1);
    const [method, path, options] = request.mock.calls[0];
    expect(method).toBe("GET");
    expect(path).toBe("/datasets.csv?owner=SP123");
    expect(options).toBeUndefined();

    expect(result.header).toEqual(["id", "name"]);
    expect(result.rows).toEqual([
      { id: "1", name: "Alpha" },
      { id: "2", name: "Beta" },
    ]);
  });

  test("respects maxRows", async () => {
    const csv = "id,name\n1,Alpha\n2,Beta\n3,Gamma\n";
    const request = vi.fn(async () => csv);
    const transport: Transport = { request };

    const client = new SdkClient({
      baseUrl: "https://api.atmos.example",
      transport,
      storage: undefined,
    });

    const result = await client.listDatasetsCsvParsed(undefined, 2);
    expect(result.rows).toEqual([
      { id: "1", name: "Alpha" },
      { id: "2", name: "Beta" },
    ]);
  });
});

