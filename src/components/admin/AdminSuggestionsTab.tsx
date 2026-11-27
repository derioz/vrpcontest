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
  UserCheck,
  Users,
  Edit3,
  Download,
  Sliders
} from 'lucide-react';
import { CategorySuggestionsSettingsModal } from './CategorySuggestionsSettingsModal';
import { toast } from '../ui/toast';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';
import { CategorySuggestion, SuggestionStatus, SuggestionSortOption, SuggestionAdminVote } from '../../types';
import {
  fetchCategorySuggestions,
  deleteCategorySuggestion,
  updateCategorySuggestionStatus,
  updateCategorySuggestionContent,
  toggleAdminSuggestionVote,
  fetchSuggestionVoters,
  SuggestionVoter,
  sortSuggestions,
  submitCategorySuggestion,
  exportSuggestionsToCSV
} from '../../lib/suggestionsService';
import { getProfileAvatar, getDiceBearAvatarUrl } from '../../lib/dicebear';
import { AdminHeader } from './AdminHeader';
import { Button as KitButton, EmptyState, Panel, SearchField, Segmented, fieldClass } from './kit';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

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
    dot: 'bg-emerald-400',
    icon: CheckCircle2,
    description: 'Community members can vote and submit ideas'
  },
  {
    id: 'under_review',
    label: 'Under Review',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400',
    icon: Clock,
    description: 'Staff is reviewing and discussing this concept'
  },
  {
    id: 'approved',
    label: 'Approved for Contest',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    dot: 'bg-purple-400',
    icon: Award,
    description: 'Selected to be used in an upcoming contest round'
  },
  {
    id: 'implemented',
    label: 'Implemented / Used',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-400',
    icon: Layers,
    description: 'Featured in an active or archived competition'
  },
  {
    id: 'declined',
    label: 'Declined',
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    dot: 'bg-rose-400',
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

  // ── Inline Edit Suggestion State ──
  const [editingSuggestion, setEditingSuggestion] = useState<CategorySuggestion | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // ── Admin Create Suggestion State ──
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [isCreatingSuggestion, setIsCreatingSuggestion] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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
          toast.success(`2/2 Admin Votes Reached`, {
            description: `"${target.category_name}" has moved to Open for Voting!`
          });
        } else if (voteResult.transitionType === 'approved_for_contest') {
          toast.success(`2/2 Admin Votes Reached`, {
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
      setVotingLocks((prev) => ({ ...prev, [suggestionId]: false }));
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

  // ── CSV Export Handler ──
  const handleExportCSV = () => {
    try {
      const csvData = exportSuggestionsToCSV(suggestions);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `vital_category_suggestions_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Suggestions CSV Exported!');
    } catch (err: any) {
      toast.error('Failed to export CSV', { description: err.message });
    }
  };

  // ── Inline Edit Handlers ──
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
      await updateCategorySuggestionContent(editingSuggestion.id, {
        category_name: trimmedTitle,
        description: editDescription.trim()
      });
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
      toast.error('Failed to update suggestion', { description: err.message });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ── Admin Create Suggestion Handler ──
  const handleCreateSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newCategoryName.trim();
    if (!trimmedTitle) {
      toast.error('Category title cannot be empty.');
      return;
    }

    setIsCreatingSuggestion(true);
    try {
      const created = await submitCategorySuggestion({
        category_name: trimmedTitle,
        description: newCategoryDescription.trim(),
        user_id: effectiveUserId || currentUser?.uid || 'admin',
        author_name: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Staff Admin',
        discord_name: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Staff Admin',
        discord_id: currentUser?.discordId || null,
        is_admin_author: true,
        status: 'open'
      });
      setSuggestions((prev) => [created, ...prev]);
      toast.success(`Category "${trimmedTitle}" created!`);
      setNewCategoryName('');
      setNewCategoryDescription('');
      setIsCreateModalOpen(false);
    } catch (err: any) {
      toast.error('Failed to create suggestion', { description: err.message });
    } finally {
      setIsCreatingSuggestion(false);
    }
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

  return (
    <div className="space-y-4">
      {/* Admin Header */}
      <AdminHeader
        title="Category suggestions"
        subtitle={`${suggestions.length} proposals, ${totalVotes} player votes, ${totalAdminVotes} staff votes.${topSuggestion?.category_name ? ` Leading: ${topSuggestion.category_name} (+${topSuggestion.score}).` : ''}`}
        actions={
          <>
            <KitButton onClick={() => handleManualRefresh()} disabled={refreshing}>
              <RefreshCw size={14} aria-hidden="true" className={cn(refreshing && 'animate-spin')} />
              {refreshing ? 'Refreshing' : 'Refresh'}
            </KitButton>
            <KitButton onClick={handleExportCSV} title="Export all proposals to CSV">
              <Download size={14} aria-hidden="true" /> Export CSV
            </KitButton>
            <KitButton onClick={() => setIsSettingsModalOpen(true)} title="Monthly theme title and countdown">
              <Sliders size={14} aria-hidden="true" /> Page settings
            </KitButton>
            <KitButton variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={15} aria-hidden="true" /> New suggestion
            </KitButton>
          </>
        }
      />

      <Segmented
        label="Status"
        value={statusFilter as string}
        onChange={(id) => setStatusFilter(id as typeof statusFilter)}
        options={[
          { value: 'all', label: 'All', count: statusCounts.all },
          ...FUNCTIONAL_STATUSES.map((st) => ({ value: st.id as string, label: st.label, count: statusCounts[st.id] || 0 })),
        ]}
      />

      {/* ── Search & Sort Toolbar + Anti-Jitter Stability Toggle ── */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search proposals, submitters or Discord ID"
          className="min-w-52 flex-1 sm:max-w-sm"
        />
        <select
          aria-label="Sort proposals"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className={cn(fieldClass, 'cursor-pointer')}
        >
          <option value="top">Top score</option>
          <option value="newest">Newest first</option>
          <option value="lowest">Lowest score</option>
          <option value="oldest">Oldest first</option>
        </select>
        <button
          type="button"
          data-choice
          aria-pressed={autoReorder}
          onClick={() => {
            if (!autoReorder) {
              handleApplyRanking();
            }
            setAutoReorder(!autoReorder);
          }}
          title={autoReorder ? 'Rows move as votes change. Click to lock their positions.' : 'Rows stay put while votes come in. Click to reorder them live.'}
          className="flex h-9 shrink-0 cursor-pointer select-none items-center gap-1.5 px-3 text-xs font-semibold"
        >
          {autoReorder ? (
            <>
              <Flame size={13} aria-hidden="true" /> Live order
            </>
          ) : (
            <>
              <ShieldCheck size={13} aria-hidden="true" /> Stable order
            </>
          )}
        </button>
      </div>

      {/* ── Live Inbound Activity Banner ── */}
      <AnimatePresence>
        {pendingRankShifts > 0 && !autoReorder && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="p-3 rounded-lg bg-white/[0.03] border border-orange-400/40  flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-fivem-orange shrink-0" />
              <span className="text-xs font-bold text-white truncate">
                Live vote activity: <span className="text-amber-300">{pendingRankShifts} {pendingRankShifts === 1 ? 'idea has' : 'ideas have'} moved rank in the background</span>
              </span>
            </div>
            <button data-btn="primary"
              onClick={handleApplyRanking}
              className="px-3.5 py-1.5 rounded-md bg-fivem-orange text-white text-xs font-bold transition-all cursor-pointer   flex items-center gap-1.5 shrink-0"
            >
              <Sparkles size={12} />
              <span>Update Ranking</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Suggestions Feed with Functional Workflow Actions & Dedicated Admin Contest Selection Voting ── */}
      {loading ? (
        <Panel>
          <div className="space-y-4 p-4" role="status" aria-label="Loading proposals">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        </Panel>
      ) : filteredSuggestions.length === 0 ? (
        <Panel>
          <EmptyState title="No proposals match">Clear the search or choose another status.</EmptyState>
        </Panel>
      ) : (
        <motion.div layout className="rounded-lg border border-white/10 bg-[#0c0c10]">
          {filteredSuggestions.map((suggestion) => {
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
              <motion.article
                layout
                layoutId={`admin-suggestion-${suggestion.id}`}
                key={suggestion.id}
                transition={{
                  layout: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.25 }
                }}
                className={cn(
                  'flex flex-col gap-3 border-b border-white/[0.07] p-4 first:rounded-t-lg last:rounded-b-lg last:border-b-0 xl:flex-row xl:items-start xl:gap-4',
                  isApproved && 'bg-purple-500/[0.07]',
                  suggestion.status === 'under_review' && 'bg-amber-500/[0.05]',
                )}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {/* Community score */}
                  <div className="w-12 shrink-0 pt-0.5 text-center" title="Community score: upvotes minus downvotes">
                    <span
                      className={cn(
                        'block font-display text-xl font-bold leading-none tabular-nums',
                        suggestion.score > 0 ? 'text-emerald-400' : suggestion.score < 0 ? 'text-rose-400' : 'text-white/60'
                      )}
                    >
                      {suggestion.score > 0 ? `+${suggestion.score}` : suggestion.score}
                    </span>
                    <span className="mt-1 block text-xs text-white/55">score</span>
                  </div>

                  {/* Suggestion Details */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <h2 className="min-w-0 break-words text-sm font-semibold text-white">{suggestion.category_name}</h2>
                      {suggestion.is_admin_author && <span className="text-xs font-semibold text-fivem-orange">Admin idea</span>}
                    </div>

                    {suggestion.description && (
                      <p className="line-clamp-2 max-w-prose text-sm leading-relaxed text-white/70">{suggestion.description}</p>
                    )}

                    {/* Submitter details & Live Voter Breakdown Hover Triggers */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-white/55">
                      <span className="flex items-center gap-1.5">
                        <img
                          src={getProfileAvatar(
                            suggestion.author_avatar_url,
                            suggestion.discord_id || suggestion.user_id,
                            'botttsNeutral'
                          )}
                          alt=""
                          className="h-4 w-4 rounded-full object-cover"
                        />
                        <span className="font-semibold text-white/80">{suggestion.author_name}</span>
                      </span>
                      {suggestion.discord_id && <span>ID {suggestion.discord_id}</span>}
                      <span>{new Date(suggestion.created_at).toLocaleDateString()}</span>

                      {(['up', 'down'] as const).map((type) => {
                        const total = type === 'up' ? suggestion.upvotes : suggestion.downvotes;
                        const noun = type === 'up' ? 'upvotes' : 'downvotes';
                        const open = hoveredVoters?.suggestionId === suggestion.id && hoveredVoters.type === type;
                        return (
                          <div
                            key={type}
                            className="relative"
                            onMouseEnter={() => handleHoverVoters(suggestion.id, type)}
                            onMouseLeave={handleLeaveVoters}
                          >
                            <button
                              type="button"
                              onFocus={() => handleHoverVoters(suggestion.id, type)}
                              onBlur={handleLeaveVoters}
                              onClick={() => handleHoverVoters(suggestion.id, type)}
                              className={cn(
                                '-my-1 cursor-pointer py-1 font-semibold underline decoration-dotted underline-offset-2 focus-visible:outline-2 focus-visible:outline-fivem-orange',
                                type === 'up' ? 'text-emerald-400' : 'text-rose-400'
                              )}
                            >
                              {total} {total === 1 ? noun.slice(0, -1) : noun}
                            </button>
                            <AnimatePresence>
                              {open && (
                                <motion.div
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 4 }}
                                  transition={{ duration: 0.15 }}
                                  className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-56 rounded-lg border border-white/15 bg-[#14141b] p-3 text-left shadow-xl"
                                >
                                  <p className="mb-1.5 border-b border-white/10 pb-1.5 text-xs font-semibold text-white">Who left {noun}</p>
                                  {hoveredVoters.voters.length === 0 ? (
                                    <p className="text-xs text-white/55">No {noun} recorded yet.</p>
                                  ) : (
                                    <ul className="max-h-32 space-y-1 overflow-y-auto">
                                      {hoveredVoters.voters.map((v) => (
                                        <li key={v.userId} className="flex items-center gap-1.5 text-xs">
                                          <img
                                            src={getProfileAvatar(v.authorAvatarUrl, v.discordId || v.userId, v.avatarStyle)}
                                            alt=""
                                            className="h-3.5 w-3.5 shrink-0 rounded-full object-cover"
                                          />
                                          <span className="flex-1 truncate font-semibold text-white/90">{v.discordName}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>

                    {/* ── Staff Vote Section (Under Review or Open for Voting) ── */}
                    {isDecisionVotingEligible && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1.5">
                        {/* Admin Vote Toggle Button */}
                        <button
                          type="button"
                          data-btn={currentAdminHasVoted ? 'success' : 'secondary'}
                          onClick={() => handleAdminContestVote(suggestion.id)}
                          disabled={votingLocks[suggestion.id]}
                          className="flex h-8 cursor-pointer items-center gap-1.5 px-3 text-xs font-semibold"
                          title={
                            currentAdminHasVoted
                              ? 'Click to remove your vote'
                              : suggestion.status === 'under_review'
                              ? 'Vote to move this category to Open for Voting'
                              : 'Vote to approve this category for an upcoming contest round'
                          }
                        >
                          <ThumbsUp size={13} aria-hidden="true" className={cn(currentAdminHasVoted && 'fill-current')} />
                          {currentAdminHasVoted
                            ? 'You voted yes (undo)'
                            : suggestion.status === 'under_review'
                            ? 'Vote to open voting'
                            : 'Vote to use in a contest'}
                        </button>

                        {/* Admin voter avatars */}
                        {adminVotes.length > 0 && (
                          <div className="flex items-center -space-x-1.5">
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
                                  title={`Voted yes: ${av.adminName}${isMe ? ' (you)' : ''}`}
                                  alt={av.adminName}
                                  className="h-6 w-6 rounded-full border border-white/30 object-cover"
                                />
                              );
                            })}
                          </div>
                        )}

                        <span className="text-xs text-white/60">
                          {suggestion.status === 'under_review'
                            ? adminVotes.length === 0
                              ? 'Needs 2 staff votes to open voting'
                              : adminVotes.length === 1
                              ? 'Needs 1 more staff vote to open voting'
                              : 'Both staff votes are in'
                            : adminVotes.length === 0
                            ? 'Needs 2 staff votes to approve'
                            : adminVotes.length === 1
                            ? 'Needs 1 more staff vote to approve'
                            : 'Approved for a contest'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Functional Admin Workflow Controls */}
                <div className="flex shrink-0 items-center gap-1 pl-[3.75rem] xl:pl-0">
                  <select
                    aria-label={`Status of ${suggestion.category_name}`}
                    value={suggestion.status || 'open'}
                    disabled={updatingStatusId === suggestion.id}
                    onChange={(e) => handleStatusChange(suggestion.id, e.target.value as SuggestionStatus)}
                    className={cn(fieldClass, 'mr-1 h-8 min-w-0 cursor-pointer px-2 text-xs font-semibold disabled:opacity-50')}
                  >
                    {FUNCTIONAL_STATUSES.map((st) => (
                      <option key={st.id} value={st.id}>{st.label}</option>
                    ))}
                  </select>
                  <KitButton variant="ghost" size="sm" onClick={() => handleOpenEditModal(suggestion)} title="Edit title and description" aria-label={`Edit ${suggestion.category_name}`}>
                    <Edit3 size={14} aria-hidden="true" />
                  </KitButton>
                  <KitButton variant="ghost" size="sm" onClick={() => handleCopyDetails(suggestion)} title="Copy details" aria-label={`Copy details of ${suggestion.category_name}`}>
                    <Copy size={14} aria-hidden="true" />
                  </KitButton>
                  <KitButton variant="ghost" size="sm" onClick={() => setDeletingSuggestion(suggestion)} title="Delete suggestion" aria-label={`Delete ${suggestion.category_name}`} className="text-white/55 hover:!text-red-400">
                    <Trash2 size={14} aria-hidden="true" />
                  </KitButton>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingSuggestion} onOpenChange={(open) => !open && setDeletingSuggestion(null)}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-md bg-[#0c0c10] border-white/15 text-white p-6 rounded-lg">
          <DialogHeader>
            <div className="w-12 h-12 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-2">
              <Trash2 size={20} />
            </div>
            <DialogTitle className="text-base font-bold font-display">
              Delete Suggestion "{deletingSuggestion?.category_name}"?
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50">
              This will permanently delete this category suggestion, all community votes, and staff decision records. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-white/10">
            <button data-btn="secondary"
              onClick={() => setDeletingSuggestion(null)}
              disabled={isDeleting}
              className="px-4 py-2 rounded-md bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold"
            >
              Cancel
            </button>
            <button data-btn="danger"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-5 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
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

      {/* ── Edit Suggestion Dialog ── */}
      <Dialog open={!!editingSuggestion} onOpenChange={(open) => !open && setEditingSuggestion(null)}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-lg bg-[#0c0c14] border-white/15 text-white p-6 rounded-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Edit3 size={20} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold font-display">
                  Edit Category Suggestion
                </DialogTitle>
                <DialogDescription className="text-xs text-white/50">
                  Update title or description to fix typos or adjust theme details.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 mt-2">
            <div>
              <label className="text-xs tabular-nums font-bold text-white/70 block mb-1">
                Category Title
              </label>
              <input
                type="text"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                required
                maxLength={100}
                className="w-full px-3.5 py-2.5 rounded-md bg-white/[0.04] border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-amber-400/60"
              />
            </div>

            <div>
              <label className="text-xs tabular-nums font-bold text-white/70 block mb-1">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full px-3.5 py-2.5 rounded-md bg-white/[0.04] border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400/60 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button data-btn="secondary"
                type="button"
                onClick={() => setEditingSuggestion(null)}
                className="px-4 py-2 rounded-md bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold"
              >
                Cancel
              </button>
              <button data-btn="primary"
                type="submit"
                disabled={isSavingEdit || !editCategoryName.trim()}
                className="px-5 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingEdit ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
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

      {/* ── Admin Create Suggestion Dialog ── */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-lg bg-[#0c0c14] border-white/15 text-white p-6 rounded-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Plus size={20} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold font-display">
                  Add Category Suggestion (Staff)
                </DialogTitle>
                <DialogDescription className="text-xs text-white/50">
                  Directly post a new contest category idea to community voting.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateSuggestion} className="space-y-4 mt-2">
            <div>
              <label className="text-xs tabular-nums font-bold text-white/70 block mb-1">
                Category Title <span className="text-fivem-orange">*</span>
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Nighttime Street Drifting..."
                required
                maxLength={100}
                className="w-full px-3.5 py-2.5 rounded-md bg-white/[0.04] border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-orange-400/60"
              />
            </div>

            <div>
              <label className="text-xs tabular-nums font-bold text-white/70 block mb-1">
                Description (Optional)
              </label>
              <textarea
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Theme instructions, location guidelines, rules..."
                rows={3}
                maxLength={1000}
                className="w-full px-3.5 py-2.5 rounded-md bg-white/[0.04] border border-white/15 text-white text-xs focus:outline-none focus:border-orange-400/60 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button data-btn="secondary"
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-md bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold"
              >
                Cancel
              </button>
              <button data-btn="primary"
                type="submit"
                disabled={isCreatingSuggestion || !newCategoryName.trim()}
                className="px-5 py-2 rounded-md bg-fivem-orange text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isCreatingSuggestion ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Suggestion</span>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Suggestions Page Hero & Countdown Customizer Modal */}
      <CategorySuggestionsSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
}

export default AdminSuggestionsTab;
