"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChurchViewModel } from "../types";
import { DeleteChurchDialog } from "./delete-church-dialog";

interface ChurchAdvancedSettingsProps {
  church: ChurchViewModel;
}

export function ChurchAdvancedSettings({
  church,
}: ChurchAdvancedSettingsProps) {
  const router = useRouter();

  const handleDeleteSuccess = React.useCallback(() => {
    router.replace("/admin/church?status=deleted");
  }, [router]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AdminPageHeader
        title="Church Administration"
        description="Sensitive organization controls are separated from routine profile editing."
        action={
          <Button asChild variant="outline" className="min-h-11 gap-2 px-4">
            <Link href="/admin/church">
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span>Back</span>
            </Link>
          </Button>
        }
      />

      <Card className="admin-panel-strong border-destructive/25">
        <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4">
          <div className="flex items-start gap-3">
            <div className="bg-destructive/10 text-destructive flex size-10 shrink-0 items-center justify-center rounded-xl">
              <ShieldAlert className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-foreground text-xl font-bold">
                Delete Church
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1 text-sm leading-6">
                Permanently remove {church.name}. This action is intentionally
                isolated from everyday Church settings.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="admin-surface p-4 text-sm">
            {church.isDeletable ? (
              <p className="text-muted-foreground leading-6">
                This church has no linked ministries, members, or groups. You
                may continue to the exact-name confirmation step.
              </p>
            ) : (
              <p className="text-muted-foreground leading-6">
                Deletion is unavailable while linked ministries, members, or
                groups exist. Remove those dependencies before returning to this
                page.
              </p>
            )}
          </div>
          <DeleteChurchDialog church={church} onSuccess={handleDeleteSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}
