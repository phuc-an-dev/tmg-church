import { AuthShell } from "@/components/auth/auth-shell";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthSkeleton({
  variant,
}: {
  variant:
    | "login"
    | "register"
    | "verify-email"
    | "activate"
    | "access-pending"
    | "unauthorized";
}) {
  const isForm =
    variant === "login" || variant === "register" || variant === "activate";
  const fieldCount =
    variant === "register" ? 7 : variant === "activate" ? 3 : 2;

  return (
    <AuthShell
      contentPosition={
        variant === "register" ? "top" : isForm ? "upper" : "center"
      }
    >
      <div
        className="admin-panel-strong overflow-hidden"
        role="status"
        aria-label="Loading account page"
      >
        <span className="sr-only">Loading account page, please wait.</span>
        <div className="p-6 sm:p-8" aria-hidden="true">
          {!isForm && (
            <Skeleton
              className={
                variant === "verify-email"
                  ? "mb-4 size-11 rounded-xl"
                  : "mx-auto mb-5 size-14 rounded-2xl"
              }
            />
          )}
          <Skeleton className="h-8 w-56 max-w-full sm:h-9" />
          <div className="mt-2 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          {isForm ? (
            <div className="mt-6 space-y-4">
              {Array.from({ length: fieldCount }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
              <div className="flex min-h-12 items-center justify-center">
                <Skeleton className="h-4 w-32" />
              </div>
              {variant !== "activate" && (
                <Skeleton className="mx-auto h-4 w-48 max-w-full" />
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="bg-muted/30 space-y-2 rounded-xl border p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              {Array.from({
                length: variant === "access-pending" ? 3 : 2,
              }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
