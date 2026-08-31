"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  ArrowLeft,
  Globe,
  ChevronDown,
  Home,
  Check,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getProfileAvatar } from '../../lib/dicebear';
import { Category, Photo } from '../../types';
import { Skeleton } from '../ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';

// Embedded Tab Router rendering AdminPanel tab engine
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
  onGenerateKeys: () => void;
  onToggleReveal: (reveal: boolean) => void;
  onDownloadWinners: () => void;
  onDeletePhoto: (photoId: string, discordName: string) => void;
  onToggleDisqualifyPhoto?: (photoId: string, disqualify: boolean, reason?: string) => void;
  onResetVotes?: () => void;
  onOpenAnalytics?: () => void;
}

interface AdminSubCategory {
  id: AdminRouteTab;
  label: string;
  description: string;
  icon: React.ElementType;
  isDanger?: boolean;
}

interface AdminNavCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  directTab?: AdminRouteTab;
  subsections?: AdminSubCategory[];
}

const ADMIN_NAV_CATEGORIES: AdminNavCategory[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    directTab: 'dashboard',
  },
  {
    id: 'submissions',
    label: 'Submissions',
    icon: ImageIcon,
    directTab: 'submissions',
  },
  {
    id: 'contest',
    label: 'Contest',
    icon: Trophy,
    subsections: [
      {
        id: 'contest',
        label: 'Contest Setup',
        description: 'Schedule, presets, rules & archiving',
        icon: Trophy,
      },
      {
        id: 'controls',
        label: 'Controls & Security',
        description: 'Gate locks, 1-photo toggle & RSA encryption',
        icon: Zap,
      },
    ],
  },
  {
    id: 'suggestions',
    label: 'Category Suggestions',
    icon: Sparkles,
    directTab: 'suggestions',
  },
  {
    id: 'audits',
    label: 'Audits & Analytics',
    icon: BarChart3,
    subsections: [
      {
        id: 'analytics',
        label: 'Analytics & Graphs',
        description: 'Live telemetry, voting velocity & traffic',
        icon: BarChart3,
      },
      {
        id: 'voters',
        label: 'Voter Audit',
        description: 'Voter directory, alt blacklist & moderation',
        icon: UserCheck,
      },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    icon: Layers,
    subsections: [
      {
        id: 'changelogs',
        label: 'Changelog',
        description: 'Platform version history & release logger',
        icon: Layers,
      },
      {
        id: 'danger',
        label: 'Danger Zone',
        description: 'Vote reset, wipe data & test cleanup',
        icon: AlertCircle,
        isDanger: true,
      },
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

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const headerRef = useRef<HTMLElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Desktop intentional hover timers
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Touch tracking for swipe vs tap discrimination on mobile
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isSwipingRef = useRef<boolean>(false);

  const isDesktop = () => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768 && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  };

  // Monitor scroll for smooth backdrop blur interpolation
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Click-outside and Escape key dismissal for open dropdowns (desktop and mobile touch)
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        headerRef.current &&
        !headerRef.current.contains(target) &&
        (!mobileMenuRef.current || !mobileMenuRef.current.contains(target))
      ) {
        if (openTimerRef.current) clearTimeout(openTimerRef.current);
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        setOpenDropdownId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (openTimerRef.current) clearTimeout(openTimerRef.current);
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Determine active category and active sub-item
  const activeCategory = ADMIN_NAV_CATEGORIES.find((cat) => {
    if (cat.directTab) return currentTab === cat.directTab;
    if (cat.subsections) return cat.subsections.some((sub) => sub.id === currentTab);
    return false;
  }) || ADMIN_NAV_CATEGORIES[0];

  const activeSubItem = activeCategory.subsections?.find((sub) => sub.id === currentTab);
  const openCategory = ADMIN_NAV_CATEGORIES.find((cat) => cat.id === openDropdownId);

  // Smoothly center active category item in mobile scroll container
  useEffect(() => {
    if (navContainerRef.current) {
      const activeEl = navContainerRef.current.querySelector<HTMLElement>(`[data-category-id="${activeCategory.id}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeCategory.id]);

  // ── DESKTOP HOVER BEHAVIOR ──
  const handleCategoryMouseEnter = (category: AdminNavCategory) => {
    if (!isDesktop()) return;

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setHoveredCategoryId(category.id);

    if (category.subsections) {
      if (openDropdownId !== null && openDropdownId !== category.id) {
        // Submenu is ALREADY open + hover another category with submenu -> switch immediately (0ms delay)
        if (openTimerRef.current) clearTimeout(openTimerRef.current);
        setOpenDropdownId(category.id);
      } else if (openDropdownId === null) {
        // No submenu open + hover category -> intentional short delay (180ms)
        if (openTimerRef.current) clearTimeout(openTimerRef.current);
        openTimerRef.current = setTimeout(() => {
          setOpenDropdownId(category.id);
        }, 180);
      }
    } else {
      // Category without submenu (Overview, Submissions)
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (openDropdownId !== null) {
        closeTimerRef.current = setTimeout(() => {
          setOpenDropdownId(null);
        }, 150);
      }
    }
  };

  const handleCategoryMouseLeave = (category: AdminNavCategory) => {
    if (!isDesktop()) return;

    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }

    setHoveredCategoryId(null);

    if (openDropdownId === category.id) {
      // Moving mouse away from category trigger -> short close delay (180ms)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => {
        setOpenDropdownId(null);
      }, 180);
    }
  };

  const handleSubmenuMouseEnter = () => {
    if (!isDesktop()) return;
    // Moving cursor into the submenu keeps it open
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  };

  const handleSubmenuMouseLeave = () => {
    if (!isDesktop()) return;
    // Moving cursor out of the submenu closes it after short delay (180ms)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setOpenDropdownId(null);
    }, 180);
  };

  const handleCategoryClick = (category: AdminNavCategory) => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

    if (isSwipingRef.current) {
      isSwipingRef.current = false;
      return;
    }

    if (category.directTab) {
      onNavigateTab(category.directTab);
      setOpenDropdownId(null);
    } else if (category.subsections) {
      setOpenDropdownId((prev) => (prev === category.id ? null : category.id));
    }
  };

  const handleSubItemClick = (tabId: AdminRouteTab) => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    onNavigateTab(tabId);
    setOpenDropdownId(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = Math.abs(e.touches[0].clientX - touchStartXRef.current);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartYRef.current);
    if (deltaX > 10 || deltaY > 10) {
      isSwipingRef.current = true;
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[#07070a] text-white flex flex-col antialiased selection:bg-fivem-orange selection:text-white">
      {/* ── Top Ambient Lighting Aura ── */}
      <div className="fixed top-0 left-1/3 w-[600px] h-[200px] bg-fivem-orange/10 blur-[150px] pointer-events-none z-0" />
      <div className="fixed top-1/4 right-10 w-[500px] h-[300px] bg-purple-600/5 blur-[170px] pointer-events-none z-0" />

      {/* ── STICKY TOP HEADER WITH HORIZONTAL CENTERED NAVIGATION ── */}
      <header
        ref={headerRef}
        className={cn(
          "sticky top-0 z-40 w-full max-w-full transition-all duration-300 border-b",
          isScrolled
            ? "bg-[#09090e]/90 backdrop-blur-2xl border-white/[0.12] shadow-[0_10px_35px_rgba(0,0,0,0.7)]"
            : "bg-[#09090e]/60 backdrop-blur-md border-white/[0.08]"
        )}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-18 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* ── LEFT: Brand Logo & Title ── */}
          <div
            onClick={onNavigateHome}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
            title="Return to Public Contest"
          >
            <img
              src="https://r2.fivemanage.com/image/qePVNvTsc65p.png"
              alt="Vital RP"
              className="w-8 h-8 rounded-xl object-contain drop-shadow-[0_0_12px_rgba(234,88,12,0.4)] group-hover:scale-105 transition-transform shrink-0"
            />
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="text-xs font-black font-display text-white uppercase tracking-wider truncate leading-tight group-hover:text-fivem-orange transition-colors">
                Vital RP Contest
              </span>
              <span className="text-[9px] font-mono text-fivem-orange font-bold uppercase tracking-widest leading-none mt-0.5">
                Admin Console
              </span>
            </div>
          </div>

          {/* ── CENTER: Floating Horizontal Top Navigation Dock with Mobile Touch Scroll ── */}
          <div
            ref={navContainerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            className="flex items-center justify-start md:justify-center flex-1 min-w-0 max-w-full overflow-x-auto md:overflow-visible no-scrollbar touch-pan-x py-1 px-1 relative z-50 scroll-smooth"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <nav className="flex items-center gap-1 p-1 sm:p-1.5 rounded-full bg-[#0c0c14]/90 border border-white/12 shadow-2xl backdrop-blur-2xl shrink-0 mx-auto">
              {ADMIN_NAV_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory.id === category.id;
                const isDropdownOpen = openDropdownId === category.id;
                const hasSubsections = !!category.subsections;

                // Live Submission count badge on Submissions tab
                const showSubmissionBadge = category.id === 'submissions' && allPhotos.length > 0;
                // Live Locked badge on Contest tab if site closed
                const showLockedBadge = category.id === 'contest' && siteClosed;

                return (
                  <div
                    key={category.id}
                    data-category-id={category.id}
                    className="relative shrink-0"
                    onMouseEnter={() => handleCategoryMouseEnter(category)}
                    onMouseLeave={() => handleCategoryMouseLeave(category)}
                  >
                    <button
                      type="button"
                      onClick={() => handleCategoryClick(category)}
                      className={cn(
                        "relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-display font-bold transition-all duration-200 cursor-pointer select-none outline-none whitespace-nowrap",
                        isActive
                          ? "text-white"
                          : "text-white/60 hover:text-white"
                      )}
                      aria-expanded={isDropdownOpen}
                    >
                      {/* Active Sliding Capsule Pill (Framer Motion layoutId) */}
                      {isActive && (
                        <motion.div
                          layoutId="admin-top-active-pill"
                          className="absolute inset-0 rounded-full bg-gradient-to-r from-fivem-orange/25 via-fivem-orange/15 to-orange-500/20 border border-fivem-orange/40 shadow-[0_0_16px_rgba(234,88,12,0.3)]"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}

                      {/* Hover Pill */}
                      {!isActive && hoveredCategoryId === category.id && (
                        <motion.div
                          layoutId="admin-top-hover-pill"
                          className="absolute inset-0 rounded-full bg-white/[0.06]"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                      )}

                      {/* Icon */}
                      <Icon
                        size={14}
                        className={cn(
                          "relative z-10 transition-colors shrink-0",
                          isActive ? "text-fivem-orange" : "text-white/50 group-hover:text-white"
                        )}
                      />

                      {/* Label */}
                      <span className="relative z-10 tracking-tight whitespace-nowrap">
                        {category.label}
                      </span>

                      {/* Badges */}
                      {showSubmissionBadge && (
                        <span className="relative z-10 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 leading-none">
                          {allPhotos.length}
                        </span>
                      )}

                      {showLockedBadge && (
                        <span className="relative z-10 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40 leading-none">
                          Locked
                        </span>
                      )}

                      {/* Dropdown Chevron indicator */}
                      {hasSubsections && (
                        <ChevronDown
                          size={12}
                          className={cn(
                            "relative z-10 text-white/40 transition-transform duration-200 shrink-0",
                            isDropdownOpen && "rotate-180 text-fivem-orange"
                          )}
                        />
                      )}
                    </button>

                    {/* ── DESKTOP FLOATING POPUP DROPDOWN (Enhanced Hover Interaction) ── */}
                    <AnimatePresence>
                      {hasSubsections && isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.96 }}
                          transition={{ duration: 0.16, ease: "easeOut" }}
                          className="hidden md:block absolute top-full left-1/2 -translate-x-1/2 pt-2.5 z-50 min-w-[260px]"
                          onMouseEnter={handleSubmenuMouseEnter}
                          onMouseLeave={handleSubmenuMouseLeave}
                        >
                          <div className="relative rounded-2xl bg-[#09090e]/98 backdrop-blur-2xl border border-white/15 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.85)] ring-1 ring-white/5">
                            
                            {/* Top Pointer Caret */}
                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#09090e] border-t border-l border-white/15 rotate-45" />

                            <div className="space-y-1 relative z-10">
                              {category.subsections!.map((sub) => {
                                const SubIcon = sub.icon;
                                const isSubActive = currentTab === sub.id;

                                return (
                                  <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => handleSubItemClick(sub.id)}
                                    className={cn(
                                      "w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer group",
                                      isSubActive
                                        ? sub.isDanger
                                          ? "bg-red-500/15 text-red-300 border border-red-500/30 shadow-md"
                                          : "bg-fivem-orange/15 text-white border border-fivem-orange/35 shadow-[0_0_15px_rgba(234,88,12,0.2)]"
                                        : sub.isDanger
                                          ? "hover:bg-red-500/10 text-red-400/80 hover:text-red-300 border border-transparent"
                                          : "hover:bg-white/[0.05] text-white/70 hover:text-white border border-transparent"
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-105",
                                        isSubActive
                                          ? sub.isDanger
                                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                            : "bg-fivem-orange/20 text-fivem-orange border border-fivem-orange/30"
                                          : "bg-white/[0.04] text-white/50 border border-white/10 group-hover:text-white"
                                      )}
                                    >
                                      <SubIcon size={15} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="text-xs font-bold font-display tracking-tight truncate">
                                          {sub.label}
                                        </span>
                                        {isSubActive && (
                                          <Check size={13} className={sub.isDanger ? "text-red-400" : "text-fivem-orange"} />
                                        )}
                                      </div>
                                      <p className="text-[10px] text-white/40 leading-snug line-clamp-1 mt-0.5 font-sans">
                                        {sub.description}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* ── RIGHT: Live Telemetry Badges, User Pill & Back Button ── */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Back to Public Site */}
            <button
              type="button"
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-fivem-orange/15 hover:bg-fivem-orange/25 text-fivem-orange hover:text-orange-300 border border-fivem-orange/30 text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Return to Public Contest"
            >
              <Globe size={13} />
              <span className="hidden sm:inline">Back to Site</span>
            </button>

            {/* Admin Avatar with Skeleton State */}
            {isAuthLoading ? (
              <Skeleton className="w-8 h-8 rounded-xl bg-white/10 shrink-0" />
            ) : (
              <div
                className="relative w-8 h-8 rounded-xl overflow-hidden border border-white/15 p-0.5 bg-[#0c0c14] shrink-0"
                title={`Signed in as ${user?.displayName || 'Admin'}`}
              >
                <img
                  src={
                    getProfileAvatar(
                      user?.photoURL,
                      user?.avatarSeed || user?.uid || 'admin',
                      user?.avatarStyle,
                      user?.avatarSource,
                      user?.discordPhotoURL
                    )
                  }
                  alt="Admin"
                  className="w-full h-full rounded-lg object-cover"
                />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#09090d]" />
              </div>
            )}
          </div>

        </div>

        {/* ── MOBILE SUBMENU POPUP (Unclipped & Positioned Directly Below Header) ── */}
        <AnimatePresence>
          {openCategory?.subsections && openDropdownId && (
            <div
              ref={mobileMenuRef}
              className="md:hidden fixed top-[74px] left-0 right-0 z-[100] px-3 flex justify-center pointer-events-auto"
            >
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="w-full max-w-sm rounded-2xl bg-[#09090e]/98 backdrop-blur-2xl border border-white/15 p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] ring-1 ring-white/10"
              >
                <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-white/[0.08]">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-fivem-orange flex items-center gap-1.5">
                    {openCategory.label} Menu
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenDropdownId(null)}
                    className="p-1 rounded-lg text-white/40 hover:text-white bg-white/[0.04] active:scale-95 transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>

                <div className="space-y-1">
                  {openCategory.subsections.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = currentTab === sub.id;

                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSubItemClick(sub.id)}
                        className={cn(
                          "w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer group active:scale-[0.98]",
                          isSubActive
                            ? sub.isDanger
                              ? "bg-red-500/15 text-red-300 border border-red-500/30 shadow-md"
                              : "bg-fivem-orange/15 text-white border border-fivem-orange/35 shadow-[0_0_15px_rgba(234,88,12,0.2)]"
                            : sub.isDanger
                              ? "hover:bg-red-500/10 text-red-400/80 hover:text-red-300 border border-transparent"
                              : "hover:bg-white/[0.05] text-white/70 hover:text-white border border-transparent"
                        )}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-transform",
                            isSubActive
                              ? sub.isDanger
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : "bg-fivem-orange/20 text-fivem-orange border border-fivem-orange/30"
                              : "bg-white/[0.04] text-white/50 border border-white/10"
                          )}
                        >
                          <SubIcon size={15} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold font-display tracking-tight truncate">
                              {sub.label}
                            </span>
                            {isSubActive && (
                              <Check size={13} className={sub.isDanger ? "text-red-400" : "text-fivem-orange"} />
                            )}
                          </div>
                          <p className="text-[10px] text-white/40 leading-snug line-clamp-1 mt-0.5 font-sans">
                            {sub.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </header>

      {/* ── MAIN STAGE ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* ── BREADCRUMB INTEGRATION UNDER TOP NAV ── */}
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={onNavigateHome}
                  className="cursor-pointer text-white/40 hover:text-fivem-orange transition-colors flex items-center gap-1.5 text-xs font-mono"
                  title="Return to Public Site"
                >
                  <Home size={12} className="text-white/40" />
                  <span>Vital RP</span>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => onNavigateTab('dashboard')}
                  className={cn(
                    "cursor-pointer text-xs font-mono transition-colors",
                    currentTab === 'dashboard'
                      ? "text-fivem-orange font-bold pointer-events-none"
                      : "text-white/50 hover:text-white"
                  )}
                >
                  Admin Console
                </BreadcrumbLink>
              </BreadcrumbItem>

              {/* Parent Category if not dashboard */}
              {currentTab !== 'dashboard' && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      onClick={() => {
                        if (activeCategory.directTab) {
                          onNavigateTab(activeCategory.directTab);
                        } else if (activeCategory.subsections && activeCategory.subsections.length > 0) {
                          onNavigateTab(activeCategory.subsections[0].id);
                        }
                      }}
                      className={cn(
                        "cursor-pointer text-xs font-mono transition-colors",
                        !activeSubItem ? "text-fivem-orange font-bold pointer-events-none" : "text-white/50 hover:text-white"
                      )}
                    >
                      {activeCategory.label}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}

              {/* Sub-item Page if inside a subsection */}
              {activeSubItem && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-xs sm:text-sm font-bold text-white font-display tracking-tight">
                      {activeSubItem.label}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Quick Category Indicator Pill */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-white/30 uppercase tracking-widest">
            <span>Section:</span>
            <span className="text-fivem-orange font-bold">{activeSubItem?.label || activeCategory.label}</span>
          </div>
        </div>

        {/* ── TAB VIEW ROUTER WITH FAST TRANSITIONS ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
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
      </main>
    </div>
  );
}

export default AdminDashboardPage;
