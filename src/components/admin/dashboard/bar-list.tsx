/** Horizontal single-hue bars with the value at the tip (label and value in text ink, never the bar colour). */
export function BarList({ items, empty }: { items: { label: string; value: number; display: string; note?: string }[]; empty: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-ink">{i.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-navy">
              {i.display}
              {i.note && <span className="ms-1.5 text-xs font-normal text-slate-500">{i.note}</span>}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue" style={{ width: `${Math.max(2, (i.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
