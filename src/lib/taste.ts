import { supabaseAdmin } from './supabase-admin';
import { redis } from './upstash';

// --- THE 12-DIMENSIONAL MATRIX ENGINE ---
// Dimensions: 1. danceability, 2. energy, 3. key, 4. loudness, 5. mode, 6. speechiness, 
// 7. acousticness, 8. instrumentalness, 9. liveness, 10. valence, 11. tempo, 12. duration

export interface Vector12 extends Array<number> { }

/**
 * Heuristic analysis to generate a 12D vector from metadata.
 * Order matches the Supabase schema and pgvector storage.
 */
export function estimateSongVector(track: { title: string, artist: string }): number[] {
    const text = (track.title + ' ' + track.artist).toLowerCase();

    // 1. Feature detection
    const isDance = /remix|club|dance|disco|techno|house|party|bounce/.test(text);
    const isHighEnergy = /rock|metal|trap|drill|fast|hype|power/.test(text);
    const isAcoustic = /acoustic|piano|unplugged|organic|nature|folk/.test(text);
    const isInstrumental = /inst|instrumental|beat|type beat|bgm/.test(text);
    const isChill = /lofi|lo-fi|chill|ambient|smooth|relax/.test(text);

    return [
        isDance ? 0.8 : 0.4,          // danceability
        isHighEnergy ? 0.9 : (isChill ? 0.2 : 0.5), // energy
        0.5,                          // key (normalized)
        isHighEnergy ? 0.8 : 0.5,     // loudness
        0.5,                          // mode
        0.1,                          // speechiness
        isAcoustic ? 0.9 : 0.2,       // acousticness
        isInstrumental ? 0.9 : 0.1,   // instrumentalness
        0.2,                          // liveness
        isChill ? 0.3 : 0.7,          // valence (mood)
        isHighEnergy ? 0.8 : (isChill ? 0.3 : 0.5), // tempo
        0.5                           // duration
    ];
}

/**
 * LOG PLAY: The heartbeat of the recommendation engine.
 */
export async function logPlay(track: { id: string, title: string, artist: string, thumbnail?: string }) {
    try {
        const songVector = estimateSongVector(track);

        // 1. Sync to Supabase Primary Brain (Item Tower)
        // Safety check: Skip if placeholders are still present
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-project')) {
            console.log('Taste Engine: Supabase setup pending. Skipping vector sync.');
        } else {
            try {
                await supabaseAdmin.from('tracks').upsert({
                    spotify_id: track.id,
                    title: track.title,
                    artist: track.artist,
                    thumbnail_url: track.thumbnail,
                    embedding_12d: `[${songVector.join(',')}]`,
                    created_at: new Date().toISOString()
                }, { onConflict: 'spotify_id' });
            } catch (e) {
                console.warn('Supabase sync skipped (offline mode)');
            }
        }

        // 2. Reinforce User Taste (The "Moving Average" update)
        const userId = 'anonymous-pro-session';
        const redisKey = `user_vibe:${userId}`;

        let nextVibe: number[];

        // Safety check for Upstash
        if (process.env.UPSTASH_REDIS_REST_URL?.includes('your-upstash')) {
            console.log('Taste Engine: Upstash setup pending. Using local session vibe.');
            (global as any).fallback_vibe = songVector;
            nextVibe = songVector;
        } else {
            try {
                const currentVibeRaw = await redis.get(redisKey) as number[] | null;
                if (!currentVibeRaw) {
                    nextVibe = songVector;
                } else {
                    const learningRate = 0.15;
                    nextVibe = currentVibeRaw.map((val, i) => val + (songVector[i] - val) * learningRate);
                }
                await redis.set(redisKey, nextVibe, { ex: 60 * 60 * 24 * 7 });
            } catch (redisError) {
                console.error('Upstash is down, falling back to session-only vibe.');
                // Fallback: We keep the vibe in a global variable for this server instance
                // In a real prod app, you might use an encrypted cookie for this fallback
                (global as any).fallback_vibe = songVector;
                nextVibe = songVector;
            }
        }

        return { success: true, vector: nextVibe };
    } catch (error) {
        console.error('Core log play failed:', error);
        return { success: false };
    }
}

/**
 * FETCH RECOMMENDATIONS: The "Two-Tower" Vector Search.
 */
export async function getPersonalizedRecommendations(limit: number = 10) {
    try {
        const userId = 'anonymous-pro-session';
        let userVibe: number[] | null = null;

        try {
            userVibe = await redis.get(`user_vibe:${userId}`) as number[] | null;
        } catch {
            userVibe = (global as any).fallback_vibe || null;
        }

        if (!userVibe) return [];

        const { data, error } = await supabaseAdmin.rpc('match_tracks', {
            query_embedding: `[${userVibe.join(',')}]`,
            match_threshold: 0.3, // Lower threshold for more results
            match_count: limit,
        });

        if (error) {
            console.error('Vector Search Error:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Recommendation synthesis failed:', error);
        return [];
    }
}

/**
 * Returns a human-friendly description of the user's current Vibe.
 */
export async function getUserTasteProfile() {
    // Safety check: Skip if placeholders are present
    const isSupabaseSetup = !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-project');
    const isUpstashSetup = !process.env.UPSTASH_REDIS_REST_URL?.includes('your-upstash');

    if (!isSupabaseSetup || !isUpstashSetup) {
        return {
            description: "Developing Taste",
            topGenders: ["Pop"],
            energy: 0.5,
            mood: 0.5,
            vector: (global as any).fallback_vibe || Array(12).fill(0.5)
        };
    }

    try {
        const userId = 'anonymous-pro-session';
        let userVibe: number[] | null = null;

        try {
            userVibe = await redis.get(`user_vibe:${userId}`) as number[] | null;
        } catch {
            userVibe = (global as any).fallback_vibe || null;
        }

        if (!userVibe) return { description: 'Discovering...' };

        const [dance, energy, , , , , acoustic, , , mood] = userVibe;

        let profile = '';
        if (energy > 0.6) profile += 'Explosive ';
        else if (energy < 0.4) profile += 'Serene ';

        if (mood > 0.6) profile += 'Uplifting ';
        else if (mood < 0.4) profile += 'Melancholic ';

        if (dance > 0.7) profile += 'Grooves';
        else if (acoustic > 0.7) profile += 'Organic Sounds';
        else profile += 'Aesthetics';

        return {
            description: profile,
            vector: userVibe
        };
    } catch {
        return { description: 'Minimalist' };
    }
}
