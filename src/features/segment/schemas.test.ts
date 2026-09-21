import { describe, expect, test } from "vitest";
import { segmentConditionSchema } from "./schemas";

describe("segmentConditionSchema", () => {
  test("accepts a date_of_birth condition with an ISO calendar date", () => {
    expect(
      segmentConditionSchema.safeParse({
        field: "date_of_birth",
        operator: "greater_than_or_equal",
        value: "2000-02-29",
      }).success,
    ).toBe(true);
  });

  test("rejects a date_of_birth condition with an impossible calendar date", () => {
    expect(
      segmentConditionSchema.safeParse({
        field: "date_of_birth",
        operator: "equals",
        value: "2001-02-29",
      }).success,
    ).toBe(false);
  });
});
