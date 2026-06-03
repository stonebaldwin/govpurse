import { cn } from '../../lib/utils';
import { chartColor } from './theme';

export interface LegendItem {
  label: string;
  value?: string;
  colorIndex: number;
}

export function Legend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1.5', className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-sm">
          <span
            className="size-2.5 rounded-sm"
            style={{ backgroundColor: chartColor(item.colorIndex) }}
            aria-hidden="true"
          />
          <span className="text-muted">{item.label}</span>
          {item.value ? (
            <span className="text-ink font-mono tabular-nums">{item.value}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
