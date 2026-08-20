"use client";

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  BarChart3,
  Image as ImageIcon,
  Sparkles,
  UserCheck,
  Trophy,
  Zap,
  Layers,
  AlertCircle,
  Menu,
  PanelLeftClose,
  PanelLeft,
  ArrowLeft,
  Globe,
  Settings,
  ShieldCheck,
  ChevronRight,
  Loader2,
  X,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Category, Photo } from '../../types';
import { Sheet, SheetContent } from '../ui/sheet';
import { Skeleton } from '../ui/skeleton';

// Lazy load heavier tabs
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));
const AdminSubmissionsPreview = lazy(() => import('./AdminSubmissionsPreview'));
import { AdminVoterSearch } from './AdminVoterSearch';
import { AdminSuggestionsTab } from './AdminSuggestionsTab';
import { ChangelogTab } from './ChangelogTab';
import {
  EditContestManager,
  ArchiveContest,
  CreateContestManager,
  StandaloneRulesEditor
} from './ContestManagers';

// Import Tab Views from AdminPanel or define inline for maximum speed & cohesion
import AdminPanel from './AdminPanel';

export type AdminRouteTab =
  | 'dashboard'
  | 'analytics'
  | 'submissions'
  | 'suggestions'
  | 'voters'
  | 'contest'
  | 'controls'
  | 'changelogs'
  | 'danger';

export interface AdminDashboardPageProps {
  currentTab: AdminRouteTab;
  onNavigateTab: (tab: AdminRouteTab) => void;
  onNavigateHome: () => void;
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
  censorSubmissions?: boolean;
  publicKey: string | null;
  privateKey: string | null;
  rulesMarkdown: string;
  winners: any[];
  onToggleVoting: (open: boolean) => void;
  onToggleSubmissions: (open: boolean) => void;
  onToggleOnePhotoPerUser: (enabled: boolean) => void;
  onToggleShowWinners: (enabled: boolean) => void;
  onToggleSiteClosed?: (closed: boolean) => void;
  onToggleCensorSubmissions?: (enabled: boolean) => void;
  onGenerateKeys: () => void;
  onToggleReveal: (reveal: boolean) => void;
  onDownloadWinners: () => void;
  onDeletePhoto: (photoId: string, discordName: string) => void;
  onToggleDisqualifyPhoto?: (photoId: string, disqualify: boolean, reason?: string) => void;
  onResetVotes?: () => void;
  onOpenAnalytics?: () => void;
}

interface NavItem {
  id: AdminRouteTab;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AdminDashboardPage(props: AdminDashboardPageProps) {
  const {
    currentTab = 'dashboard',
    onNavigateTab,
    onNavigateHome,
    isAdmin,
    user,
    activeContest,
    categories = [],
    allPhotos = [],
    votingOpen,
    submissionsOpen,
    onePhotoPerUser,
    showWinnersToggle,
    siteClosed = false,
    censorSubmissions = false,
    publicKey,
    privateKey,
    rulesMarkdown,
    winners = [],
    onToggleVoting,
    onToggleSubmissions,
    onToggleOnePhotoPerUser,
    onToggleShowWinners,
    onToggleSiteClosed,
    onToggleCensorSubmissions,
    onGenerateKeys,
    onToggleReveal,
    onDownloadWinners,
    onDeletePhoto,
    onToggleDisqualifyPhoto,
    onResetVotes,
  } = props;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const navSections: NavSection[] = [
    {
      title: "Core Operations",
      items: [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'analytics', label: 'Telemetry & Analytics', icon: BarChart3 },
        {
          id: 'submissions',
          label: 'Submissions',
          icon: ImageIcon,
          badge: allPhotos.length > 0 ? allPhotos.length : undefined,
          badgeColor: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
        },
        { id: 'voters', label: 'Voter Audit', icon: UserCheck },
      ],
    },
    {
      title: "Community & Ideas",
      items: [
        {
          id: 'suggestions',
          label: 'Category Themes',
          icon: Sparkles,
        },
      ],
    },
    {
      title: "Contest Setup",
      items: [
        { id: 'contest', label: 'Contest Setup', icon: Trophy },
        {
          id: 'controls',
          label: 'Controls & Security',
          icon: Zap,
          badge: siteClosed ? 'Locked' : undefined,
          badgeColor: siteClosed ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold' : undefined,
        },
      ],
    },
    {
      title: "Platform & Audit",
      items: [
        { id: 'changelogs', label: 'Changelog', icon: Layers },
        { id: 'danger', label: 'Danger Zone', icon: AlertCircle },
      ],
    },
  ];

  const currentNavTitle =
    navSections.flatMap((s) => s.items).find((item) => item.id === currentTab)?.label ||
    'Dashboard';

  const handleTabClick = (tabId: AdminRouteTab) => {
    onNavigateTab(tabId);
    setMobileDrawerOpen(false);
  };

