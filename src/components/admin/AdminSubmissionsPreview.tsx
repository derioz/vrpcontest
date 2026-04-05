import React, { useState, useEffect, useMemo } from 'react';
import { Category, Photo } from '../../types';
import { decryptUrl } from '../../lib/crypto';
import { Eye, EyeOff, X, User, Maximize2, ChevronLeft, ChevronRight, Trash2, Lock, Image as ImageIcon, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface AdminSubmissionsPreviewProps {
  allPhotos: Photo[];
  categories: Category[];
  onDeletePhoto?: (photoId: string, discordName: string) => void;
}

export default function AdminSubmissionsPreview({ allPhotos, categories, onDeletePhoto }: AdminSubmissionsPreviewProps) {
  const [decryptedPhotos, setDecryptedPhotos] = useState<Map<string, string>>(new Map());
  const [decrypting, setDecrypting] = useState(false);
  const [decryptionFailed, setDecryptionFailed] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Try to decrypt all photos using the local private key
  useEffect(() => {
    const localPrivateKey = localStorage.getItem('vrp_private_key');
    if (!localPrivateKey || allPhotos.length === 0) {
      setDecryptionFailed(!localPrivateKey);
      return;
    }

    let cancelled = false;
    setDecrypting(true);
    setDecryptionFailed(false);

    (async () => {
      const newMap = new Map<string, string>();
      let anyDecrypted = false;

      await Promise.all(
        allPhotos.map(async (photo) => {
          if (photo.encrypted_image_url) {
            try {
              const clearUrl = await decryptUrl(photo.encrypted_image_url, localPrivateKey);
              if (!cancelled) {
                newMap.set(photo.id, clearUrl);
                anyDecrypted = true;
              }
            } catch {
              // Use existing image_url as fallback
            }
          }
        })
      );

      if (!cancelled) {
        setDecryptedPhotos(newMap);
        setDecrypting(false);
        if (!anyDecrypted && allPhotos.some(p => p.encrypted_image_url)) {
          setDecryptionFailed(true);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [allPhotos]);

  const filteredPhotos = useMemo(() => {
    if (!selectedCategoryId) return allPhotos;
    return allPhotos.filter(p => p.category_id === selectedCategoryId);
  }, [allPhotos, selectedCategoryId]);

  const sortedPhotos = useMemo(() => {
    return [...filteredPhotos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [filteredPhotos]);

  const getImageUrl = (photo: Photo) => {
    return decryptedPhotos.get(photo.id) || photo.image_url;
  };

  const lightboxPhoto = lightboxIndex !== null ? sortedPhotos[lightboxIndex] : null;

  if (allPhotos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <ImageIcon size={24} className="text-white/20" />
        </div>
        <p className="text-sm font-medium text-white/40">No submissions yet</p>
        <p className="text-xs text-white/25 mt-1">Photos will appear here once users upload them.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with status */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold",
            decryptionFailed
              ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
              : decrypting
                ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
          )}>
            {decryptionFailed ? (
              <><EyeOff size={12} /> Showing Censored</>
            ) : decrypting ? (
              <><div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> Decrypting...</>
            ) : (
              <><Eye size={12} /> Decrypted View</>
            )}
          </div>
          <span className="text-xs text-white/30 font-mono">{sortedPhotos.length} photos</span>
        </div>
      </div>

      {/* Decryption warning */}
      {decryptionFailed && (
        <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
          <Lock size={14} className="text-amber-400 shrink-0" />
          <p className="text-xs text-amber-400/80">
            Private key not found on this device. Showing censored versions. Generate or import keys in Live Controls to enable admin preview.
          </p>
        </div>
      )}

      {/* Category filter pills */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 shrink-0",
              selectedCategoryId === null
                ? "bg-fivem-orange text-white shadow-lg shadow-fivem-orange/20"
                : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white"
            )}
          >
            <Layers size={12} />
            All ({allPhotos.length})
          </button>
          {categories.map(cat => {
            const count = allPhotos.filter(p => p.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 shrink-0",
                  selectedCategoryId === cat.id
                    ? "bg-fivem-orange text-white shadow-lg shadow-fivem-orange/20"
                    : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white"
                )}
              >
                <span>{cat.emoji || '✨'}</span>
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <AnimatePresence mode="popLayout">
          {sortedPhotos.map((photo, index) => (
            <motion.div
              key={photo.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: Math.min(index * 0.03, 0.3) }}
              className="group relative aspect-video rounded-xl overflow-hidden bg-fivem-card border border-white/5 hover:border-fivem-orange/30 transition-all cursor-pointer"
              onClick={() => setLightboxIndex(index)}
            >
              <img
                src={getImageUrl(photo)}
                alt={photo.caption}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Player info on hover */}
              <div className="absolute bottom-0 left-0 right-0 p-2.5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10">
                <div className="flex items-center gap-1.5">
                  <User size={10} className="text-fivem-orange shrink-0" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{photo.player_name}</span>
                </div>
                <p className="text-[9px] text-white/50 truncate mt-0.5">{photo.discord_name}</p>
                {photo.caption && (
                  <p className="text-[10px] text-white/70 line-clamp-1 mt-1">{photo.caption}</p>
                )}
              </div>

              {/* Action buttons on hover */}
              <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(index); }}
                  className="bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-white/10 text-white hover:bg-white/20 transition-colors"
                  title="View fullsize"
                >
                  <Maximize2 size={12} />
                </button>
                {onDeletePhoto && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeletePhoto(photo.id, photo.discord_name); }}
                    className="bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                    title="Delete photo"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              {/* Category badge */}
              {!selectedCategoryId && (
                <div className="absolute top-2 left-2 z-10">
                  <span className="bg-black/60 backdrop-blur-md text-[9px] text-white/70 font-mono px-2 py-1 rounded-md border border-white/10">
                    {categories.find(c => c.id === photo.category_id)?.emoji || '✨'} {categories.find(c => c.id === photo.category_id)?.name || ''}
                  </span>
                </div>
              )}

              {/* Decrypted indicator */}
              {decryptedPhotos.has(photo.id) && (
                <div className="absolute top-2 right-2 z-[5] group-hover:opacity-0 transition-opacity">
                  <div className="bg-emerald-500/20 backdrop-blur-md p-1 rounded-md border border-emerald-500/30">
                    <Eye size={10} className="text-emerald-400" />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Lightbox overlay */}
      <AnimatePresence>
        {lightboxPhoto && lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-xl flex items-center justify-center"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={() => setLightboxIndex(null)}
            >
              <X size={20} />
            </button>

            {/* Navigation */}
            {lightboxIndex > 0 && (
              <button
                className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              >
                <ChevronLeft size={24} />
              </button>
            )}
            {lightboxIndex < sortedPhotos.length - 1 && (
              <button
                className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              >
                <ChevronRight size={24} />
              </button>
            )}

            {/* Image */}
            <motion.div
              key={lightboxPhoto.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={getImageUrl(lightboxPhoto)}
                alt={lightboxPhoto.caption}
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
              />
              {/* Info bar */}
              <div className="mt-4 flex items-center gap-4 text-white/60">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-fivem-orange" />
                  <span className="text-sm font-bold text-white">{lightboxPhoto.player_name}</span>
                </div>
                <span className="text-xs font-mono text-white/30">@{lightboxPhoto.discord_name}</span>
                <span className="text-xs font-mono text-white/30">
                  {categories.find(c => c.id === lightboxPhoto.category_id)?.emoji} {categories.find(c => c.id === lightboxPhoto.category_id)?.name}
                </span>
                <span className="text-xs font-mono text-white/30">{lightboxPhoto.vote_count} votes</span>
                <span className="text-xs font-mono text-white/20">{lightboxIndex + 1} / {sortedPhotos.length}</span>
              </div>
              {lightboxPhoto.caption && (
                <p className="text-sm text-white/50 mt-2 text-center max-w-xl">{lightboxPhoto.caption}</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
