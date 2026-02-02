import { Track } from "@/store/usePlayerStore";

export interface SupabaseTrack {
    id: string;
    track_id: string;
    title: string;
    artist: string;
    thumbnail_url: string;
    duration: number;
    embedding_12d?: string;
    created_at: string;
}

export interface SupabasePlaylist {
    id: string;
    user_id: string;
    name: string;
    description: string;
    cover_url: string;
    is_public: boolean;
    created_at: string;
    playlist_tracks?: SupabasePlaylistTrack[];
}

export interface SupabasePlaylistTrack {
    playlist_id: string;
    track_id: string;
    position: number;
    tracks?: SupabaseTrack;
}

export interface SupabaseHistoryEntry {
    id: string;
    user_id?: string;
    guest_id?: string;
    track_metadata: Track;
    played_at: string;
}

export interface CommunityPlaylistEntry {
    id: string;
    title: string;
    description: string;
    cover_url: string;
    upvote_count: number;
    created_at: string;
    is_public: boolean;
}
