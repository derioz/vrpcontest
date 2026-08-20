"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  RefreshCw,
  Check,
  X,
  User,
  ShieldCheck,
  Camera,
  Layers,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  AVAILABLE_DICEBEAR_STYLES,
  getDiceBearAvatarUrl,
  getProfileAvatar,
  DiceBearStyleName,
} from '../../lib/dicebear';

interface AvatarPickerProps {
  currentDisplayName: string;
  currentPhotoURL?: string | null;
  currentAvatarSeed?: string;
  currentAvatarStyle?: DiceBearStyleName;
  discordId?: string | null;
  onSave: (data: {
    displayName: string;
    avatarStyle: DiceBearStyleName;
    avatarSeed: string;
    useDiscordPhoto: boolean;
  }) => Promise<void> | void;
  onCancel?: () => void;
  onRetryDiscordPhoto?: () => Promise<void> | void;
  className?: string;
}

export function AvatarPicker({
  currentDisplayName,
  currentPhotoURL,
  currentAvatarSeed = 'vital-user',
  currentAvatarStyle = 'botttsNeutral',
  discordId,
  onSave,
  onCancel,
  onRetryDiscordPhoto,
  className,
}: AvatarPickerProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName || '');
  const [selectedStyle, setSelectedStyle] = useState<DiceBearStyleName>(currentAvatarStyle);
  const [avatarSeed, setAvatarSeed] = useState(currentAvatarSeed);
  const [useDiscordPhoto, setUseDiscordPhoto] = useState(
    Boolean(currentPhotoURL && currentPhotoURL.includes('discord'))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingDiscord, setIsSyncingDiscord] = useState(false);

  // Sync state if props change
  useEffect(() => {
    setDisplayName(currentDisplayName || '');
    setSelectedStyle(currentAvatarStyle);
    setAvatarSeed(currentAvatarSeed || 'vital-user');
    setUseDiscordPhoto(Boolean(currentPhotoURL && currentPhotoURL.includes('discord')));
  }, [currentDisplayName, currentAvatarStyle, currentAvatarSeed, currentPhotoURL]);

  // Generate live preview URL
  const previewUrl = useDiscordPhoto && currentPhotoURL
    ? currentPhotoURL
    : getDiceBearAvatarUrl(avatarSeed, selectedStyle);

  const handleShuffleSeed = () => {
    const newSeed = Math.random().toString(36).substring(2, 10);
    setAvatarSeed(newSeed);
    setUseDiscordPhoto(false);
  };

  const handleSelectStyle = (styleId: DiceBearStyleName) => {
    setSelectedStyle(styleId);
    setUseDiscordPhoto(false);
  };

  const handleSelectDiscord = async () => {
    setUseDiscordPhoto(true);
    if (!currentPhotoURL && onRetryDiscordPhoto) {
      try {
        setIsSyncingDiscord(true);
        await onRetryDiscordPhoto();
      } finally {
        setIsSyncingDiscord(false);
      }
    }
  };

  const isNameValid = displayName.trim().length >= 3 && displayName.trim().length <= 20;
  const isDirty =
    displayName.trim() !== (currentDisplayName || '').trim() ||
    selectedStyle !== currentAvatarStyle ||
    avatarSeed !== currentAvatarSeed ||
    useDiscordPhoto !== Boolean(currentPhotoURL && currentPhotoURL.includes('discord'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNameValid || isSaving) return;

    try {
      setIsSaving(true);
      await onSave({
        displayName: displayName.trim(),
        avatarStyle: selectedStyle,
        avatarSeed,
        useDiscordPhoto,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6 w-full text-white", className)}
    >
      {/* ── Center Stage Avatar Preview (Kokonut UI signature) ── */}
      <div className="relative flex flex-col items-center justify-center pt-2">
        <div className="relative group">
          {/* Animated Ambient Glow Halo */}
          <div className="absolute -inset-3 bg-gradient-to-tr from-fivem-orange/40 via-amber-500/30 to-purple-500/30 rounded-3xl blur-xl opacity-80 group-hover:opacity-100 transition-opacity duration-500 animate-pulse pointer-events-none" />

          {/* Avatar Stage Frame */}
          <div className="relative w-28 h-28 rounded-2xl bg-gradient-to-b from-[#181824] to-[#0c0c14] border-2 border-white/20 p-2 flex items-center justify-center backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] overflow-hidden">
            <img
              src={previewUrl}
              alt="Avatar Preview"
              className="w-full h-full object-cover rounded-xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] transform transition-transform duration-300 group-hover:scale-105"
            />
            {/* Live Status Pip */}
            <span className="absolute bottom-2 right-2 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0c0c14] shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
          </div>

          {/* Quick Shuffle Action Floating Orb */}
          <motion.button
            type="button"
            onClick={handleShuffleSeed}
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            className="absolute -bottom-2 -right-2 p-2 rounded-full bg-fivem-orange hover:bg-orange-500 text-white shadow-[0_4px_16px_rgba(234,88,12,0.6)] border border-orange-300/40 cursor-pointer transition-colors"
            title="Randomize avatar seed"
          >
            <RefreshCw size={13} />
          </motion.button>
        </div>

        <div className="mt-3 text-center">
          <span className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-widest block">
            {useDiscordPhoto ? 'Discord OAuth2 Photo' : `DiceBear ${selectedStyle}`}
          </span>
        </div>
      </div>

      {/* ── Display Name Input with Character Validation (Kokonut UI) ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="profile-display-name"
            className="text-xs font-display font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5"
          >
            <User size={13} className="text-fivem-orange" />
            Display Name
          </label>
          <span
            className={cn(
              "text-[10px] font-mono font-bold tracking-wider",
              displayName.length < 3 || displayName.length > 20
                ? "text-red-400"
                : "text-emerald-400"
            )}
          >
            {displayName.length}/20 {displayName.length < 3 && '(Min 3)'}
          </span>
        </div>

        <div className="relative">
          <input
            id="profile-display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter display name..."
            maxLength={20}
            className={cn(
              "w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border text-sm text-white placeholder:text-white/30 focus:outline-none transition-all",
              isNameValid
                ? "border-white/15 focus:border-fivem-orange/80 focus:bg-white/[0.07] focus:shadow-[0_0_16px_rgba(234,88,12,0.25)]"
                : "border-red-500/50 focus:border-red-500 focus:bg-red-500/[0.04]"
            )}
          />
          {isNameValid && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
              <Check size={16} />
            </div>
          )}
        </div>
      </div>

      {/* ── Avatar Gallery / Selection Strip (Kokonut UI) ── */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-display font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
            <Layers size={13} className="text-fivem-orange" />
            Choose Avatar Style
          </span>
          <button
            type="button"
            onClick={handleShuffleSeed}
            className="text-[11px] font-mono text-fivem-orange hover:text-orange-400 transition-colors flex items-center gap-1 cursor-pointer font-bold"
          >
            <RefreshCw size={11} />
            Shuffle Seed
          </button>
        </div>

        {/* Discord Photo Sync Option Pill */}
        {discordId && (
          <button
            type="button"
            onClick={handleSelectDiscord}
            disabled={isSyncingDiscord}
            className={cn(
              "flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-left",
              useDiscordPhoto
                ? "bg-[#5865F2]/20 border-[#5865F2] shadow-[0_0_16px_rgba(88,101,242,0.3)] text-white"
                : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] text-white/70 hover:text-white"
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#5865F2] flex items-center justify-center text-white shrink-0">
                <svg role="img" viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.014.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-bold">Use Discord Photo</span>
                <span className="text-[10px] text-white/40">Sync directly with your Discord account</span>
              </div>
            </div>
            {isSyncingDiscord ? (
              <Loader2 size={15} className="animate-spin text-[#5865F2]" />
            ) : useDiscordPhoto ? (
              <span className="px-2 py-0.5 rounded-md bg-[#5865F2] text-white text-[10px] font-bold">Active</span>
            ) : null}
          </button>
        )}

        {/* DiceBear Avatars Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
          {AVAILABLE_DICEBEAR_STYLES.map((style) => {
            const isSelected = !useDiscordPhoto && selectedStyle === style.id;
            const thumbUrl = getDiceBearAvatarUrl(avatarSeed, style.id);

            return (
              <motion.button
                key={style.id}
                type="button"
                onClick={() => handleSelectStyle(style.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all cursor-pointer group/thumb",
                  isSelected
                    ? "bg-fivem-orange/20 border-fivem-orange shadow-[0_0_12px_rgba(234,88,12,0.4)]"
                    : "bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-white/20"
                )}
                title={style.label}
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#0c0c14] border border-white/10 flex items-center justify-center p-0.5">
                  <img
                    src={thumbUrl}
                    alt={style.label}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <span className="text-[9px] font-mono text-white/60 group-hover/thumb:text-white truncate max-w-full text-center">
                  {style.label.split(' ')[0]}
                </span>
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-fivem-orange text-white flex items-center justify-center shadow-md">
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Save & Cancel Controls ── */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.08]">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={!isNameValid || isSaving || !isDirty}
          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-display font-black uppercase tracking-wider shadow-[0_4px_20px_rgba(234,88,12,0.4)] hover:shadow-[0_0_25px_rgba(234,88,12,0.6)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Check size={14} />
              <span>Save Profile</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default AvatarPicker;
