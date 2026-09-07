import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Sparkles,
  ShieldCheck,
  LogIn,
  LogOut,
  ChevronDown,
  Menu,
  X,
  ExternalLink,
  ArrowLeft,
  Plus,
  CheckCircle2,
  User as UserIcon,
  Settings,
  Layers,
  Award
} from 'lucide-react';
import { VITAL_RP_LOGO_URL, SITE_CONFIG } from '../config';
import { UserAvatar } from './ui/UserAvatar';
import { cn } from '../lib/utils';

export interface SiteNavbarProps {
  currentUser?: any | null;
  isAdmin: boolean;
  isStandalonePage?: boolean;
  activeNav?: string;
  onOpenSuggestModal?: () => void;
  onClose?: () => void;
  onOpenSignIn: () => void;
  onNavigateAdmin?: () => void;
  onOpenProfile?: () => void;
  onSignOut?: () => void;
  className?: string;
}

/**
 * SiteNavbar
 * Modern, floating navigation experience inspired by shadcn Navigation Menu and Aceternity Floating Navbar.
 * Supports smooth hide-on-scroll-down / reveal-on-scroll-up, mode-aware routes,
 * integrated user profile capsule with accessible dropdown, and dedicated mobile layout.
 */
export function SiteNavbar({
  currentUser,
  isAdmin,
  isStandalonePage = true,
  activeNav = 'category-voting',
  onOpenSuggestModal,
  onClose,
  onOpenSignIn,
  onNavigateAdmin,
  onOpenProfile,
  onSignOut,
  className
}: SiteNavbarProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const lastScrollYRef = useRef(0);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // ── Scroll Hide / Reveal Logic (Throttled via requestAnimationFrame) ──
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const delta = currentY - lastScrollYRef.current;

          setIsScrolled(currentY > 20);

          if (shouldReduceMotion) {
            setIsVisible(true);
          } else {
            // At top of page: always visible
            if (currentY < 40) {
              setIsVisible(true);
            } else if (delta > 8 && currentY > 80) {
              // Scrolling down: hide navbar
              setIsVisible(false);
              setIsProfileMenuOpen(false);
            } else if (delta < -8) {
              // Scrolling up: reveal navbar smoothly
              setIsVisible(true);
            }
          }

          lastScrollYRef.current = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [shouldReduceMotion]);

  // ── Close Profile Dropdown on Click Outside or Escape ──
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Community Member';
  const userHandle = currentUser?.discordTag || (currentUser?.email ? `@${currentUser.email.split('@')[0]}` : `@${displayName.toLowerCase().replace(/\s+/g, '')}`);

  return (
    <>
      <motion.header
        initial={shouldReduceMotion ? false : { y: -80, opacity: 0 }}
        animate={{
          y: isVisible ? 0 : -90,
          opacity: isVisible ? 1 : 0
        }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed top-2.5 sm:top-3.5 left-1/2 -translate-x-1/2 w-[calc(100%-1.25rem)] sm:w-[calc(100%-2rem)] max-w-[1440px] 2xl:max-w-[1536px] z-40",
          "rounded-2xl sm:rounded-full border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.85)]",
          "backdrop-blur-2xl transition-colors duration-300",
          isScrolled
            ? "bg-[#07070b]/92 border-white/15 shadow-[0_16px_48px_rgba(0,0,0,0.9)]"
            : "bg-[#09090e]/85 border-white/10",
          className
        )}
      >
        <div className="flex items-center justify-between h-14 sm:h-16 px-3.5 sm:px-6 lg:px-8 gap-3">
          {/* ── LEFT: Logo & Mode Identity ── */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {isStandalonePage ? (
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
                title="Vital RP Community Voting"
              >
                <img
                  src={VITAL_RP_LOGO_URL}
                  alt="Vital RP Logo"
                  width={32}
                  height={32}
                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-[0_0_8px_rgba(234,88,12,0.4)] group-hover:scale-105 transition-transform"
                />
                <div className="flex flex-col text-left leading-none">
                  <span className="text-white font-black font-display text-xs sm:text-sm tracking-wider uppercase">
                    VITAL <span className="text-fivem-orange">RP</span>
                  </span>
                  <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest hidden sm:inline-block mt-0.5">
                    Category Voting
                  </span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/80 hover:text-white text-xs font-bold font-mono transition-all cursor-pointer group"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                <span>Return to Contest</span>
              </button>
            )}
          </div>

          {/* ── CENTER: Desktop Navigation Menu ── */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-full p-1 shadow-inner">
            {/* Category Voting Destination */}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer",
                activeNav === 'category-voting'
                  ? "bg-gradient-to-r from-white/10 to-white/5 text-white border border-white/15 shadow-sm"
                  : "text-white/60 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Layers size={13} className="text-fivem-orange" />
              <span>Category Voting</span>
            </button>

            {/* Vital Discord Community Link */}
            <a
              href={SITE_CONFIG.discord.inviteUrl || "https://discord.gg/vitalrp"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-indigo-400 hover:bg-white/[0.04] transition-all"
            >
              <span>Discord</span>
              <ExternalLink size={11} className="opacity-60" />
            </a>

            {/* Admin Console Direct Link (Staff Only) */}
            {isAdmin && onNavigateAdmin && (
              <button
                type="button"
                onClick={onNavigateAdmin}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono font-bold text-fivem-orange/90 hover:text-fivem-orange hover:bg-fivem-orange/10 transition-all cursor-pointer"
              >
                <ShieldCheck size={13} />
                <span>Admin</span>
              </button>
            )}
          </nav>

          {/* ── RIGHT: Profile Capsule & Actions ── */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Primary Suggest CTA (Desktop) */}
            {onOpenSuggestModal && (
              <button
                type="button"
                onClick={onOpenSuggestModal}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-fivem-orange to-amber-500 hover:from-orange-500 hover:to-fivem-orange text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-[0_4px_14px_rgba(234,88,12,0.3)] transition-all active:scale-95"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Suggest</span>
              </button>
            )}

            {/* Integrated Profile Presentation */}
            {currentUser ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="true"
                  className={cn(
                    "flex items-center gap-2 p-1 sm:pl-1.5 sm:pr-2.5 sm:py-1 rounded-full",
                    "bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20",
                    "transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-fivem-orange/60 select-none",
                    isProfileMenuOpen && "bg-white/[0.08] border-white/25"
                  )}
                  title="Open Account Menu"
                >
                  <UserAvatar
                    userId={currentUser.uid}
                    discordId={currentUser.discordId}
                    photoURL={currentUser.photoURL}
                    discordPhotoURL={currentUser.discordPhotoURL}
                    username={currentUser.displayName}
                    size="sm"
                    showRing
                  />
                  <span className="text-xs font-bold text-white/90 max-w-[90px] sm:max-w-[120px] truncate hidden sm:inline">
                    {displayName}
                  </span>
                  <ChevronDown
                    size={13}
                    className={cn(
                      "text-white/40 transition-transform duration-200 hidden sm:inline",
                      isProfileMenuOpen && "rotate-180 text-white"
                    )}
                  />
                </button>

                {/* Profile Dropdown Menu */}
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0b0b12]/98 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl p-2 z-50 text-white"
                    >
                      {/* User Header Details */}
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 mb-1.5">
                        <UserAvatar
                          userId={currentUser.uid}
                          discordId={currentUser.discordId}
                          photoURL={currentUser.photoURL}
                          discordPhotoURL={currentUser.discordPhotoURL}
                          username={currentUser.displayName}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black font-display text-white truncate">
                            {displayName}
                          </p>
                          <p className="text-[10px] font-mono text-white/40 truncate">
                            {userHandle}
                          </p>
                          <div className="flex items-center gap-1 mt-1 text-[9px] font-mono text-emerald-400 font-bold">
                            <CheckCircle2 size={10} />
                            <span>Whitelist Approved</span>
                          </div>
                        </div>
                      </div>

                      {/* Menu Actions */}
                      <div className="space-y-0.5">
                        {onOpenProfile && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileMenuOpen(false);
                              onOpenProfile();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                          >
                            <Settings size={14} className="text-white/40" />
                            <span>Profile Settings</span>
                          </button>
                        )}

                        {isAdmin && onNavigateAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileMenuOpen(false);
                              onNavigateAdmin();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-fivem-orange hover:bg-fivem-orange/10 transition-colors text-left cursor-pointer"
                          >
                            <ShieldCheck size={14} />
                            <span>Admin Console</span>
                          </button>
                        )}

                        {onSignOut && (
                          <div className="pt-1 mt-1 border-t border-white/10">
                            <button
                              type="button"
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                onSignOut();
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                            >
                              <LogOut size={14} />
                              <span>Sign Out</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Guest Discord Sign-In Button */
              <button
                type="button"
                onClick={onOpenSignIn}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white text-xs font-bold font-mono transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <LogIn size={13} className="text-fivem-orange" />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile Menu Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
              className="md:hidden p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* ── Mobile Navigation Drawer ── */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-white/10 bg-[#07070b]/98 px-4 py-3 rounded-b-2xl space-y-2 text-white"
            >
              {onOpenSuggestModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenSuggestModal();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-fivem-orange to-amber-500 text-white text-xs font-black uppercase tracking-wider shadow-md"
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>Suggest a Category</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-white/80 hover:bg-white/5 text-left"
              >
                <Layers size={14} className="text-fivem-orange" />
                <span>Category Voting</span>
              </button>

              <a
                href={SITE_CONFIG.discord.inviteUrl || "https://discord.gg/vitalrp"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-white/80 hover:bg-white/5 text-left"
              >
                <span>Vital Discord</span>
                <ExternalLink size={12} className="opacity-50" />
              </a>

              {isAdmin && onNavigateAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onNavigateAdmin();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono font-bold text-fivem-orange hover:bg-fivem-orange/10 text-left"
                >
                  <ShieldCheck size={14} />
                  <span>Admin Console</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}

export default SiteNavbar;
