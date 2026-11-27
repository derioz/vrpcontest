"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, Image as ImageIcon, Trophy, Clock, SlidersHorizontal, Lightbulb,
  UserCheck, BarChart3, History, TriangleAlert, ArrowLeft, Menu, Search,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getProfileAvatar } from '../../lib/dicebear';
import { Category, Photo } from '../../types';
import { VITAL_RP_LOGO_URL } from '../../config';
import { Sheet, SheetContent, SheetTitle } from '../ui/sheet';
import AdminPanel from './AdminPanel';
import { CommandMenu, Command } from './CommandMenu';
import { ConfirmProvider } from './confirm';

export type AdminRouteTab =
  | 'dashboard'
  | 'analytics'
  | 'submissions'
  | 'suggestions'
  | 'voters'
  | 'contest'
  | 'countdown'
  | 'controls'
  | 'changelogs'
  | 'danger';

export interface AdminDashboardPageProps {
  currentTab: AdminRouteTab;
  onNavigateTab: (tab: AdminRouteTab) => void;
  onNavigateHome: () => void;
  isAdmin: boolean;
  isAuthLoading?: boolean;
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
  categorySuggestionMode?: boolean;
  onToggleCategorySuggestionMode?: (enabled: boolean) => void;
  onGenerateKeys: (confirmed?: boolean) => void;
  onToggleReveal: (reveal: boolean) => void;
  onDownloadWinners: () => void;
  onDeletePhoto: (photoId: string, discordName: string, confirmed?: boolean) => void;
  onToggleDisqualifyPhoto?: (photoId: string, disqualify: boolean, reason?: string) => void;
  onResetVotes?: () => void;
  onOpenAnalytics?: () => void;
}

/** Words that should find a screen in the command menu. */
const FIND_BY: Partial<Record<AdminRouteTab, string>> = {
  dashboard: 'home status bug reports',
  submissions: 'entries photos disqualify delete download',
  voters: 'votes audit reconcile fraud',
  analytics: 'charts statistics',
  contest: 'categories rules archive winners pause new restore',
  countdown: 'timer deadline clock',
  controls: 'submissions voting open close lock encryption keys reveal pixelate winners',
  suggestions: 'ideas proposals',
  changelogs: 'releases updates history',
  danger: 'reset votes archive',
};

interface NavItem {
  id: AdminRouteTab;
  label: string;
  icon: React.ElementType;
}

