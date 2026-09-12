import type { Metadata } from "next";
import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you are looking for does not exist or has been moved.",
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="bg-muted text-muted-foreground mx-auto flex size-14 items-center justify-center rounded-2xl">
          <FileQuestion className="size-7" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Page not found
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The page you are looking for does not exist, has been removed, or
            the link is incorrect.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className={buttonVariants({
              variant: "default",
              className: "min-h-[44px] gap-2 px-5 text-sm",
            })}
          >
            <Home className="size-4" aria-hidden="true" />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
