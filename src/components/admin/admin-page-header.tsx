import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  backLink?: {
    href: string;
    label: string;
  };
}

export function AdminPageHeader({
  title,
  description,
  action,
  backLink,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        {backLink && (
          <div>
            <Link
              href={backLink.href}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span>{backLink.label}</span>
            </Link>
          </div>
        )}
        <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground max-w-2xl text-sm leading-6 sm:text-base">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
