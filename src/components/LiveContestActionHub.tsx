import React from 'react';
import { motion } from 'motion/react';
import {
  Trophy,
  Upload,
  Sparkles,
  Lock,
  Unlock,
  Layers,
  Image as ImageIcon,
  FileText,
  CheckCircle,
  Clock,
  ChevronRight,
  User,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Category, Photo, ArchivedWinner } from '../types';
import { NumberTicker } from './ui/number-ticker';
import { BorderBeam } from './ui/border-beam';
import { DotPattern } from './ui/dot-pattern';

interface LiveContestActionHubProps {
  activeContest: { id: string; name: string; submissions_close_date?: string; voting_end_date?: string } | null;
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
  onOpenRules?: () => void;
  onSignInClick: () => void;
}

export const LiveContestActionHub: React.FC<LiveContestActionHubProps> = ({
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
  onOpenRules,
  onSignInClick,
}) => {
  const hasUserSubmitted = !!currentUserPhoto || userSubmissionCount > 0;

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
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#0c0c12]/95 via-[#111118]/90 to-[#0c0c12]/95 shadow-[0_16px_48px_rgba(0,0,0,0.6)] backdrop-blur-2xl p-5 sm:p-7 transition-all">
      {/* Background Decorative Pattern & Glows */}
      <DotPattern width={24} height={24} cr={1.2} className="opacity-20 z-0 pointer-events-none" />
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-fivem-orange/15 blur-[90px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-amber-500/10 blur-[90px] rounded-full pointer-events-none" />
      
      {/* Dynamic Border Beam for Active Contest Glow */}
      <BorderBeam size={260} duration={12} colorFrom="#ea580c" colorTo="#f59e0b" borderWidth={1.5} />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* ── Left Column: Contest Overview & Real-Time Status ── */}
        <div className="space-y-3.5 flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fivem-orange/20 border border-fivem-orange/40 text-fivem-orange text-[10px] font-mono font-black uppercase tracking-widest shadow-[0_0_12px_rgba(234,88,12,0.3)]">
              <span className="w-1.5 h-1.5 rounded-full bg-fivem-orange animate-ping" />
              Live Contest Round
            </span>

            {/* Dual-Phase Status Indicators */}
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border",
                submissionsOpen
                  ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-400"
                  : "bg-amber-500/15 border-amber-500/35 text-amber-400"
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", submissionsOpen ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
                Submissions {submissionsOpen ? 'Open' : 'Closed'}
              </span>

              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border",
                votingOpen
                  ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-400"
                  : "bg-rose-500/15 border-rose-500/35 text-rose-400"
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", votingOpen ? "bg-emerald-400 animate-pulse" : "bg-rose-400")} />
                Voting {votingOpen ? 'Active' : 'Locked'}
              </span>
            </div>
          </div>

          {/* Active Round Title */}
          <div>
            <h3 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight leading-tight truncate">
              {activeContest?.name || 'Vital RP Community Photo Contest'}
            </h3>
          </div>

          {/* Telemetry Micro-Pills */}
          <div className="flex items-center gap-3 sm:gap-5 flex-wrap text-xs font-mono text-white/50 pt-0.5">
            <div className="flex items-center gap-2 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/5">
              <Layers size={13} className="text-fivem-orange" />
              <span>
                <strong className="text-white font-bold"><NumberTicker value={categories.length} /></strong> Categories
              </span>
            </div>

            <div className="flex items-center gap-2 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/5">
              <ImageIcon size={13} className="text-fivem-orange" />
              <span>
                <strong className="text-white font-bold"><NumberTicker value={allPhotos.length} /></strong> Total Entries
              </span>
            </div>

            {user && !user.isAnonymous && (
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px]",
                hasUserSubmitted
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-white/[0.04] border-white/5 text-white/60"
              )}>
                {hasUserSubmitted ? (
                  <>
                    <CheckCircle size={13} className="text-emerald-400" />
                    <span>Your Entry: <strong>Submitted</strong></span>
                  </>
                ) : (
                  <>
                    <Clock size={13} className="text-amber-400" />
                    <span>Your Entry: <strong>Not Submitted</strong></span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: High-Impact Actions Cluster ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:self-center shrink-0">
          {/* Quick Rules Action */}
          <button
            type="button"
            onClick={scrollToRules}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 hover:border-white/20 text-white/70 hover:text-white transition-all text-xs font-bold font-display uppercase tracking-wider cursor-pointer active:scale-95 shadow-sm"
            title="Jump to Contest Rules"
          >
            <FileText size={14} className="text-white/60" />
            <span>Rules</span>
          </button>

          {/* Hall of Fame Vault Action */}
          <button
            type="button"
            onClick={onOpenHallOfFame}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 hover:text-amber-200 transition-all text-xs font-bold font-display uppercase tracking-wider cursor-pointer active:scale-95 shadow-lg shadow-amber-500/10"
            title="Explore past champions & winning photos"
          >
            <Trophy size={14} className="text-amber-400" />
            <span>Hall of Fame</span>
            {archivedWinners.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-[9px] font-mono font-bold text-amber-300 ml-0.5">
                {archivedWinners.length}
              </span>
            )}
          </button>

          {/* Primary Action Button: Submit Entry / Discord Sign In */}
          {user && !user.isAnonymous ? (
            <button
              type="button"
              onClick={onUploadClick}
              disabled={!submissionsOpen && !(onePhotoPerUser && hasUserSubmitted)}
              className={cn(
                "group relative overflow-hidden font-display font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xl",
                submissionsOpen
                  ? "bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500 hover:from-orange-500 hover:to-fivem-orange text-white hover:shadow-[0_0_30px_rgba(234,88,12,0.45)] hover:scale-[1.02] active:scale-98"
                  : "bg-white/10 text-white/30 border border-white/10 cursor-not-allowed"
              )}
            >
              {submissionsOpen ? (
                <>
                  <Upload size={16} className="text-white shrink-0 group-hover:-translate-y-0.5 transition-transform" />
                  <span>{hasUserSubmitted && onePhotoPerUser ? 'Manage Your Entry' : 'Submit Contest Entry'}</span>
                </>
              ) : (
                <>
                  <Lock size={15} className="text-white/40 shrink-0" />
                  <span>Submissions Closed</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignInClick}
              className="group relative overflow-hidden bg-gradient-to-r from-[#5865F2] to-[#4752C4] hover:from-[#4752C4] hover:to-[#5865F2] text-white font-display font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-[#5865F2]/25 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
            >
              <svg role="img" viewBox="0 0 24 24" className="w-4 h-4 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.014.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              <span>Sign In to Submit</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
