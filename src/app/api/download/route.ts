import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Advanced Binary Resolver for Cross-Platform Stability
 */
function getBinaryPath(): string {
    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
    
    const root = process.cwd();
    const possiblePaths = [
        path.join(root, 'bin', binaryName),
        path.join(root, 'node_modules', 'youtube-dl-exec', 'bin', binaryName),
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
    }

    return binaryName; // Fallback to global
}

export async function POST(request: Request) {
    try {
        const { url, title, artist, thumbnail } = await request.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // 1. Setup Environment
        const ytDlpPath = getBinaryPath();
        const isWindows = process.platform === 'win32';

        const downloadsPath = path.join(os.homedir(), 'Downloads', 'OpenWave');
        if (!fs.existsSync(downloadsPath)) {
            fs.mkdirSync(downloadsPath, { recursive: true });
        }

        const safeTitle = (title || 'Unknown').replace(/[<>:"/\\|?*]/g, '');
        const safeArtist = (artist || 'Unknown').replace(/[<>:"/\\|?*]/g, '');
        const baseName = `${safeArtist} - ${safeTitle}`;
        const audioTemplate = path.join(downloadsPath, `${baseName}.%(ext)s`);
        const thumbPath = path.join(downloadsPath, `${baseName}.jpg`);

        // 2. Thumbnail Check
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
        const args = [
            url,
            '-f', 'bestaudio[ext=m4a]/bestaudio',
            '-o', audioTemplate,
            '--no-playlist',
            '--no-warnings'
        ];

        const downloadProcess = spawn(ytDlpPath, args, { shell: isWindows });
        let errorMessage = '';

        await new Promise((resolve, reject) => {
            downloadProcess.stderr.on('data', (data: Buffer) => {
                errorMessage += data.toString();
            });

            downloadProcess.on('error', (err: any) => {
                reject(new Error(`Failed to start download process: ${err.message}`));
            });

            downloadProcess.on('close', (code) => {
                if (code === 0) resolve(true);
                else reject(new Error(`yt-dlp engine failed with code ${code}: ${errorMessage}`));
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
