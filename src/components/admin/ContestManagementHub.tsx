import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Pause,
  RotateCcw,
  Plus,
  Edit3,
  Archive,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  Download,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  Info,
  X,
  History,
} from 'lucide-react';
import { Button as KitButton, EmptyState, Modal, PageHeader, Panel, Row, SearchField, Segmented } from './kit';
import { db } from '../../lib/firebase';
import { toast } from '../ui/toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Category, Photo, Contest, ContestAuditLog } from '../../types';
import {
  fetchAllContests,
  fetchContestAuditLogs,
  pauseAndCreateNewContest,
  restoreSavedContest,
  pauseActiveContest,
  deleteContest,
  updateContestDetails,
  formatRemainingTime,
  AdminActor,
} from '../../lib/contestManagerService';
import {
  EditContestManager,
  ArchiveContest,
  CreateContestManager,
  MarkdownLivePreview,
  STANDARD_RULES_TEMPLATE,
  SHORT_RULES_TEMPLATE,
} from './ContestManagers';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface ContestManagementHubProps {
  activeContest: {
    id: string;
    name: string;
    submissions_close_date?: string;
    voting_end_date?: string;
    status?: string;
    phase?: string;
    description?: string;
  } | null;
  categories: Category[];
  allPhotos: Photo[];
  rawAllPhotos?: Photo[];
  rulesMarkdown: string;
  winners: any[];
  user: any;
  isAdmin: boolean;
  votingOpen: boolean;
  submissionsOpen: boolean;
  onDownloadWinners: () => void;
  onContestChanged?: () => void;
}

