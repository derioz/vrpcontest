import React from 'react';
import { motion } from 'motion/react';
import { Menu } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  type NavItem,
} from './ui/resizable-navbar';

interface SiteHeaderProps {
  items: NavItem[];
  activeId?: string | null;
  logoUrl: string;
  isAuthLoading: boolean;
  signedIn: boolean;
  displayName?: string;
  avatarSrc?: string;
  avatarFallback?: string;
  onProfile: () => void;
  onSignIn: () => void;
  onOpenMenu: () => void;
  onLogoClick: () => void;
  logoSpinning?: boolean;
  /** Scroll distance (px) at which the bar contracts into a pill. */
  compactAfter?: number;
}

/**
 * Site header: flat at the top of the page, a floating glass pill once scrolled.
 * Built on the resizable navbar primitives in ui/resizable-navbar.
 */
export function SiteHeader({
  items,
  activeId,
  logoUrl,
  isAuthLoading,
  signedIn,
  displayName,
  avatarSrc,
  avatarFallback,
  onProfile,
  onSignIn,
  onOpenMenu,
  onLogoClick,
  logoSpinning,
  compactAfter,
}: SiteHeaderProps) {
  const brand = (
    <button
      id="easter-egg-orb"
      type="button"
      onClick={onLogoClick}
      className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-full py-1 pl-1.5 pr-3 transition-opacity hover:opacity-80"
      aria-label="Vital RP"
    >
      <motion.img
        src={logoUrl}
        alt=""
        className="h-6 w-6 object-contain"
        animate={logoSpinning ? { rotate: [0, 360], scale: [1, 1.2, 1] } : {}}
        transition={logoSpinning ? { duration: 0.6, ease: 'easeInOut' } : {}}
      />
      <span className="font-display text-[13px] font-bold uppercase tracking-[0.22em] text-white">
        Vital <span className="text-fivem-orange">RP</span>
      </span>
    </button>
  );

  const account = isAuthLoading ? (
    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
  ) : signedIn ? (
    <button
      type="button"
      onClick={onProfile}
      title={`Signed in as ${displayName || 'User'}`}
      aria-label="Open account menu"
      className="h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-full ring-1 ring-white/15 transition-shadow hover:ring-white/40"
    >
      <img
        src={avatarSrc}
        alt=""
        onError={(e) => {
          const target = e.currentTarget;
          if (avatarFallback && target.src !== avatarFallback) target.src = avatarFallback;
        }}
        className="h-full w-full object-cover"
      />
    </button>
  ) : (
    <button
      type="button"
      onClick={onSignIn}
      className="h-8 shrink-0 cursor-pointer rounded-full bg-fivem-orange px-4 text-xs font-semibold text-white transition-colors hover:bg-orange-500"
    >
      Sign in
    </button>
  );

  return (
    <Navbar threshold={compactAfter}>
      <NavBody>
        {brand}
        <NavItems items={items} activeId={activeId} />
        <div className="flex shrink-0 items-center gap-2.5">{account}</div>
      </NavBody>

      <MobileNav>
        <MobileNavHeader>
          {brand}
          <div className="flex items-center gap-2.5">
            {account}
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label="Open menu"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/[0.07] hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </MobileNavHeader>
      </MobileNav>
    </Navbar>
  );
}

export default SiteHeader;
