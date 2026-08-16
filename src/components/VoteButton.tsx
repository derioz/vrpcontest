/**
 * VoteButton – SeraUI Radio-Button Choice Pattern
 * Features:
 *   • SeraUI tactile radio indicator with animated inner pulse dot
 *   • Smooth rolling vote counter & percentage share bar
 *   • Glassmorphic hover popup showing voter names (SeraUI popup pattern)
 *   • Particle bursts on vote/unvote
 */
import { AnimatePresence, motion } from 'motion/react';
import { Users, Ban, Check } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { collection, limit, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { VotersModal } from './VotersModal';

interface Voter {
    id: string;
    displayName: string;
    uid: string;
}

interface VoteButtonProps {
    photoId: string;
    photoCaption?: string;
    voteCount: number;
    hasVoted: boolean;
    votingOpen: boolean;
    categorySharePct: number; // 0–100
    isDisqualified?: boolean;
    onVote: () => void;
    className?: string;
}

const BURST_PARTICLES_VOTE = ['✨', '⭐', '⚡', '✨'] as const;
const BURST_PARTICLES_UNVOTE = ['▫️', '▫️', '▫️', '▫️'] as const;

export function VoteButton({
    photoId,
    photoCaption,
    voteCount,
    hasVoted,
    votingOpen,
    categorySharePct,
    isDisqualified,
    onVote,
    className,
}: VoteButtonProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isBursting, setIsBursting] = useState(false);
    const [voters, setVoters] = useState<Voter[]>([]);
    const [isVotersModalOpen, setIsVotersModalOpen] = useState(false);
    const [popoverCoords, setPopoverCoords] = useState<{ top: number; right: number; placeAbove: boolean } | null>(null);

    const buttonRef = useRef<HTMLDivElement>(null);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Update floating popover coordinates relative to viewport
    const updateCoords = useCallback(() => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const placeAbove = rect.top >= 220;
        setPopoverCoords({
            top: placeAbove ? rect.top - 8 : rect.bottom + 8,
            right: Math.max(8, window.innerWidth - rect.right),
            placeAbove,
        });
    }, []);

    // Module-level cache for top hover voters
    const voterHoverCache = useRef(new Map<string, { voters: Voter[]; timestamp: number }>()).current;
    const CACHE_TTL_MS = 60000; // 60 seconds

    // Fetch top 5 voter names for quick hover preview
    useEffect(() => {
        if (!isHovered) return;

        updateCoords();

        const photoIdStr = String(photoId).trim();
        const cached = voterHoverCache.get(photoIdStr);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            setVoters(cached.voters);
            const handleScroll = () => updateCoords();
            window.addEventListener('scroll', handleScroll, { passive: true });
            window.addEventListener('resize', handleScroll, { passive: true });
            return () => {
                window.removeEventListener('scroll', handleScroll);
                window.removeEventListener('resize', handleScroll);
            };
        }

        const photoIdNum = !isNaN(Number(photoIdStr)) ? Number(photoIdStr) : null;

        const queries = [
            query(collection(db, 'votes'), where('photoId', '==', photoIdStr), limit(5)),
        ];
        if (photoIdNum !== null) {
            queries.push(query(collection(db, 'votes'), where('photoId', '==', photoIdNum), limit(5)));
        }

        const map = new Map<string, Voter>();
        let isSubscribed = true;

        Promise.all(queries.map(q => getDocs(q))).then((snaps) => {
            if (!isSubscribed) return;
            snaps.forEach(snap => {
                snap.docs.forEach((d) => {
                    if (!map.has(d.id)) {
                        const data = d.data();
                        const rawName = data.voterDiscord || data.voterName || data.displayName || data.name || data.username || data.voter_name;
                        map.set(d.id, {
                            id: d.id,
                            displayName: (typeof rawName === 'string' && rawName.trim()) || 'Anonymous Voter',
                            uid: (data.voterUid as string) || d.id,
                        });
                    }
                });
            });
            const topVoters = Array.from(map.values()).slice(0, 5);
            setVoters(topVoters);
            voterHoverCache.set(photoIdStr, { voters: topVoters, timestamp: Date.now() });
        }).catch(err => console.error("Vote hover fetch error:", err));

        const handleScroll = () => updateCoords();
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll, { passive: true });

        return () => {
            isSubscribed = false;
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isHovered, photoId, updateCoords, voterHoverCache]);

    const handleMouseEnter = useCallback(() => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        updateCoords();
        setIsHovered(true);
    }, [updateCoords]);

    const handleMouseLeave = useCallback(() => {
        hoverTimer.current = setTimeout(() => {
            setIsHovered(false);
        }, 220);
    }, []);

    const handleOpenVotersModal = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsHovered(false);
        setIsVotersModalOpen(true);
    }, []);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!votingOpen || isDisqualified) return;
        setIsBursting(true);
        setTimeout(() => setIsBursting(false), 750);
        onVote();
    };

    const burstParticles = hasVoted ? BURST_PARTICLES_UNVOTE : BURST_PARTICLES_VOTE;
    const particleOffsets = [
        { x: 0, y: -48 },
        { x: -20, y: -38 },
        { x: 20, y: -38 },
        { x: -6, y: -56 },
    ];

    const clampedPct = Math.min(Math.max(categorySharePct, 0), 100);

    const popoverContent = isHovered && popoverCoords ? (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: popoverCoords.placeAbove ? 6 : -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: popoverCoords.placeAbove ? 6 : -6, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'fixed',
                    top: `${popoverCoords.top}px`,
                    right: `${popoverCoords.right}px`,
                    transform: popoverCoords.placeAbove ? 'translateY(-100%)' : 'translateY(0%)',
                    zIndex: 9990,
                }}
                className="w-56 rounded-2xl border border-white/15 bg-[#0a0a0f]/98 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] p-3.5 flex flex-col pointer-events-auto select-none"
            >
                {/* Header row */}
                <div className="flex items-center justify-between mb-2 px-0.5 shrink-0">
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Voted by</span>
                    <button
                        type="button"
                        onClick={handleOpenVotersModal}
                        className="text-[10px] font-mono text-fivem-orange hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-bold"
                    >
                        <Users size={10} />
                        {voteCount.toLocaleString()} {voteCount === 1 ? 'vote' : 'votes'}
                    </button>
                </div>

                {/* Voter list — compact preview */}
                {voters.length > 0 ? (
                    <div className="space-y-1.5 mb-2.5 shrink-0">
                        {voters.map((v, i) => (
                            <motion.div
                                key={v.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.02, duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                                className="flex items-center gap-2 py-0.5"
                            >
                                <div className="w-5 h-5 rounded-full bg-fivem-orange/20 border border-fivem-orange/30 flex items-center justify-center shrink-0">
                                    <span className="text-[9px] font-bold text-fivem-orange uppercase leading-none">
                                        {v.displayName.charAt(0)}
                                    </span>
                                </div>
                                <span className="text-xs text-white/80 truncate font-medium">{v.displayName}</span>
                            </motion.div>
                        ))}

                        {/* View All Voters Button */}
                        <button
                            type="button"
                            onClick={handleOpenVotersModal}
                            className="w-full text-center text-[10px] font-mono text-fivem-orange hover:text-white bg-fivem-orange/15 hover:bg-fivem-orange/30 border border-fivem-orange/30 py-1.5 rounded-xl transition-all mt-1 cursor-pointer font-bold shadow-sm flex items-center justify-center gap-1.5"
                        >
                            <Users size={11} />
                            {voteCount > voters.length
                                ? `+${(voteCount - voters.length).toLocaleString()} more (view all)`
                                : 'View all voters'}
                        </button>
                    </div>
                ) : (
                    <p className="text-[10px] text-white/25 italic mb-2 px-0.5 shrink-0">No votes yet</p>
                )}

                {/* Category share bar */}
                <div className="border-t border-white/[0.06] pt-2 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Category share</span>
                        <span className="text-[9px] font-bold text-fivem-orange">{clampedPct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-fivem-orange to-amber-400 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${clampedPct}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                    </div>
                </div>

                {/* Vote status hint */}
                {votingOpen && (
                    <div className={cn(
                        'flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider pt-2 border-t border-white/[0.06] mt-2 shrink-0',
                        hasVoted ? 'text-emerald-400' : 'text-white/40'
                    )}>
                        {hasVoted ? (
                            <><Check size={10} className="stroke-[3]" /> Selected · click to withdraw</>
                        ) : (
                            <span className="text-fivem-orange">● Click to cast ballot</span>
                        )}
                    </div>
                )}

                {/* Pointer Arrow */}
                {popoverCoords.placeAbove ? (
                    <div className="absolute bottom-[-5px] right-5 w-2.5 h-2.5 bg-[#0a0a0f] border-r border-b border-white/15 rotate-45 pointer-events-none" />
                ) : (
                    <div className="absolute top-[-5px] right-5 w-2.5 h-2.5 bg-[#0a0a0f] border-l border-t border-white/15 rotate-45 pointer-events-none" />
                )}
            </motion.div>
        </AnimatePresence>
    ) : null;

    return (
        <>
            <div
                ref={buttonRef}
                className={cn('relative inline-block', className)}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* ── Burst particles ── */}
                <AnimatePresence>
                    {isBursting &&
                        burstParticles.map((emoji, i) => (
                            <motion.span
                                key={i}
                                initial={{ opacity: 1, y: 0, x: 0, scale: 0.4 }}
                                animate={{ opacity: 0, y: particleOffsets[i].y, x: particleOffsets[i].x, scale: 1.3 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.7, delay: i * 0.04, ease: 'easeOut' }}
                                className="absolute bottom-1 right-2 pointer-events-none text-sm select-none"
                                style={{ zIndex: 300 }}
                            >
                                {emoji}
                            </motion.span>
                        ))}
                </AnimatePresence>

                {/* ── SeraUI Radio-Button Choice Pattern ── */}
                {isDisqualified ? (
                    <button
                        type="button"
                        disabled
                        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-2xl font-bold text-xs bg-red-500/20 text-red-400 border border-red-500/40 cursor-not-allowed uppercase tracking-wider select-none shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                    >
                        <Ban size={13} className="shrink-0 text-red-400" />
                        <span>Disqualified</span>
                    </button>
                ) : (
                    <motion.button
                        type="button"
                        onClick={handleClick}
                        disabled={!votingOpen}
                        whileTap={votingOpen ? { scale: 0.94 } : {}}
                        animate={isBursting ? { scale: [1, 1.15, 0.95, 1.05, 1] } : { scale: 1 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 18 }}
                        className={cn(
                            'group relative flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl font-display text-xs font-black uppercase tracking-wider transition-all duration-300 select-none overflow-hidden cursor-pointer shadow-lg',
                            !votingOpen
                                ? 'bg-black/60 border border-white/10 text-white/40 cursor-not-allowed backdrop-blur-md'
                                : hasVoted
                                    ? 'bg-gradient-to-r from-emerald-500/25 via-emerald-500/20 to-teal-500/25 text-emerald-300 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:border-rose-500/50 hover:text-rose-300 hover:bg-rose-500/20'
                                    : 'bg-[#0e0e14]/90 hover:bg-gradient-to-r hover:from-fivem-orange hover:to-amber-500 text-white border border-white/15 hover:border-fivem-orange/60 hover:shadow-[0_0_25px_rgba(234,88,12,0.45)] backdrop-blur-md'
                        )}
                    >
                        {/* SeraUI Radio Button Circle Indicator */}
                        {votingOpen && (
                            <div
                                className={cn(
                                    'relative w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200',
                                    hasVoted
                                        ? 'border-emerald-400 bg-emerald-500/30 group-hover:border-rose-400 group-hover:bg-rose-500/30'
                                        : 'border-white/40 group-hover:border-white bg-black/40'
                                )}
                            >
                                <AnimatePresence>
                                    {hasVoted && (
                                        <motion.div
                                            key="radio-inner-dot"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                            className="w-2 h-2 rounded-full bg-emerald-400 group-hover:bg-rose-400 shadow-[0_0_8px_currentColor]"
                                        />
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Button Label & Count */}
                        <div className="flex items-center gap-1.5 z-10 leading-none">
                            <span>{votingOpen ? (hasVoted ? 'Voted' : 'Vote') : 'Votes'}</span>
                            <span className="font-mono text-[11px] font-bold opacity-90">
                                {voteCount.toLocaleString()}
                            </span>
                        </div>

                        {/* Subtle Percentage Share Pill */}
                        {votingOpen && clampedPct > 0 && (
                            <span className={cn(
                                "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full z-10 transition-colors",
                                hasVoted
                                    ? "bg-emerald-500/30 text-emerald-200"
                                    : "bg-white/10 group-hover:bg-white/20 text-white/80"
                            )}>
                                {clampedPct}%
                            </span>
                        )}
                    </motion.button>
                )}
            </div>

            {/* ── Hover popover rendered via Portal ── */}
            {popoverContent && createPortal(popoverContent, document.body)}

            {/* ── Full Voters Modal ── */}
            <VotersModal
                photoId={photoId}
                photoCaption={photoCaption}
                voteCount={voteCount}
                isOpen={isVotersModalOpen}
                onClose={() => setIsVotersModalOpen(false)}
            />
        </>
    );
}
