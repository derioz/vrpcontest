import React from 'react';
import { motion } from 'motion/react';
import {
  Trophy,
  Upload,
  ShieldCheck,
  CheckCircle,
  LogOut,
  Settings,
  Lock,
  Unlock,
  Layers,
  Calendar,
  Image as ImageIcon,
  FileText,
  Check,
  Flame,
  User,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Edit3
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Category, Photo, ArchivedWinner } from '../types';
import { ChampionBadge } from './ChampionBadge';
import { NumberTicker } from './ui/number-ticker';
import { BorderBeam } from './ui/border-beam';
import { getProfileAvatar, getDiceBearAvatarUrl } from '../lib/dicebear';

interface ContestSidebarProps {
  user: any | null;
  isAdmin: boolean;
  isEditingDisplayName: boolean;
  setIsEditingDisplayName: (val: boolean) => void;
  editedDisplayName: string;
  setEditedDisplayName: (val: string) => void;
  handleSaveDisplayName: () => void;
  userSubmissionCount: number;
  votedPhotoIds: Set<string>;
  userTotalVotes: number;
  allPhotos: Photo[];
  categories: Category[];
  activeContest: { id: string; name: string; submissions_close_date?: string; voting_end_date?: string } | null;
  votingOpen: boolean;
  submissionsOpen: boolean;
  currentUserPhoto: Photo | null;
  onePhotoPerUser: boolean;
  archivedWinners: ArchivedWinner[];
  onUploadClick: () => void;
  onSignInClick: () => void;
  onSignOutClick: () => void;
  onOpenHallOfFame: () => void;
  onOpenCategorySuggestions: () => void;
  onOpenProfileOptions: () => void;
  getUserWinCount: (displayName?: string | null, uid?: string | null) => number;
}

