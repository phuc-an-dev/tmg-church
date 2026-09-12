import type { Metadata } from "next";
import { ShieldCheck, UserCheck } from "lucide-react";
import { requireLeader } from "@/features/auth/queries";

export const metadata: Metadata = {
  title: "Bảng điều khiển Quản trị",
  description: "Trang chủ khu vực quản trị Hội Thánh",
};

export default async function AdminPage() {
  const auth = await requireLeader();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Bảng điều khiển Quản trị
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Phiên đăng nhập quản trị viên đã được xác thực thành công.
          </p>
        </div>

        <div className="border-border bg-card rounded-xl border p-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="text-card-foreground text-base font-semibold">
                Xác thực thành công
              </h2>
              <p className="text-muted-foreground text-sm">
                Bạn đang truy cập với tư cách thành viên Ban điều hành Hội
                Thánh.
              </p>
              <div className="text-muted-foreground mt-3 flex items-center gap-2 text-xs">
                <UserCheck
                  className="text-primary size-4 shrink-0"
                  aria-hidden="true"
                />
                <span>Tài khoản: </span>
                <span className="text-foreground font-mono font-medium break-all">
                  {auth.email}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
