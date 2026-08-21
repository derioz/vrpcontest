"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Upload,
  Sparkles,
  Lock,
  CheckCircle2,
  Clock,
  Layers,
  Image as ImageIcon,
  FileText,
  ChevronRight,
  ChevronDown,
  Vote,
  Calendar,
  ShieldCheck,
  Flame,
  Award,
  Radio,
  ExternalLink,
  Info,
  Check,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Category, Photo, ArchivedWinner } from '../types';
import { NumberTicker } from './ui/number-ticker';
import { Skeleton } from './ui/skeleton';

export interface ContestInfoSidebarProps {
  activeContest: {
    id: string;
    name: string;
    description?: string;
    submissions_close_date?: string;
    voting_end_date?: string;
  } | null;
  votingOpen: boolean;
  submissionsOpen: boolean;
  categories: Category[];
  allPhotos: Photo[];
  user: any | null;
  currentUserPhoto: Photo | null;
  userSubmissionCount: number;
  onePhotoPerUser: boolean;
  archivedWinners: ArchivedWinner[];
  isLoading?: boolean;
  onUploadClick: () => void;
  onOpenHallOfFame: () => void;
  onSignInClick: () => void;
  onOpenRules?: () => void;
}

export const ContestInfoSidebar: React.FC<ContestInfoSidebarProps> = ({
  activeContest,
  votingOpen,
  submissionsOpen,
  categories = [],
  allPhotos = [],
  user,
  currentUserPhoto,
  userSubmissionCount = 0,
  onePhotoPerUser,
  archivedWinners = [],
  isLoading = false,
  onUploadClick,
  onOpenHallOfFame,
  onSignInClick,
  onOpenRules,
}) => {
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const hasUserSubmitted = !!currentUserPhoto || userSubmissionCount > 0;
  const totalVotes = allPhotos.reduce((sum, p) => sum + (p.vote_count || 0), 0);

  // Timeline phase states
  const phases = [
    {
      id: 1,
      title: 'Photo Submissions',
      subtitle: submissionsOpen ? 'Accepting community entries' : 'Submissions closed',
      icon: Upload,
      isActive: submissionsOpen,
      isCompleted: !submissionsOpen && (votingOpen || true),
      badge: submissionsOpen ? 'LIVE' : 'ENDED',
      badgeColor: submissionsOpen
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        : 'bg-white/10 text-white/40 border-white/10',
    },
    {
      id: 2,
      title: 'Community Voting',
      subtitle: votingOpen ? 'Live ballot open to public' : 'Awaiting submission deadline',
      icon: Vote,
      isActive: votingOpen,
      isCompleted: false,
      badge: votingOpen ? 'VOTING LIVE' : 'UPCOMING',
      badgeColor: votingOpen
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        : 'bg-white/5 text-white/30 border-white/5',
    },
  ];

  const scrollToRules = () => {
    if (onOpenRules) {
      onOpenRules();
      return;
    }
    const el = document.getElementById('rules');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <aside className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-[#09090e]/95 p-5 space-y-4 backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <Skeleton className="w-24 h-5 rounded-full" />
            <Skeleton className="w-16 h-4 rounded" />
          </div>
          <Skeleton className="w-full h-8 rounded-lg" />
          <Skeleton className="w-3/4 h-4 rounded" />
          <div className="space-y-2 pt-2">
            <Skeleton className="w-full h-14 rounded-2xl" />
            <Skeleton className="w-full h-14 rounded-2xl" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
          <Skeleton className="w-full h-12 rounded-2xl" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="sticky top-28 space-y-4 max-w-full">
      {/* ── Main Live Contest Control Center (Kokonut / 21st.dev Glass Card) ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0e0e14]/98 via-[#0a0a0f]/95 to-[#08080c]/98 p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-all">
        
        {/* Top Floating Glow Orbs */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-fivem-orange/15 blur-[65px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-amber-500/10 blur-[65px] rounded-full pointer-events-none" />

        <div className="relative z-10 space-y-5">
          
          {/* ═══ 1. LIVE EVENT HEADER ═══ */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Pulsing Status Dot & Live Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fivem-orange/15 border border-fivem-orange/35 text-fivem-orange text-[10px] font-mono font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(234,88,12,0.25)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fivem-orange opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-fivem-orange" />
                </span>
                <span>Live Round</span>
              </div>

              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-1">
                <Radio size={11} className="text-fivem-orange animate-pulse" />
                Official Event
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black font-display text-white tracking-tight leading-tight">
              {activeContest?.name || 'Vital RP Community Photo Contest'}
            </h3>

            {activeContest?.description && (
              <p className="text-xs text-white/50 leading-relaxed line-clamp-2 font-sans">
                {activeContest.description}
              </p>
            )}
          </div>

          {/* ═══ 2. CONNECTED TIMELINE / STEPPER ═══ */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-3.5 space-y-3">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">
              <span className="flex items-center gap-1.5">
                <Clock size={12} className="text-fivem-orange" />
                Event Timeline
              </span>
              <span className="text-fivem-orange flex items-center gap-1">
                <Flame size={11} /> Phase {submissionsOpen ? '1' : '2'} of 2
              </span>
            </div>

            <div className="relative pl-3 space-y-3 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
              {phases.map((phase, idx) => {
                const PhaseIcon = phase.icon;
                return (
                  <div key={phase.id} className="relative flex items-start gap-3 group">
                    {/* Stepper Dot / Icon */}
                    <div
                      className={cn(
                        "relative z-10 w-7 h-7 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-transform duration-200 group-hover:scale-105",
                        phase.isActive
                          ? "bg-gradient-to-br from-fivem-orange to-amber-500 text-white shadow-[0_0_16px_rgba(234,88,12,0.4)] ring-2 ring-fivem-orange/30"
                          : "bg-[#0f0f16] border border-white/10 text-white/40"
                      )}
                    >
                      <PhaseIcon size={13} className={phase.isActive ? "text-white" : "text-white/40"} />
                    </div>

                    {/* Phase Info & Badge */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn(
                          "text-xs font-bold font-display tracking-tight truncate",
                          phase.isActive ? "text-white" : "text-white/60"
                        )}>
                          {phase.title}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider border shrink-0",
                          phase.badgeColor
                        )}>
                          {phase.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/40 mt-0.5 font-mono truncate">
                        {phase.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══ 3. LIVE CONTEST STATISTICS (Metric Matrix) ═══ */}
          <div className="grid grid-cols-3 gap-2">
            {/* Categories Metric */}
            <div className="group rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/12 p-3 text-center transition-all duration-200">
              <div className="w-6 h-6 rounded-lg bg-fivem-orange/10 border border-fivem-orange/20 flex items-center justify-center mx-auto mb-1 text-fivem-orange group-hover:scale-110 transition-transform">
                <Layers size={13} />
              </div>
              <div className="text-base sm:text-lg font-black font-display text-white">
                <NumberTicker value={categories.length} />
              </div>
              <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider mt-0.5">
                Categories
              </div>
            </div>

            {/* Entries Metric */}
            <div className="group rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/12 p-3 text-center transition-all duration-200">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-1 text-cyan-400 group-hover:scale-110 transition-transform">
                <ImageIcon size={13} />
              </div>
              <div className="text-base sm:text-lg font-black font-display text-white">
                <NumberTicker value={allPhotos.length} />
              </div>
              <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider mt-0.5">
                Entries
              </div>
            </div>

            {/* Votes Metric */}
            <div className="group rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/12 p-3 text-center transition-all duration-200">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-1 text-amber-400 group-hover:scale-110 transition-transform">
                <Vote size={13} />
              </div>
              <div className="text-base sm:text-lg font-black font-display text-white">
                <NumberTicker value={totalVotes} />
              </div>
              <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider mt-0.5">
                Votes Cast
              </div>
            </div>
          </div>

          {/* ═══ 4. USER SUBMISSION STATUS CHIP ═══ */}
          {user && !user.isAnonymous && (
            <div
              className={cn(
                "p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-all",
                hasUserSubmitted
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                  : "bg-white/[0.02] border-white/[0.06] text-white/50"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    "w-7 h-7 rounded-xl flex items-center justify-center shrink-0",
                    hasUserSubmitted
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-white/5 text-white/30 border border-white/10"
                  )}
                >
                  {hasUserSubmitted ? <CheckCircle2 size={15} /> : <Clock size={14} />}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-xs font-bold text-white">
                    {hasUserSubmitted ? 'Your Entry is Submitted' : 'No Entry Submitted Yet'}
                  </span>
                  <span className="text-[10px] font-mono text-white/40 truncate">
                    {hasUserSubmitted
                      ? onePhotoPerUser
                        ? '1 of 1 slot active'
                        : `${userSubmissionCount} entries recorded`
                      : 'Upload your photo before time expires'}
                  </span>
                </div>
              </div>

              {hasUserSubmitted && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shrink-0">
                  Confirmed
                </span>
              )}
            </div>
          )}

          {/* ═══ 5. PRIMARY CTA: SUBMIT ENTRY ═══ */}
          <div className="pt-1">
            {user && !user.isAnonymous ? (
              <motion.button
                type="button"
                onClick={onUploadClick}
                disabled={!submissionsOpen && !(onePhotoPerUser && hasUserSubmitted)}
                whileHover={{ scale: submissionsOpen ? 1.02 : 1 }}
                whileTap={{ scale: submissionsOpen ? 0.98 : 1 }}
                className={cn(
                  "w-full group relative overflow-hidden font-display font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl",
                  submissionsOpen
                    ? "bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500 hover:from-orange-500 hover:to-fivem-orange text-white shadow-orange-500/25 hover:shadow-[0_0_30px_rgba(234,88,12,0.5)] border border-orange-400/30"
                    : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
                )}
              >
                {submissionsOpen ? (
                  <>
                    <Upload
                      size={15}
                      className="text-white shrink-0 group-hover:-translate-y-0.5 transition-transform"
                    />
                    <span>
                      {hasUserSubmitted && onePhotoPerUser
                        ? 'Manage Your Entry'
                        : 'Submit Contest Entry'}
                    </span>
                  </>
                ) : (
                  <>
                    <Lock size={14} className="text-white/30 shrink-0" />
                    <span>Submissions Closed</span>
                  </>
                )}
              </motion.button>
            ) : (
              <motion.button
                type="button"
                onClick={onSignInClick}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-[#5865F2] via-[#4f5bd5] to-[#5865F2] hover:from-[#4f5bd5] hover:to-[#5865F2] text-white font-display font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-[#5865F2]/30 border border-[#5865F2]/40 transition-all cursor-pointer"
              >
                <svg
                  role="img"
                  viewBox="0 0 24 24"
                  className="w-4 h-4 fill-white shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.014.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                <span>Sign In with Discord to Submit</span>
              </motion.button>
            )}
          </div>

          {/* ═══ 6. RULES & HALL OF FAME NAVIGATION CARDS ═══ */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={scrollToRules}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-white/70 hover:text-white transition-all text-[11px] font-bold font-display uppercase tracking-wider cursor-pointer active:scale-95 group"
            >
              <FileText size={13} className="text-white/40 group-hover:text-white transition-colors" />
              <span>Rules</span>
            </button>

            <button
              type="button"
              onClick={onOpenHallOfFame}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 hover:text-amber-200 transition-all text-[11px] font-bold font-display uppercase tracking-wider cursor-pointer active:scale-95 group"
            >
              <Trophy size={13} className="text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Hall of Fame</span>
            </button>
          </div>

        </div>
      </div>
    </aside>
  );
};

export default ContestInfoSidebar;
