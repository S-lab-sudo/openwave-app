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

        // 1. Setup Environment
        const isWindows = process.platform === 'win32';
        const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
        let ytDlpPath = path.join(process.cwd(), 'bin', binaryName);

        if (!isWindows && !fs.existsSync(ytDlpPath)) {
            ytDlpPath = 'yt-dlp';
        }

        const downloadsPath = path.join(os.homedir(), 'Downloads', 'OpenWave');
        if (!fs.existsSync(downloadsPath)) {
            fs.mkdirSync(downloadsPath, { recursive: true });
        }

        const safeTitle = (title || 'Unknown').replace(/[<>:"/\\|?*]/g, '');
        const safeArtist = (artist || 'Unknown').replace(/[<>:"/\\|?*]/g, '');
        const baseName = `${safeArtist} - ${safeTitle}`;
        const audioTemplate = path.join(downloadsPath, `${baseName}.%(ext)s`);
        const thumbPath = path.join(downloadsPath, `${baseName}.jpg`);

        // 2. Thumbnail Check (Root Fix Part 1)
        if (thumbnail && !fs.existsSync(thumbPath)) {
            try {
                const thumbRes = await fetch(thumbnail);
                if (thumbRes.ok) {
                    const buffer = await thumbRes.arrayBuffer();
                    fs.writeFileSync(thumbPath, Buffer.from(buffer));
                }
            } catch (e) {
                console.warn('Failed to save thumbnail:', e instanceof Error ? e.message : 'Unknown error');
            }
        }

        // 3. De-duplication check
        const possibleExtensions = ['.m4a', '.mp3', '.webm', '.opus'];
        let existingPath = '';
        for (const ext of possibleExtensions) {
            const p = path.join(downloadsPath, `${baseName}${ext}`);
            if (fs.existsSync(p)) {
                existingPath = p;
                break;
            }
        }

        if (existingPath) {
            return NextResponse.json({
                success: true,
                message: 'Audio already exists, updated artwork if missing',
                path: existingPath
            });
        }

        // 4. Download Execution
        if (!isWindows && ytDlpPath === 'yt-dlp') {
            // Check if global exists
            try {
                // Testing spawn
            } catch (e) {
                throw new Error('yt-dlp engine not found in environment.');
            }
        } else if (!fs.existsSync(ytDlpPath)) {
            throw new Error('yt-dlp binary not found in bin/ directory.');
        }

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
            downloadProcess.stderr.on('data', (data: Buffer) => {
                errorMessage += data.toString();
            });

            downloadProcess.on('close', (code) => {
                if (code === 0) resolve(true);
                else reject(new Error(`yt-dlp engine failed: ${errorMessage}`));
            });
        });

        return NextResponse.json({
            success: true,
            message: 'Download complete with artwork',
            path: downloadsPath
        });

    } catch (error) {
        console.error('Download System Error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({ 
            error: 'Download failed', 
            details: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
}
