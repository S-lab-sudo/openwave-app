import { supabaseAdmin } from './supabase-admin';
import { safeRedis } from './upstash';

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
export async function logPlay(
    track: { id: string, title: string, artist: string, thumbnail?: string },
    userId?: string,
    guestId?: string
) {
    try {
        const songVector = estimateSongVector(track);

        // 1. Sync to Supabase Primary Brain (Item Tower)
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-project')) {
            try {
                // Upsert global track info
                await supabaseAdmin.from('tracks').upsert({
                    track_id: track.id,
                    title: track.title,
                    artist: track.artist,
                    thumbnail_url: track.thumbnail,
                    embedding_12d: `[${songVector.join(',')}]`,
                    created_at: new Date().toISOString()
                }, { onConflict: 'track_id' });

                // RECORD ACTUAL HISTORY ENTRY (Deduplicated Back-to-Back)
                const { data: lastEntry } = await supabaseAdmin
                    .from('listening_history')
                    .select('id, track_metadata')
                    .eq(userId ? 'user_id' : 'guest_id', userId || guestId)
                    .order('played_at', { ascending: false })
                    .limit(1)
                    .single();

                const isDuplicate = lastEntry && (lastEntry.track_metadata as { id?: string })?.id === track.id;

                if (isDuplicate) {
                    // Just update the timestamp to bring it to the top
                    await supabaseAdmin
                        .from('listening_history')
                        .update({ played_at: new Date().toISOString() })
                        .eq('id', lastEntry.id);
                } else {
                    // New track or separated by others, insert new
                    await supabaseAdmin.from('listening_history').insert({
                        user_id: userId || null,
                        guest_id: guestId || null,
                        track_metadata: track,
                        played_at: new Date().toISOString()
                    });
                }
            } catch (e) {
                console.warn('Supabase history sync skipped', e instanceof Error ? e.message : 'Unknown error');
            }
        }

        // 2. Reinforce User Taste (The "Moving Average" update)
        const vibeId = userId || guestId || 'anonymous-pro-session';
        const redisKey = `user_vibe:${vibeId}`;

        let nextVibe: number[];

        if (process.env.UPSTASH_REDIS_REST_URL?.includes('your-upstash')) {
            nextVibe = songVector;
        } else {
            try {
                const currentVibeRaw = await safeRedis.get<number[]>(redisKey);
                if (!currentVibeRaw) {
                    nextVibe = songVector;
                } else {
                    const learningRate = 0.15;
                    nextVibe = currentVibeRaw.map((val, i) => val + (songVector[i] - val) * learningRate);
                }
                await safeRedis.set(redisKey, nextVibe, { ex: 60 * 60 * 24 * 7 });
            } catch (redisError) {
                console.error('Upstash sync fallback', redisError instanceof Error ? redisError.message : 'Unknown error');
                nextVibe = songVector;
            }
        }

        return { success: true, vector: nextVibe };
    } catch (error) {
        console.error('Core log play failed:', error instanceof Error ? error.message : 'Unknown error');
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
            userVibe = await safeRedis.get<number[]>(`user_vibe:${userId}`);
        } catch {
            userVibe = null;
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
        console.error('Recommendation synthesis failed:', error instanceof Error ? error.message : 'Unknown error');
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
            vector: Array(12).fill(0.5)
        };
    }

    try {
        const userId = 'anonymous-pro-session';
        let userVibe: number[] | null = null;

        try {
            userVibe = await safeRedis.get<number[]>(`user_vibe:${userId}`);
        } catch {
            userVibe = null;
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
