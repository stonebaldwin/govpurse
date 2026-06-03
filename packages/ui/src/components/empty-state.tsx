import type { ComponentType, ReactNode } from 'react';
import { cn } from '../lib/utils';

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-line-strong bg-surface flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      {Icon ? <Icon className="text-faint mb-3 size-6" /> : null}
      <h3 className="text-ink text-sm font-semibold">{title}</h3>
      {description ? <p className="text-muted mt-1 max-w-sm text-sm">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
