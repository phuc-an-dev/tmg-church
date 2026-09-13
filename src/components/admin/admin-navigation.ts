import { Church, LayoutDashboard } from "lucide-react";

export const ADMIN_NAVIGATION_ITEMS = [
  {
    href: "/admin",
    label: "Overview",
    mobileLabel: "Overview",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/church",
    label: "Church Settings",
    mobileLabel: "Church",
    icon: Church,
    exact: false,
  },
] as const;

export function isAdminNavigationItemActive(
  pathname: string,
  href: string,
  exact: boolean,
) {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}
