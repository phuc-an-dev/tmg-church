import Link from "next/link";
import { Church, Shield } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="bg-primary/10 text-primary mx-auto flex size-14 items-center justify-center rounded-2xl">
          <Church className="size-7" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Hội Thánh TMG
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Hệ thống thông tin và quản trị Hội Thánh. Cổng thông tin công khai
            đang trong quá trình hoàn thiện.
          </p>
        </div>

        <div className="border-border bg-card rounded-xl border p-6 shadow-xs">
          <p className="text-muted-foreground text-xs leading-relaxed">
            Dành cho Ban điều hành và nhân sự phụ trách:
          </p>
          <div className="mt-4 flex justify-center">
            <Link
              href="/admin"
              className={buttonVariants({
                variant: "outline",
                className: "min-h-[44px] gap-2 px-5 text-sm",
              })}
            >
              <Shield className="size-4" aria-hidden="true" />
              <span>Khu vực quản trị</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
