'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
    Play,
    Pause,
    SkipForward,
    SkipBack,
    Repeat,
    Shuffle,
    Volume2,
    ListMusic,
    Share2,
    Heart,
    ChevronDown,
    X,
    Disc,
    Loader2,
    DownloadCloud,
    CheckCircle
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useRouter } from 'next/navigation';
import { cn, formatDuration } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';

type DrawerTab = 'recommendations' | 'playlists';

export function FullPlayer() {
    const {
        currentTrack,
        isPlaying,
        progress,
        volume,
        queue,
        isFullPlayerOpen,
        setIsPlaying,
        setIsFullPlayerOpen,
        setProgress,
        setSeekTo,
        setVolume,
        nextTrack,
        prevTrack,
        shuffle,
        toggleShuffle,
        repeat,
        toggleRepeat,
        playTrack,
        addToQueue,
        activeCollection
    } = usePlayerStore();

    const router = useRouter();
    const [isSideDrawerOpen, setIsSideDrawerOpen] = useState(true); // Open by default
    const [drawerTab, setDrawerTab] = useState<DrawerTab>('recommendations');
    const [recommendations, setRecommendations] = useState<Track[]>([]);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [isLoadingRecs, setIsLoadingRecs] = useState(false);
    const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
    const [recError, setRecError] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isIdle, setIsIdle] = useState(false);
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const { toast } = useToast();

    // Idle Detection Logic
    useEffect(() => {
        const handleActivity = () => {
            setIsIdle(false);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

            if (isFullPlayerOpen) {
                idleTimerRef.current = setTimeout(() => {
                    setIsIdle(true);
                }, 2000);
            }
        };

        if (isFullPlayerOpen) {
            window.addEventListener('mousemove', handleActivity);
            window.addEventListener('mousedown', handleActivity);
            window.addEventListener('keydown', handleActivity);
            window.addEventListener('wheel', handleActivity);
            window.addEventListener('touchmove', handleActivity);
            window.addEventListener('scroll', handleActivity, true); // Capture phase for non-bubbling scroll
            handleActivity(); // Refresh timer on mount/open
        } else {
            setIsIdle(false);
        }

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('mousedown', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('wheel', handleActivity);
            window.removeEventListener('touchmove', handleActivity);
            window.removeEventListener('scroll', handleActivity, true);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [isFullPlayerOpen]);

    // Fetch recommendations/playlists when drawer opens or track changes
    useEffect(() => {
        if (currentTrack && isFullPlayerOpen) {
            if (drawerTab === 'recommendations') fetchRecommendations();
            if (drawerTab === 'playlists') fetchPlaylists();
        }
    }, [currentTrack?.id, drawerTab, isFullPlayerOpen]);

    const fetchPlaylists = async () => {
        if (!currentTrack) return;
        setIsLoadingPlaylists(true);
        try {
            const { searchYouTubePlaylists } = await import('@/lib/youtube');
            const results = await searchYouTubePlaylists(`${currentTrack.artist} playlist`);
            setPlaylists(results);
        } catch (error) {
            console.error('Failed to fetch playlists:', error);
        } finally {
            setIsLoadingPlaylists(false);
        }
    };

    const fetchRecommendations = async () => {
        // Recommendations are now strictly manual or for a different tab
        if (!currentTrack) return;
        setIsLoadingRecs(true);
        try {
            const { searchYouTubeTracks } = await import('@/lib/youtube');
            const results = await searchYouTubeTracks(`${currentTrack.artist} music`);
            setRecommendations(results.slice(0, 10));
        } catch (error) {
            setRecError(true);
        } finally {
            setIsLoadingRecs(false);
        }
    };

    const handlePlayRecommendation = (track: Track) => {
        playTrack(track);
    };

    const handleDownload = async () => {
        if (!currentTrack) return;

        setIsDownloading(true);
        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: currentTrack.youtubeUrl,
                    title: currentTrack.title,
                    artist: currentTrack.artist,
                    thumbnail: currentTrack.thumbnail
                })
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Download Complete",
                    description: `Saved to Downloads/OpenWave`,
                });
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Download failed:', error);
            toast({
                title: "Download Failed",
                description: "Something went wrong while saving the file.",
                variant: "destructive"
            });
        } finally {
            setIsDownloading(false);
        }
    };

    if (!currentTrack) return null;

    return (
        <AnimatePresence>
            {isFullPlayerOpen && (
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-hidden flex"
                >
                    {/* Background Glow - More subtle */}
                    <div
                        className="absolute inset-0 opacity-10 blur-3xl scale-110 pointer-events-none z-0"
                        style={{
                            backgroundImage: `url(${currentTrack.thumbnail})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    />

                    {/* MAIN PLAYER AREA */}
                    <motion.div
                        layout
                        initial={false}
                        animate={{
                            width: isSideDrawerOpen && !isIdle ? "65%" : "100%",
                        }}
                        transition={{
                            duration: 1.4,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                        className="relative z-10 flex flex-col h-full overflow-hidden"
                    >
                        {/* Header */}
                        <motion.header
                            animate={{ opacity: isIdle ? 0 : 1, y: isIdle ? -20 : 0 }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                            className="flex items-center justify-between px-6 py-4"
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsFullPlayerOpen(false)}
                                className="rounded-full bg-white/5 hover:bg-white/10 cursor-pointer"
                            >
                                <ChevronDown className="w-6 h-6 text-white/70" />
                            </Button>
                            <div className="text-center flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Playing from Queue</p>
                                <p className="text-xs font-medium text-white/60">{queue.length} tracks</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleDownload}
                                    disabled={isDownloading}
                                    className="rounded-full bg-white/5 hover:bg-white/10 cursor-pointer disabled:opacity-50"
                                >
                                    {isDownloading ? (
                                        <Loader2 className="w-5 h-5 text-white/70 animate-spin" />
                                    ) : (
                                        <DownloadCloud className="w-5 h-5 text-white/70" />
                                    )}
                                </Button>
                                <Button variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/10">
                                    <Share2 className="w-5 h-5 text-white/70" />
                                </Button>
                            </div>
                        </motion.header>

                        {/* Main Visuals & Controls */}
                        <main className="flex-1 flex flex-col items-center justify-center px-8 w-full mx-auto relative">
                            <div className="w-full max-w-lg flex flex-col items-center gap-12">
                                {/* Album Art Container */}
                                <motion.div
                                    layout
                                    animate={{
                                        scale: isIdle ? 1.3 : 1,
                                        y: isIdle ? 20 : 0,
                                        boxShadow: isIdle
                                            ? "0 60px 120px -20px rgba(0,0,0,0.8)"
                                            : "0 20px 60px -10px rgba(0,0,0,0.4)"
                                    }}
                                    transition={{
                                        duration: 1.8,
                                        ease: [0.22, 1, 0.36, 1]
                                    }}
                                    className="relative aspect-square w-full max-w-[340px] rounded-[48px] overflow-hidden bg-black/20"
                                >
                                    <motion.img
                                        layout
                                        src={currentTrack.thumbnail || undefined}
                                        alt={currentTrack.title}
                                        className={cn(
                                            "w-full h-full object-cover transition-all duration-1000",
                                            !isPlaying && "scale-[0.98] grayscale-[0.3]",
                                            isIdle ? "brightness-110" : "brightness-100"
                                        )}
                                    />
                                </motion.div>

                                {/* Track Info */}
                                <motion.div
                                    animate={{ opacity: isIdle ? 0 : 1, y: isIdle ? 10 : 0 }}
                                    transition={{ duration: 0.8 }}
                                    className="w-full space-y-1 text-center"
                                >
                                    <h1 className="text-xl font-bold text-white truncate">{currentTrack.title}</h1>
                                    <button
                                        onClick={() => {
                                            setIsFullPlayerOpen(false);
                                            router.push(`/search?q=${encodeURIComponent(currentTrack.artist)}`);
                                        }}
                                        className="text-sm text-white/50 truncate hover:text-white transition-colors cursor-pointer"
                                    >
                                        {currentTrack.artist}
                                    </button>
                                </motion.div>

                                {/* Progress - Minimal style */}
                                <motion.div
                                    animate={{
                                        width: isIdle ? '110%' : '100%',
                                        y: isIdle ? 20 : 0
                                    }}
                                    transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }}
                                    className="w-full space-y-4"
                                >
                                    <Slider
                                        value={[progress]}
                                        max={100}
                                        step={0.01}
                                        onValueChange={(val) => {
                                            setProgress(val[0]);
                                            setSeekTo(val[0]);
                                        }}
                                        className={cn("py-2 transition-all", isIdle ? "opacity-40" : "opacity-100")}
                                    />
                                    <motion.div
                                        animate={{ opacity: isIdle ? 0 : 1 }}
                                        className="flex justify-between text-[10px] font-mono text-white/30"
                                    >
                                        <span>{formatDuration((progress / 100) * (currentTrack.duration || 0))}</span>
                                        <span>{formatDuration(currentTrack.duration || 0)}</span>
                                    </motion.div>
                                </motion.div>

                                {/* Controls - Black/White minimal theme */}
                                <motion.div
                                    animate={{ opacity: isIdle ? 0 : 1, y: isIdle ? 30 : 0 }}
                                    transition={{ duration: 0.8 }}
                                    className="w-full flex items-center justify-center gap-8"
                                >
                                    <button onClick={toggleShuffle} className={cn("p-2 cursor-pointer transition-colors", shuffle ? "text-white" : "text-white/30")}>
                                        <Shuffle className="w-5 h-5" />
                                    </button>

                                    <button onClick={prevTrack} className="p-2 text-white/70 hover:text-white transition-colors cursor-pointer">
                                        <SkipBack className="w-7 h-7 fill-current" />
                                    </button>

                                    <button
                                        onClick={() => setIsPlaying(!isPlaying)}
                                        className="w-16 h-16 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform cursor-pointer"
                                    >
                                        {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                                    </button>

                                    <button onClick={nextTrack} className="p-2 text-white/70 hover:text-white transition-colors cursor-pointer">
                                        <SkipForward className="w-7 h-7 fill-current" />
                                    </button>

                                    <button
                                        onClick={toggleRepeat}
                                        className={cn(
                                            "p-2 cursor-pointer transition-all relative",
                                            repeat !== 'off' ? "text-white" : "text-white/30"
                                        )}
                                    >
                                        <Repeat className="w-5 h-5" />
                                        {repeat === 'one' && (
                                            <span className="absolute -top-1 -right-1 flex items-center justify-center w-3 h-3 bg-white text-black text-[7px] font-black rounded-full ring-2 ring-[#0a0a0a]">
                                                1
                                            </span>
                                        )}
                                        {repeat === 'all' && (
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                                        )}
                                    </button>
                                </motion.div>
                            </div>
                        </main>

                        {/* Footer / Volume & Drawer Toggle */}
                        <motion.footer
                            animate={{ opacity: isIdle ? 0 : 1, y: isIdle ? 20 : 0 }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                            className="px-8 py-8 w-full max-w-lg mx-auto flex items-center justify-between gap-6"
                        >
                            <Volume2 className="w-4 h-4 text-white/30" />
                            <Slider value={[volume]} max={100} onValueChange={(val) => setVolume(val[0])} className="flex-1" />

                            {/* DRAWER TRIGGER */}
                            <button
                                onClick={() => setIsSideDrawerOpen(!isSideDrawerOpen)}
                                className={cn("p-2 cursor-pointer transition-all", isSideDrawerOpen ? "text-white" : "text-white/30")}
                            >
                                <ListMusic className="w-5 h-5" />
                            </button>
                        </motion.footer>
                    </motion.div>

                    {/* RIGHT SIDE DRAWER */}
                    <AnimatePresence>
                        {isSideDrawerOpen && !isIdle && (
                            <motion.div
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{
                                    duration: 1.4,
                                    ease: [0.22, 1, 0.36, 1]
                                }}
                                className="absolute inset-y-0 right-0 z-20 w-[35%] bg-[#0d0d0d] border-l border-white/5 flex flex-col shadow-[-40px_0_100_rgba(0,0,0,0.5)]"
                            >
                                {/* Drawer Header */}
                                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex bg-white/5 p-1 rounded-lg">
                                        <button
                                            onClick={() => setDrawerTab('recommendations')}
                                            className={cn(
                                                "px-4 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                                                drawerTab === 'recommendations' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                                            )}
                                        >
                                            Up Next
                                        </button>
                                        <button
                                            onClick={() => setDrawerTab('playlists')}
                                            className={cn(
                                                "px-4 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                                                drawerTab === 'playlists' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                                            )}
                                        >
                                            Discover
                                        </button>
                                    </div>

                                    {/* Close Button */}
                                    <Button variant="ghost" size="icon" onClick={() => setIsSideDrawerOpen(false)} className="cursor-pointer text-white/40 hover:text-white">
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>

                                {/* Drawer Content */}
                                <div className="flex-1 overflow-y-auto p-4">
                                    {drawerTab === 'recommendations' ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-white/30 mb-4 px-2">
                                                <ListMusic className="w-3 h-3 text-[#e85a20]" />
                                                <span className="text-[11px] font-bold">
                                                    {activeCollection ? `Playing from ${activeCollection.name}` : `Queue • ${queue.length} Songs`}
                                                </span>
                                            </div>

                                            {queue.length > 0 ? (
                                                queue.map((track, i) => {
                                                    const isActive = currentTrack?.id === track.id;
                                                    return (
                                                        <div
                                                            key={`${track.id}-${i}`}
                                                            onClick={() => playTrack(track)}
                                                            className={cn(
                                                                "flex items-center gap-3 group cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-all border border-transparent",
                                                                isActive ? "bg-white/5 border-white/5" : ""
                                                            )}
                                                        >
                                                            <div className="relative w-10 h-10 flex-shrink-0">
                                                                <img
                                                                    src={track.thumbnail || undefined}
                                                                    alt={track.title}
                                                                    className={cn("w-full h-full rounded-lg object-cover", isActive ? "opacity-40" : "")}
                                                                />
                                                                {isActive && (
                                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                                        <div className="flex gap-0.5 items-end h-3">
                                                                            <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.5 bg-[#e85a20]" />
                                                                            <motion.div animate={{ height: [8, 4, 8] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }} className="w-0.5 bg-[#e85a20]" />
                                                                            <motion.div animate={{ height: [6, 10, 6] }} transition={{ repeat: Infinity, duration: 0.7, delay: 0.2 }} className="w-0.5 bg-[#e85a20]" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className={cn("font-bold truncate text-xs", isActive ? "text-[#e85a20]" : "text-white/80")}>{track.title}</p>
                                                                <p className="text-[10px] text-white/40 truncate font-medium">{track.artist}</p>
                                                            </div>
                                                            <span className="text-[10px] text-white/20 font-medium">
                                                                {formatDuration(track.duration)}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-center py-16 text-white/20">
                                                    <p className="text-[10px] uppercase tracking-widest">Queue is empty</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-white/30 mb-4 px-2">
                                                <ListMusic className="w-3 h-3" />
                                                <span className="text-[11px] font-bold">Curated collections</span>
                                            </div>

                                            {isLoadingPlaylists ? (
                                                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                                                    <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
                                                    <p className="text-[10px] text-white/20 uppercase tracking-widest">Gathering collections...</p>
                                                </div>
                                            ) : playlists.length > 0 ? (
                                                <div className="grid grid-cols-1 gap-4">
                                                    {playlists.map((playlist) => (
                                                        <div
                                                            key={playlist.id}
                                                            className="group relative h-32 rounded-xl overflow-hidden cursor-pointer hover:ring-1 ring-[#e85a20]/20 transition-all shadow-xl"
                                                            onClick={() => {
                                                                setIsFullPlayerOpen(false);
                                                                router.push(`/playlist/${playlist.id}`);
                                                            }}
                                                        >
                                                            <img src={playlist.thumbnail || undefined} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                                            <div className="absolute bottom-3 left-3 right-3">
                                                                <p className="text-white font-bold text-xs truncate mb-0.5">{playlist.title}</p>
                                                                <div className="flex items-center justify-between">
                                                                    <p className="text-[9px] text-white/40 font-medium">{playlist.artist}</p>
                                                                    <p className="text-[9px] text-[#e85a20] font-bold">{playlist.trackCount} Items</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-16 text-white/20">
                                                    <p className="text-[10px] uppercase tracking-widest">No playlists found</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
