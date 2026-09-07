import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flame,
  TrendingUp,
  Shield,
  ShieldCheck,
  Share2,
  RefreshCw,
  MessageSquarePlus,
  X,
  Layers,
  User,
  History,
  Check,
  Award,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  ChevronRight,
  Heart,
  HelpCircle,
  LogIn
} from 'lucide-react';
import { toast } from './ui/toast';
import { cn } from '../lib/utils';
import { CategorySuggestion } from '../types';
import {
  fetchCategorySuggestions,
  subscribeCategorySuggestions,
  submitCategorySuggestion,
  castCategorySuggestionVote,
  deleteCategorySuggestion,
  fetchSuggestionVoters,
  fetchUserSuggestionCount,
  sortSuggestions,
  SuggestionVoter
} from '../lib/suggestionsService';
import { getProfileAvatar, getDiceBearAvatarUrl } from '../lib/dicebear';
import { checkUserDiscordEligibility } from '../lib/discord';
import { SITE_CONFIG, MAX_CATEGORY_SUGGESTIONS_PER_USER, VITAL_RP_LOGO_URL } from '../config';
import { Spotlight } from './ui/spotlight';
import { DotPattern } from './ui/dot-pattern';
import { NumberTicker } from './ui/number-ticker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Skeleton } from './ui/skeleton';
import { CreatorPill } from './ui/CreatorPill';

export type SuggestionFilterOption = 'most_votes' | 'newest' | 'my_suggestions' | 'voted_by_me';

export interface CategorySuggestionsViewProps {
  currentUser?: any | null;
  isAdmin: boolean;
  isStandalonePage?: boolean;
  onClose?: () => void;
  onOpenSignIn: () => void;
  onNavigateAdmin?: () => void;
  onOpenProfile?: () => void;
}

interface HoveredVotersState {
  suggestionId: string;
  loading: boolean;
  voters: SuggestionVoter[];
}

