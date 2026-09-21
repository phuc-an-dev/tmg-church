import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminSeedStepCards } from "@/components/admin/admin-seed-step-cards";

describe("admin seed step cards", () => {
  it("keeps all six seed steps in order with their intended destinations", () => {
    render(<AdminSeedStepCards />);

    const expectedSteps = [
      ["Church settings", "/admin/church"],
      ["Ministries and terms", "/admin/ministries"],
      ["Members", "/admin/members"],
      ["Groups and departments", "/admin/ministries"],
      ["Leadership roles", "/admin/ministries"],
      ["Sessions and assignments", "/admin/sessions"],
    ] as const;

    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual([
      "1. Church settings",
      "2. Ministries and terms",
      "3. Members",
      "4. Groups and departments",
      "5. Leadership roles",
      "6. Sessions and assignments",
    ]);

    for (const [actionLabel, href] of expectedSteps) {
      expect(
        screen.queryByRole("link", { name: `Open ${actionLabel}` }),
      ).not.toBeInTheDocument();

      fireEvent.click(
        screen.getByRole("button", {
          name: `Show actions for ${actionLabel}`,
        }),
      );

      expect(
        screen.getByRole("link", { name: `Open ${actionLabel}` }),
      ).toHaveAttribute("href", href);
    }
  });
});