export const ContestSidebar: React.FC<ContestSidebarProps> = ({
  user,
  isAdmin,
  isEditingDisplayName,
  setIsEditingDisplayName,
  editedDisplayName,
  setEditedDisplayName,
  handleSaveDisplayName,
  userSubmissionCount,
  votedPhotoIds,
  userTotalVotes,
  allPhotos,
  categories,
  activeContest,
  votingOpen,
  submissionsOpen,
  currentUserPhoto,
  onePhotoPerUser,
  archivedWinners,
  onUploadClick,
  onSignInClick,
  onSignOutClick,
  onOpenHallOfFame,
  onOpenCategorySuggestions,
  onOpenProfileOptions,
  getUserWinCount
}) => {
  const winCount = user ? getUserWinCount(user.displayName, user.uid) : 0;
  const hasUserSubmitted = !!currentUserPhoto || userSubmissionCount > 0;

  const scrollToRules = () => {
    const rulesEl = document.getElementById('rules');
    if (rulesEl) {
      rulesEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <aside className="lg:col-span-1 space-y-4 sm:space-y-5 lg:sticky lg:top-28 self-start order-first lg:order-last w-full">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. CONTESTANT PROFILE CARD (or DISCORD SIGN-IN GATEWAY)      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {user && !user.isAnonymous ? (
        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] via-[#0d0d12]/90 to-[#09090d]/95 p-5 shadow-2xl backdrop-blur-xl overflow-hidden group">
          {/* Subtle Ambient Top-Right Glow */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-fivem-orange/15 blur-[45px] rounded-full pointer-events-none" />

          <div className="relative z-10 space-y-4">
            {/* Header: Avatar, Name, Rank & Role */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                onClick={onOpenProfileOptions}
                className="relative shrink-0 group/avatar cursor-pointer"
                title="Click to customize profile avatar & settings"
              >
                <div className="w-13 h-13 rounded-2xl border-2 border-fivem-orange/40 p-0.5 relative overflow-hidden bg-black/60 shadow-lg shadow-fivem-orange/10 group-hover/avatar:border-fivem-orange transition-colors">
                  <img
                    src={getProfileAvatar(user.photoURL, user.avatarSeed || user.uid, user.avatarStyle)}
                    alt=""
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallback = getDiceBearAvatarUrl(user.avatarSeed || user.uid, user.avatarStyle);
                      if (target.src !== fallback) target.src = fallback;
                    }}
                    className="w-full h-full rounded-xl object-cover group-hover/avatar:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                    <Settings size={15} className="text-fivem-orange animate-spin-slow" />
                  </div>
                </div>
                {/* Active Discord Connection Pulse */}
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#0d0d12]" />
                </span>
              </div>

              {/* User Handle & Badges */}
              <div className="flex-1 min-w-0">
                {isEditingDisplayName ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="text"
                      value={editedDisplayName}
                      onChange={(e) => setEditedDisplayName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveDisplayName();
                        if (e.key === 'Escape') setIsEditingDisplayName(false);
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-white bg-black/70 border border-fivem-orange/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-fivem-orange w-full"
                      placeholder="New display name"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveDisplayName}
                      className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors shrink-0 cursor-pointer"
                      title="Save name"
                    >
                      <Check size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-black font-display text-white truncate max-w-[140px]" title={user.displayName}>
                        {user.displayName || 'Explorer'}
                      </h3>
                      {winCount > 0 && <ChampionBadge winCount={winCount} size="sm" />}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider",
                        isAdmin
                          ? "bg-fivem-orange/20 border border-fivem-orange/40 text-fivem-orange"
                          : "bg-white/10 border border-white/10 text-white/70"
                      )}>
                        {isAdmin ? <ShieldCheck size={10} /> : <CheckCircle size={10} />}
                        {isAdmin ? 'System Admin' : 'Verified Member'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3-Column Telemetry Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="rounded-2xl bg-black/30 p-2.5 border border-white/5 flex flex-col items-center justify-center text-center group/stat hover:border-white/15 transition-colors">
                <span className="text-lg font-display font-black text-white">
                  <NumberTicker value={userSubmissionCount} />
                </span>
                <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest mt-0.5">
                  Entries
                </span>
              </div>

              <div className="rounded-2xl bg-blue-500/10 p-2.5 border border-blue-500/20 flex flex-col items-center justify-center text-center group/stat hover:border-blue-500/40 transition-colors">
                <span className="text-lg font-display font-black text-blue-400">
                  <NumberTicker value={votedPhotoIds.size} />
                </span>
                <span className="text-[9px] font-mono text-blue-400/70 uppercase tracking-widest mt-0.5">
                  Votes Cast
                </span>
              </div>

              <div className="rounded-2xl bg-amber-500/10 p-2.5 border border-amber-500/20 flex flex-col items-center justify-center text-center group/stat hover:border-amber-500/40 transition-colors">
                <span className="text-lg font-display font-black text-amber-400">
                  <NumberTicker value={userTotalVotes} />
                </span>
                <span className="text-[9px] font-mono text-amber-400/70 uppercase tracking-widest mt-0.5">
                  Score
                </span>
              </div>
            </div>

            {/* Compact Action Bar */}
            <div className="flex items-center gap-2 pt-1">
              {isAdmin && (
                <button
                  type="button"
                  onClick={onOpenCategorySuggestions}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-fivem-orange/15 hover:bg-fivem-orange/25 border border-fivem-orange/30 text-fivem-orange hover:text-white transition-all text-xs font-bold font-display uppercase tracking-wider cursor-pointer shadow-sm active:scale-95"
                >
                  <ShieldCheck size={13} />
                  <span>Category Ideas</span>
                </button>
              )}

              <button
                type="button"
                onClick={onSignOutClick}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-white/10 bg-white/5 hover:border-red-500/40 hover:bg-red-500/15 text-white/60 hover:text-red-400 transition-all text-xs font-bold font-display uppercase tracking-wider cursor-pointer active:scale-95",
                  !isAdmin ? "flex-1" : "shrink-0"
                )}
                title="Disconnect Discord Session"
              >
                <LogOut size={13} />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Logged Out / Community Join Card */
        <div className="relative rounded-3xl border border-[#5865F2]/30 bg-gradient-to-b from-[#5865F2]/15 via-[#0d0d12]/95 to-[#09090d] p-5 shadow-2xl backdrop-blur-xl overflow-hidden space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center shrink-0 shadow-lg shadow-[#5865F2]/20">
              <svg role="img" viewBox="0 0 24 24" className="w-5 h-5 fill-[#7289da]" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.014.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-black font-display text-white">Join the Contest</h4>
              <p className="text-[11px] text-white/50">Submit photos, cast votes & earn badges</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignInClick}
            className="w-full relative overflow-hidden bg-gradient-to-r from-[#5865F2] to-[#4752C4] hover:from-[#4752C4] hover:to-[#5865F2] text-white font-bold font-display text-xs uppercase tracking-wider py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#5865F2]/25 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
          >
            <svg role="img" viewBox="0 0 24 24" className="w-4 h-4 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.014.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
            <span>Sign In with Discord</span>
          </button>
        </div>
      )}


      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. UNIFIED LIVE CONTEST HUB & ACTION CENTER                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-[#121218]/95 via-[#0d0d12]/95 to-[#09090d] p-5 shadow-2xl backdrop-blur-xl overflow-hidden space-y-4">
        {/* Active Contest Title & Live Pulse */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fivem-orange opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-fivem-orange" />
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-fivem-orange">
                Active Round
              </span>
            </div>
            <h4 className="text-sm font-black font-display text-white truncate" title={activeContest?.name || 'Photo Contest'}>
              {activeContest?.name || 'Vital RP Photo Contest'}
            </h4>
          </div>

          <button
            type="button"
            onClick={scrollToRules}
            className="text-[10px] font-mono text-white/50 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors shrink-0 cursor-pointer"
            title="Jump to Contest Rules"
          >
            <FileText size={11} />
            <span>Rules</span>
          </button>
        </div>

        {/* Dual-Phase Real-Time Status Chips */}
        <div className="grid grid-cols-2 gap-2">
          {/* Submissions Status Chip */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors",
            submissionsOpen
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-400"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              submissionsOpen ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            )} />
            <div className="min-w-0">
              <span className="block text-[9px] font-mono uppercase tracking-wider text-white/40 leading-none">Submissions</span>
              <span className="block text-xs font-black font-display tracking-wide mt-0.5">
                {submissionsOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
          </div>

          {/* Voting Status Chip */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors",
            votingOpen
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              votingOpen ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
            )} />
            <div className="min-w-0">
              <span className="block text-[9px] font-mono uppercase tracking-wider text-white/40 leading-none">Voting</span>
              <span className="block text-xs font-black font-display tracking-wide mt-0.5">
                {votingOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
          </div>
        </div>

        {/* Contest Quick Telemetry Numbers */}
        <div className="grid grid-cols-2 gap-2 bg-black/40 rounded-2xl p-3 border border-white/5 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-fivem-orange/70 shrink-0" />
            <div>
              <span className="text-[10px] text-white/40 block leading-none">Categories</span>
              <span className="font-bold text-white font-display text-sm mt-0.5 block">{categories.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            <ImageIcon size={14} className="text-fivem-orange/70 shrink-0" />
            <div>
              <span className="text-[10px] text-white/40 block leading-none">Total Entries</span>
              <span className="font-bold text-white font-display text-sm mt-0.5 block">{allPhotos.length}</span>
            </div>
          </div>
        </div>

        {/* Primary Action Button: Submit Entry / Submissions Closed */}
        <div>
          <button
            type="button"
            onClick={onUploadClick}
            disabled={!submissionsOpen && !(onePhotoPerUser && hasUserSubmitted)}
            className={cn(
              "w-full relative group overflow-hidden font-display font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl",
              submissionsOpen
                ? "bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500 text-white hover:shadow-[0_0_30px_rgba(234,88,12,0.45)] hover:scale-[1.02] active:scale-98"
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
        </div>
      </div>


      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. HALL OF FAME VAULT & CHAMPIONS SHOWCASE                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        onClick={onOpenHallOfFame}
        className="relative group rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-[#121218]/90 to-[#09090d] p-4.5 shadow-xl backdrop-blur-xl overflow-hidden cursor-pointer hover:border-amber-500/50 hover:shadow-[0_0_35px_rgba(245,158,11,0.2)] transition-all active:scale-[0.99]"
      >
        {/* Golden Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/15 blur-[35px] rounded-full pointer-events-none group-hover:bg-amber-500/25 transition-colors" />

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black shadow-lg shadow-amber-500/20 shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Trophy size={20} className="text-black fill-black/20" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-black font-display text-white uppercase tracking-wider group-hover:text-amber-300 transition-colors truncate">
                  Hall of Fame Vault
                </h4>
              </div>
              <p className="text-[11px] text-white/50 truncate">
                {archivedWinners.length > 0
                  ? `${archivedWinners.length} archived ${archivedWinners.length === 1 ? 'contest' : 'contests'} & champions`
                  : 'Past winners & legendary shots'}
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 group-hover:border-amber-500/40 group-hover:bg-amber-500/20 flex items-center justify-center text-white/50 group-hover:text-amber-300 transition-all shrink-0">
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

    </aside>
  );
};
