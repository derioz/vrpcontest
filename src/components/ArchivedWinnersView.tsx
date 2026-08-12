import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  ArrowLeft,
  ImageIcon,
  Heart,
  Download,
  Share2,
  Flame,
  Search,
  Maximize2,
  Crown,
  User,
  X,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';
import { ArchivedWinner } from '../types';
import { MagicCard } from './ui/magic-card';
import { NumberTicker } from './ui/number-ticker';
import { SparklesText } from './ui/sparkles-text';
import { Particles } from './ui/particles';
import { toast } from 'sonner';
import { downloadPhoto } from '../lib/download';
import { ChampionBadge } from './ChampionBadge';
import { getProfileAvatar, getDiceBearAvatarUrl } from '../lib/dicebear';

interface ArchivedWinnersViewProps {
  currentUser?: any | null;
  onClose: () => void;
}

interface UserFilterState {
  displayName: string;
  discordName: string;
  userId?: string;
}

function sanitizeFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── MEMOIZED WINNER CARD COMPONENT FOR ULTRA-SMOOTH GPU PERFORMANCE ──
const WinnerCard = React.memo(({
  winner,
  userWinCount,
  avatarUrl,
  displayName,
  onInspect,
  onUserClick,
  onShare,
  onDownload
}: {
  winner: ArchivedWinner;
  userWinCount: number;
  avatarUrl: string;
  displayName?: string;
  onInspect: (w: ArchivedWinner) => void;
  onUserClick: (w: ArchivedWinner) => void;
  onShare: (w: ArchivedWinner) => void;
  onDownload: (w: ArchivedWinner) => void;
}) => {
  const effectiveName = displayName || winner.player_name;

  return (
    <div className="group relative transform-gpu">
      <MagicCard
        active={true}
        borderBeamProps={{ size: 240, duration: 8, colorFrom: "#ea580c", colorTo: "#fb923c", borderWidth: 1.5 }}
        gradientColor="rgba(234, 88, 12, 0.16)"
        className="group relative flex flex-col bg-[#0a0a0d]/90 border border-fivem-orange/30 rounded-3xl overflow-hidden group-hover:border-fivem-orange/70 transition-all duration-300 shadow-xl h-full justify-between p-4 transform-gpu"
      >
        {/* Image Container */}
        <div
          className="relative aspect-[4/3] bg-black/60 rounded-2xl overflow-hidden mb-4 border border-white/5 cursor-pointer transform-gpu"
          onClick={() => onInspect(winner)}
        >
          <img
            src={winner.image_url}
            alt={winner.caption || 'Archived winning entry'}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 transform-gpu"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80" />

          {/* Category Badge */}
          <div className="absolute top-3 right-3 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full border border-amber-500/40 flex items-center gap-1.5 shadow-xl">
            <Trophy size={11} className="text-amber-400" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-white/90 truncate max-w-[120px]">
              {winner.category_name}
            </span>
          </div>

          {/* Zoom Overlay Trigger */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black/70 border border-white/20 shadow-xl">
              <Maximize2 size={13} /> Inspect Winner
            </span>
          </div>

          {/* Vote Count Badge */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1 bg-amber-500/90 backdrop-blur-md rounded-full text-black font-bold text-xs shadow-lg font-mono">
            <Heart size={12} className="fill-black stroke-none" />
            <NumberTicker value={winner.vote_count} />
          </div>
        </div>

        {/* Info Section */}
        <div className="flex flex-col flex-1 justify-between gap-3">
          <div className="min-h-[2.5rem] flex items-center">
            <p className="text-xs text-white/80 line-clamp-2 italic leading-relaxed">
              "{winner.caption || 'No caption provided'}"
            </p>
          </div>

          {/* Footer: User Profile Avatar & Champion Badge (Clickable Username filter) */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-auto w-full">
            <div
              className="flex items-center gap-2.5 min-w-0 pr-2 cursor-pointer group/user hover:opacity-90 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onUserClick(winner);
              }}
              title={`Click to view all winning entries from ${effectiveName}`}
            >
              <img
                src={avatarUrl}
                alt=""
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  const target = e.currentTarget;
                  const fallback = getDiceBearAvatarUrl(winner.avatar_seed || winner.discord_name, (winner.avatar_style as any) || 'botttsNeutral');
                  if (target.src !== fallback) target.src = fallback;
                }}
                className="w-8 h-8 rounded-full object-cover border border-amber-500/50 shadow-md shrink-0 group-hover/user:border-amber-400 transition-colors"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-white truncate group-hover/user:text-amber-400 transition-colors">
                    {effectiveName}
                  </span>
                  <ChampionBadge winCount={userWinCount} size="sm" showLabel={false} />
                </div>
                <span className="text-[9px] font-mono text-white/40 uppercase truncate group-hover/user:text-amber-400/80 transition-colors">
                  @{winner.discord_name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onShare(winner)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 cursor-pointer"
                title="Share entry"
              >
                <Share2 size={14} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onDownload(winner)}
                className="w-8 h-8 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 cursor-pointer"
                title="Download winning photo"
              >
                <Download size={14} />
              </Button>
            </div>
          </div>
        </div>
      </MagicCard>
    </div>
  );
});

