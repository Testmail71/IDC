export default function PublicLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="h-7 w-40 animate-pulse rounded bg-stone-200" />
      <div className="mt-5 h-4 w-full max-w-2xl animate-pulse rounded bg-stone-100" />
      <div className="mt-2 h-4 w-56 animate-pulse rounded bg-stone-100" />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl border border-stone-200 bg-stone-50"
          />
        ))}
      </div>
    </div>
  );
}
