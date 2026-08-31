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
    X,
    ChevronLeft,
    ChevronRight,
    ZoomIn
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
    onPhotoClick?: (winner: Winner) => void;
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
        border: "border-amber-400/50",
        glow: "rgba(245, 158, 11, 0.35)",
        badge: "bg-amber-500/20 text-amber-300 border-amber-400/40",
        accent: "#f59e0b",
        gradient: "from-amber-500/25 via-orange-500/15 to-transparent",
        pedestalBg: "from-amber-500/20 via-black/90 to-[#0a0a0f]",
    },
    silver: {
        border: "border-sky-400/50",
        glow: "rgba(56, 189, 248, 0.35)",
        badge: "bg-sky-500/20 text-sky-300 border-sky-400/40",
        accent: "#38bdf8",
        gradient: "from-sky-500/25 via-blue-500/15 to-transparent",
        pedestalBg: "from-sky-500/20 via-black/90 to-[#0a0a0f]",
    },
    bronze: {
        border: "border-orange-400/50",
        glow: "rgba(251, 146, 60, 0.35)",
        badge: "bg-orange-500/20 text-orange-300 border-orange-400/40",
        accent: "#fb923c",
        gradient: "from-orange-500/25 via-amber-600/15 to-transparent",
        pedestalBg: "from-orange-500/20 via-black/90 to-[#0a0a0f]",
    },
    purple: {
        border: "border-purple-400/50",
        glow: "rgba(192, 132, 252, 0.35)",
        badge: "bg-purple-500/20 text-purple-300 border-purple-400/40",
        accent: "#c084fc",
        gradient: "from-purple-500/25 via-indigo-600/15 to-transparent",
        pedestalBg: "from-purple-500/20 via-black/90 to-[#0a0a0f]",
    },
    emerald: {
        border: "border-emerald-400/50",
        glow: "rgba(52, 211, 153, 0.35)",
        badge: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
        accent: "#34d399",
        gradient: "from-emerald-500/25 via-teal-600/15 to-transparent",
        pedestalBg: "from-emerald-500/20 via-black/90 to-[#0a0a0f]",
    },
};

const THEME_CYCLE = ['gold', 'silver', 'bronze', 'purple', 'emerald'];

