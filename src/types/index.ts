export interface Category {
    id: string;
    name: string;
    description: string;
    emoji?: string;
}

export interface Photo {
    id: string;
    category_id: string;
    player_name: string;
    discord_name: string;
    user_id?: string;
    uploader_uid?: string;
    user_photo_url?: string;
    avatar_seed?: string;
    avatar_style?: string;
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
    is_admin_author?: boolean;
    status?: SuggestionStatus | string;
    score: number;
    upvotes: number;
    downvotes: number;
    user_vote: number; // 1 (upvoted), -1 (downvoted), 0 (none)
    voters_sample?: SuggestionVoterSummary[]; // Inlined voter breakdown to eliminate extra read queries
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
    is_admin_author?: boolean;
    status?: SuggestionStatus | string;
}

