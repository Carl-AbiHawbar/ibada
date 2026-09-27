// Simple line drawings of the pests IBADA helps repel (24×24, currentColor).
import type { ReactNode } from 'react';

function Icon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

type P = { className?: string };

export const Cockroach = ({ className }: P) => (
  <Icon className={className}>
    <ellipse cx="12" cy="13.5" rx="4" ry="6.5" />
    <path d="M12 7v13M10 5.5 7 2M14 5.5 17 2M8.2 10 4.5 8.5M15.8 10l3.7-1.5M8 13.5H4M16 13.5h4M8.3 17l-3.3 2.5M15.7 17l3.3 2.5" />
  </Icon>
);

export const BedBug = ({ className }: P) => (
  <Icon className={className}>
    <path d="M12 6c4 0 6 3.5 6 7.5S15.5 20 12 20s-6-2.5-6-6.5S8 6 12 6Z" />
    <path d="M9.5 6.5 9 4.5h6l-.5 2M7 12h10M7.3 15.5h9.4M6.2 10 3.5 8.5M17.8 10l2.7-1.5M6 14H3M18 14h3M7 18l-2.5 2M17 18l2.5 2" />
  </Icon>
);

export const Spider = ({ className }: P) => (
  <Icon className={className}>
    <circle cx="12" cy="9" r="2.5" />
    <ellipse cx="12" cy="15" rx="3.2" ry="4" />
    <path d="M9.5 8 6 4 3 5M14.5 8 18 4l3 1M9 12 4.5 10 2 12M15 12l4.5-2 2.5 2M9.2 15.5 5 17l-1.5 3M14.8 15.5 19 17l1.5 3M10 18l-2 3M14 18l2 3" />
  </Icon>
);

export const Mosquito = ({ className }: P) => (
  <Icon className={className}>
    <path d="M12 8v9M12 17l-.4 4M10.5 7.5 6 3M13.5 7.5 18 3" />
    <circle cx="12" cy="7" r="1.5" />
    <path d="M12 10c-3-2.5-7-2.5-8.5-.5 1.5 2 5.5 2 8.5.5ZM12 10c3-2.5 7-2.5 8.5-.5-1.5 2-5.5 2-8.5.5Z" />
    <path d="M11 13 6 16l-2 4M13 13l5 3 2 4M11 11.5 5 12M13 11.5l6 .5" />
  </Icon>
);

export const Fly = ({ className }: P) => (
  <Icon className={className}>
    <ellipse cx="12" cy="14.5" rx="3" ry="5" />
    <circle cx="12" cy="7.5" r="2.2" />
    <path d="M10 12C6 9 3 9.5 2.5 12c.5 2.5 4 3 7.5 1.5ZM14 12c4-3 7-2.5 7.5 0-.5 2.5-4 3-7.5 1.5Z" />
    <path d="M9.2 16.5 6 19M14.8 16.5 18 19" />
  </Icon>
);

export const Ant = ({ className }: P) => (
  <Icon className={className}>
    <circle cx="12" cy="5.5" r="2" />
    <ellipse cx="12" cy="10.5" rx="1.8" ry="2.5" />
    <ellipse cx="12" cy="17" rx="3" ry="4" />
    <path d="M11 4 9 1.5M13 4l2-2.5M10.3 10 6 8l-2 1.5M13.7 10 18 8l2 1.5M10.3 11.5 6 13l-1.5 3M13.7 11.5 18 13l1.5 3M10.5 12.5 8 17l-2.5 3M13.5 12.5 16 17l2.5 3" />
  </Icon>
);

export const Flea = ({ className }: P) => (
  <Icon className={className}>
    <path d="M6 13c0-4 3-7 7-7 3.5 0 6 2.5 6 5.5 0 4-3.5 6.5-7.5 6.5C8.5 18 6 16 6 13Z" />
    <path d="M6.5 11 3.5 9.5M8 17l-2 3.5M12 18l-.5 3M15 17.5l3.5 3.5 2-1" />
    <circle cx="8.5" cy="11" r=".6" fill="currentColor" />
  </Icon>
);

export const Termite = ({ className }: P) => (
  <Icon className={className}>
    <circle cx="12" cy="5" r="2.2" />
    <path d="M11 3 9.5 1M13 3l1.5-2" />
    <ellipse cx="12" cy="9.5" rx="1.8" ry="2" />
    <path d="M12 11.5c2.5 0 3.5 2.5 3.5 5S14 22 12 22s-3.5-3-3.5-5.5 1-5 3.5-5Z" />
    <path d="M10.3 9 6.5 7.5M13.7 9l3.8-1.5M10.2 10.5 6 12M13.8 10.5 18 12M9 13.5l-3.5 3M15 13.5l3.5 3" />
  </Icon>
);
