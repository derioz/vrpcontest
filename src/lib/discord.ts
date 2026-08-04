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
