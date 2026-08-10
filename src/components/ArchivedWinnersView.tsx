import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, Camera, User, Calendar, ImageIcon, Heart, Download, Share2, Sparkles, Flame } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { ArchivedWinner } from '../types';
import { MagicCard } from './ui/magic-card';
import { BorderBeam } from './ui/border-beam';
import { NumberTicker } from './ui/number-ticker';
import { SparklesText } from './ui/sparkles-text';
import { Particles } from './ui/particles';
import { toast } from 'sonner';
import { downloadPhoto } from '../lib/download';

interface ArchivedWinnersViewProps {
    onClose: () => void;
}

function sanitizeFilePart(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function ArchivedWinnersView({ onClose }: ArchivedWinnersViewProps) {
    const [winners, setWinners] = useState<ArchivedWinner[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedContest, setSelectedContest] = useState<string | null>(null);

    useEffect(() => {
        const fetchWinners = async () => {
            try {
                const q = query(
                    collection(db, 'archived_winners'),
                    orderBy('archived_at', 'desc')
                );
                const snapshot = await getDocs(q);
                const fetchedWinners = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as ArchivedWinner[];
                setWinners(fetchedWinners);

                if (fetchedWinners.length > 0 && !selectedContest) {
                    setSelectedContest(fetchedWinners[0].contest_name);
                }
            } catch (error) {
                console.error("Error fetching archived winners:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWinners();
    }, []);

    const contests = Array.from(new Set(winners.map(w => w.contest_name)));
    const displayedWinners = winners.filter(w => w.contest_name === selectedContest);

    const handleDownload = async (winner: ArchivedWinner) => {
        const toastId = `download-archive-${winner.id}`;
        toast.loading("Preparing archived photo download...", { id: toastId });

        const contestPart = sanitizeFilePart(winner.contest_name) || "archived-contest";
        const categoryPart = sanitizeFilePart(winner.category_name) || "winner";
        const playerPart = sanitizeFilePart(winner.player_name) || "player";
        const filename = `${contestPart}-${categoryPart}-${playerPart}.jpg`;

        const success = await downloadPhoto(winner.image_url, filename);
        if (success) {
            toast.success("Archived winning photo downloaded!", { id: toastId });
        } else {
            toast.error("Could not download image.", { id: toastId });
        }
    };

    const handleShare = (winner: ArchivedWinner) => {
        const url = `${window.location.origin}/?photo=${winner.id}`;
        navigator.clipboard.writeText(url);
        toast.success("Archived entry link copied to clipboard!");
    };

    return (
        <div className="fixed inset-0 z-[150] bg-[#060608] flex flex-col overflow-hidden text-white pattern-bg">
            {/* Background Ambient Particles (MagicUI) */}
            <Particles
                className="absolute inset-0 z-0 opacity-30 pointer-events-none"
                quantity={45}
                color="#ea580c"
                staticity={50}
                size={0.5}
            />

            {/* Header (ElevenLabs UI Glassmorphic Bar) */}
            <header className="relative z-10 shrink-0 border-b border-white/[0.08] bg-black/60 backdrop-blur-2xl">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all hover:-translate-x-1 cursor-pointer"
                        >
                            <ArrowLeft size={18} />
                        </Button>
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                <Trophy size={18} className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black font-display tracking-wide leading-none text-white">
                                    <SparklesText text="Hall of Fame Archives" sparklesCount={4} colors={{ first: "#f59e0b", second: "#fbbf24" }} />
                                </h1>
                                <p className="text-[11px] text-white/40 font-mono mt-1 uppercase tracking-widest flex items-center gap-2">
                                    <span>Immortalized Contest Champions</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    <span>{contests.length} Archives</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden min-h-0 relative z-10">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-white/30 space-y-4">
                        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                        <p className="font-mono text-xs uppercase tracking-widest">Accessing Vault Archives...</p>
                    </div>
                ) : winners.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-4 p-8 bg-white/5 border border-white/10 rounded-3xl max-w-sm backdrop-blur-xl">
                            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <ImageIcon className="text-amber-400/60" size={32} />
                            </div>
                            <h3 className="text-lg font-bold font-display">No Archives Found</h3>
                            <p className="text-sm text-white/40 leading-relaxed font-sans">
                                No past contests have been archived yet. Once a contest concludes, the ultimate winners will be immortalized here.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        {/* Sidebar: Contest List (ElevenLabs UI navigation track) */}
                        <div className="w-full md:w-64 lg:w-80 shrink-0 border-r border-white/[0.08] bg-black/40 backdrop-blur-md overflow-y-auto custom-scrollbar">
                            <div className="p-4 space-y-2">
                                <div className="px-2 mb-4 flex items-center justify-between">
                                    <h3 className="text-[10px] font-mono font-bold text-amber-400/80 uppercase tracking-[0.2em]">Archived Contests</h3>
                                    <span className="text-[10px] font-mono text-white/30">{contests.length} vault(s)</span>
                                </div>
                                {contests.map((contest) => (
                                    <button
                                        key={contest}
                                        onClick={() => setSelectedContest(contest)}
                                        className={cn(
                                            "w-full text-left px-4 py-3.5 rounded-2xl transition-all duration-300 flex items-center justify-between group cursor-pointer border",
                                            selectedContest === contest
                                                ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 border-amber-500/40 text-white shadow-[0_0_20px_rgba(245,158,11,0.15)] font-bold"
                                                : "hover:bg-white/[0.04] text-white/50 border-transparent hover:border-white/10 hover:text-white"
                                        )}
                                    >
                                        <div className="min-w-0 pr-4">
                                            <p className="font-bold text-sm truncate font-display">{contest}</p>
                                            <p className="text-[10px] font-mono text-white/30 mt-0.5">
                                                {winners.filter(w => w.contest_name === contest).length} Category Champions
                                            </p>
                                        </div>
                                        <Trophy size={14} className={cn("shrink-0 transition-opacity", selectedContest === contest ? "text-amber-400 opacity-100" : "opacity-0 group-hover:opacity-40")} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Main Grid: Winners for Selected Contest */}
                        <div className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar relative bg-[#060608]/80">
                            <div className="max-w-[1400px] mx-auto">
                                <AnimatePresence mode="popLayout">
                                    <motion.div
                                        key={selectedContest}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="space-y-8"
                                    >
                                        {/* Banner Title Header */}
                                        <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
                                            <div>
                                                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-400/70 font-bold block mb-1">
                                                    Archived Vault Record
                                                </span>
                                                <h2 className="text-3xl font-display font-black tracking-tight text-white">
                                                    {selectedContest}
                                                </h2>
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-white/50">
                                                <Flame size={14} className="text-amber-400" />
                                                <span>{displayedWinners.length} Hall of Fame Entries</span>
                                            </div>
                                        </div>

                                        {/* Winners Cards Grid with MagicCard Spotlight & UI Tripled borders */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {displayedWinners.map((winner, idx) => {
                                                const isTopWinner = idx === 0;

                                                return (
                                                    <motion.div
                                                        key={winner.id}
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: idx * 0.08, duration: 0.4 }}
                                                        className="group relative"
                                                    >
                                                        {/* Liquid Conic Fire Hover Accent */}
                                                        <div className="absolute -inset-1 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg pointer-events-none">
                                                            <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(245,158,11,0.6)_360deg)] animate-spin [animation-duration:3.5s]" />
                                                        </div>

                                                        <MagicCard
                                                            active={true}
                                                            borderBeamProps={{ size: 240, duration: 8, colorFrom: "#ea580c", colorTo: "#fb923c", borderWidth: 1.5 }}
                                                            gradientColor="rgba(234, 88, 12, 0.16)"
                                                            className="group relative flex flex-col bg-[#0a0a0d]/90 border border-fivem-orange/30 rounded-3xl overflow-hidden group-hover:border-fivem-orange/70 transition-all duration-300 shadow-xl h-full justify-between p-4"
                                                        >
                                                            {/* Image Container */}
                                                            <div className="relative aspect-[4/3] bg-black/60 rounded-2xl overflow-hidden mb-4 border border-white/5">
                                                                <img
                                                                    src={winner.image_url}
                                                                    alt={winner.caption}
                                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80" />

                                                                {/* Category Badge */}
                                                                <div className="absolute top-3 right-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-amber-500/30 flex items-center gap-1.5 shadow-xl">
                                                                    <Trophy size={11} className="text-amber-400" />
                                                                    <span className="text-[10px] uppercase tracking-wider font-bold text-white/90 truncate max-w-[120px]">
                                                                        {winner.category_name}
                                                                    </span>
                                                                </div>

                                                                {/* Vote Count Badge with NumberTicker */}
                                                                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1 bg-amber-500/90 backdrop-blur-md rounded-full text-black font-bold text-xs shadow-lg font-mono">
                                                                    <Heart size={12} className="fill-black stroke-none" />
                                                                    <NumberTicker value={winner.vote_count} />
                                                                </div>
                                                            </div>

                                                            {/* Info Section */}
                                                            <div className="flex flex-col flex-1 justify-between">
                                                                <p className="text-xs text-white/80 line-clamp-2 italic mb-4 leading-relaxed">
                                                                    "{winner.caption || 'No caption provided'}"
                                                                </p>

                                                                <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-auto">
                                                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                                                        <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                                                                            <span className="text-[10px] font-bold text-amber-400 uppercase">
                                                                                {winner.player_name.charAt(0)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex flex-col min-w-0">
                                                                            <span className="text-xs font-bold text-white truncate">{winner.player_name}</span>
                                                                            <span className="text-[9px] font-mono text-white/40 uppercase truncate">{winner.discord_name}</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        <button
                                                                            onClick={() => handleShare(winner)}
                                                                            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors border border-white/10 cursor-pointer"
                                                                            title="Copy Share Link"
                                                                        >
                                                                            <Share2 size={13} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDownload(winner)}
                                                                            className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black transition-all border border-amber-500/30 font-bold cursor-pointer"
                                                                            title="Download Photo"
                                                                        >
                                                                            <Download size={13} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </MagicCard>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

