import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { createIpfsAdapter } from "../src/storage/ipfs";

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

const sha256Hex = async (text: string) => {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
};

describe("IPFS bundle support", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("uploadBundle creates manifest and parses directory CID", async () => {
    const ndjson = [
      JSON.stringify({ Name: "a.txt", Hash: "cid-a" }),
      JSON.stringify({ Name: "b/b.txt", Hash: "cid-b" }),
      JSON.stringify({ Name: "manifest.json", Hash: "cid-manifest" }),
      JSON.stringify({ Name: "", Hash: "cid-dir" }),
      "",
    ].join("\n");

    globalThis.fetch = vi.fn(async (url) => {
      const u = new URL(String(url));
      if (u.pathname.endsWith("/api/v0/add")) {
        return new Response(ndjson, { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;

    const storage = createIpfsAdapter({ endpoint: "http://127.0.0.1:5001" });
    const a = new Blob(["hello"], { type: "text/plain" });
    const b = new Blob(["world"], { type: "text/plain" });

    const result = await storage.uploadBundle!({
      metadata: {
        name: "Bundle Dataset",
        description: "multi-file",
        dataType: "csv",
        isPublic: true,
        collectionDate: 0,
        altitudeMin: 0,
        altitudeMax: 0,
        latitude: 0,
        longitude: 0,
      },
      files: [
        { path: "a.txt", data: a },
        { path: "b/b.txt", data: b },
      ],
    });

    expect(result.id).toBe("cid-dir");
    expect(result.location).toBe("ipfs://cid-dir");
    expect(result.manifestCid).toBe("cid-manifest");
    expect(result.fileCids?.["a.txt"]).toBe("cid-a");
    expect(result.fileCids?.["b/b.txt"]).toBe("cid-b");
    expect(result.manifest.files).toHaveLength(2);

    const aEntry = result.manifest.files.find((f) => f.path === "a.txt")!;
    const bEntry = result.manifest.files.find((f) => f.path === "b/b.txt")!;
    expect(aEntry.sizeBytes).toBe(5);
    expect(bEntry.sizeBytes).toBe(5);
    expect(aEntry.checksumSha256).toBe(await sha256Hex("hello"));
    expect(bEntry.checksumSha256).toBe(await sha256Hex("world"));
  });

  test("verifyBundle reports checksum mismatch", async () => {
    const manifest = {
      manifestVersion: 1,
      createdAt: 1,
      files: [
        {
          path: "a.txt",
          sizeBytes: 5,
          checksumSha256: await sha256Hex("expected"),
        },
      ],
    };

    globalThis.fetch = vi.fn(async (url) => {
      const u = new URL(String(url));
      if (u.pathname.endsWith("/api/v0/cat")) {
        const arg = u.searchParams.get("arg") ?? "";
        if (arg.endsWith("/manifest.json")) {
          return new Response(JSON.stringify(manifest), { status: 200 });
        }
        if (arg.includes("/a.txt")) {
          return new Response("actual", { status: 200 });
        }
      }
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;

    const storage = createIpfsAdapter({ endpoint: "http://127.0.0.1:5001" });
    const result = await storage.verifyBundle!("cid-dir");

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Checksum mismatch.");
    expect(result.mismatches?.[0]?.path).toBe("a.txt");
  });
});

