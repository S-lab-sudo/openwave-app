/**
 * Server-only YouTube utilities.
 * These functions use Node.js modules and should ONLY be imported in API routes.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { safeRedis } from './upstash';
import yts from 'yt-search';

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

const REDIS_TTL = 60 * 60 * 24; // 24 hours

/**
 * Advanced Binary Resolver for Cross-Platform Stability (FOR DOWNLOADS ONLY)
 */
function getBinaryPath(): string {
    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
    
    // Check local project bin
    const root = process.cwd();
    const possiblePaths = [
        path.join(root, 'bin', binaryName),
        path.join(root, 'node_modules', 'youtube-dl-exec', 'bin', binaryName),
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
    }

    return binaryName; 
}

/**
 * PRODUCTION-STABLE Search Logic
 * Replaced python dependent scraper with JS engine.
 */
export async function searchYouTubeTracksDirect(query: string): Promise<Track[]> {
    const cacheKey = `tracks:v2:${query}`;
    
    // 1. Redis Cache Check
    const cached = await safeRedis.get<Track[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    try {
        const r = await yts(query);
        const tracks = r.videos.slice(0, 15).map(v => ({
            id: v.videoId,
            title: v.title,
            artist: v.author.name.replace(/ - Topic$/, '').trim(),
            thumbnail: v.image,
            duration: v.seconds,
            youtubeUrl: v.url,
            album: 'Search Result'
        }));

        if (tracks.length > 0) {
            safeRedis.set(cacheKey, tracks, { ex: REDIS_TTL });
        }
        return tracks;
    } catch (e) {
        console.error('JS Search Direct Failed:', e);
        return [];
    }
}

/**
 * PRODUCTION-STABLE Playlist Search
 */
export async function searchYouTubePlaylistsDirect(query: string, limit: number = 5): Promise<Playlist[]> {
    const cacheKey = `playlists:v2:${query}`;
    
    // 1. Redis Cache Check
    const cached = await safeRedis.get<Playlist[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    try {
        const r = await yts({ query: query + ' playlist', category: 'playlists' });
        const playlists = r.playlists.slice(0, limit).map(p => ({
            id: p.listId,
            title: p.title,
            description: `Curated collection by ${p.author.name}`,
            coverUrl: p.image,
            tracks: []
        }));

        if (playlists.length > 0) {
            safeRedis.set(cacheKey, playlists, { ex: REDIS_TTL });
        }
        return playlists;
    } catch (e) {
        console.error('JS Playlist Search Direct Failed:', e);
        return [];
    }
}

/**
 * EXPORT BINARY RESOLVER FOR DOWNLAODS
 */
export { getBinaryPath };
