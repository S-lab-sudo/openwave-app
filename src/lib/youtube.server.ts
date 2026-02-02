/**
 * Server-only YouTube utilities.
 * These functions use Node.js modules and should ONLY be imported in API routes.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { safeRedis } from './upstash';
import YouTube from 'youtube-sr';

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
 */
export async function searchYouTubeTracksDirect(query: string): Promise<Track[]> {
    const cacheKey = `tracks:v4:${query}`;
    
    // 1. Redis Cache Check
    const cached = await safeRedis.get<Track[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    try {
        const results = await YouTube.search(query, { limit: 15, type: 'video' });
        const tracks = results.map(v => ({
            id: v.id || '',
            title: v.title || 'Unknown Title',
            artist: (v.channel?.name || 'Unknown Artist').replace(/ - Topic$/, '').trim(),
            thumbnail: v.thumbnail?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
            duration: Math.floor((v.duration || 0) / 1000),
            youtubeUrl: `https://www.youtube.com/watch?v=${v.id}`,
            album: 'Search Result'
        }));

        if (tracks.length > 0) {
            safeRedis.set(cacheKey, tracks, { ex: REDIS_TTL });
        }
        return tracks;
    } catch (e) {
        console.error('YouTube-SR Search Direct Resilient Failed:', e);
        return [];
    }
}

/**
 * PRODUCTION-STABLE Playlist Search with Fallback logic
 */
export async function searchYouTubePlaylistsDirect(query: string, limit: number = 5): Promise<Playlist[]> {
    const cacheKey = `playlists:v4:${query}`;
    
    // 1. Redis Cache Check
    const cached = await safeRedis.get<Playlist[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    try {
        // Try native playlist search first
        const results = await YouTube.search(query, { limit, type: 'playlist' });
        const playlists = results.map(p => ({
            id: p.id || '',
            title: p.title || 'Untitled Playlist',
            description: `Curated collection by ${p.channel?.name || 'YouTube'}`,
            coverUrl: p.thumbnail?.url || '',
            tracks: []
        }));

        if (playlists.length > 0) {
            safeRedis.set(cacheKey, playlists, { ex: REDIS_TTL });
            return playlists;
        }
        return [];
    } catch (e) {
        console.warn('Playlist Direct Search failed, falling back to video-search strategy', e);
        // Resilient fallback
        try {
            const results = await YouTube.search(`${query} playlist`, { limit, type: 'video' });
            return results.map(v => ({
                id: v.id || '',
                title: v.title || 'YouTube Mix',
                description: `Collection including ${v.title}`,
                coverUrl: v.thumbnail?.url || '',
                tracks: []
            }));
        } catch (err) {
            return [];
        }
    }
}

/**
 * EXPORT BINARY RESOLVER FOR DOWNLOADS
 */
export { getBinaryPath };