// Every destination is visible at once, so any screen is one click away.
const NAV: { section?: string; items: NavItem[] }[] = [
  {
    items: [
      { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      { id: 'submissions', label: 'Submissions', icon: ImageIcon },
      { id: 'voters', label: 'Voter audit', icon: UserCheck },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    section: 'Contest',
    items: [
      { id: 'contest', label: 'Setup', icon: Trophy },
      { id: 'countdown', label: 'Countdown', icon: Clock },
      { id: 'controls', label: 'Controls', icon: SlidersHorizontal },
      { id: 'suggestions', label: 'Category suggestions', icon: Lightbulb },
    ],
  },
  {
    section: 'Platform',
    items: [
      { id: 'changelogs', label: 'Changelog', icon: History },
      { id: 'danger', label: 'Danger zone', icon: TriangleAlert },
    ],
  },
];

export function AdminDashboardPage(props: AdminDashboardPageProps) {
  const {
    currentTab = 'dashboard',
    onNavigateTab,
    onNavigateHome,
    isAdmin,
    isAuthLoading = false,
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
    categorySuggestionMode = false,
    onToggleCategorySuggestionMode,
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

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const current = NAV.flatMap((g) => g.items).find((i) => i.id === currentTab);

  const goTo = (tab: AdminRouteTab) => {
    setIsMenuOpen(false);
    onNavigateTab(tab);
    window.scrollTo(0, 0);
  };

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [entryToOpen, setEntryToOpen] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsMenuOpen(false);
        setIsSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const commands: Command[] = [
    ...NAV.flatMap((g) => g.items).map((item) => ({
      id: item.id,
      group: 'Go to',
      label: item.label,
      keywords: FIND_BY[item.id],
      icon: item.icon,
      run: () => goTo(item.id),
    })),
    { id: 'site', group: 'Go to', label: 'Back to site', keywords: 'public home exit', icon: ArrowLeft, run: onNavigateHome },
  ];
  const categoryNames = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const categoryName = useCallback((id: string) => categoryNames.get(id) || 'No category', [categoryNames]);
  const openEntry = (photoId: string) => {
    setEntryToOpen(photoId);
    goTo('submissions');
  };
  const clearEntry = useCallback(() => setEntryToOpen(null), []);

  const brand = (
    <div className="flex items-center gap-2.5">
      <img src={VITAL_RP_LOGO_URL} alt="Vital RP" className="h-7 w-7 object-contain" />
      <span className="whitespace-nowrap text-sm font-bold font-display text-white">Contest admin</span>
    </div>
  );

  const searchButton = (
    <button
      type="button"
      onClick={() => { setIsMenuOpen(false); setIsSearchOpen(true); }}
      className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-md border border-white/10 px-2.5 text-sm text-white/55 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-2 focus-visible:outline-fivem-orange"
    >
      <Search size={15} aria-hidden="true" />
      <span className="flex-1 text-left">Search</span>
      <kbd className="font-sans text-xs text-white/45">Ctrl K</kbd>
    </button>
  );

  const navigation = (
    <nav aria-label="Admin" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 py-3">
      {NAV.map((group, i) => (
        <div key={group.section || i}>
          {group.section && <p className="px-2.5 pb-1 text-xs font-medium text-white/45">{group.section}</p>}
          <ul className="space-y-0.5">
            {group.items.map(({ id, label, icon: Icon }) => {
              const active = currentTab === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => goTo(id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-fivem-orange',
                      active ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/[0.05] hover:text-white',
                    )}
                  >
                    <Icon size={16} aria-hidden="true" className={cn(active && 'text-fivem-orange')} />
                    <span className="flex-1 truncate text-left">{label}</span>
                    {id === 'submissions' && allPhotos.length > 0 && (
                      <span className="text-xs tabular-nums text-white/50">{allPhotos.length}</span>
                    )}
                    {id === 'controls' && siteClosed && <span className="text-xs font-semibold text-red-300">Locked</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-white/10 p-2">
      <button
        type="button"
        onClick={onNavigateHome}
        className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:outline-2 focus-visible:outline-fivem-orange"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to site
      </button>
      {!isAuthLoading && (
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <img
            src={getProfileAvatar(user?.photoURL, user?.avatarSeed || user?.uid || 'admin', user?.avatarStyle, user?.avatarSource, user?.discordPhotoURL)}
            alt=""
            className="h-6 w-6 rounded-full object-cover"
          />
          <span className="truncate text-xs text-white/60">{user?.displayName || 'Admin'}</span>
        </div>
      )}
    </div>
  );

  return (
    <ConfirmProvider>
    <div className="min-h-screen w-full bg-[#07070a] text-white antialiased selection:bg-fivem-orange selection:text-white lg:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-[#09090d] lg:flex">
        <div className="flex h-14 shrink-0 items-center border-b border-white/10 px-4">{brand}</div>
        <div className="px-2 pt-3">{searchButton}</div>
        {navigation}
        {account}
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-white/10 bg-[#09090d] px-4 lg:hidden">
        {brand}
        <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          aria-label="Search"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-white/15 text-white/85"
        >
          <Search size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          aria-label={`Menu, current page ${current?.label || 'Overview'}`}
          className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-white/15 px-3 text-sm font-medium text-white/85"
        >
          <Menu size={16} aria-hidden="true" />
          <span className="max-w-24 truncate sm:max-w-48">{current?.label || 'Menu'}</span>
        </button>
        </div>
      </header>

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="left" className="flex w-72 flex-col gap-0 bg-[#09090d] p-0 sm:w-72 md:w-72">
          <div className="flex h-14 shrink-0 items-center border-b border-white/10 px-4">
            <SheetTitle className="sr-only">Admin menu</SheetTitle>
            {brand}
          </div>
          {navigation}
          {account}
        </SheetContent>
      </Sheet>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
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
            categorySuggestionMode={categorySuggestionMode}
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
            onToggleCategorySuggestionMode={onToggleCategorySuggestionMode}
            onGenerateKeys={onGenerateKeys}
            onToggleReveal={onToggleReveal}
            onDownloadWinners={onDownloadWinners}
            onDeletePhoto={onDeletePhoto}
            onToggleDisqualifyPhoto={onToggleDisqualifyPhoto}
            onResetVotes={onResetVotes}
              initialTab={currentTab}
            onTabChange={onNavigateTab}
          openEntryId={entryToOpen}
          onEntryOpened={clearEntry}
          />
        </div>
      </main>

      <CommandMenu
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        commands={commands}
        photos={allPhotos}
        categoryName={categoryName}
        onOpenEntry={openEntry}
      />
    </div>
    </ConfirmProvider>
  );
}

export default AdminDashboardPage;
