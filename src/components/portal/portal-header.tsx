import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { AdminAccountMenu } from "@/components/admin/admin-account-menu";

interface PortalHeaderProps {
  email: string;
}

export function PortalHeader({ email }: PortalHeaderProps) {
  return (
    <header className="border-border/80 bg-card sticky top-0 z-40 border-b">
      <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/portal"
          className="focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:outline-hidden"
        >
          <BrandLockup name="TMG Church" subtitle="Portal" />
        </Link>
        <AdminAccountMenu email={email} />
      </div>
    </header>
  );
}
