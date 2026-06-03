function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-surface-subtle animate-pulse rounded-md ${className}`} />;
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12" aria-busy="true" aria-label="Loading jurisdiction">
      <Bar className="h-3 w-24" />
      <Bar className="mt-3 h-10 w-72" />
      <Bar className="mt-3 h-4 w-56" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bar key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Bar className="h-80 w-full lg:col-span-2" />
        <Bar className="h-80 w-full" />
      </div>
    </main>
  );
}
