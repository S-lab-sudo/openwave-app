'use client';

import { motion } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { useRouter } from 'next/navigation';

interface TrackRowProps {
  track: Track;
  index: number;
  isPlaying?: boolean;
  onPlay?: () => void;
  className?: string;
  compact?: boolean;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TrackRow({
  track,
  index,
  onPlay,
  className,
  compact,
}: TrackRowProps) {
  const router = useRouter();
  const { playTrack, pauseTrack, isPlaying: globalPlaying, currentTrack } = usePlayerStore();

  const isCurrentTrack = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isCurrentTrack && globalPlaying;

  const handleRowClick = () => {
    if (track.isPlaylist) {
      router.push(`/playlist/${track.id}`);
      return;
    }

    if (isCurrentTrack) {
      if (globalPlaying) {
        pauseTrack();
      } else {
        usePlayerStore.getState().setIsPlaying(true);
      }
    } else {
      playTrack(track);
    }
    onPlay?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(8px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.4 }}
      onClick={handleRowClick}
      className={cn(
        'group flex items-center gap-6 px-8 py-5 transition-all duration-300 cursor-pointer',
        'hover:bg-white/[0.04]',
        isCurrentTrack && 'bg-white/[0.06]',
        compact && 'py-2 px-6 gap-4',
        className
      )}
    >
      {/* Track number - No hover play button here anymore */}
      <div className={cn("flex-shrink-0 text-center", compact ? "w-4" : "w-6")}>
        <span className={cn(
          'text-sm font-bold transition-colors',
          compact ? "text-[10px]" : "text-sm",
          isCurrentTrack ? 'text-[#ff6b35]' : 'text-[#444444]'
        )}>
          {isCurrentlyPlaying ? (
            <div className="flex items-center justify-center gap-0.5">
              <span className={cn("w-0.5 bg-[#ff6b35] rounded-full animate-[equalizer_0.6s_ease-in-out_infinite]", compact ? "h-2" : "h-3")} />
              <span className={cn("w-0.5 bg-[#ff6b35] rounded-full animate-[equalizer_0.6s_ease-in-out_infinite_0.2s]", compact ? "h-2" : "h-3")} />
              <span className={cn("w-0.5 bg-[#ff6b35] rounded-full animate-[equalizer_0.6s_ease-in-out_infinite_0.4s]", compact ? "h-2" : "h-3")} />
            </div>
          ) : (
            (index + 1).toString().padStart(2, '0')
          )}
        </span>
      </div>

      {/* Thumbnail and info - Play on click handled by row */}
      <div className={cn("flex items-center flex-1 min-w-0", compact ? "gap-3" : "gap-5")}>
        <div className={cn(
          "relative rounded-md overflow-hidden flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-300",
          compact ? "w-12 h-12" : "w-20 h-20"
        )}>
          <img
            src={track.thumbnail || undefined}
            alt={track.title}
            className="w-full h-full object-cover"
          />
          {isCurrentlyPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className={cn("bg-[#ff6b35] rounded-full animate-pulse", compact ? "w-1 h-1" : "w-1.5 h-1.5")} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn(
            'font-medium line-clamp-1 transition-colors',
            compact ? "text-xs" : "text-base",
            isCurrentTrack ? 'text-[#ff6b35]' : 'text-white'
          )}>
            {track.title}
          </p>
          <p className={cn(
            "font-medium text-[#666666] line-clamp-1",
            compact ? "text-[10px]" : "text-[13px]"
          )}>
            {track.artist}
          </p>
        </div>
      </div>

      {/* Removed Album/Trending text as requested */}

      {/* Duration */}
      <span className={cn(
        "font-bold text-right transition-colors",
        compact ? "text-[10px] w-12" : "text-sm w-20",
        isCurrentTrack ? 'text-[#ff6b35]' : 'text-[#444444]'
      )}>
        {track.isPlaylist ? "Collection" : formatDuration(track.duration)}
      </span>

      {/* More options */}
      <button
        className={cn(
          "rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10",
          compact ? "p-1.5" : "p-2.5"
        )}
        aria-label="More options"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <MoreHorizontal className={cn("text-[#444444]", compact ? "w-3.5 h-3.5" : "w-5 h-5")} />
      </button>
    </motion.div>
  );
}
