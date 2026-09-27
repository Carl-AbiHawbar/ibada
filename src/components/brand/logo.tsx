import { cn } from '@/lib/utils';

const NAVY = '#012755';
const BLUE = '#0693E6';

/**
 * The IBADA wordmark: geometric capitals where each A is the brand's roof
 * chevron with a blue dot inside. Drawn from the owner's logo file.
 */
export function Logo({ className, tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  const ink = tone === 'dark' ? NAVY : '#FFFFFF';
  return (
    <svg viewBox="0 0 594 100" role="img" aria-label="IBADA" className={cn('h-6 w-auto', className)}>
      <g fill={ink}>
        <rect x="0" y="0" width="15" height="100" />
        <rect x="77.5" y="0" width="14" height="100" />
        <rect x="356.5" y="0" width="14" height="100" />
        <path d="M203.5 100 L261.5 0 L320 100 H305 L261.5 25.75 L218.5 100 Z" />
        <path d="M477.5 100 L535.5 0 L594 100 H579 L535.5 25.75 L492.5 100 Z" />
      </g>
      <g fill="none" stroke={ink} strokeWidth="14">
        <path d="M84.5 7 H135 A18.5 18.5 0 0 1 135 44 H84.5 M84.5 44 H139 A24.5 24.5 0 0 1 139 93 H84.5" />
        <path d="M363.5 7 H400 A43 43 0 0 1 400 93 H363.5" />
      </g>
      <g fill={BLUE}>
        <circle cx="261.5" cy="77" r="11" />
        <circle cx="535.5" cy="77" r="11" />
      </g>
    </svg>
  );
}

/** The roof-and-dot brand mark on its own. */
export function LogoMark({ className, tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  return (
    <svg viewBox="0 0 100 81" aria-hidden="true" className={cn('h-6 w-auto', className)}>
      <path d="M0 81 L50 0 L100 81 H85.2 L50 20.3 L14.8 81 Z" fill={tone === 'dark' ? NAVY : '#FFFFFF'} />
      <circle cx="50" cy="60.8" r="9" fill={BLUE} />
    </svg>
  );
}

/** SVG markup of the mark, for rasterizing icons (scripts/prepare-assets.ts). */
export const LOGO_MARK_PATHS = {
  roof: 'M0 81 L50 0 L100 81 H85.2 L50 20.3 L14.8 81 Z',
  dot: { cx: 50, cy: 60.8, r: 9 },
  navy: NAVY,
  blue: BLUE,
};
