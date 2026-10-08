import { AdminPageContainer } from "@/components/admin/admin-page-container";
import {
  ListTable,
  ListTableBody,
  ListTableHeader,
} from "@/components/shared/list-table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function AdminHeaderSkeleton({ backLink = false }: { backLink?: boolean }) {
  return (
    <div className="space-y-2">
      {backLink && <Skeleton className="mb-3 h-4 w-24" />}
      <Skeleton className="h-9 w-64 max-w-full sm:h-10" />
      <Skeleton className="h-5 w-96 max-w-full" />
    </div>
  );
}

function AdminRowsSkeleton({ members = false }: { members?: boolean }) {
  return (
    <ListTable label="Loading collection">
      <ListTableHeader gridClassName="md:grid-cols-[1fr_160px_120px] md:gap-4">
        {[0, 1, 2].map((index) => (
          <div key={index} role="columnheader">
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </ListTableHeader>
      <ListTableBody>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            role="row"
            className="bg-card rounded-2xl border p-4 md:grid md:grid-cols-[1fr_160px_120px] md:items-center md:gap-4 md:rounded-none md:border-0"
          >
            <div role="cell" className="flex min-w-0 items-center gap-3">
              <Skeleton
                className={`size-10 shrink-0 ${members ? "rounded-full" : "rounded-xl"}`}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-48 max-w-full" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
            </div>
            <div role="cell" className="mt-3 md:mt-0">
              <Skeleton className="h-4 w-24" />
            </div>
            <div role="cell" className="hidden md:block">
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </ListTableBody>
    </ListTable>
  );
}

function AdminTabsSkeleton({ count }: { count: 2 | 3 }) {
  return (
    <div className="bg-muted/50 flex gap-3 rounded-xl p-3">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-5 min-w-0 flex-1" />
      ))}
    </div>
  );
}

