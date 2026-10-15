export type ContestStatus = 'active' | 'paused' | 'scheduled' | 'archived';
export type ContestPhase = 'submissions' | 'voting' | 'completed';

export interface Contest {
    id: string;
    name: string;
    description?: string;
    status: ContestStatus;
    phase: ContestPhase;
    is_active: boolean;
    submissions_close_date?: string;
    voting_end_date?: string;
    rulesMarkdown?: string;
    paused_at?: string | null;
    paused_remaining_submissions_ms?: number;
    paused_remaining_voting_ms?: number;
    previous_phase?: ContestPhase;
    submissionsOpen?: boolean;
    votingOpen?: boolean;
    countdownSettings?: CountdownSettings | null;
    submission_count?: number;
    vote_count?: number;
    category_count?: number;
    created_at: string;
    updated_at?: string;
    resumed_at?: string;
    archived_at?: string;
}

export interface ContestAuditLog {
    id: string;
    contest_id: string;
    contest_name: string;
    action: 'create' | 'pause' | 'restore' | 'edit' | 'archive' | 'switch' | 'delete';
    details?: string;
    performed_by_uid: string;
    performed_by_name: string;
    performed_by_avatar?: string;
    timestamp: string;
    metadata?: Record<string, any>;
}

export interface Category {
    id: string;
    contest_id?: string;
    name: string;
    description: string;
    emoji?: string;
}

export interface Photo {
    id: string;
    contest_id?: string;
    category_id: string;
    player_name: string;
    discord_name: string;
    user_id?: string;
    uploader_uid?: string;
    user_photo_url?: string;
    avatar_seed?: string;
    avatar_style?: string;
    avatar_source?: 'discord' | 'dicebear';
    discord_avatar_url?: string;
    image_url: string; // This remains for backwards compatibility and for the decrypted state on the client
    censored_image_url?: string; // Pixelated version visible before voting
    encrypted_image_url?: string; // RSA-encrypted original URL
    caption: string;
    created_at: string;
    vote_count: number;
    is_disqualified?: boolean;
    disqualification_reason?: string;
}

export interface ArchivedWinner {
    id: string;
    contest_name: string;
    category_name: string;
    player_name: string;
    discord_name: string;
    user_id?: string;
    user_photo_url?: string;
    avatar_seed?: string;
    avatar_style?: string;
    avatar_source?: 'discord' | 'dicebear';
    discord_avatar_url?: string;
    image_url: string;
    caption: string;
    vote_count: number;
    archived_at: string;
}

export interface Rule {
    id: number;
    title: string;
    content: string;
    category: string;
    importance: 'Normal' | 'High' | 'Critical';
}

export interface Theme {
    colors: {
        background: string;
        text: string;
        primary: string;
        secondary: string;
        card: string;
        accent: string;
    };
    font: string;
}

export interface SuggestionVoterSummary {
    userId: string;
    discordName?: string;
    authorAvatarUrl?: string;
    avatarSeed?: string;
    avatarStyle?: string;
    discordId?: string;
    vote: 1 | -1;
    updatedAt: string;
}

export type SuggestionStatus =
    | 'open'
    | 'active'
    | 'under_review'
    | 'approved'
    | 'implemented'
    | 'declined'
    | 'archived';

export interface SuggestionAdminVote {
    adminId: string;
    adminName: string;
    adminAvatarUrl?: string;
    vote: 'yes' | 'no';
    votedAt: string;
}

export interface CategorySuggestion {
    id: string;
    category_name: string;
    description: string;
    user_id: string;
    author_name: string;
    author_avatar_url?: string;
    author_discord_id?: string;
    discord_id?: string;
    discord_name?: string;
    avatar_seed?: string;
    avatar_style?: string;
    avatar_source?: 'discord' | 'dicebear';
    discord_avatar_url?: string;
    is_admin_author?: boolean;
    status?: SuggestionStatus | string;
    score: number;
    upvotes: number;
    downvotes: number;
    user_vote: number; // 1 (upvoted), -1 (downvoted), 0 (none)
    voters_sample?: SuggestionVoterSummary[]; // Inlined voter breakdown to eliminate extra read queries
    admin_votes?: SuggestionAdminVote[]; // Staff votes on whether to use this theme in contest
    created_at: string;
    updated_at?: string;
}

export interface CategorySuggestionVote {
    id: string;
    suggestion_id: string;
    user_id: string;
    discord_id?: string;
    discord_name?: string;
    vote: 1 | -1;
    created_at: string;
    updated_at?: string;
}

export type SuggestionSortOption = 'newest' | 'top' | 'lowest' | 'oldest';

export interface CreateSuggestionInput {
    category_name: string;
    description: string;
    user_id: string;
    author_name: string;
    author_avatar_url?: string;
    author_discord_id?: string;
    discord_id?: string;
    discord_name?: string;
    avatar_seed?: string;
    avatar_style?: string;
    avatar_source?: 'discord' | 'dicebear';
    discord_avatar_url?: string;
    is_admin_author?: boolean;
    status?: SuggestionStatus | string;
}

export interface SuggestionBetaTester {
    discordId: string;
    discordName?: string;
    notes?: string;
    addedBy?: string;
    addedAt: string;
}

export interface CountdownSettings {
    enabled: boolean;
    mode: 'custom' | 'submissions' | 'voting';
    targetDate: string; // ISO 8601 string or valid date string
    label?: string;
    eventDateLabel?: string;
    eventTimeLabel?: string;
    eventTzLabel?: string;
    completedMessage?: string;
    autoGenerateLabels?: boolean;
    autoCloseSubmissions?: boolean;
    autoOpenVoting?: boolean;
    timeZone?: string;
    updatedAt?: string;
    updatedBy?: string;
}

export interface CategorySuggestionsPageSettings {
    // Hero section custom styling & monthly theme
    heroTitlePrefix?: string;
    heroMonthHighlight?: string;
    heroTitleSuffix?: string;
    heroThemeBadge?: string;
    heroDescription?: string;
    heroGuideline?: string;
    heroDisclaimer?: string;

    // Dedicated Countdown Clock Configuration
    countdownSettings?: CountdownSettings;

    updatedAt?: string;
    updatedBy?: string;
}

