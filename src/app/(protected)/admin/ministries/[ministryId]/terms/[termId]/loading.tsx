import { Skeleton } from "@/components/ui/skeleton";
export default function TermLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <Skeleton className="h-24 w-96" />
      <Skeleton className="h-12 w-48" />
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}
