import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
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
  LogIn,
  Lightbulb,
  Users,
  MoreHorizontal,
  Edit3,
  Copy
} from 'lucide-react';
import { toast } from './ui/toast';
import { cn } from '../lib/utils';
import { CategorySuggestion, SuggestionStatus } from '../types';
import {
  fetchCategorySuggestions,
  subscribeCategorySuggestions,
  submitCategorySuggestion,
  castCategorySuggestionVote,
  deleteCategorySuggestion,
  updateCategorySuggestionStatus,
  updateCategorySuggestionContent,
  fetchSuggestionVoters,
  fetchUserSuggestionCount,
  getUserSuggestionAllowance,
  getUserSuggestionLimit,
  UserSuggestionLimitState,
  sortSuggestions,
  SuggestionVoter,
  CategorySuggestionStats,
  getCategorySuggestionStats,
  subscribeCategorySuggestionStats,
  isSuggestionActive,
  suggestionConsumesSlot,
  clearAllCategorySuggestions
} from '../lib/suggestionsService';
import { getProfileAvatar, getDiceBearAvatarUrl } from '../lib/dicebear';
import { checkUserDiscordEligibility } from '../lib/discord';
import {
  SITE_CONFIG,
  MAX_CATEGORY_SUGGESTIONS_PER_USER,
  VITAL_RP_LOGO_URL,
  CATEGORY_SUGGESTION_DEADLINE,
  CATEGORY_SUGGESTION_DEADLINE_LABEL,
  isCategorySuggestionDeadlineActive
} from '../config';
import { Spotlight } from './ui/spotlight';
import { DotPattern } from './ui/dot-pattern';
import { NumberTicker } from './ui/number-ticker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import {
  DropdownMenu,
  DropdownTrigger,
  DropdownContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from './ui/dropdown-menu';
import { Skeleton } from './ui/skeleton';
import { CreatorPill } from './ui/CreatorPill';
import { SiteNavbar } from './SiteNavbar';
import { UserAvatar } from './ui/UserAvatar';

export type SuggestionFilterOption = 'most_votes' | 'newest' | 'my_suggestions' | 'voted_by_me';

