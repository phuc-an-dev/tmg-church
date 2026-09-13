import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="admin-canvas relative isolate min-h-screen overflow-hidden">
      <Image
        src="/images/tmg-church-hero-v1.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="pointer-events-none -z-10 object-cover object-[68%_center] opacity-40 sm:opacity-55"
      />
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header>
          <BrandLockup subtitle="Church information and administration" />
        </header>

        <section className="flex flex-1 items-center py-20 sm:py-28">
          <div className="max-w-xl">
            <p className="text-primary mb-4 text-sm font-semibold tracking-[0.16em] uppercase">
              Welcome to TMG Church
            </p>
            <h1 className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              A quieter place for church life to stay connected.
            </h1>
            <p className="text-muted-foreground mt-6 max-w-lg text-base leading-7 sm:text-lg">
              Information, ministry structure, and administration in one calm,
              focused space.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin"
                className={buttonVariants({
                  className: "min-h-[48px] gap-2 rounded-xl px-5",
                })}
              >
                <Shield className="size-4" aria-hidden="true" />
                <span>Administration</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <p className="text-muted-foreground flex items-center text-sm sm:max-w-52">
                Public directory features are coming soon.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
