/**
 * VoteButton & VotersButton – SeraUI Clean Separated Architecture
 * 
 * • VoteButton: Dedicated SeraUI radio-button choice control for casting/withdrawing votes.
 *   Zero hover popovers or click interference.
 * • VotersButton: Dedicated SeraUI glass pill trigger that opens the VotersModal on click.
 */
import { AnimatePresence, motion } from 'motion/react';
import { Users, Ban } from 'lucide-react';
import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { VotersModal } from './VotersModal';

export interface VoteButtonProps {
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

export interface VotersButtonProps {
    photoId: string;
    photoCaption?: string;
    voteCount: number;
    className?: string;
}

const BURST_PARTICLES_VOTE = ['✨', '⭐', '⚡', '✨'] as const;
const BURST_PARTICLES_UNVOTE = ['▫️', '▫️', '▫️', '▫️'] as const;

/**
 * Dedicated SeraUI Radio Voting Button
 */
export function VoteButton({
    photoId: _photoId,
    photoCaption: _photoCaption,
    voteCount,
    hasVoted,
    votingOpen,
    categorySharePct,
    isDisqualified,
    onVote,
    className,
}: VoteButtonProps) {
    const [isBursting, setIsBursting] = useState(false);

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

    if (isDisqualified) {
        return (
            <button
                type="button"
                disabled
                className={cn(
                    "relative flex items-center gap-1.5 px-3 py-1.5 rounded-2xl font-bold text-xs bg-red-500/20 text-red-400 border border-red-500/40 cursor-not-allowed uppercase tracking-wider select-none shadow-[0_0_12px_rgba(239,68,68,0.25)]",
                    className
                )}
            >
                <Ban size={13} className="shrink-0 text-red-400" />
                <span>Disqualified</span>
            </button>
        );
    }

    return (
        <div className={cn('relative inline-block', className)}>
            {/* Burst particles */}
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

            {/* SeraUI Tactile Radio-Choice Voting Button */}
            <motion.button
                type="button"
                onClick={handleClick}
                disabled={!votingOpen}
                whileTap={votingOpen ? { scale: 0.93 } : {}}
                animate={isBursting ? { scale: [1, 1.15, 0.95, 1.05, 1] } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 450, damping: 18 }}
                className={cn(
                    'group relative z-10 flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl font-display text-xs font-black uppercase tracking-wider transition-all duration-300 select-none overflow-hidden cursor-pointer shadow-lg',
                    !votingOpen
                        ? 'bg-black/60 border border-white/10 text-white/40 cursor-not-allowed backdrop-blur-md'
                        : hasVoted
                            ? 'bg-gradient-to-r from-emerald-500/25 via-emerald-500/20 to-teal-500/25 text-emerald-300 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:border-rose-500/50 hover:text-rose-300 hover:bg-rose-500/20'
                            : 'bg-[#0e0e14]/90 hover:bg-gradient-to-r hover:from-fivem-orange hover:to-amber-500 text-white border border-white/15 hover:border-fivem-orange/60 hover:shadow-[0_0_25px_rgba(234,88,12,0.45)] backdrop-blur-md'
                )}
            >
                {/* Radio Button Circle Indicator */}
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

                {/* Percentage Share Pill */}
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
        </div>
    );
}

/**
 * Dedicated SeraUI Voters Trigger Button / Badge
 * Allows viewers to see the full list of all votes without cluttering the voting button.
 */
export function VotersButton({
    photoId,
    photoCaption,
    voteCount,
    className,
}: VotersButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(true);
    };

    return (
        <>
            <button
                type="button"
                onClick={handleClick}
                title={`View all ${voteCount.toLocaleString()} voters`}
                className={cn(
                    'group relative z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-[#0c0c14]/90 hover:bg-fivem-orange/15 border border-white/15 hover:border-fivem-orange/40 text-white/70 hover:text-white backdrop-blur-md shadow-md text-xs font-mono transition-all duration-200 cursor-pointer active:scale-95 select-none',
                    className
                )}
            >
                <Users
                    size={13}
                    className="text-fivem-orange/80 group-hover:text-fivem-orange transition-colors shrink-0"
                />
                <span className="font-bold text-[11px] leading-none">
                    {voteCount.toLocaleString()}
                </span>
            </button>

            {/* SeraUI Blurred Voters Modal */}
            <VotersModal
                photoId={photoId}
                photoCaption={photoCaption}
                voteCount={voteCount}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    );
}
