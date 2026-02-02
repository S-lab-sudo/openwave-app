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

    const cacheKey = `ow:search:v4:${type}:${query || 'global'}`;

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

        if (type === 'trending') {
            const billBoardKey = 'ow:billboard:hot100_v2';
            const billboardData = await safeRedis.get<YouTubeTrack[]>(billBoardKey);
            if (billboardData) {
                return NextResponse.json({ items: billboardData, query, type, source: 'cache:billboard' });
            }
            
            // Trending search via youtube-sr (Video type is the most stable)
            try {
                const results = await YouTube.search('Billboard Hot 100 Official Audio', { limit: 15, type: 'video' });
                tracks = results.map(v => ({
                    id: v.id || '',
                    title: v.title || 'Unknown Title',
                    artist: v.channel?.name || 'YouTube',
                    thumbnail: v.thumbnail?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
                    duration: Math.floor((v.duration || 0) / 1000),
                    description: v.description || '',
                    youtubeUrl: `https://www.youtube.com/watch?v=${v.id}`,
                    isPlaylist: false,
                    album: 'Trending'
                }));
            } catch (e) {
                console.error("Trending fetch failed", e);
            }
        } else if (type === 'playlist') {
            try {
                // Try specialized playlist search
                const results = await YouTube.search(query!, { limit: 15, type: 'playlist' });
                tracks = results.map(p => ({
                    id: p.id || '',
                    title: p.title || 'Untitled Playlist',
                    artist: p.channel?.name || 'YouTube Curator',
                    thumbnail: p.thumbnail?.url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800',
                    duration: 0,
                    description: '',
                    youtubeUrl: `https://www.youtube.com/playlist?list=${p.id}`,
                    isPlaylist: true,
                    playlist_title: p.title
                }));
            } catch (e) {
                console.warn("Playlist search crashed, falling back to video search with query mod", e);
                // Fallback: Search for videos but add "playlist" to the query
                const results = await YouTube.search(`${query} playlist`, { limit: 15, type: 'video' });
                tracks = results.map(v => ({
                    id: v.id || '',
                    title: v.title || 'Unknown Playlist',
                    artist: v.channel?.name || 'YouTube',
                    thumbnail: v.thumbnail?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
                    duration: 0,
                    description: '',
                    youtubeUrl: `https://www.youtube.com/watch?v=${v.id}`,
                    isPlaylist: true,
                    playlist_title: v.title
                }));
            }
        } else {
            // Standard Video Search
            const results = await YouTube.search(query!, { limit: 20, type: 'video' });
            tracks = results.map(v => ({
                id: v.id || '',
                title: v.title || 'Unknown Title',
                artist: v.channel?.name || 'Unknown Artist',
                thumbnail: v.thumbnail?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
                duration: Math.floor((v.duration || 0) / 1000),
                description: v.description || '',
                youtubeUrl: `https://www.youtube.com/watch?v=${v.id}`,
                isPlaylist: false,
                album: 'Search Result'
            }));
        }

        if (tracks.length > 0) {
            await safeRedis.set(cacheKey, tracks, { ex: REDIS_TTL });
            searchCache.set(cacheKey, { data: tracks, timestamp: Date.now() });
            return NextResponse.json({ items: tracks, query, type, source: 'live:sr-search-resilient' });
        }

        return NextResponse.json({ items: [], query, type });

    } catch (error) {
        console.error('Final Search Error:', error);
        return NextResponse.json({ items: [], error: 'Search failed, please try again' }, { status: 500 });
    }
}
