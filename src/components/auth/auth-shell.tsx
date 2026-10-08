import type { ReactNode } from "react";
import { cn } from "cn";
import { BrandLockup } from "@/components/brand/brand-lockup";

interface AuthShellProps {
  children: ReactNode;
  contentPosition?: "center" | "upper" | "top";
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
      <main
        className={cn(
          "flex flex-1 justify-center px-4 sm:px-6",
          contentPosition === "top"
            ? "items-start pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:py-8"
            : "items-center py-10",
        )}
      >
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
