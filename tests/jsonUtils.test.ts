import { describe, expect, test } from "vitest";
import { safeJsonParse, safeJsonStringify } from "../src/utils/json";

describe("json utils", () => {
  test("safely parses json", () => {
    expect(safeJsonParse<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
    expect(safeJsonParse("not json")).toBeNull();
  });

  test("supports reviver", () => {
    const value = safeJsonParse<{ n: number }>('{"n":"2"}', {
      reviver: (key, v) => (key === "n" ? Number(v) : v),
    });
    expect(value).toEqual({ n: 2 });
  });

  test("safely stringifies json", () => {
    expect(safeJsonStringify({ a: 1 })).toBe('{"a":1}');
    expect(safeJsonStringify({ a: 1 }, { space: 2 })).toBe('{\n  "a": 1\n}');
  });

  test("returns null on circular structures", () => {
    const obj: any = {};
    obj.self = obj;
    expect(safeJsonStringify(obj)).toBeNull();
  });
});

