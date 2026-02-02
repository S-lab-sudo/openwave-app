import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const playlist = await request.json();

        if (!playlist || !playlist.id) {
            return NextResponse.json({ error: 'Invalid playlist data' }, { status: 400 });
        }

        const { data: existing, error: fetchError } = await supabase
            .from('community_playlists')
            .select('upvote_count')
            .eq('id', playlist.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
        }

        const newUpvoteCount = Math.max(0, (existing?.upvote_count || 0) - 1);

        const { error: upsertError } = await supabase
            .from('community_playlists')
            .upsert({
                id: playlist.id,
                title: playlist.title,
                description: playlist.description,
                cover_url: playlist.coverUrl || playlist.thumbnail,
                upvote_count: newUpvoteCount,
                is_public: playlist.isPublic ?? true
            });

        if (upsertError) {
            return NextResponse.json({ error: upsertError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, upvotes: newUpvoteCount });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
