export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="bg-muted h-8 w-48 animate-pulse rounded-md motion-reduce:animate-none sm:w-64" />
          <div className="bg-muted h-4 w-full max-w-xs animate-pulse rounded-md motion-reduce:animate-none sm:max-w-sm" />
        </div>

        <div className="border-border bg-card rounded-xl border p-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="bg-muted size-10 shrink-0 animate-pulse rounded-lg motion-reduce:animate-none" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="bg-muted h-5 w-36 animate-pulse rounded motion-reduce:animate-none sm:w-48" />
              <div className="bg-muted h-4 w-full max-w-[200px] animate-pulse rounded motion-reduce:animate-none sm:max-w-xs" />
              <div className="bg-muted h-3 w-28 animate-pulse rounded motion-reduce:animate-none sm:w-40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
