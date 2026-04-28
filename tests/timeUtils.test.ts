import { describe, expect, test } from "vitest";
import {
  isValidUnixSeconds,
  parseUnixSecondsFromIsoString,
  toIsoStringFromUnixSeconds,
} from "../src/utils/time";

describe("time utils", () => {
  test("validates unix seconds", () => {
    expect(isValidUnixSeconds(0)).toBe(true);
    expect(isValidUnixSeconds(1)).toBe(true);
    expect(isValidUnixSeconds(-1)).toBe(false);
    expect(isValidUnixSeconds(1.5)).toBe(false);
    expect(isValidUnixSeconds(Number.NaN)).toBe(false);
  });

  test("converts unix seconds to ISO", () => {
    expect(toIsoStringFromUnixSeconds(0)).toBe("1970-01-01T00:00:00.000Z");
    expect(toIsoStringFromUnixSeconds(-1)).toBeNull();
  });

  test("parses unix seconds from ISO", () => {
    expect(parseUnixSecondsFromIsoString("1970-01-01T00:00:00.000Z")).toBe(0);
    expect(parseUnixSecondsFromIsoString("")).toBeNull();
    expect(parseUnixSecondsFromIsoString("not a date")).toBeNull();
  });
});

