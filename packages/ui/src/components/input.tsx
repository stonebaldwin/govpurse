import * as React from 'react';
import { cn } from '../lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'border-line-strong bg-surface text-ink flex h-10 w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors',
        'placeholder:text-faint focus-visible:ring-ring focus-visible:ring-offset-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
});
