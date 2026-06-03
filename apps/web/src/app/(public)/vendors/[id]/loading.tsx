function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-surface-subtle animate-pulse rounded-md ${className}`} />;
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12" aria-busy="true" aria-label="Loading vendor">
      <Bar className="h-9 w-80" />
      <Bar className="mt-3 h-4 w-48" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bar key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Bar className="h-72 w-full" />
        <Bar className="h-72 w-full" />
      </div>
    </main>
  );
}