export function AdminCollectionSkeleton({
  variant,
}: {
  variant:
    | "members"
    | "sessions"
    | "segments"
    | "access-requests"
    | "roles"
    | "icons"
    | "overview";
}) {
  const isCardGrid = variant === "overview" || variant === "icons";
  return (
    <AdminPageContainer
      role="status"
      aria-label="Loading administration collection"
    >
      <span className="sr-only">
        Loading administration collection, please wait.
      </span>
      <div
        className={variant === "members" ? "space-y-6" : "space-y-6 pb-24"}
        aria-hidden="true"
      >
        <AdminHeaderSkeleton backLink={variant === "roles"} />
        {isCardGrid ? (
          <div
            className={
              variant === "icons"
                ? "grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6"
                : "grid gap-4 md:grid-cols-2"
            }
          >
            {Array.from({ length: variant === "icons" ? 12 : 6 }).map(
              (_, index) => (
                <Card key={index} className="admin-panel">
                  <CardHeader className="space-y-3">
                    <Skeleton className="size-10 rounded-xl" />
                    <Skeleton className="h-5 w-32 max-w-full" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </CardContent>
                </Card>
              ),
            )}
          </div>
        ) : variant === "members" ? (
          <div className="space-y-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
            <div className="flex items-center gap-2 border-b pb-5">
              <Skeleton className="h-12 min-w-0 flex-1 rounded-md" />
              <Skeleton className="h-12 w-24 shrink-0 rounded-md md:hidden" />
              <div className="hidden shrink-0 items-center gap-2 md:flex">
                <Skeleton className="h-12 w-40 rounded-md" />
                <Skeleton className="h-12 w-28 rounded-md" />
                <Skeleton className="h-12 w-40 rounded-md" />
              </div>
            </div>
            <ListTable label="Loading members">
              <ListTableHeader gridClassName="md:grid-cols-[1.5fr_1fr_120px_110px_80px]">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={index} role="columnheader">
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </ListTableHeader>
              <ListTableBody>
                {[0, 1, 2].map((index) => (
                  <div
                    key={index}
                    role="row"
                    className="bg-card rounded-2xl border p-4 sm:p-5 md:grid md:grid-cols-[1.5fr_1fr_120px_110px_80px] md:items-center md:gap-4 md:rounded-none md:border-0 md:p-3"
                  >
                    <div
                      role="cell"
                      className="flex min-w-0 items-center gap-3"
                    >
                      <Skeleton className="size-10 shrink-0 rounded-full" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-5 w-40 max-w-full" />
                        <Skeleton className="h-3 w-48 max-w-full md:hidden" />
                      </div>
                      <Skeleton className="size-11 shrink-0 rounded-xl md:hidden" />
                    </div>
                    <div role="cell" className="hidden md:block">
                      <Skeleton className="h-4 w-28 max-w-full" />
                    </div>
                    <div role="cell" className="hidden md:block">
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div role="cell" className="hidden md:block">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <div role="cell" className="hidden justify-end md:flex">
                      <Skeleton className="size-11 rounded-xl" />
                    </div>
                  </div>
                ))}
              </ListTableBody>
            </ListTable>
            <div className="border-border/70 flex items-center justify-between gap-2 border-t pt-4">
              <Skeleton className="h-4 w-32 max-w-full" />
              <div className="flex shrink-0 items-center gap-2">
                <Skeleton className="size-11 rounded-xl" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="size-11 rounded-xl" />
              </div>
            </div>
          </div>
        ) : variant === "access-requests" ? (
          <div className="space-y-5">
            <AdminTabsSkeleton count={3} />
            <div className="grid gap-2 lg:grid-cols-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="admin-panel-strong flex min-h-[72px] items-center gap-3 p-3"
                >
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-5 w-48 max-w-full" />
                    <Skeleton className="h-3 w-64 max-w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : variant === "roles" ? (
          <div className="space-y-3 md:space-y-0 md:divide-y md:overflow-hidden md:rounded-xl md:border">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="bg-card flex items-center gap-3 rounded-2xl border p-4 md:grid md:grid-cols-[1fr_140px_44px] md:rounded-none md:border-0 md:p-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-5 w-48 max-w-full" />
                    <Skeleton className="h-3 w-64 max-w-full" />
                  </div>
                </div>
                <Skeleton className="hidden h-5 w-24 rounded-full md:block" />
                <div className="flex min-h-11 w-11 shrink-0 items-center justify-end">
                  <Skeleton className="h-3 w-5" />
                </div>
              </div>
            ))}
          </div>
        ) : variant === "sessions" ? (
          <div className="space-y-6">
            <AdminTabsSkeleton count={2} />
            <div className="space-y-4 py-3">
              <Skeleton className="mx-auto h-5 w-36" />
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, index) => (
                  <Skeleton key={index} className="mx-auto h-3 w-6" />
                ))}
                {Array.from({ length: 35 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex min-h-11 items-center justify-center"
                  >
                    <Skeleton className="h-4 w-5" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-5 w-56 max-w-full" />
              <Skeleton className="h-3 w-24" />
              <div className="grid gap-3 md:grid-cols-2">
                {[0, 1].map((index) => (
                  <Card key={index} className="admin-panel">
                    <CardContent className="flex items-start gap-3">
                      <Skeleton className="size-10 shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-5 w-48 max-w-full" />
                        <Skeleton className="h-3 w-64 max-w-full" />
                        <Skeleton className="h-3 w-32 max-w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 border-b pb-5">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
            <AdminRowsSkeleton />
            <div className="admin-panel p-4">
              <Skeleton className="h-4 w-48 max-w-full" />
            </div>
          </>
        )}
      </div>
    </AdminPageContainer>
  );
}

export function AdminDetailSkeleton({
  variant,
}: {
  variant: "member" | "session" | "segment" | "church" | "church-advanced";
}) {
  const isMember = variant === "member";
  const isChurch = variant === "church" || variant === "church-advanced";
  return (
    <AdminPageContainer
      size={variant === "segment" ? "narrow" : "wide"}
      className={isChurch ? "max-w-6xl" : undefined}
      role="status"
      aria-label="Loading administration details"
    >
      <span className="sr-only">
        Loading administration details, please wait.
      </span>
      <div
        className={isChurch ? "mx-auto max-w-4xl space-y-6" : "space-y-6"}
        aria-hidden="true"
      >
        <AdminHeaderSkeleton backLink={variant !== "church"} />
        {isMember && (
          <div className="space-y-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Skeleton className="size-12 shrink-0 rounded-2xl sm:size-14" />
              <Skeleton className="h-7 w-48 max-w-full sm:w-64" />
            </div>
            <div className="admin-surface grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="min-w-0 space-y-2">
                  <Skeleton className="h-3 w-16 max-w-full" />
                  <Skeleton className="h-4 w-24 max-w-full" />
                </div>
              ))}
            </div>
          </div>
        )}
        {variant === "session" && (
          <div className="admin-surface grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="min-w-0 space-y-2">
                <Skeleton className="h-3 w-16 max-w-full" />
                <Skeleton className="h-5 w-24 max-w-full" />
              </div>
            ))}
          </div>
        )}
        {(variant === "session" || variant === "segment") && (
          <div className="bg-muted/50 flex gap-3 rounded-xl p-3">
            <Skeleton className="h-5 w-32 max-w-full" />
            <Skeleton className="h-5 w-32 max-w-full" />
          </div>
        )}
        {variant === "church" ? (
          <div className="admin-panel flex items-center gap-3 p-4 sm:p-5 md:p-3">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-56 max-w-full" />
              <Skeleton className="h-3 w-32 max-w-full" />
            </div>
            <div className="flex min-h-11 w-11 items-center justify-end">
              <Skeleton className="h-3 w-5" />
            </div>
          </div>
        ) : variant === "church-advanced" ? (
          <div className="space-y-8">
            <section className="space-y-3">
              <Skeleton className="h-5 w-44 max-w-full" />
              <Skeleton className="h-3 w-80 max-w-full" />
              <AdminRowsSkeleton members />
            </section>
            <section className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-72 max-w-full" />
              <div className="admin-surface space-y-2 p-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </section>
          </div>
        ) : (
          <Card className="admin-panel">
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-44 max-w-full" />
              <Skeleton className="h-4 w-60 max-w-full" />
            </CardHeader>
            <CardContent>
              <AdminRowsSkeleton members />
            </CardContent>
          </Card>
        )}
      </div>
    </AdminPageContainer>
  );
}
