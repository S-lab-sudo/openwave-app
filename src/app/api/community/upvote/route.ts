import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const playlist = await request.json();

        if (!playlist || !playlist.id) {
            return NextResponse.json({ error: 'Invalid playlist data' }, { status: 400 });
        }

        // 1. Upsert the playlist in the community_playlists table
        // This ensures the playlist exists and updates its metadata
        const { data: existing, error: fetchError } = await supabase
            .from('community_playlists')
            .select('upvote_count')
            .eq('id', playlist.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching playlist:', fetchError);
        }

        const newUpvoteCount = (existing?.upvote_count || 0) + 1;

        const { error: upsertError } = await supabase
            .from('community_playlists')
            .upsert({
                id: playlist.id,
                title: playlist.title,
                description: playlist.description,
                cover_url: playlist.coverUrl || playlist.thumbnail,
                upvote_count: newUpvoteCount,
                is_public: playlist.isPublic ?? true,
                last_upvoted_at: new Date().toISOString()
            });

        if (upsertError) {
            console.error('Upsert error:', upsertError);
            return NextResponse.json({ error: upsertError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, upvotes: newUpvoteCount });
    } catch (error: any) {
        console.error('Community Upvote Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
