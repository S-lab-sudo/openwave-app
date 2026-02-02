import { NextResponse } from 'next/server';
import { logPlay } from '@/lib/taste';

export async function POST(request: Request) {
    try {
        const track = await request.json();

        if (!track || !track.id) {
            return NextResponse.json({ error: 'Invalid track data' }, { status: 400 });
        }

        await logPlay(track);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Log Play API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
