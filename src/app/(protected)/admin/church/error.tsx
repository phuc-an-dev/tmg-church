"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminChurchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Church management error:", error.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md text-center">
        <div className="bg-destructive/10 text-destructive mx-auto mb-4 flex size-12 items-center justify-center rounded-xl">
          <AlertCircle className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
          Failed to load church settings
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          An error occurred while loading church details. Please try again.
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
