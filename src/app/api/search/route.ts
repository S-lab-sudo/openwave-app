import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { safeRedis } from '@/lib/upstash';

const searchCache = new Map<string, { data: YouTubeTrack[], timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 2; // 2 hours in-memory
const REDIS_TTL = 60 * 60 * 24; // 24 hours in Redis

// Terms to exclude from results to keep search "clean"
const EXCLUSION_TERMS = ['lyrics', 'cover', 'live', 'acoustic', 'remix', 'playlist', 'countdown', 'predictions', 'top 20', 'top 50', 'top 10', 'chart hits', 'full album'];

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

async function runYtDlp(args: string[], type: string): Promise<YouTubeTrack[]> {
    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
    
    // Try project root bin first
    let ytDlpPath = path.join(process.cwd(), 'bin', binaryName);

    // ROOT FIX: Fallback logic for all platforms
    if (!fs.existsSync(ytDlpPath)) {
        console.warn(`Local yt-dlp not found at ${ytDlpPath}. Falling back to global 'yt-dlp' command.`);
        ytDlpPath = 'yt-dlp'; 
    }

    return new Promise((resolve) => {
        let childProcess;
        try {
            childProcess = spawn(ytDlpPath, args);
        } catch (e) {
            console.error('Critical spawn error:', e);
            return resolve([]);
        }

        let output = '';
        let errorOutput = '';

        childProcess.stdout.on('data', (data: Buffer) => {
            output += data.toString();
        });

        childProcess.stderr.on('data', (data: Buffer) => {
            errorOutput += data.toString();
        });

        childProcess.on('error', (err: any) => {
            if (err.code === 'ENOENT') {
                console.error('yt-dlp binary not found. Please ensure it is in the /bin folder or installed globally.');
            } else {
                console.error('Failed to start yt-dlp:', err);
            }
            resolve([]);
        });

        childProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('yt-dlp failed with code:', code, errorOutput);
                return resolve([]);
            }

            try {
                const lines = output.trim().split('\n');
                const tracks = lines.map((line) => {
                    if (!line.trim()) return null;
                    try {
                        const json = JSON.parse(line);
                        if (!json || !json.id) return null;

                        const titleLower = (json.title || '').toLowerCase();
                        if (!titleLower) return null;

                        // Filter out garbage results
                        const isExcluded = type !== 'playlist' && ['countdown', 'predictions', 'top 20', 'top 50', 'top 10', 'chart hits', 'full album'].some(term => {
                            const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                            return regex.test(titleLower);
                        });

                        if (isExcluded) return null;

                        const duration = Math.floor(json.duration || 0);
                        // Filter out long mixes for normal songs
                        if ((type === 'trending' || type === 'search') && duration > 720) return null;

                        const cleanTitle = (title: string) => {
                            return title
                                .replace(/\s*\(?(?:official|lyric|lyrics|video|audio|music|hd|hq|original|karaoke|with lyrics)\)?\s*/gi, ' ')
                                .replace(/\s*\[(?:official|lyric|lyrics|video|audio|music|hd|hq|original|karaoke|with lyrics)\]\s*/gi, ' ')
                                .replace(/\s*\|\s*(?:official|lyric|lyrics|video|audio|music|hd|hq|original|karaoke|with lyrics).*/gi, '')
                                .replace(/\s*\(\s*\)\s*/g, ' ')
                                .replace(/\s*\[\s*\]\s*/g, ' ')
                                .trim();
                        };

                        const isPlaylistResult = json._type === 'playlist' || (json.id && (json.id as string).startsWith('PL'));

                        if (type === 'playlist' && !isPlaylistResult) return null;
                        if (type !== 'playlist' && isPlaylistResult) return null;

                        let highResThumbnail = json.thumbnail;
                        if (json.thumbnails && json.thumbnails.length > 0) {
                            const best = (json.thumbnails as { width: number, url: string }[]).sort((a, b) => (b.width || 0) - (a.width || 0))[0];
                            highResThumbnail = best.url || highResThumbnail;
                        }

                        const fallbackUrl = isPlaylistResult
                            ? 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800'
                            : `https://i.ytimg.com/vi/${json.id}/hqdefault.jpg`;

                        return {
                            id: json.id,
                            title: cleanTitle(json.title),
                            artist: (json.uploader || json.channel || json.channel_name || json.uploader_name || 'OpenWave Curator').replace(/ - Topic$/, '').replace(/VEVO$/, '').trim(),
                            thumbnail: highResThumbnail || fallbackUrl,
                            duration: isPlaylistResult ? 0 : duration,
                            description: json.description ? json.description.substring(0, 500) : '',
                            youtubeUrl: isPlaylistResult
                                ? `https://www.youtube.com/playlist?list=${json.id}`
                                : `https://www.youtube.com/watch?v=${json.id}`,
                            isPlaylist: isPlaylistResult,
                            playlist_title: json.playlist_title
                        } as YouTubeTrack;
                    } catch (e) {
                        return null;
                    }
                }).filter((t): t is YouTubeTrack => t !== null);

                resolve(tracks);
            } catch (err) {
                resolve([]);
            }
        });

        // Kill process after 30 seconds to prevent leak
        setTimeout(() => {
            if (childProcess.exitCode === null) {
                childProcess.kill();
                resolve([]);
            }
        }, 30000);
    });
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'search';

    if (!query && type !== 'trending') {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const cacheKey = `ow:search:${type}:${query || 'global'}`;

    // 1. IN-MEMORY CACHE (Super fast)
    const inMem = searchCache.get(cacheKey);
    if (inMem && Date.now() - inMem.timestamp < CACHE_TTL) {
        return NextResponse.json({ items: inMem.data, query, type, source: 'cache:memory' });
    }

    // 2. REDIS CACHE (Persistent across restarts)
    const cachedRedis = await safeRedis.get<YouTubeTrack[]>(cacheKey);
    if (cachedRedis && cachedRedis.length > 0) {
        // Sync to memory for next time
        searchCache.set(cacheKey, { data: cachedRedis, timestamp: Date.now() });
        return NextResponse.json({ items: cachedRedis, query, type, source: 'cache:redis' });
    }

    try {
        let args: string[] = [];

        if (type === 'trending') {
            // Billboard logic is already cached within its own block usually, 
            // but let's keep it here for specialized handling.
            const billBoardKey = 'ow:billboard:hot100';
            const billboardData = await safeRedis.get<YouTubeTrack[]>(billBoardKey);
            if (billboardData) {
                return NextResponse.json({ items: billboardData, query, type, source: 'cache:billboard' });
            }
            
            // If no billboard cache, we fall back to a standard trending search
            args = [
                `ytsearch15:Billboard Hot 100 Official Audio ${new Date().getFullYear()}`,
                '--dump-json',
                '--flat-playlist',
                '--no-playlist'
            ];
        } else if (type === 'playlist') {
            args = [
                `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' playlist')}&sp=EgIQAw%253D%253D`,
                '--dump-json',
                '--flat-playlist',
                '--playlist-end', '20'
            ];
        } else if (type === 'playlist_tracks') {
            args = [
                `https://www.youtube.com/playlist?list=${query}`,
                '--dump-json',
                '--flat-playlist'
            ];
        } else if (type === 'metadata') {
            args = [
                query as string,
                '--dump-json',
                '--flat-playlist',
                '--no-playlist'
            ];
        } else {
            args = [
                `ytsearch15:${query}`,
                '--dump-json',
                '--flat-playlist',
                '--no-playlist'
            ];
        }

        const tracks = await runYtDlp(args, type);

        if (tracks.length > 0) {
            // Persist to Redis and Memory
            await safeRedis.set(cacheKey, tracks, { ex: REDIS_TTL });
            searchCache.set(cacheKey, { data: tracks, timestamp: Date.now() });
            return NextResponse.json({ items: tracks, query, type, source: 'live:scrape' });
        }

        return NextResponse.json({ items: [], query, type });

    } catch (error) {
        console.error('Search API error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({ items: [], error: 'External service timeout' }, { status: 503 });
    }
}
