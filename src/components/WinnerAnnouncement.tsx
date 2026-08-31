import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
    Crown,
    Camera,
    PartyPopper,
    Grid3X3,
    Award,
    Zap,
    ExternalLink,
    ChevronDown,
    Maximize2,
    SlidersHorizontal,
    Volume2
} from "lucide-react";
import { downloadPhoto } from "../lib/download";
import { MagicCard } from "./ui/magic-card";
import { SparklesText } from "./ui/sparkles-text";
import { NumberTicker } from "./ui/number-ticker";
import { Particles } from "./ui/particles";
import { Spotlight } from "./ui/spotlight";
import { RetroGrid } from "./ui/retro-grid";
import { BorderBeam } from "./ui/border-beam";
import { ShimmerButton } from "./ui/shimmer-button";
import { ChampionBadge } from "./ChampionBadge";
import { getDiceBearAvatarUrl } from "../lib/dicebear";
import { cn } from "../lib/utils";

export interface Winner {
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

// Category theme colors for visual brilliance
const CATEGORY_THEMES: Record<string, {
    border: string;
    glow: string;
    badge: string;
    accent: string;
    gradient: string;
    pedestalBg: string;
}> = {
    gold: {
        border: "border-amber-400/60",
        glow: "rgba(245, 158, 11, 0.4)",
        badge: "bg-amber-500/20 text-amber-300 border-amber-400/40",
        accent: "#f59e0b",
        gradient: "from-amber-500/30 via-orange-500/20 to-transparent",
        pedestalBg: "from-amber-500/30 via-black/90 to-[#0a0a0f]",
    },
    silver: {
        border: "border-sky-400/50",
        glow: "rgba(56, 189, 248, 0.35)",
        badge: "bg-sky-500/20 text-sky-300 border-sky-400/40",
        accent: "#38bdf8",
        gradient: "from-sky-500/30 via-blue-500/15 to-transparent",
        pedestalBg: "from-sky-500/25 via-black/90 to-[#0a0a0f]",
    },
    bronze: {
        border: "border-orange-400/50",
        glow: "rgba(251, 146, 60, 0.35)",
        badge: "bg-orange-500/20 text-orange-300 border-orange-400/40",
        accent: "#fb923c",
        gradient: "from-orange-500/30 via-amber-600/15 to-transparent",
        pedestalBg: "from-orange-500/25 via-black/90 to-[#0a0a0f]",
    },
    purple: {
        border: "border-purple-400/50",
        glow: "rgba(192, 132, 252, 0.35)",
        badge: "bg-purple-500/20 text-purple-300 border-purple-400/40",
        accent: "#c084fc",
        gradient: "from-purple-500/30 via-indigo-600/15 to-transparent",
        pedestalBg: "from-purple-500/25 via-black/90 to-[#0a0a0f]",
    },
    emerald: {
        border: "border-emerald-400/50",
        glow: "rgba(52, 211, 153, 0.35)",
        badge: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
        accent: "#34d399",
        gradient: "from-emerald-500/30 via-teal-600/15 to-transparent",
        pedestalBg: "from-emerald-500/25 via-black/90 to-[#0a0a0f]",
    },
};

const THEME_CYCLE = ['gold', 'silver', 'bronze', 'purple', 'emerald'];

export function WinnerAnnouncement({ winners, contestName }: WinnerAnnouncementProps) {
    const [viewMode, setViewMode] = useState<"podium" | "grid">("podium");
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [activeWinnerHighlight, setActiveWinnerHighlight] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Rank winners by vote count for podium height calculation
    const rankedWinners = useMemo(() => {
        return [...winners].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
    }, [winners]);

    // Construct dramatic visual podium order:
    // Highest voted (#1 Grand Champion) is in the absolute center!
    // Flanked by #2 on left, #3 on right, #4 outer left, #5 outer right.
    const podiumArrangedWinners = useMemo(() => {
        if (rankedWinners.length <= 1) return rankedWinners;

        const result: { winner: Winner; rank: number; podiumHeightClass: string; theme: string }[] = [];
        
        if (rankedWinners.length === 3) {
            // [Rank 2, Rank 1 (Center), Rank 3]
            result.push({ winner: rankedWinners[1], rank: 2, podiumHeightClass: "h-32 sm:h-36", theme: "silver" });
            result.push({ winner: rankedWinners[0], rank: 1, podiumHeightClass: "h-44 sm:h-52", theme: "gold" });
            result.push({ winner: rankedWinners[2], rank: 3, podiumHeightClass: "h-24 sm:h-28", theme: "bronze" });
            return result;
        }

        if (rankedWinners.length >= 5) {
            // Standard 5-category podium:
            // [Rank 4, Rank 2, Rank 1 (Center Grand Champion), Rank 3, Rank 5]
            result.push({ winner: rankedWinners[3], rank: 4, podiumHeightClass: "h-20 sm:h-24", theme: "purple" });
            result.push({ winner: rankedWinners[1], rank: 2, podiumHeightClass: "h-32 sm:h-36", theme: "silver" });
            result.push({ winner: rankedWinners[0], rank: 1, podiumHeightClass: "h-44 sm:h-52", theme: "gold" });
            result.push({ winner: rankedWinners[2], rank: 3, podiumHeightClass: "h-26 sm:h-30", theme: "bronze" });
            result.push({ winner: rankedWinners[4], rank: 5, podiumHeightClass: "h-16 sm:h-20", theme: "emerald" });
            return result;
        }

        // Fallback for 2 or 4 items: Sort center-heavy
        return rankedWinners.map((w, idx) => ({
            winner: w,
            rank: idx + 1,
            podiumHeightClass: idx === 0 ? "h-44 sm:h-52" : idx === 1 ? "h-32 sm:h-36" : "h-24 sm:h-28",
            theme: THEME_CYCLE[idx % THEME_CYCLE.length],
        }));
    }, [rankedWinners]);

    // Unique category list for tabs
    const categoryOptions = useMemo(() => {
        const cats = Array.from(new Set(winners.map(w => w.categoryName)));
        return ["ALL", ...cats];
    }, [winners]);

    const displayedWinners = useMemo(() => {
        if (selectedCategory === "ALL") return winners;
        return winners.filter(w => w.categoryName === selectedCategory);
    }, [winners, selectedCategory]);

    const totalVotes = useMemo(() => {
        return winners.reduce((acc, w) => acc + (w.voteCount || 0), 0);
    }, [winners]);

    // Dynamic celebration confetti cannon burst
    const triggerCelebrationCannon = useCallback(() => {
        const colors = [
            '#ea580c', '#f59e0b', '#fbbf24', '#38bdf8', '#a855f7',
            '#ec4899', '#10b981', '#ffffff'
        ];
        const emojis = ['🏆', '🎉', '👑', '✨', '⭐', '🔥', '🌟', '🎊'];
        const totalParticles = 70;

        for (let i = 0; i < totalParticles; i++) {
            const el = document.createElement('div');
            const isLeft = Math.random() > 0.5;
            const startX = isLeft ? window.innerWidth * 0.15 : window.innerWidth * 0.85;
            const startY = window.innerHeight * 0.75;
            const useEmoji = Math.random() > 0.65;

            el.textContent = useEmoji ? emojis[Math.floor(Math.random() * emojis.length)] : '';
            el.style.cssText = `
                position: fixed;
                left: ${startX}px;
                top: ${startY}px;
                width: ${useEmoji ? 'auto' : `${Math.random() * 10 + 6}px`};
                height: ${useEmoji ? 'auto' : `${Math.random() * 14 + 8}px`};
                background: ${useEmoji ? 'transparent' : colors[Math.floor(Math.random() * colors.length)]};
                border-radius: ${Math.random() > 0.5 ? '2px' : '50%'};
                font-size: ${Math.random() * 16 + 14}px;
                pointer-events: none;
                z-index: 9999;
                box-shadow: ${useEmoji ? 'none' : '0 0 10px rgba(255,255,255,0.4)'};
                will-change: transform, opacity;
            `;
            document.body.appendChild(el);

            const spreadAngle = isLeft
                ? (-Math.PI / 3) + (Math.random() - 0.5) * 0.8
                : (-2 * Math.PI / 3) + (Math.random() - 0.5) * 0.8;
            const velocity = 280 + Math.random() * 320;
            const dx = Math.cos(spreadAngle) * velocity;
            const dy = Math.sin(spreadAngle) * velocity;

            const anim = el.animate([
                { transform: 'translate(0, 0) scale(0.6) rotate(0deg)', opacity: 1 },
                {
                    transform: `translate(${dx}px, ${dy + 380}px) scale(${Math.random() * 0.6 + 0.8}) rotate(${Math.random() * 1080 - 540}deg)`,
                    opacity: 0
                }
            ], {
                duration: 1600 + Math.random() * 900,
                easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                fill: 'forwards'
            });

            anim.onfinish = () => el.remove();
        }

        toast.success("🎉 Celebration Confetti Fired!", {
            description: "Honoring our community champions across all categories."
        });
    }, []);

    // Trigger an ambient celebration on initial render
    useEffect(() => {
        const timer = setTimeout(() => {
            triggerCelebrationCannon();
        }, 800);
        return () => clearTimeout(timer);
    }, [triggerCelebrationCannon]);

    const handleDownload = async (winner: Winner) => {
        setDownloadingId(winner.id);
        const toastId = `download-${winner.id}`;
        toast.loading("Preparing 4K high-res loading screen download...", { id: toastId });

        const contestPart = contestName ? sanitizeFilePart(contestName) : "vital-rp-contest";
        const categoryPart = sanitizeFilePart(winner.categoryName) || "winner";
        const playerPart = sanitizeFilePart(winner.playerName) || "player";
        const filename = `${contestPart}-${categoryPart}-${playerPart}.jpg`;

        const success = await downloadPhoto(winner.imageUrl, filename);
        setDownloadingId(null);

        if (success) {
            toast.success("Winning photo downloaded successfully!", { id: toastId });
        } else {
            toast.error("Could not download image. Please try again.", { id: toastId });
        }
    };

    const handleShare = (winner: Winner) => {
        const url = `${window.location.origin}/?photo=${winner.id}`;
        navigator.clipboard.writeText(url);
        toast.success("Winning entry link copied to clipboard!");
    };

    return (
        <section 
            ref={containerRef}
            className="relative w-full pt-24 sm:pt-32 pb-24 overflow-hidden bg-[#050508] border-b border-white/10"
        >
            {/* ── Layer 1: Ambient Backdrop & Dynamic Sweeping Spotlights ── */}
            <div className="absolute inset-0 pointer-events-none z-0">
                {/* Dark Luxury Gradient Base */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#030305] via-[#08080d] to-[#040407]" />

                {/* Animated Beaming Spotlights converging on Center Podium */}
                <Spotlight
                    className="-top-24 left-1/4 sm:left-1/3 -translate-x-1/2 w-[700px] h-[900px]"
                    fill="rgba(245, 158, 11, 0.28)"
                />
                <Spotlight
                    className="-top-24 right-1/4 sm:right-1/3 translate-x-1/2 w-[700px] h-[900px]"
                    fill="rgba(234, 88, 12, 0.25)"
                />

                {/* Ambient Radial Color Orbs */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] bg-gradient-to-b from-amber-500/15 via-orange-600/10 to-transparent blur-[160px] rounded-full" />
                <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-purple-600/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-cyan-600/10 blur-[150px] rounded-full" />

                {/* 3D Perspective Retro Grid Stage Floor */}
                <RetroGrid angle={70} className="opacity-25" />

                {/* Ambient Gold Stardust Particles */}
                <Particles
                    className="absolute inset-0 opacity-45"
                    quantity={50}
                    color="#f59e0b"
                    staticity={40}
                    size={0.6}
                />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full">

                {/* ── Layer 2: Main Awards Stage Header ── */}
                <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-14">
                    {/* Official Server Loading Screen Heraldry Ribbon */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 text-amber-300 text-xs font-mono font-bold uppercase tracking-widest mb-6 backdrop-blur-xl shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                        <Crown size={15} className="text-amber-400 animate-pulse" />
                        <span>Vital RP · Official Loading Screen Co-Champions</span>
                        <Crown size={15} className="text-amber-400 animate-pulse" />
                    </div>

                    {/* Grand Title with Magic Sparkles */}
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-display tracking-tight text-white leading-[1.1] mb-5">
                        <SparklesText
                            text={contestName ? `${contestName} Winners` : "Champions Celebration Stage"}
                            sparklesCount={8}
                            colors={{ first: "#f59e0b", second: "#ea580c" }}
                            className="drop-shadow-[0_12px_45px_rgba(245,158,11,0.35)]"
                        />
                    </h1>

                    <p className="text-white/75 text-base sm:text-lg leading-relaxed font-sans max-w-2xl mx-auto mb-7">
                        Congratulations to each category victor! All winning photographs have earned permanent exhibition on the <strong className="text-white">FiveM Server Loading Screens</strong> and Hall of Fame.
                    </p>

                    {/* ── Toolbar: Confetti Cannon & View Mode Switcher ── */}
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                        {/* Interactive Confetti Cannon Button */}
                        <ShimmerButton
                            onClick={triggerCelebrationCannon}
                            shimmerColor="#fbbf24"
                            shimmerDuration="2.2s"
                            background="linear-gradient(135deg, #ea580c 0%, #d97706 100%)"
                            className="text-black font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-[0_0_25px_rgba(234,88,12,0.35)] cursor-pointer flex items-center gap-2 active:scale-95 transition-transform"
                        >
                            <PartyPopper size={16} className="text-black" />
                            <span>Launch Confetti Celebration</span>
                        </ShimmerButton>

                        {/* View Mode Toggle: Podium Stage vs Grid Showcase */}
                        <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-lg">
                            <button
                                type="button"
                                onClick={() => setViewMode("podium")}
                                className={cn(
                                    "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-display transition-all cursor-pointer",
                                    viewMode === "podium"
                                        ? "bg-amber-500 text-black shadow-md"
                                        : "text-white/60 hover:text-white"
                                )}
                            >
                                <Trophy size={14} />
                                <span>Podium Stage</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("grid")}
                                className={cn(
                                    "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-display transition-all cursor-pointer",
                                    viewMode === "grid"
                                        ? "bg-amber-500 text-black shadow-md"
                                        : "text-white/60 hover:text-white"
                                )}
                            >
                                <Grid3X3 size={14} />
                                <span>Category Grid</span>
                            </button>
                        </div>
                    </div>

                    {/* Stats pills strip */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-6 text-xs font-mono text-white/50">
                        <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2 backdrop-blur-md">
                            <Trophy size={13} className="text-amber-400" />
                            <span className="text-white font-bold">{winners.length}</span>
                            <span>Category Champions</span>
                        </div>
                        <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2 backdrop-blur-md">
                            <Heart size={13} className="text-red-400 fill-red-400" />
                            <span className="text-white font-bold">{totalVotes.toLocaleString()}</span>
                            <span>Community Votes Cast</span>
                        </div>
                        <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2 backdrop-blur-md">
                            <Tv size={13} className="text-fivem-orange" />
                            <span className="text-emerald-400 font-bold">5 Server Screens</span>
                        </div>
                    </div>
                </div>

                {/* ── View 1: 3D Tiered Winners Celebration Podium Stage ── */}
                {viewMode === "podium" && (
                    <div className="relative w-full mb-12">
                        {/* Dramatic Stage Floor Glow Arc */}
                        <div className="relative pt-6 sm:pt-10">
                            {/* Horizontal Stage Floor Light Bar */}
                            <div className="hidden lg:block absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent shadow-[0_0_25px_rgba(245,158,11,0.8)] z-10" />

                            {/* Responsive Podium Stage Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4 items-end justify-center">
                                {podiumArrangedWinners.map((item, idx) => {
                                    const { winner, rank, podiumHeightClass, theme } = item;
                                    const isGrandChampion = rank === 1;
                                    const themeObj = CATEGORY_THEMES[theme] || CATEGORY_THEMES.gold;
                                    const isHovered = activeWinnerHighlight === winner.id;

                                    return (
                                        <motion.div
                                            key={winner.id}
                                            initial={{ opacity: 0, y: 50, scale: 0.92 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ duration: 0.6, delay: idx * 0.1, ease: "easeOut" }}
                                            onMouseEnter={() => setActiveWinnerHighlight(winner.id)}
                                            onMouseLeave={() => setActiveWinnerHighlight(null)}
                                            className={cn(
                                                "relative flex flex-col items-center group/podium transition-all duration-500",
                                                isGrandChampion ? "lg:-translate-y-4 z-20" : "z-10",
                                                // Center champion full width on small mobile if desired
                                                isGrandChampion && "sm:col-span-2 lg:col-span-1"
                                            )}
                                        >
                                            {/* Grand Champion Aura Crest */}
                                            {isGrandChampion && (
                                                <div className="absolute -top-12 sm:-top-14 flex flex-col items-center pointer-events-none z-30 animate-bounce">
                                                    <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 text-black font-extrabold text-[11px] uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.9)]">
                                                        <Crown size={14} className="fill-black" />
                                                        <span>Grand Champion</span>
                                                    </div>
                                                    <div className="w-0.5 h-3 bg-gradient-to-b from-amber-400 to-transparent" />
                                                </div>
                                            )}

                                            {/* Podium Entry Card (Floating Above Pedestal) */}
                                            <div className={cn(
                                                "relative w-full rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 bg-[#0a0a0f]/95 border backdrop-blur-2xl transition-all duration-500 shadow-2xl flex flex-col",
                                                isGrandChampion 
                                                    ? "border-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/50" 
                                                    : "border-white/10 hover:border-white/30 hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]",
                                                isHovered && "scale-[1.02] -translate-y-1"
                                            )}>
                                                {/* Animated Border Beam on Grand Champion */}
                                                {isGrandChampion && (
                                                    <BorderBeam
                                                        size={180}
                                                        duration={8}
                                                        colorFrom="#f59e0b"
                                                        colorTo="#fbbf24"
                                                        borderWidth={2}
                                                    />
                                                )}

                                                {/* Category Header Badge */}
                                                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                                                    <span className={cn(
                                                        "text-[10px] font-mono font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border truncate",
                                                        themeObj.badge
                                                    )}>
                                                        {winner.categoryName}
                                                    </span>
                                                    <span className="text-[10px] font-mono font-bold text-white/50 bg-white/5 px-2 py-0.5 rounded-md">
                                                        #{rank}
                                                    </span>
                                                </div>

                                                {/* High-Res Photo Display */}
                                                <div className="relative aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden bg-black/80 border border-white/10 group/img mb-3">
                                                    <img
                                                        src={winner.imageUrl}
                                                        alt={winner.caption || winner.playerName}
                                                        loading="lazy"
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover/podium:scale-105"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                                                    {/* Loading Screen Overlay Pill */}
                                                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/20 text-[9px] font-mono font-bold uppercase text-white tracking-wider">
                                                        <Tv size={10} className="text-amber-400" />
                                                        <span>Featured Screen</span>
                                                    </div>

                                                    {/* Community Votes Ticker Pill */}
                                                    <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/85 backdrop-blur-md border border-white/20 font-mono text-[11px] font-bold text-white shadow-md">
                                                        <Heart size={11} className="text-red-500 fill-red-500" />
                                                        <NumberTicker value={winner.voteCount} />
                                                    </div>
                                                </div>

                                                {/* Photographer Bio & Title */}
                                                <div className="flex items-center gap-2 mb-2 min-w-0">
                                                    <img
                                                        src={getDiceBearAvatarUrl(winner.discordName || winner.playerName, 'botttsNeutral')}
                                                        alt=""
                                                        className="w-7 h-7 rounded-full border border-white/20 bg-black/40 object-cover shrink-0"
                                                    />
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <span className="text-white font-bold text-xs truncate leading-tight">
                                                            {winner.playerName}
                                                        </span>
                                                        <span className="text-white/40 font-mono text-[9px] truncate">
                                                            @{winner.discordName}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Caption Quote */}
                                                {winner.caption && (
                                                    <p className="text-white/70 text-[11px] line-clamp-1 italic mb-3">
                                                        "{winner.caption}"
                                                    </p>
                                                )}

                                                {/* Action Bar (Download & Share) */}
                                                <div className="flex items-center gap-1.5 pt-2 border-t border-white/10 mt-auto">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleShare(winner)}
                                                        className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors border border-white/10 text-[10px] font-bold font-mono flex items-center justify-center gap-1 cursor-pointer"
                                                        title="Share Entry Link"
                                                    >
                                                        <Share2 size={11} />
                                                        <span>Share</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDownload(winner)}
                                                        disabled={downloadingId === winner.id}
                                                        className={cn(
                                                            "flex-1 py-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer active:scale-95",
                                                            isGrandChampion
                                                                ? "bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                                                                : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                                                        )}
                                                        title="Download 4K Photo"
                                                    >
                                                        <Download size={11} />
                                                        <span>{downloadingId === winner.id ? "..." : "4K Photo"}</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* ── 3D Tiered Pedestal Block ── */}
                                            <div className={cn(
                                                "w-full mt-2 rounded-t-2xl sm:rounded-t-3xl border-t border-x relative overflow-hidden transition-all duration-500 hidden lg:flex flex-col items-center justify-between p-3",
                                                podiumHeightClass,
                                                isGrandChampion
                                                    ? "bg-gradient-to-b from-amber-500/25 via-[#13110b] to-[#08080c] border-amber-400/60 shadow-[0_0_40px_rgba(245,158,11,0.25)]"
                                                    : "bg-gradient-to-b from-white/[0.08] via-[#0d0d14] to-[#08080c] border-white/15 shadow-lg"
                                            )}>
                                                {/* Top Glowing Edge Strip */}
                                                <div className={cn(
                                                    "absolute top-0 inset-x-0 h-[2px]",
                                                    isGrandChampion 
                                                        ? "bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400 shadow-[0_0_15px_#f59e0b]" 
                                                        : "bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                                )} />

                                                {/* Pedestal Heraldry Emblem */}
                                                <div className="flex flex-col items-center mt-1">
                                                    <div className={cn(
                                                        "w-9 h-9 rounded-full flex items-center justify-center font-display font-black text-sm border shadow-inner",
                                                        isGrandChampion
                                                            ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)]"
                                                            : "bg-white/10 text-white border-white/20"
                                                    )}>
                                                        {rank}
                                                    </div>
                                                    <span className={cn(
                                                        "text-[9.5px] font-mono font-bold uppercase tracking-widest mt-1",
                                                        isGrandChampion ? "text-amber-300" : "text-white/40"
                                                    )}>
                                                        {isGrandChampion ? "GRAND VICTOR" : `${winner.categoryName}`}
                                                    </span>
                                                </div>

                                                {/* Pedestal Bottom Neon Base Glow */}
                                                <div className="w-full text-center pb-1">
                                                    <span className="text-[10px] font-mono text-white/30 tracking-widest uppercase">
                                                        SERVER FEATURE
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── View 2: High-Res Category Grid Showcase ── */}
                {viewMode === "grid" && (
                    <div className="w-full space-y-8">
                        {/* Category Filter Pills */}
                        {categoryOptions.length > 2 && (
                            <div className="flex items-center justify-center overflow-x-auto no-scrollbar py-2 px-4">
                                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl">
                                    {categoryOptions.map((cat) => {
                                        const isActive = selectedCategory === cat;
                                        const count = cat === "ALL" 
                                            ? winners.length 
                                            : winners.filter(w => w.categoryName === cat).length;

                                        return (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={cn(
                                                    "relative px-4 py-2 rounded-xl text-xs font-bold font-display transition-all duration-300 flex items-center gap-2 shrink-0 cursor-pointer select-none",
                                                    isActive
                                                        ? "text-black shadow-lg bg-gradient-to-r from-amber-400 to-amber-500 font-extrabold"
                                                        : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                                                )}
                                            >
                                                <span className="relative z-10 tracking-wider">
                                                    {cat === "ALL" ? "All Winners" : cat}
                                                </span>
                                                <span className={cn(
                                                    "relative z-10 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md",
                                                    isActive ? "bg-black/30 text-black" : "bg-white/10 text-white/40"
                                                )}>
                                                    {count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Cards Grid */}
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
                                            borderBeamProps={{ size: 200, duration: 12, colorFrom: "#f59e0b", colorTo: "#ea580c", borderWidth: 1 }}
                                            gradientColor="rgba(245, 158, 11, 0.12)"
                                            className="relative p-5 rounded-3xl bg-[#09090e] backdrop-blur-xl border border-white/10 group-hover:border-amber-400/50 transition-all duration-300 shadow-xl flex flex-col justify-between h-full"
                                        >
                                            {/* Top Feature Tag & Category Pill */}
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-amber-300 bg-amber-500/15 border border-amber-400/30 px-3 py-1 rounded-full shadow-sm">
                                                    <Tv size={12} className="text-amber-400" />
                                                    <span>Loading Screen Victor</span>
                                                </span>
                                                <span className="text-[10px] font-mono font-bold text-white/70 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                                                    {winner.categoryName}
                                                </span>
                                            </div>

                                            {/* High-Res Image Container */}
                                            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 border border-white/10 group/img shadow-md bg-black/60">
                                                <img
                                                    src={winner.imageUrl}
                                                    alt={winner.caption || winner.playerName}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80" />

                                                {/* Vital RP Featured Pill */}
                                                <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md border border-white/20 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1.5">
                                                    <Sparkles size={12} className="text-amber-400" />
                                                    <span>Official Showcase</span>
                                                </div>

                                                {/* Votes Counter Pill with NumberTicker */}
                                                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/85 text-white border border-white/20 backdrop-blur-md rounded-full px-3 py-1 font-mono text-xs font-bold shadow-md">
                                                    <Heart size={12} className="text-red-500 fill-red-500" />
                                                    <NumberTicker value={winner.voteCount} />
                                                    <span>Votes</span>
                                                </div>
                                            </div>

                                            {/* Info & Caption */}
                                            <div className="flex flex-col flex-1 justify-between">
                                                <p className="text-white/80 text-xs line-clamp-2 italic mb-4 leading-relaxed">
                                                    "{winner.caption || 'Official Vital RP contest submission'}"
                                                </p>

                                                {/* Photographer & Action Toolbar */}
                                                <div className="flex items-center justify-between pt-3.5 border-t border-white/10 mt-auto">
                                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                        <img
                                                            src={getDiceBearAvatarUrl(winner.discordName || winner.playerName, 'botttsNeutral')}
                                                            alt=""
                                                            className="w-8 h-8 rounded-full border border-amber-400/40 bg-black/40 object-cover shrink-0"
                                                        />
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-white font-bold text-xs truncate leading-tight">
                                                                {winner.playerName}
                                                            </span>
                                                            <span className="text-white/40 font-mono text-[9.5px] truncate mt-0.5">
                                                                @{winner.discordName}
                                                            </span>
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

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDownload(winner)}
                                                            disabled={downloadingId === winner.id}
                                                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-bold text-xs transition-all flex items-center gap-1.5 shadow-md hover:shadow-[0_4px_16px_rgba(245,158,11,0.3)] cursor-pointer active:scale-95"
                                                            title="Download High-Res Photo"
                                                        >
                                                            <Download size={13} />
                                                            <span>{downloadingId === winner.id ? "Downloading..." : "Download"}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </MagicCard>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {/* ── Layer 3: Feature Guarantee Footnote ── */}
                <div className="mt-14 text-center max-w-xl mx-auto p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md shadow-lg">
                    <div className="flex items-center justify-center gap-2.5 text-xs font-mono text-white/65">
                        <Monitor size={15} className="text-amber-400 shrink-0" />
                        <span>All 5 category-winning photos are dynamically served to all connected clients during FiveM loading sequence.</span>
                    </div>
                </div>

            </div>
        </section>
    );
}

