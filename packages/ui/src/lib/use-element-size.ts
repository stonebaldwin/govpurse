'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Measure an element's width with a ResizeObserver, for responsive SVG charts.
 *
 * SSR-safe by design: it returns `defaultWidth` until the element mounts and is
 * measured on the client, so the server renders a sensible chart and the client
 * upgrades it — matching the "client-side with SSR-safe fallback" brief.
 */
export function useElementWidth<T extends HTMLElement = HTMLDivElement>(
  defaultWidth = 640,
): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(defaultWidth);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setWidth(w);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
