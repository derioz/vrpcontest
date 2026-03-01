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
    image_url: string;
    caption: string;
    created_at: string;
    vote_count: number;
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
