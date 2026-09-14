import { Skeleton } from "@/components/ui/skeleton";
export default function SegmentDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-20 w-72" />
      <Skeleton className="h-52 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
