import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Lock, Unlock, Trophy, Shield, Sparkles, LogIn, LogOut,
  ChevronRight, ArrowRight, Eye, User, ShieldCheck, CheckCircle2,
  Clock, Flame
} from 'lucide-react';
import { Ripple } from './ui/ripple';
import { SparklesText } from './ui/sparkles-text';
import { AnimatedShinyText } from './ui/animated-shiny-text';
import { getProfileAvatar } from '../lib/dicebear';
import { cn } from '../lib/utils';

interface ContestClosedModalProps {
  isAdmin: boolean;
  user: any;
  adminBypass: boolean;
  onToggleAdminBypass: (bypass: boolean) => void;
  onOpenHallOfFame: () => void;
  onOpenSignIn: () => void;
  onSignOut: () => void;
  onOpenAdminPanel?: () => void;
}

export function ContestClosedModal({
  isAdmin,
  user,
  adminBypass,
  onToggleAdminBypass,
  onOpenHallOfFame,
  onOpenSignIn,
  onSignOut,
  onOpenAdminPanel
}: ContestClosedModalProps) {
  const [isWiggling, setIsWiggling] = useState(false);
  const userAvatar = user ? getProfileAvatar(user) : null;
  const userDisplayName = user?.displayName || user?.user_metadata?.custom_display_name || user?.user_metadata?.full_name || 'Verified Member';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-2xl sm:backdrop-blur-3xl animate-in fade-in duration-300">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[750px] h-[600px] sm:h-[750px] bg-gradient-to-tr from-fivem-orange/20 via-amber-500/10 to-transparent rounded-full blur-[100px] opacity-70" />
      </div>

      {/* Modal Outer Container with Sleek Gradient Frame (No BorderBeam) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="relative w-full max-w-xl rounded-3xl p-[1px] bg-gradient-to-b from-fivem-orange/60 via-white/[0.12] to-white/[0.04] shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_60px_rgba(234,88,12,0.18)] my-auto"
      >
        {/* Inner Dark Frosted Glass Surface */}
        <div className="relative w-full rounded-[23px] bg-[#09090e]/95 backdrop-blur-3xl p-6 sm:p-8 overflow-hidden">
          {/* Top subtle highlight reflection line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-fivem-orange/80 to-transparent" />

          {/* Floating background ripple behind lock */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 pointer-events-none opacity-35">
            <Ripple mainCircleSize={120} numCircles={4} mainCircleOpacity={0.2} />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Brand Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-fivem-orange/30 bg-fivem-orange/10 backdrop-blur-md px-4 py-1.5 text-xs font-semibold tracking-wider text-fivem-orange uppercase mb-5 shadow-[0_0_20px_rgba(234,88,12,0.2)]">
              <Lock size={13} className="text-fivem-orange animate-pulse" />
              <span className="font-display font-black tracking-[0.15em] text-white">
                VITAL <span className="text-fivem-orange">RP</span>
              </span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span className="text-[10px] text-white/70 font-mono">PHOTO CONTEST</span>
            </div>

            {/* Lock Icon Centerpiece */}
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-fivem-orange/20 to-black/70 border border-fivem-orange/40 flex items-center justify-center shadow-[0_0_35px_rgba(234,88,12,0.3)] relative group">
                <div className="absolute inset-0 rounded-2xl bg-fivem-orange/15 animate-ping opacity-25 pointer-events-none" />
                <Lock size={36} className="text-fivem-orange drop-shadow-[0_0_12px_rgba(234,88,12,0.6)]" />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#09090e] border border-amber-500/40 text-amber-400 shadow-md">
                <Sparkles size={14} />
              </div>
            </div>

            {/* Heading */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display text-white tracking-tight mb-3">
              Contest is{' '}
              <span className="bg-gradient-to-r from-fivem-orange via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                Closed
              </span>
            </h2>

            {/* Description */}
            <p className="text-sm sm:text-base text-white/60 leading-relaxed max-w-md mb-6">
              The current photo contest round has concluded. You can explore past champions in the Hall of Fame, or log in if you are an administrator.
            </p>

            {/* Next Contest Notice Box */}
            <div className="w-full rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-3.5 text-left flex items-start gap-3 mb-6 shadow-inner">
              <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
                <Clock size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-200 mb-0.5 flex items-center gap-1.5">
                  <span>Next Contest In Preparation</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                </p>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Our team is actively working on the upcoming contest round. Please stay tuned and be patient while we get things ready!
                </p>
              </div>
            </div>

            {/* Action Area */}
            <div className="w-full space-y-3 mb-6">
              {/* Primary CTA: Hall of Fame */}
              <button
                onClick={onOpenHallOfFame}
                className="w-full relative group overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border border-amber-400/40 hover:border-amber-400/80 transition-all duration-300 cursor-pointer shadow-[0_0_25px_rgba(245,158,11,0.15)] hover:shadow-[0_0_35px_rgba(245,158,11,0.3)] text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400/30 to-amber-600/20 border border-amber-400/50 text-amber-300 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <Trophy size={22} className="text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black font-display uppercase tracking-wider text-amber-200 group-hover:text-amber-100">
                        Explore Hall of Fame
                      </span>
                      <Sparkles size={13} className="text-amber-400 animate-pulse" />
                    </div>
                    <p className="text-xs text-white/50 line-clamp-1">
                      Browse winning shots & historic contest archives
                    </p>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-300 group-hover:translate-x-1 transition-transform">
                  <ArrowRight size={18} />
                </div>
              </button>

              {/* Login CTA (if not logged in) */}
              {!user && (
                <button
                  onClick={onOpenSignIn}
                  className="w-full py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer text-xs font-bold font-display uppercase tracking-wider text-white/80 hover:text-white flex items-center justify-center gap-2"
                >
                  <LogIn size={15} className="text-fivem-orange" />
                  <span>Admin Sign In</span>
                </button>
              )}

              {/* Signed-in Non-Admin Member Subtle Card */}
              {user && !isAdmin && (
                <div className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={userAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(userDisplayName)}`}
                      alt="User Avatar"
                      className="w-6 h-6 rounded-full border border-white/20 object-cover shrink-0"
                    />
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-medium text-white/70 truncate max-w-[150px] sm:max-w-[200px]">
                        {userDisplayName}
                      </span>
                      <span className="text-[9px] font-mono text-white/35 bg-white/5 px-1.5 py-0.2 rounded border border-white/10">
                        Member
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={onSignOut}
                    className="text-[10px] text-white/30 hover:text-white/70 font-mono transition-colors hover:underline cursor-pointer ml-2 shrink-0"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Admin Controls Box (Visible ONLY when isAdmin is true) */}
            {isAdmin && (
              <div className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4 text-left space-y-3 mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span className="text-xs font-bold font-display uppercase tracking-wider text-emerald-400">
                      Administrator Detected
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full uppercase font-bold">
                    Admin Access
                  </span>
                </div>
                <p className="text-xs text-white/60">
                  You are authenticated as an administrator. You can bypass this lock screen to view the live platform or open the Admin Console.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <button
                    onClick={() => onToggleAdminBypass(true)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5"
                  >
                    <Unlock size={14} />
                    <span>Bypass Lock & Enter Site</span>
                  </button>
                  {onOpenAdminPanel && (
                    <button
                      onClick={() => {
                        onToggleAdminBypass(true);
                        onOpenAdminPanel();
                      }}
                      className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Shield size={14} className="text-fivem-orange" />
                      <span>Open Admin Console</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Simple Creator Credit with Easter Egg Wiggle */}
            <div className="pt-4 border-t border-white/[0.08] w-full flex items-center justify-center">
              <button
                type="button"
                onClick={() => setIsWiggling(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md px-3.5 py-1.5 transition-all duration-300 group cursor-pointer select-none"
              >
                <motion.img
                  src="https://r2.fivemanage.com/image/qePVNvTsc65p.png"
                  alt="Damon"
                  className="w-5 h-5 rounded-full object-cover ring-1 ring-white/20 shrink-0"
                  animate={isWiggling ? {
                    rotate: [0, -18, 18, -14, 14, -8, 8, 0],
                    scale: [1, 1.25, 1.25, 1.2, 1],
                  } : {}}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  onAnimationComplete={() => setIsWiggling(false)}
                />
                <span className="text-[11px] font-mono text-white/50 group-hover:text-white/80 transition-colors">
                  Created by <strong className="text-fivem-orange font-bold">Damon</strong>
                </span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default ContestClosedModal;
