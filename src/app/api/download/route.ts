import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(request: Request) {
    try {
        const { url, title, artist, thumbnail } = await request.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const downloadsPath = path.join(os.homedir(), 'Downloads', 'OpenWave');
        if (!fs.existsSync(downloadsPath)) {
            fs.mkdirSync(downloadsPath, { recursive: true });
        }

        const safeTitle = (title || 'Unknown').replace(/[<>:"/\\|?*]/g, '');
        const safeArtist = (artist || 'Unknown').replace(/[<>:"/\\|?*]/g, '');
        const baseName = `${safeArtist} - ${safeTitle}`;
        const audioTemplate = path.join(downloadsPath, `${baseName}.%(ext)s`);

        // We'll check for multiple image formats
        const thumbPath = path.join(downloadsPath, `${baseName}.jpg`);

        const ytDlpPath = path.join(process.cwd(), 'bin', 'yt-dlp.exe');

        // ROOT FIX PART 1: Always try to download the thumbnail if it doesn't exist
        // even if the music file already exists.
        if (thumbnail && !fs.existsSync(thumbPath)) {
            try {
                const thumbRes = await fetch(thumbnail);
                if (thumbRes.ok) {
                    const buffer = await thumbRes.arrayBuffer();
                    fs.writeFileSync(thumbPath, Buffer.from(buffer));
                }
            } catch (e) {
                console.warn('Failed to save thumbnail:', e);
            }
        }

        // Check if audio file already exists (check common extensions)
        const possibleExtensions = ['.m4a', '.mp3', '.webm', '.opus'];
        let audioExists = false;
        let existingPath = '';
        for (const ext of possibleExtensions) {
            const p = path.join(downloadsPath, `${baseName}${ext}`);
            if (fs.existsSync(p)) {
                audioExists = true;
                existingPath = p;
                break;
            }
        }

        if (audioExists) {
            return NextResponse.json({
                success: true,
                message: 'Audio already exists, updated artwork if missing',
                path: existingPath
            });
        }

        if (!fs.existsSync(ytDlpPath)) {
            throw new Error('yt-dlp binary not found.');
        }

        // 2. Download Audio
        const args = [
            url,
            '-f', 'bestaudio[ext=m4a]/bestaudio',
            '-o', audioTemplate,
            '--no-playlist',
            '--no-warnings'
        ];

        const downloadProcess = spawn(ytDlpPath, args);
        let errorMessage = '';

        await new Promise((resolve, reject) => {
            downloadProcess.stderr.on('data', (data) => {
                errorMessage += data.toString();
            });

            downloadProcess.on('close', (code) => {
                if (code === 0) resolve(true);
                else reject(new Error(`yt-dlp failed: ${errorMessage}`));
            });
        });

        return NextResponse.json({
            success: true,
            message: 'Download complete with artwork',
            path: downloadsPath
        });

    } catch (error: any) {
        console.error('Download failed:', error);
        return NextResponse.json({ error: 'Download failed', details: error.message }, { status: 500 });
    }
}
