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
}

export async function verifyDiscordGuildAndRole(options: VerifyOptions): Promise<DiscordVerificationResult> {
  const guildId = import.meta.env.VITE_DISCORD_GUILD_ID;
  const whitelistRoleId = import.meta.env.VITE_DISCORD_WHITELIST_ROLE_ID;
  const botToken = import.meta.env.VITE_DISCORD_BOT_TOKEN;

  // If Guild ID is not configured in .env, skip check gracefully
  if (!guildId) {
    console.warn("⚠️ VITE_DISCORD_GUILD_ID is not set in .env. Skipping server & role verification.");
    return { allowed: true };
  }

  // Retrieve and persist provider token
  let storedToken = options.providerToken || localStorage.getItem('discord_provider_token');
  if (options.providerToken) {
    localStorage.setItem('discord_provider_token', options.providerToken);
    storedToken = options.providerToken;
  }

  // ── Strategy A: User OAuth Access Token Check ──
  if (storedToken) {
    try {
      const response = await fetch(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (response.status === 404) {
        return {
          allowed: false,
          reason: 'not_in_server',
          message: 'You are not currently a member of the Vital RP Discord server.',
        };
      }

      if (response.ok) {
        const member = await response.json();
        const roles: string[] = member.roles || [];

        if (whitelistRoleId && !roles.includes(whitelistRoleId)) {
          return {
            allowed: false,
            reason: 'missing_role',
            message: 'You are in the Vital RP Discord server, but you do not have the required "Whitelist Approved" role.',
            guildMember: member,
          };
        }

        return { allowed: true, guildMember: member };
      }

      // If token expired (401), clean up localStorage token
      if (response.status === 401) {
        localStorage.removeItem('discord_provider_token');
      }
    } catch (error) {
      console.warn("User OAuth token member verification failed:", error);
    }
  }

  // ── Strategy B: Discord Bot Token Member Lookup (by Discord User ID) ──
  if (botToken && options.discordId) {
    try {
      const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${options.discordId}`, {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      });

      if (response.status === 404) {
        return {
          allowed: false,
          reason: 'not_in_server',
          message: 'You are not currently a member of the Vital RP Discord server.',
        };
      }

      if (response.ok) {
        const member = await response.json();
        const roles: string[] = member.roles || [];

        if (whitelistRoleId && !roles.includes(whitelistRoleId)) {
          return {
            allowed: false,
            reason: 'missing_role',
            message: 'You are in the Vital RP Discord server, but you do not have the required "Whitelist Approved" role.',
            guildMember: member,
          };
        }

        return { allowed: true, guildMember: member };
      }
    } catch (error) {
      console.error("Bot token member check error:", error);
    }
  }

  // If no tokens are available to perform verification, log diagnostic warning
  if (!storedToken && !botToken) {
    console.warn("⚠️ Unable to verify Discord membership: No provider_token or bot_token available.");
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
