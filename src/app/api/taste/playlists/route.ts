import { NextResponse } from 'next/server';
import { getUserTasteProfile } from '@/lib/taste';
import { searchYouTubePlaylistsDirect } from '@/lib/youtube.server';

/**
 * SMART PLAYLIST SYNTHESIZER
 * Dynamically generates playlists based on the user's current 12D Vibe.
 */
export async function GET(request: Request) {
    try {
        const tasteProfile = await getUserTasteProfile();

        // Build a dynamic search query based on the human-friendly profile description
        // Example: "Explosive Grooves", "Serene Aesthetics", etc.
        const mixKeywords = 'music playlist mix';
        const query = tasteProfile.description || 'aesthetic chill';

        const finalQuery = `${query} ${mixKeywords}`;

        // Search for curated YouTube playlists that match this specific vibe
        const playlists = await searchYouTubePlaylistsDirect(finalQuery, 4);

        return NextResponse.json({
            items: playlists,
            source: 'vector_mood_synthesis',
            debug_vibe: tasteProfile.description
        });

    } catch (error) {
        console.error('Playlist Recommendation API Error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({ items: [], error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

