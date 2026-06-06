import { describe, expect, test } from "vitest";
import { mergeFilters } from "../src/utils/mergeFilters";

describe("mergeFilters", () => {
  test("returns an empty object for no inputs", () => {
    expect(mergeFilters()).toEqual({});
  });

  test("later defined scalars override earlier ones", () => {
    expect(
      mergeFilters({ status: "active", dataType: "csv" }, { status: "verified" }),
    ).toEqual({ status: "verified", dataType: "csv" });
  });

  test("undefined values never overwrite", () => {
    expect(
      mergeFilters({ dataType: "lidar" }, { dataType: undefined }),
    ).toEqual({ dataType: "lidar" });
  });

  test("unions tags preserving first-seen order without duplicates", () => {
    expect(
      mergeFilters(
        { tags: ["climate", "public"] },
        { tags: ["public", "lidar"] },
      ).tags,
    ).toEqual(["climate", "public", "lidar"]);
  });

  test("omits tags entirely when none are present", () => {
    expect(mergeFilters({ status: "active" })).toEqual({ status: "active" });
  });

  test("skips null / undefined filter arguments", () => {
    expect(
      mergeFilters(undefined, { isPublic: true }, null, { verified: true }),
    ).toEqual({ isPublic: true, verified: true });
  });

  test("layers a base view with ad-hoc overrides", () => {
    const base = { status: "verified" as const, tags: ["climate"] };
    const override = { dataType: "lidar", tags: ["public"] };
    expect(mergeFilters(base, override)).toEqual({
      status: "verified",
      dataType: "lidar",
      tags: ["climate", "public"],
    });
  });
});
