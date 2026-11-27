import React, { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Ban, CheckCircle2, ChevronLeft, ChevronRight, Download, Maximize2, MoreHorizontal, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { Category, Photo } from '../../types';
import { decryptUrl } from '../../lib/crypto';
import { db } from '../../lib/firebase';
import { downloadPhoto } from '../../lib/download';
import { cn } from '../../lib/utils';
import { toast } from '../ui/toast';
import { Button, EmptyState, PageHeader, SearchField, Segmented, fieldClass } from './kit';
import { useConfirm } from './confirm';

interface AdminSubmissionsPreviewProps {
  allPhotos: Photo[];
  categories: Category[];
  onDeletePhoto?: (photoId: string, discordName: string, confirmed?: boolean) => void;
  onToggleDisqualifyPhoto?: (photoId: string, disqualify: boolean, reason?: string) => void;
  /** Open this entry as soon as the screen shows. */
  openEntryId?: string | null;
  onEntryOpened?: () => void;
}

type Status = 'all' | 'active' | 'disqualified';
type Sort = 'newest' | 'oldest' | 'votes';

/** Entries drawn at once. More are added on request so large contests stay responsive. */
const PAGE_SIZE = 48;

const uploadedAt = (p: Photo) => new Date(p.created_at).getTime() || 0;

async function saveCopy(photo: Photo, src: string) {
  const name = photo.player_name ? photo.player_name.replace(/[^a-z0-9]/gi, '_') : 'photo';
  const ok = await downloadPhoto(src, `submission-${name}-${photo.id.slice(0, 6)}.jpg`);
  if (ok) toast.success('Downloaded photo!');
  else toast.error('Failed to download photo.');
}

type Action = 'open' | 'disqualify' | 'download' | 'delete';

const menuItem = 'flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-white/10';

const Tile = memo(function Tile({ photo, src, category, canDisqualify, canDelete, onAction }: {
  photo: Photo; src: string; category: string; canDisqualify: boolean; canDelete: boolean;
  onAction: (action: Action, id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const act = (action: Action) => () => onAction(action, photo.id);

  return (
    <li className="group relative" onContextMenu={(e) => { e.preventDefault(); setMenuOpen(true); }}>
      <button
        type="button"
        data-entry
        onClick={act('open')}
        className="block w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fivem-orange"
      >
        <span className={cn('relative block aspect-video overflow-hidden rounded-md border bg-white/5 transition-colors', photo.is_disqualified ? 'border-red-500/70' : 'border-white/10 group-hover:border-white/40')}>
          <img
            src={src}
            alt={photo.caption || `Entry by ${photo.player_name}`}
            loading="lazy"
            decoding="async"
            className={cn('h-full w-full object-cover', photo.is_disqualified && 'opacity-50')}
          />
          {photo.is_disqualified && (
            <span className="absolute left-1.5 top-1.5 rounded bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">Disqualified</span>
          )}
        </span>
        <span className="mt-1.5 flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium text-white">{photo.player_name}</span>
          <span className="shrink-0 text-xs tabular-nums text-white/60">{photo.vote_count || 0} votes</span>
        </span>
        <span className="block truncate text-xs text-white/50">{category}</span>
      </button>

      <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Menu.Trigger
          aria-label={`Actions for ${photo.player_name}`}
          className="absolute right-1.5 top-1.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-black/75 text-white opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-fivem-orange group-hover:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <MoreHorizontal size={16} aria-hidden="true" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content align="end" sideOffset={4} collisionPadding={8} className="admin-pop z-[150] w-44 rounded-lg border border-white/15 bg-[#111116] p-1 text-white shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
            <Menu.Item className={menuItem} onSelect={act('open')}><Maximize2 size={14} aria-hidden="true" /> Open</Menu.Item>
            {canDisqualify && (
              <Menu.Item className={menuItem} onSelect={act('disqualify')}>
                {photo.is_disqualified ? <CheckCircle2 size={14} aria-hidden="true" /> : <Ban size={14} aria-hidden="true" />}
                {photo.is_disqualified ? 'Re-qualify' : 'Disqualify'}
              </Menu.Item>
            )}
            <Menu.Item className={menuItem} onSelect={act('download')}><Download size={14} aria-hidden="true" /> Download</Menu.Item>
            {canDelete && (
              <>
                <Menu.Separator className="my-1 h-px bg-white/10" />
                <Menu.Item className={cn(menuItem, 'text-red-300')} onSelect={act('delete')}><Trash2 size={14} aria-hidden="true" /> Delete</Menu.Item>
              </>
            )}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
    </li>
  );
});

export default function AdminSubmissionsPreview({
  allPhotos,
  categories,
  onDeletePhoto,
  onToggleDisqualifyPhoto,
  openEntryId,
  onEntryOpened,
}: AdminSubmissionsPreviewProps) {
  const confirm = useConfirm();
  const [decryptedPhotos, setDecryptedPhotos] = useState<Map<string, string>>(new Map());
  const [decrypting, setDecrypting] = useState(false);
  const [keyMissing, setKeyMissing] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<Status>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [openId, setOpenId] = useState<string | null>(null);
  const decryptedCacheRef = useRef<Map<string, string>>(new Map());
  const query = useDeferredValue(search.trim().toLowerCase());

  // Try to decrypt only newly uncached photos using the local or remote private key
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let localPrivateKey = localStorage.getItem('vrp_private_key');

      if (!localPrivateKey) {
        try {
          const secretSnap = await getDoc(doc(db, 'secrets', 'keys'));
          if (secretSnap.exists() && secretSnap.data().privateKey) {
            localPrivateKey = secretSnap.data().privateKey;
            localStorage.setItem('vrp_private_key', localPrivateKey as string);
          }
        } catch (error) {
          console.error('Failed to fetch secure keys:', error);
        }
      }

      if (!localPrivateKey || allPhotos.length === 0) {
        if (!cancelled) {
          setKeyMissing(!localPrivateKey);
          setDecrypting(false);
        }
        return;
      }

      const uncached = allPhotos.filter((p) => p.encrypted_image_url && !decryptedCacheRef.current.has(p.id));

      if (uncached.length > 0) {
        setDecrypting(true);
        await Promise.all(
          uncached.map(async (photo) => {
            try {
              const clearUrl = await decryptUrl(photo.encrypted_image_url as string, localPrivateKey as string);
              decryptedCacheRef.current.set(photo.id, clearUrl);
            } catch {
              // Keep the censored image when an entry cannot be decrypted
            }
          }),
        );
      }

      if (!cancelled) {
        setDecryptedPhotos(new Map(decryptedCacheRef.current));
        setKeyMissing(false);
        setDecrypting(false);
      }
    })();

    return () => { cancelled = true; };
  }, [allPhotos]);

  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const counts = useMemo(() => {
    const byCategory = new Map<string, number>();
    let disqualified = 0;
    for (const p of allPhotos) {
      byCategory.set(p.category_id, (byCategory.get(p.category_id) || 0) + 1);
      if (p.is_disqualified) disqualified++;
    }
    return { byCategory, disqualified };
  }, [allPhotos]);

  const visible = useMemo(() => {
    const list = allPhotos.filter((p) => {
      if (categoryId && p.category_id !== categoryId) return false;
      if (status === 'active' && p.is_disqualified) return false;
      if (status === 'disqualified' && !p.is_disqualified) return false;
      if (query && !`${p.player_name} ${p.discord_name} ${p.caption || ''}`.toLowerCase().includes(query)) return false;
      return true;
    });
    return list.sort((a, b) => {
      if (sort === 'votes') return (b.vote_count || 0) - (a.vote_count || 0) || uploadedAt(b) - uploadedAt(a);
      return sort === 'oldest' ? uploadedAt(a) - uploadedAt(b) : uploadedAt(b) - uploadedAt(a);
    });
  }, [allPhotos, categoryId, status, query, sort]);

  useEffect(() => setLimit(PAGE_SIZE), [categoryId, status, query, sort]);

  const srcFor = (photo: Photo) => decryptedPhotos.get(photo.id) || photo.image_url;
  const openIndex = openId ? visible.findIndex((p) => p.id === openId) : -1;
  const openPhoto = openIndex >= 0 ? visible[openIndex] : null;

  // An entry picked in the command menu opens with the filters cleared
  useEffect(() => {
    if (!openEntryId) return;
    setSearch('');
    setCategoryId('');
    setStatus('all');
    setOpenId(openEntryId);
    onEntryOpened?.();
  }, [openEntryId, onEntryOpened]);

  const toggleDisqualified = async (photo: Photo) => {
    if (!onToggleDisqualifyPhoto) return;
    if (photo.is_disqualified) {
      onToggleDisqualifyPhoto(photo.id, false);
      return;
    }
    const answer = await confirm({
      title: `Disqualify ${photo.player_name}'s entry?`,
      body: 'It stays in the gallery, marked as disqualified, and cannot receive votes.',
      confirmLabel: 'Disqualify',
      tone: 'danger',
      reasonLabel: 'Reason (optional, shown with the entry)',
    });
    if (answer) onToggleDisqualifyPhoto(photo.id, true, answer.reason || undefined);
  };

  const remove = async (photo: Photo) => {
    if (!onDeletePhoto) return;
    const ok = await confirm({
      title: `Delete ${photo.player_name}'s entry?`,
      body: 'The photo is removed from the contest. This cannot be undone.',
      confirmLabel: 'Delete entry',
      tone: 'danger',
    });
    if (ok) onDeletePhoto(photo.id, photo.discord_name, true);
  };

  // Tiles are memoised, so they get one callback that reads the latest state
  const actionRef = useRef<(action: Action, id: string) => void>(() => {});
  actionRef.current = (action, id) => {
    const photo = allPhotos.find((p) => p.id === id);
    if (!photo) return;
    if (action === 'open') setOpenId(id);
    else if (action === 'disqualify') toggleDisqualified(photo);
    else if (action === 'download') saveCopy(photo, srcFor(photo));
    else remove(photo);
  };
  const onAction = useCallback((action: Action, id: string) => actionRef.current(action, id), []);

  const decryption = decrypting ? 'Decrypting entries' : keyMissing ? 'No private key, so images show as the public sees them' : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Submissions"
        description={
          allPhotos.length === 0
            ? 'No entries yet.'
            : `${visible.length === allPhotos.length ? allPhotos.length : `${visible.length} of ${allPhotos.length}`} ${allPhotos.length === 1 ? 'entry' : 'entries'}${decryption ? `. ${decryption}.` : ''}`
        }
      />

      {allPhotos.length === 0 ? (
        <div className="rounded-lg border border-white/10">
          <EmptyState title="No submissions yet">Photos appear here as soon as players upload them.</EmptyState>
        </div>
      ) : (
        <>
          <div className="sticky top-14 z-20 -mx-1 flex flex-wrap items-center gap-2 bg-[#07070a] px-1 py-2 lg:top-0">
            <SearchField value={search} onChange={setSearch} placeholder="Search player, Discord or caption" className="min-w-52 flex-1 sm:max-w-xs" />
            <select aria-label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={cn(fieldClass, 'max-w-full cursor-pointer')}>
              <option value="">All categories ({allPhotos.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({counts.byCategory.get(c.id) || 0})</option>
              ))}
            </select>
            <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={cn(fieldClass, 'cursor-pointer')}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="votes">Most votes</option>
            </select>
            <Segmented<Status>
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'All', count: allPhotos.length },
                { value: 'active', label: 'Active', count: allPhotos.length - counts.disqualified },
                { value: 'disqualified', label: 'Disqualified', count: counts.disqualified },
              ]}
            />
          </div>

          {visible.length === 0 ? (
            <div className="rounded-lg border border-white/10">
              <EmptyState title="No entries match">
                <Button size="sm" className="mt-2" onClick={() => { setSearch(''); setCategoryId(''); setStatus('all'); }}>Clear filters</Button>
              </EmptyState>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {visible.slice(0, limit).map((photo) => (
                <Tile
                  key={photo.id}
                  photo={photo}
                  src={srcFor(photo)}
                  category={categoryName.get(photo.category_id) || 'No category'}
                  canDisqualify={!!onToggleDisqualifyPhoto}
                  canDelete={!!onDeletePhoto}
                  onAction={onAction}
                />
              ))}
            </ul>
          )}

          {visible.length > limit && (
            <div className="flex justify-center pt-1">
              <Button onClick={() => setLimit((n) => n + PAGE_SIZE)}>Show {Math.min(PAGE_SIZE, visible.length - limit)} more</Button>
            </div>
          )}
        </>
      )}

      {openPhoto && (
        <Viewer
          photo={openPhoto}
          src={srcFor(openPhoto)}
          category={categoryName.get(openPhoto.category_id) || 'No category'}
          position={`${openIndex + 1} of ${visible.length}`}
          onClose={() => setOpenId(null)}
          onPrevious={openIndex > 0 ? () => setOpenId(visible[openIndex - 1].id) : undefined}
          onNext={openIndex < visible.length - 1 ? () => setOpenId(visible[openIndex + 1].id) : undefined}
          onToggleDisqualified={onToggleDisqualifyPhoto ? () => toggleDisqualified(openPhoto) : undefined}
          onDelete={onDeletePhoto ? () => remove(openPhoto) : undefined}
          strip={visible.slice(Math.max(0, Math.min(openIndex - 4, visible.length - 9)), Math.max(0, Math.min(openIndex - 4, visible.length - 9)) + 9).map((p) => ({
            id: p.id, src: srcFor(p), label: p.player_name, current: p.id === openPhoto.id, disqualified: !!p.is_disqualified,
          }))}
          onJump={setOpenId}
        />
      )}
    </div>
  );
}

