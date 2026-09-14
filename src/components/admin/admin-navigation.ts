import { Church, Layers3, Users } from "lucide-react";

export const ADMIN_NAVIGATION_ITEMS = [
  {
    href: "/admin",
    label: "Members",
    icon: Users,
    exact: true,
  },
  {
    href: "/admin/church",
    label: "Church Settings",
    icon: Church,
    exact: false,
  },
  {
    href: "/admin/ministries",
    label: "Ministries",
    icon: Layers3,
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