export function ContestManagementHub({
  activeContest,
  categories,
  allPhotos,
  rawAllPhotos = [],
  rulesMarkdown,
  winners,
  user,
  isAdmin,
  votingOpen,
  submissionsOpen,
  onDownloadWinners,
  onContestChanged,
}: ContestManagementHubProps) {
  // Navigation sub-tabs inside Contest Hub
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'saved' | 'wizard' | 'edit' | 'audit'>(
    'dashboard'
  );

  // Contests list and audit logs
  const [allContests, setAllContests] = useState<Contest[]>([]);
  const [auditLogs, setAuditLogs] = useState<ContestAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filter for Saved Contests
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paused' | 'archived'>('all');

  // Modals state
  const [showPauseWizard, setShowPauseWizard] = useState(false);
  const [restoringContest, setRestoringContest] = useState<Contest | null>(null);
  const [pausingActiveModal, setPausingActiveModal] = useState(false);
  const [deletingContest, setDeletingContest] = useState<Contest | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Current admin actor
  const adminActor: AdminActor = useMemo(
    () => ({
      uid: user?.uid || 'admin',
      name: user?.displayName || user?.email || 'Administrator',
      avatarUrl: user?.photoURL || undefined,
    }),
    [user]
  );

  // Load all contests and audit logs
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const [contests, logs] = await Promise.all([
        fetchAllContests(),
        fetchContestAuditLogs(50),
      ]);
      setAllContests(contests);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load contest data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [activeContest?.id]);

  // Derived Saved Contests (Exclude currently active contest)
  const savedContests = useMemo(() => {
    return allContests.filter((c) => {
      // Exclude the currently active contest
      if (activeContest?.id && c.id === activeContest.id && c.is_active) return false;
      return true;
    });
  }, [allContests, activeContest?.id]);

  // Filtered Saved Contests
  const filteredSavedContests = useMemo(() => {
    return savedContests.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      if (statusFilter === 'all') return true;
      if (statusFilter === 'paused') return c.status === 'paused';
      if (statusFilter === 'archived') return c.status === 'archived';
      return true;
    });
  }, [savedContests, searchQuery, statusFilter]);

  // Current Contest stats
  const activeContestRemainingSubmissionsMs = useMemo(() => {
    if (!activeContest?.submissions_close_date) return undefined;
    return Math.max(0, new Date(activeContest.submissions_close_date).getTime() - Date.now());
  }, [activeContest?.submissions_close_date]);

  const activeContestRemainingVotingMs = useMemo(() => {
    if (!activeContest?.voting_end_date) return undefined;
    return Math.max(0, new Date(activeContest.voting_end_date).getTime() - Date.now());
  }, [activeContest?.voting_end_date]);

  const activePhase = useMemo(() => {
    if (votingOpen) return 'voting';
    if (submissionsOpen) return 'submissions';
    return 'completed';
  }, [votingOpen, submissionsOpen]);

  // Quick Pause Handler
  const handleConfirmPauseActive = async () => {
    if (!activeContest?.id) return;
    setIsActionLoading(true);
    try {
      await pauseActiveContest(activeContest.id, activeContest.name, adminActor, {
        currentPhotos: allPhotos,
        currentCategories: categories,
        submissions_close_date: activeContest.submissions_close_date,
        voting_end_date: activeContest.voting_end_date,
        submissionsOpen,
        votingOpen,
        rulesMarkdown,
      });
      toast.success(`Contest "${activeContest.name}" has been safely paused.`);
      setPausingActiveModal(false);
      refreshData();
      onContestChanged?.();
    } catch (err: any) {
      console.error('Pause contest error:', err);
      toast.error('Failed to pause contest: ' + (err.message || 'Unknown error'));
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contest setup"
        actions={
          <>
            <KitButton onClick={refreshData} disabled={isRefreshing} aria-label="Refresh contest records">
              <RefreshCw size={14} aria-hidden="true" className={isRefreshing ? 'animate-spin' : ''} />
            </KitButton>
            <KitButton variant="primary" onClick={() => setShowPauseWizard(true)}>
              <Plus size={15} aria-hidden="true" /> {activeContest ? 'Pause and create new' : 'Create contest'}
            </KitButton>
          </>
        }
      />

      <Segmented
        label="Contest view"
        value={activeSubTab}
        onChange={(v) => setActiveSubTab(v)}
        options={[
          { value: 'dashboard', label: 'Current' },
          { value: 'saved', label: 'Saved', count: savedContests.length },
          { value: 'edit', label: 'Categories and rules' },
          { value: 'audit', label: 'History' },
        ]}
      />

      {/* ── TAB 1: DASHBOARD VIEW ── */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-8">
          {activeContest ? (
            <Panel
              title={activeContest.name}
              description={`Phase: ${activePhase}`}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <KitButton size="sm" onClick={() => setPausingActiveModal(true)}>
                    <Pause size={14} aria-hidden="true" /> Pause
                  </KitButton>
                  <KitButton size="sm" onClick={() => setActiveSubTab('edit')}>
                    <Edit3 size={14} aria-hidden="true" /> Edit
                  </KitButton>
                  <KitButton size="sm" onClick={onDownloadWinners} title="Download first place winners as a ZIP">
                    <Download size={14} aria-hidden="true" /> Winners
                  </KitButton>
                </div>
              }
            >
              {activeContest.description && (
                <p className="max-w-prose border-b border-white/[0.07] px-4 py-3 text-sm text-white/70">{activeContest.description}</p>
              )}
              <Row label="Entries" description={`Across ${categories.length} categories`}>
                <span className="text-sm font-semibold tabular-nums">{allPhotos.length}</span>
              </Row>
              <Row label="Votes">
                <span className="text-sm font-semibold tabular-nums">{allPhotos.reduce((sum, p) => sum + (p.vote_count || 0), 0)}</span>
              </Row>
              <Row
                label="Submissions deadline"
                description={activeContest.submissions_close_date ? new Date(activeContest.submissions_close_date).toLocaleString() : 'Open'}
              >
                <span className="text-sm text-white/80">
                  {activeContestRemainingSubmissionsMs != null ? formatRemainingTime(activeContestRemainingSubmissionsMs) : 'No deadline'}
                </span>
              </Row>
              <Row
                label="Voting deadline"
                description={activeContest.voting_end_date ? new Date(activeContest.voting_end_date).toLocaleString() : 'Pending'}
              >
                <span className="text-sm text-white/80">
                  {activeContestRemainingVotingMs != null ? formatRemainingTime(activeContestRemainingVotingMs) : 'No deadline'}
                </span>
              </Row>
            </Panel>
          ) : (
            <Panel>
              <EmptyState title="No active contest">Restore a saved contest below, or create a new round.</EmptyState>
            </Panel>
          )}

          {/* Saved Contests Quick Preview Section */}
          <Panel
            title="Saved contests"
            description="Paused and archived rounds keep their entries, votes and deadlines."
            actions={
              savedContests.length > 3 ? (
                <KitButton size="sm" onClick={() => setActiveSubTab('saved')}>
                  View all {savedContests.length}
                </KitButton>
              ) : undefined
            }
          >
            {savedContests.length === 0 ? (
              <EmptyState title="Nothing saved yet">When you pause a contest to start a new one, it is kept here.</EmptyState>
            ) : (
              <ul>
                {savedContests.slice(0, 3).map((contest) => (
                  <SavedContestRow
                    key={contest.id}
                    contest={contest}
                    onRestore={() => setRestoringContest(contest)}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {/* ── TAB 2: SAVED CONTESTS DIRECTORY ── */}
      {activeSubTab === 'saved' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <SearchField value={searchQuery} onChange={setSearchQuery} placeholder="Search contests" className="min-w-52 flex-1 sm:max-w-xs" />
            <Segmented
              label="Contest status"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'paused', label: 'Paused' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
          </div>

          <Panel>
            {filteredSavedContests.length === 0 ? (
              <EmptyState title="No contests match">Clear the search or choose another status.</EmptyState>
            ) : (
              <ul>
                {filteredSavedContests.map((contest) => (
                  <SavedContestRow
                    key={contest.id}
                    contest={contest}
                    onRestore={() => setRestoringContest(contest)}
                    onDelete={() => setDeletingContest(contest)}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {/* ── TAB 3: EDIT CURRENT CONTEST ── */}
      {activeSubTab === 'edit' && (
        <div className="space-y-6">
          {activeContest ? (
            <EditContestManager
              activeContest={activeContest}
              categories={categories}
              currentCategories={categories}
              rulesMarkdown={rulesMarkdown}
              onUpdated={() => {
                refreshData();
                onContestChanged?.();
              }}
            />
          ) : (
            <div className="p-8 rounded-lg border border-white/10 bg-white/[0.02] text-center space-y-3">
              <p className="text-sm font-bold text-white">No active contest round is selected to edit.</p>
              <p className="text-xs text-white/55">Select a saved contest to restore or launch a new contest.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: AUDIT TRAIL ── */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-5 rounded-lg bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-display">Contest Audit Trail</h3>
              <p className="text-xs text-white/55">
                Tamper-evident record of all contest pause, restore, creation, and switch events.
              </p>
            </div>
            <button
              onClick={refreshData}
              className="text-xs tabular-nums text-fivem-orange hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Refresh Log</span>
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 rounded-lg border border-white/10 bg-white/[0.02] text-center text-xs text-white/55">
              No audit records logged yet. Actions like pausing, creating, and restoring contests will appear here.
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-lg bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs tabular-nums font-bold  shrink-0 border ${
                        log.action === 'restore'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : log.action === 'pause'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : log.action === 'create'
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : log.action === 'archive'
                          ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                          : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
                      }`}
                    >
                      {log.action}
                    </span>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white">{log.contest_name}</span>
                        <span className="text-white/55">•</span>
                        <span className="text-white/60 text-xs">{log.details}</span>
                      </div>
                      <span className="text-xs tabular-nums text-white/55 block mt-0.5">
                        By <strong className="text-white/70">{log.performed_by_name}</strong>
                      </span>
                    </div>
                  </div>

                  <span className="text-xs tabular-nums text-white/55 shrink-0 self-end sm:self-center">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
         MODAL 1: PAUSE & CREATE NEW CONTEST WIZARD
         ═══════════════════════════════════════════════════════════════════════ */}
      {showPauseWizard && (
        <PauseAndCreateModal
          activeContest={activeContest}
          currentCategories={categories}
          currentPhotos={allPhotos}
          currentRules={rulesMarkdown}
          currentSubmissionsOpen={submissionsOpen}
          currentVotingOpen={votingOpen}
          allContests={allContests}
          admin={adminActor}
          onClose={() => setShowPauseWizard(false)}
          onSuccess={() => {
            setShowPauseWizard(false);
            refreshData();
            onContestChanged?.();
          }}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
         MODAL 2: RESTORE SAVED CONTEST (DEADLINE PRESERVATION ENGINE)
         ═══════════════════════════════════════════════════════════════════════ */}
      {restoringContest && (
        <RestoreContestModal
          targetContest={restoringContest}
          activeContest={activeContest}
          currentCategories={categories}
          currentPhotos={allPhotos}
          currentRules={rulesMarkdown}
          currentSubmissionsOpen={submissionsOpen}
          currentVotingOpen={votingOpen}
          admin={adminActor}
          onClose={() => setRestoringContest(null)}
          onSuccess={() => {
            setRestoringContest(null);
            refreshData();
            onContestChanged?.();
          }}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
         MODAL 3: QUICK PAUSE ACTIVE CONTEST CONFIRMATION
         ═══════════════════════════════════════════════════════════════════════ */}
      {pausingActiveModal && activeContest && (
        <Modal label="Pause the active contest" onClose={() => { if (!isActionLoading) setPausingActiveModal(false); }} className="max-w-md">
          <div className="w-full max-w-md p-6 rounded-lg bg-[#0e0e14] border border-amber-500/30 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Pause size={24} />
              </div>
              <div>
                <h4 className="text-base font-bold text-white font-display">Pause Active Contest?</h4>
                <p className="text-xs text-white/50">Freezes submissions, voting, and deadlines safely.</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10 space-y-2 text-xs">
              <p className="text-white/80">
                Contest <strong>"{activeContest.name}"</strong> will be placed in a paused state.
              </p>
              <ul className="list-disc list-inside space-y-1 text-white/60">
                <li>All submissions ({allPhotos.length}) and votes remain 100% preserved.</li>
                <li>
                  Deadlines freeze automatically (
                  {activeContestRemainingSubmissionsMs != null
                    ? formatRemainingTime(activeContestRemainingSubmissionsMs)
                    : 'no deadline'}{' '}
                  preserved).
                </li>
                <li>You can restore and resume this contest anytime from the Saved Contests vault.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button data-btn="ghost"
                variant="ghost"
                onClick={() => setPausingActiveModal(false)}
                disabled={isActionLoading}
                className="text-xs text-white/60 hover:text-white cursor-pointer"
              >
                Cancel
              </Button>
              <Button data-btn="primary"
                onClick={handleConfirmPauseActive}
                disabled={isActionLoading}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-5 py-2 rounded-md transition-all cursor-pointer"
              >
                {isActionLoading ? 'Pausing...' : 'Confirm & Pause Contest'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
         MODAL 4: DELETE CONTEST CONFIRMATION
         ═══════════════════════════════════════════════════════════════════════ */}
      {deletingContest && (
        <Modal label="Delete contest record" onClose={() => { if (!isActionLoading) setDeletingContest(null); }} className="max-w-md">
          <div className="w-full max-w-md p-6 rounded-lg bg-[#0e0e14] border border-red-500/40 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400">
                <Trash2 size={24} />
              </div>
              <div>
                <h4 className="text-base font-bold text-red-400 font-display">Delete Contest Record?</h4>
                <p className="text-xs text-white/50">Permanently removes this contest from storage.</p>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Are you sure you want to permanently delete <strong>"{deletingContest.name}"</strong>? This will
              remove its category definitions and metadata.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button data-btn="ghost"
                variant="ghost"
                onClick={() => setDeletingContest(null)}
                disabled={isActionLoading}
                className="text-xs text-white/60 hover:text-white cursor-pointer"
              >
                Cancel
              </Button>
              <Button data-btn="danger"
                onClick={async () => {
                  setIsActionLoading(true);
                  try {
                    await deleteContest(deletingContest.id, deletingContest.name, adminActor);
                    toast.success(`Contest "${deletingContest.name}" deleted.`);
                    setDeletingContest(null);
                    refreshData();
                  } catch (err: any) {
                    toast.error('Failed to delete contest: ' + err.message);
                  } finally {
                    setIsActionLoading(false);
                  }
                }}
                disabled={isActionLoading}
                className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-5 py-2 rounded-md transition-all cursor-pointer"
              >
                {isActionLoading ? 'Deleting...' : 'Yes, Delete Permanently'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENT: SAVED CONTEST ROW
   ═══════════════════════════════════════════════════════════════════════════ */
function SavedContestRow({
  contest,
  onRestore,
  onDelete,
}: {
  key?: React.Key;
  contest: Contest;
  onRestore: () => void;
  onDelete?: () => void;
}) {
  const isPaused = contest.status === 'paused';
  const frozen = [
    contest.paused_remaining_submissions_ms != null && `submissions ${formatRemainingTime(contest.paused_remaining_submissions_ms)}`,
    contest.paused_remaining_voting_ms != null && `voting ${formatRemainingTime(contest.paused_remaining_voting_ms)}`,
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-3 border-b border-white/[0.07] px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="min-w-0 break-words text-sm font-semibold text-white">{contest.name}</h3>
          <span
            className={`rounded border px-1.5 py-0.5 text-xs font-semibold ${
              isPaused ? 'border-amber-500/30 bg-amber-500/15 text-amber-300' : 'border-white/15 bg-white/[0.06] text-white/70'
            }`}
          >
            {isPaused ? 'Paused' : 'Archived'}
          </span>
        </div>
        {contest.description && <p className="mt-0.5 line-clamp-1 max-w-prose text-xs text-white/60">{contest.description}</p>}
        <p className="mt-0.5 text-xs tabular-nums text-white/55">
          {contest.submission_count ?? 0} photos, {contest.vote_count ?? 0} votes, <span className="capitalize">{contest.phase || 'submissions'}</span> phase
        </p>
        {isPaused && frozen.length > 0 && (
          <p className="mt-0.5 text-xs tabular-nums text-amber-300">Time held: {frozen.join(', ')}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <KitButton size="sm" onClick={onRestore}>
          <RotateCcw size={13} aria-hidden="true" /> Restore Contest
        </KitButton>
        {onDelete && (
          <KitButton size="sm" variant="ghost" onClick={onDelete} title="Delete permanently" aria-label={`Delete ${contest.name} permanently`} className="text-white/55 hover:!text-red-400">
            <Trash2 size={14} aria-hidden="true" />
          </KitButton>
        )}
      </div>
    </li>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL: PAUSE & CREATE REPLACEMENT CONTEST
   ═══════════════════════════════════════════════════════════════════════════ */
function PauseAndCreateModal({
  activeContest,
  currentCategories,
  currentPhotos,
  currentRules,
  currentSubmissionsOpen,
  currentVotingOpen,
  allContests,
  admin,
  onClose,
  onSuccess,
}: {
  activeContest: any;
  currentCategories: Category[];
  currentPhotos: Photo[];
  currentRules: string;
  currentSubmissionsOpen: boolean;
  currentVotingOpen: boolean;
  allContests: Contest[];
  admin: AdminActor;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Info, 2: Categories, 3: Rules, 4: Preview
  const [loading, setLoading] = useState(false);

  // Form inputs
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submissionsCloseDate, setSubmissionsCloseDate] = useState('');
  const [votingEndDate, setVotingEndDate] = useState('');
  const [rules, setRules] = useState(STANDARD_RULES_TEMPLATE);

  // Categories list
  const [categories, setCategories] = useState<
    { id: number; name: string; desc: string; emoji?: string }[]
  >([
    { id: 1, name: 'Cinematic Moments', desc: 'Dramatic and high-action shots captured across the city.', emoji: '🎬' },
    { id: 2, name: 'Vehicle Showcase', desc: 'Custom rides, street meets, and motorsports.', emoji: '🏎️' },
    { id: 3, name: 'Scenic Landscapes', desc: 'Breathtaking sunsets, skyline vistas, and wilderness.', emoji: '🌅' },
  ]);

  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catEmoji, setCatEmoji] = useState('✨');
  const [editingEmojiIdx, setEditingEmojiIdx] = useState<number | null>(null);

  // Template / Clone from previous contest
  const handleCloneFromContest = (contestId: string) => {
    const target = allContests.find((c) => c.id === contestId);
    if (!target) return;
    if (target.rulesMarkdown) setRules(target.rulesMarkdown);
    if (target.description) setDescription(target.description);
    toast.success(`Copied rules and details from "${target.name}"`);
  };

  // Preset Date helpers
  const applyDatePreset = (daysSubmissions: number, daysVoting: number) => {
    const now = new Date();
    const subDate = new Date(now.getTime() + daysSubmissions * 86400000);
    const voteDate = new Date(subDate.getTime() + daysVoting * 86400000);

    // Format for datetime-local: YYYY-MM-DDTHH:mm
    const formatLocal = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setSubmissionsCloseDate(formatLocal(subDate));
    setVotingEndDate(formatLocal(voteDate));
    toast.success(`Applied ${daysSubmissions}d submission + ${daysVoting}d voting schedule!`);
  };

  const handleAddCategory = () => {
    if (!catName.trim() || !catDesc.trim()) {
      toast.error('Category name and description are required.');
      return;
    }
    setCategories((prev) => [
      ...prev,
      { id: Date.now(), name: catName.trim(), desc: catDesc.trim(), emoji: catEmoji },
    ]);
    setCatName('');
    setCatDesc('');
    setCatEmoji('✨');
  };

  const handleLaunch = async (publishImmediately: boolean) => {
    if (!title.trim()) {
      toast.error('Contest title is required.');
      return;
    }
    if (categories.length === 0) {
      toast.error('At least one category is required.');
      return;
    }

    setLoading(true);
    try {
      await pauseAndCreateNewContest({
        currentContest: activeContest,
        currentRules,
        currentSubmissionsOpen,
        currentVotingOpen,
        currentCategories,
        currentPhotos,
        newContest: {
          title: title.trim(),
          description: description.trim(),
          rules,
          categories: categories.map((c) => ({ name: c.name, desc: c.desc, emoji: c.emoji })),
          submissionsCloseDate: submissionsCloseDate ? new Date(submissionsCloseDate).toISOString() : undefined,
          votingEndDate: votingEndDate ? new Date(votingEndDate).toISOString() : undefined,
          submissionsOpen: true,
          votingOpen: false,
          publishImmediately,
        },
        admin,
      });

      toast.success(
        publishImmediately
          ? `Contest "${title.trim()}" is published and active.`
          : `Contest draft saved.`
      );
      onSuccess();
    } catch (err: any) {
      console.error('Launch error:', err);
      toast.error('Failed to create contest: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal label="Pause and create a new contest" onClose={() => { if (!loading) onClose(); }} className="max-w-3xl">
      <div className="w-full rounded-lg bg-[#0d0d14] border border-fivem-orange/30 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-fivem-orange/15 border border-fivem-orange/30 text-fivem-orange">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-display">
                Pause & Create Replacement Contest
              </h3>
              <p className="text-xs text-white/50">
                Current active contest will be safely paused without data loss.
              </p>
            </div>
          </div>
          <button data-btn="secondary"
            onClick={onClose}
            className="p-2 rounded-md bg-white/5 hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Wizard Step Navigation */}
        <div className="flex shrink-0 items-center justify-between gap-2 overflow-x-auto border-b border-white/5 bg-white/[0.02] px-4 py-2.5 text-xs tabular-nums sm:px-6 [scrollbar-width:none] [&>button]:shrink-0 [&>button]:whitespace-nowrap">
          <button data-choice aria-pressed={step === 1}
            onClick={() => setStep(1)}
            className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              step === 1 ? 'text-fivem-orange font-bold' : 'text-white/55'
            }`}
          >
            <span>1. Info & Dates</span>
          </button>
          <span className="text-white/55">→</span>
          <button data-choice aria-pressed={step === 2}
            onClick={() => setStep(2)}
            className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              step === 2 ? 'text-fivem-orange font-bold' : 'text-white/55'
            }`}
          >
            <span>2. Categories ({categories.length})</span>
          </button>
          <span className="text-white/55">→</span>
          <button data-choice aria-pressed={step === 3}
            onClick={() => setStep(3)}
            className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              step === 3 ? 'text-fivem-orange font-bold' : 'text-white/55'
            }`}
          >
            <span>3. Rules & Guidelines</span>
          </button>
          <span className="text-white/55">→</span>
          <button data-choice aria-pressed={step === 4}
            onClick={() => setStep(4)}
            className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              step === 4 ? 'text-fivem-orange font-bold' : 'text-white/55'
            }`}
          >
            <span>4. Preview & Publish</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* STEP 1: CONTEST INFO & DATES */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Preserved Banner */}
              {activeContest && (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                  <Info size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-white">
                      Current Contest "{activeContest.name}" Will Be Paused
                    </p>
                    <p className="text-white/60">
                      All {currentPhotos.length} submissions and votes are safely frozen. You can restore this
                      contest anytime from Saved Contests.
                    </p>
                  </div>
                </div>
              )}

              {/* Title & Description */}
              <div className="space-y-2">
                <label className="text-xs tabular-nums text-fivem-orange font-bold">
                  Contest Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Autumn Showdown 2026"
                  className="bg-white/5 border-white/10 h-11 text-white font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs tabular-nums text-white/60 font-bold">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short description explaining the theme of this contest round..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-md p-3 text-xs text-white outline-none focus:border-fivem-orange/50 resize-none font-sans"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-2">
                <label className="text-xs tabular-nums text-white/60 font-bold">
                  Quick Schedule Presets
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button data-btn="secondary"
                    type="button"
                    variant="outline"
                    onClick={() => applyDatePreset(3, 2)}
                    className="text-xs border-white/10 hover:border-fivem-orange/50 cursor-pointer"
                  >
                    Flash: 3d submissions + 2d voting
                  </Button>
                  <Button data-btn="secondary"
                    type="button"
                    variant="outline"
                    onClick={() => applyDatePreset(7, 3)}
                    className="text-xs border-white/10 hover:border-fivem-orange/50 cursor-pointer"
                  >
                    Standard: 1 week submissions + 3d voting
                  </Button>
                  <Button data-btn="secondary"
                    type="button"
                    variant="outline"
                    onClick={() => applyDatePreset(14, 5)}
                    className="text-xs border-white/10 hover:border-fivem-orange/50 cursor-pointer"
                  >
                    Extended: 2 weeks submissions + 5d voting
                  </Button>
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs tabular-nums text-white/60 font-bold flex items-center gap-1.5">
                    <Calendar size={13} />
                    <span>Submissions Close Date</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={submissionsCloseDate}
                    onChange={(e) => setSubmissionsCloseDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-md p-2.5 text-xs text-white outline-none focus:border-fivem-orange tabular-nums"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs tabular-nums text-white/60 font-bold flex items-center gap-1.5">
                    <Clock size={13} />
                    <span>Voting End Date</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={votingEndDate}
                    onChange={(e) => setVotingEndDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-md p-2.5 text-xs text-white outline-none focus:border-fivem-orange tabular-nums"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CATEGORIES SETUP */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white font-display">Contest Categories</h4>
                  <p className="text-xs text-white/55">Add categories players will submit photos to.</p>
                </div>
                <span className="text-xs tabular-nums text-fivem-orange font-bold">
                  {categories.length} Categories
                </span>
              </div>

              {/* Categories list */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {categories.map((cat, idx) => (
                  <div
                    key={cat.id}
                    className="p-3.5 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat.emoji || '✨'}</span>
                      <div>
                        <h5 className="text-xs font-bold text-white">{cat.name}</h5>
                        <p className="text-xs text-white/50 line-clamp-1">{cat.desc}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCategories((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 rounded-lg text-white/55 hover:text-red-400 hover:bg-white/5 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add category box */}
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10 space-y-3">
                <span className="text-xs tabular-nums text-white/60 font-bold  block">
                  Add New Category
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={catEmoji}
                    onChange={(e) => setCatEmoji(e.target.value)}
                    className="w-12 text-center bg-white/5 border border-white/10 rounded-md py-2 text-base text-white"
                    placeholder="✨"
                  />
                  <input
                    type="text"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="Category Name (e.g. Night Photography)"
                    className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-xs text-white outline-none focus:border-fivem-orange font-display"
                  />
                </div>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Category description / instructions for participants..."
                  className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-xs text-white outline-none focus:border-fivem-orange font-sans"
                />
                <Button data-btn="secondary"
                  type="button"
                  onClick={handleAddCategory}
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs py-2 rounded-md cursor-pointer"
                >
                  <Plus size={14} className="mr-1.5" />
                  Add to Contest
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: RULES & GUIDELINES */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white font-display">Contest Rules</h4>
                  <p className="text-xs text-white/55">Markdown formatted rules visible to participants.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button data-btn="secondary"
                    type="button"
                    variant="outline"
                    onClick={() => setRules(SHORT_RULES_TEMPLATE)}
                    className="text-xs border-white/10 cursor-pointer"
                  >
                    Short Template
                  </Button>
                  <Button data-btn="secondary"
                    type="button"
                    variant="outline"
                    onClick={() => setRules(STANDARD_RULES_TEMPLATE)}
                    className="text-xs border-white/10 cursor-pointer"
                  >
                    Full Template
                  </Button>
                </div>
              </div>

              <textarea
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                rows={10}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-xs text-white tabular-nums leading-relaxed outline-none focus:border-fivem-orange resize-y"
              />
            </div>
          )}

          {/* STEP 4: PREVIEW & PUBLISH */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>Ready to Launch Contest</span>
                </p>
                <p className="text-white/60">
                  Review the parameters below before making this contest public on the platform.
                </p>
              </div>

              {/* Summary Card */}
              <div className="p-5 rounded-lg bg-white/[0.02] border border-white/10 space-y-4">
                <div className="space-y-1">
                  <span className="text-xs tabular-nums text-fivem-orange font-bold">
                    Contest Summary
                  </span>
                  <h3 className="text-lg font-bold text-white font-display">{title || 'Untitled Contest'}</h3>
                  {description && <p className="text-xs text-white/60">{description}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-white/5 tabular-nums">
                  <div>
                    <span className="text-white/55 text-xs">Categories:</span>
                    <p className="text-white font-bold">{categories.length} categories</p>
                  </div>
                  <div>
                    <span className="text-white/55 text-xs">Submissions Close:</span>
                    <p className="text-white font-bold">
                      {submissionsCloseDate ? new Date(submissionsCloseDate).toLocaleString() : 'Open'}
                    </p>
                  </div>
                </div>

                {/* Categories pills */}
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <span className="text-xs tabular-nums text-white/55">Categories:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {categories.map((c) => (
                      <span
                        key={c.id}
                        className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-white font-bold flex items-center gap-1.5"
                      >
                        <span>{c.emoji || '✨'}</span>
                        <span>{c.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-white/10 bg-black/40 flex items-center justify-between gap-3 shrink-0">
          <div>
            {step > 1 && (
              <Button data-btn="ghost"
                variant="ghost"
                onClick={() => setStep((s) => (s - 1) as any)}
                disabled={loading}
                className="text-xs text-white/60 hover:text-white cursor-pointer"
              >
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button data-btn="ghost"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="text-xs text-white/60 hover:text-white cursor-pointer"
            >
              Cancel
            </Button>

            {step < 4 ? (
              <Button data-btn="primary"
                onClick={() => setStep((s) => (s + 1) as any)}
                className="bg-fivem-orange hover:bg-orange-500 text-black font-bold text-xs px-5 py-2 rounded-md transition-all cursor-pointer"
              >
                Next Step
              </Button>
            ) : (
              <>
                <Button data-btn="secondary"
                  onClick={() => handleLaunch(false)}
                  disabled={loading}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2 rounded-md cursor-pointer"
                >
                  Save as Draft
                </Button>
                <Button data-btn="primary"
                  onClick={() => handleLaunch(true)}
                  disabled={loading}
                  className="bg-fivem-orange text-black font-bold text-xs px-6 py-2 rounded-md transition-all cursor-pointer"
                >
                  {loading ? 'Deploying...' : 'Publish & Activate'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL: RESTORE SAVED CONTEST (DEADLINE PRESERVATION ENGINE)
   ═══════════════════════════════════════════════════════════════════════════ */
function RestoreContestModal({
  targetContest,
  activeContest,
  currentCategories,
  currentPhotos,
  currentRules,
  currentSubmissionsOpen,
  currentVotingOpen,
  admin,
  onClose,
  onSuccess,
}: {
  targetContest: Contest;
  activeContest: any;
  currentCategories: Category[];
  currentPhotos: Photo[];
  currentRules: string;
  currentSubmissionsOpen: boolean;
  currentVotingOpen: boolean;
  admin: AdminActor;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [activeAction, setActiveAction] = useState<'pause' | 'archive'>('pause');
  const [deadlineMode, setDeadlineMode] = useState<'auto_preserve' | 'custom'>('auto_preserve');
  const [customSubmissionsClose, setCustomSubmissionsClose] = useState('');
  const [customVotingEnd, setCustomVotingEnd] = useState('');
  const [loading, setLoading] = useState(false);

  // Calculate auto-recalculated deadlines based on remaining time when paused
  const recalculatedSubmissionsClose = useMemo(() => {
    if (targetContest.paused_remaining_submissions_ms != null && targetContest.paused_remaining_submissions_ms > 0) {
      return new Date(Date.now() + targetContest.paused_remaining_submissions_ms);
    }
    return targetContest.submissions_close_date ? new Date(targetContest.submissions_close_date) : null;
  }, [targetContest]);

  const recalculatedVotingEnd = useMemo(() => {
    if (targetContest.paused_remaining_voting_ms != null && targetContest.paused_remaining_voting_ms > 0) {
      return new Date(Date.now() + targetContest.paused_remaining_voting_ms);
    }
    return targetContest.voting_end_date ? new Date(targetContest.voting_end_date) : null;
  }, [targetContest]);

  const handleConfirmRestore = async () => {
    setLoading(true);
    try {
      await restoreSavedContest({
        targetContestId: targetContest.id,
        activeContestAction: activeAction,
        currentActiveContest: activeContest,
        currentCategories,
        currentPhotos,
        currentRules,
        currentSubmissionsOpen,
        currentVotingOpen,
        deadlineOption: deadlineMode,
        customSubmissionsCloseDate:
          deadlineMode === 'custom' && customSubmissionsClose
            ? new Date(customSubmissionsClose).toISOString()
            : undefined,
        customVotingEndDate:
          deadlineMode === 'custom' && customVotingEnd
            ? new Date(customVotingEnd).toISOString()
            : undefined,
        admin,
      });

      toast.success(`Contest "${targetContest.name}" restored and live!`);
      onSuccess();
    } catch (err: any) {
      console.error('Restore error:', err);
      toast.error('Failed to restore contest: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal label={`Restore ${targetContest.name}`} onClose={() => { if (!loading) onClose(); }} className="max-w-lg">
      <div className="w-full rounded-lg bg-[#0e0e14] border border-emerald-500/30 p-6 sm:p-7 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
          <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <RotateCcw size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-display">
              Restore Contest: {targetContest.name}
            </h3>
            <p className="text-xs text-white/50">
              Resume this contest with all preserved entries, votes, and deadlines.
            </p>
          </div>
        </div>

        {/* Preserved Stats Box */}
        <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10 space-y-3 text-xs">
          <span className="text-xs tabular-nums text-emerald-400 font-bold">
            Preserved Data
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-white/55 block text-xs">Saved Submissions</span>
              <strong className="text-white text-sm font-bold">{targetContest.submission_count ?? 0} photos</strong>
            </div>
            <div>
              <span className="text-white/55 block text-xs">Saved Votes</span>
              <strong className="text-fivem-orange text-sm font-bold">{targetContest.vote_count ?? 0} votes</strong>
            </div>
          </div>
          <div>
            <span className="text-white/55 block text-xs">Preserved Phase</span>
            <span className="capitalize font-bold text-white">
              {targetContest.previous_phase || targetContest.phase || 'Submissions'} phase will resume
            </span>
          </div>
        </div>

        {/* Deadline Recalculation Engine */}
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs tabular-nums text-emerald-400 font-bold   flex items-center gap-1.5">
              <Clock size={13} />
              <span>Automatic Deadline Recalculation</span>
            </span>
            <span className="text-xs tabular-nums text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
              No Time Lost
            </span>
          </div>

          <p className="text-xs text-white/70 leading-relaxed">
            Deadlines are calculated using the exact remaining time saved when this contest was paused:
          </p>

          <div className="space-y-1.5 text-xs tabular-nums">
            <div className="flex items-center justify-between p-2 rounded-md bg-black/40 border border-white/5">
              <span className="text-white/50">Submissions Close:</span>
              <span className="text-white font-bold">
                {recalculatedSubmissionsClose ? recalculatedSubmissionsClose.toLocaleString() : 'Open'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-black/40 border border-white/5">
              <span className="text-white/50">Voting Ends:</span>
              <span className="text-white font-bold">
                {recalculatedVotingEnd ? recalculatedVotingEnd.toLocaleString() : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* What to do with the current active contest */}
        {activeContest && (
          <div className="space-y-2">
            <label className="text-xs tabular-nums text-white/60 font-bold">
              Currently Active Contest Action
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button data-radio-card role="radio" aria-checked={activeAction === 'pause'}
                type="button"
                onClick={() => setActiveAction('pause')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  activeAction === 'pause'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <Pause size={13} />
                  <span>Pause Active Contest</span>
                </div>
                <p className="text-xs text-white/55 mt-1">
                  Freeze "{activeContest.name}" into Saved Contests without loss.
                </p>
              </button>

              <button data-radio-card role="radio" aria-checked={activeAction === 'archive'}
                type="button"
                onClick={() => setActiveAction('archive')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  activeAction === 'archive'
                    ? 'bg-red-500/15 border-red-500/40 text-red-300'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <Archive size={13} />
                  <span>Archive Active</span>
                </div>
                <p className="text-xs text-white/55 mt-1">
                  Permanently conclude "{activeContest.name}".
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button data-btn="ghost"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="text-xs text-white/60 hover:text-white cursor-pointer"
          >
            Cancel
          </Button>
          <Button data-btn="success"
            onClick={handleConfirmRestore}
            disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs px-6 py-2.5 rounded-md transition-all cursor-pointer"
          >
            {loading ? 'Restoring...' : 'Confirm & Restore Live Contest'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
