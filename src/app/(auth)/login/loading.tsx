import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginLoading() {
  return (
    <AuthShell contentPosition="upper">
      <div className="admin-panel-strong overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="bg-muted h-8 w-48 animate-pulse rounded-md motion-reduce:animate-none" />
          <div className="mt-6 space-y-6">
            <div className="space-y-3">
              <div className="bg-muted h-4 w-24 animate-pulse rounded motion-reduce:animate-none" />
              <div className="bg-muted h-12 w-full animate-pulse rounded-md motion-reduce:animate-none" />
            </div>
            <div className="bg-muted h-12 w-full animate-pulse rounded-md motion-reduce:animate-none" />
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
