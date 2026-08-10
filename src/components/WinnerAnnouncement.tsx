import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    Trophy,
    Crown,
    Medal,
    Download,
    Share2,
    Sparkles,
    Flame,
    Heart,
    Check,
    Layers,
    User,
    Eye,
    Star,
    Award
} from "lucide-react";
import { downloadPhoto } from "../lib/download";
import { MagicCard } from "./ui/magic-card";
import { SparklesText } from "./ui/sparkles-text";
import { BorderBeam } from "./ui/border-beam";
import { NumberTicker } from "./ui/number-ticker";
import { Particles } from "./ui/particles";
import { ShimmerButton } from "./ui/shimmer-button";
import { Meteors } from "./ui/meteors";
import { cn } from "../lib/utils";

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
    contestName?: string;
}

// Interactive Confetti cannon particles for celebratory backdrop
const AmbientConfetti = () => {
    const confettiColors = ['#f59e0b', '#ea580c', '#fbbf24', '#ffffff', '#ef4444', '#8b5cf6', '#3b82f6'];

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10 opacity-70">
            {[...Array(40)].map((_, i) => (
                <motion.div
                    key={i}
                    className={cn(
                        "absolute rounded-sm",
                        i % 3 === 0 ? "w-2.5 h-2.5 rounded-full" : i % 2 === 0 ? "w-2 h-3 rotate-45" : "w-1.5 h-1.5"
                    )}
                    style={{
                        backgroundColor: confettiColors[i % confettiColors.length],
                        left: `${(i * 2.5) % 100}%`,
                        top: `-5%`,
                    }}
                    initial={{ y: -50, x: 0, rotate: 0, opacity: 0.9 }}
                    animate={{
                        y: ['0vh', '105vh'],
                        x: [0, (Math.sin(i) * 200)],
                        rotate: [0, 360 * (i % 2 === 0 ? 1 : -1)],
                        opacity: [0.9, 1, 0.2]
                    }}
                    transition={{
                        duration: 5 + (i % 5),
                        repeat: Infinity,
                        delay: (i * 0.3) % 6,
                        ease: "linear"
                    }}
                />
            ))}
        </div>
    );
};

