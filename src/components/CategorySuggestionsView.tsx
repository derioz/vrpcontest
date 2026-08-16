import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Sparkles,
  Plus,
  ArrowBigUp,
  ArrowBigDown,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flame,
  TrendingUp,
  TrendingDown,
  Shield,
  ShieldCheck,
  Share2,
  RefreshCw,
  MessageSquarePlus,
  X,
  Layers,
  User,
  SlidersHorizontal,
  ChevronDown,
  History,
  Check
} from 'lucide-react';
import { toast } from './ui/toast';
import { cn } from '../lib/utils';
import { CategorySuggestion, SuggestionSortOption } from '../types';
import {
  fetchCategorySuggestions,
  subscribeCategorySuggestions,
  submitCategorySuggestion,
  castCategorySuggestionVote,
  deleteCategorySuggestion,
  sortSuggestions,
  fetchSuggestionVoters,
  SuggestionVoter
} from '../lib/suggestionsService';
import { getProfileAvatar, getDiceBearAvatarUrl } from '../lib/dicebear';
import { Spotlight } from './ui/spotlight';
import { DotPattern } from './ui/dot-pattern';
import { NumberTicker } from './ui/number-ticker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

interface CategorySuggestionsViewProps {
  currentUser?: any | null;
  isAdmin: boolean;
  onClose: () => void;
  onOpenSignIn: () => void;
}

interface HoveredVotersState {
  suggestionId: string;
  type: 'up' | 'down';
  loading: boolean;
  voters: SuggestionVoter[];
}

