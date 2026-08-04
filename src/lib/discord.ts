/**
 * Discord API Helper for verifying Guild Membership and Roles
 */

export interface DiscordVerificationResult {
  allowed: boolean;
  reason?: 'not_in_server' | 'missing_role' | 'api_error';
  message?: string;
  guildMember?: any;
}

export async function verifyDiscordGuildAndRole(providerToken: string): Promise<DiscordVerificationResult> {
  const guildId = import.meta.env.VITE_DISCORD_GUILD_ID;
  const whitelistRoleId = import.meta.env.VITE_DISCORD_WHITELIST_ROLE_ID;

  // If Guild ID is not configured yet, bypass check gracefully with warning
  if (!guildId) {
    console.warn("⚠️ VITE_DISCORD_GUILD_ID is not set in .env. Skipping Discord server & role verification.");
    return { allowed: true };
  }

  if (!providerToken) {
    console.warn("⚠️ No Discord provider token found in session.");
    return { allowed: true };
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`, {
      headers: {
        Authorization: `Bearer ${providerToken}`,
      },
    });

    if (response.status === 404) {
      return {
        allowed: false,
        reason: 'not_in_server',
        message: 'You are not currently a member of the Vital RP Discord server.',
      };
    }

    if (!response.ok) {
      console.warn(`Discord API Returned HTTP ${response.status} during member lookup.`);
      // If Discord API fails or rate-limits, fallback safely
      return { allowed: true };
    }

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

    return {
      allowed: true,
      guildMember: member,
    };
  } catch (error: any) {
    console.error("Error checking Discord server membership:", error);
    // On unexpected fetch network error, allow access so user isn't locked out by API downtime
    return { allowed: true };
  }
}
