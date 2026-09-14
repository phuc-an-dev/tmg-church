"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin page error:", error.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="admin-panel mx-auto max-w-md !py-6 text-center sm:!py-8">
        <div className="bg-destructive/10 text-destructive mx-auto mb-4 flex size-12 items-center justify-center rounded-xl">
          <AlertCircle className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
          Failed to load administrative overview
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          An error occurred while loading administrative data. Please try again.
        </p>
        <div className="mt-6 flex justify-center">
          <Button
            onClick={() => reset()}
            variant="outline"
            className="min-h-[44px] gap-2"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            <span>Try again</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
