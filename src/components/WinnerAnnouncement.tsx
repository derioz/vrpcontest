import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    Sparkles,
    Flame,
    Heart,
    Download,
    Share2,
    Monitor,
    Tv,
    CheckCircle2,
    Layers,
    User,
    Eye,
    Trophy,
    Camera
} from "lucide-react";
import { downloadPhoto } from "../lib/download";
import { MagicCard } from "./ui/magic-card";
import { SparklesText } from "./ui/sparkles-text";
import { BorderBeam } from "./ui/border-beam";
import { NumberTicker } from "./ui/number-ticker";
import { Particles } from "./ui/particles";
import { ShimmerButton } from "./ui/shimmer-button";
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
    const confettiColors = ['#ea580c', '#f59e0b', '#fbbf24', '#ffffff', '#ef4444', '#8b5cf6', '#3b82f6'];

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

    // All 5 winners are equal co-champions!
    const displayedWinners = useMemo(() => {
        if (selectedCategory === "ALL") return winners;
        return winners.filter(w => w.categoryName === selectedCategory);
    }, [winners, selectedCategory]);

    const totalVotes = useMemo(() => {
        return winners.reduce((acc, w) => acc + (w.voteCount || 0), 0);
    }, [winners]);

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
                color="#ea580c"
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
                    className="absolute top-10 right-1/4 w-[550px] h-[550px] bg-fivem-orange/15 rounded-full blur-[140px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0.25, 0.1], x: [0, -40, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute bottom-10 left-1/4 w-[600px] h-[600px] bg-amber-600/15 rounded-full blur-[150px]"
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
                        className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-fivem-orange/40 bg-fivem-orange/10 text-fivem-orange text-xs font-mono font-bold uppercase tracking-widest mb-6 backdrop-blur-md shadow-[0_0_25px_rgba(234,88,12,0.2)]"
                    >
                        <Tv size={14} className="text-fivem-orange animate-pulse" />
                        <span>Official Vital RP · Server Loading Screen Showcase</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
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
                                text={contestName ? `${contestName} Winners` : "Loading Screen Winners"}
                                sparklesCount={10}
                                colors={{ first: "#ea580c", second: "#f59e0b" }}
                                className="drop-shadow-[0_10px_35px_rgba(234,88,12,0.35)]"
                            />
                        </h1>
                    </motion.div>

                    {/* Description & Loading Screen Banner */}
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-white/70 text-base sm:text-lg leading-relaxed font-sans max-w-2xl mx-auto"
                    >
                        Congratulations to all 5 co-champions! These community-voted winning photos are featured live in rotation on the official <strong className="text-white">Vital RP Server Loading Screen</strong>.
                    </motion.p>

                    {/* Stats pills strip (ElevenLabs UI style) */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-wrap items-center justify-center gap-3 mt-6 text-xs font-mono text-white/50"
                    >
                        <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2">
                            <span className="text-fivem-orange font-bold">🎮 {winners.length}</span>
                            <span>Equal Loading Screen Winners</span>
                        </div>
                        <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2">
                            <span className="text-red-400 font-bold">❤️ {totalVotes}</span>
                            <span>Community Votes</span>
                        </div>
                        <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Featured Live In Game</span>
                        </div>
                    </motion.div>
                </div>

                {/* ElevenLabs Interactive Category Filter Pills */}
                {categoryOptions.length > 2 && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.35 }}
                        className="flex items-center justify-center mb-12 overflow-x-auto no-scrollbar py-2 px-4"
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
                                                className="absolute inset-0 rounded-xl bg-gradient-to-r from-fivem-orange via-amber-500 to-orange-600 border border-amber-400/40 shadow-[0_4px_20px_rgba(234,88,12,0.4)]"
                                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                        <span className="relative z-10 tracking-wider">
                                            {cat === "ALL" ? "All 5 Winners" : cat}
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

                {/* EQUAL WINNERS SHOWCASE GALLERY GRID (5 Equal Winners) */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch max-w-7xl mx-auto"
                >
                    <AnimatePresence mode="popLayout">
                        {displayedWinners.map((winner, idx) => (
                            <motion.div
                                key={winner.id}
                                layout
                                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                                transition={{ duration: 0.4, delay: idx * 0.08 }}
                                className="group relative flex flex-col h-full"
                            >
                                {/* UI Tripled Liquid Conic Fire Border Accent */}
                                <div className="absolute -inset-1 rounded-[2.2rem] opacity-70 group-hover:opacity-100 transition-opacity duration-500 blur-md pointer-events-none">
                                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_320deg,rgba(234,88,12,0.9)_360deg)] opacity-80 animate-spin [animation-duration:4s]" />
                                </div>

                                <MagicCard
                                    active={true}
                                    borderBeamProps={{ size: 260, duration: 8, colorFrom: "#ea580c", colorTo: "#fb923c", borderWidth: 1.5 }}
                                    gradientColor="rgba(234, 88, 12, 0.18)"
                                    className="relative p-5 rounded-[2rem] bg-[#0a0a0d]/95 backdrop-blur-2xl border border-fivem-orange/40 group-hover:border-fivem-orange/80 transition-all duration-300 shadow-2xl flex flex-col justify-between h-full"
                                >
                                    {/* Top Featured Loading Screen Tag */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-fivem-orange bg-fivem-orange/15 border border-fivem-orange/30 px-3 py-1 rounded-full shadow-sm">
                                            <Tv size={12} className="text-fivem-orange animate-pulse" />
                                            <span>Loading Screen Winner</span>
                                        </span>
                                        <span className="text-[10px] font-mono font-bold text-white/50 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                                            {winner.categoryName}
                                        </span>
                                    </div>

                                    {/* High-Res Image Container */}
                                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 border border-white/10 group/img shadow-xl bg-black/60">
                                        <img
                                            src={winner.imageUrl}
                                            alt={winner.caption}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-106"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                                        {/* Loading Screen Badge Overlay on Image */}
                                        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md border border-white/20 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1.5">
                                            <Sparkles size={12} className="text-amber-400" />
                                            <span>Vital RP Featured</span>
                                        </div>

                                        {/* Votes Counter Pill with NumberTicker */}
                                        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-fivem-orange/90 text-black backdrop-blur-md rounded-full px-3 py-1 font-mono text-xs font-bold shadow-lg">
                                            <Heart size={12} className="fill-black stroke-none" />
                                            <NumberTicker value={winner.voteCount} />
                                            <span>Votes</span>
                                        </div>
                                    </div>

                                    {/* Info & Description */}
                                    <div className="flex flex-col flex-1 justify-between">
                                        <p className="text-white/80 text-xs line-clamp-2 italic mb-4 leading-relaxed">
                                            "{winner.caption || 'Official Vital RP contest submission'}"
                                        </p>

                                        {/* Photographer & Action Toolbar */}
                                        <div className="flex items-center justify-between pt-3.5 border-t border-white/10 mt-auto">
                                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                <div className="w-8 h-8 rounded-xl bg-fivem-orange/20 border border-fivem-orange/40 flex items-center justify-center text-fivem-orange font-bold text-xs shrink-0 shadow-inner">
                                                    {winner.playerName.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-white font-bold text-xs truncate leading-tight">{winner.playerName}</span>
                                                    <span className="text-white/40 font-mono text-[9.5px] truncate mt-0.5">@{winner.discordName}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleShare(winner)}
                                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors border border-white/10 cursor-pointer"
                                                    title="Share Entry Link"
                                                >
                                                    <Share2 size={14} />
                                                </button>

                                                <ShimmerButton
                                                    shimmerColor="#ea580c"
                                                    shimmerDuration="3s"
                                                    borderRadius="0.75rem"
                                                    background="rgba(234, 88, 12, 0.2)"
                                                    onClick={() => handleDownload(winner)}
                                                    className="!px-3 !py-2 border border-fivem-orange/50 text-xs"
                                                >
                                                    <Download size={13} />
                                                    <span>Download</span>
                                                </ShimmerButton>
                                            </div>
                                        </div>
                                    </div>
                                </MagicCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>

                {/* Footer Feature Note */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="mt-16 text-center max-w-xl mx-auto p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md"
                >
                    <div className="flex items-center justify-center gap-2 text-xs font-mono text-white/60">
                        <Monitor size={15} className="text-fivem-orange shrink-0" />
                        <span>All 5 winning photos are dynamically loaded into the Vital RP FiveM Server startup screens.</span>
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
