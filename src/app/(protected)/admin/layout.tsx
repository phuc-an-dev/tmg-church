import type { Metadata } from "next";
import Link from "next/link";
import { Church } from "lucide-react";
import { requireLeader } from "@/features/auth/queries";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata: Metadata = {
  title: "Quản trị Hội Thánh",
  description: "Khu vực quản trị nội bộ Hội Thánh",
};

interface ProtectedAdminLayoutProps {
  children: React.ReactNode;
}

export default async function ProtectedAdminLayout({
  children,
}: ProtectedAdminLayoutProps) {
  const auth = await requireLeader();

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="border-border bg-card/80 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-foreground focus-visible:ring-ring flex items-center gap-2 transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:outline-hidden"
            >
              <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                <Church className="size-4" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold tracking-tight">
                Quản trị Hội Thánh
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-muted-foreground hidden max-w-[200px] truncate text-xs sm:inline-block sm:max-w-xs">
              {auth.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
