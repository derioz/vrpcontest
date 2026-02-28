import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

interface Winner {
    id: string;
    categoryName: string;
    playerName: string;
    discordName: string;
    imageUrl: string;
    caption: string;
    voteCount: number;
}

interface WinnerAnnouncementProps {
    winners: Winner[];
}

export function WinnerAnnouncement({ winners }: WinnerAnnouncementProps) {
    const containerVars = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const itemVars = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 },
    };

    return (
        <section className="relative w-full py-20 overflow-hidden flex flex-col items-center justify-center bg-[#060606] border-b border-white/10">
            {/* Animated Deep Dark Background Orbs */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black z-10 opacity-80" />
                <div className="absolute inset-0 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03]" />

                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1], x: [0, 50, 0], y: [0, -30, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-amber-500/20 rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.25, 0.1], x: [0, -50, 0], y: [0, 30, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-fivem-orange/20 rounded-full blur-[120px]"
                />
            </div>

            <div className="relative z-20 text-center px-4 max-w-7xl mx-auto w-full">
                {/* Title */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="mb-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs font-bold uppercase tracking-widest mb-6">
                        <Trophy size={14} />
                        <span>Hall of Fame</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black font-display tracking-tighter mb-4 text-white drop-shadow-2xl">
                        <span className="bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
                            Contest Winners
                        </span>
                    </h1>
                    <p className="text-white/50 max-w-2xl mx-auto text-lg">
                        The community has spoken. Here are the top voted entries from each category.
                    </p>
                </motion.div>

                {/* Divider line */}
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3 }} className="my-12">
                    <div className="h-[2px] w-32 mx-auto bg-gradient-to-r from-transparent via-amber-500/50 to-transparent rounded-full" />
                </motion.div>

                {/* Winners Grid */}
                <motion.div variants={containerVars} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full justify-center">
                    {winners.map((winner, index) => {
                        const rank = index + 1;
                        return (
                            <motion.div key={winner.id} variants={itemVars} className="relative group w-full max-w-md mx-auto">
                                {/* Liquid Fire Animation Layers (from uitripled) */}
                                <div className="absolute -inset-1 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none">
                                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(245,158,11,1)_360deg)] opacity-40 animate-spin [animation-duration:3s] group-hover:[animation-duration:2s]" />
                                    <div className="absolute inset-0 bg-[conic-gradient(from_90deg,transparent_0_340deg,rgba(234,88,12,1)_360deg)] opacity-60 animate-spin [animation-duration:3.5s] group-hover:[animation-duration:2.5s]" />
                                    <div className="absolute inset-0 bg-[conic-gradient(from_180deg,transparent_0_340deg,rgba(252,211,77,1)_360deg)] opacity-60 animate-spin [animation-duration:4s] group-hover:[animation-duration:3s] reverse" />
                                </div>

                                {/* Card Content */}
                                <div className="relative flex flex-col p-4 rounded-3xl bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 group-hover:border-amber-500/50 shadow-xl transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-[1.02] h-full">

                                    {/* Category Badge */}
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-b from-amber-500 to-amber-700 text-black px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-widest shadow-[0_4px_20px_rgba(245,158,11,0.5)] z-30">
                                        {winner.categoryName}
                                    </div>

                                    {/* Image Container */}
                                    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 border border-white/5">
                                        <img src={winner.imageUrl} alt={winner.caption} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        {/* Overlay gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />

                                        {/* Votes Pill */}
                                        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5">
                                            <span className="text-red-500 animate-pulse">❤️</span>
                                            <span className="text-white font-bold text-sm tracking-wide">{winner.voteCount}</span>
                                        </div>
                                    </div>

                                    {/* Text Content */}
                                    <div className="flex flex-col flex-1 justify-between px-2">
                                        <p className="text-white/80 text-sm line-clamp-2 italic mb-3">"{winner.caption || 'No caption provided'}"</p>
                                        <div className="flex items-center gap-3 mt-auto pt-3 border-t border-white/10">
                                            <div className="w-8 h-8 rounded-full bg-fivem-orange/20 border border-fivem-orange/30 flex flex-shrink-0 items-center justify-center text-fivem-orange font-bold text-xs">
                                                {winner.playerName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-white font-bold text-sm truncate">{winner.playerName}</span>
                                                <span className="text-white/40 font-mono text-[10px] uppercase truncate">{winner.discordName}</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
}
