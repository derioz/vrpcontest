import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Search,
  Trash2,
  CheckCircle2,
  Flame,
  Clock,
  TrendingUp,
  TrendingDown,
  Shield,
  ShieldCheck,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronDown,
  ArrowBigUp,
  ArrowBigDown,
  Filter,
  Check,
  PlusCircle,
  Archive,
  Layers,
  X,
  Plus,
  Send,
  AlertCircle,
  Award,
  History,
  ThumbsUp,
  UserCheck
} from 'lucide-react';
import { toast } from '../ui/toast';
import { cn } from '../../lib/utils';
import { CategorySuggestion, SuggestionStatus, SuggestionSortOption, SuggestionAdminVote } from '../../types';
import {
  fetchCategorySuggestions,
  deleteCategorySuggestion,
  updateCategorySuggestionStatus,
  toggleAdminSuggestionVote,
  fetchSuggestionVoters,
  SuggestionVoter,
  sortSuggestions
} from '../../lib/suggestionsService';
import { getProfileAvatar, getDiceBearAvatarUrl } from '../../lib/dicebear';
import { AdminHeader } from './AdminHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { NumberTicker } from '../ui/number-ticker';

interface AdminSuggestionsTabProps {
  currentUser?: any | null;
  isAdmin?: boolean;
  onAddCategoryToContest?: (category: { name: string; description: string; emoji?: string }) => void;
}

interface HoveredVotersState {
  suggestionId: string;
  type: 'up' | 'down';
  loading: boolean;
  voters: SuggestionVoter[];
}

export const FUNCTIONAL_STATUSES: {
  id: SuggestionStatus;
  label: string;
  badge: string;
  dot: string;
  icon: typeof Sparkles;
  description: string;
}[] = [
  {
    id: 'open',
    label: 'Open for Voting',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]',
    icon: CheckCircle2,
    description: 'Community members can vote and submit ideas'
  },
  {
    id: 'under_review',
    label: 'Under Review',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]',
    icon: Clock,
    description: 'Staff is reviewing and discussing this concept'
  },
  {
    id: 'approved',
    label: 'Approved for Contest',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    dot: 'bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]',
    icon: Award,
    description: 'Selected to be used in an upcoming contest round'
  },
  {
    id: 'implemented',
    label: 'Implemented / Used',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]',
    icon: Layers,
    description: 'Featured in an active or archived competition'
  },
  {
    id: 'declined',
    label: 'Declined',
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    dot: 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]',
    icon: X,
    description: 'Rejected, duplicate, or unsuitable'
  },
  {
    id: 'archived',
    label: 'Archived',
    badge: 'bg-white/10 text-white/50 border-white/15',
    dot: 'bg-white/40',
    icon: Archive,
    description: 'Saved for later reference'
  }
];

