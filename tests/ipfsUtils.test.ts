import { describe, expect, test } from "vitest";
import { normalizeIpfsCid, toIpfsGatewayUrl } from "../src/utils/ipfs";

describe("ipfs utils", () => {
  test("normalizeIpfsCid handles raw cid, ipfs://, /ipfs/, and gateway urls", () => {
    expect(normalizeIpfsCid("QmHash")).toBe("QmHash");
    expect(normalizeIpfsCid("ipfs://QmHash")).toBe("QmHash");
    expect(normalizeIpfsCid("/ipfs/QmHash")).toBe("QmHash");
    expect(normalizeIpfsCid("https://ipfs.io/ipfs/QmHash")).toBe("QmHash");
    expect(normalizeIpfsCid("https://gateway.example/ipfs/QmHash?filename=a.csv")).toBe("QmHash");
  });

  test("normalizeIpfsCid returns null for empty input", () => {
    expect(normalizeIpfsCid("")).toBeNull();
    expect(normalizeIpfsCid("   ")).toBeNull();
  });

  test("toIpfsGatewayUrl builds default ipfs.io url", () => {
    expect(toIpfsGatewayUrl("ipfs://QmHash")).toBe("https://ipfs.io/ipfs/QmHash");
  });

  test("toIpfsGatewayUrl accepts gateway bases with or without /ipfs/", () => {
    expect(toIpfsGatewayUrl("QmHash", "https://cloudflare-ipfs.com")).toBe(
      "https://cloudflare-ipfs.com/ipfs/QmHash",
    );
    expect(toIpfsGatewayUrl("QmHash", "https://cloudflare-ipfs.com/ipfs")).toBe(
      "https://cloudflare-ipfs.com/ipfs/QmHash",
    );
    expect(toIpfsGatewayUrl("QmHash", "https://cloudflare-ipfs.com/ipfs/")).toBe(
      "https://cloudflare-ipfs.com/ipfs/QmHash",
    );
  });
});

