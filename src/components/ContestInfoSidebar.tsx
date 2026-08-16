import React from 'react';
import { motion } from 'motion/react';
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
  Vote,
  Calendar,
  ShieldCheck,
  Flame,
  Award
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Category, Photo, ArchivedWinner } from '../types';
import { NumberTicker } from './ui/number-ticker';
import { BorderBeam } from './ui/border-beam';
import { DotPattern } from './ui/dot-pattern';

interface ContestInfoSidebarProps {
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
  onUploadClick: () => void;
  onOpenHallOfFame: () => void;
  onSignInClick: () => void;
  onOpenRules?: () => void;
}

export const ContestInfoSidebar: React.FC<ContestInfoSidebarProps> = ({
  activeContest,
  votingOpen,
  submissionsOpen,
  categories,
  allPhotos,
  user,
  currentUserPhoto,
  userSubmissionCount,
  onePhotoPerUser,
  archivedWinners,
  onUploadClick,
  onOpenHallOfFame,
  onSignInClick,
  onOpenRules,
}) => {
  const hasUserSubmitted = !!currentUserPhoto || userSubmissionCount > 0;
  const totalVotes = allPhotos.reduce((sum, p) => sum + (p.vote_count || 0), 0);

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

  return (
    <aside className="sticky top-24 space-y-4">
      {/* ── Main Contest Info Card (SeraUI Glass / Spotlight Aesthetic) ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0e0e14]/95 via-[#0a0a0f]/95 to-[#08080c]/98 p-5 sm:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-all">
        {/* Subtle Ambient Backdrops */}
        <DotPattern width={20} height={20} cr={1} className="opacity-15 pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-fivem-orange/15 blur-[70px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-amber-500/10 blur-[70px] rounded-full pointer-events-none" />
        
        {/* Dynamic Glowing Border Beam */}
        <BorderBeam size={220} duration={10} colorFrom="#ea580c" colorTo="#f59e0b" borderWidth={1.5} />

        <div className="relative z-10 space-y-5">
          {/* Header Row: Live Badge & Round Identifier */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-fivem-orange/15 border border-fivem-orange/30 text-fivem-orange text-[10px] font-mono font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(234,88,12,0.25)]">
                <span className="w-1.5 h-1.5 rounded-full bg-fivem-orange animate-pulse" />
                Live Round
              </span>

              <span className="text-[10px] font-mono font-medium text-white/40 uppercase tracking-widest">
                Official Event
              </span>
            </div>

            <h3 className="text-lg font-black font-display text-white tracking-tight leading-snug">
              {activeContest?.name || 'Vital RP Community Photo Contest'}
            </h3>

            {activeContest?.description && (
              <p className="text-xs text-white/50 leading-relaxed line-clamp-2">
                {activeContest.description}
              </p>
            )}
          </div>

          {/* ── SeraUI Stepper / Phase Tracker ── */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3.5 space-y-2.5">
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/40 flex items-center justify-between">
              <span>Event Timeline</span>
              <span className="text-fivem-orange flex items-center gap-1">
                <Flame size={11} /> Phase 1 of 2
              </span>
            </div>

            <div className="space-y-2">
              {/* Step 1: Submissions */}
              <div className={cn(
                "flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors",
                submissionsOpen
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-white/[0.02] border-white/5 text-white/40"
              )}>
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold font-mono",
                    submissionsOpen ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/30"
                  )}>
                    1
                  </div>
                  <div>
                    <div className="font-bold text-white leading-none">Photo Submissions</div>
                    <div className="text-[10px] opacity-70 mt-0.5 font-mono">
                      {submissionsOpen ? 'Currently accepting shots' : 'Submissions locked'}
                    </div>
                  </div>
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider",
                  submissionsOpen ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/40"
                )}>
                  {submissionsOpen ? 'Open' : 'Closed'}
                </span>
              </div>

              {/* Step 2: Voting */}
              <div className={cn(
                "flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors",
                votingOpen
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-white/[0.02] border-white/5 text-white/40"
              )}>
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold font-mono",
                    votingOpen ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/30"
                  )}>
                    2
                  </div>
                  <div>
                    <div className="font-bold text-white leading-none">Community Voting</div>
                    <div className="text-[10px] opacity-70 mt-0.5 font-mono">
                      {votingOpen ? 'Ballots active' : 'Starts after submissions'}
                    </div>
                  </div>
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider",
                  votingOpen ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/40"
                )}>
                  {votingOpen ? 'Active' : 'Locked'}
                </span>
              </div>
            </div>
          </div>

          {/* ── SeraUI Telemetry Matrix (Clean 3-Card Grid) ── */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3 text-center">
              <Layers size={13} className="text-fivem-orange mx-auto mb-1.5 opacity-80" />
              <div className="text-base font-black font-display text-white">
                <NumberTicker value={categories.length} />
              </div>
              <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider mt-0.5">
                Categories
              </div>
            </div>

            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3 text-center">
              <ImageIcon size={13} className="text-fivem-orange mx-auto mb-1.5 opacity-80" />
              <div className="text-base font-black font-display text-white">
                <NumberTicker value={allPhotos.length} />
              </div>
              <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider mt-0.5">
                Entries
              </div>
            </div>

            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3 text-center">
              <Vote size={13} className="text-fivem-orange mx-auto mb-1.5 opacity-80" />
              <div className="text-base font-black font-display text-white">
                <NumberTicker value={totalVotes} />
              </div>
              <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider mt-0.5">
                Votes
              </div>
            </div>
          </div>

          {/* ── User Submission Telemetry Chip (Logged-in only) ── */}
          {user && !user.isAnonymous && (
            <div className={cn(
              "p-3 rounded-2xl border flex items-center justify-between text-xs transition-all",
              hasUserSubmitted
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                : "bg-white/[0.03] border-white/5 text-white/50"
            )}>
              <div className="flex items-center gap-2 min-w-0">
                {hasUserSubmitted ? (
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                ) : (
                  <Clock size={15} className="text-amber-400 shrink-0" />
                )}
                <span className="truncate text-[11px] font-medium">
                  {hasUserSubmitted ? 'Your Entry is Submitted' : 'No Entry Submitted Yet'}
                </span>
              </div>
              {hasUserSubmitted && (
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-300 shrink-0">
                  Ready
                </span>
              )}
            </div>
          )}

          {/* ── Primary Action Button ── */}
          <div className="pt-1">
            {user && !user.isAnonymous ? (
              <button
                type="button"
                onClick={onUploadClick}
                disabled={!submissionsOpen && !(onePhotoPerUser && hasUserSubmitted)}
                className={cn(
                  "w-full group relative overflow-hidden font-display font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl",
                  submissionsOpen
                    ? "bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500 hover:from-orange-500 hover:to-fivem-orange text-white hover:shadow-[0_0_25px_rgba(234,88,12,0.4)] hover:scale-[1.02] active:scale-98"
                    : "bg-white/10 text-white/30 border border-white/10 cursor-not-allowed"
                )}
              >
                {submissionsOpen ? (
                  <>
                    <Upload size={15} className="text-white shrink-0 group-hover:-translate-y-0.5 transition-transform" />
                    <span>{hasUserSubmitted && onePhotoPerUser ? 'Manage Your Entry' : 'Submit Contest Entry'}</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} className="text-white/40 shrink-0" />
                    <span>Submissions Closed</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignInClick}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-[#5865F2] to-[#4752C4] hover:from-[#4752C4] hover:to-[#5865F2] text-white font-display font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#5865F2]/25 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
              >
                <svg role="img" viewBox="0 0 24 24" className="w-4 h-4 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.014.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                <span>Sign In to Submit</span>
              </button>
            )}
          </div>

          {/* ── Secondary Quick Links Row ── */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
            <button
              type="button"
              onClick={scrollToRules}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white transition-all text-[11px] font-bold font-display uppercase tracking-wider cursor-pointer active:scale-95"
            >
              <FileText size={13} className="text-white/50" />
              <span>Rules</span>
            </button>

            <button
              type="button"
              onClick={onOpenHallOfFame}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 hover:text-amber-200 transition-all text-[11px] font-bold font-display uppercase tracking-wider cursor-pointer active:scale-95"
            >
              <Trophy size={13} className="text-amber-400" />
              <span>Hall of Fame</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
