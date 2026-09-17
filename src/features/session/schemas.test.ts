import { describe, expect, it } from "vitest";
import { sessionSchema } from "./schemas";

describe("sessionSchema", () => {
  it("retains a Group scope for a valid session", () => {
    const result = sessionSchema.parse({
      ministryTermId: "11111111-1111-4111-8111-111111111111",
      termGroupId: "22222222-2222-4222-8222-222222222222",
      title: "Group prayer",
      sessionDate: "2026-09-17",
    });

    expect(result.termGroupId).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("rejects a session that targets both a Group and Department", () => {
    const result = sessionSchema.safeParse({
      ministryTermId: "11111111-1111-4111-8111-111111111111",
      termGroupId: "22222222-2222-4222-8222-222222222222",
      termDepartmentId: "33333333-3333-4333-8333-333333333333",
      title: "Invalid scope",
      sessionDate: "2026-09-17",
    });

    expect(result.success).toBe(false);
  });
});
