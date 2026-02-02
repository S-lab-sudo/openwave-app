import { Track } from '@/store/usePlayerStore';
import { DynamicPlaylist } from '@/store/useContentStore';

export interface YouTubeMetadata {
    title: string;
    author_name: string;
    thumbnail_url: string;
    video_id: string;
    duration?: number;
}

interface YouTubeResultItem {
    id: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: number;
    youtubeUrl: string;
}

/**
 * CLEAN & ROBUST YOUTUBE ENGINE
 * No API Keys required. Everything flows through our localized YT-DLP proxy.
 */

export async function fetchYouTubeMetadata(url: string): Promise<YouTubeMetadata> {
    try {
        const response = await fetch(`/api/search?type=metadata&q=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error('Metadata fetch failed');

        const data = await response.json() as { items: YouTubeResultItem[] };
        const item = data.items?.[0];

        if (!item) throw new Error('No metadata found for URL');

        return {
            title: item.title,
            author_name: item.artist,
            thumbnail_url: item.thumbnail,
            video_id: item.id,
            duration: item.duration,
        };
    } catch (error) {
        console.error('Metadata fetch error:', error instanceof Error ? error.message : 'Unknown error');
        throw error;
    }
}

export async function searchYouTubePlaylists(query: string): Promise<Track[]> {
    try {
        const response = await fetch(`/api/search?type=playlist&q=${encodeURIComponent(query)}`);
        if (!response.ok) return [];

        const data = await response.json() as { items: YouTubeResultItem[] };
        return (data.items || []).map((item) => ({
            id: item.id,
            title: item.title,
            artist: item.artist,
            thumbnail: item.thumbnail,
            youtubeUrl: item.youtubeUrl,
            duration: 0,
            album: 'Playlist',
            isPlaylist: true
        } as unknown as Track));
    } catch (error) {
        console.error('Playlist search failed:', error instanceof Error ? error.message : 'Unknown error');
        return [];
    }
}

export async function searchYouTubeTracks(query: string): Promise<Track[]> {
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) return [];

        const data = await response.json() as { items: YouTubeResultItem[] };
        return (data.items || []).map((item) => ({
            id: item.id,
            title: item.title,
            artist: item.artist,
            thumbnail: item.thumbnail,
            youtubeUrl: item.youtubeUrl,
            duration: item.duration,
            album: 'Search Result'
        } as Track));
    } catch (error) {
        console.error('Search failed:', error instanceof Error ? error.message : 'Unknown error');
        return [];
    }
}


export async function getTrendingTracks(regionCode: string = 'US'): Promise<Track[]> {
    try {
        const response = await fetch(`/api/search?type=trending`);
        if (!response.ok) return [];

        const data = await response.json() as { items: YouTubeResultItem[] };
        return (data.items || []).map((item) => ({
            id: item.id,
            title: item.title,
            artist: item.artist,
            thumbnail: item.thumbnail,
            youtubeUrl: item.youtubeUrl,
            duration: item.duration,
            album: 'Trending'
        } as Track));
    } catch (error) {
        console.error('Trending fetch failed:', error instanceof Error ? error.message : 'Unknown error');
        return [];
    }
}

const currentYear = new Date().getFullYear();

const TIME_CONTEXTS = {
    MORNING: ['Morning acoustic', 'Coffee shop music', 'Positive vibes', 'Motivation music'],
    AFTERNOON: [`Pop hits ${currentYear}`, 'Work focus beats', 'Energy boost', 'Summer vibes'],
    EVENING: ['Chill lo-fi', 'Sunset vibes', 'Acoustic covers', 'Indie pop'],
    NIGHT: ['Late night drive', 'Deep house', 'Sad songs', 'Slow reverb'],
};

const GENRE_KEYWORDS = [
    'Underrated Indie', 'Future Bass', 'Alternative Rock', 'R&B Soul',
    'Synthwave 80s', 'UK Garage', 'Latin Hits', 'K-Pop Rising'
];

export async function getDynamicEditorsPicks(): Promise<DynamicPlaylist[]> {
    const hour = new Date().getHours();

    let timeKey: keyof typeof TIME_CONTEXTS = 'AFTERNOON';
    if (hour >= 5 && hour < 12) timeKey = 'MORNING';
    else if (hour >= 18 && hour < 22) timeKey = 'EVENING';
    else if (hour >= 22 || hour < 5) timeKey = 'NIGHT';

    const queries = [...TIME_CONTEXTS[timeKey], ...GENRE_KEYWORDS].sort(() => 0.5 - Math.random()).slice(0, 5);

    const picks: (DynamicPlaylist | null)[] = [];
    for (const query of queries) {
        const tracks = await searchYouTubeTracks(query);
        if (tracks.length > 0) {
            picks.push({
                id: `dynamic-${query.toLowerCase().replace(/ /g, '-')}`,
                title: query,
                description: `Fresh mix curated for ${query.toLowerCase()}.`,
                coverUrl: tracks[0].thumbnail,
                tracks: tracks
            } as DynamicPlaylist);
        }
        // Small delay to let the event loop breathe
        await new Promise(r => setTimeout(r, 100));
    }

    return picks.filter((p): p is DynamicPlaylist => p !== null);
}
