"use client";

import React, { useState, memo } from 'react';
import {
  Ban,
  CheckCircle,
  EyeOff,
  Maximize2,
  Share2,
  Trash2,
} from 'lucide-react';
import { BlurFade } from './ui/blur-fade';
import { MagicCard } from './ui/magic-card';
import { ChampionBadge } from './ChampionBadge';
import { VoteButton, VotersButton } from './VoteButton';
import { Skeleton } from './ui/skeleton';
import { cn } from '../lib/utils';
import { Photo } from '../types';

export interface PhotoCardProps {
  photo: Photo;
  index: number;
  sortBy: 'top' | 'newest';
  censorSubmissions?: boolean;
  votingOpen: boolean;
  isVotingOpen: boolean;
  privateKey: string | null;
  isAdmin: boolean;
  user: any | null;
  winCount: number;
  userAvatarUrl: string;
  hasVoted: boolean;
  categorySharePct: number;
  onLightbox: (photo: Photo) => void;
  onVote: (photoId: string) => void;
  onShare: (photo: Photo) => void;
  onDelete: (photoId: string, discordName: string) => void;
  onToggleDisqualify: (photoId: string, isDisqualified: boolean, reason?: string) => void;
}

export const PhotoCard = memo(function PhotoCard({
  photo,
  index,
  sortBy,
  censorSubmissions = false,
  votingOpen,
  isVotingOpen,
  privateKey,
  isAdmin,
  user,
  winCount,
  userAvatarUrl,
  hasVoted,
  categorySharePct,
  onLightbox,
  onVote,
  onShare,
  onDelete,
  onToggleDisqualify,
}: PhotoCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const isTopFirst = sortBy === 'top' && index === 0;
  const rankEmoji = sortBy === 'top' ? (index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null) : null;

  const isUserOwner = !!(
    user &&
    (user.displayName === photo.discord_name ||
      user.providerData?.some((p: any) => p.displayName === photo.discord_name))
  );

  return (
    <BlurFade delay={Math.min(index * 0.03, 0.3)} duration={0.35} className={cn(isTopFirst ? "md:col-span-2" : "")}>
      <MagicCard
        active={isTopFirst}
        borderBeamProps={{ size: 280, duration: 10, colorFrom: "#ea580c", colorTo: "#fcd34d", borderWidth: 2 }}
        gradientColor="rgba(234, 88, 12, 0.16)"
        className={cn(
          "relative group bg-fivem-card rounded-2xl border transition-all h-full group-hover:z-30",
          photo.is_disqualified
            ? "ring-2 ring-red-500/80 border-red-500/50"
            : isTopFirst
              ? "ring-2 ring-fivem-orange/50 shadow-2xl shadow-fivem-orange/10 border-fivem-orange/30"
              : "border-white/5 hover:border-fivem-orange/30"
        )}
      >
        <div
          className={cn("relative cursor-pointer overflow-hidden rounded-t-2xl", isTopFirst ? "aspect-[21/9]" : "aspect-video")}
          onClick={() => onLightbox(photo)}
        >
          {/* Skeleton Shimmer while Image is Loading */}
          {!imageLoaded && (
            <Skeleton className="absolute inset-0 w-full h-full rounded-t-2xl bg-white/5" />
          )}

          <div className="absolute inset-0 overflow-hidden">
            <img
              src={photo.image_url}
              alt={photo.caption || "Contest Photo"}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              className={cn(
                "w-full h-full object-cover transition-all duration-500 group-hover:scale-105",
                imageLoaded ? "opacity-100" : "opacity-0",
                photo.is_disqualified && "grayscale-[40%] opacity-80"
              )}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
          </div>

          {/* Pixelated / Censored Indicator */}
          {censorSubmissions && !votingOpen && (
            <div className="absolute bottom-3 left-3 bg-amber-500/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1 text-[9px] font-mono text-amber-300 font-bold z-10 shadow-sm">
              <EyeOff size={10} />
              <span>Pixelated until voting</span>
            </div>
          )}

          {/* DISQUALIFIED Permanent Banner */}
          {photo.is_disqualified && (
            <div className="absolute top-0 inset-x-0 bg-red-600/95 text-white font-black text-xs uppercase tracking-widest py-1.5 px-3 flex items-center justify-center gap-1.5 z-30 shadow-lg border-b border-red-400/40">
              <Ban size={14} className="stroke-[2.5]" />
              <span>DISQUALIFIED</span>
              {photo.disqualification_reason && (
                <span className="font-normal text-[10px] opacity-90 truncate max-w-[150px] font-mono">
                  ({photo.disqualification_reason})
                </span>
              )}
            </div>
          )}

          {/* Top-left: rank badge + player avatar + name in one row */}
          <div className={cn("absolute left-3 flex items-center gap-2 z-10", photo.is_disqualified ? "top-9" : "top-3")}>
            {rankEmoji && (
              <span className="text-2xl drop-shadow-lg leading-none">{rankEmoji}</span>
            )}
            <div className="bg-black/70 backdrop-blur-md pl-1 pr-2.5 py-1 rounded-full border border-white/15 flex items-center gap-1.5 max-w-[200px] shadow-lg">
              <img
                src={userAvatarUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-4 h-4 rounded-full object-cover border border-fivem-orange/50 shrink-0"
              />
              <span className="text-[10px] font-bold uppercase tracking-wider truncate text-white">
                {privateKey ? photo.player_name : "Anonymous"}
              </span>
            </div>
            {winCount > 0 && (
              <ChampionBadge winCount={winCount} size="sm" showLabel={false} />
            )}
          </div>

          {/* Top-right: action buttons (hover) */}
          <div className={cn("absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10", photo.is_disqualified ? "top-9" : "top-3")}>
            {isAdmin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (photo.is_disqualified) {
                    onToggleDisqualify(photo.id, false);
                  } else {
                    const reason = window.prompt("Reason for disqualifying this photo (optional):");
                    if (reason !== null) {
                      onToggleDisqualify(photo.id, true, reason || undefined);
                    }
                  }
                }}
                className={cn(
                  "bg-black/60 backdrop-blur-md p-2 rounded-full border transition-colors cursor-pointer",
                  photo.is_disqualified
                    ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                    : "border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white"
                )}
                title={photo.is_disqualified ? "Re-qualify Photo" : "Disqualify Photo"}
              >
                {photo.is_disqualified ? <CheckCircle size={14} /> : <Ban size={14} />}
              </button>
            )}
            {(isAdmin || isUserOwner) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(photo.id, photo.discord_name);
                }}
                className="bg-black/60 backdrop-blur-md p-2 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                title="Delete Photo"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShare(photo);
              }}
              className="bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 text-white hover:bg-fivem-orange transition-colors"
              title="Share Photo Link"
            >
              <Share2 size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLightbox(photo);
              }}
              className="bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 text-white hover:bg-white/20 transition-colors"
              title="Fullscreen Preview"
            >
              <Maximize2 size={14} />
            </button>
          </div>

          {/* Bottom-right: Voters & Vote buttons */}
          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5">
            <VotersButton
              photoId={photo.id}
              photoCaption={photo.caption}
              voteCount={photo.vote_count || 0}
            />
            <VoteButton
              photoId={photo.id}
              photoCaption={photo.caption}
              voteCount={photo.vote_count || 0}
              hasVoted={hasVoted}
              votingOpen={isVotingOpen}
              isDisqualified={photo.is_disqualified}
              categorySharePct={categorySharePct}
              onVote={() => onVote(photo.id)}
            />
          </div>
        </div>

        {/* Hover Caption Dropdown Bar */}
        <div className="p-4 pr-32 bg-fivem-card/90 backdrop-blur-md absolute bottom-0 left-0 right-0 border-t border-white/5 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10">
          <p className="text-sm font-medium line-clamp-2 text-white">
            {photo.caption || "No caption provided"}
          </p>
          <p className="text-[10px] text-white/40 font-mono mt-2 uppercase tracking-widest">
            {new Date(photo.created_at).toLocaleDateString()}
          </p>
        </div>
      </MagicCard>
    </BlurFade>
  );
});

export default PhotoCard;
