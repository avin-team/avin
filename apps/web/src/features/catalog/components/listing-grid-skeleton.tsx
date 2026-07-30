export const ListingGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: count }, (_, idx) => idx).map((i) => (
      <div
        key={i}
        className="h-72 animate-pulse rounded-2xl border border-border/50 bg-muted/40 p-4"
      />
    ))}
  </div>
);
