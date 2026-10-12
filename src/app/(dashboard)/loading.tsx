export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-48 animate-pulse rounded bg-stone-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-stone-200 bg-stone-50"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-stone-200 bg-stone-50" />
    </div>
  );
}
