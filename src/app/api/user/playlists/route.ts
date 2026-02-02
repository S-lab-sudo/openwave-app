import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SupabasePlaylist, SupabaseTrack } from '@/types/database';
import { Track } from '@/store/usePlayerStore';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
        if (!supabase) {
            return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
        }

        const { data: playlists, error: pError } = await supabase
            .from('playlists')
            .select(`
                *,
                playlist_tracks (
                    position,
                    tracks (*)
                )
            `)
            .eq('user_id', userId);

        if (pError) throw pError;

        // Formatter: Convert DB structure back to app's DynamicPlaylist format
        const formatted = (playlists as unknown as SupabasePlaylist[] || []).map(p => ({
            id: p.id,
            title: p.name,
            description: p.description || '',
            coverUrl: p.cover_url || '',
            isPublic: p.is_public ?? true,
            tracks: (p.playlist_tracks || [])
                .sort((a, b) => a.position - b.position)
                .map(pt => {
                    const t = pt.tracks as unknown as SupabaseTrack;
                    if (!t) return null;
                    return {
                        id: t.track_id,
                        title: t.title,
                        artist: t.artist,
                        thumbnail: t.thumbnail_url, // ROOT FIX: Map thumbnail_url to thumbnail
                        duration: t.duration,
                        album: 'Collection'
                    } as Track;
                })
                .filter(t => t !== null)
        }));

        return NextResponse.json({ items: formatted });
    } catch (error) {
        console.error('Fetch Playlists Error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const body = await request.json() as { userId: string, playlist: { id: string, title: string, description: string, coverUrl: string, isPublic?: boolean, tracks: Track[] } };
    const { userId, playlist } = body;

    if (!userId || !playlist) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    try {
        if (!supabase) throw new Error('Supabase not initialized');

        // 1. Upsert the playlist
        const { data: pData, error: pError } = await supabase
            .from('playlists')
            .upsert({
                id: playlist.id.length > 30 ? playlist.id : undefined, // Check if it's a UUID
                user_id: userId,
                name: playlist.title,
                description: playlist.description,
                cover_url: playlist.coverUrl,
                is_public: playlist.isPublic ?? true,
            }, { onConflict: 'id' })
            .select()
            .single();

        if (pError) throw pError;

        // 2. Sync tracks
        if (playlist.tracks && playlist.tracks.length > 0) {
            // First, ensure all tracks exist in tracks table
            const trackInserts = playlist.tracks.map((t: Track) => ({
                track_id: t.id,
                title: t.title,
                artist: t.artist,
                thumbnail_url: t.thumbnail,
                duration: t.duration
            }));

            const { data: tData, error: tError } = await supabase
                .from('tracks')
                .upsert(trackInserts, { onConflict: 'track_id' })
                .select();

            if (tError) throw tError;

            // Delete old tracks and insert new ones for this playlist
            await supabase.from('playlist_tracks').delete().eq('playlist_id', pData.id);

            const ptInserts = playlist.tracks.map((t: Track, index: number) => {
                const track = ((tData as unknown) as SupabaseTrack[]).find((td) => td.track_id === t.id);
                if (!track) return null;
                return {
                    playlist_id: pData.id,
                    track_id: track.id,
                    position: index
                };
            }).filter(item => item !== null);

            if (ptInserts.length > 0) {
                const { error: ptError } = await supabase.from('playlist_tracks').insert(ptInserts);
                if (ptError) {
                    console.error('Playlist Tracks Insert Error:', ptError);
                }
            }
        }

        return NextResponse.json({ success: true, id: pData.id });
    } catch (error) {
        console.error('Save Playlist Error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    try {
        if (!supabase) throw new Error('Supabase not initialized');

        const { error } = await supabase
            .from('playlists')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Playlist Error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
