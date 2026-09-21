import {
  CalendarDays,
  Church,
  LayoutDashboard,
  Layers3,
  Sparkles,
  Tags,
  Users,
} from "lucide-react";

const CORE_ADMIN_NAVIGATION_ITEMS = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/members",
    label: "Members",
    icon: Users,
    exact: false,
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
  {
    href: "/admin/sessions",
    label: "Sessions",
    icon: CalendarDays,
    exact: false,
  },
  {
    href: "/admin/icons",
    label: "Icons",
    icon: Sparkles,
    exact: false,
  },
] as const;

const CHURCH_SETUP_NAVIGATION_ITEM = {
  href: "/admin/church",
  label: "Church Setup",
  icon: Church,
  exact: false,
} as const;

const CHURCH_NAVIGATION_ITEM = {
  href: "/admin/church",
  label: "Church",
  icon: Church,
  exact: false,
} as const;

/**
 * Church setup is onboarding for unconfigured churches. Once configured,
 * the Church destination is accessible to Master Admins in day-to-day navigation.
 */
export function getAdminNavigationItems(
  hasConfiguredChurch: boolean,
  isMasterAdmin: boolean = false,
) {
  if (!hasConfiguredChurch) {
    return [CHURCH_SETUP_NAVIGATION_ITEM, ...CORE_ADMIN_NAVIGATION_ITEMS];
  }

  if (isMasterAdmin) {
    return [...CORE_ADMIN_NAVIGATION_ITEMS, CHURCH_NAVIGATION_ITEM];
  }

  return CORE_ADMIN_NAVIGATION_ITEMS;
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
