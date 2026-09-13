import type { ReactNode } from "react";
import { cn } from "cn";
import { BrandLockup } from "@/components/brand/brand-lockup";

interface AuthShellProps {
  children: ReactNode;
  contentPosition?: "center" | "upper";
}

export function AuthShell({
  children,
  contentPosition = "center",
}: AuthShellProps) {
  return (
    <div className="admin-canvas flex min-h-screen flex-col">
      <header className="border-border/80 bg-card border-b">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center px-4 py-3 sm:px-6 lg:px-8">
          <BrandLockup name="TMG Church" subtitle="Administration" />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div
          className={cn(
            "w-full max-w-md",
            contentPosition === "upper" && "-translate-y-[4vh]",
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
