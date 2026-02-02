import { NextResponse } from 'next/server';
import { getPersonalizedRecommendations, getUserTasteProfile } from '@/lib/taste';
import { searchYouTubeTracksDirect } from '@/lib/youtube.server';

/**
 * GOD-TIER RECOMMENDATION SYNTHESIZER
 * Combines 12D Vector Similarity with smart exploration.
 */
export async function GET(request: Request) {
    try {
        const tasteProfile = await getUserTasteProfile();

        // 1. Attempt High-Precision Vector Search (Primary Brain)
        const vectorTracks = await getPersonalizedRecommendations(12);

        if (vectorTracks.length > 5) {
            // Transform Supabase results to Track interface
            const recommended = vectorTracks.map((t: any) => ({
                id: t.spotify_id,
                title: t.title,
                artist: t.artist,
                thumbnail: t.thumbnail_url || `https://i.ytimg.com/vi/${t.spotify_id}/hqdefault.jpg`,
                youtubeUrl: `https://www.youtube.com/watch?v=${t.spotify_id}`,
                album: 'Picked for You'
            }));

            return NextResponse.json({
                items: recommended,
                source: 'vector_similarity',
                debug_taste: tasteProfile.description
            });
        }

        // 2. Fallback to Content-Based Search (Hybrid/Cold Start)
        let moodQuery = 'trending aesthetic music';
        if (tasteProfile.vector) {
            // Intelligent keyword synthesis from the user vibe
            const [dance, energy, , , , , acoustic, , , mood] = tasteProfile.vector;

            if (energy > 0.7) moodQuery = 'high energy phonk trap';
            else if (energy < 0.3) moodQuery = 'chill lofi hip hop coffee';

            if (mood > 0.7) moodQuery += ' happy pop hits';
            else if (mood < 0.3) moodQuery += ' sad emotional indie';

            if (acoustic > 0.6) moodQuery += ' acoustic unplugged';
        }

        const fallbackTracks = await searchYouTubeTracksDirect(moodQuery);

        return NextResponse.json({
            items: fallbackTracks.slice(0, 10),
            source: 'behavioral_fallback',
            debug_taste: tasteProfile.description
        });

    } catch (error: any) {
        console.error('Recommendation Engine Error:', error);
        return NextResponse.json({ items: [], error: 'Synthesis failed' }, { status: 500 });
    }
}


