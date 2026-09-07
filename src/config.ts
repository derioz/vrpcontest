/**
 * Vital RP Photo Contest - Platform Configuration
 * Centralized settings for Category Suggestions, Discord Integration, and Site Modes.
 */

export interface CategorySuggestionsConfig {
  /**
   * When enabled, turns the homepage (/) into the dedicated Category Suggestion community event,
   * and redirects public contest routes (/contests, /gallery, /vote, /submissions, /winners) to /.
   */
  suggestionModeEnabled: boolean;
  /** Maximum suggestions allowed per Discord user */
  maxSuggestionsPerUser: number;
  /** Whether eligible users can submit new suggestions */
  allowSuggestions: boolean;
  /** Whether eligible users can vote on suggestions */
  allowVoting: boolean;
  /** Whether users can remove their vote after casting */
  allowVoteRemoval: boolean;
  /** When false, public cards show "Community Member" instead of author Discord names */
  showSubmitterNames: boolean;
}

export interface SiteConfig {
  categorySuggestions: CategorySuggestionsConfig;
  discord: {
    guildId: string;
    whitelistRoleId: string;
    clientId: string;
    inviteUrl: string;
  };
}

export const SITE_CONFIG: SiteConfig = {
  categorySuggestions: {
    suggestionModeEnabled: true,
    maxSuggestionsPerUser: 3,
    allowSuggestions: true,
    allowVoting: true,
    allowVoteRemoval: true,
    showSubmitterNames: false,
  },
  discord: {
    guildId: import.meta.env.VITE_DISCORD_GUILD_ID || '',
    whitelistRoleId: import.meta.env.VITE_DISCORD_WHITELIST_ROLE_ID || '',
    clientId: import.meta.env.VITE_DISCORD_CLIENT_ID || '',
    inviteUrl: import.meta.env.VITE_DISCORD_INVITE_URL || 'https://discord.gg/vitalrp',
  },
};

/**
 * Global Category Suggestion Mode Flag
 * Set to true to make Category Suggestions the primary homepage experience.
 * Set to false to return to the standard Photo Contest website.
 */
export const CATEGORY_SUGGESTION_MODE: boolean = SITE_CONFIG.categorySuggestions.suggestionModeEnabled;

export const MAX_CATEGORY_SUGGESTIONS_PER_USER: number = SITE_CONFIG.categorySuggestions.maxSuggestionsPerUser;

/**
 * Official Site Assets
 */
export const VITAL_RP_LOGO_URL = 'https://r2.fivemanage.com/image/qlWrCeXTQdqx.png';
export const DAMON_AVATAR_URL = 'https://r2.fivemanage.com/image/qePVNvTsc65p.png';

/**
 * Authoritative Category Suggestion Phase Schedule & Deadline:
 * Closes Sunday, September 27, 2026 at 11:59:59 PM Central (America/Chicago)
 */
export const CATEGORY_SUGGESTION_DEADLINE = '2026-09-27T23:59:59-05:00';
export const CATEGORY_SUGGESTION_DEADLINE_LABEL = 'Sept. 27 • 11:59 PM CT';

/**
 * Returns true if category suggestions and voting are currently active.
 * Once the deadline passes, returns false.
 */
export function isCategorySuggestionDeadlineActive(): boolean {
  return new Date().getTime() < new Date(CATEGORY_SUGGESTION_DEADLINE).getTime();
}

