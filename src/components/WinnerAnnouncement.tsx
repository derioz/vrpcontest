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
                className="absolute inset-0 z-0 opacity-30"
                quantity={40}
                color="#ea580c"
                staticity={50}
                size={0.5}
            />

            {/* ElevenLabs & UI Tripled Multi-layer Glowing Orbs */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-[#060608] z-10 opacity-90" />
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.02]" />

                <div className="absolute top-10 right-1/4 w-[550px] h-[550px] bg-fivem-orange/10 rounded-full blur-[140px]" />
                <div className="absolute bottom-10 left-1/4 w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 w-full">

                {/* Header Badge & Title */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    {/* Monospace Metadata Tag Strip */}
                    <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-fivem-orange/30 bg-fivem-orange/10 text-fivem-orange text-xs font-mono font-bold uppercase tracking-widest mb-6 backdrop-blur-md">
                        <Tv size={14} className="text-fivem-orange" />
                        <span>Official Vital RP · Server Loading Screen Showcase</span>
                    </div>

                    {/* SparklesText Main Title (MagicUI) */}
                    <div className="mb-4">
                        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-display tracking-tight text-white leading-tight">
                            <SparklesText
                                text={contestName ? `${contestName} Winners` : "Loading Screen Winners"}
                                sparklesCount={6}
                                colors={{ first: "#ea580c", second: "#f59e0b" }}
                                className="drop-shadow-[0_10px_35px_rgba(234,88,12,0.25)]"
                            />
                        </h1>
                    </div>

                    {/* Description & Loading Screen Banner */}
                    <p className="text-white/70 text-base sm:text-lg leading-relaxed font-sans max-w-2xl mx-auto">
                        Congratulations to all 5 co-champions! These community-voted winning photos are featured live in rotation on the official <strong className="text-white">Vital RP Server Loading Screen</strong>.
                    </p>

                    {/* Stats pills strip (ElevenLabs UI style) */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-6 text-xs font-mono text-white/50">
                        <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2">
                            <span className="text-fivem-orange font-bold">🎮 {winners.length}</span>
                            <span>Equal Loading Screen Winners</span>
                        </div>
                        <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2">
                            <span className="text-red-400 font-bold">❤️ {totalVotes}</span>
                            <span>Community Votes</span>
                        </div>
                        <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>Featured Live In Game</span>
                        </div>
                    </div>
                </div>

                {/* ElevenLabs Interactive Category Filter Pills */}
                {categoryOptions.length > 2 && (
                    <div className="flex items-center justify-center mb-12 overflow-x-auto no-scrollbar py-2 px-4">
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
                                                ? "text-white shadow-lg bg-gradient-to-r from-fivem-orange to-amber-600 border border-amber-400/40"
                                                : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                                        )}
                                    >
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
                    </div>
                )}

                {/* EQUAL WINNERS SHOWCASE GALLERY GRID (Clean Static Dark Glass Cards) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch max-w-7xl mx-auto">
                    <AnimatePresence mode="popLayout">
                        {displayedWinners.map((winner, idx) => (
                            <motion.div
                                key={winner.id}
                                layout
                                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96, y: 15 }}
                                transition={{ duration: 0.3, delay: idx * 0.05 }}
                                className="group relative flex flex-col h-full"
                            >
                                <MagicCard
                                    active={true}
                                    borderBeamProps={{ size: 200, duration: 12, colorFrom: "#ea580c", colorTo: "#fb923c", borderWidth: 1 }}
                                    gradientColor="rgba(234, 88, 12, 0.12)"
                                    className="relative p-5 rounded-3xl bg-[#09090c] backdrop-blur-xl border border-white/10 group-hover:border-fivem-orange/50 transition-all duration-300 shadow-xl flex flex-col justify-between h-full"
                                >
                                    {/* Top Featured Loading Screen Tag */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-fivem-orange bg-fivem-orange/15 border border-fivem-orange/30 px-3 py-1 rounded-full shadow-sm">
                                            <Tv size={12} className="text-fivem-orange" />
                                            <span>Loading Screen Winner</span>
                                        </span>
                                        <span className="text-[10px] font-mono font-bold text-white/50 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                                            {winner.categoryName}
                                        </span>
                                    </div>

                                    {/* High-Res Image Container */}
                                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 border border-white/10 group/img shadow-md bg-black/60">
                                        <img
                                            src={winner.imageUrl}
                                            alt={winner.caption}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80" />

                                        {/* Loading Screen Badge Overlay on Image */}
                                        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md border border-white/20 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1.5">
                                            <Sparkles size={12} className="text-amber-400" />
                                            <span>Vital RP Featured</span>
                                        </div>

                                        {/* Votes Counter Pill with NumberTicker */}
                                        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/80 text-white border border-white/20 backdrop-blur-md rounded-full px-3 py-1 font-mono text-xs font-bold shadow-md">
                                            <Heart size={12} className="text-red-500 fill-red-500" />
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
                                                    type="button"
                                                    onClick={() => handleShare(winner)}
                                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors border border-white/10 cursor-pointer"
                                                    title="Share Entry Link"
                                                >
                                                    <Share2 size={14} />
                                                </button>

                                                {/* Clean High-Contrast Action Download Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownload(winner)}
                                                    className="px-3.5 py-2 rounded-xl bg-fivem-orange hover:bg-amber-500 text-black font-bold text-xs transition-all flex items-center gap-1.5 shadow-md hover:shadow-[0_4px_16px_rgba(234,88,12,0.3)] cursor-pointer active:scale-95"
                                                    title="Download High-Res Photo"
                                                >
                                                    <Download size={13} />
                                                    <span>Download</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </MagicCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Footer Feature Note */}
                <div className="mt-16 text-center max-w-xl mx-auto p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
                    <div className="flex items-center justify-center gap-2 text-xs font-mono text-white/60">
                        <Monitor size={15} className="text-fivem-orange shrink-0" />
                        <span>All 5 winning photos are dynamically loaded into the Vital RP FiveM Server startup screens.</span>
                    </div>
                </div>

            </div>
        </section>
    );
}
