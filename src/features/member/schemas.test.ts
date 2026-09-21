import { describe, expect, test } from "vitest";
import { createMemberSchema } from "./schemas";

describe("createMemberSchema", () => {
  test("accepts a real past ISO birth date", () => {
    expect(
      createMemberSchema.safeParse({
        fullName: "Jane Doe",
        phone: "",
        dateOfBirth: "2000-02-29",
      }).success,
    ).toBe(true);
  });

  test("rejects impossible and future birth dates", () => {
    expect(
      createMemberSchema.safeParse({
        fullName: "Jane Doe",
        phone: "",
        dateOfBirth: "2025-02-29",
      }).success,
    ).toBe(false);
    expect(
      createMemberSchema.safeParse({
        fullName: "Jane Doe",
        phone: "",
        dateOfBirth: "9999-01-01",
      }).success,
    ).toBe(false);
  });
});
