/**
 * Command menu (Ctrl or Command + K): jump to any admin screen or open an entry
 * by player name.
 *
 * Layout adapted from "Command Menu" by properui on 21st.dev (MIT):
 * https://21st.dev/community/components/properui/command-menu
 * Rebuilt on the project's Radix dialog, without the original's extra libraries.
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CornerDownLeft, Search } from 'lucide-react';
import { Photo } from '../../types';
import { cn } from '../../lib/utils';

export interface Command {
  id: string;
  group: string;
  label: string;
  /** Extra words that should find this command. */
  keywords?: string;
  detail?: string;
  icon?: React.ElementType;
  image?: string;
  run: () => void;
}

const MAX_ENTRIES = 8;

const matches = (haystack: string, query: string) => {
  const text = haystack.toLowerCase();
  return query.split(/\s+/).every((word) => text.includes(word));
};

const Key = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded border border-white/15 px-1 py-px font-sans text-xs text-white/70">{children}</kbd>
);

export function CommandMenu({
  open,
  onOpenChange,
  commands,
  photos,
  categoryName,
  onOpenEntry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: Command[];
  photos: Photo[];
  categoryName: (id: string) => string;
  onOpenEntry: (photoId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  useEffect(() => {
    if (open) { setQuery(''); setActive(0); }
  }, [open]);

  const results = useMemo(() => {
    if (!open) return [];
    const q = query.trim().toLowerCase();
    const found = q ? commands.filter((c) => matches(`${c.label} ${c.keywords || ''}`, q)) : commands;
    if (!q) return found;
    const entries: Command[] = photos
      .filter((p) => matches(`${p.player_name} ${p.discord_name} ${p.caption || ''}`, q))
      .slice(0, MAX_ENTRIES)
      .map((p) => ({
        id: `entry-${p.id}`,
        group: 'Entries',
        label: p.player_name,
        detail: categoryName(p.category_id),
        image: p.image_url,
        run: () => onOpenEntry(p.id),
      }));
    return [...found, ...entries];
  }, [open, query, commands, photos, categoryName, onOpenEntry]);

  const current = Math.min(active, Math.max(0, results.length - 1));

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [current, results]);

  const run = (command?: Command) => {
    if (!command) return;
    onOpenChange(false);
    command.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((current + step + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(results[current]);
    }
  };

  const groups: { name: string; items: { command: Command; index: number }[] }[] = [];
  results.forEach((command, index) => {
    const last = groups[groups.length - 1];
    if (last && last.name === command.group) last.items.push({ command, index });
    else groups.push({ name: command.group, items: [{ command, index }] });
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="admin-fade fixed inset-0 z-[225] bg-black/70" />
        <Dialog.Content
          aria-describedby={undefined}
          className="admin-pop fixed left-1/2 top-[10dvh] z-[226] flex max-h-[75dvh] w-[min(36rem,calc(100vw-1.5rem))] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-white/15 bg-[#0c0c10] text-white shadow-[0_24px_64px_rgba(0,0,0,0.7)] outline-none"
        >
          <Dialog.Title className="sr-only">Command menu</Dialog.Title>
          <div className="relative border-b border-white/10">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/45" />
            <input
              role="combobox"
              aria-label="Search screens and entries"
              aria-expanded="true"
              aria-autocomplete="list"
              aria-controls={`${baseId}-list`}
              aria-activedescendant={results[current] ? `${baseId}-${current}` : undefined}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
              onKeyDown={onKeyDown}
              placeholder="Search screens, settings or players"
              className="w-full bg-transparent py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/45 focus:outline-none"
            />
          </div>

          <div ref={listRef} id={`${baseId}-list`} role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto p-2">
            {results.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-white/60">Nothing matches "{query}".</p>
            )}
            {groups.map((group) => (
              <div key={group.name} role="group" aria-label={group.name} className="[&:not(:first-child)]:mt-2">
                <div aria-hidden="true" className="px-3 pb-1 pt-1 text-xs font-medium text-white/45">{group.name}</div>
                {group.items.map(({ command, index }) => {
                  const Icon = command.icon;
                  const selected = index === current;
                  return (
                    <div
                      key={command.id}
                      id={`${baseId}-${index}`}
                      role="option"
                      aria-selected={selected}
                      onMouseMove={() => { if (!selected) setActive(index); }}
                      onClick={() => run(command)}
                      className={cn('flex cursor-pointer items-center gap-3 rounded-md px-3 py-2', selected ? 'bg-white/10' : '')}
                    >
                      {command.image ? (
                        <img src={command.image} alt="" loading="lazy" decoding="async" className="h-7 w-12 shrink-0 rounded bg-white/5 object-cover" />
                      ) : (
                        Icon && <Icon size={16} aria-hidden="true" className={cn('shrink-0', selected ? 'text-fivem-orange' : 'text-white/50')} />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{command.label}</span>
                      {command.detail && <span className="truncate text-xs text-white/50">{command.detail}</span>}
                      <CornerDownLeft size={13} aria-hidden="true" className={cn('shrink-0 text-white/50', !selected && 'invisible')} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 px-4 py-2.5 text-xs text-white/55">
            <span className="flex items-center gap-1.5"><Key>↑↓</Key> move</span>
            <span className="flex items-center gap-1.5"><Key>Enter</Key> open</span>
            <span className="flex items-center gap-1.5"><Key>Esc</Key> close</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