  const renderNavList = (isMobile = false) => (
    <div className="flex flex-col gap-6">
      {navSections.map((section) => (
        <div key={section.title} className="space-y-1.5">
          {(!sidebarCollapsed || isMobile) && (
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-white/30 px-3 block">
              {section.title}
            </span>
          )}
          <div className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              const isDanger = item.id === 'danger';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  title={sidebarCollapsed && !isMobile ? item.label : undefined}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-display font-bold transition-all cursor-pointer relative group/item",
                    isActive
                      ? isDanger
                        ? "bg-red-500/15 text-red-300 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                        : "bg-fivem-orange/15 text-white border border-fivem-orange/40 shadow-[0_0_20px_rgba(234,88,12,0.25)]"
                      : isDanger
                        ? "text-red-400/70 hover:text-red-300 hover:bg-red-500/10 border border-transparent"
                        : "text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent"
                  )}
                >
                  {/* Left Active Accent Indicator */}
                  {isActive && (
                    <span
                      className={cn(
                        "absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full",
                        isDanger ? "bg-red-500" : "bg-fivem-orange shadow-[0_0_8px_rgba(234,88,12,0.9)]"
                      )}
                    />
                  )}

                  <Icon
                    size={16}
                    className={cn(
                      "shrink-0 transition-transform duration-200 group-hover/item:scale-110",
                      isActive
                        ? isDanger
                          ? "text-red-400"
                          : "text-fivem-orange"
                        : "text-white/50 group-hover/item:text-white"
                    )}
                  />

                  {(!sidebarCollapsed || isMobile) && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}

                  {(!sidebarCollapsed || isMobile) && item.badge && (
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 leading-none",
                        item.badgeColor || "bg-white/10 text-white/80"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#07070a] text-white flex flex-col antialiased selection:bg-fivem-orange selection:text-white">
      {/* ── Top Ambient Lighting Aura ── */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[200px] bg-fivem-orange/10 blur-[140px] pointer-events-none z-0" />
      <div className="fixed top-1/3 right-10 w-[500px] h-[300px] bg-purple-600/5 blur-[160px] pointer-events-none z-0" />

      <div className="relative z-10 flex flex-1 w-full min-h-screen">
        {/* ── DESKTOP COLLAPSIBLE SIDEBAR (AdminCN Architecture) ── */}
        <aside
          className={cn(
            "hidden md:flex flex-col shrink-0 border-r border-white/[0.08] bg-[#09090d]/95 backdrop-blur-2xl transition-all duration-300 relative z-20",
            sidebarCollapsed ? "w-16" : "w-64 lg:w-72"
          )}
        >
          {/* Top Brand Banner */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/[0.08]">
            <div
              onClick={onNavigateHome}
              className="flex items-center gap-3 cursor-pointer group min-w-0"
              title="Return to Public Contest"
            >
              <img
                src="https://r2.fivemanage.com/image/qePVNvTsc65p.png"
                alt="Vital RP"
                className="w-8 h-8 rounded-xl object-contain drop-shadow-[0_0_10px_rgba(234,88,12,0.4)] group-hover:scale-105 transition-transform shrink-0"
              />
              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black font-display text-white uppercase tracking-wider truncate leading-tight group-hover:text-fivem-orange transition-colors">
                    Vital RP Contest
                  </span>
                  <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest leading-none mt-0.5">
                    Admin Console
                  </span>
                </div>
              )}
            </div>

            {/* Sidebar Collapse Toggle Button */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/50 hover:text-white transition-all cursor-pointer shrink-0"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label="Toggle Sidebar"
            >
              {sidebarCollapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
            </button>
          </div>

          {/* Scrollable Navigation List */}
          <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar">
            {renderNavList(false)}
          </div>

          {/* Sidebar Bottom Footer: Admin User & Public Site Link */}
          <div className="p-3 border-t border-white/[0.08] bg-[#07070a]/90 space-y-2">
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="relative shrink-0">
                <img
                  src={
                    user?.photoURL ||
                    'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=admin'
                  }
                  alt="Admin"
                  className="w-7 h-7 rounded-lg object-cover border border-white/10"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#09090d]" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-white truncate font-display">
                    {user?.displayName || 'Admin'}
                  </span>
                  <span className="text-[9px] font-mono text-fivem-orange font-bold uppercase tracking-wider leading-none">
                    Staff
                  </span>
                </div>
              )}
            </div>

            {/* Back to Public Site Action */}
            <button
              type="button"
              onClick={onNavigateHome}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer group/back",
                sidebarCollapsed && "px-1.5"
              )}
              title="Return to Public Contest"
            >
              <ArrowLeft size={13} className="group-hover/back:-translate-x-0.5 transition-transform" />
              {!sidebarCollapsed && <span>Public Contest</span>}
            </button>
          </div>
        </aside>

        {/* ── MOBILE DRAWER (Sheet) ── */}
        <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <SheetContent side="left" className="w-72 p-0 flex flex-col bg-[#09090d] border-white/10">
            {/* Header */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <img
                  src="https://r2.fivemanage.com/image/qePVNvTsc65p.png"
                  alt="Vital RP"
                  className="w-8 h-8 rounded-xl object-contain"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-black font-display text-white uppercase tracking-wider">
                    Vital RP Contest
                  </span>
                  <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
                    Staff Portal
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation items */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {renderNavList(true)}
            </div>

            {/* Mobile Drawer Footer */}
            <div className="p-4 border-t border-white/[0.08] bg-[#07070a]">
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onNavigateHome();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white text-xs font-display font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Return to Public Contest</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {/* ── MAIN DASHBOARD STAGE ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* ── MINIMAL TOP HEADER (AdminCN Style) ── */}
          <header className="h-16 border-b border-white/[0.08] bg-[#09090d]/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
            {/* Left: Mobile Toggle & Dynamic Breadcrumb Title */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile menu trigger button */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="md:hidden p-2 rounded-xl bg-white/[0.04] border border-white/10 text-white/70 hover:text-white cursor-pointer active:scale-95 transition-all"
                aria-label="Open Admin Menu"
              >
                <Menu size={16} />
              </button>

              {/* Breadcrumb Path */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono font-bold text-white/40 uppercase tracking-wider hidden sm:inline-block">
                  Admin Console
                </span>
                <span className="text-white/20 hidden sm:inline-block">/</span>
                <h1 className="text-sm sm:text-base font-black font-display text-white truncate capitalize">
                  {currentNavTitle}
                </h1>
              </div>
            </div>

            {/* Right: Quick Telemetry Badges & Home Shortcut */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Quick Contest Status Pill */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    activeContest ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                  )}
                />
                <span className="text-white/60 truncate max-w-[160px]">
                  {activeContest ? activeContest.name : "No Active Contest"}
                </span>
              </div>

              {/* Quick Submissions Badge */}
              <div
                className={cn(
                  "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase",
                  submissionsOpen
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                    : "bg-white/[0.04] text-white/40 border border-white/10"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    submissionsOpen ? "bg-cyan-400 animate-pulse" : "bg-zinc-500"
                  )}
                />
                <span>Uploads {submissionsOpen ? "Open" : "Closed"}</span>
              </div>

              {/* Quick Voting Badge */}
              <div
                className={cn(
                  "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase",
                  votingOpen
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : "bg-white/[0.04] text-white/40 border border-white/10"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    votingOpen ? "bg-amber-400 animate-pulse" : "bg-zinc-500"
                  )}
                />
                <span>Voting {votingOpen ? "Live" : "Paused"}</span>
              </div>

              {/* Back to Public Site Shortcut */}
              <button
                type="button"
                onClick={onNavigateHome}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-fivem-orange/15 hover:bg-fivem-orange/25 text-fivem-orange hover:text-orange-300 border border-fivem-orange/30 text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-sm"
                title="Return to Public Contest"
              >
                <Globe size={13} />
                <span className="hidden sm:inline">Back to Site</span>
              </button>

              {/* Admin Avatar Pill */}
              <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-white/15 p-0.5 bg-[#0c0c14] shrink-0">
                <img
                  src={
                    user?.photoURL ||
                    'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=admin'
                  }
                  alt="Admin"
                  className="w-full h-full rounded-lg object-cover"
                />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#09090d]" />
              </div>
            </div>
          </header>

          {/* ── DYNAMIC TAB STAGE WITH FAST SPRING TRANSITIONS ── */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
            <div className="max-w-7xl mx-auto w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Embedded Tab Router rendering AdminPanel tab engine */}
                  <AdminPanel
                    isAdmin={isAdmin}
                    user={user}
                    activeContest={activeContest}
                    categories={categories}
                    allPhotos={allPhotos}
                    votingOpen={votingOpen}
                    submissionsOpen={submissionsOpen}
                    onePhotoPerUser={onePhotoPerUser}
                    showWinnersToggle={showWinnersToggle}
                    siteClosed={siteClosed}
                    censorSubmissions={censorSubmissions}
                    publicKey={publicKey}
                    privateKey={privateKey}
                    rulesMarkdown={rulesMarkdown}
                    winners={winners}
                    onToggleVoting={onToggleVoting}
                    onToggleSubmissions={onToggleSubmissions}
                    onToggleOnePhotoPerUser={onToggleOnePhotoPerUser}
                    onToggleShowWinners={onToggleShowWinners}
                    onToggleSiteClosed={onToggleSiteClosed}
                    onToggleCensorSubmissions={onToggleCensorSubmissions}
                    onGenerateKeys={onGenerateKeys}
                    onToggleReveal={onToggleReveal}
                    onDownloadWinners={onDownloadWinners}
                    onDeletePhoto={onDeletePhoto}
                    onToggleDisqualifyPhoto={onToggleDisqualifyPhoto}
                    onResetVotes={onResetVotes}
                    onOpenAnalytics={() => onNavigateTab('analytics')}
                    isFullPage={true}
                    initialTab={currentTab}
                    onTabChange={onNavigateTab}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
