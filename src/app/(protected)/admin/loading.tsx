import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 sm:w-64" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Church Status Skeleton */}
      <Card className="border-border bg-card rounded-xl border shadow-xs">
        <CardHeader className="p-4 pb-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-6 w-40 sm:w-56" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <Skeleton className="h-11 w-36 rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Skeleton className="h-18 rounded-lg" />
            <Skeleton className="h-18 rounded-lg" />
            <Skeleton className="h-18 rounded-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Operator Account Skeleton */}
      <Card className="border-border bg-card rounded-xl border shadow-xs">
        <CardHeader className="p-4 pb-3 sm:p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6">
          <Skeleton className="h-10 w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}
