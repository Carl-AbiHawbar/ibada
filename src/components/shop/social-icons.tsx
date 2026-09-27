// Minimal brand glyphs (lucide no longer ships brand logos).
type P = { className?: string };

export function InstagramIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1Z" />
    </svg>
  );
}

export function TikTokIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16.6 3c.4 2 1.7 3.4 3.9 3.6v3a7 7 0 0 1-3.9-1.2v6.3A5.7 5.7 0 1 1 11 9v3.1a2.6 2.6 0 1 0 2.5 2.6V3h3.1Z" />
    </svg>
  );
}
