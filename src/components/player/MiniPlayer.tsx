'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronUp,
  Volume2,
} from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { cn } from '@/lib/utils';
import ReactPlayer from 'react-player/youtube';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    progress,
    volume,
    setIsPlaying,
    setProgress,
    nextTrack,
    prevTrack,
    setIsFullPlayerOpen,
    seekTo,
    setSeekTo
  } = usePlayerStore();

  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);
  const playerRef = useRef<ReactPlayer>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const smoothProgressRef = useRef(progress);
  const lastSyncTimeRef = useRef(Date.now());

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Handle seeking
  useEffect(() => {
    if (seekTo !== null && playerRef.current) {
      playerRef.current.seekTo(seekTo / 100, 'fraction');
      setSeekTo(null);
    }
  }, [seekTo, setSeekTo]);

  // --- 30 Second Rule & Hyper-Smooth Logic ---
  const listenDurationRef = useRef(0);
  const playTrackIdRef = useRef<string | null>(null);
  const hasLoggedRef = useRef(false);

  // Sync anchor: When the official player reports progress, we gently nudge our smooth ref
  const handleProgress = (state: any) => {
    const realProgress = state.played * 100;
    setProgress(realProgress);

    // If the drift is significant (e.g. > 1%), snap to reality
    if (Math.abs(smoothProgressRef.current - realProgress) > 1) {
      smoothProgressRef.current = realProgress;
    }
  };

  // Reset counters when the track changes
  useEffect(() => {
    if (currentTrack?.id !== playTrackIdRef.current) {
      listenDurationRef.current = 0;
      playTrackIdRef.current = currentTrack?.id || null;
      hasLoggedRef.current = false;

      // Also reset smooth progress
      smoothProgressRef.current = 0;
      lastSyncTimeRef.current = Date.now();
      if (progressBarRef.current) {
        progressBarRef.current.style.width = '0%';
      }
    }
  }, [currentTrack?.id]);

  // Track active listening time AND update smooth progress (Animation Loop)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let animationFrame: number;

    const updateSmoothProgress = () => {
      if (isPlaying && currentTrack && currentTrack.duration > 0) {
        const now = Date.now();
        const deltaTime = (now - lastSyncTimeRef.current) / 1000;
        lastSyncTimeRef.current = now;

        const progressPerSecond = 100 / currentTrack.duration;
        smoothProgressRef.current = Math.min(100, smoothProgressRef.current + (progressPerSecond * deltaTime));

        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${smoothProgressRef.current}%`;
        }
      } else {
        lastSyncTimeRef.current = Date.now();
      }
      animationFrame = requestAnimationFrame(updateSmoothProgress);
    };

    if (isPlaying && currentTrack) {
      // 30 second timer
      interval = setInterval(() => {
        if (!hasLoggedRef.current) {
          listenDurationRef.current += 1;
          if (listenDurationRef.current >= 30) {
            fetch('/api/taste/log', {
              method: 'POST',
              body: JSON.stringify(currentTrack),
              headers: { 'Content-Type': 'application/json' }
            }).catch(() => { });
            hasLoggedRef.current = true;
            console.log(`✅ Taste Engine: Reinforced for "${currentTrack.title}"`);
          }
        }
      }, 1000);

      animationFrame = requestAnimationFrame(updateSmoothProgress);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, currentTrack]);

  if (!currentTrack || !hasMounted) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className={cn(
          'fixed left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5',
          'lg:left-sidebar lg:bottom-0 bottom-bottom-nav'
        )}
      >
        {/* React Player Instance (Hidden) */}
        <div className="hidden">
          <ReactPlayer
            ref={playerRef}
            url={currentTrack.youtubeUrl}
            playing={isPlaying}
            volume={volume / 100}
            onProgress={handleProgress}
            onEnded={() => nextTrack()}
            progressInterval={500}
            config={{
              playerVars: {
                autoplay: 1,
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
                iv_load_policy: 3,
                quality: 'highres'
              }
            }}
          />
        </div>

        {/* Progress bar - Hyper-smooth manual div */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10">
          <div
            ref={progressBarRef}
            className="h-full bg-white will-change-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-4 px-4 py-3">
          <div
            onClick={() => setIsFullPlayerOpen(true)}
            className="flex items-center gap-3 flex-1 min-w-0 group cursor-pointer"
            aria-label={`Open full player for: ${currentTrack.title} by ${currentTrack.artist}`}
          >
            <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-white/10 shadow-lg">
              <img
                src={currentTrack.thumbnail || undefined}
                alt={currentTrack.title}
                className={cn(
                  "w-full h-full object-cover transition-transform duration-700",
                  isPlaying ? "animate-spin-slow" : "[animation-play-state:paused]"
                )}
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <ChevronUp className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-xs text-white truncate">
                {currentTrack.title}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/search?q=${encodeURIComponent(currentTrack.artist)}`);
                }}
                className="text-[10px] text-white/50 truncate hover:text-white transition-colors cursor-pointer block"
              >
                {currentTrack.artist}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => prevTrack()}
              className="p-2 rounded-full text-white/50 hover:text-white transition-colors cursor-pointer hidden sm:block"
              aria-label="Previous track"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2.5 rounded-full bg-white text-black hover:scale-105 transition-transform cursor-pointer"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => nextTrack()}
              className="p-2 rounded-full text-white/50 hover:text-white transition-colors cursor-pointer hidden sm:block"
              aria-label="Next track"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <div className="hidden md:flex items-center gap-2 ml-4">
              <Volume2 className="w-3 h-3 text-white/30" />
              <div className="w-16 h-0.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white"
                  style={{ width: `${volume}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
