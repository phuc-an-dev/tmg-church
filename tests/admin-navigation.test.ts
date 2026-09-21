import { describe, expect, it } from "vitest";
import {
  getAdminNavigationItems,
  isAdminNavigationItemActive,
} from "@/components/admin/admin-navigation";

describe("admin navigation", () => {
  it("keeps the overview at /admin and puts Members at /admin/members", () => {
    const items = getAdminNavigationItems(true);

    expect(items.find((item) => item.label === "Overview")?.href).toBe(
      "/admin",
    );
    expect(items.find((item) => item.label === "Members")?.href).toBe(
      "/admin/members",
    );
  });

  it("keeps Members active across its detail routes without activating Overview", () => {
    expect(
      isAdminNavigationItemActive(
        "/admin/members/example-member",
        "/admin/members",
        false,
      ),
    ).toBe(true);
    expect(
      isAdminNavigationItemActive(
        "/admin/members/example-member",
        "/admin",
        true,
      ),
    ).toBe(false);
  });
});
