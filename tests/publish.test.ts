import { describe, expect, test, vi } from "vitest";
import { SdkClient } from "../src/client/SdkClient";
import type { StorageAdapter, RegistryAdapter, OnChainPublisher } from "../src/types";

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

const sha256Hex = async (text: string) => {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(digest);
};

describe("publish()", () => {
  test("uploads, computes size+sha256, then registers via api + onchain", async () => {
    const upload = vi.fn(async () => ({ id: "cid", location: "ipfs://cid" }));

    const storage: StorageAdapter = {
      upload,
      download: async () => {
        throw new Error("not used");
      },
      preview: async () => {
        throw new Error("not used");
      },
      verify: async () => {
        throw new Error("not used");
      },
    };

    const registry: RegistryAdapter = {
      registerDataset: vi.fn(async () => ({ datasetId: 123 })),
    };

    const onchain: OnChainPublisher = {
      buildRegisterDatasetTx: vi.fn(() => ({ type: "contract-call" })),
      submitTx: vi.fn(async () => ({ txId: "0xabc" })),
    };

    const client = new SdkClient({
      baseUrl: "http://127.0.0.1:4000",
      storage,
      registry,
      onchain,
    });

    const blob = new Blob(["hello"], { type: "text/plain" });
    const result = await client.publish({
      kind: "file",
      data: blob,
      metadata: {
        name: "Hello",
        description: "world",
        dataType: "text",
        isPublic: true,
        collectionDate: 0,
        altitudeMin: 0,
        altitudeMax: 0,
        latitude: 0,
        longitude: 0,
      },
      broadcastOnChainTx: true,
    });

    expect(upload).toHaveBeenCalledTimes(1);
    const [, uploadOptions] = upload.mock.calls[0];
    expect(uploadOptions.contentLength).toBe(5);
    expect(uploadOptions.checksum).toBe(await sha256Hex("hello"));
    expect(uploadOptions.metadata.sizeBytes).toBe(5);
    expect(uploadOptions.metadata.checksum).toBe(await sha256Hex("hello"));

    expect(result.metadata.sizeBytes).toBe(5);
    expect(result.metadata.checksum).toBe(await sha256Hex("hello"));
    expect(result.metadata.ipfsHash).toBe("cid");
    expect(result.metadata.mimeType).toBe("text/plain");

    expect(registry.registerDataset).toHaveBeenCalledTimes(1);
    expect(onchain.buildRegisterDatasetTx).toHaveBeenCalledTimes(1);
    expect(onchain.submitTx).toHaveBeenCalledTimes(1);
    expect(result.api?.datasetId).toBe(123);
    expect(result.onchain?.txId).toBe("0xabc");
  });

  test("bundle publish derives dataset checksum from manifest entries", async () => {
    const uploadBundle = vi.fn(async () => ({
      id: "dir",
      location: "ipfs://dir",
      manifest: {
        manifestVersion: 1,
        createdAt: 1,
        files: [
          { path: "b.txt", sizeBytes: 5, checksumSha256: "bb" },
          { path: "a.txt", sizeBytes: 3, checksumSha256: "aa" },
        ],
      },
    }));

    const storage: StorageAdapter = {
      upload: async () => {
        throw new Error("not used");
      },
      uploadBundle,
      download: async () => {
        throw new Error("not used");
      },
      preview: async () => {
        throw new Error("not used");
      },
      verify: async () => {
        throw new Error("not used");
      },
    };

    const client = new SdkClient({
      baseUrl: "http://127.0.0.1:4000",
      storage,
    });

    const result = await client.publish({
      kind: "bundle",
      files: [
        { path: "a.txt", data: new Blob(["aaa"]) },
        { path: "b.txt", data: new Blob(["bbbbb"]) },
      ],
      metadata: {
        name: "Bundle",
        description: "multi",
        dataType: "text",
        isPublic: true,
        collectionDate: 0,
        altitudeMin: 0,
        altitudeMax: 0,
        latitude: 0,
        longitude: 0,
      },
      target: "none",
    });

    const canonical = ["a.txt:3:aa", "b.txt:5:bb"].join("\n");
    expect(result.metadata.sizeBytes).toBe(8);
    expect(result.metadata.checksum).toBe(await sha256Hex(canonical));
    expect(result.metadata.ipfsHash).toBe("dir");
    expect(uploadBundle).toHaveBeenCalledTimes(1);
  });
});

