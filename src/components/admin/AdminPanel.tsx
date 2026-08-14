import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings, Trophy, Layers, Lock, Unlock, AlertCircle,
  Image as ImageIcon, ChevronRight, ChevronDown, ChevronUp,
  Eye, Download, Loader2, BarChart3, Shield, ShieldCheck, Zap, LayoutDashboard, UserCheck,
  Bug, CheckCircle2, Trash2, Clock, Minus, Maximize2, X, Wrench, Sparkles, TrendingUp
} from 'lucide-react';
import { collection, query, orderBy, getDocs, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { Category, Photo } from '../../types';
import { AnimatedShinyText } from '../ui/animated-shiny-text';
import { ShimmerButton } from '../ui/shimmer-button';
import { AdminToggle } from '../ui/admin-toggle';
import { AdminVoterSearch } from './AdminVoterSearch';

import { ChangelogTab } from './ChangelogTab';
import { Sidebar, SidebarBody, SidebarLink } from '../ui/sidebar';
import { AdminHeader } from './AdminHeader';

import { EditContestManager, ArchiveContest, CreateContestManager } from './ContestManagers';
import AdminSubmissionsPreview from './AdminSubmissionsPreview';

const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));

type AdminTab = 'dashboard' | 'analytics' | 'submissions' | 'voters' | 'contest' | 'controls' | 'changelogs' | 'danger';

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
  siteClosed?: boolean;
  publicKey: string | null;
  privateKey: string | null;
  rulesMarkdown: string;
  winners: any[];
  onToggleVoting: (open: boolean) => void;
  onToggleSubmissions: (open: boolean) => void;
  onToggleOnePhotoPerUser: (enabled: boolean) => void;
  onToggleShowWinners: (enabled: boolean) => void;
  onToggleSiteClosed?: (closed: boolean) => void;
  onGenerateKeys: () => void;
  onToggleReveal: (reveal: boolean) => void;
  onDownloadWinners: () => void;
  onDeletePhoto: (photoId: string, discordName: string) => void;
  onToggleDisqualifyPhoto?: (photoId: string, disqualify: boolean, reason?: string) => void;
  onResetVotes?: () => void;
  onOpenAnalytics: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  onClose?: () => void;
}

const TAB_GROUPS: {
  section: string;
  tabs: {
    id: AdminTab;
    label: string;
    icon: typeof Settings;
    color: string;
    glowColor: string;
    description: string;
  }[];
}[] = [
  {
    section: "Core Operations",
    tabs: [
      { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, color: 'text-fivem-orange', glowColor: 'from-fivem-orange/20 via-fivem-orange/10 to-transparent', description: 'Metrics & status' },
      { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'text-blue-400', glowColor: 'from-blue-500/20 via-blue-500/10 to-transparent', description: 'Charts & telemetry' },
      { id: 'submissions', label: 'Submissions', icon: ImageIcon, color: 'text-cyan-400', glowColor: 'from-cyan-500/20 via-cyan-500/10 to-transparent', description: 'Photos & decryption' },
      { id: 'voters', label: 'Voter Audit', icon: UserCheck, color: 'text-emerald-400', glowColor: 'from-emerald-500/20 via-emerald-500/10 to-transparent', description: 'Search & fraud check' },
    ]
  },
  {
    section: "Contest Control",
    tabs: [
      { id: 'contest', label: 'Contest Setup', icon: Trophy, color: 'text-amber-400', glowColor: 'from-amber-500/20 via-amber-500/10 to-transparent', description: 'Rules & winners' },
      { id: 'controls', label: 'Controls & Security', icon: Zap, color: 'text-purple-400', glowColor: 'from-purple-500/20 via-purple-500/10 to-transparent', description: 'Lockdown & RSA keys' },
    ]
  },
  {
    section: "Platform",
    tabs: [
      { id: 'changelogs', label: 'Changelog', icon: Layers, color: 'text-fivem-orange', glowColor: 'from-fivem-orange/20 via-fivem-orange/10 to-transparent', description: 'Version history & log' },
      { id: 'danger', label: 'Danger Zone', icon: AlertCircle, color: 'text-red-400', glowColor: 'from-red-500/20 via-red-500/10 to-transparent', description: 'Reset & archive' },
    ]
  }
];

