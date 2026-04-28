import { describe, expect, test } from "vitest";
import { truncateText } from "../src/utils/text";

describe("text utils", () => {
  test("returns original when shorter than maxLength", () => {
    expect(truncateText("hello", { maxLength: 10 })).toBe("hello");
  });

  test("truncates and adds ellipsis", () => {
    expect(truncateText("hello world", { maxLength: 8 })).toBe("hello…");
    expect(truncateText("hello world", { maxLength: 8, ellipsis: "..." })).toBe("hello...");
  });

  test("supports word boundary truncation", () => {
    expect(truncateText("hello world again", { maxLength: 12, wordBoundary: true })).toBe("hello…");
    expect(truncateText("helloworldagain", { maxLength: 12, wordBoundary: true })).toBe("helloworlda…");
  });

  test("handles very small maxLength", () => {
    expect(truncateText("hello", { maxLength: 1 })).toBe("…");
    expect(truncateText("hello", { maxLength: 2 })).toBe("…");
    expect(truncateText("hello", { maxLength: 3, ellipsis: "..." })).toBe("...");
  });
});

