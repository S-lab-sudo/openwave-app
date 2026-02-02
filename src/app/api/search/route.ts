import { NextResponse } from 'next/server';
import YouTube from 'youtube-sr';
import { safeRedis } from '@/lib/upstash';

const searchCache = new Map<string, { data: YouTubeTrack[], timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 2; // 2 hours
const REDIS_TTL = 60 * 60 * 24; // 24 hours

interface YouTubeTrack {
    id: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: number;
    description: string;
    youtubeUrl: string;
    isPlaylist: boolean;
    playlist_title?: string;
    album?: string;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'search';

    if (!query && type !== 'trending') {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const cacheKey = `ow:search:v8:${type}:${query || 'global'}`;

    // 1. Memory Cache
    const inMem = searchCache.get(cacheKey);
    if (inMem && Date.now() - inMem.timestamp < CACHE_TTL) {
        return NextResponse.json({ items: inMem.data, query, type, source: 'cache:memory' });
    }

    // 2. Redis Cache
    const cachedRedis = await safeRedis.get<YouTubeTrack[]>(cacheKey);
    if (cachedRedis && cachedRedis.length > 0) {
        searchCache.set(cacheKey, { data: cachedRedis, timestamp: Date.now() });
        return NextResponse.json({ items: cachedRedis, query, type, source: 'cache:redis' });
    }

    try {
        let tracks: YouTubeTrack[] = [];

        // CASE 1: Playlist Tracks (Fetching the contents of a playlist or video ID)
        if (type === 'playlist_tracks') {
            if (query?.startsWith('PL')) {
                try {
                    // Try native fetching for real playlists
                    const playlist = await YouTube.getPlaylist(query);
                    // fetch() retrieves the videos. We can specify a limit.
                    const fetchedPlaylist = await playlist.fetch(50); 
                    
                    tracks = fetchedPlaylist.videos.map(v => ({
                        id: v.id || '',
                        title: v.title || 'Unknown',
                        artist: v.channel?.name || 'YouTube',
                        thumbnail: v.thumbnail?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
                        duration: Math.floor((v.duration || 0) / 1000),
                        description: '',
                        youtubeUrl: `https://www.youtube.com/watch?v=${v.id}`,
                        isPlaylist: false,
                        playlist_title: playlist.title
                    }));

                    if (tracks.length === 0) throw new Error("Empty playlist");
                } catch (e) {
                    console.warn("Native playlist fetch failed, trying search fallback", e);
                    // If native fetch fails, try to search for tracks that might be in it
                    const results = await YouTube.search(query, { limit: 25, type: 'video' });
                    tracks = results.map(v => ({
                        id: v.id || '',
                        title: v.title || 'Unknown',
                        artist: v.channel?.name || 'YouTube',
                        thumbnail: v.thumbnail?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
                        duration: Math.floor((v.duration || 0) / 1000),
                        description: '',
                        youtubeUrl: `https://www.youtube.com/watch?v=${v.id}`,
                        isPlaylist: false,
                        playlist_title: 'YouTube Collection'
                    }));
                }
            } else {
                // NEURAL MIX LOGIC: It's a single video ID but requested as a playlist contents.
                // We fetch the video details, then search for related content to build a "Mix".
                try {
                    const video = await YouTube.getVideo(`https://www.youtube.com/watch?v=${query}`).catch(() => null);
                    const seedTitle = video?.title || query!;
                    
                    // Search for a mix based on the seed title
                    const results = await YouTube.search(`${seedTitle} mix`, { limit: 20, type: 'video' });
                    
                    tracks = results.map(v => ({
                        id: v.id || '',
                        title: v.title || 'Frequency Pattern',
                        artist: v.channel?.name || 'OpenWave Curator',
                        thumbnail: v.thumbnail?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
                        duration: Math.floor((v.duration || 0) / 1000),
                        description: '',
                        youtubeUrl: `https://www.youtube.com/watch?v=${v.id}`,
                        isPlaylist: false,
                        playlist_title: seedTitle ? `${seedTitle} Mix` : 'Neural Connection'
                    }));
                } catch (e) {
                    // Last resort fallout
                    const results = await YouTube.search(query!, { limit: 15, type: 'video' });
                    tracks = results.map(v => ({
                        id: v.id || '',
                        title: v.title || 'Frequency',
                        artist: v.channel?.name || 'Unknown',
                        thumbnail: v.thumbnail?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
                        duration: Math.floor((v.duration || 0) / 1000),
                        description: '',
                        youtubeUrl: `https://www.youtube.com/watch?v=${v.id}`,
                        isPlaylist: false,
                        playlist_title: 'Synthetic Mix'
                    }));
                }
            }
        } 
        // CASE 2: Playlist Discovery (Search)
        else if (type === 'playlist') {
            // We search for playlists. If the library's 'playlist' type is still buggy, 
            // we use 'video' search with 'playlist' keyword as a bulletproof fallback.
            try {
                const results = await YouTube.search(query!, { limit: 15, type: 'playlist' });
                tracks = results.map(p => ({
                    id: p.id || '',
                    title: p.title || 'Collection',
                    artist: p.channel?.name || 'YouTube',
                    thumbnail: p.thumbnail?.url || '',
                    duration: 0,
                    description: '',
                    youtubeUrl: `https://www.youtube.com/playlist?list=${p.id}`,
                    isPlaylist: true,
                    playlist_title: p.title
                }));
            } catch (e) {
                // Resilient fallback for Discovery
                const rawResults = await YouTube.search(`${query} playlist`, { limit: 20, type: 'video' });
                tracks = rawResults.map(v => ({
                    id: v.id || '',
                    title: v.title || 'Mix',
                    artist: v.channel?.name || 'YouTube',
                    thumbnail: v.thumbnail?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
                    duration: 0,
                    description: '',
                    youtubeUrl: `https://www.youtube.com/playlist?list=${v.id}`,
                    isPlaylist: true,
                    playlist_title: v.title
                }));
            }
        }
        // CASE 3: Standard / Trending Search
        else {
            const results = await YouTube.search(type === 'trending' ? 'Billboard Hot 100 Official Audio' : query!, { 
                limit: 30,
                type: 'video'
            }).catch(() => []);

            tracks = results.map(v => ({
                id: v.id || '',
                title: v.title || 'Unknown',
                artist: v.channel?.name || 'YouTube',
                thumbnail: v.thumbnail?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
                duration: Math.floor((v.duration || 0) / 1000),
                description: v.description || '',
                youtubeUrl: `https://www.youtube.com/watch?v=${v.id}`,
                isPlaylist: false,
                album: type === 'trending' ? 'Trending' : 'Search Result'
            }));
        }

        if (tracks.length > 0) {
            await safeRedis.set(cacheKey, tracks, { ex: REDIS_TTL });
            searchCache.set(cacheKey, { data: tracks, timestamp: Date.now() });
            return NextResponse.json({ items: tracks, query, type, source: 'live:resilient-v8' });
        }

        return NextResponse.json({ items: [], query, type });

    } catch (error) {
        console.error('Fatal Search Logic Error:', error);
        return NextResponse.json({ items: [], error: 'Neural link unstable. Retrying...' });
    }
}
