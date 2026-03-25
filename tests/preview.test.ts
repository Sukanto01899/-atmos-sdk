import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { createIpfsAdapter } from "../src/storage/ipfs";

describe("ipfs.preview()", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("parses CSV with quoted commas and newlines", async () => {
    const csv = `col1,col2\n"a,1",2\n"line\nbreak",3\n`;

    globalThis.fetch = vi.fn(async (url) => {
      const u = new URL(String(url));
      if (u.pathname.endsWith("/api/v0/cat")) {
        return new Response(csv, { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;

    const storage = createIpfsAdapter({ endpoint: "http://127.0.0.1:5001" });
    const result = await storage.preview("cid", { format: "csv", maxRows: 10 });

    expect(result.rows).toEqual([
      { col1: "a,1", col2: "2" },
      { col1: "line\nbreak", col2: "3" },
    ]);
    expect(result.schema).toEqual({ col1: "string", col2: "number" });
  });

  test("auto-detects NDJSON and infers schema", async () => {
    const ndjson = `{"a":1}\n{"a":2}\n`;

    globalThis.fetch = vi.fn(async (url) => {
      const u = new URL(String(url));
      if (u.pathname.endsWith("/api/v0/cat")) {
        return new Response(ndjson, { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;

    const storage = createIpfsAdapter({ endpoint: "http://127.0.0.1:5001" });
    const result = await storage.preview("cid", { format: "auto", maxRows: 10 });

    expect(result.rows).toEqual([{ a: 1 }, { a: 2 }]);
    expect(result.schema).toEqual({ a: "number" });
  });
});

