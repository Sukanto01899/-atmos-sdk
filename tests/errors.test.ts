import { describe, expect, test } from "vitest";
import { SdkError } from "../src/types";
import { isSdkError } from "../src/utils/errors";
import { SDK_ERROR_BRAND } from "../src/types";

describe("isSdkError", () => {
  test("returns true for real SdkError instances", () => {
    const err = new SdkError("E_TEST", "boom");
    expect(isSdkError(err)).toBe(true);
  });

  test("returns true for branded SdkError-like objects (cross-realm / duplicated installs)", () => {
    const foreign = { name: "SdkError", code: "E_TEST", message: "boom" } as any;
    Object.defineProperty(foreign, SDK_ERROR_BRAND, { value: true });
    expect(isSdkError(foreign)).toBe(true);
  });

  test("returns false for non-matching objects", () => {
    expect(isSdkError({ name: "SdkError", message: "boom" })).toBe(false);
    expect(isSdkError({ code: "E_TEST", message: "boom" })).toBe(false);
    expect(isSdkError(null)).toBe(false);
  });
});

