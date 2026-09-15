import { Church, Layers3, Tags, Users } from "lucide-react";

const CORE_ADMIN_NAVIGATION_ITEMS = [
  {
    href: "/admin",
    label: "Members",
    icon: Users,
    exact: true,
  },
  {
    href: "/admin/ministries",
    label: "Ministries",
    icon: Layers3,
    exact: false,
  },
  {
    href: "/admin/segments",
    label: "Segments",
    icon: Tags,
    exact: false,
  },
] as const;

const CHURCH_SETUP_NAVIGATION_ITEM = {
  href: "/admin/church",
  label: "Church Setup",
  icon: Church,
  exact: false,
} as const;

/**
 * Church setup is onboarding, not an operational context selector. Once the
 * singleton church exists, every area automatically uses it and the setup
 * destination stays out of day-to-day navigation.
 */
export function getAdminNavigationItems(hasConfiguredChurch: boolean) {
  return hasConfiguredChurch
    ? CORE_ADMIN_NAVIGATION_ITEMS
    : [CHURCH_SETUP_NAVIGATION_ITEM, ...CORE_ADMIN_NAVIGATION_ITEMS];
}

export function isAdminNavigationItemActive(
  pathname: string,
  href: string,
  exact: boolean,
) {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}
