import React, { useState, useEffect, useMemo } from 'react';
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
  Award
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { CategorySuggestion, SuggestionStatus, SuggestionSortOption } from '../../types';
import {
  fetchCategorySuggestions,
  subscribeCategorySuggestions,
  deleteCategorySuggestion,
  updateCategorySuggestionStatus,
  sortSuggestions
} from '../../lib/suggestionsService';
import { getProfileAvatar, getDiceBearAvatarUrl } from '../../lib/dicebear';
import { AdminHeader } from './AdminHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { NumberTicker } from '../ui/number-ticker';

interface AdminSuggestionsTabProps {
  onAddCategoryToContest?: (category: { name: string; description: string; emoji?: string }) => void;
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

export function AdminSuggestionsTab({ onAddCategoryToContest }: AdminSuggestionsTabProps) {
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

  // Real-time subscription to suggestions with zero repeated polling
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeCategorySuggestions(
      null,
      (data) => {
        setSuggestions(data);
        setLoading(false);
      },
      (err) => {
        console.error('Admin suggestions subscription error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchCategorySuggestions(null, 'top');
      setSuggestions(data);
      toast.success('Category suggestions refreshed');
    } catch (err: any) {
      toast.error('Failed to refresh', { description: err.message });
    } finally {
      setRefreshing(false);
    }
  };

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

  // Handle promote to active contest category
  const handlePromoteToContest = async (suggestion: CategorySuggestion) => {
    if (!onAddCategoryToContest) {
      toast.info('Category copied to clipboard!', {
        description: 'You can paste this into the Contest Setup categories editor.'
      });
      navigator.clipboard.writeText(`Name: ${suggestion.category_name}\nDescription: ${suggestion.description}`);
      return;
    }

    try {
      onAddCategoryToContest({
        name: suggestion.category_name,
        description: suggestion.description,
        emoji: '✨'
      });
      await handleStatusChange(suggestion.id, 'approved');
      toast.success(`Promoted "${suggestion.category_name}" to Contest Categories!`, {
        description: 'Status set to Approved for Contest.'
      });
    } catch (err: any) {
      toast.error('Failed to promote category', { description: err.message });
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

  // Total votes cast metric
  const totalVotes = useMemo(
    () => suggestions.reduce((acc, s) => acc + s.upvotes + s.downvotes, 0),
    [suggestions]
  );

  const topSuggestion = useMemo(() => {
    if (suggestions.length === 0) return null;
    return [...suggestions].sort((a, b) => b.score - a.score)[0];
  }, [suggestions]);

  // High-performance in-memory filtered & sorted list
  const filteredSuggestions = useMemo(() => {
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
  }, [suggestions, statusFilter, searchQuery, sortBy]);

  const getStatusDetails = (status?: string) => {
    const normalized = (!status || status === 'active') ? 'open' : status;
    return FUNCTIONAL_STATUSES.find((s) => s.id === normalized) || FUNCTIONAL_STATUSES[0];
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <AdminHeader
        badge="COMMUNITY BRAINSTORM"
        badgeColor="bg-orange-500/15 text-orange-400 border-orange-500/30"
        title="Category Suggestions Management"
        subtitle="Review community theme proposals, track Discord user votes, manage review workflows, and promote top concepts into active contest rounds."
        icon={<Sparkles size={20} className="text-orange-400" />}
        iconBg="bg-orange-500/15 border-orange-500/30"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleManualRefresh()}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <RefreshCw size={13} className={cn(refreshing && "animate-spin text-orange-400")} />
              <span>Refresh</span>
            </button>
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
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Total Votes Cast</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black font-display text-fivem-orange">
              <NumberTicker value={totalVotes} />
            </span>
            <span className="text-[10px] font-mono text-white/30">votes</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Approved for Contest</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black font-display text-purple-400">
              <NumberTicker value={statusCounts.approved} />
            </span>
            <span className="text-[10px] font-mono text-purple-400/50">selected</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Top Rated Concept</span>
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

      {/* ── Search & Sort Toolbar ── */}
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

        {/* Sort selector */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-[11px] font-mono text-white/40 hidden sm:inline-block">Sort by:</span>
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

      {/* ── Suggestions Feed with Functional Workflow Actions ── */}
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
        <div className="space-y-3.5">
          {filteredSuggestions.map((suggestion) => {
            const statusConfig = getStatusDetails(suggestion.status);
            const StatusIcon = statusConfig.icon;
            const isApproved = suggestion.status === 'approved';

            return (
              <div
                key={suggestion.id}
                className={cn(
                  "p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4",
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
                {/* Left: Vote Pill + Info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Vote Score Pill */}
                  <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-black/50 border border-white/10 shrink-0 min-w-[54px] text-center">
                    <span
                      className={cn(
                        "text-base font-black font-display",
                        suggestion.score > 0
                          ? "text-emerald-400"
                          : suggestion.score < 0
                          ? "text-rose-400"
                          : "text-white/60"
                      )}
                    >
                      {suggestion.score > 0 ? `+${suggestion.score}` : suggestion.score}
                    </span>
                    <span className="text-[8px] font-mono uppercase text-white/30 tracking-wider">
                      {suggestion.upvotes}▲ {suggestion.downvotes}▼
                    </span>
                  </div>

                  {/* Suggestion Details */}
                  <div className="flex-1 min-w-0 space-y-1.5">
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

                    {/* Submitter details */}
                    <div className="flex items-center gap-2 pt-1 text-[10px] font-mono text-white/40 flex-wrap">
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
                    </div>
                  </div>
                </div>

                {/* Right: Functional Admin Workflow Controls */}
                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center flex-wrap">
                  {/* 1-Click Promote to Contest Round */}
                  <button
                    onClick={() => handlePromoteToContest(suggestion)}
                    title="Promote this idea to active Contest Categories"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-bold font-mono transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <Plus size={13} className="text-purple-400" />
                    <span>Promote Category</span>
                  </button>

                  {/* Functional Status Selector Dropdown */}
                  <div className="relative">
                    <select
                      value={suggestion.status || 'open'}
                      disabled={updatingStatusId === suggestion.id}
                      onChange={(e) => handleStatusChange(suggestion.id, e.target.value as SuggestionStatus)}
                      className="px-3 py-1.5 rounded-xl bg-black/70 border border-white/15 text-white text-xs font-bold cursor-pointer focus:outline-none focus:border-orange-400/60 disabled:opacity-50"
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
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                  >
                    <Copy size={13} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeletingSuggestion(suggestion)}
                    title="Delete suggestion"
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
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
              This will permanently delete this category suggestion and all community votes cast on it. This action cannot be undone.
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
