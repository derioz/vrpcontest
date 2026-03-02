import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, Camera, User, Calendar, ImageIcon } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { ArchivedWinner } from '../types';

interface ArchivedWinnersViewProps {
    onClose: () => void;
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

    return (
        <div className="fixed inset-0 z-[150] bg-[#060606] flex flex-col overflow-hidden text-white pattern-bg">
            {/* Header */}
            <header className="relative z-10 shrink-0 border-b border-white/[0.08] bg-black/40 backdrop-blur-xl">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all hover:-translate-x-1"
                        >
                            <ArrowLeft size={18} />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-fivem-orange/15 border border-fivem-orange/30 flex items-center justify-center">
                                <Trophy size={18} className="text-fivem-orange drop-shadow-[0_0_8px_rgba(234,88,12,0.8)]" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black font-display tracking-wide leading-none">Hall of Fame</h1>
                                <p className="text-[11px] text-white/40 font-mono mt-1 uppercase tracking-widest">Previous Winners</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden min-h-0 relative z-0">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-white/30 space-y-4">
                        <div className="w-12 h-12 border-4 border-fivem-orange/20 border-t-fivem-orange rounded-full animate-spin" />
                        <p className="font-mono text-xs uppercase tracking-widest">Loading Archives...</p>
                    </div>
                ) : winners.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-4 p-8 bg-white/5 border border-white/10 rounded-3xl max-w-sm">
                            <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center">
                                <ImageIcon className="text-white/20" size={32} />
                            </div>
                            <h3 className="text-lg font-bold font-display">No Archives Found</h3>
                            <p className="text-sm text-white/40 leading-relaxed">
                                No past contests have been archived yet. Once a contest concludes, the ultimate winners will be immortalized here.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        {/* Sidebar: Contest List */}
                        <div className="w-full md:w-64 lg:w-80 shrink-0 border-r border-white/[0.08] bg-black/20 overflow-y-auto custom-scrollbar">
                            <div className="p-4 space-y-2">
                                <h3 className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-[0.2em] mb-4 px-2">Archived Contests</h3>
                                {contests.map((contest, i) => (
                                    <button
                                        key={contest}
                                        onClick={() => setSelectedContest(contest)}
                                        className={cn(
                                            "w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group",
                                            selectedContest === contest
                                                ? "bg-fivem-orange/20 border border-fivem-orange/30 text-white shadow-[0_0_15px_rgba(234,88,12,0.15)]"
                                                : "hover:bg-white/5 text-white/50 border border-transparent hover:text-white"
                                        )}
                                    >
                                        <div className="min-w-0 pr-4">
                                            <p className="font-bold text-sm truncate">{contest}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Main Grid: Winners for Selected Contest */}
                        <div className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar relative">
                            <div className="max-w-[1400px] mx-auto">
                                <AnimatePresence mode="popLayout">
                                    <motion.div
                                        key={selectedContest}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="space-y-10"
                                    >
                                        <div className="flex items-center justify-between pb-6 border-b border-white/[0.05]">
                                            <h2 className="text-3xl font-display font-black tracking-wide">
                                                {selectedContest}
                                            </h2>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {displayedWinners.map((winner, idx) => (
                                                <motion.div
                                                    key={winner.id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: idx * 0.1, duration: 0.4 }}
                                                    className="group relative flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-fivem-orange/30 transition-all hover:shadow-[0_0_30px_rgba(234,88,12,0.1)]"
                                                >
                                                    {/* Image Container */}
                                                    <div className="relative aspect-[4/3] bg-black/50 overflow-hidden">
                                                        <img
                                                            src={winner.image_url}
                                                            alt={winner.caption}
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                        />
                                                        {/* Gradient Overlay */}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                                                        {/* Category Badge */}
                                                        <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-1.5 shadow-xl">
                                                            <Trophy size={11} className="text-fivem-orange" />
                                                            <span className="text-[10px] uppercase tracking-wider font-bold text-white/90 truncate max-w-[120px]">
                                                                {winner.category_name}
                                                            </span>
                                                        </div>

                                                        {/* Vote Count Badge */}
                                                        <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-fivem-orange/90 backdrop-blur-md rounded-full text-black font-bold text-xs shadow-lg shadow-fivem-orange/20">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                                                            {winner.vote_count.toLocaleString()}
                                                        </div>
                                                    </div>

                                                    {/* Info Section */}
                                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                                        <p className="text-sm text-white/80 line-clamp-2 italic mb-4 leading-relaxed">
                                                            "{winner.caption || 'No caption provided'}"
                                                        </p>
                                                        <div className="flex flex-col gap-1 mt-auto">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-5 h-5 rounded-full bg-fivem-orange/20 border border-fivem-orange/30 flex items-center justify-center shrink-0">
                                                                    <span className="text-[9px] font-bold text-fivem-orange uppercase">
                                                                        {winner.player_name.charAt(0)}
                                                                    </span>
                                                                </div>
                                                                <span className="text-sm font-bold text-white truncate">{winner.player_name}</span>
                                                            </div>
                                                            <span className="text-[10px] font-mono text-white/30 uppercase pl-7 truncate">{winner.discord_name}</span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
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
