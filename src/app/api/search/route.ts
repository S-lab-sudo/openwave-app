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

    const cacheKey = `ow:search:v6:${type}:${query || 'global'}`;

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

        // RECOVERY STRATEGY V6: 
        // Use 'video' type exclusively with query augmentation. 
        // Internal library 'playlist' type is currently broken due to YouTube changes.
        const rawResults = await YouTube.search(type === 'playlist' ? `${query} playlist` : query!, { 
            limit: 30,
            safeSearch: true,
            type: 'video'
        }).catch(() => []);

        tracks = rawResults.map(v => {
            if (!v || !v.id) return null;
            
            // Fixed comparison: Ignore v.type (which is fixed to 'video') and use request type
            const isActuallyPlaylist = type === 'playlist';
            
            return {
                id: v.id,
                title: v.title || 'Unknown',
                artist: v.channel?.name || 'YouTube',
                thumbnail: v.thumbnail?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
                duration: Math.floor((v.duration || 0) / 1000),
                description: v.description || '',
                youtubeUrl: isActuallyPlaylist 
                    ? `https://www.youtube.com/playlist?list=${v.id}`
                    : `https://www.youtube.com/watch?v=${v.id}`,
                isPlaylist: isActuallyPlaylist,
                playlist_title: isActuallyPlaylist ? v.title : undefined,
                album: type === 'trending' ? 'Trending' : 'Search Result'
            } as YouTubeTrack;
        }).filter((t): t is YouTubeTrack => t !== null);

        if (tracks.length > 0) {
            await safeRedis.set(cacheKey, tracks, { ex: REDIS_TTL });
            searchCache.set(cacheKey, { data: tracks, timestamp: Date.now() });
            return NextResponse.json({ items: tracks, query, type, source: 'live:resilient-v6' });
        }

        return NextResponse.json({ items: [], query, type });

    } catch (error) {
        console.error('Deep Search Error:', error);
        return NextResponse.json({ 
            items: [], 
            error: 'No results found. Please try a different query.' 
        });
    }
}
