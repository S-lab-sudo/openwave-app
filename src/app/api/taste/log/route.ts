import { NextResponse } from 'next/server';
import { logPlay } from '@/lib/taste';

export async function POST(request: Request) {
    try {
        const { track, userId, guestId } = await request.json();

        if (!track || !track.id) {
            return NextResponse.json({ error: 'Invalid track data' }, { status: 400 });
        }

        await logPlay(track, userId, guestId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Log Play API Error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
