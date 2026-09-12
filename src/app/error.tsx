"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root application error:", error.message);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="bg-destructive/10 text-destructive mx-auto mb-4 flex size-12 items-center justify-center rounded-xl">
        <AlertCircle className="size-6" aria-hidden="true" />
      </div>
      <h1 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
        Something went wrong
      </h1>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        An unexpected error occurred while loading this page.
      </p>
      <div className="mt-6">
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
  );
}