export function CategorySuggestionsView({
  currentUser,
  isAdmin,
  onClose,
  onOpenSignIn
}: CategorySuggestionsViewProps) {
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SuggestionSortOption>('top');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [highlightedSuggestionId, setHighlightedSuggestionId] = useState<string | null>(null);

  // Form State
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation modal
  const [deletingSuggestionId, setDeletingSuggestionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Voting optimistic state locks
  const [votingLocks, setVotingLocks] = useState<Record<string, boolean>>({});

  // Display Order Stability Engine (Prevents card jumping/shuffling when many people vote)
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [autoReorder, setAutoReorder] = useState(false);

  // Voter breakdown hover state & memory cache
  const [hoveredVoters, setHoveredVoters] = useState<HoveredVotersState | null>(null);
  const [votersCache, setVotersCache] = useState<Record<string, { upvoters: SuggestionVoter[]; downvoters: SuggestionVoter[] }>>({});

  const effectiveUserId = currentUser?.uid || currentUser?.id || currentUser?.discordId || null;

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
      }, 3200);

      return () => {
        clearTimeout(timer);
        clearTimeout(fadeTimer);
      };
    }
  }, [highlightedSuggestionId, suggestions]);

  // ── High-Efficiency Real-time Subscription: Runs ONLY on user auth change (Zero reads on sort/filter clicks!) ──
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

  // Synchronize ordered IDs on sort tab switch or initial data arrival
  useEffect(() => {
    if (suggestions.length > 0) {
      const sorted = sortSuggestions(suggestions, sortBy);
      setOrderedIds(sorted.map((s) => s.id));
    }
  }, [sortBy]);

  // Initial load sync
  useEffect(() => {
    if (suggestions.length > 0 && orderedIds.length === 0) {
      const sorted = sortSuggestions(suggestions, sortBy);
      setOrderedIds(sorted.map((s) => s.id));
    }
  }, [suggestions]);

  // Compute how many items have shifted rank due to incoming background votes
  const pendingRankShifts = useMemo(() => {
    if (suggestions.length === 0 || orderedIds.length === 0 || autoReorder) return 0;
    const currentSorted = sortSuggestions(suggestions, sortBy).map((s) => s.id);
    let shifts = 0;
    for (let i = 0; i < currentSorted.length; i++) {
      if (currentSorted[i] !== orderedIds[i]) {
        shifts++;
      }
    }
    return shifts;
  }, [suggestions, orderedIds, sortBy, autoReorder]);

  // Apply new ranking order on user demand
  const handleApplyRanking = useCallback(() => {
    const sorted = sortSuggestions(suggestions, sortBy);
    setOrderedIds(sorted.map((s) => s.id));
    toast.success('Live rankings updated!', {
      description: 'Cards aligned with newest vote scores.'
    });
  }, [suggestions, sortBy]);

  const loadSuggestions = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchCategorySuggestions(effectiveUserId);
      setSuggestions(data);
    } catch (err: any) {
      console.error('Error refreshing suggestions:', err);
      toast.error('Failed to refresh category suggestions');
    } finally {
      setRefreshing(false);
    }
  }, [effectiveUserId]);

  // Handle Submit New Suggestion (1 Single Firestore Write)
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
    if (trimmedName.length > 100) {
      setFormError('Category name must be 100 characters or less.');
      return;
    }
    if (!trimmedDesc) {
      setFormError('Description is required.');
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
        status: 'active'
      });

      setCategoryName('');
      setDescription('');
      setIsSubmitModalOpen(false);
      toast.success('Category suggestion submitted!', {
        description: `"${trimmedName}" has been posted for community voting.`
      });
    } catch (err: any) {
      console.error('Submission failed:', err);
      setFormError(err.message || 'Failed to submit suggestion. Please try again.');
      toast.error('Submission failed', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Reddit-Style Voting Mechanics with Debounced Transaction ──
  const handleVote = async (suggestionId: string, requestedVote: 1 | -1) => {
    if (!currentUser) {
      toast.info('Sign in required', {
        description: 'You must be signed in to vote on category suggestions.'
      });
      onOpenSignIn();
      return;
    }

    if (votingLocks[suggestionId]) return;

    const target = suggestions.find((s) => s.id === suggestionId);
    if (!target) return;

    const currentVote = target.user_vote || 0;
    const newVote: 1 | -1 | 0 = currentVote === requestedVote ? 0 : requestedVote;

    // Calculate optimistic counts
    let optUpvotes = target.upvotes;
    let optDownvotes = target.downvotes;

    if (currentVote === 1) optUpvotes = Math.max(0, optUpvotes - 1);
    if (currentVote === -1) optDownvotes = Math.max(0, optDownvotes - 1);

    if (newVote === 1) optUpvotes += 1;
    if (newVote === -1) optDownvotes += 1;

    const optScore = optUpvotes - optDownvotes;

    // Optimistically update state
    setSuggestions((prev) =>
      prev.map((s) => {
        if (s.id !== suggestionId) return s;
        return {
          ...s,
          score: optScore,
          user_vote: newVote,
          upvotes: optUpvotes,
          downvotes: optDownvotes
        };
      })
    );

    setVotingLocks((prev) => ({ ...prev, [suggestionId]: true }));

    // Invalidate local voter cache for this suggestion
    setVotersCache((prev) => {
      const copy = { ...prev };
      delete copy[suggestionId];
      return copy;
    });

    try {
      const res = await castCategorySuggestionVote(
        suggestionId,
        effectiveUserId || currentUser.uid,
        newVote,
        currentUser?.discordId,
        currentUser?.displayName || currentUser?.email?.split('@')[0],
        currentUser?.photoURL || null,
        currentUser?.avatarSeed || currentUser?.uid,
        currentUser?.avatarStyle || 'botttsNeutral'
      );

      // Reconcile with server response & updated inlined voters sample
      setSuggestions((prev) =>
        prev.map((s) => {
          if (s.id !== suggestionId) return s;
          return {
            ...s,
            score: res.score,
            user_vote: res.user_vote,
            upvotes: res.upvotes,
            downvotes: res.downvotes,
            voters_sample: res.voters_sample || s.voters_sample
          };
        })
      );
    } catch (err: any) {
      console.error('Vote failed:', err);
      // Rollback on error
      setSuggestions((prev) =>
        prev.map((s) => {
          if (s.id !== suggestionId) return s;
          return target;
        })
      );
      toast.error('Failed to register vote', { description: err.message });
    } finally {
      setTimeout(() => {
        setVotingLocks((prev) => ({ ...prev, [suggestionId]: false }));
      }, 300);
    }
  };

  // ── Zero-Query In-Memory Hover Voter Breakdown ──
  const handleHoverVoters = useCallback(async (suggestionId: string, type: 'up' | 'down') => {
    const target = suggestions.find((s) => s.id === suggestionId);
    const inlined = target?.voters_sample;

    // 1. If suggestion already carries inlined sample, parse in 0ms with zero network requests!
    if (Array.isArray(inlined) && inlined.length > 0) {
      const upvoters: SuggestionVoter[] = [];
      const downvoters: SuggestionVoter[] = [];

      inlined.forEach((v) => {
        const item: SuggestionVoter = {
          userId: v.userId,
          discordId: v.discordId,
          discordName: v.discordName || 'Community Member',
          authorAvatarUrl: v.authorAvatarUrl,
          avatarSeed: v.avatarSeed || v.userId,
          avatarStyle: v.avatarStyle || 'botttsNeutral',
          vote: v.vote,
          updatedAt: v.updatedAt
        };
        if (v.vote === 1) upvoters.push(item);
        else if (v.vote === -1) downvoters.push(item);
      });

      setHoveredVoters({
        suggestionId,
        type,
        loading: false,
        voters: type === 'up' ? upvoters : downvoters
      });
      return;
    }

    // 2. Otherwise check local session cache
    if (votersCache[suggestionId]) {
      setHoveredVoters({
        suggestionId,
        type,
        loading: false,
        voters: type === 'up' ? votersCache[suggestionId].upvoters : votersCache[suggestionId].downvoters
      });
      return;
    }

    setHoveredVoters({
      suggestionId,
      type,
      loading: true,
      voters: []
    });

    try {
      const result = await fetchSuggestionVoters(suggestionId, inlined);
      setVotersCache((prev) => ({ ...prev, [suggestionId]: result }));
      setHoveredVoters((curr) => {
        if (curr && curr.suggestionId === suggestionId && curr.type === type) {
          return {
            suggestionId,
            type,
            loading: false,
            voters: type === 'up' ? result.upvoters : result.downvoters
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
      toast.success('Category suggestion deleted');
      setDeletingSuggestionId(null);
    } catch (err: any) {
      toast.error('Failed to delete suggestion', { description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── High-Performance In-Memory Stable Filtering & Ordering (0 Firestore reads!) ──
  const filteredSuggestions = useMemo(() => {
    // 1. If live autoReorder is enabled, directly use sorted suggestions
    if (autoReorder) {
      let result = [...suggestions];
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        result = result.filter(
          (s) =>
            s.category_name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            (s.author_name && s.author_name.toLowerCase().includes(q)) ||
            (s.discord_name && s.discord_name.toLowerCase().includes(q))
        );
      }
      return sortSuggestions(result, sortBy);
    }

    // 2. In stable order mode: arrange suggestions according to orderedIds to prevent jumping
    const suggestionMap = new Map<string, CategorySuggestion>(suggestions.map((s) => [s.id, s]));
    const result: CategorySuggestion[] = [];

    // Add in current stable order
    orderedIds.forEach((id) => {
      const item = suggestionMap.get(id);
      if (item) {
        result.push(item);
        suggestionMap.delete(id);
      }
    });

    // Add any newly arrived proposals not yet in orderedIds at the top/bottom
    suggestionMap.forEach((item: CategorySuggestion) => {
      if (sortBy === 'oldest') result.push(item);
      else result.unshift(item);
    });

    // Apply search filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return result.filter(
        (s) =>
          s.category_name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.author_name && s.author_name.toLowerCase().includes(q)) ||
          (s.discord_name && s.discord_name.toLowerCase().includes(q))
      );
    }

    return result;
  }, [suggestions, orderedIds, autoReorder, searchQuery, sortBy]);

  // Aggregate Metrics
  const totalVotesCast = useMemo(() => {
    return suggestions.reduce((acc, s) => acc + s.upvotes + s.downvotes, 0);
  }, [suggestions]);

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

  return (
    <div className="fixed inset-0 z-[150] bg-[#050507] text-white flex flex-col overflow-y-auto overflow-x-hidden w-full max-w-full transform-gpu scrollbar-gutter-stable">
      {/* ── Background Aesthetics ── */}
      <div className="absolute inset-0 bg-[#060608] pointer-events-none" />
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="rgba(234, 88, 12, 0.25)" />
      <Spotlight className="top-20 right-0 h-[60vh] w-[40vw]" fill="rgba(251, 146, 60, 0.12)" />
      <DotPattern width={32} height={32} cr={0.8} className="opacity-[0.05] pointer-events-none" />

      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#09090b]/85 backdrop-blur-2xl px-4 sm:px-8 py-3.5 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-white/80 hover:text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 group"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Return to Contest</span>
          </button>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fivem-orange/15 border border-fivem-orange/30 text-fivem-orange text-[10px] font-mono font-bold uppercase tracking-wider">
                <ShieldCheck size={12} />
                Admin Moderator Active
              </span>
            )}

            <button
              onClick={() => {
                if (!currentUser) {
                  onOpenSignIn();
                } else {
                  setIsSubmitModalOpen(true);
                }
              }}
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
        {/* Hero Section */}
        <section className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-white/10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-fivem-orange/30 bg-fivem-orange/10 backdrop-blur-md mb-4 text-xs font-mono font-bold text-fivem-orange uppercase tracking-widest">
              <Sparkles size={13} className="text-fivem-orange animate-pulse" />
              <span>Future Contest Brainstorm</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight text-white mb-3">
              Category <span className="bg-gradient-to-r from-fivem-orange via-orange-400 to-amber-300 bg-clip-text text-transparent">Suggestions</span>
            </h1>
            <p className="text-white/60 text-sm sm:text-base leading-relaxed">
              Have an exciting concept for the next Vital RP Photo Contest? Propose your ideas below, upvote your community favorites, and help shape upcoming competition themes.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="grid grid-cols-2 gap-3 shrink-0 self-center sm:self-end">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-center min-w-[120px]">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">Total Ideas</span>
              <span className="text-xl font-black font-display text-white">
                <NumberTicker value={suggestions.length} />
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-center min-w-[120px]">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">Votes Cast</span>
              <span className="text-xl font-black font-display text-fivem-orange">
                <NumberTicker value={totalVotesCast} />
              </span>
            </div>
          </div>
        </section>

        {/* ── Toolbar: Search, Sort & Real-time Stability Controls ── */}
        <section className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search suggestion concepts, keywords, or authors..."
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

          {/* Sort Tabs, Anti-Jitter Stability Toggle & Refresh */}
          <div className="flex items-center gap-2 self-end sm:self-auto overflow-x-auto pb-1 sm:pb-0 max-w-full">
            {/* Stable vs Live Stream Toggle */}
            <button
              onClick={() => {
                if (!autoReorder) {
                  handleApplyRanking();
                }
                setAutoReorder(!autoReorder);
              }}
              title={autoReorder ? "Switch to Stable Mode (locks positions to prevent cards moving during high voting traffic)" : "Switch to Live Auto-Glide (moves cards as votes change)"}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer select-none shrink-0 border",
                autoReorder
                  ? "bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-sm"
                  : "bg-white/[0.04] text-white/60 border-white/10 hover:text-white hover:bg-white/10"
              )}
            >
              {autoReorder ? (
                <>
                  <Flame size={13} className="text-amber-400 animate-pulse" />
                  <span>Live Stream</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={13} className="text-emerald-400" />
                  <span>Stable View</span>
                </>
              )}
            </button>

            {/* Sort Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/10 shrink-0">
              {[
                { id: 'top' as const, label: 'Top Score', icon: Flame },
                { id: 'newest' as const, label: 'Newest', icon: Clock },
                { id: 'lowest' as const, label: 'Lowest', icon: TrendingDown },
                { id: 'oldest' as const, label: 'Oldest', icon: History }
              ].map((tab) => {
                const Icon = tab.icon;
                const active = sortBy === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSortBy(tab.id)}
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
              onClick={() => {
                handleApplyRanking();
                loadSuggestions();
              }}
              disabled={refreshing}
              title="Refresh suggestions and apply latest rankings"
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white/50 hover:text-white transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw size={15} className={cn(refreshing && "animate-spin text-fivem-orange")} />
            </button>
          </div>
        </section>

        {/* ── Live Inbound Votes Notification Pill (Appears when cards have shifted rank in background) ── */}
        <AnimatePresence>
          {pendingRankShifts > 0 && !autoReorder && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className="mb-6 p-3 rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 border border-orange-400/40 backdrop-blur-xl flex items-center justify-between gap-3 shadow-[0_8px_24px_rgba(234,88,12,0.2)]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-fivem-orange animate-ping shrink-0" />
                <span className="text-xs font-bold text-white truncate">
                  Live activity detected: <span className="text-amber-300">{pendingRankShifts} {pendingRankShifts === 1 ? 'idea has' : 'ideas have'} moved rank in the background</span>
                </span>
              </div>
              <button
                onClick={handleApplyRanking}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-fivem-orange to-orange-500 hover:from-orange-500 hover:to-fivem-orange text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-md flex items-center gap-1.5 shrink-0"
              >
                <Sparkles size={12} />
                <span>Update Ranking</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Suggestions Feed with Slower, Highly Visible Layout Motion ── */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-6 rounded-3xl border border-white/5 bg-white/[0.02] animate-pulse flex gap-5 items-start"
              >
                <div className="w-12 h-24 rounded-2xl bg-white/5 shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="w-1/3 h-5 bg-white/10 rounded-lg" />
                  <div className="w-full h-12 bg-white/5 rounded-lg" />
                  <div className="w-1/4 h-4 bg-white/5 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="text-center py-20 px-6 rounded-3xl border border-white/10 bg-white/[0.015] backdrop-blur-sm max-w-lg mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-fivem-orange/15 border border-fivem-orange/30 flex items-center justify-center text-fivem-orange">
              <MessageSquarePlus size={28} />
            </div>
            <h3 className="text-lg font-black font-display text-white mb-2">
              {searchQuery ? 'No matching suggestions found' : 'No Category Suggestions Yet'}
            </h3>
            <p className="text-xs text-white/50 mb-6 leading-relaxed">
              {searchQuery
                ? `No suggestions matched "${searchQuery}". Try a different keyword or clear your filter.`
                : 'Be the first to submit a topic idea for future rounds of the Vital RP Photo Contest!'}
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
                onClick={() => {
                  if (!currentUser) onOpenSignIn();
                  else setIsSubmitModalOpen(true);
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-fivem-orange to-orange-500 text-xs font-black uppercase tracking-wider text-white hover:from-orange-500 hover:to-fivem-orange shadow-lg hover:shadow-[0_0_24px_rgba(234,88,12,0.4)] transition-all cursor-pointer active:scale-95"
              >
                Submit the First Suggestion
              </button>
            )}
          </div>
        ) : (
          <motion.div layout className="space-y-4">
            {filteredSuggestions.map((suggestion) => {
              const userVote = suggestion.user_vote || 0;
              const isUpvoted = userVote === 1;
              const isDownvoted = userVote === -1;
              const isAuthor = currentUser && (effectiveUserId === suggestion.user_id || currentUser.uid === suggestion.user_id);
              const canDelete = isAdmin || isAuthor;
              const isHighlighted = highlightedSuggestionId === suggestion.id;

              return (
                <motion.div
                  layout
                  layoutId={suggestion.id}
                  id={`suggestion-${suggestion.id}`}
                  key={suggestion.id}
                  transition={{
                    layout: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.25 }
                  }}
                  className={cn(
                    "group relative rounded-3xl border bg-[#0a0a0d]/90 transition-colors duration-300 p-4 sm:p-6 backdrop-blur-xl shadow-lg flex flex-col sm:flex-row items-stretch sm:items-start gap-4 sm:gap-6",
                    isHighlighted
                      ? "border-fivem-orange/90 ring-2 ring-fivem-orange/80 shadow-[0_0_40px_rgba(234,88,12,0.4)] bg-fivem-orange/[0.08]"
                      : "border-white/10 hover:border-white/20"
                  )}
                >
                  {/* ── LEFT: Reddit-Style Vote Capsule ── */}
                  <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-1.5 p-2 rounded-2xl bg-black/40 border border-white/5 shrink-0 self-start sm:self-stretch min-w-[56px]">
                    {/* Upvote */}
                    <button
                      onClick={() => handleVote(suggestion.id, 1)}
                      disabled={votingLocks[suggestion.id]}
                      title={isUpvoted ? 'Remove upvote (reset)' : 'Upvote this suggestion'}
                      className={cn(
                        "p-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-90 flex items-center justify-center",
                        isUpvoted
                          ? "bg-fivem-orange/25 text-fivem-orange shadow-[0_0_12px_rgba(234,88,12,0.5)] border border-fivem-orange/40"
                          : "text-white/40 hover:text-fivem-orange hover:bg-white/5"
                      )}
                    >
                      <ArrowBigUp size={22} className={cn(isUpvoted && "fill-current")} />
                    </button>

                    {/* Net Score */}
                    <span
                      className={cn(
                        "text-sm sm:text-base font-black font-display px-2 sm:px-0 select-none tracking-tight",
                        suggestion.score > 0
                          ? "text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]"
                          : suggestion.score < 0
                          ? "text-rose-400 drop-shadow-[0_0_6px_rgba(251,113,133,0.4)]"
                          : "text-white/60"
                      )}
                    >
                      {suggestion.score}
                    </span>

                    {/* Downvote */}
                    <button
                      onClick={() => handleVote(suggestion.id, -1)}
                      disabled={votingLocks[suggestion.id]}
                      title={isDownvoted ? 'Remove downvote (reset)' : 'Downvote this suggestion'}
                      className={cn(
                        "p-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-90 flex items-center justify-center",
                        isDownvoted
                          ? "bg-blue-500/25 text-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.5)] border border-blue-500/40"
                          : "text-white/40 hover:text-blue-400 hover:bg-white/5"
                      )}
                    >
                      <ArrowBigDown size={22} className={cn(isDownvoted && "fill-current")} />
                    </button>
                  </div>

                  {/* ── RIGHT: Suggestion Body & Details ── */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      {/* Meta header: Author, Admin Badge, Date, Moderation */}
                      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={getProfileAvatar(
                              suggestion.author_avatar_url,
                              suggestion.author_discord_id || suggestion.user_id,
                              'botttsNeutral'
                            )}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0"
                            onError={(e) => {
                              const target = e.currentTarget;
                              const fallback = getDiceBearAvatarUrl(suggestion.user_id, 'botttsNeutral');
                              if (target.src !== fallback) target.src = fallback;
                            }}
                          />
                          <span className="text-xs font-bold text-white/90 truncate">
                            {suggestion.author_name}
                          </span>

                          {suggestion.is_admin_author && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-fivem-orange/15 border border-fivem-orange/30 text-fivem-orange text-[9px] font-mono font-bold uppercase tracking-wider shrink-0">
                              <Shield size={10} />
                              Admin
                            </span>
                          )}

                          <span className="text-white/20 text-xs">•</span>
                          <span className="text-[11px] font-mono text-white/40 whitespace-nowrap">
                            {formatDate(suggestion.created_at)}
                          </span>
                        </div>

                        {/* Moderation / Delete Button */}
                        {canDelete && (
                          <button
                            onClick={() => setDeletingSuggestionId(suggestion.id)}
                            title={isAdmin ? "Moderate / Delete Suggestion" : "Delete your suggestion"}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider text-red-400/70 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
                          >
                            <Trash2 size={12} />
                            <span>{isAdmin && !isAuthor ? 'Moderate' : 'Delete'}</span>
                          </button>
                        )}
                      </div>

                      {/* Category Name */}
                      <h2 className="text-lg sm:text-xl font-black font-display text-white mb-2 leading-tight">
                        {suggestion.category_name}
                      </h2>

                      {/* Description */}
                      <p className="text-white/70 text-xs sm:text-sm leading-relaxed whitespace-pre-line break-words">
                        {suggestion.description}
                      </p>
                    </div>

                    {/* Footer stats: Upvotes/Downvotes with Zero-Query Hover Popovers & Share button */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-3 text-[10px] font-mono text-white/40 flex-wrap">
                      <div className="flex items-center gap-4">
                        {/* Upvotes Breakdown Hover Trigger */}
                        <div
                          className="relative"
                          onMouseEnter={() => handleHoverVoters(suggestion.id, 'up')}
                          onMouseLeave={handleLeaveVoters}
                        >
                          <span className="flex items-center gap-1.5 text-emerald-400/90 font-bold hover:text-emerald-300 transition-colors cursor-pointer py-1 px-1.5 -mx-1.5 rounded-lg hover:bg-emerald-500/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{suggestion.upvotes} {suggestion.upvotes === 1 ? 'Upvote' : 'Upvotes'}</span>
                          </span>

                          {/* Upvoter Popover */}
                          <AnimatePresence>
                            {hoveredVoters?.suggestionId === suggestion.id && hoveredVoters.type === 'up' && (
                              <motion.div
                                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute bottom-full left-0 mb-2 z-50 w-64 p-3 rounded-2xl bg-[#0e0e13]/98 border border-emerald-500/30 shadow-[0_16px_36px_rgba(0,0,0,0.85)] backdrop-blur-2xl pointer-events-none"
                              >
                                <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10">
                                  <div className="flex items-center gap-1.5 text-xs font-black font-display text-emerald-400">
                                    <ArrowBigUp size={14} className="fill-current" />
                                    <span>Upvoted by</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-white/40 font-bold">{suggestion.upvotes}</span>
                                </div>

                                {hoveredVoters.loading ? (
                                  <div className="flex items-center justify-center py-3 text-[11px] font-mono text-white/40 gap-1.5">
                                    <RefreshCw size={12} className="animate-spin text-emerald-400" />
                                    <span>Loading upvoters...</span>
                                  </div>
                                ) : hoveredVoters.voters.length === 0 ? (
                                  <p className="text-[11px] text-white/40 font-mono py-1">No upvotes recorded yet.</p>
                                ) : (
                                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                                    {hoveredVoters.voters.map((voter) => (
                                      <div key={voter.userId} className="flex items-center gap-2 text-xs py-0.5">
                                        <img
                                          src={getProfileAvatar(voter.authorAvatarUrl, voter.discordId || voter.userId, voter.avatarStyle)}
                                          alt=""
                                          className="w-4 h-4 rounded-full object-cover border border-white/10 shrink-0"
                                        />
                                        <span className="font-bold text-white/90 truncate flex-1">{voter.discordName}</span>
                                        {voter.discordId && (
                                          <span className="text-[9px] font-mono text-white/30 truncate max-w-[60px]">
                                            #{voter.discordId.slice(-4)}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Downvotes Breakdown Hover Trigger */}
                        <div
                          className="relative"
                          onMouseEnter={() => handleHoverVoters(suggestion.id, 'down')}
                          onMouseLeave={handleLeaveVoters}
                        >
                          <span className="flex items-center gap-1.5 text-rose-400/90 font-bold hover:text-rose-300 transition-colors cursor-pointer py-1 px-1.5 -mx-1.5 rounded-lg hover:bg-rose-500/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                            <span>{suggestion.downvotes} {suggestion.downvotes === 1 ? 'Downvote' : 'Downvotes'}</span>
                          </span>

                          {/* Downvoter Popover */}
                          <AnimatePresence>
                            {hoveredVoters?.suggestionId === suggestion.id && hoveredVoters.type === 'down' && (
                              <motion.div
                                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute bottom-full left-0 mb-2 z-50 w-64 p-3 rounded-2xl bg-[#0e0e13]/98 border border-rose-500/30 shadow-[0_16px_36px_rgba(0,0,0,0.85)] backdrop-blur-2xl pointer-events-none"
                              >
                                <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10">
                                  <div className="flex items-center gap-1.5 text-xs font-black font-display text-rose-400">
                                    <ArrowBigDown size={14} className="fill-current" />
                                    <span>Downvoted by</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-white/40 font-bold">{suggestion.downvotes}</span>
                                </div>

                                {hoveredVoters.loading ? (
                                  <div className="flex items-center justify-center py-3 text-[11px] font-mono text-white/40 gap-1.5">
                                    <RefreshCw size={12} className="animate-spin text-rose-400" />
                                    <span>Loading downvoters...</span>
                                  </div>
                                ) : hoveredVoters.voters.length === 0 ? (
                                  <p className="text-[11px] text-white/40 font-mono py-1">No downvotes recorded yet.</p>
                                ) : (
                                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                                    {hoveredVoters.voters.map((voter) => (
                                      <div key={voter.userId} className="flex items-center gap-2 text-xs py-0.5">
                                        <img
                                          src={getProfileAvatar(voter.authorAvatarUrl, voter.discordId || voter.userId, voter.avatarStyle)}
                                          alt=""
                                          className="w-4 h-4 rounded-full object-cover border border-white/10 shrink-0"
                                        />
                                        <span className="font-bold text-white/90 truncate flex-1">{voter.discordName}</span>
                                        {voter.discordId && (
                                          <span className="text-[9px] font-mono text-white/30 truncate max-w-[60px]">
                                            #{voter.discordId.slice(-4)}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Share Button with Direct Link Generation & Fallback Copy */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}${window.location.pathname}?tab=suggestions&suggestion=${suggestion.id}`;
                          copyToClipboard(url, suggestion.category_name);
                          window.history.replaceState(null, '', url);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.10] border border-white/10 hover:border-white/20 text-white/60 hover:text-white transition-all cursor-pointer active:scale-95 text-xs font-mono font-bold"
                        title="Copy direct share link to this suggestion"
                      >
                        <Share2 size={13} className="text-fivem-orange" />
                        <span>Share Idea</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>

      {/* ── Submit Suggestion Modal ── */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-lg max-h-[92vh] overflow-y-auto bg-[#0a0a0e]/98 border-white/15 text-white p-6 sm:p-8 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
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
                  Post a new category concept for the community to vote on
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Author Badge */}
          {currentUser && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5 my-2">
              <img
                src={getProfileAvatar(currentUser.photoURL, currentUser.uid, currentUser.avatarStyle)}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-white/10"
              />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-xs font-bold text-white truncate">
                  Posting as {currentUser.displayName || currentUser.email}
                </span>
                <span className="text-[10px] font-mono text-fivem-orange uppercase tracking-wider">
                  {isAdmin ? 'System Administrator' : 'Verified Member'}
                </span>
              </div>
            </div>
          )}

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
                Category Title <span className="text-fivem-orange">*</span>
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Midnight Street Racing, Sunset Over Mount Chiliad..."
                maxLength={100}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-fivem-orange/60 focus:ring-1 focus:ring-fivem-orange/40 transition-all font-semibold"
              />
              <div className="flex justify-end mt-1">
                <span className="text-[10px] font-mono text-white/30">{categoryName.length}/100</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5 font-mono">
                Description & Theme Guidelines <span className="text-fivem-orange">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what kind of photos participants should submit for this theme (e.g. lighting, subject matter, vehicles, locations)..."
                rows={4}
                maxLength={1000}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-fivem-orange/60 focus:ring-1 focus:ring-fivem-orange/40 transition-all resize-none leading-relaxed"
              />
              <div className="flex justify-end mt-1">
                <span className="text-[10px] font-mono text-white/30">{description.length}/1000</span>
              </div>
            </div>

            {/* Actions */}
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
                disabled={isSubmitting || !categoryName.trim() || !description.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-fivem-orange to-orange-500 hover:from-orange-500 hover:to-fivem-orange text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-fivem-orange/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Post Proposal</span>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
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
              This action will permanently delete this suggestion and all its associated community votes.
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
