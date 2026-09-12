import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export default function AdminChurchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
        <Card className="border-border bg-card rounded-xl border shadow-xs">
          <CardHeader className="p-4 pb-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-6 w-44 sm:w-60" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-4 pt-0 sm:p-6">
            <div className="border-border grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-36" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-5 w-40" />
              </div>
            </div>

            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Skeleton className="h-18 rounded-lg" />
                <Skeleton className="h-18 rounded-lg" />
                <Skeleton className="h-18 rounded-lg" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-border flex flex-col items-start justify-between gap-4 border-t p-4 sm:flex-row sm:items-center sm:p-6">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-11 w-36 rounded-md" />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
