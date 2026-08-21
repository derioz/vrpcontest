"use client";

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet';
import { AvatarPicker } from './ui/avatar-picker';
import { ChampionBadge } from './ChampionBadge';
import { Skeleton } from './ui/skeleton';
import {
  Settings,
  ShieldCheck,
  Bug,
  Sparkles,
  LogOut,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { DiceBearStyleName } from '../lib/dicebear';

export interface ProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL?: string | null;
    discordPhotoURL?: string | null;
    avatarSeed?: string;
    avatarStyle?: DiceBearStyleName;
    avatarSource?: 'discord' | 'dicebear';
    discordId?: string | null;
  } | null;
  isAdmin: boolean;
  isAuthLoading?: boolean;
  getUserWinCount: (displayName?: string | null, uid?: string) => number;
  getProfileAvatar: (photoURL?: string | null, seed?: string, style?: DiceBearStyleName) => string;
  getDiceBearAvatarUrl: (seed: string, style?: DiceBearStyleName) => string;
  availableDiceBearStyles: { id: DiceBearStyleName; label: string }[];
  onSaveProfile: (data: {
    displayName: string;
    avatarStyle: DiceBearStyleName;
    avatarSeed: string;
    avatarSource: 'discord' | 'dicebear';
  }) => Promise<void> | void;
  onRetryDiscordAvatar: () => Promise<string | null | void> | void;
  onOpenAdminModal: () => void;
  onOpenCategorySuggestions: () => void;
  onOpenBugModal: () => void;
  onSignOut: () => void;
}

