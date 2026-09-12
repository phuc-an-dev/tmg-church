import type { Metadata } from "next";
import { Church } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Đăng nhập Quản trị",
  description: "Trang đăng nhập dành cho Ban điều hành Hội Thánh",
};

interface LoginPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;

  let initialErrorMessage: string | undefined;
  if (status === "link-invalid") {
    initialErrorMessage =
      "Liên kết đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.";
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-xl">
            <Church className="size-6" aria-hidden="true" />
          </div>
          <h1 className="text-foreground mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Đăng nhập Quản trị
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Hệ thống quản trị nội bộ dành cho Ban điều hành Hội Thánh.
          </p>
        </div>

        <div className="border-border bg-card rounded-xl border p-6 shadow-xs sm:p-8">
          <LoginForm initialErrorMessage={initialErrorMessage} />
        </div>

        <p className="text-muted-foreground text-center text-xs">
          Chỉ các tài khoản thuộc danh sách Ban điều hành mới có quyền truy cập
          vào hệ thống.
        </p>
      </div>
    </div>
  );
}
