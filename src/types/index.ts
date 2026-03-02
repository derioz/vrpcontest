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
    image_url: string; // This remains for backwards compatibility and for the decrypted state on the client
    censored_image_url?: string; // Pixelated version visible before voting
    encrypted_image_url?: string; // RSA-encrypted original URL
    caption: string;
    created_at: string;
    vote_count: number;
}

export interface ArchivedWinner {
    id: string;
    contest_name: string;
    category_name: string;
    player_name: string;
    discord_name: string;
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
