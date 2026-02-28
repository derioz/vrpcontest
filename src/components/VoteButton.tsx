/**
 * VoteButton – ported & adapted from uitripled NativeLikesCounterBaseUI.
 * Combines:
 *   • Animated rolling number counter (NativeLikesCounter pattern)
 *   • Liquid fill progress bar on the button (NativeLiquidButton pattern)
 *   • Hover popup showing voter names (NativeLikesCounter popup pattern)
 *   • Particle burst on click (custom)
 */
import { AnimatePresence, motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';

interface Voter {
    id: string;
    displayName: string;
    uid: string;
}

interface VoteButtonProps {
    photoId: string;
    voteCount: number;
    hasVoted: boolean;
    votingOpen: boolean;
    categorySharePct: number; // 0–100
    onVote: () => void;
    className?: string;
}

const BURST_PARTICLES_VOTE = ['❤️', '✨', '✨', '⭐'] as const;
const BURST_PARTICLES_UNVOTE = ['💔', '💔', '💔', '💔'] as const;

export function VoteButton({
    photoId,
    voteCount,
    hasVoted,
    votingOpen,
    categorySharePct,
    onVote,
    className,
}: VoteButtonProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isBursting, setIsBursting] = useState(false);
    const [voters, setVoters] = useState<Voter[]>([]);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch voter names when popup opens
    useEffect(() => {
        if (!isHovered) return;
        const q = query(collection(db, 'votes'), where('photoId', '==', photoId));
        const unsub = onSnapshot(q, (snap) => {
            setVoters(
                snap.docs.map((d) => ({
                    id: d.id,
                    displayName: (d.data().voterDiscord as string) || (d.data().voterName as string) || 'Anonymous',
                    uid: d.data().voterUid as string,
                }))
            );
        });
        return () => unsub();
    }, [isHovered, photoId]);

    const handleMouseEnter = useCallback(() => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        setIsHovered(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        hoverTimer.current = setTimeout(() => setIsHovered(false), 180);
    }, []);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!votingOpen) return;
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

    return (
        <div
            className={cn('relative inline-block', className)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* ── Hover popup ── */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        className="absolute bottom-full right-0 mb-2.5 z-[200] w-52 rounded-2xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.7)] p-3"
                    >
                        {/* Header row */}
                        <div className="flex items-center justify-between mb-2 px-0.5">
                            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Voted by</span>
                            <span className="text-[10px] font-mono text-white/30">{voteCount.toLocaleString()} vote{voteCount !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Voter list */}
                        {voters.length > 0 ? (
                            <div className="max-h-36 overflow-y-auto space-y-1 mb-2">
                                {voters.map((v, i) => (
                                    <motion.div
                                        key={v.id}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.025, duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                                        className="flex items-center gap-2 py-0.5"
                                    >
                                        {/* Avatar initial */}
                                        <div className="w-5 h-5 rounded-full bg-fivem-orange/20 border border-fivem-orange/30 flex items-center justify-center shrink-0">
                                            <span className="text-[9px] font-bold text-fivem-orange uppercase leading-none">
                                                {v.displayName.charAt(0)}
                                            </span>
                                        </div>
                                        <span className="text-xs text-white/70 truncate">{v.displayName}</span>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[11px] text-white/25 italic mb-2 px-0.5">No votes yet</p>
                        )}

                        {/* Category share bar */}
                        <div className="border-t border-white/[0.06] pt-2">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Category share</span>
                                <span className="text-[10px] font-bold text-fivem-orange">{clampedPct}%</span>
                            </div>
                            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-fivem-orange rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${clampedPct}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                />
                            </div>
                        </div>

                        {/* Vote status hint */}
                        {votingOpen && (
                            <div className={cn(
                                'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider pt-2 border-t border-white/[0.06] mt-2',
                                hasVoted ? 'text-emerald-400' : 'text-white/30'
                            )}>
                                {hasVoted ? (
                                    <><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>You voted · click to undo</>
                                ) : (
                                    <><Heart size={9} />Click to vote</>
                                )}
                            </div>
                        )}

                        {/* Arrow */}
                        <div className="absolute bottom-[-5px] right-5 w-2.5 h-2.5 bg-[#0a0a0a]/95 border-r border-b border-white/10 rotate-45" />
                    </motion.div>
                )}
            </AnimatePresence>

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

            {/* ── The button ── */}
            <motion.button
                onClick={handleClick}
                disabled={!votingOpen}
                whileTap={votingOpen ? { scale: 0.78 } : {}}
                animate={isBursting ? { scale: [1, 1.28, 0.9, 1.1, 1] } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 480, damping: 16 }}
                className={cn(
                    'relative flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-sm overflow-hidden',
                    !votingOpen
                        ? 'bg-white/10 text-white/40 cursor-not-allowed'
                        : hasVoted
                            ? 'bg-white text-fivem-orange border border-fivem-orange/40 shadow-[0_0_12px_rgba(234,88,12,0.35)] hover:bg-red-50/10 hover:text-red-400 hover:border-red-400/40'
                            : 'bg-fivem-orange text-white shadow-[0_0_15px_rgba(234,88,12,0.5)] hover:shadow-[0_0_28px_rgba(234,88,12,0.8)]'
                )}
            >
                {/* Liquid fill background — shows category share */}
                {votingOpen && (
                    <motion.div
                        className={cn(
                            'absolute inset-0 origin-left opacity-20',
                            hasVoted ? 'bg-red-400' : 'bg-white'
                        )}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: clampedPct / 100 }}
                        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                    />
                )}

                {/* Heart icon with fill animation */}
                <motion.div
                    animate={isBursting && !hasVoted ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="relative z-10"
                >
                    <Heart
                        size={14}
                        className={cn(
                            'transition-all duration-200',
                            hasVoted ? 'fill-fivem-orange text-fivem-orange' : 'fill-none'
                        )}
                    />
                </motion.div>

                {/* Rolling counter */}
                <AnimatePresence mode="popLayout">
                    <motion.span
                        key={voteCount}
                        initial={{ y: hasVoted ? 8 : -8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: hasVoted ? -8 : 8, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="relative z-10 tabular-nums"
                    >
                        {voteCount.toLocaleString()}
                    </motion.span>
                </AnimatePresence>

                {/* Voted checkmark */}
                <AnimatePresence>
                    {hasVoted && (
                        <motion.svg
                            key="check"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            width="11" height="11" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="3"
                            strokeLinecap="round" strokeLinejoin="round"
                            className="relative z-10 text-fivem-orange"
                        >
                            <polyline points="20 6 9 17 4 12" />
                        </motion.svg>
                    )}
                </AnimatePresence>
            </motion.button>
        </div>
    );
}
