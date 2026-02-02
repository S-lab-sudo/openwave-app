import { Track } from '@/store/usePlayerStore';
import { DynamicPlaylist } from '@/store/useContentStore';

export interface YouTubeMetadata {
    title: string;
    author_name: string;
    thumbnail_url: string;
    video_id: string;
    duration?: number;
}

/**
 * CLEAN & ROBUST YOUTUBE ENGINE
 * No API Keys required. Everything flows through our localized YT-DLP proxy.
 */

export async function fetchYouTubeMetadata(url: string): Promise<YouTubeMetadata> {
    try {
        const response = await fetch(`/api/search?type=metadata&q=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error('Metadata fetch failed');

        const data = await response.json();
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
        console.error('Metadata fetch error:', error);
        throw error;
    }
}

export async function searchYouTubePlaylists(query: string): Promise<any[]> {
    try {
        const response = await fetch(`/api/search?type=playlist&q=${encodeURIComponent(query)}`);
        if (!response.ok) return [];

        const data = await response.json();
        return (data.items || []).map((item: any) => ({
            id: item.id,
            title: item.title,
            artist: item.artist,
            thumbnail: item.thumbnail,
            youtubeUrl: item.youtubeUrl,
            trackCount: item.duration || 0, // yt-dlp often puts playlist count in duration field for flat-playlist
            isPlaylist: true
        }));
    } catch (error) {
        console.error('Playlist search failed:', error);
        return [];
    }
}

export async function searchYouTubeTracks(query: string): Promise<Track[]> {
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) return [];

        const data = await response.json();
        return (data.items || []).map((item: any) => ({
            id: item.id,
            title: item.title,
            artist: item.artist,
            thumbnail: item.thumbnail,
            youtubeUrl: item.youtubeUrl,
            duration: item.duration,
            album: 'Search Result'
        }));
    } catch (error) {
        console.error('Search failed:', error);
        return [];
    }
}


export async function getTrendingTracks(regionCode: string = 'US'): Promise<Track[]> {
    try {
        // We use our specialized trending endpoint in the search API
        const response = await fetch(`/api/search?type=trending`);
        if (!response.ok) return [];

        const data = await response.json();
        return (data.items || []).map((item: any) => ({
            id: item.id,
            title: item.title,
            artist: item.artist,
            thumbnail: item.thumbnail,
            youtubeUrl: item.youtubeUrl,
            duration: item.duration,
            album: 'Trending'
        }));
    } catch (error) {
        console.error('Trending fetch failed:', error);
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

export async function getDynamicEditorsPicks() {
    const hour = new Date().getHours();

    let timeKey: keyof typeof TIME_CONTEXTS = 'AFTERNOON';
    if (hour >= 5 && hour < 12) timeKey = 'MORNING';
    else if (hour >= 18 && hour < 22) timeKey = 'EVENING';
    else if (hour >= 22 || hour < 5) timeKey = 'NIGHT';

    const queries = [...TIME_CONTEXTS[timeKey], ...GENRE_KEYWORDS].sort(() => 0.5 - Math.random()).slice(0, 5);

    const picks = await Promise.all(
        queries.map(async (query) => {
            const tracks = await searchYouTubeTracks(query);
            if (tracks.length > 0) {
                return {
                    id: `dynamic-${query.toLowerCase().replace(/ /g, '-')}`,
                    title: query,
                    description: `Fresh mix curated for ${query.toLowerCase()}.`,
                    coverUrl: tracks[0].thumbnail,
                    tracks: tracks
                };
            }
            return null;
        })
    );

    return picks.filter(Boolean) as DynamicPlaylist[];
}
