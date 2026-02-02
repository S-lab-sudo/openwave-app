import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const guestId = searchParams.get('guestId');

        if (!userId && !guestId) {
            return NextResponse.json({ error: 'Identity required' }, { status: 400 });
        }

        let query = supabaseAdmin
            .from('listening_history')
            .select('track_metadata, played_at')
            .order('played_at', { ascending: false })
            .limit(50);

        if (userId) {
            query = query.eq('user_id', userId);
        } else {
            query = query.eq('guest_id', guestId);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Map back to standard track format
        const history = data.map((item: any) => item.track_metadata);

        return NextResponse.json({ history });
    } catch (error: any) {
        console.error('Fetch History Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
