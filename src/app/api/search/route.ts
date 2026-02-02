import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { safeRedis } from '@/lib/upstash';

const searchCache = new Map<string, { data: YouTubeTrack[], timestamp: number }>();
// Cache for individual song searches (Artist + Title -> YT Result)
const trendingSongCache = new Map<string, YouTubeTrack>();
const CACHE_TTL = 1000 * 60 * 60 * 2; // 2 hours for stability
const WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

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
    let ytDlpPath = path.join(process.cwd(), 'bin', binaryName);

    // ROOT FIX: On Vercel (Linux), if the binary in /bin fails or is missing, 
    // we fallback to the environment's version or a global one.
    if (!isWindows && !fs.existsSync(ytDlpPath)) {
        ytDlpPath = 'yt-dlp'; 
    }

    return new Promise((resolve) => {
        const childProcess = spawn(ytDlpPath, args);
        let output = '';
        let errorOutput = '';

        childProcess.stdout.on('data', (data: Buffer) => {
            output += data.toString();
        });

        childProcess.stderr.on('data', (data: Buffer) => {
            errorOutput += data.toString();
        });

        childProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('yt-dlp failed:', errorOutput);
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

                        const isExcluded = type !== 'playlist' && ['countdown', 'predictions', 'top 20', 'top 50', 'top 10', 'chart hits', 'full album'].some(term => {
                            const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                            return regex.test(titleLower);
                        });

                        if (isExcluded) return null;

                        const isSongSearch = type === 'trending' || type === 'search';
                        const duration = Math.floor(json.duration || 0);
                        if (isSongSearch && duration > 720) return null;

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

        setTimeout(() => {
            childProcess.kill();
            resolve([]);
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

    const cacheKey = `${type}:${query || 'global'}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json({ items: cached.data, query, type });
    }

    try {
        let args: string[] = [];
        if (type === 'trending') {
            try {
                // 1. REDIS CHECK
                const redisKey = 'billboard_hot_100_v1';
                const cachedData = await safeRedis.get<any[]>(redisKey);
                if (cachedData && cachedData.length > 0) {
                    return NextResponse.json({ items: cachedData, query, type, source: 'cache:redis' });
                }

                // 2. FETCH
                const chartRes = await fetch('https://raw.githubusercontent.com/mhollingshead/billboard-hot-100/main/recent.json');
                const chartData = await chartRes.json() as { data: { song: string, artist: string, this_week: number }[] };
                const chartHits = chartData.data.slice(0, 50);

                const allTracks: YouTubeTrack[] = [];
                for (let i = 0; i < chartHits.length; i += 10) {
                    const batch = chartHits.slice(i, i + 10);
                    const batchResults = await Promise.all(
                        batch.map(async (song) => {
                            const hitArgs = [
                                `ytsearch1:"${song.song}" "${song.artist}" official audio -billboard -predictions -chart`,
                                '--dump-json',
                                '--flat-playlist',
                                '--no-playlist'
                            ];
                            const tracks = await runYtDlp(hitArgs, 'search');

                            const bestMatch = tracks.find((t) => {
                                const titleLower = t.title.toLowerCase();
                                const songLower = song.song.toLowerCase();
                                const artistLower = song.artist.toLowerCase();
                                return titleLower.includes(songLower) &&
                                    (titleLower.includes(artistLower) || t.artist.toLowerCase().includes(artistLower));
                            });

                            if (bestMatch) {
                                const finalSong: YouTubeTrack = { ...bestMatch };
                                finalSong.album = `Billboard Hot 100 #${song.this_week}`;
                                return finalSong;
                            }
                            return null;
                        })
                    );
                    allTracks.push(...batchResults.filter((t): t is YouTubeTrack => t !== null));
                }

                if (allTracks.length > 0) {
                    // 3. CACHE
                    await safeRedis.set(redisKey, JSON.stringify(allTracks), { ex: WEEK_IN_SECONDS });
                    return NextResponse.json({ items: allTracks, query, type, source: 'live:refreshed' });
                }
            } catch (e) {
                console.error("Billboard Redis/Fetch failed", e);
            }

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
            searchCache.set(cacheKey, { data: tracks, timestamp: Date.now() });
            return NextResponse.json({ items: tracks, query, type });
        }

        return NextResponse.json({ items: [], query, type });

    } catch (error: any) {
        console.error('Search API Route Error:', error);
        return NextResponse.json({ items: [], error: error.message }, { status: 500 });
    }
}
