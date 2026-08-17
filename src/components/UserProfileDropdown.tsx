import React from 'react';
import {
  Settings,
  ShieldCheck,
  Bug,
  Edit3,
  RefreshCw,
  Sparkles,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Crown,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  DropdownMenu,
  DropdownTrigger,
  DropdownContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuBadge,
} from './ui/dropdown-menu';
import { ChampionBadge } from './ChampionBadge';
import type { DiceBearStyleName } from '../lib/dicebear';

export interface UserProfileDropdownProps {
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL?: string | null;
    avatarSeed?: string;
    avatarStyle?: DiceBearStyleName;
  };
  isAdmin: boolean;
  getUserWinCount: (displayName?: string | null, uid?: string) => number;
  getProfileAvatar: (photoURL?: string | null, seed?: string, style?: DiceBearStyleName) => string;
  getDiceBearAvatarUrl: (seed: string, style?: DiceBearStyleName) => string;
  availableDiceBearStyles: { id: DiceBearStyleName; label: string }[];
  onChangeAvatarStyle: (style: DiceBearStyleName) => void;
  onShuffleAvatarSeed: () => void;
  onRetryDiscordAvatar: () => void;
  onOpenAdminModal: () => void;
  onOpenNotAdminModal: () => void;
  onOpenCategorySuggestions: () => void;
  onOpenBugModal: () => void;
  onOpenRenameModal: () => void;
  onSignOut: () => void;
  className?: string;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  user,
  isAdmin,
  getUserWinCount,
  getProfileAvatar,
  getDiceBearAvatarUrl,
  availableDiceBearStyles,
  onChangeAvatarStyle,
  onShuffleAvatarSeed,
  onRetryDiscordAvatar,
  onOpenAdminModal,
  onOpenNotAdminModal,
  onOpenCategorySuggestions,
  onOpenBugModal,
  onOpenRenameModal,
  onSignOut,
  className,
}) => {
  const winCount = getUserWinCount(user.displayName, user.uid);
  const avatarUrl = getProfileAvatar(user.photoURL, user.avatarSeed || user.uid, user.avatarStyle);
  const fallbackUrl = getDiceBearAvatarUrl(user.avatarSeed || user.uid, user.avatarStyle);

  const displayName = user.displayName || user.email?.split('@')[0] || 'Community Member';
  const firstName = displayName.split(' ')[0];
  const userHandle = user.email ? user.email : `@${displayName.toLowerCase().replace(/\s+/g, '')}`;

  return (
    <DropdownMenu className={className}>
      {/* Sera UI Style Trigger Capsule */}
      <DropdownTrigger>
        <div
          className={cn(
            'group/user relative flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full',
            'bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.10] hover:border-fivem-orange/30',
            'transition-all duration-300 cursor-pointer active:scale-[0.97] shadow-sm'
          )}
          title="Open account menu & profile settings"
        >
          {/* Avatar with live status pulse */}
          <div className="relative shrink-0">
            <img
              src={avatarUrl}
              alt=""
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== fallbackUrl) target.src = fallbackUrl;
              }}
              className="w-7 h-7 rounded-full object-cover border border-fivem-orange/40 shadow-[0_0_8px_rgba(234,88,12,0.25)]"
            />
            <span className="absolute -bottom-px -right-px w-2.5 h-2.5 rounded-full bg-emerald-400 border-[1.5px] border-[#09090b] shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
          </div>

          <span className="text-xs font-bold font-display text-white/90 group-hover/user:text-white transition-colors max-w-[85px] truncate">
            {firstName}
          </span>

          {winCount > 0 && (
            <ChampionBadge winCount={winCount} size="sm" showLabel={false} />
          )}

          <ChevronDown
            size={13}
            className="text-white/40 group-hover/user:text-fivem-orange transition-transform duration-200"
          />
        </div>
      </DropdownTrigger>

      {/* Sera UI Style Dropdown Content */}
      <DropdownContent width="w-80" align="right" className="p-2">
        {/* Sera UI Comprehensive User Header */}
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-1.5 flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={avatarUrl}
                alt=""
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== fallbackUrl) target.src = fallbackUrl;
                }}
                className="w-10 h-10 rounded-xl object-cover border border-white/20 shadow-md"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0c0c14] shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </div>
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                {displayName}
                {isAdmin && <ShieldCheck size={13} className="text-fivem-orange shrink-0" />}
              </span>
              <span className="text-[11px] font-mono text-white/40 truncate mt-0.5">
                {userHandle}
              </span>
            </div>
          </div>

          {/* User Tag / Plan Badge */}
          <div className="shrink-0 flex flex-col items-end gap-1">
            {winCount > 0 ? (
              <ChampionBadge winCount={winCount} size="sm" />
            ) : isAdmin ? (
              <DropdownMenuBadge variant="orange">
                Admin
              </DropdownMenuBadge>
            ) : (
              <DropdownMenuBadge variant="emerald">
                Voter
              </DropdownMenuBadge>
            )}
          </div>
        </div>

        {/* Section 1: Navigation & Platform Actions */}
        <div className="flex flex-col gap-0.5">
          {/* Admin Console / Settings */}
          <DropdownMenuItem
            icon={<Settings size={15} className="group-hover:rotate-45 transition-transform duration-300" />}
            onClick={() => {
              if (isAdmin) {
                onOpenAdminModal();
              } else {
                onOpenNotAdminModal();
              }
            }}
            badge={
              isAdmin ? (
                <span className="px-1.5 py-0.5 rounded bg-fivem-orange/20 text-[9px] font-mono font-bold text-fivem-orange border border-fivem-orange/30">
                  Admin
                </span>
              ) : undefined
            }
          >
            {isAdmin ? 'Admin Console' : 'Settings'}
          </DropdownMenuItem>

          {/* Category Suggestions (Admin Only) */}
          {isAdmin && (
            <DropdownMenuItem
              icon={<ShieldCheck size={15} className="text-orange-400/80 group-hover:text-orange-400" />}
              onClick={onOpenCategorySuggestions}
              badge={
                <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-[9px] font-mono font-bold text-orange-300 border border-orange-500/30">
                  Ideas
                </span>
              }
            >
              Category Ideas
            </DropdownMenuItem>
          )}

          {/* Bug Report & Feedback */}
          <DropdownMenuItem
            icon={<Bug size={15} className="text-rose-400/80 group-hover:text-rose-400" />}
            onClick={onOpenBugModal}
            badge={<span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse shadow-[0_0_6px_rgba(251,113,133,0.8)]" />}
          >
            Report Bug & Feedback
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator />

        {/* Section 2: Account Customization (Sera UI style) */}
        <DropdownMenuLabel>Profile Customization</DropdownMenuLabel>
        <div className="flex flex-col gap-0.5">
          {/* Rename Display Name */}
          <DropdownMenuItem
            icon={<Edit3 size={15} className="text-amber-400/80 group-hover:text-amber-400" />}
            onClick={onOpenRenameModal}
            badge={
              <span className="text-[10px] font-mono text-zinc-400 opacity-60 group-hover:opacity-100">
                Rename
              </span>
            }
          >
            Display Name
          </DropdownMenuItem>

          {/* Sync Discord Photo */}
          <DropdownMenuItem
            icon={<RefreshCw size={15} className="text-[#7983f5]/80 group-hover:text-[#7983f5] group-hover:rotate-180 transition-transform duration-500" />}
            onClick={onRetryDiscordAvatar}
            badge={
              <span className="text-[10px] font-mono text-indigo-400/80">
                Discord
              </span>
            }
          >
            Sync Photo
          </DropdownMenuItem>

          {/* Inline Dicebear Avatar Style Picker & Randomize Seed */}
          <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] mt-1 flex items-center justify-between gap-2 text-xs text-white/70">
            <div className="flex items-center gap-1.5 text-[11px] text-white/60 shrink-0">
              <Sparkles size={13} className="text-fivem-orange/80" />
              <span className="font-medium">Avatar Style:</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
              <select
                value={user.avatarStyle || 'botttsNeutral'}
                onChange={(e) => onChangeAvatarStyle(e.target.value as DiceBearStyleName)}
                className="h-6 px-2 text-[11px] bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white rounded-lg focus:outline-none focus:border-fivem-orange/50 cursor-pointer max-w-[120px] truncate transition-colors"
                title="Select DiceBear Avatar Style"
              >
                {availableDiceBearStyles.map((st) => (
                  <option key={st.id} value={st.id} className="bg-neutral-900 text-white">
                    {st.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onShuffleAvatarSeed}
                className="p-1 rounded-lg text-white/50 hover:text-fivem-orange hover:bg-white/[0.08] transition-all cursor-pointer active:scale-95"
                title="Randomize avatar seed"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Section 3: Session Management */}
        <DropdownMenuItem
          variant="danger"
          icon={<LogOut size={15} />}
          onClick={onSignOut}
        >
          Sign Out
        </DropdownMenuItem>
      </DropdownContent>
    </DropdownMenu>
  );
};
