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
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { CategorySuggestion } from '../../types';
import {
  fetchCategorySuggestions,
  deleteCategorySuggestion,
  updateCategorySuggestionStatus
} from '../../lib/suggestionsService';
import { getProfileAvatar, getDiceBearAvatarUrl } from '../../lib/dicebear';
import { AdminHeader } from './AdminHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { NumberTicker } from '../ui/number-ticker';

interface AdminSuggestionsTabProps {
  onAddCategoryToContest?: (category: { name: string; description: string; emoji?: string }) => void;
}

export function AdminSuggestionsTab({ onAddCategoryToContest }: AdminSuggestionsTabProps) {
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'shortlisted' | 'archived'>('all');
  const [sortBy, setSortBy] = useState<'top' | 'newest' | 'lowest'>('top');

  // Deletion modal state
  const [deletingSuggestion, setDeletingSuggestion] = useState<CategorySuggestion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await fetchCategorySuggestions(null, 'top');
      setSuggestions(data);
    } catch (err: any) {
      console.error('Error loading admin suggestions:', err);
      toast.error('Failed to load category suggestions', { description: err.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle status toggle
  const handleStatusChange = async (suggestionId: string, newStatus: 'active' | 'shortlisted' | 'archived') => {
    try {
      await updateCategorySuggestionStatus(suggestionId, newStatus);
      setSuggestions((prev) =>
        prev.map((s) => (s.id === suggestionId ? { ...s, status: newStatus } : s))
      );
      toast.success(`Suggestion status updated to ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      toast.error('Failed to update status', { description: err.message });
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
    navigator.clipboard.writeText(`Category: ${s.category_name}\nDescription: ${s.description}\nSuggested by: ${s.author_name} (Discord ID: ${s.discord_id || 'N/A'})`);
    toast.success('Copied suggestion details to clipboard!');
  };

  // Computed metrics
  const totalVotes = useMemo(
    () => suggestions.reduce((acc, s) => acc + s.upvotes + s.downvotes, 0),
    [suggestions]
  );
  const shortlistedCount = useMemo(
    () => suggestions.filter((s) => s.status === 'shortlisted').length,
    [suggestions]
  );
  const topSuggestion = useMemo(() => {
    if (suggestions.length === 0) return null;
    return [...suggestions].sort((a, b) => b.score - a.score)[0];
  }, [suggestions]);

  // Filtered & sorted list
  const filteredSuggestions = useMemo(() => {
    let result = [...suggestions];

    if (statusFilter !== 'all') {
      result = result.filter((s) => (s.status || 'active') === statusFilter);
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

    if (sortBy === 'top') {
      result.sort((a, b) => b.score - a.score);
    } else if (sortBy === 'lowest') {
      result.sort((a, b) => a.score - b.score);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [suggestions, statusFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <AdminHeader
        badge="COMMUNITY BRAINSTORM"
        badgeColor="bg-amber-500/15 text-amber-400 border-amber-500/30"
        title="Category Suggestions Management"
        subtitle="Review community-submitted theme proposals, track Discord user votes, and promote top ideas into active contest rounds."
        icon={<Sparkles size={20} className="text-amber-400" />}
        iconBg="bg-amber-500/15 border-amber-500/30"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(false)}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
            >
              <RefreshCw size={13} className={cn(refreshing && "animate-spin text-amber-400")} />
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
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Shortlisted / Curated</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black font-display text-emerald-400">
              <NumberTicker value={shortlistedCount} />
            </span>
            <span className="text-[10px] font-mono text-emerald-400/50">ready</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Leader Score</span>
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

      {/* ── Toolbar: Search & Filters ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 p-3 rounded-2xl bg-black/40 border border-white/10">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by concept, Discord user, or Discord ID..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 text-xs font-medium focus:outline-none focus:border-amber-400/50"
          />
        </div>

        {/* Status Filters & Sorting */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/10">
            {(['all', 'active', 'shortlisted', 'archived'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer",
                  statusFilter === st
                    ? "bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                {st}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-bold cursor-pointer focus:outline-none focus:border-amber-400/50"
          >
            <option value="top" className="bg-[#09090d]">Sort: Top Score</option>
            <option value="newest" className="bg-[#09090d]">Sort: Newest</option>
            <option value="lowest" className="bg-[#09090d]">Sort: Lowest Score</option>
          </select>
        </div>
      </div>

      {/* ── Suggestions Management Feed / Table ── */}
      {loading ? (
        <div className="p-12 text-center text-amber-400/50 font-mono text-xs flex items-center justify-center gap-2">
          <RefreshCw className="animate-spin" size={16} />
          <span>Loading Category Proposals...</span>
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-white/10 bg-white/[0.01]">
          <Sparkles className="w-10 h-10 mx-auto text-white/20 mb-3" />
          <p className="text-sm font-bold text-white/70">No category suggestions match your filter.</p>
          <p className="text-xs text-white/40 mt-1 font-mono">Check back when community members propose new themes.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredSuggestions.map((suggestion) => {
            const isShortlisted = suggestion.status === 'shortlisted';
            const isArchived = suggestion.status === 'archived';

            return (
              <div
                key={suggestion.id}
                className={cn(
                  "p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4",
                  isShortlisted
                    ? "bg-amber-500/[0.06] border-amber-400/30 hover:border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.05)]"
                    : isArchived
                    ? "bg-white/[0.01] border-white/5 opacity-60"
                    : "bg-[#0c0c10] border-white/10 hover:border-white/20"
                )}
              >
                {/* Left: Vote Pill + Details */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Vote score badge */}
                  <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-black/50 border border-white/10 shrink-0 min-w-[50px] text-center">
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

                  {/* Suggestion Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black font-display text-white truncate">
                        {suggestion.category_name}
                      </h4>

                      {/* Status badge */}
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider",
                          isShortlisted
                            ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                            : isArchived
                            ? "bg-white/10 text-white/40 border border-white/10"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        )}
                      >
                        {suggestion.status || 'Active'}
                      </span>

                      {suggestion.is_admin_author && (
                        <span className="px-1.5 py-0.5 rounded bg-fivem-orange/20 text-[8px] font-mono text-fivem-orange uppercase font-bold">
                          Admin Submission
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
                        <span>(Discord ID: {suggestion.discord_id})</span>
                      )}
                      <span>•</span>
                      <span>{new Date(suggestion.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Moderation Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
                  {/* Status Dropdown */}
                  <select
                    value={suggestion.status || 'active'}
                    onChange={(e) => handleStatusChange(suggestion.id, e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-xl bg-black/60 border border-white/15 text-white text-[11px] font-bold cursor-pointer focus:outline-none focus:border-amber-400/50"
                  >
                    <option value="active" className="bg-[#09090d]">Status: Active</option>
                    <option value="shortlisted" className="bg-[#09090d]">Status: Shortlisted ⭐</option>
                    <option value="archived" className="bg-[#09090d]">Status: Archived</option>
                  </select>

                  {/* Copy Details */}
                  <button
                    onClick={() => handleCopyDetails(suggestion)}
                    title="Copy suggestion details"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                  >
                    <Copy size={13} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeletingSuggestion(suggestion)}
                    title="Delete suggestion"
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors cursor-pointer"
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
              This will permanently delete this category suggestion and all votes cast on it. This action cannot be undone.
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
              className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
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
