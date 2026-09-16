import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
