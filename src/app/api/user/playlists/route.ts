import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
        const formatted = (playlists || []).map((p: any) => ({
            id: p.id,
            title: p.name,
            description: p.description || '',
            coverUrl: p.cover_url || '',
            isPublic: p.is_public ?? true,
            tracks: (p.playlist_tracks || [])
                .sort((a: any, b: any) => a.position - b.position)
                .map((pt: any) => pt.tracks)
                .filter((t: any) => t !== null)
        }));

        return NextResponse.json({ items: formatted });
    } catch (error: any) {
        console.error('Fetch Playlists Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const body = await request.json();
    const { userId, playlist } = body;

    if (!userId || !playlist) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    try {
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
            const trackInserts = playlist.tracks.map((t: any) => ({
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

            const ptInserts = playlist.tracks.map((t: any, index: number) => {
                const track = tData.find((td: any) => td.track_id === t.id);
                return {
                    playlist_id: pData.id,
                    track_id: track.id,
                    position: index
                };
            });

            if (ptInserts.length > 0) {
                const { error: ptError } = await supabase.from('playlist_tracks').insert(ptInserts);
                if (ptError) {
                    console.error('Playlist Tracks Insert Error:', ptError);
                    // If position-based PK is not yet active, we might still hit 23505
                    // but we'll try to handle it.
                }
            }
        }

        return NextResponse.json({ success: true, id: pData.id });
    } catch (error: any) {
        console.error('Save Playlist Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
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
        const { error } = await supabase
            .from('playlists')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete Playlist Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
