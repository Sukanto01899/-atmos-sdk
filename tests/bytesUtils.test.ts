import { describe, expect, test } from "vitest";
import { formatBytes } from "../src/utils/bytes";

describe("bytes utils", () => {
  test("returns null for invalid numbers", () => {
    expect(formatBytes(Number.NaN)).toBeNull();
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBeNull();
    expect(formatBytes(-1)).toBeNull();
  });

  test("formats bytes (decimal)", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(999)).toBe("999 B");
    expect(formatBytes(1000)).toBe("1 KB");
    expect(formatBytes(1500, { decimals: 1 })).toBe("1.5 KB");
    expect(formatBytes(1_000_000)).toBe("1 MB");
  });

  test("formats bytes (binary)", () => {
    expect(formatBytes(1024, { binary: true })).toBe("1 KiB");
    expect(formatBytes(1536, { binary: true, decimals: 1 })).toBe("1.5 KiB");
    expect(formatBytes(1_048_576, { binary: true })).toBe("1 MiB");
  });

  test("supports custom spacer", () => {
    expect(formatBytes(1000, { spacer: "" })).toBe("1KB");
  });
});

