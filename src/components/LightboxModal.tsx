import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Vote, Calendar, Users, Ban, Download, ChevronLeft, ChevronRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Photo } from '../types';
import { VotersModal } from './VotersModal';
import { downloadPhoto } from '../lib/download';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { ChampionBadge } from './ChampionBadge';

interface LightboxModalProps {
  photo: Photo | null;
  photos?: Photo[];
  privateKey: string | null;
  winCount?: number;
  isCensored?: boolean;
  onClose: () => void;
  onNavigate?: (photo: Photo) => void;
}

export default function LightboxModal({
  photo,
  photos = [],
  privateKey,
  winCount = 0,
  isCensored = false,
  onClose,
  onNavigate,
}: LightboxModalProps) {
  const [isVotersModalOpen, setIsVotersModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Compute current photo index and previous/next photos if gallery photos are provided
  const currentIndex = photo && photos.length > 0 ? photos.findIndex((p) => p.id === photo.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < photos.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && photos[currentIndex - 1] && onNavigate) {
      onNavigate(photos[currentIndex - 1]);
    }
  }, [hasPrev, photos, currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext && photos[currentIndex + 1] && onNavigate) {
      onNavigate(photos[currentIndex + 1]);
    }
  }, [hasNext, photos, currentIndex, onNavigate]);

  // Keyboard navigation shortcuts: Escape, Left, Right
  useEffect(() => {
    if (!photo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photo, onClose, handlePrev, handleNext]);

  const handleDownload = async () => {
    if (!photo) return;
    setIsDownloading(true);
    const playerPart = photo.player_name ? photo.player_name.replace(/[^a-z0-9]/gi, '_') : 'photo';
    const filename = `contest-${playerPart}-${photo.id.slice(0, 6)}.jpg`;
    const success = await downloadPhoto(photo.image_url, filename);
    if (success) {
      toast.success("Photo downloaded successfully!");
    } else {
      toast.error("Failed to download photo.");
    }
    setIsDownloading(false);
  };

  return (
    <AnimatePresence>
      {photo && (
        <>
          {/* Main Lightbox Stage Wrapper */}
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-[#040406]/96 backdrop-blur-2xl p-4 sm:p-6 overflow-hidden select-none">
            
            {/* Ambient Backlight Glow behind the photo */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
              <div className="w-[600px] h-[600px] rounded-full bg-fivem-orange/[0.12] blur-[160px] animate-pulse" style={{ animationDuration: '8s' }} />
              <div className="w-[400px] h-[400px] rounded-full bg-amber-500/[0.08] blur-[120px]" />
            </div>

            {/* Background Backdrop click trigger */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 cursor-zoom-out z-0"
            />

            {/* ── TOP HUD HEADER BAR ── */}
            <div className="relative z-50 w-full max-w-7xl flex items-center justify-between gap-4 py-2 px-2 shrink-0">
              
              {/* Left: Brand / Photo index counter */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
                  <Sparkles size={14} className="text-fivem-orange animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-display">Photo Viewer</span>
                </div>

                {currentIndex >= 0 && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-xs text-white/50">
                    <span className="text-white font-bold">{currentIndex + 1}</span>
                    <span>/</span>
                    <span>{photos.length}</span>
                  </div>
                )}
              </div>

              {/* Center: Keyboard Shortcuts Hint */}
              <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-[10px] text-white/40">
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">ESC</span>
                <span>to close</span>
                <span className="mx-1 text-white/20">•</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">←</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">→</span>
                <span>to navigate</span>
              </div>

              {/* Right: Actions & Close Button */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 active:scale-95 rounded-xl text-white backdrop-blur-xl transition-all border border-white/10 cursor-pointer text-xs font-bold uppercase tracking-wider"
                  title="Download full resolution photo"
                >
                  <Download size={14} className="text-fivem-orange" />
                  <span className="hidden sm:inline">{isDownloading ? 'Downloading...' : 'Download'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2.5 bg-white/5 hover:bg-red-500/20 hover:border-red-500/40 rounded-xl text-white/80 hover:text-red-400 backdrop-blur-xl transition-all hover:scale-105 active:scale-95 border border-white/10 cursor-pointer"
                  title="Close Viewer (ESC)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ── MAIN IMAGE STAGE (CENTER) ── */}
            <div className="relative z-10 flex-1 w-full max-w-7xl min-h-0 flex items-center justify-center my-2 sm:my-4">
              
              {/* Previous Photo Button */}
              {hasPrev && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2 sm:left-4 z-40 p-3.5 rounded-2xl bg-black/40 hover:bg-white/15 text-white/70 hover:text-white backdrop-blur-xl border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all hover:scale-110 active:scale-95 cursor-pointer"
                  title="Previous Photo (←)"
                >
                  <ChevronLeft size={22} />
                </button>
              )}

              {/* Next Photo Button */}
              {hasNext && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2 sm:right-4 z-40 p-3.5 rounded-2xl bg-black/40 hover:bg-white/15 text-white/70 hover:text-white backdrop-blur-xl border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all hover:scale-110 active:scale-95 cursor-pointer"
                  title="Next Photo (→)"
                >
                  <ChevronRight size={22} />
                </button>
              )}

              {/* Image Container with Smooth Scale Transition */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="relative max-w-full max-h-full flex items-center justify-center p-1"
                >
                  {/* Viewfinder Framed Overlay */}
                  <div className="relative group/frame overflow-hidden rounded-2xl border border-white/15 bg-black/60 shadow-[0_20px_80px_rgba(0,0,0,0.9)] max-h-[72vh] flex items-center justify-center">
                    
                    {/* Corner viewfinder brackets */}
                    <div className="absolute inset-3 border border-white/[0.04] rounded-xl pointer-events-none z-20">
                      <div className="w-4 h-4 border-l-2 border-t-2 border-fivem-orange/40 absolute top-0 left-0" />
                      <div className="w-4 h-4 border-r-2 border-t-2 border-fivem-orange/40 absolute top-0 right-0" />
                      <div className="w-4 h-4 border-l-2 border-b-2 border-fivem-orange/40 absolute bottom-0 left-0" />
                      <div className="w-4 h-4 border-r-2 border-b-2 border-fivem-orange/40 absolute bottom-0 right-0" />
                    </div>

                    <img
                      src={photo.image_url}
                      alt={photo.caption || "Contest entry photo"}
                      className={cn(
                        "max-w-full max-h-[72vh] object-contain transition-transform duration-500",
                        photo.is_disqualified ? "grayscale-[50%] opacity-80" : ""
                      )}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── BOTTOM CONTROL DECK / GLASS HUD ── */}
            <div className="relative z-50 w-full max-w-4xl shrink-0">
              <div className="rounded-2xl border border-white/15 bg-[#0a0a0d]/90 backdrop-blur-2xl p-4 sm:p-5 shadow-[0_16px_50px_rgba(0,0,0,0.9)] flex flex-col gap-3">
                
                {/* Disqualification Banner if applicable */}
                {photo.is_disqualified && (
                  <div className="flex items-center gap-2 bg-red-500/20 backdrop-blur-xl px-4 py-2 rounded-xl border border-red-500/40 text-red-400 text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                    <Ban size={16} className="shrink-0" />
                    <span>DISQUALIFIED</span>
                    {photo.disqualification_reason && (
                      <span className="normal-case font-normal text-white/80 font-mono truncate">
                        — {photo.disqualification_reason}
                      </span>
                    )}
                  </div>
                )}

                {/* Pixelated Preview Notice if applicable */}
                {isCensored && !photo.is_disqualified && (
                  <div className="flex items-center gap-2 bg-amber-500/20 backdrop-blur-xl px-4 py-2 rounded-xl border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                    <EyeOff size={16} className="shrink-0" />
                    <span>Pixelated Preview — Full resolution revealed when voting begins</span>
                  </div>
                )}

                {/* Top Row: Photographer Profile & Vote Inspector Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                  
                  {/* Left: Uploader Profile Pill */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-fivem-orange/15 border border-fivem-orange/30 flex items-center justify-center text-fivem-orange font-bold text-sm shadow-inner">
                      {photo.player_name?.[0]?.toUpperCase() || <User size={18} />}
                    </div>
                    <div className="flex flex-col leading-none gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white font-display">
                          {privateKey ? photo.player_name : "Anonymous Entry"}
                        </span>
                        {winCount > 0 && (
                          <ChampionBadge winCount={winCount} size="sm" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-white/30" />
                          {new Date(photo.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Interactive Vote Button & Inspector */}
                  <button
                    type="button"
                    onClick={() => setIsVotersModalOpen(true)}
                    className="group flex items-center gap-2.5 bg-gradient-to-r from-fivem-orange/20 to-orange-500/10 hover:from-fivem-orange/30 hover:to-orange-500/20 px-4 py-2 rounded-xl border border-fivem-orange/40 text-fivem-orange hover:text-white transition-all cursor-pointer shadow-[0_4px_16px_rgba(234,88,12,0.15)] active:scale-95"
                    title="Inspect voter list"
                  >
                    <Vote size={16} className="text-fivem-orange group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-wider font-display">
                      {photo.vote_count || 0} Votes
                    </span>
                    <div className="flex items-center gap-1 pl-2 border-l border-fivem-orange/30 text-[10px] font-mono text-white/60 group-hover:text-white">
                      <Users size={12} />
                      <span>Voters</span>
                    </div>
                  </button>

                </div>

                {/* Bottom Row: Caption & Metadata */}
                <div className="flex items-center justify-between gap-4">
                  <p className="text-white/90 text-sm font-medium leading-relaxed italic">
                    "{photo.caption || "No caption provided"}"
                  </p>
                  
                  <div className="shrink-0 hidden sm:flex items-center gap-2 text-[10px] font-mono text-white/30 uppercase tracking-widest">
                    <span>ID: {photo.id.slice(0, 8)}</span>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Voters List Inspector Modal */}
          <VotersModal
            photoId={photo.id}
            photoCaption={photo.caption}
            voteCount={photo.vote_count || 0}
            isOpen={isVotersModalOpen}
            onClose={() => setIsVotersModalOpen(false)}
          />
        </>
      )}
    </AnimatePresence>
  );
}
