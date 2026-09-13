import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { requireLeader } from "@/features/auth/queries";
import { getAdminChurchState } from "@/features/church/queries";
import { ChurchAdvancedSettings } from "@/features/church/components/church-advanced-settings";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Advanced Church Settings",
  description: "Manage sensitive church administration controls",
};

export default async function AdvancedChurchSettingsPage() {
  await requireLeader();
  const churchState = await getAdminChurchState();

  if (churchState.status === "one") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ChurchAdvancedSettings church={churchState.church} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <AdminPageHeader
          eyebrow="Advanced settings"
          title="Church Administration"
          description="Sensitive controls are available only when exactly one church is configured."
          action={
            <Button asChild variant="outline" className="min-h-11 gap-2 px-4">
              <Link href="/admin/church">
                <ArrowLeft className="size-4" aria-hidden="true" />
                <span>Back</span>
              </Link>
            </Button>
          }
        />
        <div className="admin-panel flex items-start gap-3 p-4 sm:p-6">
          <Info
            className="text-primary mt-0.5 size-5 shrink-0"
            aria-hidden="true"
          />
          <p className="text-muted-foreground text-sm leading-6">
            {churchState.status === "zero"
              ? "Create a church profile before using advanced administration controls."
              : "Resolve the multiple-church configuration before using advanced administration controls."}
          </p>
        </div>
      </div>
    </div>
  );
}
