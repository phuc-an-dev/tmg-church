import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert, Home } from "lucide-react";
import { getAuthContext } from "@/features/auth/queries";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Không có quyền truy cập",
  description: "Tài khoản hiện tại không có quyền quản trị",
};

export default async function UnauthorizedPage() {
  const auth = await getAuthContext();

  if (auth.status === "unauthenticated") {
    redirect("/admin/login");
  }

  if (auth.status === "authorized") {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="bg-destructive/10 text-destructive mx-auto flex size-12 items-center justify-center rounded-xl">
          <ShieldAlert className="size-6" aria-hidden="true" />
        </div>

        <div className="space-y-3">
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Không có quyền truy cập
          </h1>
          <p className="text-muted-foreground text-sm">
            Tài khoản hiện tại không nằm trong danh sách Ban điều hành được cấp
            quyền truy cập hệ thống quản trị.
          </p>
        </div>

        <div className="border-border bg-card rounded-xl border p-6 shadow-xs">
          <div className="space-y-4">
            <div className="text-sm">
              <span className="text-muted-foreground">
                Tài khoản đang đăng nhập:{" "}
              </span>
              <span className="text-foreground font-mono font-medium break-all">
                {auth.email}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Nếu bạn là thành viên Ban điều hành, vui lòng liên hệ quản trị
              viên để được cấp quyền vào hệ thống.
            </p>
            <div className="flex flex-col gap-2.5 pt-2 sm:flex-row sm:justify-center">
              <SignOutButton variant="page" />
              <Link
                href="/"
                className={buttonVariants({
                  variant: "outline",
                  className: "min-h-[44px] gap-2",
                })}
              >
                <Home className="size-4" aria-hidden="true" />
                <span>Về trang chủ</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
