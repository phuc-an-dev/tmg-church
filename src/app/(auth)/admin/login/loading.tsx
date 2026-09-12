export default function LoginLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-3">
          <div className="bg-muted size-12 animate-pulse rounded-xl motion-reduce:animate-none" />
          <div className="bg-muted h-7 w-48 animate-pulse rounded-md motion-reduce:animate-none" />
          <div className="bg-muted h-4 w-64 animate-pulse rounded-md motion-reduce:animate-none" />
        </div>

        <div className="border-border bg-card space-y-6 rounded-xl border p-6 shadow-xs sm:p-8">
          <div className="space-y-2">
            <div className="bg-muted h-4 w-24 animate-pulse rounded motion-reduce:animate-none" />
            <div className="bg-muted h-10 w-full animate-pulse rounded-md motion-reduce:animate-none" />
          </div>
          <div className="bg-muted h-11 w-full animate-pulse rounded-md motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