const ALL_TABS = TAB_GROUPS.flatMap(g => g.tabs);

export default function AdminPanel(props: AdminPanelProps) {
  const {
    isAdmin, user, activeContest, categories = [], allPhotos = [], votingOpen, submissionsOpen,
    onePhotoPerUser, showWinnersToggle, siteClosed = false, publicKey, privateKey, rulesMarkdown, winners = [],
    onToggleVoting, onToggleSubmissions, onToggleOnePhotoPerUser, onToggleShowWinners, onToggleSiteClosed,
    onGenerateKeys, onToggleReveal, onDownloadWinners, onDeletePhoto, onToggleDisqualifyPhoto, onResetVotes, onOpenAnalytics,
    isMinimized = false, onToggleMinimize, onClose
  } = props;

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!isAdmin) return null;

  if (isMinimized) {
    return (
      <motion.div
        layoutId="admin-console-dock"
        initial={{ opacity: 0, y: 40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="fixed bottom-4 right-4 sm:right-6 z-[170] flex items-center gap-3 p-3 px-4 rounded-2xl bg-[#09090d]/95 backdrop-blur-2xl border border-fivem-orange/40 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(234,88,12,0.25)] text-white group pointer-events-auto select-none"
      >
        <div
          onClick={onToggleMinimize}
          className="flex items-center gap-3 cursor-pointer flex-1"
        >
          {/* Icon & Pulse Indicator */}
          <div className="relative shrink-0">
            <div className="p-2.5 rounded-xl bg-fivem-orange/20 border border-fivem-orange/40 text-fivem-orange flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <Settings size={18} />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#09090d] animate-pulse" />
          </div>

          {/* Info details */}
          <div className="flex flex-col min-w-[140px] max-w-[200px]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black font-display text-white truncate">Admin Console</span>
              <span className="text-[9px] font-mono font-bold text-fivem-orange bg-fivem-orange/15 px-1.5 py-0.2 rounded border border-fivem-orange/30 uppercase">
                Active
              </span>
            </div>
            <span className="text-[10px] text-white/50 font-mono truncate mt-0.5 capitalize">
              Domain: <strong className="text-white/90">{activeTab}</strong>
            </span>
          </div>
        </div>

        {/* Actions: Expand & Close */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-white/10 shrink-0">
          <button
            type="button"
            onClick={onToggleMinimize}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all border border-white/10 cursor-pointer"
            title="Expand Admin Console"
          >
            <Maximize2 size={14} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-all border border-white/10 cursor-pointer"
              title="Close Admin Panel"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
      <div className="relative z-10 flex flex-col md:flex-row h-full w-full overflow-hidden bg-[#060609]">
        
        {/* ── ACETERNITY ENHANCED SIDEBAR DOCK ── */}
        <SidebarBody>
          <div className="flex flex-col flex-1 min-h-0 justify-between space-y-4">
            
            {/* Header & Categorized Navigation */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-3 px-2 py-1">
                <div className="p-2.5 bg-gradient-to-br from-fivem-orange/25 to-fivem-orange/10 border border-fivem-orange/40 rounded-2xl text-fivem-orange shrink-0 shadow-[0_0_15px_rgba(234,88,12,0.25)]">
                  <Settings size={18} />
                </div>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col min-w-0"
                  >
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-black font-display text-white leading-none">
                        <AnimatedShinyText shimmerWidth={120}>Admin Console</AnimatedShinyText>
                      </h2>
                    </div>
                    <span className="text-[10px] text-white/40 font-mono mt-0.5">Vital RP Operations</span>
                  </motion.div>
                )}
              </div>

              {/* Categorized Navigation Groups */}
              <div className="space-y-3.5">
                {TAB_GROUPS.map((group) => (
                  <div key={group.section} className="space-y-0.5">
                    {sidebarOpen && (
                      <p className="px-3 text-[9px] font-mono uppercase tracking-[0.2em] text-white/30 font-bold mb-1">
                        {group.section}
                      </p>
                    )}
                    {group.tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      const isDanger = tab.id === 'danger';
                      const badge = tab.id === 'submissions' && allPhotos.length > 0
                        ? allPhotos.length
                        : tab.id === 'controls' && siteClosed
                          ? 'Locked'
                          : undefined;
                      const badgeColor = tab.id === 'controls' && siteClosed
                        ? 'bg-red-500/20 border-red-500/40 text-red-400'
                        : undefined;

                      return (
                        <SidebarLink
                          key={tab.id}
                          label={tab.label}
                          icon={<Icon size={16} />}
                          active={isActive}
                          color={tab.color}
                          glowColor={tab.glowColor}
                          description={tab.description}
                          badge={badge}
                          badgeColor={badgeColor}
                          isDanger={isDanger}
                          onClick={() => setActiveTab(tab.id)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Creator Footer Card inside Sidebar */}
            <div className="border-t border-white/10 pt-3 pb-1 px-1">
              <div className="flex items-center gap-3">
                <img
                  src="https://r2.fivemanage.com/image/qePVNvTsc65p.png"
                  alt="Damon"
                  className="w-9 h-9 rounded-xl object-cover border border-fivem-orange/60 p-0.5 bg-black/60 shrink-0 shadow-[0_0_10px_rgba(234,88,12,0.2)]"
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
        <div className="md:hidden relative shrink-0 border-b border-white/10 bg-[#08080b]">
          {/* Left fade scroll indicator */}
          <div className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-[#08080b] to-transparent z-10 pointer-events-none" />
          {/* Right fade scroll indicator with arrow hint */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#08080b] via-[#08080b]/80 to-transparent z-10 pointer-events-none flex items-center justify-end pr-1">
            <ChevronRight size={14} className="text-white/30 animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5 p-2 overflow-x-auto no-scrollbar touch-pan-x">
            {ALL_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isDanger = tab.id === 'danger';
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer",
                    isDanger
                      ? isActive
                        ? "bg-red-500/30 text-white border border-red-500/60 shadow-sm"
                        : "text-red-400 bg-red-500/10 border border-red-500/30"
                      : isActive
                        ? "bg-fivem-orange/20 text-white border border-fivem-orange/40 shadow-sm"
                        : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                  )}
                >
                  <Icon size={14} className={isDanger ? 'text-red-400' : (isActive ? tab.color : '')} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
            {/* End spacer so last tab isn't hidden under fade */}
            <div className="shrink-0 w-6" aria-hidden="true" />
          </div>
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

              {onToggleMinimize && (
                <button
                  type="button"
                  onClick={onToggleMinimize}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  title="Minimize Admin Console to Bottom Dock"
                >
                  <Minus size={15} />
                </button>
              )}

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 border border-white/10 transition-colors cursor-pointer"
                  title="Close Admin Panel"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Tab Content Stage with Cool Motion Physics */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 h-full bg-[#08080c]/90">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 14, filter: "blur(6px)", scale: 0.992 }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
                exit={{ opacity: 0, y: -10, filter: "blur(6px)", scale: 0.992 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-full 2xl:max-w-[1440px] xl:max-w-[1280px] lg:max-w-[1100px] mx-auto"
              >
                {activeTab === 'dashboard' && (
                  <OverviewTab
                    activeContest={activeContest}
                    categories={categories}
                    allPhotos={allPhotos}
                    votingOpen={votingOpen}
                    submissionsOpen={submissionsOpen}
                    siteClosed={siteClosed}
                    setActiveTab={setActiveTab}
                    onOpenAnalytics={() => setActiveTab('analytics')}
                  />
                )}

                {activeTab === 'analytics' && (
                  <div className="space-y-6">
                    <AdminHeader
                      badge="LIVE TELEMETRY"
                      badgeColor="bg-blue-500/15 text-blue-400 border-blue-500/30"
                      title="Contest Telemetry & Analytics"
                      subtitle="Real-time vote progression, submission velocity charts, and category popularity distribution."
                      icon={<BarChart3 size={20} className="text-blue-400" />}
                      iconBg="bg-blue-500/15 border-blue-500/30"
                      actions={
                        <button
                          onClick={onOpenAnalytics}
                          className="px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-center active:scale-95"
                        >
                          <Maximize2 size={13} />
                          <span>Fullscreen Mode</span>
                        </button>
                      }
                    />
                    <Suspense fallback={<div className="flex justify-center p-16"><Loader2 className="animate-spin text-blue-400" /></div>}>
                      <AnalyticsDashboard
                        photos={allPhotos}
                        categories={categories}
                        onClose={() => setActiveTab('dashboard')}
                        isInline={true}
                      />
                    </Suspense>
                  </div>
                )}

                {activeTab === 'submissions' && (
                  <div className="space-y-6">
                    <AdminHeader
                      badge="ENTRIES & MEDIA"
                      badgeColor="bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                      title="Submissions Management"
                      subtitle="Review decrypted photo submissions, inspect photographer details, and manage entries."
                      icon={<ImageIcon size={20} className="text-cyan-400" />}
                      iconBg="bg-cyan-500/15 border-cyan-500/30"
                      actions={
                        <span className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold">
                          {allPhotos.length} Total Submissions
                        </span>
                      }
                    />
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
                    <AdminHeader
                      badge="SECURITY & AUDIT"
                      badgeColor="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      title="Voter Audit & Fraud Check"
                      subtitle="Search voters by Discord username or UID, inspect vote distribution, and clear flagged records."
                      icon={<UserCheck size={20} className="text-emerald-400" />}
                      iconBg="bg-emerald-500/15 border-emerald-500/30"
                    />
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
                    siteClosed={siteClosed}
                    publicKey={publicKey}
                    privateKey={privateKey}
                    onToggleVoting={onToggleVoting}
                    onToggleSubmissions={onToggleSubmissions}
                    onToggleOnePhotoPerUser={onToggleOnePhotoPerUser}
                    onToggleShowWinners={onToggleShowWinners}
                    onToggleSiteClosed={onToggleSiteClosed}
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

function OverviewTab({ activeContest, categories, allPhotos, votingOpen, submissionsOpen, siteClosed = false, setActiveTab, onOpenAnalytics }: {
  activeContest: any; categories: Category[]; allPhotos: Photo[]; votingOpen: boolean; submissionsOpen: boolean; siteClosed?: boolean;
  setActiveTab: (tab: AdminTab) => void; onOpenAnalytics: () => void;
}) {
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [loadingBugs, setLoadingBugs] = useState(true);
  const [expandedBugId, setExpandedBugId] = useState<string | null>(null);

  // Subscribe to bug reports collection
  useEffect(() => {
    try {
      const q = query(collection(db, 'bug_reports'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const reports: BugReport[] = snapshot.docs.map(d => {
          const data = d.data();
          let dateStr = 'Recently';
          if (data.createdAt?.toDate) {
            dateStr = data.createdAt.toDate().toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
          }
          return {
            id: d.id,
            title: data.title || 'Untitled Report',
            description: data.description || '',
            contactEmail: data.contactEmail,
            reportedBy: data.reportedBy,
            status: data.status === 'Resolved' ? 'Resolved' : 'Open',
            createdAt: data.createdAt,
            dateStr
          };
        });
        setBugReports(reports);
        setLoadingBugs(false);
      }, (err) => {
        console.error('Error fetching bug reports:', err);
        setLoadingBugs(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error(e);
      setLoadingBugs(false);
    }
  }, []);

  const totalVotes = allPhotos.reduce((sum, p) => sum + (p.vote_count || 0), 0);
  const openBugsCount = bugReports.filter(b => b.status === 'Open').length;

  const handleToggleBugStatus = async (bug: BugReport) => {
    const nextStatus = bug.status === 'Open' ? 'Resolved' : 'Open';
    try {
      await updateDoc(doc(db, 'bug_reports', bug.id), { status: nextStatus });
      toast.success(`Bug marked as ${nextStatus}`);
    } catch (e) {
      toast.error('Failed to update bug status');
    }
  };

  const handleDeleteBug = async (id: string) => {
    if (!window.confirm('Delete this bug report?')) return;
    try {
      await deleteDoc(doc(db, 'bug_reports', id));
      toast.success('Bug report deleted');
    } catch (e) {
      toast.error('Failed to delete bug report');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <AdminHeader
        badge="OPERATIONAL HUB"
        badgeColor="bg-fivem-orange/15 text-fivem-orange border-fivem-orange/30"
        title="Contest Control Center"
        subtitle={activeContest ? `Active Session: "${activeContest.name}" • Real-time telemetry, quick switches, and operational health.` : 'No active contest round configured.'}
        icon={<LayoutDashboard size={20} className="text-fivem-orange" />}
        iconBg="bg-fivem-orange/15 border-fivem-orange/30"
        actions={
          <button
            onClick={() => setActiveTab('controls')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-fivem-orange/20 hover:bg-fivem-orange/30 border border-fivem-orange/40 text-fivem-orange font-bold text-xs transition-all shadow-sm cursor-pointer active:scale-95"
          >
            <Zap size={14} />
            <span>Fast Switches</span>
          </button>
        }
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Submissions */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/40 mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider">Submissions</span>
            <ImageIcon size={16} className="text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-display text-white">{allPhotos.length}</div>
            <div className="text-[10px] text-white/40 font-mono mt-1">Across {categories.length} categories</div>
          </div>
        </div>

        {/* Total Votes */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/40 mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider">Total Votes</span>
            <Trophy size={16} className="text-amber-400" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-display text-white">{totalVotes}</div>
            <div className="text-[10px] text-white/40 font-mono mt-1">Verified community votes</div>
          </div>
        </div>

        {/* Submissions Status */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/40 mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider">Uploads</span>
            <div className={cn("w-2 h-2 rounded-full", submissionsOpen ? "bg-emerald-400 animate-pulse" : "bg-red-400")} />
          </div>
          <div>
            <div className={cn("text-xl sm:text-2xl font-black font-display", submissionsOpen ? "text-emerald-400" : "text-red-400")}>
              {submissionsOpen ? 'Open' : 'Closed'}
            </div>
            <div className="text-[10px] text-white/40 font-mono mt-1">Submission gate</div>
          </div>
        </div>

        {/* Voting Status */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/40 mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider">Voting</span>
            <div className={cn("w-2 h-2 rounded-full", votingOpen ? "bg-emerald-400 animate-pulse" : "bg-red-400")} />
          </div>
          <div>
            <div className={cn("text-xl sm:text-2xl font-black font-display", votingOpen ? "text-emerald-400" : "text-red-400")}>
              {votingOpen ? 'Open' : 'Closed'}
            </div>
            <div className="text-[10px] text-white/40 font-mono mt-1">Ballot collection</div>
          </div>
        </div>

        {/* Site Closed / Access Status */}
        <div className="col-span-2 lg:col-span-1 p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/40 mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider">Site Access</span>
            <Lock size={16} className={siteClosed ? "text-red-400" : "text-emerald-400"} />
          </div>
          <div>
            <div className={cn("text-xl sm:text-2xl font-black font-display", siteClosed ? "text-red-400" : "text-emerald-400")}>
              {siteClosed ? 'Locked' : 'Open'}
            </div>
            <div className="text-[10px] text-white/40 font-mono mt-1">{siteClosed ? 'Modal active' : 'Live access'}</div>
          </div>
        </div>
      </div>

      {/* ── LIVE BUG REPORTS & FEEDBACK INBOX ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
              <Bug size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black font-display text-white">Community Bug Reports</h3>
                {openBugsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/20 border border-red-500/40 text-red-400">
                    {openBugsCount} Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-white/40 mt-0.5">Direct reports submitted from the floating Bug Report modal on the live site.</p>
            </div>
          </div>
        </div>

        {/* Bug Reports List */}
        <div className="mt-4 space-y-3">
          {loadingBugs ? (
            <div className="flex items-center justify-center p-8 text-white/40 text-xs font-mono">
              <Loader2 size={16} className="animate-spin text-fivem-orange mr-2" />
              Loading bug reports...
            </div>
          ) : bugReports.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white/[0.01] border border-dashed border-white/10">
              <CheckCircle2 size={24} className="mx-auto text-emerald-400 mb-2 opacity-60" />
              <p className="text-xs font-bold text-white/70">No Bug Reports Submitted</p>
              <p className="text-[11px] text-white/40 mt-1">Platform is healthy and no issues have been filed by users.</p>
            </div>
          ) : (
            bugReports.map((bug) => {
              const isOpen = bug.status === 'Open';
              const isExpanded = expandedBugId === bug.id;

              return (
                <div
                  key={bug.id}
                  className={cn(
                    "rounded-2xl border transition-all overflow-hidden",
                    isOpen
                      ? "bg-red-500/[0.03] border-red-500/20 hover:border-red-500/40"
                      : "bg-white/[0.01] border-white/5 opacity-70"
                  )}
                >
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div
                      onClick={() => setExpandedBugId(isExpanded ? null : bug.id)}
                      className="flex items-start gap-3 cursor-pointer flex-1 min-w-0"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBugStatus(bug);
                        }}
                        className={cn(
                          "mt-0.5 p-1.5 rounded-lg border transition-all cursor-pointer shrink-0",
                          isOpen
                            ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/40"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40"
                        )}
                        title={isOpen ? "Click to mark as Resolved" : "Click to reopen"}
                      >
                        {isOpen ? <Clock size={14} /> : <CheckCircle2 size={14} />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white font-display truncate">
                            {bug.title}
                          </span>
                          <span className={cn(
                            "px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase",
                            isOpen ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          )}>
                            {bug.status}
                          </span>
                          <span className="text-[10px] text-white/40 font-mono">
                            {bug.dateStr}
                          </span>
                        </div>

                        <p className="text-xs text-white/60 mt-1 line-clamp-1">
                          {bug.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => handleToggleBugStatus(bug)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/80 transition-colors cursor-pointer"
                      >
                        {isOpen ? 'Mark Resolved' : 'Reopen'}
                      </button>
                      <button
                        onClick={() => handleDeleteBug(bug.id)}
                        className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete report"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => setExpandedBugId(isExpanded ? null : bug.id)}
                        className="p-1.5 rounded-xl bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details View */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-black/30 space-y-3">
                      <div>
                        <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">Full Description</span>
                        <p className="text-xs sm:text-sm text-white/80 leading-relaxed whitespace-pre-wrap bg-black/40 p-3 rounded-xl border border-white/5 font-sans">
                          {bug.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs font-mono text-white/40 pt-1">
                        {bug.contactEmail && (
                          <div>
                            <span className="text-white/25 mr-1">Contact:</span>
                            <span className="text-white/70">{bug.contactEmail}</span>
                          </div>
                        )}
                        {bug.reportedBy && (
                          <div>
                            <span className="text-white/25 mr-1">Reported By:</span>
                            <span className="text-white/70">{bug.reportedBy}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-white/25 mr-1">Report ID:</span>
                          <span className="text-white/40">{bug.id}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('submissions')}
          className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-cyan-500/40 transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ImageIcon size={18} />
            </div>
            <ChevronRight size={16} className="text-cyan-500/50 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">Submissions Hub</p>
          <p className="text-xs text-white/40 mt-1">Review photos, inspect decrypted files, and manage submissions.</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('voters')}
          className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-emerald-500/40 transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <UserCheck size={18} />
            </div>
            <ChevronRight size={16} className="text-emerald-500/50 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Voter Audit</p>
          <p className="text-xs text-white/40 mt-1">Audit voter logs and revoke suspicious votes.</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('changelogs')}
          className="p-5 rounded-2xl border border-fivem-orange/20 bg-fivem-orange/[0.04] hover:bg-fivem-orange/[0.08] transition-all text-left group cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-fivem-orange/15 border border-fivem-orange/30 text-fivem-orange">
              <Layers size={18} />
            </div>
            <ChevronRight size={16} className="text-fivem-orange/50 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-sm font-bold text-white group-hover:text-fivem-orange transition-colors">Platform Changelog</p>
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
          <h4 className="text-[11px] font-mono text-blue-500/80 uppercase tracking-[0.2em]">Analytics & Telemetry</h4>
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
      <AdminHeader
        badge="ROUND CONFIGURATION"
        badgeColor="bg-amber-500/15 text-amber-400 border-amber-500/30"
        title="Contest Setup & Management"
        subtitle="Configure active contest parameters, edit categories, customize rules, or download winning entries."
        icon={<Trophy size={20} className="text-amber-400" />}
        iconBg="bg-amber-500/15 border-amber-500/30"
        actions={
          <button
            onClick={onDownloadWinners}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Download size={14} />
            <span>Download ZIP</span>
          </button>
        }
      />

      {/* Download Winners Section */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/[0.03]">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        <div className="px-6 pt-5 pb-4 border-b border-amber-500/[0.12] flex items-center gap-2">
          <div className="w-1 h-4 bg-amber-500/70 rounded-full" />
          <Download size={13} className="text-amber-500/80" />
          <h4 className="text-[11px] font-mono text-amber-500/80 uppercase tracking-[0.2em]">Winners Export</h4>
        </div>
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h5 className="text-sm font-bold text-white mb-0.5">Download Winning Photos</h5>
            <p className="text-xs text-white/40">
              Export high-resolution images of current 1st place winners across all categories as a ZIP package.
            </p>
          </div>
          <button
            onClick={onDownloadWinners}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-all shadow-md shrink-0 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Download size={14} />
            Download ZIP
          </button>
        </div>
      </div>

      {/* Edit Active Contest */}
      {activeContest && (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="px-6 pt-5 pb-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-fivem-orange rounded-full" />
              <h4 className="text-[11px] font-mono text-white/60 uppercase tracking-[0.2em]">Active Contest Settings</h4>
            </div>
            <span className="text-[10px] font-mono text-fivem-orange bg-fivem-orange/10 px-2 py-0.5 rounded border border-fivem-orange/30">
              ID: {activeContest.id}
            </span>
          </div>
          <div className="p-6">
            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-fivem-orange" /></div>}>
              <EditContestManager
                activeContest={activeContest}
                categories={categories}
                rulesMarkdown={rulesMarkdown}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Create New Contest Accordion */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-emerald-500 rounded-full" />
            <h4 className="text-[11px] font-mono text-emerald-400 uppercase tracking-[0.2em]">Create New Contest Round</h4>
          </div>
          <span className="text-xs font-mono text-white/40">
            {showCreate ? '− Collapse' : '+ Expand Form'}
          </span>
        </button>

        {showCreate && (
          <div className="p-6 border-t border-white/10">
            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-emerald-500" /></div>}>
              <CreateContestManager onContestCreated={() => window.location.reload()} />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════
   TAB: Controls & Security (Real-Time Toggles & RSA Key Management)
   ═══════════════════════════════════════════════════════════════════════ */
function ControlsAndSecurityTab({
  votingOpen, submissionsOpen, onePhotoPerUser, showWinnersToggle, siteClosed = false,
  publicKey, privateKey,
  onToggleVoting, onToggleSubmissions, onToggleOnePhotoPerUser, onToggleShowWinners, onToggleSiteClosed,
  onGenerateKeys, onToggleReveal
}: {
  votingOpen: boolean; submissionsOpen: boolean; onePhotoPerUser: boolean; showWinnersToggle: boolean; siteClosed?: boolean;
  publicKey: string | null; privateKey: string | null;
  onToggleVoting: (open: boolean) => void; onToggleSubmissions: (open: boolean) => void;
  onToggleOnePhotoPerUser: (enabled: boolean) => void; onToggleShowWinners: (enabled: boolean) => void;
  onToggleSiteClosed?: (closed: boolean) => void;
  onGenerateKeys: () => void; onToggleReveal: (reveal: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <AdminHeader
        badge="SYSTEM CONTROL"
        badgeColor="bg-purple-500/15 text-purple-400 border-purple-500/30"
        title="Controls & Security"
        subtitle="Real-time switches, access lockdown, and RSA end-to-end encryption keys."
        icon={<Zap size={20} className="text-purple-400" />}
        iconBg="bg-purple-500/15 border-purple-500/30"
      />

      {/* Real-time Switches Section */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="px-6 pt-5 pb-4 border-b border-white/10 flex items-center gap-2">
          <div className="w-1 h-4 bg-fivem-orange rounded-full" />
          <h4 className="text-[11px] font-mono text-white/60 uppercase tracking-[0.2em]">Contest Real-Time Switches</h4>
        </div>

        <div className="p-6 space-y-4">
          <AdminToggle
            label="Submissions Gate"
            description="Allow participants to upload new photos to the contest."
            checked={submissionsOpen}
            onToggle={(checked) => onToggleSubmissions(checked)}
            activeColor="bg-cyan-500"
            activeGlow="shadow-[0_0_12px_rgba(6,182,212,0.5)]"
            icon={<ImageIcon size={16} />}
          />

          <AdminToggle
            label="Voting Gate"
            description="Enable community members to cast votes on submissions."
            checked={votingOpen}
            onToggle={(checked) => onToggleVoting(checked)}
            activeColor="bg-amber-500"
            activeGlow="shadow-[0_0_12px_rgba(245,158,11,0.5)]"
            icon={<Trophy size={16} />}
          />

          <AdminToggle
            label="1 Photo Per User Enforcement"
            description="Strictly limit each Discord user to 1 active photo entry total."
            checked={onePhotoPerUser}
            onToggle={(checked) => onToggleOnePhotoPerUser(checked)}
            activeColor="bg-purple-500"
            activeGlow="shadow-[0_0_12px_rgba(168,85,247,0.5)]"
            icon={<Shield size={16} />}
          />

          <AdminToggle
            label="Show Winners Celebration View"
            description="Display the winners podium and confetti celebration banner to users."
            checked={showWinnersToggle}
            onToggle={(checked) => onToggleShowWinners(checked)}
            activeColor="bg-fivem-orange"
            activeGlow="shadow-[0_0_12px_rgba(234,88,12,0.5)]"
            icon={<Trophy size={16} />}
          />

          {onToggleSiteClosed && (
            <AdminToggle
              label="Site Closed / Lockdown Mode"
              description="Restrict access with a 'Contest is Closed' overlay for non-admins."
              checked={siteClosed}
              onToggle={(checked) => onToggleSiteClosed(checked)}
              activeColor="bg-red-500"
              activeGlow="shadow-[0_0_12px_rgba(239,68,68,0.5)]"
              icon={<Lock size={16} />}
            />
          )}
        </div>
      </div>

      {/* RSA Encryption Section */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="px-6 pt-5 pb-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-emerald-500 rounded-full" />
            <h4 className="text-[11px] font-mono text-white/60 uppercase tracking-[0.2em]">RSA Encryption Keys</h4>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
            {publicKey ? 'Keys Configured' : 'Keys Missing'}
          </span>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-sm font-bold text-white mb-0.5">Generate New RSA Keypair</p>
              <p className="text-xs text-white/40">Creates fresh 2048-bit RSA keys for encrypting submissions before reveal.</p>
            </div>
            <button
              onClick={onGenerateKeys}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <Shield size={14} />
              Generate Keys
            </button>
          </div>

          <AdminToggle
            label="Instant Submission Decryption (Reveal)"
            description="Automatically decrypt all encrypted submissions for public viewing."
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
      <AdminHeader
        badge="CRITICAL ACTIONS"
        badgeColor="bg-red-500/15 text-red-400 border-red-500/30"
        title="Danger Zone"
        subtitle="Destructive actions that cannot be undone. Proceed with extreme caution."
        icon={<AlertCircle size={20} className="text-red-400" />}
        iconBg="bg-red-500/15 border-red-500/30"
      />

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
              Clear all cast vote records and set vote_count back to 0 on every photo in the current contest.
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