export function AdminSuggestionsTab({ currentUser, isAdmin = true, onAddCategoryToContest }: AdminSuggestionsTabProps) {
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SuggestionStatus>('all');
  const [sortBy, setSortBy] = useState<SuggestionSortOption>('top');

  // Deletion modal state
  const [deletingSuggestion, setDeletingSuggestion] = useState<CategorySuggestion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status updating state
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Voting locks & hover breakdown state
  const [votingLocks, setVotingLocks] = useState<Record<string, boolean>>({});
  const [hoveredVoters, setHoveredVoters] = useState<HoveredVotersState | null>(null);
  const [votersCache, setVotersCache] = useState<Record<string, { upvoters: SuggestionVoter[]; downvoters: SuggestionVoter[] }>>({});

  // Display Order Stability Engine (Prevents card jumping/shuffling when multiple people are voting)
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [autoReorder, setAutoReorder] = useState(false);

  const effectiveUserId = currentUser?.uid || currentUser?.id || currentUser?.discordId || null;

  // On-demand load from Cloud Firestore (no continuous realtime listener across admin sessions)
  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const data = await fetchCategorySuggestions(effectiveUserId, sortBy);
      setSuggestions(data);
      const sorted = sortSuggestions(data, sortBy);
      setOrderedIds(sorted.map((s) => s.id));
    } catch (err: any) {
      console.error('Admin suggestions load error:', err);
      toast.error('Failed to load category proposals', { description: err.message });
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [effectiveUserId, sortBy]);

  // Initial fetch on mount or when user/sort option changes
  useEffect(() => {
    loadData(true);
  }, [loadData]);

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
  }, [suggestions, sortBy]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchCategorySuggestions(effectiveUserId, sortBy);
      setSuggestions(data);
      const sorted = sortSuggestions(data, sortBy);
      setOrderedIds(sorted.map((s) => s.id));
      toast.success('Category proposals refreshed!', {
        description: 'Synchronized newest scores and staff decision votes.'
      });
    } catch (err: any) {
      console.error('Refresh error:', err);
      toast.error('Failed to refresh category proposals', { description: err.message });
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 500);
    }
  };

  // ── Staff Contest Decision Vote: Admins vote on whether to use this theme in the contest ──
  const handleAdminContestVote = async (suggestionId: string) => {
    if (!currentUser) {
      toast.info('Admin Authentication Required', {
        description: 'You must be signed in with admin privileges to cast staff decision votes.'
      });
      return;
    }

    if (votingLocks[suggestionId]) return;

    const target = suggestions.find((s) => s.id === suggestionId);
    if (!target) return;

    const adminId = effectiveUserId || currentUser.uid;
    const adminName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Admin';
    const adminAvatarUrl = currentUser.photoURL || localStorage.getItem('user_photo_url_' + currentUser.uid) || null;

    const currentAdminVotes: SuggestionAdminVote[] = target.admin_votes || [];
    const hasVoted = currentAdminVotes.some((v) =>
      v.adminId === adminId ||
      (currentUser.uid && v.adminId === currentUser.uid) ||
      (currentUser.discordId && v.adminId === currentUser.discordId) ||
      (v.adminName && currentUser.displayName && v.adminName.toLowerCase() === currentUser.displayName.toLowerCase())
    );

    // Optimistic toggle
    const optimisticVotes: SuggestionAdminVote[] = hasVoted
      ? currentAdminVotes.filter((v) =>
          v.adminId !== adminId &&
          v.adminId !== currentUser.uid &&
          v.adminId !== currentUser.discordId &&
          !(v.adminName && currentUser.displayName && v.adminName.toLowerCase() === currentUser.displayName.toLowerCase())
        )
      : [
          ...currentAdminVotes,
          {
            adminId,
            adminName,
            adminAvatarUrl: adminAvatarUrl || undefined,
            vote: 'yes',
            votedAt: new Date().toISOString()
          }
        ];

    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggestionId ? { ...s, admin_votes: optimisticVotes } : s))
    );

    setVotingLocks((prev) => ({ ...prev, [suggestionId]: true }));

    try {
      const voteResult = await toggleAdminSuggestionVote(
        suggestionId,
        adminId,
        adminName,
        adminAvatarUrl
      );

      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId
            ? {
                ...s,
                admin_votes: voteResult.admin_votes,
                status: voteResult.status
              }
            : s
        )
      );

      if (voteResult.autoTransitioned) {
        if (voteResult.transitionType === 'opened_for_voting') {
          toast.success(`🎉 2/2 Admin Votes Reached!`, {
            description: `"${target.category_name}" has moved to Open for Voting!`
          });
        } else if (voteResult.transitionType === 'approved_for_contest') {
          toast.success(`🏆 2/2 Admin Votes Reached!`, {
            description: `"${target.category_name}" has been Approved for Contest!`
          });
        }
      } else {
        if (hasVoted) {
          toast.info(`Removed vote for "${target.category_name}"`);
        } else {
          const reqTarget = target.status === 'under_review' ? 'move to Open for Voting' : 'approve for contest';
          const remaining = 2 - voteResult.admin_votes.length;
          toast.success(
            remaining === 1
              ? `Vote recorded! Waiting for 1 more vote to ${reqTarget}.`
              : `Vote recorded!`
          );
        }
      }
    } catch (err: any) {
      console.error('Admin decision vote failed:', err);
      // Rollback on error
      setSuggestions((prev) =>
        prev.map((s) => (s.id === suggestionId ? target : s))
      );
      toast.error('Failed to submit staff decision vote', { description: err.message });
    } finally {
      setTimeout(() => {
        setVotingLocks((prev) => ({ ...prev, [suggestionId]: false }));
      }, 300);
    }
  };

  // ── Hover Voter Breakdown ──
  const handleHoverVoters = useCallback(async (suggestionId: string, type: 'up' | 'down') => {
    const target = suggestions.find((s) => s.id === suggestionId);
    const inlined = target?.voters_sample;

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

    if (votersCache[suggestionId]) {
      setHoveredVoters({
        suggestionId,
        type,
        loading: false,
        voters: type === 'up' ? votersCache[suggestionId].upvoters : votersCache[suggestionId].downvoters
      });
      return;
    }

    setHoveredVoters({ suggestionId, type, loading: true, voters: [] });

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
      console.error('Error fetching voters in admin view:', err);
      setHoveredVoters((curr) => (curr && curr.suggestionId === suggestionId ? { ...curr, loading: false } : null));
    }
  }, [suggestions, votersCache]);

  const handleLeaveVoters = useCallback(() => {
    setHoveredVoters(null);
  }, []);

  // Handle status update
  const handleStatusChange = async (suggestionId: string, newStatus: SuggestionStatus) => {
    setUpdatingStatusId(suggestionId);
    try {
      await updateCategorySuggestionStatus(suggestionId, newStatus);
      setSuggestions((prev) =>
        prev.map((s) => (s.id === suggestionId ? { ...s, status: newStatus } : s))
      );
      const config = FUNCTIONAL_STATUSES.find((st) => st.id === newStatus);
      toast.success(`Status updated to "${config?.label || newStatus}"`);
    } catch (err: any) {
      toast.error('Failed to update status', { description: err.message });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingSuggestion) return;
    setIsDeleting(true);
    try {
      await deleteCategorySuggestion(deletingSuggestion.id);
      setSuggestions((prev) => prev.filter((s) => s.id !== deletingSuggestion.id));
      toast.success('Category suggestion deleted');
      setDeletingSuggestion(null);
    } catch (err: any) {
      toast.error('Delete failed', { description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy details to clipboard
  const handleCopyDetails = (s: CategorySuggestion) => {
    navigator.clipboard.writeText(`Category: ${s.category_name}\nDescription: ${s.description}\nSuggested by: ${s.author_name} (Discord ID: ${s.discord_id || 'N/A'})\nScore: +${s.score}`);
    toast.success('Copied suggestion details to clipboard!');
  };

  // Computed status counts for filter tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: suggestions.length,
      open: 0,
      under_review: 0,
      approved: 0,
      implemented: 0,
      declined: 0,
      archived: 0
    };

    suggestions.forEach((s) => {
      const st = s.status || 'open';
      if (st === 'active' || st === 'open') counts.open += 1;
      else if (counts[st] !== undefined) counts[st] += 1;
      else counts.open += 1;
    });

    return counts;
  }, [suggestions]);

  // Total community votes cast metric
  const totalVotes = useMemo(
    () => suggestions.reduce((acc, s) => acc + s.upvotes + s.downvotes, 0),
    [suggestions]
  );

  // Total admin decision votes cast
  const totalAdminVotes = useMemo(
    () => suggestions.reduce((acc, s) => acc + (s.admin_votes?.length || 0), 0),
    [suggestions]
  );

  const topSuggestion = useMemo(() => {
    if (suggestions.length === 0) return null;
    return [...suggestions].sort((a, b) => b.score - a.score)[0];
  }, [suggestions]);

  // ── High-Performance In-Memory Stable Filtered & Ordered List ──
  const filteredSuggestions = useMemo(() => {
    // 1. If live autoReorder is enabled, directly use freshly sorted array
    if (autoReorder) {
      let result = [...suggestions];

      if (statusFilter !== 'all') {
        if (statusFilter === 'open') {
          result = result.filter((s) => !s.status || s.status === 'open' || s.status === 'active');
        } else {
          result = result.filter((s) => s.status === statusFilter);
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        result = result.filter(
          (s) =>
            s.category_name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            (s.author_name && s.author_name.toLowerCase().includes(q)) ||
            (s.discord_name && s.discord_name.toLowerCase().includes(q)) ||
            (s.discord_id && s.discord_id.includes(q))
        );
      }

      return sortSuggestions(result, sortBy);
    }

    // 2. In stable order mode: arrange suggestions according to orderedIds to prevent moving/jumping
    const suggestionMap = new Map<string, CategorySuggestion>(suggestions.map((s) => [s.id, s]));
    let orderedList: CategorySuggestion[] = [];

    orderedIds.forEach((id) => {
      const item = suggestionMap.get(id);
      if (item) {
        orderedList.push(item);
        suggestionMap.delete(id);
      }
    });

    // Add any newly arrived proposals not yet in orderedIds at the top/bottom
    suggestionMap.forEach((item: CategorySuggestion) => {
      if (sortBy === 'oldest') orderedList.push(item);
      else orderedList.unshift(item);
    });

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'open') {
        orderedList = orderedList.filter((s) => !s.status || s.status === 'open' || s.status === 'active');
      } else {
        orderedList = orderedList.filter((s) => s.status === statusFilter);
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      orderedList = orderedList.filter(
        (s) =>
          s.category_name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.author_name && s.author_name.toLowerCase().includes(q)) ||
          (s.discord_name && s.discord_name.toLowerCase().includes(q)) ||
          (s.discord_id && s.discord_id.includes(q))
      );
    }

    return orderedList;
  }, [suggestions, orderedIds, autoReorder, statusFilter, searchQuery, sortBy]);

  const getStatusDetails = (status?: string) => {
    const normalized = (!status || status === 'active') ? 'open' : status;
    return FUNCTIONAL_STATUSES.find((s) => s.id === normalized) || FUNCTIONAL_STATUSES[0];
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <AdminHeader
        badge="STAFF CURATION & COMMUNITY IDEAS"
        badgeColor="bg-orange-500/15 text-orange-400 border-orange-500/30"
        title="Category Suggestions Management"
        subtitle="Review community ideas, inspect public user votes, vote on whether staff will use proposals in upcoming contest rounds, and promote top concepts."
        icon={<Sparkles size={20} className="text-orange-400" />}
        iconBg="bg-orange-500/15 border-orange-500/30"
        actions={
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleManualRefresh()}
              disabled={refreshing}
              className={cn(
                "group relative px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-2.5 overflow-hidden select-none border",
                refreshing
                  ? "bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.35)]"
                  : "bg-white/[0.05] hover:bg-orange-500/10 text-white/80 hover:text-white border-white/10 hover:border-orange-500/40 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)]"
              )}
            >
              {/* Animated subtle sheen on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Animated Refresh Icon */}
              <motion.div
                animate={refreshing ? { rotate: 360 } : {}}
                transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: "linear" } : {}}
                className={cn(
                  "flex items-center justify-center transition-transform duration-500",
                  !refreshing && "group-hover:rotate-180"
                )}
              >
                <RefreshCw
                  size={14}
                  className={cn(
                    "transition-colors duration-300",
                    refreshing
                      ? "text-orange-400 drop-shadow-[0_0_6px_rgba(249,115,22,0.8)]"
                      : "text-white/60 group-hover:text-orange-400"
                  )}
                />
              </motion.div>

              <span className="relative z-10 font-bold">
                {refreshing ? 'Refreshing...' : 'Refresh Feed'}
              </span>

              {/* Status indicator dot */}
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300",
                  refreshing
                    ? "bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.9)] animate-ping"
                    : "bg-white/20 group-hover:bg-orange-400 group-hover:shadow-[0_0_6px_rgba(249,115,22,0.8)]"
                )}
              />
            </motion.button>
          </div>
        }
      />

      {/* ── Summary Telemetry Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Total Proposals</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black font-display text-white">
              <NumberTicker value={suggestions.length} />
            </span>
            <span className="text-[10px] font-mono text-white/30">topics</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Community Votes</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black font-display text-fivem-orange">
              <NumberTicker value={totalVotes} />
            </span>
            <span className="text-[10px] font-mono text-white/30">user votes</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Staff Contest Votes</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black font-display text-purple-400">
              <NumberTicker value={totalAdminVotes} />
            </span>
            <span className="text-[10px] font-mono text-purple-400/50">staff picks</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Top Community Concept</span>
          <div className="flex items-baseline gap-2 mt-2 truncate">
            <span className="text-2xl font-black font-display text-amber-300">
              {topSuggestion ? `+${topSuggestion.score}` : '0'}
            </span>
            <span className="text-[10px] font-mono text-white/40 truncate">
              {topSuggestion ? topSuggestion.category_name : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Status Filter Tab Bar with Live Count Pills ── */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/50 border border-white/10 overflow-x-auto no-scrollbar touch-pan-x">
        <button
          onClick={() => setStatusFilter('all')}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 select-none",
            statusFilter === 'all'
              ? "bg-white/15 text-white border border-white/20 shadow-sm"
              : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
          )}
        >
          <span>All Ideas</span>
          <span className={cn("px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold", statusFilter === 'all' ? "bg-white/20 text-white" : "bg-white/5 text-white/40")}>
            {statusCounts.all}
          </span>
        </button>

        {FUNCTIONAL_STATUSES.map((st) => {
          const Icon = st.icon;
          const isActive = statusFilter === st.id;
          const count = statusCounts[st.id] || 0;

          return (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 select-none",
                isActive
                  ? `${st.badge} shadow-sm border`
                  : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
              <span>{st.label}</span>
              <span className={cn("px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold", isActive ? "bg-white/20" : "bg-white/5 text-white/40")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search & Sort Toolbar + Anti-Jitter Stability Toggle ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 p-3 rounded-2xl bg-black/40 border border-white/10">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search proposals, keywords, submitters, or Discord ID..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 text-xs font-medium focus:outline-none focus:border-orange-400/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Stable vs Live Stream Toggle & Sort */}
        <div className="flex items-center gap-2 self-end sm:self-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => {
              if (!autoReorder) {
                handleApplyRanking();
              }
              setAutoReorder(!autoReorder);
            }}
            title={autoReorder ? "Switch to Stable Order (locks positions to prevent cards moving during high voting traffic)" : "Switch to Live Auto-Glide (moves cards as votes change)"}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer select-none shrink-0 border",
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

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-bold cursor-pointer focus:outline-none focus:border-orange-400/50"
          >
            <option value="top" className="bg-[#09090d]">Top Score (▲ Net Votes)</option>
            <option value="newest" className="bg-[#09090d]">Newest Proposals</option>
            <option value="lowest" className="bg-[#09090d]">Lowest Score</option>
            <option value="oldest" className="bg-[#09090d]">Oldest Proposals</option>
          </select>
        </div>
      </div>

      {/* ── Live Inbound Activity Banner ── */}
      <AnimatePresence>
        {pendingRankShifts > 0 && !autoReorder && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="p-3 rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 border border-orange-400/40 backdrop-blur-xl flex items-center justify-between gap-3 shadow-[0_8px_24px_rgba(234,88,12,0.2)]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-fivem-orange animate-ping shrink-0" />
              <span className="text-xs font-bold text-white truncate">
                Live vote activity: <span className="text-amber-300">{pendingRankShifts} {pendingRankShifts === 1 ? 'idea has' : 'ideas have'} moved rank in the background</span>
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

      {/* ── Suggestions Feed with Functional Workflow Actions & Dedicated Admin Contest Selection Voting ── */}
      {loading ? (
        <div className="p-12 text-center text-orange-400/50 font-mono text-xs flex items-center justify-center gap-2">
          <RefreshCw className="animate-spin" size={16} />
          <span>Loading Category Proposals...</span>
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-white/10 bg-white/[0.01]">
          <Sparkles className="w-10 h-10 mx-auto text-white/20 mb-3" />
          <p className="text-sm font-bold text-white/70">No category suggestions match your active filter.</p>
          <p className="text-xs text-white/40 mt-1 font-mono">Try clearing your search or switching status tabs above.</p>
        </div>
      ) : (
        <motion.div layout className="space-y-3.5">
          {filteredSuggestions.map((suggestion) => {
            const statusConfig = getStatusDetails(suggestion.status);
            const isApproved = suggestion.status === 'approved';
            const isDecisionVotingEligible = !suggestion.status || suggestion.status === 'open' || suggestion.status === 'active' || suggestion.status === 'under_review';

            const adminVotes: SuggestionAdminVote[] = suggestion.admin_votes || [];
            const currentAdminId = effectiveUserId || currentUser?.uid;
            const currentAdminHasVoted = adminVotes.some((v) =>
              v.adminId === currentAdminId ||
              (currentUser?.uid && v.adminId === currentUser.uid) ||
              (currentUser?.discordId && v.adminId === currentUser.discordId) ||
              (v.adminName && currentUser?.displayName && v.adminName.toLowerCase() === currentUser.displayName.toLowerCase())
            );

            return (
              <motion.div
                layout
                layoutId={`admin-suggestion-${suggestion.id}`}
                key={suggestion.id}
                transition={{
                  layout: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.25 }
                }}
                className={cn(
                  "p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4",
                  isApproved
                    ? "bg-purple-500/[0.06] border-purple-400/30 hover:border-purple-400/50 shadow-[0_0_24px_rgba(168,85,247,0.06)]"
                    : suggestion.status === 'under_review'
                    ? "bg-amber-500/[0.04] border-amber-400/30 hover:border-amber-400/50"
                    : suggestion.status === 'declined'
                    ? "bg-rose-500/[0.03] border-rose-500/20 opacity-75"
                    : suggestion.status === 'archived'
                    ? "bg-white/[0.01] border-white/5 opacity-60"
                    : "bg-[#0c0c10] border-white/10 hover:border-white/20"
                )}
              >
                {/* Left: Community Votes Capsule + Info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Public Community Vote Pill */}
                  <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-black/60 border border-white/10 shrink-0 min-w-[70px] text-center shadow-inner">
                    <span
                      className={cn(
                        "text-lg font-black font-display tracking-tight leading-none mb-1",
                        suggestion.score > 0
                          ? "text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]"
                          : suggestion.score < 0
                          ? "text-rose-400 drop-shadow-[0_0_6px_rgba(251,113,133,0.4)]"
                          : "text-white/60"
                      )}
                    >
                      {suggestion.score > 0 ? `+${suggestion.score}` : suggestion.score}
                    </span>
                    <span className="text-[8px] font-mono uppercase text-white/40 tracking-wider block">
                      {suggestion.upvotes}▲ {suggestion.downvotes}▼
                    </span>
                    <span className="text-[7px] font-mono text-fivem-orange/80 uppercase font-bold mt-1 tracking-tighter">
                      Community
                    </span>
                  </div>

                  {/* Suggestion Details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-base font-black font-display text-white truncate">
                        {suggestion.category_name}
                      </h4>

                      {/* Status Badge with Icon */}
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border", statusConfig.badge)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", statusConfig.dot)} />
                        <span>{statusConfig.label}</span>
                      </span>

                      {suggestion.is_admin_author && (
                        <span className="px-2 py-0.5 rounded bg-fivem-orange/20 text-[9px] font-mono text-fivem-orange uppercase font-bold border border-fivem-orange/30">
                          Admin Idea
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-white/70 line-clamp-2 leading-relaxed">
                      {suggestion.description}
                    </p>

                    {/* Submitter details & Live Voter Breakdown Hover Triggers */}
                    <div className="flex items-center gap-3 pt-0.5 text-[10px] font-mono text-white/40 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={getProfileAvatar(
                            suggestion.author_avatar_url,
                            suggestion.discord_id || suggestion.user_id,
                            'botttsNeutral'
                          )}
                          alt=""
                          className="w-4 h-4 rounded-full object-cover border border-white/10"
                        />
                        <span className="text-white/80 font-bold">{suggestion.author_name}</span>
                      </div>
                      {suggestion.discord_id && (
                        <span className="text-white/30">(ID: {suggestion.discord_id})</span>
                      )}
                      <span>•</span>
                      <span>{new Date(suggestion.created_at).toLocaleDateString()}</span>
                      <span>•</span>

                      {/* Upvote Hover Breakdown */}
                      <div
                        className="relative"
                        onMouseEnter={() => handleHoverVoters(suggestion.id, 'up')}
                        onMouseLeave={handleLeaveVoters}
                      >
                        <span className="text-emerald-400 font-bold hover:underline cursor-pointer">
                          {suggestion.upvotes}▲ Upvotes
                        </span>
                        <AnimatePresence>
                          {hoveredVoters?.suggestionId === suggestion.id && hoveredVoters.type === 'up' && (
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute bottom-full left-0 mb-2 z-50 w-60 p-3 rounded-2xl bg-[#0e0e13]/98 border border-emerald-500/30 shadow-[0_16px_36px_rgba(0,0,0,0.85)] backdrop-blur-2xl pointer-events-none text-left"
                            >
                              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10">
                                <span className="text-[11px] font-bold text-emerald-400">Community Upvoters</span>
                                <span className="text-[9px] font-mono text-white/40">{suggestion.upvotes}</span>
                              </div>
                              {hoveredVoters.voters.length === 0 ? (
                                <p className="text-[10px] text-white/40">No upvotes recorded yet.</p>
                              ) : (
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                  {hoveredVoters.voters.map((v) => (
                                    <div key={v.userId} className="flex items-center gap-1.5 text-[11px]">
                                      <img
                                        src={getProfileAvatar(v.authorAvatarUrl, v.discordId || v.userId, v.avatarStyle)}
                                        alt=""
                                        className="w-3.5 h-3.5 rounded-full object-cover border border-white/10 shrink-0"
                                      />
                                      <span className="font-bold text-white/90 truncate flex-1">{v.discordName}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Downvote Hover Breakdown */}
                      <div
                        className="relative"
                        onMouseEnter={() => handleHoverVoters(suggestion.id, 'down')}
                        onMouseLeave={handleLeaveVoters}
                      >
                        <span className="text-rose-400 font-bold hover:underline cursor-pointer">
                          {suggestion.downvotes}▼ Downvotes
                        </span>
                        <AnimatePresence>
                          {hoveredVoters?.suggestionId === suggestion.id && hoveredVoters.type === 'down' && (
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute bottom-full left-0 mb-2 z-50 w-60 p-3 rounded-2xl bg-[#0e0e13]/98 border border-rose-500/30 shadow-[0_16px_36px_rgba(0,0,0,0.85)] backdrop-blur-2xl pointer-events-none text-left"
                            >
                              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10">
                                <span className="text-[11px] font-bold text-rose-400">Community Downvoters</span>
                                <span className="text-[9px] font-mono text-white/40">{suggestion.downvotes}</span>
                              </div>
                              {hoveredVoters.voters.length === 0 ? (
                                <p className="text-[10px] text-white/40">No downvotes recorded yet.</p>
                              ) : (
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                  {hoveredVoters.voters.map((v) => (
                                    <div key={v.userId} className="flex items-center gap-1.5 text-[11px]">
                                      <img
                                        src={getProfileAvatar(v.authorAvatarUrl, v.discordId || v.userId, v.avatarStyle)}
                                        alt=""
                                        className="w-3.5 h-3.5 rounded-full object-cover border border-white/10 shrink-0"
                                      />
                                      <span className="font-bold text-white/90 truncate flex-1">{v.discordName}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* ── Staff Vote Section (Under Review or Open for Voting) ── */}
                    {isDecisionVotingEligible && (
                      <div className="mt-2.5 pt-2.5 border-t border-white/5 flex items-center justify-between gap-3 flex-wrap bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <ShieldCheck size={14} className="text-purple-400 shrink-0" />
                          <span className="text-xs font-bold text-white/90">
                            {suggestion.status === 'under_review' ? 'Review Decision:' : 'Use in Upcoming Contest?'}
                          </span>
                          <span className="text-xs font-mono font-bold text-purple-300">
                            {suggestion.status === 'under_review'
                              ? adminVotes.length === 0
                                ? 'Waiting for 2 admin votes to move to Open for Voting'
                                : adminVotes.length === 1
                                ? 'Waiting for 1 more vote to move to Open for Voting'
                                : 'Quorum reached'
                              : adminVotes.length === 0
                              ? 'Waiting for 2 admin votes to approve for contest'
                              : adminVotes.length === 1
                              ? 'Waiting for 1 more vote to approve for contest'
                              : 'Approved for contest'}
                          </span>

                          {/* Mini admin voter avatars */}
                          {adminVotes.length > 0 && (
                            <div className="flex items-center -space-x-1.5 ml-1">
                              {adminVotes.map((av, idx) => {
                                const isMe =
                                  av.adminId === currentAdminId ||
                                  av.adminId === currentUser?.uid ||
                                  av.adminId === currentUser?.discordId ||
                                  (av.adminName && currentUser?.displayName && av.adminName.toLowerCase() === currentUser.displayName.toLowerCase());
                                const resolvedAvatar = isMe ? (currentUser?.photoURL || av.adminAvatarUrl) : av.adminAvatarUrl;
                                return (
                                  <img
                                    key={av.adminId || idx}
                                    src={getProfileAvatar(resolvedAvatar, av.adminId || av.adminName, 'botttsNeutral')}
                                    title={`Voted Yes: ${av.adminName}${isMe ? ' (You)' : ''}`}
                                    alt=""
                                    className="w-5 h-5 rounded-full object-cover border border-purple-400/60 shadow-sm"
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Admin Vote Toggle Button */}
                        <button
                          onClick={() => handleAdminContestVote(suggestion.id)}
                          disabled={votingLocks[suggestion.id]}
                          className={cn(
                            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer active:scale-95 shadow-sm border",
                            currentAdminHasVoted
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40"
                              : "bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25 hover:text-white"
                          )}
                          title={
                            currentAdminHasVoted
                              ? "Click to remove your vote"
                              : suggestion.status === 'under_review'
                              ? "Vote to move this category to Open for Voting"
                              : "Vote to approve this category for an upcoming contest round"
                          }
                        >
                          <ThumbsUp size={13} className={cn(currentAdminHasVoted && "fill-current")} />
                          <span>
                            {currentAdminHasVoted
                              ? "✓ You Voted Yes (Undo)"
                              : suggestion.status === 'under_review'
                              ? "+ Vote to Open for Voting"
                              : "+ Vote to Use for Contest"}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Functional Admin Workflow Controls */}
                <div className="flex items-center gap-2 shrink-0 self-end xl:self-center flex-wrap pt-2 xl:pt-0">
                  {/* Functional Status Selector Dropdown */}
                  <div className="relative">
                    <select
                      value={suggestion.status || 'open'}
                      disabled={updatingStatusId === suggestion.id}
                      onChange={(e) => handleStatusChange(suggestion.id, e.target.value as SuggestionStatus)}
                      className="px-3 py-2 rounded-xl bg-black/70 border border-white/15 text-white text-xs font-bold cursor-pointer focus:outline-none focus:border-orange-400/60 disabled:opacity-50"
                    >
                      {FUNCTIONAL_STATUSES.map((st) => (
                        <option key={st.id} value={st.id} className="bg-[#0c0c10] text-white">
                          Status: {st.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Copy Details */}
                  <button
                    onClick={() => handleCopyDetails(suggestion)}
                    title="Copy concept details to clipboard"
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                  >
                    <Copy size={13} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeletingSuggestion(suggestion)}
                    title="Delete suggestion"
                    className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingSuggestion} onOpenChange={(open) => !open && setDeletingSuggestion(null)}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-md bg-[#0c0c10] border-white/15 text-white p-6 rounded-3xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-2">
              <Trash2 size={20} />
            </div>
            <DialogTitle className="text-base font-black font-display">
              Delete Suggestion "{deletingSuggestion?.category_name}"?
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50">
              This will permanently delete this category suggestion, all community votes, and staff decision records. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-white/10">
            <button
              onClick={() => setDeletingSuggestion(null)}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
            >
              {isDeleting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
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

export default AdminSuggestionsTab;
