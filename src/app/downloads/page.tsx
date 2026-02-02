'use client';

import { motion } from 'framer-motion';
import { Download, Trash2, FolderOpen, Loader2, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrackRow } from '@/components/playlist/TrackRow';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

export default function DownloadsPage() {
    const { playTrack } = usePlayerStore();
    const [tracks, setTracks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [folderPath, setFolderPath] = useState('');

    useEffect(() => {
        fetchDownloads();
    }, []);

    const fetchDownloads = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/downloads');
            const data = await res.json();
            setTracks(data.items || []);
            setFolderPath(data.path || '');
        } catch (error) {
            console.error('Failed to load downloads:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const totalSize = tracks.reduce((acc, t) => acc + parseFloat(t.fileSize || '0'), 0).toFixed(1);

    return (
        <div className="container mx-auto px-8 py-10 space-y-12">
            <motion.header
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
                <div className="space-y-2">
                    <motion.h1
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.2 }}
                        className="text-2xl font-black text-white flex items-center gap-3"
                    >
                        <Download className="w-6 h-6 text-white" />
                        Downloads
                    </motion.h1>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                        className="flex items-center gap-2 text-white/40 text-sm font-medium"
                    >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span className="truncate max-w-xs md:max-w-none">{folderPath || 'Loading path...'}</span>
                    </motion.div>
                </div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.2 }}
                    className="flex items-center gap-3"
                >
                    <Badge variant="outline" className="px-5 py-2 h-auto bg-white/5 border-white/5 text-[10px] font-bold uppercase tracking-widest text-white/60">
                        {tracks.length} Tracks • {totalSize} MB
                    </Badge>
                </motion.div>
            </motion.header>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="w-8 h-8 text-white/10 animate-spin" />
                    <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">Scanning folder...</p>
                </div>
            ) : tracks.length > 0 ? (
                <div className="bg-[#0c0c0c] rounded-[24px] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto] gap-4 px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 border-b border-white/5">
                        <div className="w-8">#</div>
                        <div>Track Name</div>
                        <div className="w-40">Modified Date</div>
                        <div className="w-24 text-right">Size</div>
                    </div>
                    <div className="divide-y divide-white/[0.03]">
                        {tracks.map((track, index) => (
                            <div key={track.id} className="group relative">
                                <TrackRow
                                    track={track as Track}
                                    index={index}
                                    onPlay={() => playTrack(track as Track)}
                                    className="bg-transparent border-none rounded-none hover:bg-white/[0.03] py-5 px-8 transition-colors"
                                />
                                <div className="absolute right-40 top-1/2 -translate-y-1/2 hidden lg:block pointer-events-none">
                                    <span className="text-[10px] text-white/30 font-medium">{track.downloadedAt}</span>
                                </div>
                                <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:block pointer-events-none">
                                    <span className="text-[10px] font-mono text-white/60 font-bold">{track.fileSize}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                        <Music className="w-6 h-6 text-white/20" />
                    </div>
                    <h2 className="text-lg font-bold text-white/80 mb-2">Folder is empty</h2>
                    <p className="text-xs text-white/30 max-w-xs mx-auto">
                        Add music files to <code className="bg-white/5 px-1.5 py-0.5 rounded text-white/50">Downloads/OpenWave</code> to see them here.
                    </p>
                    <Button
                        variant="outline"
                        onClick={fetchDownloads}
                        className="mt-8 border-white/10 text-[10px] uppercase font-bold tracking-widest hover:bg-white/5 cursor-pointer"
                    >
                        Refresh Library
                    </Button>
                </div>
            )}
        </div>
    );
}
