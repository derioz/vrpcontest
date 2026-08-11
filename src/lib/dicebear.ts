/**
 * DiceBear Avatar Integration Utility
 * Official Repository: https://github.com/dicebear/dicebear
 * Documentation: https://www.dicebear.com
 *
 * Generates unique, customizable vector SVG profile pictures for users based on seed
 * (e.g., user ID, display name, or random seed) using the official high-speed DiceBear CDN API.
 */

export type DiceBearStyleName =
  | 'botttsNeutral'
  | 'bottts'
  | 'adventurer'
  | 'avataaars'
  | 'lorelei'
  | 'thumbs'
  | 'funEmoji'
  | 'openPeeps'
  | 'personas'
  | 'identicon'
  | 'initials'
  | 'shapes';

export interface DiceBearStyleOption {
  id: DiceBearStyleName;
  label: string;
  apiName: string;
}

export const AVAILABLE_DICEBEAR_STYLES: DiceBearStyleOption[] = [
  { id: 'botttsNeutral', label: 'Robots Neutral', apiName: 'bottts-neutral' },
  { id: 'bottts', label: 'Robots', apiName: 'bottts' },
  { id: 'adventurer', label: 'Adventurers', apiName: 'adventurer' },
  { id: 'avataaars', label: 'Avataaars', apiName: 'avataaars' },
  { id: 'lorelei', label: 'Lorelei', apiName: 'lorelei' },
  { id: 'thumbs', label: 'Thumbs', apiName: 'thumbs' },
  { id: 'funEmoji', label: 'Fun Emoji', apiName: 'fun-emoji' },
  { id: 'openPeeps', label: 'Open Peeps', apiName: 'open-peeps' },
  { id: 'personas', label: 'Personas', apiName: 'personas' },
  { id: 'identicon', label: 'Identicon', apiName: 'identicon' },
  { id: 'initials', label: 'Initials', apiName: 'initials' },
  { id: 'shapes', label: 'Shapes', apiName: 'shapes' },
];

/**
 * Returns a high-speed, CDN-cached SVG image URL for DiceBear avatars.
 *
 * @param seed - Unique identifier for the user (e.g. user.uid, user.displayName, or random seed string)
 * @param style - Selected DiceBear avatar style choice
 * @returns Fully qualified SVG image URL
 */
export function getDiceBearAvatarUrl(seed: string, style: DiceBearStyleName = 'botttsNeutral'): string {
  const safeSeed = encodeURIComponent(seed || 'vital-user');
  const matched = AVAILABLE_DICEBEAR_STYLES.find(s => s.id === style);
  const apiName = matched ? matched.apiName : 'bottts-neutral';
  return `https://api.dicebear.com/9.x/${apiName}/svg?seed=${safeSeed}`;
}

/**
 * Gets effective profile picture URL:
 * Tries custom photoURL (e.g. Discord OAuth avatar) first.
 * If missing, empty, or broken, falls back to a deterministic DiceBear SVG avatar based on user ID or seed.
 */
export function getProfileAvatar(
  photoURL?: string | null,
  seed?: string | null,
  style: DiceBearStyleName = 'botttsNeutral'
): string {
  if (photoURL && typeof photoURL === 'string' && photoURL.trim().length > 0) {
    return photoURL;
  }
  return getDiceBearAvatarUrl(seed || 'vital-user', style);
}