export function CategorySuggestionsView({
  currentUser,
  isAdmin,
  isStandalonePage = false,
  onClose,
  onOpenSignIn,
  onNavigateAdmin,
  onOpenProfile
}: CategorySuggestionsViewProps) {
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterOption, setFilterOption] = useState<SuggestionFilterOption>('most_votes');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [highlightedSuggestionId, setHighlightedSuggestionId] = useState<string | null>(null);

  // Form State
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // User suggestion count tracking
  const [userSubmittedCount, setUserSubmittedCount] = useState(0);

  // Delete confirmation modal
  const [deletingSuggestionId, setDeletingSuggestionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Voting optimistic state locks
  const [votingLocks, setVotingLocks] = useState<Record<string, boolean>>({});

  // Voter breakdown hover state & memory cache
  const [hoveredVoters, setHoveredVoters] = useState<HoveredVotersState | null>(null);
  const [votersCache, setVotersCache] = useState<Record<string, { upvoters: SuggestionVoter[]; downvoters: SuggestionVoter[] }>>({});

  const effectiveUserId = currentUser?.uid || currentUser?.id || currentUser?.discordId || null;
  const maxAllowedSuggestions = SITE_CONFIG.categorySuggestions.maxSuggestionsPerUser || MAX_CATEGORY_SUGGESTIONS_PER_USER;

  // ── Multi-fallback Clipboard Copy Helper ──
  const copyToClipboard = useCallback(async (text: string, title?: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      toast.success('Link Copied to Clipboard!', {
        description: title ? `Direct link to "${title}" copied.` : 'You can share this suggestion with others.'
      });
    } catch (err) {
      console.error('Copy to clipboard failed:', err);
      window.prompt('Copy suggestion link:', text);
    }
  }, []);

  // ── Deep Link Parameter Detection ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('suggestion') || params.get('idea');
    if (targetId) {
      setHighlightedSuggestionId(targetId);
    }
  }, []);

  // ── Smooth Scroll & Temporary Highlight for Deep Link ──
  useEffect(() => {
    if (highlightedSuggestionId && suggestions.length > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`suggestion-${highlightedSuggestionId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);

      const fadeTimer = setTimeout(() => {
        setHighlightedSuggestionId(null);
      }, 3500);

      return () => {
        clearTimeout(timer);
        clearTimeout(fadeTimer);
      };
    }
  }, [highlightedSuggestionId, suggestions]);

  // ── Real-time Subscription to Category Suggestions ──
  useEffect(() => {
    setLoading(true);

    const unsubscribe = subscribeCategorySuggestions(
      effectiveUserId,
      (data) => {
        setSuggestions(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to category suggestions:', err);
        fetchCategorySuggestions(effectiveUserId)
          .then((data) => setSuggestions(data))
          .catch((fetchErr) => console.error('Fallback fetch error:', fetchErr))
          .finally(() => setLoading(false));
      }
    );

    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => {
      unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, [effectiveUserId]);

  // ── Refresh user's suggestion count ──
  const refreshUserCount = useCallback(async () => {
    if (effectiveUserId) {
      const count = await fetchUserSuggestionCount(effectiveUserId, currentUser?.discordId);
      setUserSubmittedCount(count);
    } else {
      setUserSubmittedCount(0);
    }
  }, [effectiveUserId, currentUser?.discordId]);

  useEffect(() => {
    refreshUserCount();
  }, [refreshUserCount, suggestions]);

  const loadSuggestions = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchCategorySuggestions(effectiveUserId);
      setSuggestions(data);
      await refreshUserCount();
      toast.success('Suggestions refreshed');
    } catch (err: any) {
      console.error('Error refreshing suggestions:', err);
      toast.error('Failed to refresh category suggestions');
    } finally {
      setRefreshing(false);
    }
  }, [effectiveUserId, refreshUserCount]);

  // ── Eligibility Check Wrapper Before Suggesting ──
  const handleOpenSuggestModal = async () => {
    if (!currentUser) {
      onOpenSignIn();
      return;
    }

    // Check user limit
    if (userSubmittedCount >= maxAllowedSuggestions && !isAdmin) {
      toast.error('Suggestion Limit Reached', {
        description: `You have already submitted ${maxAllowedSuggestions} of ${maxAllowedSuggestions} allowed category suggestions.`
      });
      return;
    }

    // Verify Discord Guild & Whitelist Approved Role
    const check = await checkUserDiscordEligibility(currentUser);
    if (!check.allowed) {
      toast.error('Discord Requirement Notice', {
        description: check.message || 'You must be a member of the Vital RP Discord and possess the Whitelist Approved role to participate.'
      });
      return;
    }

    setFormError(null);
    setIsSubmitModalOpen(true);
  };

  // ── Handle Submit New Suggestion ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!currentUser) {
      onOpenSignIn();
      return;
    }

    const trimmedName = categoryName.trim();
    const trimmedDesc = description.trim();

    if (!trimmedName) {
      setFormError('Category name is required.');
      return;
    }
    if (trimmedName.length < 3) {
      setFormError('Category name must be at least 3 characters.');
      return;
    }
    if (trimmedName.length > 100) {
      setFormError('Category name must be 100 characters or less.');
      return;
    }
    if (trimmedDesc.length > 1000) {
      setFormError('Description must be 1000 characters or less.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitCategorySuggestion({
        category_name: trimmedName,
        description: trimmedDesc,
        user_id: effectiveUserId || currentUser.uid,
        author_name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Community Member',
        discord_name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Discord User',
        discord_id: currentUser.discordId || null,
        author_avatar_url: currentUser.photoURL || null,
        author_discord_id: currentUser.discordId || null,
        avatar_seed: currentUser.avatarSeed || currentUser.uid,
        avatar_style: currentUser.avatarStyle || 'botttsNeutral',
        is_admin_author: isAdmin,
        status: 'open'
      });

      setCategoryName('');
      setDescription('');
      setIsSubmitModalOpen(false);
      await refreshUserCount();
      toast.success('Category suggestion submitted!', {
        description: `"${trimmedName}" is now open for community voting.`
      });
    } catch (err: any) {
      console.error('Submission failed:', err);
      const msg = err.message || "We couldn't submit your category suggestion. Please try again.";
      setFormError(msg);
      toast.error('Submission Notice', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Serialized concurrency maps to safeguard rapid voting
  const inFlightVotesRef = useRef<Map<string, boolean>>(new Map());
  const pendingDesiredVotesRef = useRef<Map<string, 1 | -1 | 0>>(new Map());

  // ── Reddit-Style Upvote / Downvote Mechanics with Instant Optimistic Updates & FLIP Reordering ──
  const handleVote = async (suggestionId: string, direction: 'up' | 'down') => {
    if (!currentUser) {
      toast.info('Discord Sign-In Required', {
        description: 'You must sign in with Discord before you can vote.'
      });
      onOpenSignIn();
      return;
    }

    // Verify eligibility
    const check = await checkUserDiscordEligibility(currentUser);
    if (!check.allowed) {
      toast.error('Voting Access Notice', {
        description: check.message || 'You must be whitelist approved in Vital RP Discord to vote on categories.'
      });
      return;
    }

    const target = suggestions.find((s) => s.id === suggestionId);
    if (!target) return;

    const currentVote = (target.user_vote || 0) as 1 | -1 | 0;
    let desiredVote: 1 | -1 | 0 = 0;

    if (direction === 'up') {
      desiredVote = currentVote === 1 ? 0 : 1;
    } else {
      desiredVote = currentVote === -1 ? 0 : -1;
    }

    // Optimistic calculation for upvotes, downvotes, and score
    let prevUpvotes = Math.max(0, target.upvotes || 0);
    let prevDownvotes = Math.max(0, target.downvotes || 0);
    let optUpvotes = prevUpvotes;
    let optDownvotes = prevDownvotes;

    // Remove old vote contribution
    if (currentVote === 1) optUpvotes = Math.max(0, optUpvotes - 1);
    if (currentVote === -1) optDownvotes = Math.max(0, optDownvotes - 1);

    // Apply new vote contribution
    if (desiredVote === 1) optUpvotes += 1;
    if (desiredVote === -1) optDownvotes += 1;

    const optScore = optUpvotes - optDownvotes;

    // Rollback snapshot
    const rollbackSnapshot = {
      user_vote: currentVote,
      upvotes: prevUpvotes,
      downvotes: prevDownvotes,
      score: target.score !== undefined ? target.score : prevUpvotes - prevDownvotes
    };

    // 1. Immediately apply optimistic state locally & re-sort if on Top
    setSuggestions((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== suggestionId) return s;
        return {
          ...s,
          user_vote: desiredVote,
          upvotes: optUpvotes,
          downvotes: optDownvotes,
          score: optScore
        };
      });

      if (filterOption === 'most_votes') {
        return sortSuggestions(updated, 'top');
      }
      return updated;
    });

    // Invalidate local voter cache for this suggestion
    setVotersCache((prev) => {
      const copy = { ...prev };
      delete copy[suggestionId];
      return copy;
    });

    // 2. Concurrency / Rapid Click Protection
    if (inFlightVotesRef.current.get(suggestionId)) {
      pendingDesiredVotesRef.current.set(suggestionId, desiredVote);
      return;
    }

    inFlightVotesRef.current.set(suggestionId, true);

    const executeVote = async (voteToCommit: 1 | -1 | 0) => {
      try {
        const res = await castCategorySuggestionVote(
          suggestionId,
          effectiveUserId || currentUser.uid,
          voteToCommit,
          currentUser?.discordId,
          currentUser?.displayName || currentUser?.email?.split('@')[0],
          currentUser?.photoURL || null,
          currentUser?.avatarSeed || currentUser?.uid,
          currentUser?.avatarStyle || 'botttsNeutral'
        );

        // If user queued a newer desired vote while the server request was in flight, process it
        if (pendingDesiredVotesRef.current.has(suggestionId)) {
          const queued = pendingDesiredVotesRef.current.get(suggestionId)!;
          pendingDesiredVotesRef.current.delete(suggestionId);
          if (queued !== voteToCommit) {
            await executeVote(queued);
            return;
          }
        }

        // Reconcile with authoritative database values
        setSuggestions((prev) => {
          const updated = prev.map((s) => {
            if (s.id !== suggestionId) return s;
            return {
              ...s,
              score: res.score,
              user_vote: res.user_vote,
              upvotes: res.upvotes,
              downvotes: res.downvotes,
              voters_sample: res.voters_sample || s.voters_sample
            };
          });

          if (filterOption === 'most_votes') {
            return sortSuggestions(updated, 'top');
          }
          return updated;
        });
      } catch (err: any) {
        console.error('Vote failed:', err);
        pendingDesiredVotesRef.current.delete(suggestionId);

        // Revert to rollback snapshot
        setSuggestions((prev) => {
          const reverted = prev.map((s) => {
            if (s.id !== suggestionId) return s;
            return {
              ...s,
              ...rollbackSnapshot
            };
          });

          if (filterOption === 'most_votes') {
            return sortSuggestions(reverted, 'top');
          }
          return reverted;
        });

        toast.error("Your vote couldn't be saved. Please try again.", {
          description: err.message || 'Database error occurred.'
        });
      } finally {
        inFlightVotesRef.current.set(suggestionId, false);
      }
    };

    await executeVote(desiredVote);
  };

  // ── Hover Voter Breakdown ──
  const handleHoverVoters = useCallback(async (suggestionId: string) => {
    const target = suggestions.find((s) => s.id === suggestionId);
    const inlined = target?.voters_sample;

    if (Array.isArray(inlined) && inlined.length > 0) {
      const upvoters: SuggestionVoter[] = inlined
        .filter((v) => v.vote === 1)
        .map((v) => ({
          userId: v.userId,
          discordId: v.discordId,
          discordName: v.discordName || 'Community Member',
          authorAvatarUrl: v.authorAvatarUrl,
          avatarSeed: v.avatarSeed || v.userId,
          avatarStyle: v.avatarStyle || 'botttsNeutral',
          vote: v.vote,
          updatedAt: v.updatedAt
        }));

      setHoveredVoters({
        suggestionId,
        loading: false,
        voters: upvoters
      });
      return;
    }

    if (votersCache[suggestionId]) {
      setHoveredVoters({
        suggestionId,
        loading: false,
        voters: votersCache[suggestionId].upvoters
      });
      return;
    }

    setHoveredVoters({
      suggestionId,
      loading: true,
      voters: []
    });

    try {
      const result = await fetchSuggestionVoters(suggestionId, inlined);
      setVotersCache((prev) => ({ ...prev, [suggestionId]: result }));
      setHoveredVoters((curr) => {
        if (curr && curr.suggestionId === suggestionId) {
          return {
            suggestionId,
            loading: false,
            voters: result.upvoters
          };
        }
        return curr;
      });
    } catch (err) {
      console.error('Error fetching voters on hover:', err);
      setHoveredVoters((curr) => (curr && curr.suggestionId === suggestionId ? { ...curr, loading: false } : null));
    }
  }, [suggestions, votersCache]);

  const handleLeaveVoters = useCallback(() => {
    setHoveredVoters(null);
  }, []);

  // Handle Delete Suggestion
  const confirmDelete = async () => {
    if (!deletingSuggestionId) return;
    setIsDeleting(true);
    try {
      await deleteCategorySuggestion(deletingSuggestionId);
      setSuggestions((prev) => prev.filter((s) => s.id !== deletingSuggestionId));
      await refreshUserCount();
      toast.success('Category suggestion deleted');
      setDeletingSuggestionId(null);
    } catch (err: any) {
      toast.error('Failed to delete suggestion', { description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Community Favorites Leaderboard (Top 3 Highest-Voted Categories) ──
  const communityFavorites = useMemo(() => {
    const valid = suggestions.filter((s) => s.status !== 'removed' && s.status !== 'rejected');
    return sortSuggestions(valid, 'top').slice(0, 3);
  }, [suggestions]);

  // ── Filtered & Sorted Suggestions ──
  const filteredSuggestions = useMemo(() => {
    let result = suggestions.filter((s) => s.status !== 'removed' && s.status !== 'rejected');

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.category_name.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          (s.author_name && s.author_name.toLowerCase().includes(q))
      );
    }

    // 2. Specific View Filters
    if (filterOption === 'my_suggestions') {
      result = result.filter(
        (s) =>
          (effectiveUserId && s.user_id === effectiveUserId) ||
          (currentUser?.discordId && (s.discord_id === currentUser.discordId || s.author_discord_id === currentUser.discordId))
      );
    } else if (filterOption === 'voted_by_me') {
      result = result.filter((s) => (s.user_vote || 0) !== 0);
    }

    // 3. Sorting
    if (filterOption === 'newest') {
      return [...result].sort((a, b) => {
        const timeA = new Date(a.created_at).getTime() || 0;
        const timeB = new Date(b.created_at).getTime() || 0;
        if (timeB !== timeA) return timeB - timeA;
        return b.id.localeCompare(a.id);
      });
    }

    // Default: Top (score = upvotes - downvotes)
    return sortSuggestions(result, 'top');
  }, [suggestions, searchQuery, filterOption, effectiveUserId, currentUser?.discordId]);

  // Aggregate Metrics
  const totalVotesCast = useMemo(() => {
    return suggestions.reduce((acc, s) => acc + (s.upvotes || 0) + (s.downvotes || 0), 0);
  }, [suggestions]);

  const remainingSuggestions = Math.max(0, maxAllowedSuggestions - userSubmittedCount);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div
      className={cn(
        "bg-[#050507] text-white flex flex-col w-full max-w-full transform-gpu",
        isStandalonePage
          ? "min-h-screen relative overflow-x-clip"
          : "fixed inset-0 z-[150] overflow-y-auto overflow-x-hidden"
      )}
    >
      {/* ── Ambient Background & Spotlight ── */}
      <div className="absolute inset-0 bg-[#060608] pointer-events-none" />
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="rgba(234, 88, 12, 0.22)" />
      <Spotlight className="top-40 right-0 h-[60vh] w-[45vw]" fill="rgba(251, 146, 60, 0.12)" />
      <DotPattern width={32} height={32} cr={0.8} className="opacity-[0.04] pointer-events-none" />

      {/* ── Navigation Bar ── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#09090b]/85 backdrop-blur-2xl px-4 sm:px-8 py-3.5 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {isStandalonePage ? (
            /* Standalone Page Brand Header */
            <div className="flex items-center gap-3">
              <img
                src={VITAL_RP_LOGO_URL}
                alt="Vital RP Logo"
                className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(234,88,12,0.6)]"
              />
              <div>
                <span className="text-white font-black font-display text-sm tracking-wide block leading-none">
                  Vital RP
                </span>
                <span className="text-fivem-orange/80 text-[10px] font-mono uppercase tracking-widest leading-none">
                  Category Voting Event
                </span>
              </div>
            </div>
          ) : (
            /* Modal Overlay Close Button */
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-white/80 hover:text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 group"
            >
              <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Return to Contest</span>
            </button>
          )}

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Admin Console Link (Staff Only) */}
            {isAdmin && (
              <button
                onClick={onNavigateAdmin || (() => window.location.assign('/admin'))}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-fivem-orange/15 hover:bg-fivem-orange/25 border border-fivem-orange/30 text-fivem-orange text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
                title="Go to Admin Management Console"
              >
                <ShieldCheck size={13} />
                <span>Admin Console</span>
              </button>
            )}

            {/* User Profile / Discord Sign-In Button */}
            {currentUser ? (
              <button
                type="button"
                onClick={onOpenProfile}
                disabled={!onOpenProfile}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 transition-all text-left",
                  onOpenProfile ? "hover:bg-white/[0.08] hover:border-white/20 cursor-pointer active:scale-95" : "cursor-default"
                )}
                title={onOpenProfile ? "Open Profile Settings" : undefined}
              >
                <img
                  src={getProfileAvatar(
                    currentUser.photoURL,
                    currentUser.avatarSeed || currentUser.uid,
                    currentUser.avatarStyle,
                    currentUser.avatarSource,
                    currentUser.discordPhotoURL
                  )}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover border border-white/10"
                />
                <span className="text-xs font-bold text-white/90 max-w-[110px] truncate hidden sm:inline">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
              </button>
            ) : (
              <button
                onClick={onOpenSignIn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-white/90 text-xs font-bold font-mono transition-all cursor-pointer"
              >
                <LogIn size={13} className="text-fivem-orange" />
                <span>Sign In</span>
              </button>
            )}

            {/* Primary Action: Suggest Category */}
            <button
              onClick={handleOpenSuggestModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500 hover:from-orange-500 hover:to-fivem-orange text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-[0_4px_16px_rgba(234,88,12,0.35)] hover:shadow-[0_6px_24px_rgba(234,88,12,0.5)] transition-all duration-300 active:scale-95"
            >
              <Plus size={15} />
              <span>Suggest Category</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Stage ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">
        {/* ── HERO SECTION ── */}
        <section className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-white/10">
          <div className="max-w-2xl">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md mb-4 text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Community Category Voting is Open</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight text-white mb-3">
              Help Pick the Next{' '}
              <span className="bg-gradient-to-r from-fivem-orange via-orange-400 to-amber-300 bg-clip-text text-transparent">
                Vital RP Photo Contest
              </span>
            </h1>

            {/* Description */}
            <p className="text-white/70 text-sm sm:text-base leading-relaxed">
              Suggest a category or vote for your favorites. The most popular ideas may become future Vital RP photo contests.
            </p>

            {/* User remaining counter notice when signed in */}
            {currentUser && (
              <div className="mt-3 flex items-center gap-2 text-xs font-mono text-white/50">
                <Sparkles size={12} className="text-fivem-orange" />
                <span>
                  You have <strong className="text-fivem-orange">{remainingSuggestions}</strong> of{' '}
                  <strong>{maxAllowedSuggestions}</strong> suggestions remaining.
                </span>
              </div>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 shrink-0 self-center sm:self-end">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-center min-w-[120px]">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">
                Total Ideas
              </span>
              <span className="text-xl font-black font-display text-white">
                <NumberTicker value={suggestions.length} />
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-center min-w-[120px]">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">
                Community Votes
              </span>
              <span className="text-xl font-black font-display text-fivem-orange">
                <NumberTicker value={totalVotesCast} />
              </span>
            </div>
          </div>
        </section>

        {/* ── COMMUNITY FAVORITES (COMPACT LEADERBOARD) ── */}
        {communityFavorites.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-amber-400" />
                <h2 className="text-sm font-black font-display uppercase tracking-wider text-white">
                  Community Favorites
                </h2>
              </div>
              <span className="text-[11px] font-mono text-white/40">
                Top voted proposals by the community
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {communityFavorites.map((fav, index) => {
                const medal = medals[index] || '🏅';
                return (
                  <motion.div
                    key={fav.id}
                    whileHover={{ y: -2 }}
                    onClick={() => {
                      setHighlightedSuggestionId(fav.id);
                      const el = document.getElementById(`suggestion-${fav.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between gap-3 relative overflow-hidden backdrop-blur-xl",
                      index === 0
                        ? "bg-gradient-to-br from-amber-500/[0.08] to-orange-500/[0.04] border-amber-500/30 hover:border-amber-500/50 shadow-[0_4px_20px_rgba(245,158,11,0.12)]"
                        : index === 1
                        ? "bg-gradient-to-br from-slate-300/[0.06] to-white/[0.02] border-white/15 hover:border-white/30"
                        : "bg-gradient-to-br from-orange-700/[0.08] to-amber-900/[0.03] border-orange-600/25 hover:border-orange-600/40"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0 select-none">{medal}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-black font-display text-white truncate group-hover:text-fivem-orange transition-colors">
                          {fav.category_name}
                        </p>
                        <p className="text-[10px] font-mono text-white/40 truncate">
                          {fav.description || 'Community suggestion'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-xs font-mono font-bold text-fivem-orange">
                      <ChevronUp size={13} strokeWidth={2.5} />
                      <span>{fav.score !== undefined ? (fav.score > 0 ? `+${fav.score}` : fav.score) : (fav.upvotes || 0)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── TOOLBAR: SEARCH & FILTERS ── */}
        <section className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category concepts or ideas..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 text-xs font-medium focus:outline-none focus:border-fivem-orange/60 focus:ring-1 focus:ring-fivem-orange/40 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills & Refresh Button */}
          <div className="flex items-center gap-2 self-end sm:self-auto overflow-x-auto pb-1 sm:pb-0 max-w-full">
            <div className="flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/10 shrink-0">
              {[
                { id: 'most_votes' as const, label: 'Top', icon: Flame },
                { id: 'newest' as const, label: 'New', icon: Clock },
                { id: 'my_suggestions' as const, label: 'My Suggestions', icon: User },
                { id: 'voted_by_me' as const, label: 'My Votes', icon: Check }
              ].map((tab) => {
                const Icon = tab.icon;
                const active = filterOption === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if ((tab.id === 'my_suggestions' || tab.id === 'voted_by_me') && !currentUser) {
                        toast.info('Sign In Required', {
                          description: `Sign in with Discord to view ${tab.label.toLowerCase()}.`
                        });
                        onOpenSignIn();
                        return;
                      }
                      setFilterOption(tab.id);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer select-none",
                      active
                        ? "bg-fivem-orange text-white shadow-sm"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={loadSuggestions}
              disabled={refreshing}
              title="Refresh suggestions"
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white/50 hover:text-white transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw size={15} className={cn(refreshing && "animate-spin text-fivem-orange")} />
            </button>
          </div>
        </section>

        {/* ── SUGGESTIONS FEED ── */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-6 rounded-3xl border border-white/10 bg-[#0d0d14]/70 backdrop-blur-md flex gap-5 items-start"
              >
                <Skeleton className="w-16 h-16 rounded-2xl shrink-0 bg-white/[0.07]" />
                <div className="flex-1 space-y-3 min-w-0">
                  <Skeleton className="w-1/3 h-5 rounded-lg bg-white/[0.08]" />
                  <Skeleton className="w-full h-10 rounded-xl bg-white/[0.05]" />
                  <Skeleton className="w-24 h-4 rounded-md bg-white/[0.06]" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSuggestions.length === 0 ? (
          /* ── Empty State ── */
          <div className="text-center py-20 px-6 rounded-3xl border border-white/10 bg-white/[0.015] backdrop-blur-sm max-w-lg mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-fivem-orange/15 border border-fivem-orange/30 flex items-center justify-center text-fivem-orange">
              <MessageSquarePlus size={28} />
            </div>
            <h3 className="text-lg font-black font-display text-white mb-2">
              {searchQuery
                ? 'No matching suggestions found'
                : filterOption === 'my_suggestions'
                ? 'You have not submitted any suggestions yet'
                : filterOption === 'voted_by_me'
                ? 'You have not voted on any categories yet'
                : 'No ideas yet 👀'}
            </h3>
            <p className="text-xs text-white/50 mb-6 leading-relaxed">
              {searchQuery
                ? `No suggestions matched "${searchQuery}". Try a different search term or clear the filter.`
                : filterOption === 'my_suggestions'
                ? 'Have an idea for a photo contest theme? Submit your concept today!'
                : filterOption === 'voted_by_me'
                ? 'Browse the suggestions below and vote for the categories you would love to see!'
                : 'Be the first person to suggest the next Vital RP photo contest category.'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer"
              >
                Clear Search
              </button>
            ) : (
              <button
                onClick={handleOpenSuggestModal}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-fivem-orange to-orange-500 text-xs font-black uppercase tracking-wider text-white hover:from-orange-500 hover:to-fivem-orange shadow-lg hover:shadow-[0_0_24px_rgba(234,88,12,0.4)] transition-all cursor-pointer active:scale-95"
              >
                Submit the First Suggestion
              </button>
            )}
          </div>
        ) : (
          /* ── Suggestion Cards List ── */
          <div className="space-y-4">
            {filteredSuggestions.map((suggestion) => {
              const userVote = (suggestion.user_vote || 0) as 1 | -1 | 0;
              const isUpvoted = userVote === 1;
              const isDownvoted = userVote === -1;
              const isAuthor =
                currentUser &&
                ((effectiveUserId && suggestion.user_id === effectiveUserId) ||
                  (currentUser?.discordId && (suggestion.discord_id === currentUser.discordId || suggestion.author_discord_id === currentUser.discordId)));
              const isSelected = suggestion.status === 'approved' || suggestion.status === 'selected';
              const canDelete = isAdmin || isAuthor;
              const isHighlighted = highlightedSuggestionId === suggestion.id;
              const score = suggestion.score !== undefined ? suggestion.score : ((suggestion.upvotes || 0) - (suggestion.downvotes || 0));

              // Display author name based on config
              const displayName =
                SITE_CONFIG.categorySuggestions.showSubmitterNames || isAdmin
                  ? suggestion.author_name || suggestion.discord_name || 'Community Member'
                  : 'Community Member';

              return (
                <motion.div
                  layout
                  layoutId={suggestion.id}
                  id={`suggestion-${suggestion.id}`}
                  key={suggestion.id}
                  transition={{
                    layout: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.2 }
                  }}
                  className={cn(
                    "group relative rounded-3xl border bg-[#0a0a0d]/90 transition-all duration-300 p-4 sm:p-6 backdrop-blur-xl shadow-lg flex gap-4 sm:gap-6 items-start",
                    isHighlighted
                      ? "border-fivem-orange/90 ring-2 ring-fivem-orange/80 shadow-[0_0_40px_rgba(234,88,12,0.4)] bg-fivem-orange/[0.08]"
                      : "border-white/10 hover:border-white/20 hover:shadow-xl"
                  )}
                >
                  {/* Left: Reddit-Style Vertical Vote Capsule */}
                  <div className="flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 shrink-0 select-none">
                    {/* Upvote Button (▲) */}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => handleVote(suggestion.id, 'up')}
                      disabled={votingLocks[suggestion.id]}
                      aria-label="Upvote category suggestion"
                      title={isUpvoted ? "Remove upvote" : "Upvote this category"}
                      className={cn(
                        "p-1.5 sm:p-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center",
                        isUpvoted
                          ? "bg-fivem-orange text-white shadow-[0_0_12px_rgba(234,88,12,0.5)]"
                          : "text-white/40 hover:text-fivem-orange hover:bg-white/[0.08]"
                      )}
                    >
                      <ChevronUp size={20} strokeWidth={isUpvoted ? 3 : 2.2} />
                    </motion.button>

                    {/* Numeric Score with Voter Hover Popover */}
                    <div
                      onMouseEnter={() => handleHoverVoters(suggestion.id)}
                      onMouseLeave={handleLeaveVoters}
                      className="relative py-1 px-1 sm:px-2 cursor-default flex flex-col items-center"
                    >
                      <span
                        className={cn(
                          "text-xs sm:text-sm font-black font-mono tracking-tight transition-colors duration-200",
                          isUpvoted
                            ? "text-fivem-orange font-black"
                            : isDownvoted
                            ? "text-blue-400 font-black"
                            : score > 0
                            ? "text-emerald-400"
                            : score < 0
                            ? "text-rose-400"
                            : "text-white/70"
                        )}
                      >
                        {score > 0 ? `+${score}` : score}
                      </span>

                      {/* Hovered Voters Popover */}
                      <AnimatePresence>
                        {hoveredVoters?.suggestionId === suggestion.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 w-56 p-3 rounded-2xl bg-[#0e0e13]/98 border border-white/15 shadow-[0_16px_36px_rgba(0,0,0,0.85)] backdrop-blur-2xl pointer-events-none"
                          >
                            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[11px] font-mono text-white/60">
                              <span>Recent Voters</span>
                              <span className="font-bold text-fivem-orange">
                                {suggestion.upvotes || 0} ▲ / {suggestion.downvotes || 0} ▼
                              </span>
                            </div>
                            {hoveredVoters.loading ? (
                              <div className="py-2 text-[10px] font-mono text-white/40 flex items-center justify-center gap-1.5">
                                <RefreshCw size={11} className="animate-spin text-fivem-orange" />
                                <span>Loading voters...</span>
                              </div>
                            ) : hoveredVoters.voters.length === 0 ? (
                              <p className="text-[10px] font-mono text-white/40 py-1">No upvotes recorded.</p>
                            ) : (
                              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                                {hoveredVoters.voters.slice(0, 15).map((voter) => (
                                  <div key={voter.userId} className="flex items-center gap-2 text-xs py-0.5">
                                    <img
                                      src={getProfileAvatar(voter.authorAvatarUrl, voter.discordId || voter.userId, voter.avatarStyle)}
                                      alt=""
                                      className="w-4 h-4 rounded-full object-cover border border-white/10 shrink-0"
                                    />
                                    <span className="text-[11px] font-bold text-white/90 truncate flex-1">
                                      {voter.discordName}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Downvote Button (▼) */}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => handleVote(suggestion.id, 'down')}
                      disabled={votingLocks[suggestion.id]}
                      aria-label="Downvote category suggestion"
                      title={isDownvoted ? "Remove downvote" : "Downvote this category"}
                      className={cn(
                        "p-1.5 sm:p-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center",
                        isDownvoted
                          ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.5)]"
                          : "text-white/40 hover:text-blue-400 hover:bg-white/[0.08]"
                      )}
                    >
                      <ChevronDown size={20} strokeWidth={isDownvoted ? 3 : 2.2} />
                    </motion.button>
                  </div>

                  {/* Middle / Right: Content Block & Action Tools */}
                  <div className="flex-1 min-w-0">
                    {/* Header Badges: Selected, Your Suggestion, Author attribution, Date */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap text-xs">
                      {/* Selected Badge */}
                      {isSelected && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/40 text-purple-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                          <Award size={12} className="text-purple-400" />
                          Selected by Staff
                        </span>
                      )}

                      {/* Your Suggestion Badge */}
                      {isAuthor && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-fivem-orange/15 border border-fivem-orange/30 text-fivem-orange text-[10px] font-mono font-bold uppercase tracking-wider">
                          <Sparkles size={11} />
                          Your Suggestion
                        </span>
                      )}

                      {/* Submitter Attribution */}
                      <span className="text-white/40 text-[11px] font-mono flex items-center gap-1">
                        <span>by</span>
                        <strong className="text-white/80">{displayName}</strong>
                      </span>

                      <span className="text-white/20 text-xs">•</span>
                      <span className="text-[11px] font-mono text-white/40">
                        {formatDate(suggestion.created_at)}
                      </span>
                    </div>

                    {/* Category Title */}
                    <h3 className="text-base sm:text-xl font-black font-display text-white mb-2 leading-tight group-hover:text-fivem-orange/95 transition-colors">
                      {suggestion.category_name}
                    </h3>

                    {/* Optional Description */}
                    {suggestion.description ? (
                      <p className="text-white/70 text-xs sm:text-sm leading-relaxed whitespace-pre-line break-words max-w-3xl">
                        {suggestion.description}
                      </p>
                    ) : (
                      <p className="text-white/30 text-xs italic">
                        No description provided.
                      </p>
                    )}

                    {/* Bottom Actions: Share and Moderate */}
                    <div className="mt-3.5 flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        {/* Share Direct Link Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const url = `${window.location.origin}${window.location.pathname}?suggestion=${suggestion.id}`;
                            copyToClipboard(url, suggestion.category_name);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/50 hover:text-white transition-all cursor-pointer text-xs flex items-center gap-1.5 font-mono"
                          title="Share link to this category idea"
                        >
                          <Share2 size={12} className="text-fivem-orange" />
                          <span className="text-[11px]">Share</span>
                        </button>
                      </div>

                      {/* Admin delete/moderation trigger */}
                      {canDelete && (
                        <button
                          onClick={() => setDeletingSuggestionId(suggestion.id)}
                          title={isAdmin && !isAuthor ? "Moderate this proposal" : "Delete your suggestion"}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider text-red-400/70 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
                        >
                          <Trash2 size={11} />
                          <span>{isAdmin && !isAuthor ? 'Moderate' : 'Delete'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── FOOTER: CREATOR CREDIT & BRANDING ── */}
      <footer className="mt-auto border-t border-white/10 bg-[#060608] py-8 px-4 sm:px-8 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <img
              src={VITAL_RP_LOGO_URL}
              alt="Vital RP Logo"
              className="w-6 h-6 object-contain"
            />
            <span className="text-white/60 text-xs font-mono">
              Vital RP Photo Contest Platform
            </span>
          </div>

          <CreatorPill />
        </div>
      </footer>

      {/* ── SUBMIT SUGGESTION MODAL ── */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-lg bg-[#0a0a0e]/98 border-white/15 text-white rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-2xl bg-fivem-orange/20 border border-fivem-orange/40 text-fivem-orange">
                <Sparkles size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-xl font-black text-white">
                  Suggest a Contest Category
                </DialogTitle>
                <DialogDescription className="text-xs text-white/50 font-mono">
                  Propose a new theme for the Vital RP community to vote on
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* User Allowance Notice */}
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs font-mono">
            <span className="text-white/60">Suggestions Remaining</span>
            <span className="font-bold text-fivem-orange">
              {remainingSuggestions} of {maxAllowedSuggestions}
            </span>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Category Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5 font-mono">
                Category Name <span className="text-fivem-orange">*</span>
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Midnight Street Racing, Sunset Over Mount Chiliad..."
                maxLength={100}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-fivem-orange/60 focus:ring-1 focus:ring-fivem-orange/40 transition-all font-semibold"
              />
              <div className="flex justify-end mt-1">
                <span className="text-[10px] font-mono text-white/30">{categoryName.length}/100</span>
              </div>
            </div>

            {/* Optional Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-white/70 font-mono">
                  Description
                </label>
                <span className="text-[10px] font-mono text-white/40">Optional</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what kind of screenshots or locations fit this category..."
                rows={3}
                maxLength={1000}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-fivem-orange/60 focus:ring-1 focus:ring-fivem-orange/40 transition-all resize-none leading-relaxed"
              />
              <div className="flex justify-end mt-1">
                <span className="text-[10px] font-mono text-white/30">{description.length}/1000</span>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !categoryName.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-fivem-orange to-orange-500 hover:from-orange-500 hover:to-fivem-orange text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-fivem-orange/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Suggestion</span>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      <Dialog open={!!deletingSuggestionId} onOpenChange={(open) => !open && setDeletingSuggestionId(null)}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-md bg-[#0a0a0e] border-white/15 text-white p-6 rounded-3xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-2">
              <Trash2 size={20} />
            </div>
            <DialogTitle className="font-display text-lg font-black text-white">
              Delete Suggestion?
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              This action will permanently delete this category suggestion and remove all associated votes.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-white/10">
            <button
              onClick={() => setDeletingSuggestionId(null)}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={isDeleting}
              className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-[0_0_16px_rgba(239,68,68,0.3)]"
            >
              {isDeleting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Confirm Delete</span>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CategorySuggestionsView;
