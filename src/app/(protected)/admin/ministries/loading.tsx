import { Skeleton } from "@/components/ui/skeleton";
export default function MinistriesLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-24 w-80" />
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}
