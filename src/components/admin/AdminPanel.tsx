/**
 * AdminPanel — Tabbed admin settings panel
 * Fixed-height layout with reorganized domain-focused sections.
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings, Trophy, Layers, Lock, Unlock, AlertCircle,
  Image as ImageIcon, ChevronRight, ChevronDown, ChevronUp,
  Eye, Download, Loader2, BarChart3, Shield, Zap, LayoutDashboard, UserCheck,
  Bug, CheckCircle2, Trash2, Clock
} from 'lucide-react';
import { collection, query, orderBy, getDocs, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { Category, Photo } from '../../types';
import { BorderBeam } from '../ui/border-beam';
import { AnimatedShinyText } from '../ui/animated-shiny-text';
import { ShimmerButton } from '../ui/shimmer-button';
import { AdminToggle } from '../ui/admin-toggle';
import { AdminVoterSearch } from './AdminVoterSearch';

import { ChangelogTab } from './ChangelogTab';
import { Sidebar, SidebarBody, SidebarLink } from '../ui/sidebar';

const EditContestManager = lazy(() => import('./ContestManagers').then(m => ({ default: m.EditContestManager })));
const ArchiveContest = lazy(() => import('./ContestManagers').then(m => ({ default: m.ArchiveContest })));
const CreateContestManager = lazy(() => import('./ContestManagers').then(m => ({ default: m.CreateContestManager })));
const AdminSubmissionsPreview = lazy(() => import('./AdminSubmissionsPreview'));

type AdminTab = 'dashboard' | 'submissions' | 'voters' | 'contest' | 'controls' | 'changelogs' | 'danger';

interface AdminPanelProps {
  isAdmin: boolean;
  user: any;
  activeContest: { id: string; name: string; submissions_close_date?: string; voting_end_date?: string } | null;
  categories: Category[];
  allPhotos: Photo[];
  votingOpen: boolean;
  submissionsOpen: boolean;
  onePhotoPerUser: boolean;
  showWinnersToggle: boolean;
  publicKey: string | null;
  privateKey: string | null;
  rulesMarkdown: string;
  winners: any[];
  onToggleVoting: (open: boolean) => void;
  onToggleSubmissions: (open: boolean) => void;
  onToggleOnePhotoPerUser: (enabled: boolean) => void;
  onToggleShowWinners: (enabled: boolean) => void;
  onGenerateKeys: () => void;
  onToggleReveal: (reveal: boolean) => void;
  onDownloadWinners: () => void;
  onDeletePhoto: (photoId: string, discordName: string) => void;
  onToggleDisqualifyPhoto?: (photoId: string, disqualify: boolean, reason?: string) => void;
  onResetVotes?: () => void;
  onOpenAnalytics: () => void;
}

const TABS: { id: AdminTab; label: string; icon: typeof Settings; color: string; description: string }[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, color: 'text-fivem-orange', description: 'Metrics & status' },
  { id: 'submissions', label: 'Submissions', icon: ImageIcon, color: 'text-cyan-400', description: 'Photos & decryption' },
  { id: 'voters', label: 'Voter Audit', icon: UserCheck, color: 'text-blue-400', description: 'Search & fraud check' },
  { id: 'contest', label: 'Contest Setup', icon: Trophy, color: 'text-amber-400', description: 'Edit rules & winners' },
  { id: 'controls', label: 'Controls & Security', icon: Zap, color: 'text-emerald-400', description: 'Toggles & RSA keys' },
  { id: 'changelogs', label: 'Changelogs', icon: Layers, color: 'text-fivem-orange', description: 'Releases & credits' },
  { id: 'danger', label: 'Danger Zone', icon: AlertCircle, color: 'text-red-400', description: 'Reset & archive' },
];

export default function AdminPanel(props: AdminPanelProps) {
  const {
    isAdmin, user, activeContest, categories = [], allPhotos = [], votingOpen, submissionsOpen,
    onePhotoPerUser, showWinnersToggle, publicKey, privateKey, rulesMarkdown, winners = [],
    onToggleVoting, onToggleSubmissions, onToggleOnePhotoPerUser, onToggleShowWinners,
    onGenerateKeys, onToggleReveal, onDownloadWinners, onDeletePhoto, onToggleDisqualifyPhoto, onResetVotes, onOpenAnalytics,
  } = props;

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!isAdmin) return null;

  return (
    <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
      <div className="relative z-10 flex flex-col md:flex-row h-full w-full overflow-hidden bg-[#060609]">
        
        {/* ── ACETERNITY SIDEBAR DOCK ── */}
        <SidebarBody>
          <div className="flex flex-col flex-1 min-h-0 justify-between space-y-4">
            
            {/* Header & Navigation */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 px-2">
                <div className="p-2 bg-fivem-orange/15 border border-fivem-orange/30 rounded-xl text-fivem-orange shrink-0 shadow-[0_0_12px_rgba(234,88,12,0.2)]">
                  <Settings size={18} />
                </div>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col min-w-0"
                  >
                    <h2 className="text-sm font-black font-display text-white leading-none">
                      <AnimatedShinyText shimmerWidth={120}>Admin Console</AnimatedShinyText>
                    </h2>
                    <span className="text-[10px] text-white/40 font-mono mt-0.5">Vital RP Operations</span>
                  </motion.div>
                )}
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <SidebarLink
                      key={tab.id}
                      label={tab.label}
                      icon={<Icon size={18} />}
                      active={isActive}
                      color={tab.color}
                      onClick={() => setActiveTab(tab.id)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Admin Creator Footer Card inside Sidebar */}
            <div className="border-t border-white/10 pt-3 pb-2 px-1">
              <div className="flex items-center gap-3">
                <img
                  src="https://r2.fivemanage.com/image/qePVNvTsc65p.png"
                  alt="Damon"
                  className="w-9 h-9 rounded-xl object-cover border border-fivem-orange/60 p-0.5 bg-black/60 shrink-0"
                />
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col min-w-0 flex-1 leading-tight"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white font-display truncate">Damon</span>
                      <ShieldCheck size={11} className="text-fivem-orange shrink-0" />
                    </div>
                    <span className="text-[10px] text-white/40 font-mono truncate">@mcspace</span>
                  </motion.div>
                )}
              </div>
            </div>

          </div>
        </SidebarBody>

        {/* Mobile Horizontal Tabs Header (< md screens) */}
        <div className="md:hidden flex items-center gap-1.5 p-2 overflow-x-auto no-scrollbar bg-[#08080b] border-b border-white/10 shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer",
                  isActive
                    ? "bg-fivem-orange/20 text-white border border-fivem-orange/40 shadow-sm"
                    : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                <Icon size={14} className={isActive ? tab.color : ''} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── MAIN CONTENT STAGE ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#09090d]/95">
          {/* Top Bar Header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 bg-black/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40 uppercase tracking-widest">Console Domain</span>
              <span className="text-white/20">•</span>
              <span className="text-sm font-black font-display text-fivem-orange capitalize">{activeTab}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 font-mono">Authenticated</span>
              </div>
            </div>
          </div>

          {/* Tab Content Stage */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="max-w-5xl mx-auto"
              >
                {activeTab === 'dashboard' && (
                  <OverviewTab
                    activeContest={activeContest}
                    categories={categories}
                    allPhotos={allPhotos}
                    votingOpen={votingOpen}
                    submissionsOpen={submissionsOpen}
                    setActiveTab={setActiveTab}
                    onOpenAnalytics={onOpenAnalytics}
                  />
                )}

                {activeTab === 'submissions' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-black font-display text-white mb-1 flex items-center gap-2">
                        <ImageIcon size={20} className="text-cyan-400" /> Submissions Management
                      </h3>
                      <p className="text-sm text-white/40">Review decrypted photo submissions, disqualify entries, or delete photos.</p>
                    </div>
                    <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-cyan-400" /></div>}>
                      <AdminSubmissionsPreview
                        allPhotos={allPhotos}
                        categories={categories}
                        onDeletePhoto={onDeletePhoto}
                        onToggleDisqualifyPhoto={onToggleDisqualifyPhoto}
                      />
                    </Suspense>
                  </div>
                )}

                {activeTab === 'voters' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-black font-display text-white mb-1 flex items-center gap-2">
                        <UserCheck size={20} className="text-blue-400" /> Voter Audit & Fraud Check
                      </h3>
                      <p className="text-sm text-white/40">Search voters by Discord username or UID, inspect vote distribution, and clear flagged votes.</p>
                    </div>
                    <AdminVoterSearch
                      allPhotos={allPhotos}
                      categories={categories}
                    />
                  </div>
                )}

                {activeTab === 'contest' && (
                  <ContestSetupTab
                    activeContest={activeContest}
                    categories={categories}
                    rulesMarkdown={rulesMarkdown}
                    winners={winners}
                    onDownloadWinners={onDownloadWinners}
                  />
                )}

                {activeTab === 'controls' && (
                  <ControlsAndSecurityTab
                    votingOpen={votingOpen}
                    submissionsOpen={submissionsOpen}
                    onePhotoPerUser={onePhotoPerUser}
                    showWinnersToggle={showWinnersToggle}
                    publicKey={publicKey}
                    privateKey={privateKey}
                    onToggleVoting={onToggleVoting}
                    onToggleSubmissions={onToggleSubmissions}
                    onToggleOnePhotoPerUser={onToggleOnePhotoPerUser}
                    onToggleShowWinners={onToggleShowWinners}
                    onGenerateKeys={onGenerateKeys}
                    onToggleReveal={onToggleReveal}
                  />
                )}

                {activeTab === 'changelogs' && (
                  <ChangelogTab />
                )}

                {activeTab === 'danger' && (
                  <DangerTab
                    activeContest={activeContest}
                    categories={categories}
                    allPhotos={allPhotos}
                    onResetVotes={onResetVotes}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}


/* ═══════════════════════════════════════════════════════════════════════
   TAB: Overview — Elevated Dashboard with Live Bug Reports Inbox
   ═══════════════════════════════════════════════════════════════════════ */
interface BugReport {
  id: string;
  title: string;
  description: string;
  contactEmail?: string;
  reportedBy?: string;
  status: 'Open' | 'Resolved';
  createdAt?: any;
  dateStr?: string;
}

function OverviewTab({ activeContest, categories, allPhotos, votingOpen, submissionsOpen, setActiveTab, onOpenAnalytics }: {
  activeContest: any; categories: Category[]; allPhotos: Photo[]; votingOpen: boolean; submissionsOpen: boolean;
  setActiveTab: (tab: AdminTab) => void; onOpenAnalytics: () => void;
}) {
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [bugFilter, setBugFilter] = useState<'All' | 'Open' | 'Resolved'>('Open');

  // Load Bug Reports from Firestore & Local Storage
  useEffect(() => {
    let unsub = () => {};
    try {
      if (db) {
        unsub = onSnapshot(
          query(collection(db, 'bug_reports')),
          (snapshot) => {
            try {
              const firestoreReports: BugReport[] = snapshot.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<BugReport, 'id'>),
              }));

              const localReports: BugReport[] = JSON.parse(localStorage.getItem('local_bug_reports') || '[]');
              const mergedMap = new Map<string, BugReport>();

              firestoreReports.forEach((r) => mergedMap.set(r.id, r));
              localReports.forEach((r) => {
                if (!mergedMap.has(r.id)) mergedMap.set(r.id, r);
              });

              setBugReports(Array.from(mergedMap.values()));
            } catch (e) {
              console.warn('Error parsing bug snapshot:', e);
            }
          },
          (error) => {
            console.warn('Firestore bug snapshot fallback to local storage:', error);
            try {
              const localReports: BugReport[] = JSON.parse(localStorage.getItem('local_bug_reports') || '[]');
              setBugReports(localReports);
            } catch (e) {}
          }
        );
      }
    } catch (err) {
      console.warn('Firestore bug query init error, falling back to local storage:', err);
      try {
        const localReports: BugReport[] = JSON.parse(localStorage.getItem('local_bug_reports') || '[]');
        setBugReports(localReports);
      } catch (e) {}
    }

    return () => {
      try { unsub(); } catch (e) {}
    };
  }, []);

  const handleToggleBugStatus = async (bug: BugReport) => {
    const newStatus = bug.status === 'Open' ? 'Resolved' : 'Open';
    try {
      if (!bug.id.startsWith('local-')) {
        await updateDoc(doc(db, 'bug_reports', bug.id), { status: newStatus });
      }
      setBugReports((prev) =>
        prev.map((item) => (item.id === bug.id ? { ...item, status: newStatus } : item))
      );

      // Update local storage
      const localReports: BugReport[] = JSON.parse(localStorage.getItem('local_bug_reports') || '[]');
      const updatedLocal = localReports.map((item) => (item.id === bug.id ? { ...item, status: newStatus } : item));
      localStorage.setItem('local_bug_reports', JSON.stringify(updatedLocal));

      toast.success(`Bug report marked as ${newStatus}`);
    } catch (err) {
      toast.error('Could not update bug report status');
    }
  };

  const handleDeleteBug = async (id: string) => {
    try {
      if (!id.startsWith('local-')) {
        await deleteDoc(doc(db, 'bug_reports', id));
      }
      setBugReports((prev) => prev.filter((item) => item.id !== id));

      const localReports: BugReport[] = JSON.parse(localStorage.getItem('local_bug_reports') || '[]');
      const updatedLocal = localReports.filter((item) => item.id !== id);
      localStorage.setItem('local_bug_reports', JSON.stringify(updatedLocal));

      toast.success('Bug report deleted');
    } catch (err) {
      toast.error('Could not delete report');
    }
  };

  const openBugCount = bugReports.filter((b) => b.status === 'Open').length;
  const filteredBugs = bugReports.filter((b) => bugFilter === 'All' || b.status === bugFilter);

  return (
    <div className="space-y-6">
      {/* Section heading */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black font-display text-white mb-1">Dashboard Overview</h3>
          <p className="text-sm text-white/40">Real-time snapshot of contest state, analytics launcher, and bug reports inbox.</p>
        </div>
        
        {openBugCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-fivem-orange/15 border border-fivem-orange/30 text-fivem-orange text-xs font-bold font-mono animate-pulse">
            <Bug size={14} />
            <span>{openBugCount} Pending Bug{openBugCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {[
          { label: 'Active Contest', value: activeContest?.name || 'None', icon: Trophy, color: 'orange' },
          { label: 'Categories', value: categories.length, icon: Layers, color: 'blue' },
          { label: 'Total Entries', value: allPhotos.length, icon: ImageIcon, color: 'purple' },
          { label: 'Voting', value: votingOpen ? 'Open' : 'Closed', icon: votingOpen ? Unlock : Lock, color: votingOpen ? 'emerald' : 'red' },
          { label: 'Pending Bugs', value: openBugCount, icon: Bug, color: openBugCount > 0 ? 'orange' : 'emerald' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          const colors: Record<string, string> = {
            orange: 'from-fivem-orange/20 border-fivem-orange/30',
            blue: 'from-blue-500/15 border-blue-500/20',
            purple: 'from-purple-500/15 border-purple-500/20',
            emerald: 'from-emerald-500/15 border-emerald-500/20',
            red: 'from-red-500/15 border-red-500/20',
          };
          const iconColors: Record<string, string> = {
            orange: 'text-fivem-orange',
            blue: 'text-blue-400',
            purple: 'text-purple-400',
            emerald: 'text-emerald-400',
            red: 'text-red-400',
          };
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              className={cn(
                "relative overflow-hidden rounded-2xl border bg-gradient-to-br to-white/5 p-4 shadow-sm",
                colors[stat.color]
              )}
            >
              <div className="absolute top-0 right-0 w-16 h-16 blur-[30px] opacity-30 rounded-full bg-current" />
              <Icon size={16} className={cn("mb-2.5 relative z-10", iconColors[stat.color])} />
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-1">{stat.label}</p>
              <p className="text-sm sm:text-base font-black text-white leading-tight truncate">{String(stat.value)}</p>
            </motion.div>
          );
        })}
      </div>

      {/* ── SUBMITTED BUG REPORTS INBOX ── */}
      <div className="relative overflow-hidden rounded-2xl border border-fivem-orange/30 bg-[#0a0a0d]/90 p-5 sm:p-6 shadow-xl">
        <BorderBeam size={200} duration={12} colorFrom="#ea580c" colorTo="#fb923c" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-fivem-orange/15 border border-fivem-orange/30 rounded-xl text-fivem-orange">
              <Bug size={18} />
            </div>
            <div>
              <h4 className="text-base font-bold font-display text-white flex items-center gap-2">
                <span>Submitted Bug Reports Inbox</span>
                <span className="text-xs font-mono bg-fivem-orange/20 text-fivem-orange px-2 py-0.5 rounded-md border border-fivem-orange/30">
                  {bugReports.length} Total
                </span>
              </h4>
              <p className="text-xs text-white/40 mt-0.5">Issues & feedback submitted by users directly to Damon.</p>
            </div>
          </div>

          {/* Bug Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 shrink-0">
            {(['Open', 'Resolved', 'All'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setBugFilter(filter)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer",
                  bugFilter === filter
                    ? "bg-fivem-orange text-white shadow-sm"
                    : "text-white/50 hover:text-white"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Bug Feed List */}
        {filteredBugs.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
            <Bug size={24} className="mx-auto text-white/20 mb-2" />
            <p className="text-xs font-bold text-white/40 font-mono">No {bugFilter !== 'All' ? bugFilter.toLowerCase() : ''} bug reports found</p>
            <p className="text-[11px] text-white/20 mt-1">Users can submit reports via the "Report Bug" header button.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {filteredBugs.map((bug) => (
              <motion.div
                key={bug.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                  bug.status === 'Open'
                    ? "bg-fivem-orange/[0.04] border-fivem-orange/20 hover:border-fivem-orange/40"
                    : "bg-white/[0.02] border-white/5 opacity-70"
                )}
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(
                      "text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                      bug.status === 'Open'
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    )}>
                      {bug.status}
                    </span>
                    <h5 className="text-xs sm:text-sm font-bold text-white truncate">{bug.title}</h5>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed font-sans">{bug.description}</p>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-white/30 pt-1">
                    <span>Reported by: <strong className="text-white/60">{bug.reportedBy || 'Visitor'}</strong></span>
                    {bug.contactEmail && bug.contactEmail !== 'Not provided' && (
                      <span className="text-fivem-orange/80">Contact: {bug.contactEmail}</span>
                    )}
                    {bug.dateStr && (
                      <span className="flex items-center gap-1"><Clock size={10} /> {bug.dateStr}</span>
                    )}
                  </div>
                </div>

                {/* Status Toggle & Delete Actions */}
                <div className="flex items-center gap-2 shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <button
                    type="button"
                    onClick={() => handleToggleBugStatus(bug)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                      bug.status === 'Open'
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                        : "bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25"
                    )}
                  >
                    <CheckCircle2 size={13} />
                    <span>{bug.status === 'Open' ? 'Mark Resolved' : 'Reopen'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteBug(bug.id)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-white/40 hover:text-red-400 transition-all cursor-pointer"
                    title="Delete Bug Report"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Jump Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveTab('submissions')}
          className="p-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] hover:bg-cyan-500/[0.08] transition-all text-left group cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <ImageIcon size={18} />
            </div>
            <ChevronRight size={16} className="text-cyan-400/50 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">Submissions Manager</p>
          <p className="text-xs text-white/40 mt-1">Decrypt, disqualify, or delete photo entries.</p>
        </button>

        <button
          onClick={() => setActiveTab('voters')}
          className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] hover:bg-blue-500/[0.08] transition-all text-left group cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <UserCheck size={18} />
            </div>
            <ChevronRight size={16} className="text-blue-400/50 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">Voter Search & Audit</p>
          <p className="text-xs text-white/40 mt-1">Audit voter logs and revoke suspicious votes.</p>
        </button>

        <button
          onClick={() => setActiveTab('changelogs')}
          className="p-5 rounded-2xl border border-fivem-orange/20 bg-fivem-orange/[0.04] hover:bg-fivem-orange/[0.08] transition-all text-left group cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-fivem-orange/15 border border-fivem-orange/30 text-fivem-orange">
              <Layers size={18} />
            </div>
            <ChevronRight size={16} className="text-fivem-orange/50 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-sm font-bold text-white group-hover:text-fivem-orange transition-colors">Changelogs & Damon Credits</p>
          <p className="text-xs text-white/40 mt-1">View release history and publishing tools.</p>
        </button>
      </div>

      {/* Analytics Launcher */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-blue-500/[0.03]">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="px-6 pt-5 pb-4 border-b border-blue-500/[0.12] flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-500/70 rounded-full" />
          <BarChart3 size={13} className="text-blue-500/80" />
          <h4 className="text-[11px] font-mono text-blue-500/80 uppercase tracking-[0.2em]">Analytics & Data Insights</h4>
        </div>
        <div className="p-6 flex flex-col items-center">
          <ShimmerButton
            onClick={onOpenAnalytics}
            shimmerColor="#3b82f6"
            className="w-full text-sm cursor-pointer"
          >
            Launch Live Analytics Dashboard
            <ChevronRight size={16} className="text-blue-400/60" />
          </ShimmerButton>
          <p className="text-xs text-white/40 mt-3 text-center">Interactive charts, voting velocity, and submission trends across all categories.</p>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════
   TAB: Contest Setup (Edit, Create, & Download Winners)
   ═══════════════════════════════════════════════════════════════════════ */
function ContestSetupTab({ activeContest, categories, rulesMarkdown, winners, onDownloadWinners }: {
  activeContest: any; categories: Category[]; rulesMarkdown: string; winners: any[];
  onDownloadWinners: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-black font-display text-white mb-1 flex items-center gap-2">
          <Trophy size={20} className="text-amber-400" /> Contest Setup & Winner Assets
        </h3>
        <p className="text-sm text-white/40">Edit active contest rules and categories, export winner photos, or create new contests.</p>
      </div>

      {/* Download Winners Section */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-6">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Download size={16} className="text-amber-400" />
              <h4 className="text-sm font-bold text-white">Download Category Winners</h4>
              {winners.length > 0 && (
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                  {winners.length} Ready
                </span>
              )}
            </div>
            <p className="text-xs text-white/40 leading-relaxed">
              Download the current leading photo from each category as high-resolution files.
            </p>
          </div>
          <button
            onClick={onDownloadWinners}
            disabled={!activeContest || winners.length === 0}
            className={cn(
              "px-5 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 shrink-0 flex items-center gap-2 cursor-pointer",
              activeContest && winners.length > 0
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                : "bg-white/5 text-white/30 border border-white/10 opacity-50 cursor-not-allowed"
            )}
          >
            <Download size={14} />
            Download {winners.length} Winner{winners.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {/* Edit Current Contest */}
      {activeContest ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="px-6 pt-5 pb-4 border-b border-white/[0.07] flex items-center gap-2">
            <div className="w-1 h-4 bg-white/30 rounded-full" />
            <h4 className="text-[11px] font-mono text-white/50 uppercase tracking-[0.2em]">Edit Active Contest Details</h4>
            <span className="ml-auto text-[10px] font-mono text-fivem-orange/60 bg-fivem-orange/10 px-2 py-0.5 rounded-full">{activeContest.name}</span>
          </div>
          <div className="p-6">
            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-white/30" /></div>}>
              <EditContestManager
                activeContest={activeContest}
                currentRules={rulesMarkdown}
                currentCategories={categories}
                onUpdated={() => window.location.reload()}
              />
            </Suspense>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <Trophy size={32} className="text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/40 mb-1 font-bold">No Active Contest</p>
          <p className="text-xs text-white/25">Create a new contest below to get started.</p>
        </div>
      )}

      {/* Create New Contest */}
      <div className="relative overflow-hidden rounded-2xl border border-fivem-orange/15 bg-fivem-orange/[0.03]">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-fivem-orange/60 to-transparent" />
        <div className="absolute top-0 right-0 w-48 h-48 bg-fivem-orange/8 blur-[80px] rounded-full pointer-events-none" />
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full px-6 pt-5 pb-4 border-b border-fivem-orange/[0.12] flex items-center justify-between group hover:bg-fivem-orange/[0.02] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-fivem-orange rounded-full" />
            <h4 className="text-[11px] font-mono text-fivem-orange/70 uppercase tracking-[0.2em]">Create New Contest</h4>
          </div>
          <div className="text-fivem-orange/50 group-hover:text-fivem-orange p-1 bg-fivem-orange/10 rounded-md transition-colors">
            {showCreate ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {showCreate && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="p-6 relative z-10">
                <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-fivem-orange" /></div>}>
                  <CreateContestManager onCreated={() => window.location.reload()} />
                </Suspense>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════
   TAB: Controls & Security
   ═══════════════════════════════════════════════════════════════════════ */
function ControlsAndSecurityTab({
  votingOpen, submissionsOpen, onePhotoPerUser, showWinnersToggle, publicKey, privateKey,
  onToggleVoting, onToggleSubmissions, onToggleOnePhotoPerUser, onToggleShowWinners,
  onGenerateKeys, onToggleReveal
}: {
  votingOpen: boolean; submissionsOpen: boolean; onePhotoPerUser: boolean; showWinnersToggle: boolean;
  publicKey: string | null; privateKey: string | null;
  onToggleVoting: (v: boolean) => void; onToggleSubmissions: (v: boolean) => void;
  onToggleOnePhotoPerUser: (v: boolean) => void; onToggleShowWinners: (v: boolean) => void;
  onGenerateKeys: () => void; onToggleReveal: (v: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-black font-display text-white mb-1 flex items-center gap-2">
          <Zap size={20} className="text-emerald-400" /> Controls & Security
        </h3>
        <p className="text-sm text-white/40">Manage real-time contest switches, entry constraints, and image encryption parameters.</p>
      </div>

      {/* Voting & Submissions Group */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-fivem-orange/40 to-transparent" />
        <div className="px-5 pt-4 pb-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-1">Contest Real-Time Switches</p>
        </div>
        <div className="space-y-1 px-2 pb-2">
          <AdminToggle
            label="Voting"
            description="Allow users to vote on contest submissions"
            checked={votingOpen}
            onToggle={onToggleVoting}
            activeColor="bg-emerald-500"
            activeGlow="shadow-[0_0_12px_rgba(34,197,94,0.5)]"
            icon={<Unlock size={16} />}
          />
          <AdminToggle
            label="Submissions"
            description="Allow new photo submissions from users"
            checked={submissionsOpen}
            onToggle={onToggleSubmissions}
            activeColor="bg-fivem-orange"
            activeGlow="shadow-[0_0_12px_rgba(234,88,12,0.5)]"
            icon={<ImageIcon size={16} />}
          />
        </div>
      </div>

      {/* Limits & Display Group */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
        <div className="px-5 pt-4 pb-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-1">Rules & Showcase Display</p>
        </div>
        <div className="space-y-1 px-2 pb-2">
          <AdminToggle
            label="1 Photo Per User"
            description="Limit each Discord account to a single submission"
            checked={onePhotoPerUser}
            onToggle={onToggleOnePhotoPerUser}
            activeColor="bg-amber-500"
            activeGlow="shadow-[0_0_12px_rgba(245,158,11,0.5)]"
            icon={<Lock size={16} />}
          />
          <AdminToggle
            label="Winner Announcement"
            description="Show the winner showcase banner above the hero section"
            checked={showWinnersToggle}
            onToggle={onToggleShowWinners}
            activeColor="bg-purple-500"
            activeGlow="shadow-[0_0_12px_rgba(168,85,247,0.5)]"
            icon={<Trophy size={16} />}
          />
        </div>
      </div>

      {/* Security & Encryption Section */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/15 bg-purple-500/[0.03] p-6 space-y-4">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-purple-400" />
            <h4 className="text-sm font-bold text-white">RSA Security Keys</h4>
            {publicKey && (
              <span className="text-[9px] font-mono bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Keys Active</span>
            )}
          </div>
          <button
            onClick={onGenerateKeys}
            className="px-4 py-2 rounded-xl font-bold text-xs transition-all duration-300 bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)] cursor-pointer"
          >
            {publicKey ? '🔄 Regenerate Keys' : '🔐 Generate Keys'}
          </button>
        </div>
        <p className="text-xs text-white/40 leading-relaxed">
          RSA key pairs encrypt submission URLs on upload, preventing participants from discovering uncensored photos before the official reveal.
        </p>

        <div className="pt-2 border-t border-purple-500/10">
          <AdminToggle
            label="Global Image Decryption"
            description="Publish private key globally to un-censor images for all visitors"
            checked={!!privateKey}
            onToggle={(checked) => onToggleReveal(checked)}
            activeColor="bg-emerald-500"
            activeGlow="shadow-[0_0_12px_rgba(34,197,94,0.5)]"
            icon={<Eye size={16} />}
            disabled={!publicKey}
          />
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════
   TAB: Danger Zone
   ═══════════════════════════════════════════════════════════════════════ */
function DangerTab({ activeContest, categories, allPhotos, onResetVotes }: {
  activeContest: any; categories: Category[]; allPhotos: Photo[]; onResetVotes?: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-black font-display text-red-400 mb-1 flex items-center gap-2">
          <AlertCircle size={20} /> Danger Zone
        </h3>
        <p className="text-sm text-white/40">Destructive actions that cannot be undone. Proceed with extreme caution.</p>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
        <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-red-400 mb-1">Irreversible Actions</p>
          <p className="text-xs text-red-400/60 leading-relaxed">
            Archiving will save winners and user stats, then permanently delete all current photos and votes. 
            Resetting votes will clear all cast votes and set all photo counts to 0.
          </p>
        </div>
      </div>

      {/* Reset Votes Section */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/[0.03]">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        <div className="px-6 pt-5 pb-4 border-b border-amber-500/[0.12] flex items-center gap-2">
          <div className="w-1 h-4 bg-amber-500/70 rounded-full" />
          <AlertCircle size={13} className="text-amber-500/80" />
          <h4 className="text-[11px] font-mono text-amber-500/80 uppercase tracking-[0.2em]">Vote Management</h4>
        </div>
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h5 className="text-sm font-bold text-white mb-0.5">Reset All Votes</h5>
            <p className="text-xs text-white/40">
              Clear all cast vote records and set `vote_count` back to 0 on every photo in the current contest.
            </p>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to reset ALL votes to 0? This cannot be undone.')) {
                onResetVotes?.();
              }
            }}
            className="px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-bold text-xs rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <AlertCircle size={14} />
            Reset All Votes
          </button>
        </div>
      </div>

      {/* Archive / Destroy Controls */}
      <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/[0.03]">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
        <div className="px-6 pt-5 pb-4 border-b border-red-500/[0.12] flex items-center gap-2">
          <div className="w-1 h-4 bg-red-500/70 rounded-full" />
          <AlertCircle size={13} className="text-red-500/80" />
          <h4 className="text-[11px] font-mono text-red-500/80 uppercase tracking-[0.2em]">Contest Lifecycle</h4>
        </div>
        <div className="p-6">
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-red-400" /></div>}>
            <ArchiveContest
              onArchived={() => window.location.reload()}
              activeContest={activeContest}
              categories={categories}
              allPhotos={allPhotos}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
