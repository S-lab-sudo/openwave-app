/**
 * Server-only YouTube utilities.
 * These functions use Node.js modules and should ONLY be imported in API routes.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface Track {
    id: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration?: number;
    youtubeUrl: string;
    album?: string;
}

export interface Playlist {
    id: string;
    title: string;
    description: string;
    coverUrl: string;
    tracks: Track[];
}

const directSearchCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Server-side search function that uses yt-dlp directly.
 * Use this in API routes only.
 */
export async function searchYouTubeTracksDirect(query: string): Promise<Track[]> {
    const cacheKey = `tracks:${query}`;
    const cached = directSearchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    const ytDlpPath = path.join(process.cwd(), 'bin', 'yt-dlp.exe');
    if (!fs.existsSync(ytDlpPath)) {
        console.error('yt-dlp binary not found');
        return [];
    }

    return new Promise((resolve) => {
        const args = [
            `ytsearch10:${query}`,
            '--dump-json',
            '--flat-playlist',
            '--no-playlist'
        ];

        const proc = spawn(ytDlpPath, args);
        let output = '';

        proc.stdout.on('data', (data: Buffer) => {
            output += data.toString();
        });

        proc.on('close', (code: number) => {
            if (code !== 0) {
                return resolve([]);
            }

            try {
                const lines = output.trim().split('\n');
                const tracks = lines.map((line): Track | null => {
                    if (!line.trim()) return null;
                    try {
                        const json: any = JSON.parse(line);

                        // FILTER: Exclude long videos (Mixes/Compilations > 12 mins)
                        const duration = Math.floor(json.duration || 0);
                        if (duration > 720) return null;

                        return {
                            id: json.id,
                            title: json.title,
                            artist: json.uploader || json.channel || 'Unknown Artist',
                            thumbnail: json.thumbnail || `https://i.ytimg.com/vi/${json.id}/hqdefault.jpg`,
                            duration: duration,
                            youtubeUrl: `https://www.youtube.com/watch?v=${json.id}`,
                            album: 'Search Result'
                        };
                    } catch {
                        return null;
                    }
                }).filter((t): t is Track => t !== null);

                directSearchCache.set(cacheKey, { data: tracks, timestamp: Date.now() });
                resolve(tracks);
            } catch {
                resolve([]);
            }
        });

        setTimeout(() => {
            proc.kill();
            resolve([]);
        }, 10000);
    });
}

/**
 * Search for YouTube playlists directly using yt-dlp.
 * Returns curated playlists based on search query.
 */
export async function searchYouTubePlaylistsDirect(query: string, limit: number = 5): Promise<Playlist[]> {
    const ytDlpPath = path.join(process.cwd(), 'bin', 'yt-dlp.exe');
    if (!fs.existsSync(ytDlpPath)) {
        console.error('yt-dlp binary not found');
        return [];
    }

    return new Promise((resolve) => {
        const args = [
            `ytsearchplaylist${limit}:${query} playlist`,
            '--dump-json',
            '--flat-playlist'
        ];

        const proc = spawn(ytDlpPath, args);
        let output = '';

        proc.stdout.on('data', (data: Buffer) => {
            output += data.toString();
        });

        proc.on('close', (code: number) => {
            if (code !== 0) {
                return resolve([]);
            }

            try {
                const lines = output.trim().split('\n');
                const playlists = lines.map((line): Playlist | null => {
                    if (!line.trim()) return null;
                    try {
                        const json: any = JSON.parse(line);
                        return {
                            id: json.id,
                            title: json.title || 'Untitled Playlist',
                            description: json.description?.substring(0, 200) || `Curated playlist by ${json.uploader || 'YouTube'}`,
                            coverUrl: json.thumbnail || json.thumbnails?.[0]?.url || '',
                            tracks: [] // Tracks can be loaded when playlist is opened
                        };
                    } catch {
                        return null;
                    }
                }).filter((p): p is Playlist => p !== null);

                directSearchCache.set(`playlists:${query}`, { data: playlists, timestamp: Date.now() });
                resolve(playlists);
            } catch {
                resolve([]);
            }
        });

        setTimeout(() => {
            proc.kill();
            resolve([]);
        }, 15000);
    });
}
