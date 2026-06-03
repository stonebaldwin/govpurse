function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-surface-subtle animate-pulse rounded-md ${className}`} />;
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12" aria-busy="true" aria-label="Loading search">
      <Bar className="h-3 w-16" />
      <Bar className="mt-3 h-9 w-56" />
      <Bar className="mt-3 h-4 w-80" />
      <Bar className="mt-6 h-44 w-full" />
      <Bar className="mt-6 h-6 w-40" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Bar key={i} className="h-11 w-full" />
        ))}
      </div>
    </main>
  );
}
