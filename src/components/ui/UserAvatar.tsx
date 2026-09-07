import React, { useState, useMemo } from 'react';
import { getDiceBearAvatarUrl, DiceBearStyleName } from '../../lib/dicebear';
import { cn } from '../../lib/utils';

export type UserAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

export interface UserAvatarProps {
  userId?: string | null;
  discordId?: string | null;
  discordAvatar?: string | null;
  photoURL?: string | null;
  discordPhotoURL?: string | null;
  username?: string | null;
  size?: UserAvatarSize;
  style?: DiceBearStyleName;
  className?: string;
  imgClassName?: string;
  alt?: string;
  showRing?: boolean;
}

const SIZE_MAP: Record<string, { px: number; tw: string }> = {
  xs: { px: 20, tw: 'w-5 h-5' },
  sm: { px: 28, tw: 'w-7 h-7' },
  md: { px: 34, tw: 'w-[34px] h-[34px]' },
  lg: { px: 44, tw: 'w-11 h-11' },
  xl: { px: 64, tw: 'w-16 h-16' },
};

/**
 * UserAvatar
 * Resilient, performance-optimized avatar component.
 * Priority:
 * 1. Valid Discord avatar CDN URL
 * 2. Deterministic DiceBear 10.x SVG fallback based on stable Discord ID
 * Gracefully captures image load failures with zero layout shift.
 */
export function UserAvatar({
  userId,
  discordId,
  discordAvatar,
  photoURL,
  discordPhotoURL,
  username,
  size = 'md',
  style = 'botttsNeutral',
  className,
  imgClassName,
  alt,
  showRing = false,
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  // Compute numeric size in pixels and Tailwind class
  const { px, twClass, styleDim } = useMemo(() => {
    if (typeof size === 'number') {
      return { px: size, twClass: '', styleDim: { width: `${size}px`, height: `${size}px` } };
    }
    const mapped = SIZE_MAP[size] || SIZE_MAP.md;
    return { px: mapped.px, twClass: mapped.tw, styleDim: undefined };
  }, [size]);

  // Primary avatar candidate: Discord avatar sources
  const candidateUrl = useMemo(() => {
    const directDiscord = discordAvatar?.trim();
    if (directDiscord && (directDiscord.startsWith('http://') || directDiscord.startsWith('https://'))) {
      return directDiscord;
    }
    const discordPhoto = discordPhotoURL?.trim();
    if (discordPhoto && (discordPhoto.startsWith('http://') || discordPhoto.startsWith('https://'))) {
      return discordPhoto;
    }
    const savedPhoto = photoURL?.trim();
    if (savedPhoto && (savedPhoto.startsWith('http://') || savedPhoto.startsWith('https://'))) {
      return savedPhoto;
    }
    return null;
  }, [discordAvatar, discordPhotoURL, photoURL]);

  // Deterministic DiceBear fallback URL based on stable Discord ID or user ID
  const fallbackUrl = useMemo(() => {
    const seed = discordId || userId || username || 'vital-member';
    return getDiceBearAvatarUrl(seed, style);
  }, [discordId, userId, username, style]);

  // Effective image source: candidate unless it errored or is missing
  const effectiveSrc = (!imgFailed && candidateUrl) ? candidateUrl : fallbackUrl;

  const resolvedAlt = alt || (username ? `${username}'s profile picture` : 'User profile avatar');

  return (
    <div
      style={styleDim}
      className={cn(
        'relative shrink-0 rounded-full select-none overflow-hidden aspect-square bg-[#101018]',
        'border border-white/10 ring-1 ring-white/5',
        showRing && 'hover:ring-fivem-orange/40 hover:border-fivem-orange/50 transition-all',
        twClass,
        className
      )}
    >
      <img
        src={effectiveSrc}
        alt={resolvedAlt}
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        onError={() => {
          if (!imgFailed) {
            setImgFailed(true);
          }
        }}
        className={cn(
          'w-full h-full rounded-full object-cover object-center pointer-events-none transition-opacity duration-200',
          imgClassName
        )}
      />
    </div>
  );
}

export default UserAvatar;
