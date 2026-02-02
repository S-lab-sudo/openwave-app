import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET() {
    try {
        const downloadsPath = path.join(os.homedir(), 'Downloads', 'OpenWave');

        if (!fs.existsSync(downloadsPath)) {
            fs.mkdirSync(downloadsPath, { recursive: true });
            return NextResponse.json({ items: [], path: downloadsPath });
        }

        const files = fs.readdirSync(downloadsPath);
        // Supports more formats including standard yt-dlp defaults
        const musicFiles = files.filter(file =>
            ['.mp3', '.m4a', '.wav', '.flac', '.webm', '.opus'].includes(path.extname(file).toLowerCase())
        );

        const tracks = musicFiles.map((file, index) => {
            const filePath = path.join(downloadsPath, file);
            const stats = fs.statSync(filePath);
            const baseName = path.parse(file).name;

            // ROOT FIX: Check for multiple image extensions in case YouTube uses webp or others
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
            let thumbUrl = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&h=200&auto=format&fit=crop';

            for (const ext of imageExtensions) {
                const possibleCover = path.join(downloadsPath, `${baseName}${ext}`);
                if (fs.existsSync(possibleCover)) {
                    thumbUrl = `/api/stream-local?path=${encodeURIComponent(possibleCover)}`;
                    break;
                }
            }

            const parts = baseName.split(' - ');
            const artist = parts.length > 1 ? parts[0] : 'Local Artist';
            const title = parts.length > 1 ? parts.slice(1).join(' - ') : baseName;

            return {
                id: `local-${baseName}`,
                title: title,
                artist: artist,
                thumbnail: thumbUrl,
                duration: 0,
                downloadedAt: stats.birthtime.toLocaleDateString(),
                fileSize: `${(stats.size / (1024 * 1024)).toFixed(1)} MB`,
                isLocal: true,
                youtubeUrl: `/api/stream-local?path=${encodeURIComponent(filePath)}`,
                filePath: filePath
            };
        });

        return NextResponse.json({
            items: tracks,
            path: downloadsPath
        });

    } catch (error) {
        console.error('Failed to read local downloads:', error);
        return NextResponse.json({ error: 'Failed to read downloads' }, { status: 500 });
    }
}