export function ProfileSheet({
  isOpen,
  onClose,
  user,
  isAdmin,
  isAuthLoading = false,
  getUserWinCount,
  getProfileAvatar,
  getDiceBearAvatarUrl,
  availableDiceBearStyles,
  onSaveProfile,
  onRetryDiscordAvatar,
  onOpenAdminModal,
  onOpenCategorySuggestions,
  onOpenBugModal,
  onSignOut,
}: ProfileSheetProps) {
  const isLoading = isAuthLoading || !user;

  const winCount = user ? getUserWinCount(user.displayName, user.uid) : 0;
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Community Member';
  const userHandle = user?.email ? user.email : user ? `@${displayName.toLowerCase().replace(/\s+/g, '')}` : '@loading';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 overflow-y-auto custom-scrollbar flex flex-col justify-between"
      >
        {/* ── Top Header Section ── */}
        <div className="p-5 pb-3.5 border-b border-white/[0.08] relative">
          {/* Ambient Background Aura */}
          <div className="absolute top-0 right-10 w-40 h-28 bg-fivem-orange/15 blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between gap-3 pr-8">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <SheetTitle className="text-lg font-black font-display text-white truncate">
                  Account & Profile
                </SheetTitle>
                {!isLoading && isAdmin && (
                  <span className="px-1.5 py-0.5 rounded bg-fivem-orange/20 text-fivem-orange border border-fivem-orange/40 text-[9px] font-mono font-bold uppercase tracking-wider">
                    Staff
                  </span>
                )}
              </div>
              {isLoading ? (
                <Skeleton className="w-28 h-3.5 rounded bg-white/10 mt-1" />
              ) : (
                <SheetDescription className="text-xs text-white/50 truncate font-mono">
                  {userHandle}
                </SheetDescription>
              )}
            </div>

            {/* Champion or Role Badge */}
            {isLoading ? (
              <Skeleton className="w-16 h-6 rounded-full bg-white/10 shrink-0" />
            ) : winCount > 0 ? (
              <ChampionBadge winCount={winCount} size="sm" />
            ) : (
              <div className="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-mono font-bold text-white/60 uppercase tracking-widest shrink-0">
                Voter
              </div>
            )}
          </div>
        </div>

        {/* ── Scrollable Body Stage ── */}
        <div className="p-5 space-y-4 flex-1">
          {isLoading ? (
            /* ═══ SKELETON PLACEHOLDER STAGE (Zero Layout Shift) ═══ */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
                {/* Avatar Preview Skeleton */}
                <div className="flex flex-col items-center justify-center gap-2 py-2">
                  <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/10" />
                  <Skeleton className="w-32 h-3 rounded bg-white/5" />
                </div>

                {/* Display Name Input Skeleton */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="w-24 h-3.5 rounded bg-white/10" />
                    <Skeleton className="w-10 h-3.5 rounded bg-white/5" />
                  </div>
                  <Skeleton className="w-full h-9 rounded-xl bg-white/5" />
                </div>

                {/* Style Grid Skeleton */}
                <div className="space-y-2">
                  <Skeleton className="w-32 h-3.5 rounded bg-white/10" />
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <Skeleton key={n} className="h-16 rounded-xl bg-white/5" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Skeleton Buttons */}
              <div className="space-y-1.5">
                <Skeleton className="w-28 h-3 rounded bg-white/5" />
                <Skeleton className="w-full h-10 rounded-xl bg-white/5" />
                <Skeleton className="w-full h-10 rounded-xl bg-white/5" />
              </div>
            </div>
          ) : (
            /* ═══ REAL USER PROFILE STAGE (Cached / Loaded) ═══ */
            <>
              {/* Kokonut UI Animated Avatar Picker & Display Name Studio */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] shadow-inner">
                <AvatarPicker
                  currentDisplayName={displayName}
                  currentPhotoURL={user?.photoURL}
                  discordPhotoURL={user?.discordPhotoURL}
                  currentAvatarSeed={user?.avatarSeed || user?.uid || 'vital-user'}
                  currentAvatarStyle={user?.avatarStyle || 'botttsNeutral'}
                  currentAvatarSource={user?.avatarSource}
                  discordId={user?.discordId}
                  onSave={async (data) => {
                    await onSaveProfile(data);
                    onClose();
                  }}
                  onCancel={onClose}
                  onRetryDiscordPhoto={onRetryDiscordAvatar}
                />
              </div>

              {/* ── Platform Shortcuts Section (Compact Minimal Buttons & Strict Role-Gated) ── */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono font-bold text-white/35 uppercase tracking-widest block px-1">
                  {isAdmin ? 'Staff Controls & Feedback' : 'Feedback & Support'}
                </span>

                <div className="grid grid-cols-1 gap-1.5">
                  {/* 1. Admin Console (Rendered ONLY for admins) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAdminModal();
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-fivem-orange/40 text-white transition-all cursor-pointer group/btn"
                    >
                      <div className="flex items-center gap-2.5">
                        <Settings size={14} className="text-fivem-orange group-hover/btn:rotate-45 transition-transform duration-300" />
                        <span className="text-xs font-bold font-display uppercase tracking-wider">
                          Admin Console
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-fivem-orange bg-fivem-orange/15 px-1.5 py-0.5 rounded border border-fivem-orange/30">
                        Admin
                      </span>
                    </button>
                  )}

                  {/* 2. Category Theme Ideas (Rendered ONLY for admins) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCategorySuggestions();
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-purple-500/40 text-white transition-all cursor-pointer group/btn"
                    >
                      <div className="flex items-center gap-2.5">
                        <Sparkles size={14} className="text-purple-400 group-hover/btn:scale-110 transition-transform" />
                        <span className="text-xs font-bold font-display uppercase tracking-wider">
                          Category Themes
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-purple-300 bg-purple-500/15 px-1.5 py-0.5 rounded border border-purple-500/30">
                        Ideas
                      </span>
                    </button>
                  )}

                  {/* 3. Report Bug (Rendered for ALL users - Compact) */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBugModal();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-rose-500/40 text-white/80 hover:text-white transition-all cursor-pointer group/btn"
                  >
                    <div className="flex items-center gap-2.5">
                      <Bug size={14} className="text-rose-400 group-hover/btn:scale-110 transition-transform" />
                      <span className="text-xs font-bold font-display uppercase tracking-wider">
                        Report Bug
                      </span>
                    </div>
                    <ChevronRight size={13} className="text-white/20 group-hover/btn:text-white/60 transition-colors" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer Session Sign Out ── */}
        <div className="p-4 border-t border-white/[0.08] bg-[#07070a]">
          {isLoading ? (
            <Skeleton className="w-full h-8 rounded-xl bg-white/5" />
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onSignOut();
              }}
              className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 hover:border-red-500/40 text-red-300 hover:text-red-200 text-xs font-display font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98]"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          )}
        </div>

      </SheetContent>
    </Sheet>
  );
}

export default ProfileSheet;
