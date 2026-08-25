import { Skeleton } from "@avin/ui/components/skeleton";

export const ProviderApplicationFormSkeleton = () => (
  <div
    aria-busy="true"
    aria-live="polite"
    className="w-full space-y-6"
    data-testid="provider-application-form-skeleton"
  >
    <header className="flex w-full flex-wrap items-start justify-between gap-2 text-left">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-8 w-56 rounded-lg sm:h-9 sm:w-64" />
        <Skeleton className="h-4 w-72 max-w-full rounded-md sm:w-96" />
      </div>
    </header>

    <div className="grid grid-cols-2 gap-2 rounded-2xl border bg-muted/30 p-1.5">
      <div className="flex h-9 items-center justify-center rounded-xl bg-card shadow-xs">
        <Skeleton className="h-4 w-36 rounded-md" />
      </div>
      <div className="flex h-9 items-center justify-center rounded-xl">
        <Skeleton className="h-4 w-40 rounded-md" />
      </div>
    </div>

    <section className="space-y-5 rounded-3xl border bg-card p-6">
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-60 rounded-md" />
        <Skeleton className="h-3.5 w-80 max-w-full rounded-md" />
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-linear-to-br from-primary/7 via-card to-card p-4 shadow-xs sm:p-5">
        <div className="relative grid gap-5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center">
          <div className="flex flex-col items-center gap-2.5 sm:self-start">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="size-24 rounded-full" />
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-3.5 w-64 max-w-full rounded-md" />
            </div>
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-9 w-full rounded-3xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-9 w-full rounded-3xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-44 rounded-md" />
          <Skeleton className="h-9 w-full rounded-3xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded-md" />
          <Skeleton className="h-9 w-full rounded-3xl" />
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border bg-muted/20 p-4 sm:p-5">
        <div className="space-y-1">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-3 w-72 max-w-full rounded-md" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="size-7 rounded-lg" />
            </div>
            <Skeleton className="h-9 w-full rounded-3xl" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="size-7 rounded-lg" />
            </div>
            <Skeleton className="h-9 w-full rounded-3xl" />
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-3.5 w-24 rounded-md" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-9 w-full rounded-3xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-9 w-full rounded-3xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-9 w-full rounded-3xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-9 w-full rounded-3xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-9 w-full rounded-3xl" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>

      <div className="flex justify-end">
        <Skeleton className="h-9 w-24 rounded-4xl" />
      </div>
    </section>
  </div>
);
