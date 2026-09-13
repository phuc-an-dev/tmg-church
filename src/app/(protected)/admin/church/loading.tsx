import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export default function AdminChurchLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 sm:w-64" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-11 w-28 rounded-md" />
        </div>

        {/* Main Card Skeleton matching final card geometry */}
        <Card className="admin-panel-strong">
          <CardHeader className="p-4 pb-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-6 w-32 sm:w-60" />
                  <Skeleton className="h-3 w-24 sm:w-32" />
                </div>
              </div>
              <Skeleton className="h-11 w-20 rounded-lg" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-4 pt-0 sm:p-6">
            <div className="admin-surface grid grid-cols-2 overflow-hidden">
              <div className="border-border/70 space-y-1.5 border-r p-3 sm:p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-28 sm:w-36" />
              </div>
              <div className="space-y-1.5 p-3 sm:p-4">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-5 w-28 sm:w-40" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>

            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <div className="admin-surface grid grid-cols-1 overflow-hidden sm:grid-cols-3">
                <Skeleton className="h-18 rounded-none" />
                <Skeleton className="h-18 rounded-none" />
                <Skeleton className="h-18 rounded-none" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-border border-t p-4 sm:p-6">
            <Skeleton className="h-4 w-64" />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