function sanitizeFilePart(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function WinnerAnnouncement({ winners, contestName }: WinnerAnnouncementProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    // List of unique categories from winners
    const categoryOptions = useMemo(() => {
        const cats = Array.from(new Set(winners.map(w => w.categoryName)));
        return ["ALL", ...cats];
    }, [winners]);

    // Sorted winners by vote count (rank 1 = highest votes)
    const sortedWinners = useMemo(() => {
        return [...winners].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
    }, [winners]);

    // Filtered winners based on category tab selection
    const displayedWinners = useMemo(() => {
        if (selectedCategory === "ALL") return sortedWinners;
        return sortedWinners.filter(w => w.categoryName === selectedCategory);
    }, [sortedWinners, selectedCategory]);

    // Top 3 Podium Winners when viewing ALL
    const topPodiumWinners = useMemo(() => {
        if (selectedCategory !== "ALL" || sortedWinners.length < 2) return [];
        return sortedWinners.slice(0, 3);
    }, [selectedCategory, sortedWinners]);

    // Remaining winners after top 3 podium
    const remainingWinners = useMemo(() => {
        if (selectedCategory === "ALL" && sortedWinners.length >= 2) {
            return sortedWinners.slice(3);
        }
        return displayedWinners;
    }, [selectedCategory, sortedWinners, displayedWinners]);

    const handleDownload = async (winner: Winner) => {
        setDownloadingId(winner.id);
        const toastId = `download-${winner.id}`;
        toast.loading("Preparing high-res photo download...", { id: toastId });

        const contestPart = contestName ? sanitizeFilePart(contestName) : "vital-rp-contest";
        const categoryPart = sanitizeFilePart(winner.categoryName) || "winner";
        const playerPart = sanitizeFilePart(winner.playerName) || "player";
        const filename = `${contestPart}-${categoryPart}-${playerPart}.jpg`;

        const success = await downloadPhoto(winner.imageUrl, filename);
        setDownloadingId(null);

        if (success) {
            toast.success("Winning photo downloaded successfully!", { id: toastId });
        } else {
            toast.error("Could not download image. Try again later.", { id: toastId });
        }
    };

    const handleShare = (winner: Winner) => {
        const url = `${window.location.origin}/?photo=${winner.id}`;
        navigator.clipboard.writeText(url);
        toast.success("Winning entry link copied to clipboard!");
    };

    return (
        <section className="relative w-full pt-28 pb-24 overflow-hidden bg-[#060608] border-b border-white/10">
            {/* Ambient Background Particles (MagicUI) */}
            <Particles
                className="absolute inset-0 z-0 opacity-40"
                quantity={60}
                color="#f59e0b"
                staticity={40}
                size={0.6}
            />

            {/* Confetti Particles */}
            <AmbientConfetti />

            {/* ElevenLabs & UI Tripled Multi-layer Glowing Orbs */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-[#060608] z-10 opacity-90" />
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.02]" />

                <motion.div
                    animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.3, 0.15], x: [0, 40, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-10 right-1/4 w-[550px] h-[550px] bg-amber-500/15 rounded-full blur-[140px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0.25, 0.1], x: [0, -40, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute bottom-10 left-1/4 w-[600px] h-[600px] bg-orange-600/15 rounded-full blur-[150px]"
                />
            </div>

            <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 w-full">

                {/* ElevenLabs Header Badge & Title */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    {/* Monospace Metadata Tag Strip */}
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-mono font-bold uppercase tracking-widest mb-6 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                    >
                        <Trophy size={14} className="text-amber-400 animate-pulse" />
                        <span>Vital RP · Official Hall of Fame</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    </motion.div>

                    {/* SparklesText Main Title (MagicUI) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="mb-4"
                    >
                        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-display tracking-tight text-white leading-tight">
                            <SparklesText
                                text={contestName ? `${contestName} Winners` : "Contest Champions"}
                                sparklesCount={10}
                                colors={{ first: "#f59e0b", second: "#fbbf24" }}
                                className="drop-shadow-[0_10px_35px_rgba(245,158,11,0.3)]"
                            />
                        </h1>
                    </motion.div>

                    {/* Description & Stats line */}
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-white/60 text-base sm:text-lg leading-relaxed font-sans max-w-2xl mx-auto"
                    >
                        The community has spoken. Honoring the most remarkable entries and community-voted photographers of Vital RP.
                    </motion.p>

                    {/* Stats pills strip (ElevenLabs UI style) */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-wrap items-center justify-center gap-3 mt-6 text-xs font-mono text-white/50"
                    >
                        <div className="px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 flex items-center gap-2">
                            <span className="text-amber-400 font-bold">🏆 {winners.length}</span>
                            <span>Category Winners</span>
                        </div>
                        <div className="px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 flex items-center gap-2">
                            <span className="text-red-400 font-bold">❤️ {winners.reduce((acc, w) => acc + (w.voteCount || 0), 0)}</span>
                            <span>Community Votes</span>
                        </div>
                        <div className="px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Verified Standings</span>
                        </div>
                    </motion.div>
                </div>

                {/* ElevenLabs Interactive Category Filter Pills */}
                {categoryOptions.length > 2 && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.35 }}
                        className="flex items-center justify-center mb-14 overflow-x-auto no-scrollbar py-2 px-4"
                    >
                        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl">
                            {categoryOptions.map((cat) => {
                                const isActive = selectedCategory === cat;
                                const count = cat === "ALL" ? winners.length : winners.filter(w => w.categoryName === cat).length;

                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={cn(
                                            "relative px-4 py-2 rounded-xl text-xs font-bold font-display transition-all duration-300 flex items-center gap-2 shrink-0 cursor-pointer select-none",
                                            isActive
                                                ? "text-white shadow-lg"
                                                : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                                        )}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="active-winner-cat-pill"
                                                className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 border border-amber-400/40 shadow-[0_4px_20px_rgba(245,158,11,0.4)]"
                                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                        <span className="relative z-10 tracking-wider">
                                            {cat === "ALL" ? "All Champions" : cat}
                                        </span>
                                        <span
                                            className={cn(
                                                "relative z-10 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md transition-colors",
                                                isActive ? "bg-black/40 text-white" : "bg-white/10 text-white/40"
                                            )}
                                        >
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* GRAND PODIUM SHOWCASE (UI Tripled & MagicUI) - Rendered when viewing ALL champions */}
                {selectedCategory === "ALL" && topPodiumWinners.length >= 2 && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="mb-20"
                    >
                        <div className="text-center mb-8">
                            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400/80 font-bold">
                                --- Podium of Champions ---
                            </span>
                        </div>

                        {/* Podium Grid Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-end max-w-6xl mx-auto">

                            {/* 2ND PLACE - SILVER PODIUM (Left) */}
                            {topPodiumWinners[1] && (() => {
                                const winner = topPodiumWinners[1];
                                return (
                                    <div key={winner.id} className="order-2 md:order-1 flex flex-col items-center">
                                        <div className="w-full relative group">
                                            {/* Liquid Silver Conic Border (UI Tripled) */}
                                            <div className="absolute -inset-1 rounded-[2rem] opacity-70 group-hover:opacity-100 transition-opacity duration-500 blur-md pointer-events-none">
                                                <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(203,213,225,1)_360deg)] opacity-60 animate-spin [animation-duration:4s]" />
                                            </div>

                                            <MagicCard
                                                gradientColor="rgba(203, 213, 225, 0.15)"
                                                className="relative p-4 rounded-3xl bg-[#0a0a0d]/90 backdrop-blur-2xl border border-slate-400/30 group-hover:border-slate-300 transition-all duration-300 shadow-xl"
                                            >
                                                {/* Silver Rank Ribbon Badge */}
                                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-slate-400 to-slate-200 text-slate-950 font-black text-[11px] px-4 py-1.5 rounded-full uppercase tracking-wider shadow-[0_4px_16px_rgba(203,213,225,0.4)] z-30 flex items-center gap-1.5">
                                                    <Medal size={14} />
                                                    <span>2ND PLACE · SILVER</span>
                                                </div>

                                                {/* Category Chip */}
                                                <div className="mt-3 mb-2 text-center">
                                                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-300/80 bg-slate-400/10 border border-slate-400/20 px-3 py-1 rounded-full inline-block">
                                                        {winner.categoryName}
                                                    </span>
                                                </div>

                                                {/* Image Container */}
                                                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 border border-slate-400/20 group/img">
                                                    <img
                                                        src={winner.imageUrl}
                                                        alt={winner.caption}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                                                    {/* Votes Pill */}
                                                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 font-mono text-xs text-white">
                                                        <Heart size={12} className="text-red-500 fill-red-500" />
                                                        <span className="font-bold">
                                                            <NumberTicker value={winner.voteCount} />
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Info & Actions */}
                                                <div className="flex flex-col justify-between">
                                                    <p className="text-white/80 text-xs line-clamp-2 italic mb-3 text-center">
                                                        "{winner.caption || 'No caption provided'}"
                                                    </p>

                                                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                                        <div className="flex items-center gap-2 min-w-0 pr-2">
                                                            <div className="w-7 h-7 rounded-full bg-slate-400/20 border border-slate-400/40 flex items-center justify-center text-slate-200 font-bold text-xs shrink-0">
                                                                {winner.playerName.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-white font-bold text-xs truncate">{winner.playerName}</span>
                                                                <span className="text-white/40 font-mono text-[9px] truncate">{winner.discordName}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button
                                                                onClick={() => handleShare(winner)}
                                                                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors border border-white/10"
                                                                title="Share Link"
                                                            >
                                                                <Share2 size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownload(winner)}
                                                                className="p-2 rounded-xl bg-slate-300 text-slate-950 font-bold hover:bg-white transition-all shadow-md"
                                                                title="Download Photo"
                                                            >
                                                                <Download size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </MagicCard>
                                        </div>
                                        {/* Podium Step Pedestal */}
                                        <div className="w-full h-12 bg-gradient-to-b from-slate-400/20 to-slate-400/5 border-x border-t border-slate-400/30 rounded-t-xl mt-2 flex items-center justify-center font-display font-black text-slate-400 text-lg">
                                            2
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* 1ST PLACE - GOLD CHAMPION PODIUM (Center - Elevated) */}
                            {topPodiumWinners[0] && (() => {
                                const winner = topPodiumWinners[0];
                                return (
                                    <div key={winner.id} className="order-1 md:order-2 flex flex-col items-center -mt-6">
                                        <div className="w-full relative group">
                                            {/* UI Tripled Liquid Gold Conic Fire Border */}
                                            <div className="absolute -inset-1.5 rounded-[2.5rem] opacity-90 group-hover:opacity-100 transition-opacity duration-500 blur-lg pointer-events-none">
                                                <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(245,158,11,1)_360deg)] opacity-80 animate-spin [animation-duration:3s]" />
                                                <div className="absolute inset-0 bg-[conic-gradient(from_180deg,transparent_0_300deg,rgba(234,88,12,1)_360deg)] opacity-80 animate-spin [animation-duration:4s] reverse" />
                                            </div>

                                            <MagicCard
                                                active={true}
                                                borderBeamProps={{ size: 300, duration: 8, colorFrom: "#f59e0b", colorTo: "#fbbf24", borderWidth: 2 }}
                                                gradientColor="rgba(245, 158, 11, 0.25)"
                                                className="relative p-5 rounded-[2.2rem] bg-[#0c0a06]/95 backdrop-blur-2xl border border-amber-500/50 group-hover:border-amber-400 transition-all duration-300 shadow-[0_0_50px_rgba(245,158,11,0.25)]"
                                            >
                                                {/* Gold Champion Crown Badge */}
                                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-black text-xs px-5 py-2 rounded-full uppercase tracking-widest shadow-[0_6px_25px_rgba(245,158,11,0.6)] z-30 flex items-center gap-2 border border-yellow-200/50">
                                                    <Crown size={16} className="text-black animate-bounce" />
                                                    <span>1ST PLACE · GRAND CHAMPION</span>
                                                </div>

                                                {/* Category Chip */}
                                                <div className="mt-4 mb-3 text-center">
                                                    <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-300 bg-amber-500/20 border border-amber-500/40 px-4 py-1 rounded-full inline-flex items-center gap-1.5 shadow-md">
                                                        <Sparkles size={12} className="text-amber-400" />
                                                        {winner.categoryName}
                                                    </span>
                                                </div>

                                                {/* Image Container with Lens effect feel */}
                                                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 border border-amber-500/30 group/img shadow-2xl">
                                                    <img
                                                        src={winner.imageUrl}
                                                        alt={winner.caption}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                                                    {/* Champion Tag on Image */}
                                                    <div className="absolute top-3 left-3 bg-amber-500/90 backdrop-blur-md text-black font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md shadow-lg flex items-center gap-1">
                                                        <Flame size={12} />
                                                        <span>TOP VOTED ENTRY</span>
                                                    </div>

                                                    {/* Votes Pill */}
                                                    <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-black/70 backdrop-blur-md border border-amber-500/40 rounded-full px-3.5 py-1.5 font-mono text-sm text-amber-300 shadow-xl">
                                                        <Heart size={14} className="text-red-500 fill-red-500 animate-pulse" />
                                                        <span className="font-bold">
                                                            <NumberTicker value={winner.voteCount} />
                                                        </span>
                                                        <span className="text-[10px] text-white/50">votes</span>
                                                    </div>
                                                </div>

                                                {/* Text & Action CTA */}
                                                <div className="flex flex-col justify-between">
                                                    <p className="text-white/90 text-sm line-clamp-2 italic mb-4 text-center font-medium">
                                                        "{winner.caption || 'No caption provided'}"
                                                    </p>

                                                    <div className="flex items-center justify-between pt-3.5 border-t border-white/10 mb-4">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="w-9 h-9 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 font-black text-sm shrink-0 shadow-md">
                                                                {winner.playerName.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-white font-black text-sm truncate">{winner.playerName}</span>
                                                                <span className="text-amber-400/70 font-mono text-[10px] truncate">{winner.discordName}</span>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => handleShare(winner)}
                                                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors border border-white/10"
                                                            title="Share Link"
                                                        >
                                                            <Share2 size={15} />
                                                        </button>
                                                    </div>

                                                    {/* ShimmerButton CTA for Champion (MagicUI) */}
                                                    <ShimmerButton
                                                        onClick={() => handleDownload(winner)}
                                                        shimmerColor="#fbbf24"
                                                        borderRadius="1rem"
                                                        className="w-full text-xs uppercase tracking-wider font-bold"
                                                    >
                                                        <Download size={15} />
                                                        <span>Download Winning Shot</span>
                                                    </ShimmerButton>
                                                </div>
                                            </MagicCard>
                                        </div>
                                        {/* Podium Step Pedestal */}
                                        <div className="w-full h-20 bg-gradient-to-b from-amber-500/30 via-amber-500/10 to-amber-500/5 border-x border-t border-amber-500/40 rounded-t-2xl mt-2 flex flex-col items-center justify-center font-display font-black text-amber-400 text-2xl shadow-[0_-10px_30px_rgba(245,158,11,0.2)]">
                                            <span>1</span>
                                            <span className="text-[9px] font-mono font-normal uppercase tracking-widest text-amber-400/60">Grand Champion</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* 3RD PLACE - BRONZE PODIUM (Right) */}
                            {topPodiumWinners[2] && (() => {
                                const winner = topPodiumWinners[2];
                                return (
                                    <div key={winner.id} className="order-3 flex flex-col items-center">
                                        <div className="w-full relative group">
                                            {/* Liquid Bronze Conic Border (UI Tripled) */}
                                            <div className="absolute -inset-1 rounded-[2rem] opacity-70 group-hover:opacity-100 transition-opacity duration-500 blur-md pointer-events-none">
                                                <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(217,119,6,1)_360deg)] opacity-60 animate-spin [animation-duration:5s]" />
                                            </div>

                                            <MagicCard
                                                gradientColor="rgba(217, 119, 6, 0.15)"
                                                className="relative p-4 rounded-3xl bg-[#0a0a0d]/90 backdrop-blur-2xl border border-amber-700/40 group-hover:border-amber-600 transition-all duration-300 shadow-xl"
                                            >
                                                {/* Bronze Rank Ribbon Badge */}
                                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-700 to-amber-600 text-amber-100 font-black text-[11px] px-4 py-1.5 rounded-full uppercase tracking-wider shadow-[0_4px_16px_rgba(217,119,6,0.4)] z-30 flex items-center gap-1.5 border border-amber-500/30">
                                                    <Award size={14} />
                                                    <span>3RD PLACE · BRONZE</span>
                                                </div>

                                                {/* Category Chip */}
                                                <div className="mt-3 mb-2 text-center">
                                                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-500 bg-amber-700/10 border border-amber-700/20 px-3 py-1 rounded-full inline-block">
                                                        {winner.categoryName}
                                                    </span>
                                                </div>

                                                {/* Image Container */}
                                                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 border border-amber-700/20 group/img">
                                                    <img
                                                        src={winner.imageUrl}
                                                        alt={winner.caption}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                                                    {/* Votes Pill */}
                                                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 font-mono text-xs text-white">
                                                        <Heart size={12} className="text-red-500 fill-red-500" />
                                                        <span className="font-bold">
                                                            <NumberTicker value={winner.voteCount} />
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Info & Actions */}
                                                <div className="flex flex-col justify-between">
                                                    <p className="text-white/80 text-xs line-clamp-2 italic mb-3 text-center">
                                                        "{winner.caption || 'No caption provided'}"
                                                    </p>

                                                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                                        <div className="flex items-center gap-2 min-w-0 pr-2">
                                                            <div className="w-7 h-7 rounded-full bg-amber-700/20 border border-amber-600/40 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                                                                {winner.playerName.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-white font-bold text-xs truncate">{winner.playerName}</span>
                                                                <span className="text-white/40 font-mono text-[9px] truncate">{winner.discordName}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button
                                                                onClick={() => handleShare(winner)}
                                                                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors border border-white/10"
                                                                title="Share Link"
                                                            >
                                                                <Share2 size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownload(winner)}
                                                                className="p-2 rounded-xl bg-amber-700 text-amber-100 font-bold hover:bg-amber-600 transition-all shadow-md"
                                                                title="Download Photo"
                                                            >
                                                                <Download size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </MagicCard>
                                        </div>
                                        {/* Podium Step Pedestal */}
                                        <div className="w-full h-8 bg-gradient-to-b from-amber-700/20 to-amber-700/5 border-x border-t border-amber-700/30 rounded-t-xl mt-2 flex items-center justify-center font-display font-black text-amber-600 text-base">
                                            3
                                        </div>
                                    </div>
                                );
                            })()}

                        </div>
                    </motion.div>
                )}

                {/* WINNERS GRID (ElevenLabs UI Glassmorphic Cards + MagicUI Spotlights) */}
                <div className="w-full">
                    {remainingWinners.length > 0 && selectedCategory === "ALL" && topPodiumWinners.length >= 2 && (
                        <div className="mb-6 flex items-center gap-3">
                            <span className="text-xs font-mono font-bold uppercase tracking-widest text-white/40">Category Champions</span>
                            <div className="h-px flex-1 bg-white/10" />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        <AnimatePresence mode="popLayout">
                            {remainingWinners.map((winner, idx) => {
                                const rank = idx + (selectedCategory === "ALL" && topPodiumWinners.length >= 2 ? 4 : 1);

                                return (
                                    <motion.div
                                        key={winner.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.4, delay: idx * 0.05 }}
                                        className="relative group w-full"
                                    >
                                        {/* Liquid Conic Fire Hover Accent (UI Tripled) */}
                                        <div className="absolute -inset-1 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none">
                                            <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(245,158,11,0.8)_360deg)] animate-spin [animation-duration:3s]" />
                                        </div>

                                        <MagicCard
                                            gradientColor="rgba(245, 158, 11, 0.16)"
                                            className="relative flex flex-col p-4 rounded-3xl bg-[#0a0a0d]/90 backdrop-blur-xl border border-white/10 group-hover:border-amber-500/50 shadow-xl transition-all duration-300 group-hover:-translate-y-1.5 h-full justify-between"
                                        >
                                            {/* Category Tag Header */}
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono font-bold text-[10px] uppercase tracking-wider truncate">
                                                    {winner.categoryName}
                                                </span>
                                                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                                                    Rank #{rank}
                                                </span>
                                            </div>

                                            {/* Image Preview Container */}
                                            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 border border-white/5 group/img">
                                                <img
                                                    src={winner.imageUrl}
                                                    alt={winner.caption}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

                                                {/* Vote Badge */}
                                                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 font-mono text-xs text-white">
                                                    <Heart size={12} className="text-red-500 fill-red-500" />
                                                    <span className="font-bold">
                                                        <NumberTicker value={winner.voteCount} />
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Card Content & Action Trigger */}
                                            <div className="flex flex-col flex-1 justify-between">
                                                <p className="text-white/80 text-xs leading-relaxed line-clamp-2 italic mb-4">
                                                    "{winner.caption || 'No caption provided'}"
                                                </p>

                                                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                        <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                                                            {winner.playerName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-white font-bold text-xs truncate">{winner.playerName}</span>
                                                            <span className="text-white/40 font-mono text-[9px] truncate">{winner.discordName}</span>
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
                                                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300 transition-all hover:bg-amber-500/20 hover:border-amber-500/50 hover:text-white cursor-pointer"
                                                            title="Download Photo"
                                                        >
                                                            <Download size={13} />
                                                            <span>Download</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </MagicCard>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>

            </div>
        </section>
    );
}