WinnerCard.displayName = 'WinnerCard';

export function ArchivedWinnersView({ currentUser, onClose }: ArchivedWinnersViewProps) {
  const [winners, setWinners] = useState<ArchivedWinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContest, setSelectedContest] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'my-wins'>('all');
  const [selectedUserFilter, setSelectedUserFilter] = useState<UserFilterState | null>(null);
  const [selectedWinnerPhoto, setSelectedWinnerPhoto] = useState<ArchivedWinner | null>(null);
  const [shareWinner, setShareWinner] = useState<ArchivedWinner | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

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

        if (fetchedWinners.length > 0) {
          // Check URL search parameters for shared photo deep link
          const params = new URLSearchParams(window.location.search);
          const shareId = params.get('photo') || params.get('archive') || params.get('winner');
          
          if (shareId) {
            const matchedWinner = fetchedWinners.find(w => w.id === shareId);
            if (matchedWinner) {
              setSelectedWinnerPhoto(matchedWinner);
              setSelectedContest(matchedWinner.contest_name);
            } else if (!selectedContest) {
              setSelectedContest(fetchedWinners[0].contest_name);
            }
          } else if (!selectedContest) {
            setSelectedContest(fetchedWinners[0].contest_name);
          }
        }
      } catch (error) {
        console.error("Error fetching archived winners:", error);
        toast.error("Failed to load Hall of Fame archives.");
      } finally {
        setLoading(false);
      }
    };

    fetchWinners();
  }, []);

  // Compute list of contests
  const contests = useMemo(() => {
    return Array.from(new Set(winners.map(w => w.contest_name)));
  }, [winners]);

  // Compute map of total win counts per user (deduplicated per document)
  const winnerWinsMap = useMemo(() => {
    const map = new Map<string, number>();
    winners.forEach(w => {
      const docKeys = new Set<string>();
      if (w.discord_name) docKeys.add(w.discord_name.toLowerCase().trim());
      if (w.player_name) docKeys.add(w.player_name.toLowerCase().trim());
      if (w.user_id) docKeys.add(w.user_id);

      docKeys.forEach(key => {
        map.set(key, (map.get(key) || 0) + 1);
      });
    });
    return map;
  }, [winners]);

  // User's own winning entries with multi-identifier matching
  const userWinningEntries = useMemo(() => {
    if (!currentUser) return [];
    
    const userIdentifiers = new Set<string>();
    
    if (currentUser.uid) userIdentifiers.add(currentUser.uid);
    if (currentUser.displayName) userIdentifiers.add(currentUser.displayName.toLowerCase().trim());
    if (currentUser.email) userIdentifiers.add(currentUser.email.split('@')[0].toLowerCase().trim());
    
    if (currentUser.providerData && Array.isArray(currentUser.providerData)) {
      currentUser.providerData.forEach((p: any) => {
        if (p.displayName) userIdentifiers.add(p.displayName.toLowerCase().trim());
        if (p.email) userIdentifiers.add(p.email.split('@')[0].toLowerCase().trim());
      });
    }

    const storedDiscord = localStorage.getItem('fivem_discord_name');
    if (storedDiscord) userIdentifiers.add(storedDiscord.toLowerCase().trim());
    const storedPlayer = localStorage.getItem('fivem_player_name');
    if (storedPlayer) userIdentifiers.add(storedPlayer.toLowerCase().trim());

    return winners.filter(w => {
      if (w.user_id && userIdentifiers.has(w.user_id)) return true;
      if (w.discord_name && userIdentifiers.has(w.discord_name.toLowerCase().trim())) return true;
      if (w.player_name && userIdentifiers.has(w.player_name.toLowerCase().trim())) return true;
      return false;
    });
  }, [currentUser, winners]);

  // Display name resolution: priority to logged in user's custom display name if matching
  const resolveDisplayName = useCallback((winner: ArchivedWinner) => {
    if (currentUser && !currentUser.isAnonymous) {
      const currentUid = currentUser.uid;
      const currentName = currentUser.displayName?.toLowerCase().trim();
      const currentDiscord = localStorage.getItem('fivem_discord_name')?.toLowerCase().trim();
      const currentPlayer = localStorage.getItem('fivem_player_name')?.toLowerCase().trim();
      const wName = winner.discord_name?.toLowerCase().trim();
      const wPlayer = winner.player_name?.toLowerCase().trim();

      const isMatch =
        (currentUid && winner.user_id === currentUid) ||
        (currentName && (wName === currentName || wPlayer === currentName)) ||
        (currentDiscord && (wName === currentDiscord || wPlayer === currentDiscord)) ||
        (currentPlayer && (wName === currentPlayer || wPlayer === currentPlayer));

      if (isMatch && currentUser.displayName && currentUser.displayName.trim()) {
        return currentUser.displayName;
      }
    }
    return winner.player_name || winner.discord_name;
  }, [currentUser]);

  // Resolution helper: Priority to Discord OAuth photoURL if available for user or winner
  const resolveAvatarUrl = useCallback((winner: ArchivedWinner) => {
    // 1. Direct photo URL on winner record
    if (winner.user_photo_url && winner.user_photo_url.trim()) {
      return winner.user_photo_url;
    }
    
    // 2. If logged in user matches winner, check logged in user's photoURL (official Discord OAuth picture)
    if (currentUser && !currentUser.isAnonymous) {
      const currentUid = currentUser.uid;
      const currentName = currentUser.displayName?.toLowerCase().trim();
      const currentDiscord = localStorage.getItem('fivem_discord_name')?.toLowerCase().trim();
      const currentPlayer = localStorage.getItem('fivem_player_name')?.toLowerCase().trim();
      const wName = winner.discord_name?.toLowerCase().trim();
      const wPlayer = winner.player_name?.toLowerCase().trim();

      const isMatch =
        (currentUid && winner.user_id === currentUid) ||
        (currentName && (wName === currentName || wPlayer === currentName)) ||
        (currentDiscord && (wName === currentDiscord || wPlayer === currentDiscord)) ||
        (currentPlayer && (wName === currentPlayer || wPlayer === currentPlayer));

      if (isMatch && currentUser.photoURL && currentUser.photoURL.trim()) {
        return currentUser.photoURL;
      }
    }

    // 3. Fallback to DiceBear deterministically
    return getProfileAvatar(winner.user_photo_url, winner.avatar_seed || winner.user_id || winner.discord_name, (winner.avatar_style as any) || 'botttsNeutral');
  }, [currentUser]);

  // Filter displayed winners by selected contest, user filter, filter mode, and search query
  const displayedWinners = useMemo(() => {
    let result = winners;

    if (selectedUserFilter) {
      const dName = selectedUserFilter.displayName.toLowerCase().trim();
      const discName = selectedUserFilter.discordName.toLowerCase().trim();
      const uId = selectedUserFilter.userId;

      result = winners.filter(w =>
        (uId && w.user_id === uId) ||
        (w.discord_name && w.discord_name.toLowerCase().trim() === discName) ||
        (w.player_name && w.player_name.toLowerCase().trim() === dName) ||
        (w.discord_name && w.discord_name.toLowerCase().trim() === dName) ||
        (w.player_name && w.player_name.toLowerCase().trim() === discName)
      );
    } else if (filterMode === 'my-wins') {
      result = userWinningEntries;
    } else if (selectedContest) {
      result = winners.filter(w => w.contest_name === selectedContest);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(w =>
        w.player_name.toLowerCase().includes(q) ||
        w.discord_name.toLowerCase().includes(q) ||
        w.category_name.toLowerCase().includes(q) ||
        w.caption.toLowerCase().includes(q) ||
        w.contest_name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [winners, filterMode, selectedContest, searchQuery, userWinningEntries, selectedUserFilter]);

  const handleDownload = useCallback(async (winner: ArchivedWinner) => {
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
  }, []);

  const handleShare = useCallback((winner: ArchivedWinner) => {
    setShareWinner(winner);
  }, []);

  const handleUserClick = useCallback((winner: ArchivedWinner) => {
    const customName = resolveDisplayName(winner);
    setSelectedUserFilter({
      displayName: customName,
      discordName: winner.discord_name,
      userId: winner.user_id
    });
    toast.info(`Filtering Hall of Fame entries by photographer: ${customName}`);
  }, [resolveDisplayName]);

  const handleInspect = useCallback((winner: ArchivedWinner) => {
    setSelectedWinnerPhoto(winner);
  }, []);

  return (
    <div className="fixed inset-0 z-[150] bg-[#060608] flex flex-col overflow-y-scroll text-white pattern-bg scrollbar-gutter-stable transform-gpu">
      {/* Background Ambient Particles (Optimized quantity=20 for 60fps performance) */}
      <Particles
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        quantity={20}
        color="#ea580c"
        staticity={50}
        size={0.6}
      />

      {/* Header Bar */}
      <header className="relative z-20 shrink-0 border-b border-white/[0.08] bg-black/70 backdrop-blur-2xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all hover:-translate-x-1 cursor-pointer"
            >
              <ArrowLeft size={18} />
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Trophy size={18} className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black font-display tracking-wide leading-none text-white flex items-center gap-2">
                  <SparklesText text="Hall of Fame Vault" sparklesCount={4} colors={{ first: "#f59e0b", second: "#fbbf24" }} />
                </h1>
                <p className="text-[10px] text-white/40 font-mono mt-1 uppercase tracking-widest flex items-center gap-2">
                  <span>Immortalized Champions</span>
                  <span className="w-1 h-1 rounded-full bg-amber-400" />
                  <span>{contests.length} Archives</span>
                  <span className="w-1 h-1 rounded-full bg-amber-400" />
                  <span>{winners.length} Winners</span>
                </p>
              </div>
            </div>
          </div>

          {/* Quick Filters: All Archives vs My Victories */}
          <div className="flex items-center gap-2">
            {currentUser && !currentUser.isAnonymous && (
              <button
                onClick={() => {
                  setSelectedUserFilter(null);
                  setFilterMode(filterMode === 'my-wins' ? 'all' : 'my-wins');
                }}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold font-display uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer border shadow-md",
                  filterMode === 'my-wins' && !selectedUserFilter
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-300 shadow-amber-500/30"
                    : "bg-white/[0.05] hover:bg-white/[0.12] border-white/15 text-white/80"
                )}
              >
                <Crown size={14} className={filterMode === 'my-wins' && !selectedUserFilter ? 'text-white' : 'text-amber-400'} />
                <span>My Victories ({userWinningEntries.length})</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative z-10">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white/30 space-y-4">
            <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <p className="font-mono text-xs uppercase tracking-widest">Opening Hall of Fame Vault...</p>
          </div>
        ) : winners.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6">
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
            {/* Sidebar: Contest Selector Track */}
            <div className="w-full md:w-64 lg:w-72 shrink-0 border-r border-white/[0.08] bg-black/40 backdrop-blur-md overflow-y-auto p-4 space-y-3">
              <div className="px-2 mb-2 flex items-center justify-between">
                <h3 className="text-[10px] font-mono font-bold text-amber-400/80 uppercase tracking-[0.2em]">Select Vault</h3>
                <span className="text-[10px] font-mono text-white/30">{contests.length} contest(s)</span>
              </div>

              {/* Contest Buttons */}
              <div className="space-y-1.5">
                {contests.map((contest) => (
                  <button
                    key={contest}
                    onClick={() => {
                      setSelectedContest(contest);
                      setFilterMode('all');
                      setSelectedUserFilter(null);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-2xl transition-all duration-200 flex items-center justify-between group cursor-pointer border",
                      selectedContest === contest && filterMode === 'all' && !selectedUserFilter
                        ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 border-amber-500/40 text-white shadow-[0_0_20px_rgba(245,158,11,0.15)] font-bold"
                        : "hover:bg-white/[0.04] text-white/50 border-transparent hover:border-white/10 hover:text-white"
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-xs truncate font-display">{contest}</p>
                      <p className="text-[10px] font-mono text-white/30 mt-0.5">
                        {winners.filter(w => w.contest_name === contest).length} Champions
                      </p>
                    </div>
                    <Trophy size={14} className={cn("shrink-0 transition-opacity", selectedContest === contest && filterMode === 'all' && !selectedUserFilter ? "text-amber-400 opacity-100" : "opacity-0 group-hover:opacity-40")} />
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block px-1">Search Champions</span>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, category..."
                    className="pl-8 h-9 text-xs bg-black/60 border-white/15 focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Main Winner Cards Grid Container */}
            <div className="flex-1 overflow-y-scroll px-4 py-6 relative bg-[#060608]/90 scrollbar-gutter-stable transform-gpu">
              <div className="max-w-[1400px] mx-auto space-y-6">
                
                {/* Active Photographer Filter Pill if user clicked a username */}
                {selectedUserFilter && (
                  <div className="flex items-center justify-between gap-3 bg-amber-500/15 border border-amber-500/30 px-4 py-2.5 rounded-2xl text-xs font-bold text-amber-300 backdrop-blur-md shadow-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <User size={15} className="text-amber-400 shrink-0" />
                      <span className="truncate">
                        Viewing winning entries from <strong className="text-white font-display uppercase tracking-wide">{selectedUserFilter.displayName}</strong> (@{selectedUserFilter.discordName})
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedUserFilter(null)}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 hover:text-white transition-colors cursor-pointer text-[11px] font-mono uppercase flex items-center gap-1 shrink-0"
                      title="Clear photographer filter"
                    >
                      <X size={13} /> Clear Filter
                    </button>
                  </div>
                )}

                {/* Header Title */}
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-400 font-bold block mb-1">
                      {selectedUserFilter ? 'Photographer Portfolio' : filterMode === 'my-wins' ? 'Your Personal Vault' : 'Archived Vault Record'}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white flex items-center gap-3">
                      {selectedUserFilter ? selectedUserFilter.displayName : filterMode === 'my-wins' ? 'Your Winning Entries' : selectedContest}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-mono text-white/60">
                    <Flame size={14} className="text-amber-400" />
                    <span>{displayedWinners.length} Hall of Fame Entries</span>
                  </div>
                </div>

                {/* Empty State for Filters */}
                {displayedWinners.length === 0 ? (
                  <div className="py-20 text-center space-y-3 bg-white/[0.02] border border-white/[0.06] rounded-3xl">
                    <Trophy size={36} className="mx-auto text-white/20" />
                    <p className="text-sm font-bold text-white/60">
                      {selectedUserFilter ? `No winning entries found for ${selectedUserFilter.displayName}.` : filterMode === 'my-wins' ? "You haven't won any contest categories yet." : "No winning entries match your search."}
                    </p>
                    <p className="text-xs text-white/30">Submit your best shots to earn a spot in the Hall of Fame!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {displayedWinners.map((winner) => {
                      const userWinCount = Math.max(
                        winnerWinsMap.get(winner.discord_name?.toLowerCase()?.trim() || '') || 0,
                        winnerWinsMap.get(winner.player_name?.toLowerCase()?.trim() || '') || 0,
                        winnerWinsMap.get(winner.user_id || '') || 0,
                        1
                      );
                      const avatarUrl = resolveAvatarUrl(winner);
                      const customName = resolveDisplayName(winner);

                      return (
                        <WinnerCard
                          key={winner.id}
                          winner={winner}
                          userWinCount={userWinCount}
                          avatarUrl={avatarUrl}
                          displayName={customName}
                          onInspect={handleInspect}
                          onUserClick={handleUserClick}
                          onShare={handleShare}
                          onDownload={handleDownload}
                        />
                      );
                    })}
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── WINNING PHOTO LIGHTBOX MODAL ── */}
      <AnimatePresence>
        {selectedWinnerPhoto && (
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6" onClick={() => setSelectedWinnerPhoto(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full bg-[#0a0a0e] border border-amber-500/40 rounded-3xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.95)] flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 px-6 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-3">
                  <Trophy className="text-amber-400" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-white">{selectedWinnerPhoto.contest_name} Winner</h3>
                    <p className="text-[10px] text-amber-400/80 font-mono uppercase tracking-wider">{selectedWinnerPhoto.category_name} Category</p>
                  </div>
                </div>
                <button onClick={() => setSelectedWinnerPhoto(null)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer">
                  ✕
                </button>
              </div>

              {/* Photo Stage */}
              <div className="relative flex-1 bg-black/80 flex items-center justify-center p-4 min-h-[300px] max-h-[60vh] overflow-hidden">
                <img src={selectedWinnerPhoto.image_url} alt="" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
              </div>

              {/* Footer details */}
              <div className="p-5 bg-[#0f0f14] border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div
                  className="flex items-center gap-3 cursor-pointer group/user hover:opacity-90 transition-opacity"
                  onClick={() => {
                    handleUserClick(selectedWinnerPhoto);
                    setSelectedWinnerPhoto(null);
                  }}
                  title={`View all winning entries from ${resolveDisplayName(selectedWinnerPhoto)}`}
                >
                  <img
                    src={resolveAvatarUrl(selectedWinnerPhoto)}
                    alt=""
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallback = getDiceBearAvatarUrl(selectedWinnerPhoto.avatar_seed || selectedWinnerPhoto.discord_name, (selectedWinnerPhoto.avatar_style as any) || 'botttsNeutral');
                      if (target.src !== fallback) target.src = fallback;
                    }}
                    className="w-10 h-10 rounded-full object-cover border-2 border-amber-500/40 group-hover/user:border-amber-400 transition-colors"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-display group-hover/user:text-amber-400 transition-colors">{resolveDisplayName(selectedWinnerPhoto)}</span>
                      <ChampionBadge winCount={winnerWinsMap.get(selectedWinnerPhoto.discord_name?.toLowerCase()?.trim() || '') || 1} size="sm" />
                    </div>
                    <p className="text-xs text-white/60 italic">"{selectedWinnerPhoto.caption || 'No caption'}"</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                  <Button
                    onClick={() => handleShare(selectedWinnerPhoto)}
                    className="h-10 px-4 bg-white/10 hover:bg-white/20 text-white font-bold font-display rounded-xl flex items-center gap-2 border border-white/15 cursor-pointer"
                  >
                    <Share2 size={15} /> Share
                  </Button>
                  <Button
                    onClick={() => handleDownload(selectedWinnerPhoto)}
                    className="h-10 px-5 bg-amber-500 hover:bg-amber-600 text-black font-bold font-display rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    <Download size={15} /> Download
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ENHANCED SHARE WINNER ENTRY MODAL ── */}
      <AnimatePresence>
        {shareWinner && (
          <div className="fixed inset-0 z-[220] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShareWinner(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-md w-full bg-[#0d0d12] border border-amber-500/40 rounded-3xl p-6 shadow-[0_24px_80px_rgba(0,0,0,0.9)] space-y-5 text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                    <Share2 size={16} className="text-amber-400" />
                  </div>
                  <h3 className="text-base font-bold font-display">Share Winning Entry</h3>
                </div>
                <button onClick={() => setShareWinner(null)} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              {/* Winner Card Preview Strip */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                <img src={shareWinner.image_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{resolveDisplayName(shareWinner)}</p>
                  <p className="text-[10px] text-amber-400 font-mono uppercase">{shareWinner.contest_name} • {shareWinner.category_name}</p>
                  <p className="text-[11px] text-white/50 italic truncate mt-0.5">"{shareWinner.caption || 'No caption'}"</p>
                </div>
              </div>

              {/* Option 1: Copy Link Button */}
              <Button
                onClick={() => {
                  const url = `${window.location.origin}/?photo=${shareWinner.id}`;
                  navigator.clipboard.writeText(url);
                  setCopiedShareId(shareWinner.id);
                  toast.success("Link copied to clipboard!");
                  setTimeout(() => setCopiedShareId(null), 2500);
                }}
                className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-black font-bold font-display rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {copiedShareId === shareWinner.id ? (
                  <>
                    <Check size={16} className="text-black" />
                    <span>Link Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copy Link to Clipboard</span>
                  </>
                )}
              </Button>

              {/* Option 2: Selectable Text Box with Copy Button */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-white/40 tracking-wider block">Or copy link directly from text box:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?photo=${shareWinner.id}`}
                    onClick={(e) => e.currentTarget.select()}
                    className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-amber-300 select-all focus:outline-none focus:border-amber-400"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const url = `${window.location.origin}/?photo=${shareWinner.id}`;
                      navigator.clipboard.writeText(url);
                      setCopiedShareId(shareWinner.id);
                      toast.success("Link copied!");
                      setTimeout(() => setCopiedShareId(null), 2500);
                    }}
                    className="h-9 px-3 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                  >
                    {copiedShareId === shareWinner.id ? <Check size={14} className="text-amber-400" /> : <Copy size={14} />}
                  </Button>
                </div>
              </div>

              {/* Option 3: Twitter / X Share Shortcut */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this winning entry by ${resolveDisplayName(shareWinner)} on Vital RP Photo Contest!`)}&url=${encodeURIComponent(`${window.location.origin}/?photo=${shareWinner.id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white/80 hover:text-white flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer"
              >
                <ExternalLink size={14} className="text-amber-400" />
                <span>Share on Twitter / X</span>
              </a>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