/** The photo, with click-to-zoom for checking details such as watermarks. */
function Inspect({ src, alt, zoomed, onToggle }: { src: string; alt: string; zoomed: boolean; onToggle: () => void }) {
  const [origin, setOrigin] = useState('50% 50%');
  const follow = (e: React.PointerEvent<HTMLElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const clamp = (v: number) => Math.min(100, Math.max(0, v));
    setOrigin(`${clamp(((e.clientX - box.left) / box.width) * 100)}% ${clamp(((e.clientY - box.top) / box.height) * 100)}%`);
  };

  return (
    <div
      onPointerMove={zoomed ? follow : undefined}
      className={cn('flex h-full w-full items-center justify-center overflow-hidden', zoomed && 'touch-none')}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        onClick={(e) => { follow(e as unknown as React.PointerEvent<HTMLElement>); onToggle(); }}
        style={{ transformOrigin: origin, transform: zoomed ? 'scale(3)' : undefined }}
        className={cn('max-h-full max-w-full select-none object-contain transition-transform duration-150 motion-reduce:transition-none', zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in')}
      />
    </div>
  );
}

function Viewer({ photo, src, category, position, onClose, onPrevious, onNext, onToggleDisqualified, onDelete, strip, onJump }: {
  photo: Photo; src: string; category: string; position: string;
  onClose: () => void; onPrevious?: () => void; onNext?: () => void; onToggleDisqualified?: () => void; onDelete?: () => void;
  strip: { id: string; src: string; label: string; current: boolean; disqualified: boolean }[];
  onJump: (id: string) => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => setZoomed(false), [photo.id]);
  const facts: [string, React.ReactNode][] = [
    ['Discord', photo.discord_name || 'Unknown'],
    ['Category', category],
    ['Votes', photo.vote_count || 0],
    ['Uploaded', uploadedAt(photo) ? new Date(photo.created_at).toLocaleString() : 'Unknown'],
  ];

  return (
    <Dialog.Root open onOpenChange={(next) => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          // Pressing a notification must not close the viewer
          onInteractOutside={(e) => { if ((e.target as HTMLElement).closest?.('[data-toast-region]')) e.preventDefault(); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') onPrevious?.();
            if (e.key === 'ArrowRight') onNext?.();
            if (e.key.toLowerCase() === 'z' && !e.ctrlKey && !e.metaKey) setZoomed((z) => !z);
          }}
          className="fixed inset-0 z-[220] bg-[#050507] text-white outline-none"
        >
      <Dialog.Title className="sr-only">Entry by {photo.player_name}</Dialog.Title>
      <div className="flex h-full flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6">
            <Inspect src={src} alt={photo.caption || `Entry by ${photo.player_name}`} zoomed={zoomed} onToggle={() => setZoomed((z) => !z)} />
            <Button variant="secondary" aria-label="Previous entry" disabled={!onPrevious} onClick={onPrevious} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/70 px-2">
              <ChevronLeft size={18} aria-hidden="true" />
            </Button>
            <Button variant="secondary" aria-label="Next entry" disabled={!onNext} onClick={onNext} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/70 px-2">
              <ChevronRight size={18} aria-hidden="true" />
            </Button>
            <Button size="sm" aria-pressed={zoomed} onClick={() => setZoomed((z) => !z)} className="absolute right-3 top-3 bg-black/70" title="Zoom (Z)">
              {zoomed ? <ZoomOut size={14} aria-hidden="true" /> : <ZoomIn size={14} aria-hidden="true" />}
              {zoomed ? 'Fit' : 'Zoom'}
            </Button>
          </div>
          {strip.length > 1 && (
            <ul aria-label="Nearby entries" className="hidden shrink-0 justify-center gap-1.5 overflow-x-auto border-t border-white/10 p-2 sm:flex">
              {strip.map((item) => (
                <li key={item.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onJump(item.id)}
                    aria-label={`Show entry by ${item.label}`}
                    aria-current={item.current ? 'true' : undefined}
                    className={cn('block h-12 w-20 cursor-pointer overflow-hidden rounded border-2 transition-opacity focus-visible:outline-2 focus-visible:outline-white', item.current ? 'border-fivem-orange' : 'border-transparent opacity-55 hover:opacity-100')}
                  >
                    <img src={item.src} alt="" loading="lazy" decoding="async" className={cn('h-full w-full object-cover', item.disqualified && 'grayscale')} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="flex max-h-[45dvh] shrink-0 flex-col gap-4 overflow-y-auto border-t border-white/10 bg-[#0c0c10] p-4 lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs tabular-nums text-white/55">{position}</span>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X size={14} aria-hidden="true" /> Close
            </Button>
          </div>
          <div>
            <h2 className="break-words text-lg font-bold font-display">{photo.player_name}</h2>
            {photo.caption && <p className="mt-1 break-words text-sm text-white/70">{photo.caption}</p>}
          </div>
          <dl className="space-y-2 text-sm">
            {facts.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-white/55">{label}</dt>
                <dd className="min-w-0 break-words text-right text-white/90">{value}</dd>
              </div>
            ))}
          </dl>
          {photo.is_disqualified && (
            <p className="rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-200">
              Disqualified: {photo.disqualification_reason || 'no reason given'}
            </p>
          )}
          <div className="grid gap-2 border-t border-white/10 pt-4">
            {onToggleDisqualified && (
              <Button variant={photo.is_disqualified ? 'secondary' : 'danger'} onClick={onToggleDisqualified}>
                {photo.is_disqualified ? <CheckCircle2 size={15} aria-hidden="true" /> : <Ban size={15} aria-hidden="true" />}
                {photo.is_disqualified ? 'Re-qualify' : 'Disqualify'}
              </Button>
            )}
            <Button onClick={() => saveCopy(photo, src)}>
              <Download size={15} aria-hidden="true" /> Download
            </Button>
            {onDelete && (
              <Button variant="ghost" className="text-red-300 hover:text-red-200" onClick={onDelete}>
                <Trash2 size={15} aria-hidden="true" /> Delete entry
              </Button>
            )}
          </div>
        </aside>
      </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
