"use client";

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from './ui/sheet';
import { AvatarPicker } from './ui/avatar-picker';
import { ChampionBadge } from './ChampionBadge';
import {
  Settings,
  ShieldCheck,
  Bug,
  Sparkles,
  LogOut,
  User as UserIcon,
  Crown,
  ExternalLink,
  ChevronRight,
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
    avatarSeed?: string;
    avatarStyle?: DiceBearStyleName;
    discordId?: string | null;
  } | null;
  isAdmin: boolean;
  getUserWinCount: (displayName?: string | null, uid?: string) => number;
  getProfileAvatar: (photoURL?: string | null, seed?: string, style?: DiceBearStyleName) => string;
  getDiceBearAvatarUrl: (seed: string, style?: DiceBearStyleName) => string;
  availableDiceBearStyles: { id: DiceBearStyleName; label: string }[];
  onSaveProfile: (data: {
    displayName: string;
    avatarStyle: DiceBearStyleName;
    avatarSeed: string;
    useDiscordPhoto: boolean;
  }) => Promise<void> | void;
  onRetryDiscordAvatar: () => Promise<void> | void;
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
  if (!user) return null;

  const winCount = getUserWinCount(user.displayName, user.uid);
  const displayName = user.displayName || user.email?.split('@')[0] || 'Community Member';
  const userHandle = user.email ? user.email : `@${displayName.toLowerCase().replace(/\s+/g, '')}`;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg p-0 overflow-y-auto custom-scrollbar flex flex-col justify-between"
      >
        {/* ── Top Header Section ── */}
        <div className="p-6 pb-4 border-b border-white/[0.08] relative">
          {/* Ambient Background Aura */}
          <div className="absolute top-0 right-10 w-40 h-28 bg-fivem-orange/15 blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between gap-3 pr-8">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <SheetTitle className="text-xl font-black font-display text-white truncate">
                  Account & Profile
                </SheetTitle>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-md bg-fivem-orange/20 text-fivem-orange border border-fivem-orange/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                    Staff
                  </span>
                )}
              </div>
              <SheetDescription className="text-xs text-white/50 truncate font-mono">
                {userHandle}
              </SheetDescription>
            </div>

            {/* Champion or Role Badge */}
            {winCount > 0 ? (
              <ChampionBadge winCount={winCount} size="sm" />
            ) : (
              <div className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-mono font-bold text-white/60 uppercase tracking-widest shrink-0">
                Voter
              </div>
            )}
          </div>
        </div>

        {/* ── Scrollable Body Stage ── */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Kokonut UI Animated Avatar Picker & Display Name Studio */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] shadow-inner">
            <AvatarPicker
              currentDisplayName={displayName}
              currentPhotoURL={user.photoURL}
              currentAvatarSeed={user.avatarSeed || user.uid}
              currentAvatarStyle={user.avatarStyle || 'botttsNeutral'}
              discordId={user.discordId}
              onSave={async (data) => {
                await onSaveProfile(data);
                onClose();
              }}
              onCancel={onClose}
              onRetryDiscordPhoto={onRetryDiscordAvatar}
            />
          </div>

          {/* ── Platform Shortcuts Section ── */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold text-white/40 uppercase tracking-widest block px-1">
              Platform Features
            </span>

            <div className="flex flex-col gap-1.5">
              {/* Admin Console (Admin Only) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAdminModal();
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-fivem-orange/40 transition-all text-left group/btn cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-fivem-orange/15 border border-fivem-orange/30 flex items-center justify-center text-fivem-orange group-hover/btn:scale-105 transition-transform">
                      <Settings size={15} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white font-display uppercase tracking-wide">
                        Admin Console & Contest Manager
                      </span>
                      <span className="text-[10px] text-white/40">
                        Manage categories, winners, and platform settings
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-white/30 group-hover/btn:text-white transition-colors" />
                </button>
              )}

              {/* Category Suggestions (Admin Only) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCategorySuggestions();
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-purple-500/40 transition-all text-left group/btn cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover/btn:scale-105 transition-transform">
                      <Sparkles size={15} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white font-display uppercase tracking-wide">
                        Category Theme Ideas Portal
                      </span>
                      <span className="text-[10px] text-white/40">
                        Review community submissions and staff votes
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-white/30 group-hover/btn:text-white transition-colors" />
                </button>
              )}

              {/* Bug Report & Feedback */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBugModal();
                }}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-rose-500/40 transition-all text-left group/btn cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover/btn:scale-105 transition-transform">
                    <Bug size={15} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white font-display uppercase tracking-wide">
                      Report Bug & Send Feedback
                    </span>
                    <span className="text-[10px] text-white/40">
                      Submit feedback directly to platform engineers
                    </span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-white/30 group-hover/btn:text-white transition-colors" />
              </button>
            </div>
          </div>

        </div>

        {/* ── Footer Session Sign Out ── */}
        <div className="p-6 pt-4 border-t border-white/[0.08] bg-[#07070a]">
          <button
            type="button"
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 hover:border-red-500/40 text-red-300 hover:text-red-200 text-xs font-display font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <LogOut size={14} />
            <span>Sign Out of Vital RP</span>
          </button>
        </div>

      </SheetContent>
    </Sheet>
  );
}

export default ProfileSheet;
