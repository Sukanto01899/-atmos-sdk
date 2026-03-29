import { describe, expect, test, vi } from "vitest";
import { SdkClient } from "../src/client/SdkClient";
import type { SummaryResult, Transport } from "../src/types";

describe("getSummary()", () => {
  test("uses query params and returns summary json", async () => {
    const summary: SummaryResult = {
      total: 3,
      verified: 1,
      public: 2,
      statuses: { verified: 1, pending: 1, active: 1 },
    };
    const request = vi.fn(async () => summary);
    const transport: Transport = { request };

    const client = new SdkClient({
      baseUrl: "https://api.atmos.example",
      transport,
      storage: undefined,
    });

    const result = await client.getSummary({ search: "wind", visibility: "public" });

    expect(result).toEqual(summary);
    const [method, path, options] = request.mock.calls[0];
    expect(method).toBe("GET");
    expect(path).toBe("/summary?search=wind&visibility=public");
    expect(options).toBeUndefined();
  });
});

