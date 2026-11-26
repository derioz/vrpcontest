/**
 * Discord API helper: the Vital RP access check.
 *
 * Participating requires membership of the Vital RP Discord AND the Whitelist Approved role.
 * The check uses the signed-in user's own OAuth token (scope guilds.members.read) and fails
 * closed: if membership and role cannot both be confirmed, access is denied.
 *
 * This runs in the browser, so it controls the interface. It does not protect the database.
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

// Public Discord snowflake IDs; the environment variables override them.
const VITAL_GUILD_ID = import.meta.env.VITE_DISCORD_GUILD_ID || '730015674348601384';
const WHITELIST_ROLE_ID = import.meta.env.VITE_DISCORD_WHITELIST_ROLE_ID || '1241050651677556806';

const TOKEN_KEY = 'discord_provider_token';

// In-memory verification cache (5-minute TTL) to eliminate redundant Discord API requests
interface CachedVerification {
  result: DiscordVerificationResult;
  timestamp: number;
}
const verificationCache = new Map<string, CachedVerification>();
const inFlight = new Map<string, Promise<DiscordVerificationResult>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const NOT_IN_SERVER: DiscordVerificationResult = {
  allowed: false,
  reason: 'not_in_server',
  message: 'You must be a member of the Vital RP Discord to participate.',
};

const SIGN_IN_AGAIN: DiscordVerificationResult = {
  allowed: false,
  reason: 'api_error',
  message: 'Sign in with Discord again so we can check your membership.',
};

const UNREACHABLE: DiscordVerificationResult = {
  allowed: false,
  reason: 'api_error',
  message: 'We could not reach Discord to check your membership. Please try again in a minute.',
};

async function lookUpMember(token: string, discordId: string | null): Promise<DiscordVerificationResult> {
  const url = `https://discord.com/api/v10/users/@me/guilds/${VITAL_GUILD_ID}/member`;
  const request = () => fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  try {
    let response = await request();

    // Rate limited: wait as long as Discord asks (capped) and try once more.
    if (response.status === 429) {
      const body = await response.json().catch(() => ({}));
      const waitMs = Math.min(Number(body?.retry_after) || 1, 5) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      response = await request();
    }

    if (response.status === 404) return NOT_IN_SERVER;

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem(TOKEN_KEY);
      return SIGN_IN_AGAIN;
    }

    if (!response.ok) return UNREACHABLE;

    const member = await response.json();

    // A stored token left over from another account must not vouch for this one.
    if (discordId && member.user?.id && String(member.user.id) !== discordId) {
      localStorage.removeItem(TOKEN_KEY);
      return SIGN_IN_AGAIN;
    }

    const roles: string[] = member.roles || [];
    if (!roles.includes(WHITELIST_ROLE_ID)) {
      return {
        allowed: false,
        reason: 'missing_role',
        message: 'You need the Whitelist Approved role in the Vital RP Discord to participate.',
        guildMember: member,
      };
    }

    return { allowed: true, guildMember: member };
  } catch (error) {
    console.warn('Discord membership check failed:', error);
    return UNREACHABLE;
  }
}

export async function verifyDiscordGuildAndRole(options: VerifyOptions = {}): Promise<DiscordVerificationResult> {
  if (options.providerToken) {
    localStorage.setItem(TOKEN_KEY, options.providerToken);
  }

  const token = options.providerToken || localStorage.getItem(TOKEN_KEY);
  if (!token) return SIGN_IN_AGAIN;

  const discordId = options.discordId ? String(options.discordId) : null;
  const cacheKey = `${discordId || ''}:${token}`;

  if (!options.forceRefresh) {
    const cached = verificationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.result;
  }

  // Sign-in fires several session events at once; share one request between them.
  let pending = inFlight.get(cacheKey);
  if (!pending) {
    pending = lookUpMember(token, discordId)
      .then((result) => {
        // Only definite answers are cached, so a temporary failure can be retried at once.
        if (result.reason !== 'api_error') {
          verificationCache.set(cacheKey, { result, timestamp: Date.now() });
        }
        return result;
      })
      .finally(() => inFlight.delete(cacheKey));
    inFlight.set(cacheKey, pending);
  }
  return pending;
}

/**
 * Check user eligibility for submitting, voting and suggesting.
 * Allowed only for Vital RP Discord members with the Whitelist Approved role.
 */
export async function checkUserDiscordEligibility(user: any, forceRefresh = false): Promise<DiscordVerificationResult> {
  if (!user) {
    return {
      allowed: false,
      reason: 'not_in_server',
      message: 'Please sign in with Discord to participate.',
    };
  }
  return verifyDiscordGuildAndRole({ discordId: user.discordId, forceRefresh });
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
