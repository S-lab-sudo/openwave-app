/**
 * Server-only YouTube utilities.
 * These functions use Node.js modules and should ONLY be imported in API routes.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { safeRedis } from './upstash';

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

interface YouTubeRawData {
    id: string;
    title?: string;
    uploader?: string;
    channel?: string;
    duration?: number;
    thumbnail?: string;
    description?: string;
    thumbnails?: { url: string }[];
    _type?: string;
}

const REDIS_TTL = 60 * 60 * 24; // 24 hours

/**
 * Server-side search function that uses yt-dlp directly.
 * Use this in API routes only.
 */
export async function searchYouTubeTracksDirect(query: string): Promise<Track[]> {
    const cacheKey = `tracks:${query}`;
    
    // 1. Redis Cache Check
    const cached = await safeRedis.get<Track[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
    let ytDlpPath = path.join(process.cwd(), 'bin', binaryName);

    if (!fs.existsSync(ytDlpPath)) {
        ytDlpPath = 'yt-dlp'; // Fallback to global
    }

    return new Promise((resolve) => {
        const args = [
            `ytsearch10:${query}`,
            '--dump-json',
            '--flat-playlist',
            '--no-playlist'
        ];

        let proc;
        try {
            proc = spawn(ytDlpPath, args);
        } catch (e) {
            console.error('Failed to spawn yt-dlp:', e);
            return resolve([]);
        }

        let output = '';

        proc.stdout.on('data', (data: Buffer) => {
            output += data.toString();
        });

        proc.on('error', (err: any) => {
            console.error(`yt-dlp spawn error (${ytDlpPath}):`, err.message);
            resolve([]);
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
                        const json = JSON.parse(line) as YouTubeRawData;

                        // FILTER: Exclude long videos (Mixes/Compilations > 12 mins)
                        const duration = Math.floor(json.duration || 0);
                        if (duration > 720) return null;

                        return {
                            id: json.id,
                            title: json.title || 'Unknown Title',
                            artist: (json.uploader || json.channel || 'Unknown Artist').replace(/ - Topic$/, '').trim(),
                            thumbnail: json.thumbnail || `https://i.ytimg.com/vi/${json.id}/hqdefault.jpg`,
                            duration: duration,
                            youtubeUrl: `https://www.youtube.com/watch?v=${json.id}`,
                            album: 'Search Result'
                        };
                    } catch {
                        return null;
                    }
                }).filter((t): t is Track => t !== null);

                if (tracks.length > 0) {
                    safeRedis.set(cacheKey, tracks, { ex: REDIS_TTL });
                }
                resolve(tracks);
            } catch {
                resolve([]);
            }
        });

        setTimeout(() => {
            if (proc.exitCode === null) {
                proc.kill();
                resolve([]);
            }
        }, 15000);
    });
}

/**
 * Search for YouTube playlists directly using yt-dlp.
 * Returns curated playlists based on search query.
 */
export async function searchYouTubePlaylistsDirect(query: string, limit: number = 5): Promise<Playlist[]> {
    const cacheKey = `playlists:${query}`;
    
    // 1. Redis Cache Check
    const cached = await safeRedis.get<Playlist[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
    let ytDlpPath = path.join(process.cwd(), 'bin', binaryName);

    if (!fs.existsSync(ytDlpPath)) {
        ytDlpPath = 'yt-dlp'; // Fallback to global
    }

    return new Promise((resolve) => {
        const args = [
            `ytsearchplaylist${limit}:${query} playlist`,
            '--dump-json',
            '--flat-playlist'
        ];

        let proc;
        try {
            proc = spawn(ytDlpPath, args);
        } catch (e) {
            console.error('Failed to spawn yt-dlp:', e);
            return resolve([]);
        }

        let output = '';

        proc.stdout.on('data', (data: Buffer) => {
            output += data.toString();
        });
        
        proc.on('error', (err: any) => {
            console.error(`yt-dlp spawn error (${ytDlpPath}):`, err.message);
            resolve([]);
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
                        const json = JSON.parse(line) as YouTubeRawData;
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

                if (playlists.length > 0) {
                    safeRedis.set(cacheKey, playlists, { ex: REDIS_TTL });
                }
                resolve(playlists);
            } catch {
                resolve([]);
            }
        });

        setTimeout(() => {
            if (proc.exitCode === null) {
                proc.kill();
                resolve([]);
            }
        }, 15000);
    });
}
