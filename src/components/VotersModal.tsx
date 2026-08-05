import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X, Search, Users, Heart, Sparkles, Info } from 'lucide-react';
import { collection, getDocs, query, where, DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Voter {
  id: string;
  displayName: string;
  isGeneric: boolean;
  uid: string;
  rawFieldUsed?: string;
}

interface VotersModalProps {
  photoId: string | null;
  photoCaption?: string;
  voteCount: number;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Robust helper to extract display name from a vote document
 */
function extractVoterDetails(id: string, data: DocumentData): Voter {
  const uid = (data.voterUid as string) || (data.uid as string) || id;

  const possibleNames = [
    data.voterDiscord,
    data.voterName,
    data.displayName,
    data.discordName,
    data.userName,
    data.username,
    data.name,
    data.voter_name,
    data.voter_discord,
  ];

  for (const raw of possibleNames) {
    if (typeof raw === 'string' && raw.trim().length > 0) {
      const trimmed = raw.trim();
      const lower = trimmed.toLowerCase();
      const isGeneric = lower === 'voter' || lower === 'discord user' || lower === 'anonymous';
      return {
        id,
        displayName: trimmed,
        isGeneric,
        uid,
      };
    }
  }

  // Check email prefix
  if (data.voterEmail && typeof data.voterEmail === 'string' && data.voterEmail.includes('@')) {
    return {
      id,
      displayName: data.voterEmail.split('@')[0],
      isGeneric: false,
      uid,
    };
  }

  return {
    id,
    displayName: 'Anonymous Voter',
    isGeneric: true,
    uid,
  };
}

export function VotersModal({
  photoId,
  photoCaption,
  voteCount,
  isOpen,
  onClose,
}: VotersModalProps) {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Close on Escape key and handle scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Reset search on close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Fetch voters in real-time with comprehensive field matching
  useEffect(() => {
    if (!isOpen || !photoId) {
      setVoters([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const photoIdStr = String(photoId).trim();
    const photoIdNum = !isNaN(Number(photoIdStr)) ? Number(photoIdStr) : null;

    // We query multiple possible schema variations to ensure NO votes are missed:
    // 1. photoId == string
    // 2. photoId == number (if numeric)
    // 3. photo_id == string
    const queries = [
      query(collection(db, 'votes'), where('photoId', '==', photoIdStr)),
    ];
    if (photoIdNum !== null) {
      queries.push(query(collection(db, 'votes'), where('photoId', '==', photoIdNum)));
    }
    queries.push(query(collection(db, 'votes'), where('photo_id', '==', photoIdStr)));

    const resultsMap = new Map<string, Voter>();
    let isSubscribed = true;

    Promise.all(queries.map(q => getDocs(q)))
      .then((snaps) => {
        if (!isSubscribed) return;
        snaps.forEach(snap => {
          snap.docs.forEach((doc) => {
            if (!resultsMap.has(doc.id)) {
              resultsMap.set(doc.id, extractVoterDetails(doc.id, doc.data()));
            }
          });
        });
        setVoters(Array.from(resultsMap.values()));
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch voters query:', err);
        if (isSubscribed) setIsLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, photoId]);

  const filteredVoters = voters.filter((v) =>
    v.displayName.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg h-[82vh] max-h-[640px] rounded-3xl border border-white/15 bg-[#0a0a0a]/98 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col z-10 select-none my-auto"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-4 bg-gradient-to-b from-white/[0.04] to-transparent shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-fivem-orange/15 border border-fivem-orange/30 flex items-center justify-center text-fivem-orange shadow-[0_0_20px_rgba(234,88,12,0.2)] shrink-0">
                <Users size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                    Voters List
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-fivem-orange/20 border border-fivem-orange/30 text-fivem-orange text-xs font-mono font-bold shrink-0">
                    {voteCount.toLocaleString()} {voteCount === 1 ? 'Vote' : 'Votes'}
                  </span>
                </div>
                {photoCaption && (
                  <p className="text-xs text-white/50 truncate mt-0.5 font-medium">
                    "{photoCaption}"
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Input Bar */}
          <div className="p-3.5 border-b border-white/5 bg-black/40 shrink-0">
            <div className="relative flex items-center">
              <Search
                size={16}
                className="absolute left-3.5 text-white/40 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search voters by name..."
                className="w-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.1] text-white text-sm rounded-xl pl-10 pr-9 py-2.5 border border-white/10 focus:border-fivem-orange/50 outline-none transition-all placeholder:text-white/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-white/40 hover:text-white p-1 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Voter List Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
            {isLoading ? (
              <div className="h-full py-12 flex flex-col items-center justify-center text-white/40 gap-3">
                <div className="w-6 h-6 border-2 border-fivem-orange border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono uppercase tracking-wider">
                  Loading voters...
                </span>
              </div>
            ) : filteredVoters.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredVoters.map((voter, index) => (
                  <motion.div
                    key={voter.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.3) }}
                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-fivem-orange/30 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fivem-orange/30 to-amber-600/20 border border-fivem-orange/40 flex items-center justify-center text-fivem-orange text-xs font-bold shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      {voter.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-medium text-white/90 truncate group-hover:text-white transition-colors">
                          {voter.displayName}
                        </p>
                        {voter.isGeneric && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-white/50 shrink-0 font-mono" title="User voted with default account name">
                            default
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-white/30 truncate">
                        {voter.isGeneric && voter.uid ? `ID: ${voter.uid.slice(0, 8)}...` : `Voter #${index + 1}`}
                      </p>
                    </div>
                    <Heart
                      size={14}
                      className="text-fivem-orange/30 group-hover:text-fivem-orange transition-colors shrink-0 mr-1 fill-fivem-orange/20"
                    />
                  </motion.div>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="h-full py-12 flex flex-col items-center justify-center text-white/40 text-center px-4">
                <Search size={32} className="mb-2 stroke-[1.5] text-white/20" />
                <p className="text-sm font-medium text-white/70">No voters found</p>
                <p className="text-xs text-white/40 mt-1">
                  No matching voters for "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="h-full py-12 flex flex-col items-center justify-center text-white/40 text-center px-4">
                <Sparkles size={32} className="mb-2 stroke-[1.5] text-white/20" />
                <p className="text-sm font-medium text-white/70">No votes recorded yet</p>
                <p className="text-xs text-white/40 mt-1">
                  Be the first to vote on this submission!
                </p>
              </div>
            )}
          </div>

          {/* Discrepancy Note if voteCount != voters.length */}
          {!isLoading && voters.length < voteCount && (
            <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 flex items-center gap-2 text-[11px] text-amber-300/80 shrink-0">
              <Info size={14} className="shrink-0 text-amber-400" />
              <span>
                Showing all {voters.length} recorded voter profile{voters.length !== 1 ? 's' : ''} (photo counter: {voteCount}).
              </span>
            </div>
          )}

          {/* Footer Summary */}
          <div className="p-3.5 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-white/40 font-mono shrink-0">
            <span>
              Showing {filteredVoters.length} of {voters.length} total voter{voters.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-fivem-orange hover:text-white font-bold transition-colors cursor-pointer px-3 py-1 rounded-xl bg-fivem-orange/15 hover:bg-fivem-orange/30 border border-fivem-orange/30"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
