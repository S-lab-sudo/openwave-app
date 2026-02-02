import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
        return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    try {
        // Security: Ensure we are only reading from the OpenWave folder
        // This prevents users from trying to read system files via the API
        if (!filePath.includes('OpenWave')) {
            return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
        }

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const stats = fs.statSync(filePath);
        const fileName = path.basename(filePath);
        const fileExtension = path.extname(filePath).toLowerCase();

        // Determine content type
        let contentType = 'audio/mpeg';
        if (fileExtension === '.m4a') contentType = 'audio/mp4';
        if (fileExtension === '.wav') contentType = 'audio/wav';
        if (fileExtension === '.flac') contentType = 'audio/flac';

        // Read the file as a stream
        const fileStream = fs.createReadStream(filePath);

        // Return the stream as a response
        return new NextResponse(fileStream as any, {
            headers: {
                'Content-Type': contentType,
                'Content-Length': stats.size.toString(),
                'Accept-Ranges': 'bytes',
                'Content-Disposition': `inline; filename="${fileName}"`,
            },
        });

    } catch (error) {
        console.error('Failed to stream local file:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
