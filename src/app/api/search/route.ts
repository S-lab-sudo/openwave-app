import { NextResponse } from 'next/server';
import yts from 'yt-search';
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

    const cacheKey = `ow:search:v2:${type}:${query || 'global'}`;

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
            const billBoardKey = 'ow:billboard:hot100';
            const billboardData = await safeRedis.get<YouTubeTrack[]>(billBoardKey);
            if (billboardData) {
                return NextResponse.json({ items: billboardData, query, type, source: 'cache:billboard' });
            }
            
            // Fallback: Search for trending mix using JS search
            const r = await yts('Billboard Hot 100 Official Audio');
            tracks = r.videos.slice(0, 15).map(v => ({
                id: v.videoId,
                title: v.title,
                artist: v.author.name,
                thumbnail: v.image,
                duration: v.seconds,
                description: v.description,
                youtubeUrl: v.url,
                isPlaylist: false,
                album: 'Trending'
            }));
        } else if (type === 'playlist') {
            const r = await yts({ query: query + ' playlist', category: 'playlists' });
            tracks = r.playlists.slice(0, 15).map(p => ({
                id: p.listId,
                title: p.title,
                artist: p.author.name,
                thumbnail: p.image,
                duration: 0,
                description: '',
                youtubeUrl: p.url,
                isPlaylist: true,
                playlist_title: p.title
            }));
        } else if (type === 'playlist_tracks') {
            // yt-search doesn't retrieve all tracks in a playlist easily by ID alone, 
            // but for dynamic mixes, we usually search for the query and pick videos.
            const r = await yts(query!);
            tracks = r.videos.slice(0, 20).map(v => ({
                id: v.videoId,
                title: v.title,
                artist: v.author.name,
                thumbnail: v.image,
                duration: v.seconds,
                description: v.description,
                youtubeUrl: v.url,
                isPlaylist: false
            }));
        } else {
            // Standard Search
            const r = await yts(query!);
            tracks = r.videos.slice(0, 20).map(v => ({
                id: v.videoId,
                title: v.title,
                artist: v.author.name,
                thumbnail: v.image,
                duration: v.seconds,
                description: v.description,
                youtubeUrl: v.url,
                isPlaylist: false,
                album: 'Search Result'
            }));
        }

        if (tracks.length > 0) {
            await safeRedis.set(cacheKey, tracks, { ex: REDIS_TTL });
            searchCache.set(cacheKey, { data: tracks, timestamp: Date.now() });
            return NextResponse.json({ items: tracks, query, type, source: 'live:js-search' });
        }

        return NextResponse.json({ items: [], query, type });

    } catch (error) {
        console.error('JS Search Error:', error);
        return NextResponse.json({ items: [], error: 'Search synthesis failed' }, { status: 500 });
    }
}