export function WinnerAnnouncement({ winners, contestName, onPhotoClick }: WinnerAnnouncementProps) {
    const [viewMode, setViewMode] = useState<"podium" | "grid">("podium");
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [activeWinnerHighlight, setActiveWinnerHighlight] = useState<string | null>(null);
    const [enlargedWinner, setEnlargedWinner] = useState<Winner | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // All winners are equal co-champions!
    // Assign each category winner a distinct luxury theme color
    const styledWinners = useMemo(() => {
        return winners.map((w, idx) => ({
            winner: w,
            theme: THEME_CYCLE[idx % THEME_CYCLE.length],
        }));
    }, [winners]);

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
            description: "Honoring all 5 co-champions across every category equally."
        });
    }, []);

    // Trigger an ambient celebration on initial render
    useEffect(() => {
        const timer = setTimeout(() => {
            triggerCelebrationCannon();
        }, 800);
        return () => clearTimeout(timer);
    }, [triggerCelebrationCannon]);

    // Handle photo click to enlarge
    const handlePhotoClick = (winner: Winner) => {
        setEnlargedWinner(winner);
        if (onPhotoClick) {
            onPhotoClick(winner);
        }
    };

    // Lightbox navigation
    const currentEnlargedIndex = useMemo(() => {
        if (!enlargedWinner) return -1;
        return winners.findIndex(w => w.id === enlargedWinner.id);
    }, [enlargedWinner, winners]);

    const handlePrevWinner = useCallback(() => {
        if (currentEnlargedIndex > 0) {
            setEnlargedWinner(winners[currentEnlargedIndex - 1]);
        } else if (winners.length > 0) {
            setEnlargedWinner(winners[winners.length - 1]);
        }
    }, [currentEnlargedIndex, winners]);

    const handleNextWinner = useCallback(() => {
        if (currentEnlargedIndex >= 0 && currentEnlargedIndex < winners.length - 1) {
            setEnlargedWinner(winners[currentEnlargedIndex + 1]);
        } else if (winners.length > 0) {
            setEnlargedWinner(winners[0]);
        }
    }, [currentEnlargedIndex, winners]);

    // Keyboard navigation shortcuts when lightbox is open
    useEffect(() => {
        if (!enlargedWinner) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setEnlargedWinner(null);
            } else if (e.key === "ArrowLeft") {
                handlePrevWinner();
            } else if (e.key === "ArrowRight") {
                handleNextWinner();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [enlargedWinner, handlePrevWinner, handleNextWinner]);

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
            {/* ── Layer 1: Ambient Backdrop & Dynamic Spotlights ── */}
            <div className="absolute inset-0 pointer-events-none z-0">
                {/* Dark Luxury Gradient Base */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#030305] via-[#08080d] to-[#040407]" />

                {/* Animated Beaming Spotlights */}
                <Spotlight
                    className="-top-24 left-1/4 sm:left-1/3 -translate-x-1/2 w-[700px] h-[900px]"
                    fill="rgba(245, 158, 11, 0.25)"
                />
                <Spotlight
                    className="-top-24 right-1/4 sm:right-1/3 translate-x-1/2 w-[700px] h-[900px]"
                    fill="rgba(234, 88, 12, 0.22)"
                />

                {/* Ambient Radial Color Orbs */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] bg-gradient-to-b from-amber-500/15 via-orange-600/10 to-transparent blur-[160px] rounded-full" />
                <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-purple-600/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-cyan-600/10 blur-[150px] rounded-full" />

                {/* 3D Perspective Retro Grid Stage Floor */}
                <RetroGrid angle={70} className="opacity-25" />

                {/* Ambient Gold Stardust Particles */}
                <Particles
                    className="absolute inset-0 opacity-40"
                    quantity={45}
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
                        <Trophy size={14} className="text-amber-400" />
                        <span>Vital RP · Official Loading Screen Co-Champions</span>
                        <Trophy size={14} className="text-amber-400" />
                    </div>

                    {/* Grand Title with Magic Sparkles */}
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-display tracking-tight text-white leading-[1.1] mb-5">
                        <SparklesText
                            text={contestName ? `${contestName} Winners` : "Champions Celebration Stage"}
                            sparklesCount={7}
                            colors={{ first: "#f59e0b", second: "#ea580c" }}
                            className="drop-shadow-[0_12px_45px_rgba(245,158,11,0.3)]"
                        />
                    </h1>

                    <p className="text-white/75 text-base sm:text-lg leading-relaxed font-sans max-w-2xl mx-auto mb-7">
                        Congratulations to our 5 category winners! All 5 photos are honored as <strong className="text-white font-bold">equal co-champions</strong>, each permanently featured on the official FiveM Server Loading Screens.
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

                        {/* View Mode Toggle: Equal Podium Stage vs Grid Showcase */}
                        <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-lg">
                            <button
                                type="button"
                                onClick={() => setViewMode("podium")}
                                className={cn(
                                    "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-display transition-all cursor-pointer",
                                    viewMode === "podium"
                                        ? "bg-amber-500 text-black shadow-md font-extrabold"
                                        : "text-white/60 hover:text-white"
                                )}
                            >
                                <Trophy size={14} />
                                <span>Celebration Stage</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("grid")}
                                className={cn(
                                    "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-display transition-all cursor-pointer",
                                    viewMode === "grid"
                                        ? "bg-amber-500 text-black shadow-md font-extrabold"
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
                            <span>Equal Co-Champions</span>
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
                        <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2 backdrop-blur-md text-amber-300">
                            <ZoomIn size={13} />
                            <span>Click any photo to enlarge</span>
                        </div>
                    </div>
                </div>

                {/* ── View 1: 3D Equal Celebration Podium Stage (All 5 Equal) ── */}
                {viewMode === "podium" && (
                    <div className="relative w-full mb-12">
                        {/* Stage Floor Glow Arc */}
                        <div className="relative pt-4">
                            {/* Horizontal Stage Floor Light Bar */}
                            <div className="hidden lg:block absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-[2px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent shadow-[0_0_25px_rgba(245,158,11,0.7)] z-10" />

                            {/* Responsive 5-Column Equal Stage Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4 items-end justify-center">
                                {styledWinners.map((item, idx) => {
                                    const { winner, theme } = item;
                                    const themeObj = CATEGORY_THEMES[theme] || CATEGORY_THEMES.gold;
                                    const isHovered = activeWinnerHighlight === winner.id;

                                    return (
                                        <motion.div
                                            key={winner.id}
                                            initial={{ opacity: 0, y: 35, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ duration: 0.5, delay: idx * 0.08, ease: "easeOut" }}
                                            onMouseEnter={() => setActiveWinnerHighlight(winner.id)}
                                            onMouseLeave={() => setActiveWinnerHighlight(null)}
                                            className="relative flex flex-col items-center group/podium transition-all duration-500 z-10"
                                        >
                                            {/* Equal Podium Entry Card */}
                                            <div className={cn(
                                                "relative w-full rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 bg-[#0a0a0f]/95 border backdrop-blur-2xl transition-all duration-500 shadow-2xl flex flex-col",
                                                "border-white/10 hover:border-amber-400/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]",
                                                isHovered && "scale-[1.02] -translate-y-1"
                                            )}>
                                                {/* Animated Border Beam on hover */}
                                                {isHovered && (
                                                    <BorderBeam
                                                        size={160}
                                                        duration={7}
                                                        colorFrom="#f59e0b"
                                                        colorTo="#fbbf24"
                                                        borderWidth={1.5}
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
                                                    <span className="text-[9.5px] font-mono font-bold text-amber-400/80 bg-amber-500/10 border border-amber-400/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                        <Trophy size={10} />
                                                        <span>CHAMPION</span>
                                                    </span>
                                                </div>

                                                {/* High-Res Photo Display (Click to Enlarge!) */}
                                                <div 
                                                    onClick={() => handlePhotoClick(winner)}
                                                    className="relative aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden bg-black/80 border border-white/10 group/img mb-3 cursor-pointer select-none"
                                                    title="Click to enlarge photo"
                                                >
                                                    <img
                                                        src={winner.imageUrl}
                                                        alt={winner.caption || winner.playerName}
                                                        loading="lazy"
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover/podium:scale-105 group-hover/img:scale-105"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity duration-300" />

                                                    {/* Hover "Click to Enlarge" Floating Pill */}
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all duration-300 bg-black/40 backdrop-blur-[2px]">
                                                        <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-amber-400/50 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-2xl scale-90 group-hover/img:scale-100 transition-transform">
                                                            <Maximize2 size={13} />
                                                            <span>Click to Enlarge</span>
                                                        </div>
                                                    </div>

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
                                                        className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-bold text-[10px] transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer active:scale-95"
                                                        title="Download 4K Photo"
                                                    >
                                                        <Download size={11} />
                                                        <span>{downloadingId === winner.id ? "..." : "4K Photo"}</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* ── Equal Height 3D Pedestal Block (Uniform for all 5 winners) ── */}
                                            <div className={cn(
                                                "w-full mt-2 h-28 rounded-t-2xl sm:rounded-t-3xl border-t border-x relative overflow-hidden transition-all duration-500 hidden lg:flex flex-col items-center justify-between p-3",
                                                "bg-gradient-to-b from-amber-500/15 via-[#0d0d14] to-[#08080c] border-amber-400/30 shadow-lg",
                                                isHovered && "from-amber-500/25 border-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
                                            )}>
                                                {/* Top Glowing Edge Strip */}
                                                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

                                                {/* Pedestal Category Heraldry */}
                                                <div className="flex flex-col items-center mt-1">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-500/20 text-amber-300 border border-amber-400/30 shadow-inner">
                                                        <Trophy size={14} className="text-amber-400" />
                                                    </div>
                                                    <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-amber-200 mt-1 truncate max-w-[100px]">
                                                        {winner.categoryName}
                                                    </span>
                                                </div>

                                                {/* Pedestal Base Tag */}
                                                <div className="w-full text-center pb-0.5">
                                                    <span className="text-[9px] font-mono text-white/35 tracking-widest uppercase">
                                                        CO-CHAMPION
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

                {/* ── View 2: High-Res Category Grid Showcase (All 5 Equal) ── */}
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
                                                    <span>Loading Screen Co-Champion</span>
                                                </span>
                                                <span className="text-[10px] font-mono font-bold text-white/70 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                                                    {winner.categoryName}
                                                </span>
                                            </div>

                                            {/* High-Res Image Container (Click to Enlarge!) */}
                                            <div 
                                                onClick={() => handlePhotoClick(winner)}
                                                className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 border border-white/10 group/img shadow-md bg-black/60 cursor-pointer select-none"
                                                title="Click to enlarge photo"
                                            >
                                                <img
                                                    src={winner.imageUrl}
                                                    alt={winner.caption || winner.playerName}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80" />

                                                {/* Hover "Click to Enlarge" Overlay */}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                                                    <div className="px-3.5 py-1.5 rounded-xl bg-black/80 border border-amber-400/50 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-2xl">
                                                        <Maximize2 size={13} />
                                                        <span>Click to Enlarge</span>
                                                    </div>
                                                </div>

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

            {/* ── Layer 4: Interactive Photo Enlargement Lightbox Modal ── */}
            <AnimatePresence>
                {enlargedWinner && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl"
                        onClick={() => setEnlargedWinner(null)}
                    >
                        {/* Close button */}
                        <button
                            type="button"
                            onClick={() => setEnlargedWinner(null)}
                            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20 transition-colors z-50 cursor-pointer active:scale-95"
                            title="Close preview (Esc)"
                        >
                            <X size={20} />
                        </button>

                        {/* Prev Button */}
                        {winners.length > 1 && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrevWinner();
                                }}
                                className="hidden sm:flex absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all z-50 cursor-pointer active:scale-95"
                                title="Previous photo (Arrow Left)"
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}

                        {/* Next Button */}
                        {winners.length > 1 && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNextWinner();
                                }}
                                className="hidden sm:flex absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all z-50 cursor-pointer active:scale-95"
                                title="Next photo (Arrow Right)"
                            >
                                <ChevronRight size={24} />
                            </button>
                        )}

                        {/* Modal Container */}
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.94, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative max-w-5xl w-full max-h-[92vh] flex flex-col rounded-3xl bg-[#0a0a0f] border border-amber-400/40 shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden"
                        >
                            {/* Header Bar */}
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-black/60 backdrop-blur-md">
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-400/40">
                                        {enlargedWinner.categoryName} Champion
                                    </span>
                                    <span className="text-white/40 text-xs font-mono hidden sm:inline">
                                        · Loading Screen Feature
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-mono font-bold text-white">
                                        <Heart size={12} className="text-red-500 fill-red-500" />
                                        <span>{enlargedWinner.voteCount} votes</span>
                                    </div>
                                </div>
                            </div>

                            {/* Main High-Res Photo Container */}
                            <div className="relative flex-1 flex items-center justify-center p-2 sm:p-4 bg-black/95 overflow-hidden min-h-[300px]">
                                <img
                                    src={enlargedWinner.imageUrl}
                                    alt={enlargedWinner.caption || enlargedWinner.playerName}
                                    className="max-h-[62vh] sm:max-h-[68vh] w-auto max-w-full object-contain rounded-xl sm:rounded-2xl shadow-2xl"
                                />
                            </div>

                            {/* Footer Details & Action Bar */}
                            <div className="p-4 sm:p-5 border-t border-white/10 bg-black/80 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <img
                                        src={getDiceBearAvatarUrl(enlargedWinner.discordName || enlargedWinner.playerName, 'botttsNeutral')}
                                        alt=""
                                        className="w-10 h-10 rounded-full border border-amber-400/40 bg-black/50 object-cover shrink-0"
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-bold text-sm sm:text-base truncate">
                                                {enlargedWinner.playerName}
                                            </span>
                                            <span className="text-white/40 font-mono text-xs truncate">
                                                @{enlargedWinner.discordName}
                                            </span>
                                        </div>
                                        {enlargedWinner.caption && (
                                            <p className="text-white/70 text-xs italic mt-0.5 line-clamp-2">
                                                "{enlargedWinner.caption}"
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleShare(enlargedWinner)}
                                        className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold font-mono transition-colors border border-white/15 flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <Share2 size={13} />
                                        <span>Share</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDownload(enlargedWinner)}
                                        disabled={downloadingId === enlargedWinner.id}
                                        className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black text-xs font-bold font-display transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95"
                                    >
                                        <Download size={13} />
                                        <span>{downloadingId === enlargedWinner.id ? "Downloading..." : "Download 4K"}</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}


