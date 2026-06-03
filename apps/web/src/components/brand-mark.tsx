/**
 * Govpurse brand mark — a treasury-green tile with three ascending bars
 * (public spending, charted). Colors reference the design tokens so it tracks
 * the theme. Decorative; the wordmark carries the accessible name.
 */
export function BrandMark({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} role="img" aria-label="Govpurse" focusable="false">
      <rect width="28" height="28" rx="7" fill="var(--color-primary-500)" />
      <rect x="6.5" y="15" width="3.6" height="6.5" rx="1" fill="var(--color-paper)" opacity="0.78" />
      <rect x="12.2" y="11" width="3.6" height="10.5" rx="1" fill="var(--color-paper)" opacity="0.9" />
      <rect x="17.9" y="6.5" width="3.6" height="15" rx="1" fill="var(--color-paper)" />
    </svg>
  );
}
