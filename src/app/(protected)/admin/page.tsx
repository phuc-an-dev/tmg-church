import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Layers3,
  ShieldCheck,
  Users,
  UsersRound,
} from "lucide-react";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Overview",
  description: "TMG Church administration overview",
};

const seedSteps = [
  {
    title: "1. Church settings",
    description:
      "Review the Church profile and sensitive administration settings.",
    href: "/admin/church",
    icon: Building2,
  },
  {
    title: "2. Ministries and terms",
    description: "Create a Ministry, then create and activate its Term.",
    href: "/admin/ministries",
    icon: Layers3,
  },
  {
    title: "3. Members",
    description: "Create member profiles and enroll members in an active Term.",
    href: "/admin/members",
    icon: Users,
  },
  {
    title: "4. Groups and departments",
    description: "Create the Term structure, then assign enrolled members.",
    href: "/admin/ministries",
    icon: UsersRound,
  },
  {
    title: "5. Leadership roles",
    description:
      "Assign Ministry roles and Group leadership from the relevant Term.",
    href: "/admin/ministries",
    icon: ShieldCheck,
  },
  {
    title: "6. Sessions and assignments",
    description:
      "Create sessions, record attendance, and assign service roles.",
    href: "/admin/sessions",
    icon: CalendarDays,
  },
] as const;

export default function AdminOverviewPage() {
  return (
    <AdminPageContainer>
      <div className="space-y-6 pb-24">
        <AdminPageHeader
          title="Administration overview"
          description="Use this order to seed your Church data before testing each operational role."
        />

        <Card className="admin-panel">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle>Seed your Church data</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-0 sm:grid-cols-2 sm:p-6 sm:pt-0 lg:grid-cols-3">
            {seedSteps.map(({ title, description, href, icon: Icon }) => (
              <Link
                key={title}
                href={href}
                className="border-border hover:bg-muted/50 focus-visible:ring-ring flex min-h-32 flex-col justify-between rounded-xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
              >
                <div className="space-y-2">
                  <Icon className="text-primary size-5" aria-hidden="true" />
                  <h2 className="font-semibold">{title}</h2>
                  <p className="text-muted-foreground text-sm leading-6">
                    {description}
                  </p>
                </div>
                <span className="text-primary mt-3 inline-flex items-center gap-2 text-sm font-semibold">
                  Open <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="admin-panel">
          <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4">
            <CardTitle>Quick access</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-4 pt-0 sm:flex-row sm:flex-wrap sm:p-6 sm:pt-0">
            <Link
              href="/admin/members"
              className="text-primary inline-flex min-h-11 items-center gap-2 font-semibold"
            >
              Members <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/admin/ministries"
              className="text-primary inline-flex min-h-11 items-center gap-2 font-semibold"
            >
              Ministries <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/admin/sessions"
              className="text-primary inline-flex min-h-11 items-center gap-2 font-semibold"
            >
              Sessions <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/admin/church/advanced"
              className="text-primary inline-flex min-h-11 items-center gap-2 font-semibold"
            >
              Advanced settings{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </AdminPageContainer>
  );
}