export interface CategorySuggestionsViewProps {
  currentUser?: any | null;
  isAdmin: boolean;
  isStandalonePage?: boolean;
  votingOpen?: boolean;
  onClose?: () => void;
  onOpenSignIn: () => void;
  onNavigateAdmin?: () => void;
  onOpenProfile?: () => void;
  onSignOut?: () => void;
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
  votingOpen,
  onClose,
  onOpenSignIn,
  onNavigateAdmin,
  onOpenProfile,
  onSignOut
}: CategorySuggestionsViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterOption, setFilterOption] = useState<SuggestionFilterOption>('most_votes');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [highlightedSuggestionId, setHighlightedSuggestionId] = useState<string | null>(null);

  // Authoritative Database-backed Category Suggestion Statistics
  const [stats, setStats] = useState<CategorySuggestionStats | null>(null);

  // Form State
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Authoritative database-backed suggestion limit tracking
  const maxAllowedSuggestions = SITE_CONFIG.categorySuggestions.maxSuggestionsPerUser || MAX_CATEGORY_SUGGESTIONS_PER_USER;
  const [userSubmittedCount, setUserSubmittedCount] = useState(0);
  const [suggestionLimit, setSuggestionLimit] = useState<UserSuggestionLimitState>({
    limit: maxAllowedSuggestions,
    used: 0,
    remaining: maxAllowedSuggestions,
    canSuggest: true
  });

  // Deletion modal state
  const [deletingSuggestion, setDeletingSuggestion] = useState<CategorySuggestion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status updating state
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Edit modal state
  const [editingSuggestion, setEditingSuggestion] = useState<CategorySuggestion | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Voting optimistic state locks
  const [votingLocks, setVotingLocks] = useState<Record<string, boolean>>({});

  // Voter breakdown hover state & memory cache
  const [hoveredVoters, setHoveredVoters] = useState<HoveredVotersState | null>(null);
  const [votersCache, setVotersCache] = useState<Record<string, { upvoters: SuggestionVoter[]; downvoters: SuggestionVoter[] }>>({});

  // Authoritative Countdown State (Closes Saturday, September 12, 2026 at Midnight EST)
  const [timeRemaining, setTimeRemaining] = useState(() => {
    const diff = new Date(CATEGORY_SUGGESTION_DEADLINE).getTime() - Date.now();
    return Math.max(0, diff);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(CATEGORY_SUGGESTION_DEADLINE).getTime() - Date.now();
      setTimeRemaining(Math.max(0, diff));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const countdownParts = useMemo(() => {
    if (timeRemaining <= 0) return null;
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
    const seconds = Math.floor((timeRemaining / 1000) % 60);
    return {
      days: String(days).padStart(2, '0'),
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0')
    };
  }, [timeRemaining]);

  // Floating Scroll-To-Top Button State
  const [showScrollTop, setShowScrollTop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const windowY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
      const containerY = containerRef.current ? containerRef.current.scrollTop : 0;
      setShowScrollTop(windowY > 300 || containerY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const containerEl = containerRef.current;
    if (containerEl) {
      containerEl.addEventListener('scroll', handleScroll, { passive: true });
    }
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (containerEl) {
        containerEl.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const handleScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Separate Voter List Modal State ("See everyone")
  const [voterModal, setVoterModal] = useState<{
    isOpen: boolean;
    suggestion: CategorySuggestion | null;
    type: 'up' | 'down';
    voters: SuggestionVoter[];
    loading: boolean;
    searchQuery: string;
  }>({
    isOpen: false,
    suggestion: null,
    type: 'up',
    voters: [],
    loading: false,
    searchQuery: ''
  });

  // Admin Clear All Suggestions Modal State
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

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

  // ── Real-time Subscription to Authoritative Category Suggestion Stats ──
  useEffect(() => {
    getCategorySuggestionStats()
      .then((s) => setStats(s))
      .catch((err) => console.warn('Error fetching initial category suggestion stats:', err));

    const unsubStats = subscribeCategorySuggestionStats((newStats) => {
      setStats(newStats);
    });

    return () => {
      unsubStats();
    };
  }, []);

  // ── Refresh user's authoritative suggestion limit ──
  const refreshUserCount = useCallback(async () => {
    if (effectiveUserId || currentUser?.discordId) {
      const limitState = await getUserSuggestionLimit(effectiveUserId, currentUser?.discordId);
      setSuggestionLimit(limitState);
      setUserSubmittedCount(limitState.used);
    } else {
      setSuggestionLimit({
        limit: maxAllowedSuggestions,
        used: 0,
        remaining: maxAllowedSuggestions,
        canSuggest: false
      });
      setUserSubmittedCount(0);
    }
  }, [effectiveUserId, currentUser?.discordId, maxAllowedSuggestions]);

  useEffect(() => {
    refreshUserCount();
  }, [refreshUserCount, suggestions]);

  const loadSuggestions = useCallback(async () => {
    setRefreshing(true);
    try {
      const [data, newStats] = await Promise.all([
        fetchCategorySuggestions(effectiveUserId),
        getCategorySuggestionStats()
      ]);
      setSuggestions(data);
      setStats(newStats);
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

    // Check user limit authoritatively
    if (suggestionLimit.remaining <= 0 && !isAdmin) {
      toast.error('Suggestion Limit Reached', {
        description: `You have already used all ${suggestionLimit.limit} of ${suggestionLimit.limit} allowed category suggestions.`
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
      const res = await submitCategorySuggestion({
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

      // Immediately apply authoritative suggestion limit and stats returned by server
      const nextLimit = res.userSuggestionLimit || res.suggestionLimit;
      if (nextLimit) {
        setSuggestionLimit(nextLimit);
        setUserSubmittedCount(nextLimit.used);
      }
      if (res.stats) {
        setStats(res.stats);
      }

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

    // Optimistic calculation for top-level Votes and Voters counters
    setStats((prevStats) => {
      if (!prevStats) return prevStats;
      let newVotes = prevStats.votes;
      let newVoters = prevStats.voters;

      const hadActiveVote = currentVote === 1 || currentVote === -1;
      const willHaveActiveVote = desiredVote === 1 || desiredVote === -1;

      if (!hadActiveVote && willHaveActiveVote) {
        newVotes += 1;
      } else if (hadActiveVote && !willHaveActiveVote) {
        newVotes = Math.max(0, newVotes - 1);
      }

      // Check if user has active votes on any other suggestions
      const hasOtherActiveVotes = suggestions.some(
        (s) => s.id !== suggestionId && (s.user_vote === 1 || s.user_vote === -1)
      );

      if (!hasOtherActiveVotes) {
        if (!hadActiveVote && willHaveActiveVote) {
          newVoters += 1;
        } else if (hadActiveVote && !willHaveActiveVote) {
          newVoters = Math.max(0, newVoters - 1);
        }
      }

      return {
        ...prevStats,
        votes: newVotes,
        voters: newVoters
      };
    });

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
        if (res.stats) {
          setStats(res.stats);
        }

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

        // Revert stats to ground truth on error
        getCategorySuggestionStats().then((s) => setStats(s)).catch(console.warn);

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

  // ── Synchronous Voter Extractors (Instantly available on First Click from voters_sample or votersCache) ──
  const getUpvoters = useCallback((suggestion: CategorySuggestion): SuggestionVoter[] => {
    if (votersCache[suggestion.id]?.upvoters) {
      return votersCache[suggestion.id].upvoters;
    }
    if (Array.isArray(suggestion.voters_sample) && suggestion.voters_sample.length > 0) {
      return suggestion.voters_sample
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
    }
    return [];
  }, [votersCache]);

  const getDownvoters = useCallback((suggestion: CategorySuggestion): SuggestionVoter[] => {
    if (votersCache[suggestion.id]?.downvoters) {
      return votersCache[suggestion.id].downvoters;
    }
    if (Array.isArray(suggestion.voters_sample) && suggestion.voters_sample.length > 0) {
      return suggestion.voters_sample
        .filter((v) => v.vote === -1)
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
    }
    return [];
  }, [votersCache]);

  // ── Ensure Voters Loaded & Cached (Instant seed + async enrich) ──
  const [loadingVotersIds, setLoadingVotersIds] = useState<Record<string, boolean>>({});

  const ensureVotersLoaded = useCallback(async (suggestionId: string) => {
    const target = suggestions.find((s) => s.id === suggestionId);
    if (!target) return;

    // 1. Immediately seed votersCache from inlined voters_sample if not already present
    setVotersCache((prev) => {
      if (prev[suggestionId]) return prev;
      const inlined = target.voters_sample;
      if (Array.isArray(inlined) && inlined.length > 0) {
        const up: SuggestionVoter[] = inlined
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
        const down: SuggestionVoter[] = inlined
          .filter((v) => v.vote === -1)
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
        return {
          ...prev,
          [suggestionId]: { upvoters: up, downvoters: down }
        };
      }
      return prev;
    });

    if (votersCache[suggestionId] || loadingVotersIds[suggestionId]) return;

    setLoadingVotersIds((prev) => ({ ...prev, [suggestionId]: true }));
    try {
      const result = await fetchSuggestionVoters(suggestionId, target.voters_sample);
      setVotersCache((prev) => ({ ...prev, [suggestionId]: result }));
    } catch (err) {
      console.warn('Notice loading voters:', err);
    } finally {
      setLoadingVotersIds((prev) => ({ ...prev, [suggestionId]: false }));
    }
  }, [suggestions, votersCache, loadingVotersIds]);

  // ── Hover Voter Breakdown ──
  const handleHoverVoters = useCallback((suggestionId: string) => {
    ensureVotersLoaded(suggestionId);
    const target = suggestions.find((s) => s.id === suggestionId);
    const upvoters = target ? getUpvoters(target) : [];
    setHoveredVoters({
      suggestionId,
      loading: upvoters.length === 0 && ((target?.upvotes || 0) > 0),
      voters: upvoters
    });
  }, [ensureVotersLoaded, suggestions, getUpvoters]);

  const handleLeaveVoters = useCallback(() => {
    setHoveredVoters(null);
  }, []);

  // ── Admin Status Change ──
  const handleStatusChange = async (suggestionId: string, newStatus: SuggestionStatus) => {
    setUpdatingStatusId(suggestionId);
    const target = suggestions.find((s) => s.id === suggestionId);
    if (!target) return;

    const prevStatus = target.status;
    // Optimistic update
    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggestionId ? { ...s, status: newStatus } : s))
    );

    try {
      await updateCategorySuggestionStatus(suggestionId, newStatus, effectiveUserId, currentUser?.discordId);
      if (newStatus === 'approved') {
        toast.success('🏆 Marked as Selected for Contest!', {
          description: `"${target.category_name}" has been marked as selected for an upcoming contest.`
        });
      } else if (newStatus === 'open') {
        toast.success('Status Set to Open for Voting', {
          description: `"${target.category_name}" is open for community voting.`
        });
      } else if (newStatus === 'under_review') {
        toast.info('Voting Paused / Under Review', {
          description: `"${target.category_name}" has been moved to Under Review.`
        });
      } else if (newStatus === 'declined') {
        toast.info('Suggestion Declined', {
          description: `"${target.category_name}" was declined.`
        });
      } else {
        toast.success(`Status updated to ${newStatus}`);
      }
      getCategorySuggestionStats().then((s) => setStats(s)).catch(console.warn);
    } catch (err: any) {
      console.error('Failed to update suggestion status:', err);
      // Rollback
      setSuggestions((prev) =>
        prev.map((s) => (s.id === suggestionId ? { ...s, status: prevStatus } : s))
      );
      toast.error('Failed to update status', { description: err.message });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // ── Edit Suggestion Handlers ──
  const handleOpenEditModal = (suggestion: CategorySuggestion) => {
    setEditingSuggestion(suggestion);
    setEditCategoryName(suggestion.category_name);
    setEditDescription(suggestion.description || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSuggestion) return;
    const trimmedTitle = editCategoryName.trim();
    if (!trimmedTitle) {
      toast.error('Category title cannot be empty.');
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateCategorySuggestionContent(
        editingSuggestion.id,
        {
          category_name: trimmedTitle,
          description: editDescription.trim()
        },
        effectiveUserId,
        currentUser?.discordId
      );

      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === editingSuggestion.id
            ? { ...s, category_name: trimmedTitle, description: editDescription.trim() }
            : s
        )
      );
      toast.success('Category suggestion updated!');
      setEditingSuggestion(null);
    } catch (err: any) {
      toast.error('Failed to save changes', { description: err.message });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ── Delete / Remove Suggestion Handlers ──
  const confirmDelete = async () => {
    if (!deletingSuggestion) return;
    const target = deletingSuggestion;
    setIsDeleting(true);

    // Optimistically decrement suggestion count and remove locally
    setSuggestions((prev) => prev.filter((s) => s.id !== target.id));
    setStats((prev) => (prev ? { ...prev, suggestions: Math.max(0, prev.suggestions - 1) } : prev));
    setSuggestionLimit((prev) => {
      const nextUsed = Math.max(0, prev.used - 1);
      return {
        ...prev,
        used: nextUsed,
        remaining: Math.min(prev.limit, prev.limit - nextUsed),
        canSuggest: true
      };
    });

    try {
      const res = await deleteCategorySuggestion(target.id, effectiveUserId, currentUser?.discordId);
      if (res.stats) {
        setStats(res.stats);
      }
      if (res.userSuggestionLimit) {
        setSuggestionLimit(res.userSuggestionLimit);
        setUserSubmittedCount(res.userSuggestionLimit.used);
      }
      await refreshUserCount();
      toast.success('Category suggestion removed', {
        description: `"${target.category_name}" has been removed and counters updated.`
      });
      setDeletingSuggestion(null);
    } catch (err: any) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete suggestion', { description: err.message });
      await loadSuggestions();
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Admin Clear All Suggestions Handler ──
  const handleConfirmClearAll = async () => {
    setIsClearingAll(true);
    try {
      const res = await clearAllCategorySuggestions(effectiveUserId, currentUser?.discordId);
      setSuggestions([]);
      setStats({ suggestions: 0, votes: 0, voters: 0 });
      setSuggestionLimit({
        limit: maxAllowedSuggestions,
        used: 0,
        remaining: maxAllowedSuggestions,
        canSuggest: true
      });
      setUserSubmittedCount(0);
      setIsClearAllModalOpen(false);
      toast.success('All Suggestions Cleared', {
        description: `Successfully purged ${res.deletedSuggestions} suggestions and ${res.deletedVotes} votes.`
      });
    } catch (err: any) {
      console.error('Clear all suggestions failed:', err);
      toast.error('Failed to clear suggestions', { description: err.message });
    } finally {
      setIsClearingAll(false);
    }
  };

  // ── Open Full Voter List Dialog ("See everyone") ──
  const handleOpenSeeEveryone = async (suggestion: CategorySuggestion, type: 'up' | 'down') => {
    const initialVoters = type === 'up' ? getUpvoters(suggestion) : getDownvoters(suggestion);
    setVoterModal({
      isOpen: true,
      suggestion,
      type,
      voters: initialVoters,
      loading: initialVoters.length === 0 && ((type === 'up' ? suggestion.upvotes : suggestion.downvotes) || 0) > 0,
      searchQuery: ''
    });

    try {
      let cached = votersCache[suggestion.id];
      if (!cached) {
        const fetched = await fetchSuggestionVoters(suggestion.id, suggestion.voters_sample);
        setVotersCache((prev) => ({ ...prev, [suggestion.id]: fetched }));
        cached = fetched;
      }
      setVoterModal((prev) => ({
        ...prev,
        voters: type === 'up' ? cached.upvoters : cached.downvoters,
        loading: false
      }));
    } catch (err) {
      console.error('Failed to load full voter list:', err);
      setVoterModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // ── Real-time Duplicate Category Submission Check ──
  const duplicateSuggestionWarning = useMemo(() => {
    const trimmed = categoryName.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!trimmed || trimmed.length < 3) return null;
    const found = suggestions.find(
      (s) => isSuggestionActive(s.status) && (s.category_name || '').trim().toLowerCase().replace(/\s+/g, ' ') === trimmed
    );
    return found ? found.category_name : null;
  }, [categoryName, suggestions]);

  // ── Community Favorites Leaderboard (Top 3 Highest-Voted Categories) ──
  const communityFavorites = useMemo(() => {
    const valid = suggestions.filter((s) => isSuggestionActive(s.status));
    return sortSuggestions(valid, 'top').slice(0, 3);
  }, [suggestions]);

  // ── Filtered & Sorted Suggestions ──
  const filteredSuggestions = useMemo(() => {
    let result = suggestions.filter((s) => isSuggestionActive(s.status));

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
      ref={containerRef}
      className={cn(
        "bg-[#050507] text-white flex flex-col w-full max-w-full",
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

      {/* ── Floating Modern Navigation Bar ── */}
      <SiteNavbar
        currentUser={currentUser}
        isAdmin={isAdmin}
        isStandalonePage={isStandalonePage}
        activeNav="category-voting"
        onOpenSuggestModal={handleOpenSuggestModal}
        onClose={onClose}
        onOpenSignIn={onOpenSignIn}
        onNavigateAdmin={onNavigateAdmin}
        onOpenProfile={onOpenProfile}
        onSignOut={onSignOut}
      />

      {/* ── Main Content Stage ── */}
      <main className="flex-1 max-w-[1440px] 2xl:max-w-[1536px] w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 pt-20 sm:pt-24 pb-8 sm:pb-12 relative z-10">
        {/* ── HERO SECTION: 16:9 MODERN 2-COLUMN COMMUNITY-VOTING HERO ── */}
        <section className="mb-8 pt-2 relative pb-8 border-b border-white/[0.08]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Left Column (7 cols): Title, branding, CTA, eligibility */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
              {/* Brand & Live Status Pills */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 mb-3">
                <img
                  src={VITAL_RP_LOGO_URL}
                  alt="Vital RP Logo"
                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 drop-shadow-[0_0_8px_rgba(234,88,12,0.3)]"
                  width={32}
                  height={32}
                />
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border backdrop-blur-md text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-400 animate-[pulse_2.5s_ease-in-out_infinite]" />
                  <span>Community Suggestions Open</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border backdrop-blur-md text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider border-amber-500/30 bg-amber-500/10 text-amber-300">
                  <Sparkles size={11} className="text-amber-400" />
                  <span>October Theme</span>
                </div>
                {isAdmin && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border backdrop-blur-md text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider border-indigo-500/30 bg-indigo-500/10 text-indigo-300 shadow-sm">
                    <ShieldCheck size={12} className="text-indigo-400" />
                    <span>Moderator Tools Enabled</span>
                  </div>
                )}
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight text-white mb-3">
                Help Shape <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">October’s</span> Loading Screen
              </h1>

              {/* Description & Supporting Copy */}
              <div className="space-y-2 max-w-xl mb-5">
                <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
                  Suggest and vote on photo contest categories for <strong className="text-white font-semibold">October’s Vital RP loading screen</strong>. Keep your ideas seasonal, spooky, fall-inspired, Halloween-themed, or otherwise fitting for the month.
                </p>
                <p className="text-xs sm:text-sm font-bold text-amber-400/90 tracking-wide">
                  Keep suggestions relevant to October.
                </p>
                <p className="text-[11px] sm:text-xs text-white/45 italic leading-relaxed">
                  Staff reserves the right to deny or remove suggestions that are inappropriate, off-topic, or do not fit the October theme.
                </p>
              </div>

              {/* Actions & Eligibility Pill */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <motion.button
                  type="button"
                  whileHover={shouldReduceMotion || (suggestionLimit.remaining <= 0 && !isAdmin && currentUser) ? undefined : { scale: 1.02 }}
                  whileTap={shouldReduceMotion || (suggestionLimit.remaining <= 0 && !isAdmin && currentUser) ? undefined : { scale: 0.98 }}
                  onClick={handleOpenSuggestModal}
                  disabled={suggestionLimit.remaining <= 0 && !isAdmin && currentUser}
                  className={cn(
                    "w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 active:scale-[0.98]",
                    suggestionLimit.remaining <= 0 && !isAdmin && currentUser
                      ? "bg-zinc-800/80 text-white/50 border border-white/10 cursor-not-allowed"
                      : "bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500 hover:from-orange-500 hover:to-fivem-orange text-white cursor-pointer shadow-[0_4px_20px_rgba(234,88,12,0.35)] hover:shadow-[0_6px_24px_rgba(234,88,12,0.45)] focus:ring-fivem-orange/60"
                  )}
                  title={suggestionLimit.remaining <= 0 && !isAdmin && currentUser ? `You have reached your limit of ${suggestionLimit.limit} suggestions.` : undefined}
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>{suggestionLimit.remaining <= 0 && !isAdmin && currentUser ? `Limit Reached (${suggestionLimit.limit}/${suggestionLimit.limit})` : "Suggest a Category"}</span>
                </motion.button>

                {currentUser ? (
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-mono text-white/70">
                    <UserAvatar
                      userId={currentUser.uid}
                      discordId={currentUser.discordId}
                      photoURL={currentUser.photoURL}
                      discordPhotoURL={currentUser.discordPhotoURL}
                      username={currentUser.displayName}
                      size="xs"
                    />
                    <span className="text-emerald-400 font-bold hidden sm:inline">✓ Eligible</span>
                    <span className="text-white/20 hidden sm:inline">•</span>
                    <span>
                      <strong className={cn(suggestionLimit.remaining <= 0 ? "text-amber-400" : "text-fivem-orange")}>
                        {suggestionLimit.remaining} of {suggestionLimit.limit}
                      </strong>{' '}
                      remaining
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenSignIn}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-white/80 hover:text-white transition-all cursor-pointer"
                  >
                    <LogIn size={13} className="text-fivem-orange" />
                    <span>Sign in with Discord</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Column (5 cols): Live Countdown Card & Live Statistics */}
            <div className="lg:col-span-5 flex flex-col gap-3 w-full">
              {/* Live Countdown Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#09090f]/90 border border-white/10 backdrop-blur-xl shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-fivem-orange" />
                    <span className="text-xs font-bold font-display uppercase tracking-wider text-white">
                      Submission & Voting Window
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/25">
                    {CATEGORY_SUGGESTION_DEADLINE_LABEL}
                  </span>
                </div>

                {countdownParts ? (
                  <div className="grid grid-cols-4 gap-2 text-center my-2">
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                      <span className="block text-xl sm:text-2xl font-black font-mono text-white">{countdownParts.days}</span>
                      <span className="block text-[9px] font-mono text-white/40 uppercase tracking-wider">Days</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                      <span className="block text-xl sm:text-2xl font-black font-mono text-white">{countdownParts.hours}</span>
                      <span className="block text-[9px] font-mono text-white/40 uppercase tracking-wider">Hours</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                      <span className="block text-xl sm:text-2xl font-black font-mono text-white">{countdownParts.minutes}</span>
                      <span className="block text-[9px] font-mono text-white/40 uppercase tracking-wider">Mins</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                      <span className="block text-xl sm:text-2xl font-black font-mono text-fivem-orange animate-pulse">{countdownParts.seconds}</span>
                      <span className="block text-[9px] font-mono text-white/40 uppercase tracking-wider">Secs</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-sm font-bold text-amber-400 font-display uppercase tracking-wider">Category Submissions Closed</p>
                    <p className="text-xs text-white/50 font-mono mt-1">Community voting has ended and the final results are in.</p>
                  </div>
                )}

                <p className="text-[10px] font-mono text-white/40 text-center mt-2">
                  Suggestions and votes lock automatically when the deadline expires.
                </p>
              </div>

              {/* Live Community Statistics Row */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1 text-amber-400 mb-0.5">
                    <Lightbulb size={12} />
                    <span className="text-[10px] uppercase font-bold text-white/50">Ideas</span>
                  </div>
                  <span className="text-base sm:text-lg font-black text-white">
                    {stats ? <NumberTicker value={stats.suggestions} /> : '—'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1 text-fivem-orange mb-0.5">
                    <TrendingUp size={12} />
                    <span className="text-[10px] uppercase font-bold text-white/50">Votes</span>
                  </div>
                  <span className="text-base sm:text-lg font-black text-white">
                    {stats ? <NumberTicker value={stats.votes} /> : '—'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1 text-sky-400 mb-0.5">
                    <Users size={12} />
                    <span className="text-[10px] uppercase font-bold text-white/50">Voters</span>
                  </div>
                  <span className="text-base sm:text-lg font-black text-white">
                    {stats ? <NumberTicker value={stats.voters} /> : '—'}
                  </span>
                </div>
              </div>
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

        {/* ── TOOLBAR: SEARCH & FILTERS (SUBTLY STICKY) ── */}
        <section className="sticky top-0 z-20 py-2.5 -mx-4 px-4 sm:-mx-6 sm:px-6 mb-6 bg-[#07070b]/92 backdrop-blur-md border-y border-white/[0.08] transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category concepts or ideas..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 text-xs font-medium focus:outline-none focus:border-fivem-orange/60 focus:ring-1 focus:ring-fivem-orange/40 transition-all"
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
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white/50 hover:text-white transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw size={15} className={cn(refreshing && "animate-spin text-fivem-orange")} />
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(true)}
                title="Admin: Clear all category suggestions"
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 hover:text-rose-300 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-mono font-bold"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
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
                                    <UserAvatar
                                      userId={voter.userId}
                                      discordId={voter.discordId}
                                      photoURL={voter.authorAvatarUrl}
                                      username={voter.discordName}
                                      size="xs"
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
                  {/* Middle / Right: Content Block & Action Tools */}
                  <div className="flex-1 min-w-0">
                    {/* Header: Badges on left, Admin ⋯ on right */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {/* Selected Badge */}
                        {isSelected && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/40 text-purple-300 text-[10px] font-mono font-bold uppercase tracking-wider shadow-sm">
                            <span className="text-xs">🏆</span>
                            <span>Selected</span>
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
                        <span className="text-white/40 text-[11px] font-mono flex items-center gap-1.5">
                          <UserAvatar
                            userId={suggestion.user_id}
                            discordId={suggestion.discord_id || suggestion.author_discord_id}
                            photoURL={suggestion.author_avatar_url}
                            username={displayName}
                            size="xs"
                          />
                          <span>by</span>
                          <strong className="text-white/80">{displayName}</strong>
                        </span>

                        <span className="text-white/20 text-xs">•</span>
                        <span className="text-[11px] font-mono text-white/40">
                          {formatDate(suggestion.created_at)}
                        </span>
                      </div>

                      {/* Admin Moderation ⋯ Menu */}
                      {isAdmin && (
                        <div className="shrink-0 relative">
                          <DropdownMenu>
                            <DropdownTrigger className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors" aria-label="Moderation actions">
                              <MoreHorizontal size={18} />
                            </DropdownTrigger>
                            <DropdownContent align="right" width="w-72">
                              {/* Admin Context Info */}
                              <div className="px-3 py-2 border-b border-white/10 bg-white/[0.02] rounded-t-xl mb-1 text-[10px] font-mono space-y-1">
                                <div className="flex items-center justify-between text-white/50">
                                  <span className="uppercase tracking-wider font-bold text-indigo-400">Moderator Context</span>
                                  <span className={cn(
                                    "font-bold uppercase px-1.5 py-0.5 rounded text-[9px]",
                                    isSelected ? "bg-purple-500/20 text-purple-300" :
                                    suggestion.status === 'declined' ? "bg-rose-500/20 text-rose-300" :
                                    suggestion.status === 'under_review' ? "bg-amber-500/20 text-amber-300" :
                                    "bg-emerald-500/20 text-emerald-300"
                                  )}>
                                    {suggestion.status || 'open'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-white/70">
                                  <span className="text-white/40">Suggestion ID:</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(suggestion.id, 'Suggestion ID');
                                    }}
                                    className="hover:text-fivem-orange hover:underline inline-flex items-center gap-1 text-white/80 font-bold"
                                  >
                                    <span>{suggestion.id.slice(0, 10)}...</span>
                                    <Copy size={9} />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between text-white/70">
                                  <span className="text-white/40">Submitter ID:</span>
                                  <span className="text-white/80 truncate max-w-[140px]">{suggestion.discord_id || suggestion.user_id || 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between text-white/70">
                                  <span className="text-white/40">Telemetry:</span>
                                  <span className="text-white/90 font-bold">+{score} ({suggestion.upvotes || 0}▲ / {suggestion.downvotes || 0}▼)</span>
                                </div>
                              </div>

                              {/* Moderation Actions */}
                              <DropdownMenuItem
                                icon={<Edit3 size={14} className="text-amber-400" />}
                                onClick={() => handleOpenEditModal(suggestion)}
                              >
                                Edit Suggestion
                              </DropdownMenuItem>

                              {isSelected ? (
                                <DropdownMenuItem
                                  icon={<X size={14} className="text-purple-400" />}
                                  onClick={() => handleStatusChange(suggestion.id, 'open')}
                                >
                                  Remove Selected Status
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  icon={<Award size={14} className="text-purple-400" />}
                                  onClick={() => handleStatusChange(suggestion.id, 'approved')}
                                >
                                  Mark as Selected
                                </DropdownMenuItem>
                              )}

                              {suggestion.status === 'under_review' ? (
                                <DropdownMenuItem
                                  icon={<CheckCircle2 size={14} className="text-emerald-400" />}
                                  onClick={() => handleStatusChange(suggestion.id, 'open')}
                                >
                                  Unlock Voting (Open)
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  icon={<Clock size={14} className="text-amber-400" />}
                                  onClick={() => handleStatusChange(suggestion.id, 'under_review')}
                                >
                                  Lock Voting (Under Review)
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              {suggestion.status === 'declined' ? (
                                <DropdownMenuItem
                                  variant="success"
                                  icon={<Check size={14} className="text-emerald-400" />}
                                  onClick={() => handleStatusChange(suggestion.id, 'open')}
                                >
                                  Restore Suggestion
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  variant="warning"
                                  icon={<X size={14} className="text-amber-400" />}
                                  onClick={() => handleStatusChange(suggestion.id, 'declined')}
                                >
                                  Reject / Decline Suggestion
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                variant="danger"
                                icon={<Trash2 size={14} className="text-rose-400" />}
                                onClick={() => setDeletingSuggestion(suggestion)}
                              >
                                Remove Suggestion
                              </DropdownMenuItem>
                            </DropdownContent>
                          </DropdownMenu>
                        </div>
                      )}
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

                    {/* Bottom Actions: Upvotes / Downvotes Lists, Share, Author Delete */}
                    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-white/5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Separate Upvotes List Dropdown */}
                        <DropdownMenu onOpenChange={(open) => { if (open) ensureVotersLoaded(suggestion.id); }}>
                          <DropdownTrigger
                            onPointerDown={() => ensureVotersLoaded(suggestion.id)}
                            onMouseEnter={() => ensureVotersLoaded(suggestion.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-white/70 hover:text-emerald-400 text-xs font-mono font-bold transition-all cursor-pointer"
                            title="View community members who upvoted"
                          >
                            <span className="text-emerald-400">▲</span>
                            <span>{suggestion.upvotes || 0}</span>
                            <span className="text-[10px] text-white/40 hidden sm:inline">Upvotes</span>
                          </DropdownTrigger>
                          <DropdownContent align="start" width="w-64">
                            <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between text-xs font-mono">
                              <span className="font-bold text-emerald-400 flex items-center gap-1">
                                <span>▲</span>
                                <span>Upvoters ({suggestion.upvotes || 0})</span>
                              </span>
                            </div>
                            <div className="p-1 space-y-1 max-h-48 overflow-y-auto">
                              {loadingVotersIds[suggestion.id] && getUpvoters(suggestion).length === 0 ? (
                                <div className="py-3 text-center text-xs font-mono text-white/40 flex items-center justify-center gap-2">
                                  <RefreshCw size={12} className="animate-spin text-fivem-orange" />
                                  <span>Loading upvoters...</span>
                                </div>
                              ) : getUpvoters(suggestion).length === 0 ? (
                                <p className="py-3 text-center text-xs font-mono text-white/40">No upvotes recorded yet</p>
                              ) : (
                                getUpvoters(suggestion).slice(0, 6).map((voter) => (
                                  <div key={voter.userId} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
                                    <UserAvatar
                                      userId={voter.userId}
                                      discordId={voter.discordId}
                                      photoURL={voter.authorAvatarUrl}
                                      username={voter.discordName}
                                      size="xs"
                                    />
                                    <span className="text-xs font-medium text-white/90 truncate flex-1">{voter.discordName}</span>
                                  </div>
                                ))
                              )}
                            </div>
                            {(suggestion.upvotes || 0) > 6 && (
                              <div className="px-3 py-1 text-[10px] font-mono text-white/40 text-center border-t border-white/5">
                                + {(suggestion.upvotes || 0) - 6} more
                              </div>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleOpenSeeEveryone(suggestion, 'up')}
                              className="text-xs font-bold font-mono text-fivem-orange justify-center py-2 cursor-pointer"
                            >
                              See everyone ({suggestion.upvotes || 0})
                            </DropdownMenuItem>
                          </DropdownContent>
                        </DropdownMenu>

                        {/* Separate Downvotes List Dropdown */}
                        <DropdownMenu onOpenChange={(open) => { if (open) ensureVotersLoaded(suggestion.id); }}>
                          <DropdownTrigger
                            onPointerDown={() => ensureVotersLoaded(suggestion.id)}
                            onMouseEnter={() => ensureVotersLoaded(suggestion.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 text-white/70 hover:text-blue-400 text-xs font-mono font-bold transition-all cursor-pointer"
                            title="View community members who downvoted"
                          >
                            <span className="text-blue-400">▼</span>
                            <span>{suggestion.downvotes || 0}</span>
                            <span className="text-[10px] text-white/40 hidden sm:inline">Downvotes</span>
                          </DropdownTrigger>
                          <DropdownContent align="start" width="w-64">
                            <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between text-xs font-mono">
                              <span className="font-bold text-blue-400 flex items-center gap-1">
                                <span>▼</span>
                                <span>Downvoters ({suggestion.downvotes || 0})</span>
                              </span>
                            </div>
                            <div className="p-1 space-y-1 max-h-48 overflow-y-auto">
                              {loadingVotersIds[suggestion.id] && getDownvoters(suggestion).length === 0 ? (
                                <div className="py-3 text-center text-xs font-mono text-white/40 flex items-center justify-center gap-2">
                                  <RefreshCw size={12} className="animate-spin text-fivem-orange" />
                                  <span>Loading downvoters...</span>
                                </div>
                              ) : getDownvoters(suggestion).length === 0 ? (
                                <p className="py-3 text-center text-xs font-mono text-white/40">No downvotes recorded yet</p>
                              ) : (
                                getDownvoters(suggestion).slice(0, 6).map((voter) => (
                                  <div key={voter.userId} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
                                    <UserAvatar
                                      userId={voter.userId}
                                      discordId={voter.discordId}
                                      photoURL={voter.authorAvatarUrl}
                                      username={voter.discordName}
                                      size="xs"
                                    />
                                    <span className="text-xs font-medium text-white/90 truncate flex-1">{voter.discordName}</span>
                                  </div>
                                ))
                              )}
                            </div>
                            {(suggestion.downvotes || 0) > 6 && (
                              <div className="px-3 py-1 text-[10px] font-mono text-white/40 text-center border-t border-white/5">
                                + {(suggestion.downvotes || 0) - 6} more
                              </div>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleOpenSeeEveryone(suggestion, 'down')}
                              className="text-xs font-bold font-mono text-blue-400 justify-center py-2 cursor-pointer"
                            >
                              See everyone ({suggestion.downvotes || 0})
                            </DropdownMenuItem>
                          </DropdownContent>
                        </DropdownMenu>

                        {/* Share Direct Link Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const url = `${window.location.origin}${window.location.pathname}?suggestion=${suggestion.id}`;
                            copyToClipboard(url, suggestion.category_name);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/50 hover:text-white transition-all cursor-pointer text-xs flex items-center gap-1.5 font-mono"
                          title="Share link to this category idea"
                        >
                          <Share2 size={12} className="text-fivem-orange" />
                          <span className="text-[11px]">Share</span>
                        </button>
                      </div>

                      {/* Author delete trigger */}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeletingSuggestion(suggestion)}
                          title="Delete this category suggestion"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-rose-400/80 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
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

      {/* ── FOOTER: CREATOR CREDIT, BRANDING & USEFUL NAVIGATION ── */}
      <footer className="mt-auto border-t border-white/[0.08] bg-[#060609]/95 backdrop-blur-xl py-8 px-4 sm:px-8 relative z-10">
        <div className="max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          {/* Left: Brand Identity */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <img
              src={VITAL_RP_LOGO_URL}
              alt="Vital RP Logo"
              className="w-8 h-8 object-contain shrink-0"
              width={32}
              height={32}
            />
            <div>
              <p className="text-white font-bold font-display text-sm">
                Vital RP Photo Contests
              </p>
              <p className="text-white/40 text-xs font-mono">
                Community-created. Community-voted.
              </p>
            </div>
          </div>

          {/* Center: Mode-Aware Useful Navigation Links */}
          <nav aria-label="Footer Navigation" className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-mono">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              Category Voting
            </button>

            <button
              type="button"
              onClick={handleOpenSuggestModal}
              className="text-white/60 hover:text-fivem-orange transition-colors cursor-pointer"
            >
              Suggest an Idea
            </button>

            {!isStandalonePage && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                Return to Contest
              </button>
            )}

            <a
              href={SITE_CONFIG.discord.inviteUrl || "https://discord.gg/vitalrp"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
            >
              <span>Vital Discord</span>
              <ExternalLink size={11} className="opacity-70" />
            </a>

            {isAdmin && onNavigateAdmin && (
              <button
                type="button"
                onClick={onNavigateAdmin}
                className="text-fivem-orange/80 hover:text-fivem-orange transition-colors cursor-pointer"
              >
                Admin Console
              </button>
            )}
          </nav>

          {/* Right: Creator Pill */}
          <div className="shrink-0">
            <CreatorPill />
          </div>
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
            <span className={cn(
              "font-bold",
              suggestionLimit.remaining > 0 || isAdmin ? "text-fivem-orange" : "text-amber-400"
            )}>
              {suggestionLimit.remaining} of {suggestionLimit.limit}
            </span>
          </div>

          {/* Schedule Notice */}
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-[11px] font-mono">
            <span className="text-white/50">Phase Deadline</span>
            <span className="font-bold text-amber-400">{CATEGORY_SUGGESTION_DEADLINE_LABEL}</span>
          </div>

          {/* Author Initial Upvote Notification */}
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex items-center gap-2 font-mono">
            <Sparkles size={14} className="shrink-0 text-emerald-400" />
            <span>Submitting automatically grants your suggestion your 1 initial upvote.</span>
          </div>

          {/* Duplicate Warning Pill */}
          {duplicateSuggestionWarning && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2 font-mono">
              <AlertCircle size={14} className="shrink-0 text-amber-400" />
              <span>A category titled "{duplicateSuggestionWarning}" already exists. You can upvote it instead!</span>
            </div>
          )}

          {suggestionLimit.remaining <= 0 && !isAdmin && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2 font-mono">
              <AlertCircle size={14} className="shrink-0 text-amber-400" />
              <span>You have reached your submission limit ({suggestionLimit.limit} of {suggestionLimit.limit} used).</span>
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
                disabled={isSubmitting || !categoryName.trim() || !!duplicateSuggestionWarning || (suggestionLimit.remaining <= 0 && !isAdmin)}
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

      {/* ── EDIT SUGGESTION MODAL ── */}
      <Dialog open={!!editingSuggestion} onOpenChange={(open) => !open && setEditingSuggestion(null)}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-lg bg-[#0a0a0e] border-white/15 text-white p-6 rounded-3xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
              <Edit3 size={20} />
            </div>
            <DialogTitle className="font-display text-lg font-black text-white">
              Edit Suggestion Details
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Correct spelling, capitalization, or formatting. Existing votes will be preserved.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5 font-mono">
                Category Name <span className="text-fivem-orange">*</span>
              </label>
              <input
                type="text"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                maxLength={100}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-fivem-orange/60 focus:ring-1 focus:ring-fivem-orange/40 transition-all font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5 font-mono">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-fivem-orange/60 focus:ring-1 focus:ring-fivem-orange/40 transition-all resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingSuggestion(null)}
                disabled={isSavingEdit}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEdit || !editCategoryName.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-fivem-orange to-orange-500 hover:from-orange-500 hover:to-fivem-orange text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-fivem-orange/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingEdit ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DELETE / REMOVE CONFIRMATION DIALOG ── */}
      <Dialog open={!!deletingSuggestion} onOpenChange={(open) => !open && setDeletingSuggestion(null)}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-md bg-[#0a0a0e]/98 border-white/15 text-white p-6 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2">
              <Trash2 size={20} />
            </div>
            <DialogTitle className="font-display text-lg font-black text-white">
              Delete "{deletingSuggestion?.category_name}"?
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60 leading-relaxed font-mono">
              This will remove your suggestion and its associated votes.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setDeletingSuggestion(null)}
              disabled={isDeleting}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-[0_0_16px_rgba(239,68,68,0.3)]"
            >
              {isDeleting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Delete</span>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── ADMIN CLEAR ALL SUGGESTIONS CONFIRMATION DIALOG ── */}
      <Dialog open={isClearAllModalOpen} onOpenChange={setIsClearAllModalOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-md bg-[#0a0a0e]/98 border-rose-500/30 text-white p-6 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2">
              <AlertCircle size={22} />
            </div>
            <DialogTitle className="font-display text-lg font-black text-white">
              Clear All Category Suggestions?
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60 leading-relaxed font-mono">
              This action will permanently delete all suggestions, remove all votes, and reset all user allowances to 0 used. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsClearAllModalOpen(false)}
              disabled={isClearingAll}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmClearAll}
              disabled={isClearingAll}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-[0_0_20px_rgba(225,29,72,0.4)]"
            >
              {isClearingAll ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Clearing All...</span>
                </>
              ) : (
                <span>Clear All Suggestions</span>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── PUBLIC VOTER LIST MODAL ("See everyone") ── */}
      <Dialog open={voterModal.isOpen} onOpenChange={(open) => setVoterModal((prev) => ({ ...prev, isOpen: open }))}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-lg bg-[#0a0a0e]/98 border-white/15 text-white p-6 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl flex flex-col max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-base font-bold", voterModal.type === 'up' ? "text-emerald-400" : "text-blue-400")}>
                {voterModal.type === 'up' ? '▲' : '▼'}
              </span>
              <DialogTitle className="font-display text-lg font-black text-white">
                {voterModal.type === 'up' ? 'Upvoters' : 'Downvoters'}
                <span className="text-white/40 font-mono text-sm ml-2">
                  ({voterModal.voters.length})
                </span>
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-white/50 font-mono truncate">
              Community members who voted on "{voterModal.suggestion?.category_name}"
            </DialogDescription>
          </DialogHeader>

          {/* Search Voters */}
          <div className="relative my-3">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              type="text"
              value={voterModal.searchQuery}
              onChange={(e) => setVoterModal((prev) => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="Search voters by name..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 text-xs font-medium focus:outline-none focus:border-fivem-orange/60"
            />
          </div>

          {/* Voter Items List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[160px]">
            {voterModal.loading ? (
              <div className="py-12 text-center text-xs font-mono text-white/40 flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin text-fivem-orange" />
                <span>Loading voter list...</span>
              </div>
            ) : voterModal.voters.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-white/40">
                No {voterModal.type === 'up' ? 'upvotes' : 'downvotes'} recorded for this category yet.
              </div>
            ) : (
              voterModal.voters
                .filter((v) => !voterModal.searchQuery.trim() || v.discordName.toLowerCase().includes(voterModal.searchQuery.toLowerCase()))
                .map((voter) => (
                  <div
                    key={voter.userId}
                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-colors"
                  >
                    <UserAvatar
                      userId={voter.userId}
                      discordId={voter.discordId}
                      photoURL={voter.authorAvatarUrl}
                      username={voter.discordName}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{voter.discordName}</p>
                      <p className="text-[10px] font-mono text-white/40">{formatDate(voter.updatedAt)}</p>
                    </div>
                  </div>
                ))
            )}
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-end">
            <button
              type="button"
              onClick={() => setVoterModal((prev) => ({ ...prev, isOpen: false }))}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── FLOATING SCROLL TO TOP BUTTON (PORTALED TO BODY FOR TRUE VIEWPORT FLOATING) ── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 16 }}
              transition={{ duration: 0.2 }}
              onClick={handleScrollToTop}
              className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-[120] p-3.5 rounded-2xl bg-[#0e0e16]/95 hover:bg-fivem-orange border border-white/20 hover:border-fivem-orange/60 text-white shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(234,88,12,0.3)] backdrop-blur-xl transition-all duration-200 cursor-pointer group hover:scale-105 active:scale-95"
              aria-label="Scroll to top"
              title="Scroll to top"
            >
              <ChevronUp size={22} className="group-hover:-translate-y-1 transition-transform duration-200" strokeWidth={2.5} />
            </motion.button>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export default CategorySuggestionsView;

