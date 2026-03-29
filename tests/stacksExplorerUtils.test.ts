import { describe, expect, test } from "vitest";
import { toStacksExplorerAddressUrl, toStacksExplorerTxUrl } from "../src/utils/stacksExplorer";

describe("stacks explorer utils", () => {
  test("returns null for empty input", () => {
    expect(toStacksExplorerAddressUrl("")).toBeNull();
    expect(toStacksExplorerTxUrl("   ")).toBeNull();
  });

  test("builds address url for mainnet by default", () => {
    expect(toStacksExplorerAddressUrl("SP123")).toBe(
      "https://explorer.hiro.so/address/SP123?chain=mainnet",
    );
  });

  test("builds tx url and supports testnet + custom baseUrl", () => {
    expect(
      toStacksExplorerTxUrl("0xabc", {
        chain: "testnet",
        baseUrl: "https://explorer.hiro.so/",
      }),
    ).toBe("https://explorer.hiro.so/txid/0xabc?chain=testnet");
  });
});

