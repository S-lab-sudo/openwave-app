import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { id, isPublic, title, description, coverUrl } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
        }

        // Only update if the playlist already exists in community_playlists
        // We don't want to force-add every private user playlist to community leaderboard
        const { data: existing } = await supabase
            .from('community_playlists')
            .select('id')
            .eq('id', id)
            .single();

        if (existing) {
            const { error: updateError } = await supabase
                .from('community_playlists')
                .update({
                    is_public: isPublic,
                    title: title,
                    description: description,
                    cover_url: coverUrl
                })
                .eq('id', id);

            if (updateError) {
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
