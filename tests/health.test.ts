import { describe, expect, test, vi } from "vitest";
import { SdkClient } from "../src/client/SdkClient";
import type { Transport } from "../src/types";

describe("health()", () => {
  test("requests GET /health via transport", async () => {
    const request = vi.fn(async () => ({ ok: true, service: "atmos" }));
    const transport: Transport = { request };

    const client = new SdkClient({ baseUrl: "http://127.0.0.1:4000", transport });
    const result = await client.health();

    expect(result.ok).toBe(true);
    expect(request).toHaveBeenCalledWith("GET", "/health");
  });
});
