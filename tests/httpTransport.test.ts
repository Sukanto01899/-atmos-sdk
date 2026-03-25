import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { httpTransport } from "../src/transport/http";

describe("httpTransport", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("encodes GET body as query params (no request body)", async () => {
    globalThis.fetch = vi.fn(async (url, init) => {
      expect(String(url)).toBe("http://127.0.0.1:4000/datasets?owner=SP123&limit=10");
      expect(init?.body).toBeUndefined();
      return new Response(JSON.stringify({ items: [], nextCursor: undefined }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const transport = httpTransport({ baseUrl: "http://127.0.0.1:4000" });
    const result = await transport.request("GET", "/datasets", {
      body: { owner: "SP123", limit: 10 },
    });

    expect(result).toEqual({ items: [], nextCursor: undefined });
  });

  test("returns text when response is not JSON", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response("ok", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    }) as unknown as typeof fetch;

    const transport = httpTransport({ baseUrl: "http://127.0.0.1:4000" });
    const result = await transport.request<string>("GET", "/health");
    expect(result).toBe("ok");
  });
});

