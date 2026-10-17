/**
 * Discord API Helper for verifying Guild Membership and Roles
 * Supports both User OAuth Provider Token and Discord Bot Token verification.
 */

export interface DiscordVerificationResult {
  allowed: boolean;
  reason?: 'not_in_server' | 'missing_role' | 'api_error';
  message?: string;
  guildMember?: any;
}

export interface VerifyOptions {
  providerToken?: string | null;
  discordId?: string | null;
  forceRefresh?: boolean;
}

// In-memory verification cache (5-minute TTL) to eliminate redundant Discord API requests
interface CachedVerification {
  result: DiscordVerificationResult;
  timestamp: number;
}
const verificationCache = new Map<string, CachedVerification>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Explicit allowed list of Discord IDs that are permanently whitelisted / unbanned
export const EXPLICIT_ALLOWED_DISCORD_IDS = new Set<string>([
  '345694065393926164', // ohgeesy2926
]);

export const EXPLICIT_ALLOWED_USERNAMES = new Set<string>([
  'ohgeesy2926',
  'ohgeesy',
]);

export async function verifyDiscordGuildAndRole(_options: VerifyOptions = {}): Promise<DiscordVerificationResult> {
  // Blocking checks completely removed — all users are permitted
  return { allowed: true };
}

/**
 * Check user eligibility for suggestions and voting.
 * Always permits authenticated users without blocking.
 */
export async function checkUserDiscordEligibility(user: any, _forceRefresh = false): Promise<DiscordVerificationResult> {
  if (!user) {
    return {
      allowed: false,
      reason: 'not_in_server',
      message: 'Please sign in with Discord to participate.',
    };
  }
  return { allowed: true };
}

/**
 * Query Discord API to pull the user's latest avatar (supporting animated gifs and static avatars).
 * Tries:
 * 1. User OAuth Bearer token (@me endpoint)
 * 2. Guild Member lookup via Bot Token
 * 3. Discord User lookup via Bot Token
 */
export async function fetchFreshDiscordAvatar(discordId?: string | null): Promise<{ avatarUrl: string | null; username?: string }> {
  const botToken = import.meta.env.VITE_DISCORD_BOT_TOKEN;
  const guildId = import.meta.env.VITE_DISCORD_GUILD_ID;
  const storedToken = localStorage.getItem('discord_provider_token');

  // Strategy 1: User OAuth Token
  if (storedToken) {
    try {
      const res = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bearer ${storedToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.avatar && data.id) {
          const isGif = data.avatar.startsWith('a_');
          const ext = isGif ? 'gif' : 'png';
          return {
            avatarUrl: `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.${ext}?size=256`,
            username: data.global_name || data.username
          };
        }
      }
    } catch (e) {
      console.warn('OAuth @me avatar fetch error:', e);
    }
  }

  // Strategy 2: Guild Member lookup via Bot Token
  if (botToken && discordId && guildId) {
    try {
      const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
        headers: { Authorization: `Bot ${botToken}` }
      });
      if (res.ok) {
        const member = await res.json();
        const avatarHash = member.avatar || member.user?.avatar;
        if (avatarHash) {
          const isGif = avatarHash.startsWith('a_');
          const ext = isGif ? 'gif' : 'png';
          const url = member.avatar
            ? `https://cdn.discordapp.com/guilds/${guildId}/users/${discordId}/avatars/${member.avatar}.${ext}?size=256`
            : `https://cdn.discordapp.com/avatars/${discordId}/${member.user.avatar}.${ext}?size=256`;
          return {
            avatarUrl: url,
            username: member.nick || member.user?.global_name || member.user?.username
          };
        }
      }
    } catch (e) {
      console.warn('Bot guild member avatar fetch error:', e);
    }
  }

  // Strategy 3: Global User lookup via Bot Token
  if (botToken && discordId) {
    try {
      const res = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
        headers: { Authorization: `Bot ${botToken}` }
      });
      if (res.ok) {
        const user = await res.json();
        if (user.avatar) {
          const isGif = user.avatar.startsWith('a_');
          const ext = isGif ? 'gif' : 'png';
          return {
            avatarUrl: `https://cdn.discordapp.com/avatars/${discordId}/${user.avatar}.${ext}?size=256`,
            username: user.global_name || user.username
          };
        }
      }
    } catch (e) {
      console.warn('Bot user avatar fetch error:', e);
    }
  }

  // Fallback: Default Discord avatar CDN endpoint
  if (discordId) {
    return {
      avatarUrl: `https://cdn.discordapp.com/avatars/${discordId}/avatar.png`
    };
  }

  return { avatarUrl: null };
}
