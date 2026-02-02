import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CommunityPlaylistEntry } from '@/types/database';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        if (!supabase) {
            return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
        }

        if (id) {
            const { data, error } = await supabase
                .from('community_playlists')
                .select('*')
                .eq('id', id)
                .single();

            if (error && error.code !== 'PGRST116') {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ item: data });
        }

        let query = supabase
            .from('community_playlists')
            .select('*');

        // Defensive check: Try to filter by is_public, but don't crash if column isn't there yet
        const { data, error } = await query
            .eq('is_public', true)
            .order('upvote_count', { ascending: false })
            .limit(10);

        if (error) {
            // If the error is "column does not exist" (42703), fall back to unfiltered load
            if (error.code === '42703') {
                const fallback = await supabase
                    .from('community_playlists')
                    .select('*')
                    .order('upvote_count', { ascending: false })
                    .limit(10);

                if (fallback.error) throw fallback.error;
                return NextResponse.json({ items: formatPlaylists(fallback.data as unknown as CommunityPlaylistEntry[]) });
            }
            console.error('Fetch community playlists error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ items: formatPlaylists(data as unknown as CommunityPlaylistEntry[]) });
    } catch (error) {
        console.error('Community Fetch Error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

// Helper to keep the main GET clean
function formatPlaylists(data: CommunityPlaylistEntry[]) {
    return (data || []).map(p => ({
        id: p.id,
        title: p.title,
        description: p.description || '',
        coverUrl: p.cover_url,
        upvotes: p.upvote_count,
        tracks: []
    }));
}
