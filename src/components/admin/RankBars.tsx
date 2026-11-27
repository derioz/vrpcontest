/**
 * Ranked horizontal bars: label, bar from zero, value. The leader is orange.
 *
 * Adapted from "Rank Bars" by Evgeny Shilov (vizcn), MIT licence:
 * https://21st.dev/@eugeneshilow/components/rank-bars
 * Changes: admin colours, list semantics, no leader on a full tie, and a
 * CSS-only entrance that respects reduced motion.
 */
import React from 'react';

export interface RankItem {
  id: string;
  label: string;
  value: number;
  /** Quiet second line under the label. */
  sub?: string;
}

export function RankBars({
  items,
  unit,
}: {
  items: RankItem[];
  /** Read by screen readers after each value, for example "votes". */
  unit: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  // With every row level there is no leader to point at.
  const tied = items.length > 1 && items.every((item) => item.value === max);

  return (
    <ol className="py-1.5">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_2.5rem] items-center gap-3 px-4 py-1.5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_3rem]"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-white" title={item.label}>{item.label}</span>
            {item.sub && <span className="block truncate text-xs text-white/55">{item.sub}</span>}
          </span>
          <span aria-hidden="true" className="h-2 overflow-hidden rounded-r bg-white/[0.06]">
            {item.value > 0 && (
              <span
                className={`admin-bar block h-full rounded-r ${item.value === max && !tied ? 'bg-fivem-orange' : 'bg-white/30'}`}
                style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, animationDelay: `${index * 35}ms` }}
              />
            )}
          </span>
          <span className="text-right text-sm font-semibold tabular-nums text-white">
            {item.value}
            <span className="sr-only"> {unit}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
