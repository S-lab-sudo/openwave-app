-- OpenWave Elite SQL Schema (Idempotent Version)
-- Optimized for 12D Vector Search and Cloud Sync

-- 0. Setup
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Tracks Table: The Global Audio Library
CREATE TABLE IF NOT EXISTS tracks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    track_id TEXT UNIQUE, -- YouTube or Spotify ID for deduplication
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    thumbnail_url TEXT,
    popularity_score INTEGER DEFAULT 0,
    duration INTEGER,
    
    -- Acoustic DNA: 12-Dimensional Vector Space
    embedding_12d vector(12),
    
    genres TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. User Profiles: Taste Tracking
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT,
    current_vibe vector(12), -- Adaptive Taste Profile
    last_active TIMESTAMPTZ DEFAULT now()
);

-- 3. Playlists: Managed Collections
CREATE TABLE IF NOT EXISTS playlists (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Junction Table: Playlist Membership (Highly Indexed)
CREATE TABLE IF NOT EXISTS playlist_tracks (
    playlist_id uuid REFERENCES playlists ON DELETE CASCADE,
    track_id uuid REFERENCES tracks ON DELETE CASCADE,
    position INTEGER,
    PRIMARY KEY (playlist_id, track_id)
);

-- 5. Performance Indices
CREATE INDEX IF NOT EXISTS idx_tracks_vector ON tracks USING hnsw (embedding_12d vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_tracks_search ON tracks (title, artist);
CREATE INDEX IF NOT EXISTS idx_playlist_user ON playlists (user_id);

-- 6. Recommendation Engine (The 12D Match Function)
CREATE OR REPLACE FUNCTION match_tracks (
  query_embedding vector(12),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  track_id text,
  title text,
  artist text,
  thumbnail_url text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tracks.id,
    tracks.track_id,
    tracks.title,
    tracks.artist,
    tracks.thumbnail_url,
    1 - (tracks.embedding_12d <=> query_embedding) AS similarity
  FROM tracks
  WHERE 1 - (tracks.embedding_12d <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 7. Community Layer
CREATE TABLE IF NOT EXISTS community_playlists (
    id TEXT PRIMARY KEY, -- External ID
    title TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    upvote_count INTEGER DEFAULT 1,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_upvoted_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playlist_likes (
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    playlist_id TEXT REFERENCES community_playlists(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, playlist_id)
);

CREATE INDEX IF NOT EXISTS idx_community_leaderboard ON community_playlists (upvote_count DESC);

-- 8. Listening History: Taste Engine Source
CREATE TABLE IF NOT EXISTS listening_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE, -- Nullable for guests
    guest_id TEXT, -- Persistent Guest ID from useAuthStore
    track_metadata JSONB NOT NULL,
    played_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_history_user ON listening_history (user_id);
CREATE INDEX IF NOT EXISTS idx_history_guest ON listening_history (guest_id);
CREATE INDEX IF NOT EXISTS idx_history_time ON listening_history (played_at DESC);
