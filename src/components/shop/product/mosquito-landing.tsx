'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** A mosquito flies in once and lands on `children` when it scrolls into view (decorative). */
export function MosquitoLanding({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fly, setFly] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setFly(true);
          io.disconnect();
        }
      },
      { threshold: 0.8 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span ref={ref} className="relative inline-block">
      {children}
      {fly && (
        <svg
          data-testid="mosquito"
          aria-hidden
          viewBox="0 0 40 40"
          className="mosquito pointer-events-none absolute -top-6 end-1 size-9 text-navy"
        >
          <g className="mosquito-wings" fill="#9ED4F6" fillOpacity="0.75" stroke="#0693E6" strokeWidth="0.8">
            <ellipse cx="16" cy="12" rx="9" ry="4" transform="rotate(-30 16 12)" />
            <ellipse cx="24" cy="12" rx="9" ry="4" transform="rotate(25 24 12)" />
          </g>
          <g fill="currentColor" stroke="currentColor" strokeLinecap="round">
            <ellipse cx="20" cy="20" rx="3" ry="8" transform="rotate(20 20 20)" stroke="none" />
            <circle cx="17" cy="11" r="2.4" stroke="none" />
            <path d="M16 9.5 L10 3" strokeWidth="1" fill="none" />
            <path d="M18 19 L9 24 L6 33 M19 22 L13 29 L12 37 M22 22 L27 29 L29 37 M23 19 L31 24 L34 32" strokeWidth="0.9" fill="none" />
          </g>
        </svg>
      )}
    </span>
  );
}
