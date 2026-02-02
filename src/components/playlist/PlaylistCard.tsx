'use client';

import { motion } from 'framer-motion';
import { Play, Globe, Lock, Music } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface PlaylistCardProps {
  id: string;
  title: string;
  description?: string;
  coverUrl: string;
  trackCount?: number;
  isPublic?: boolean;
  showPrivacy?: boolean;
  className?: string;
  onPlay?: () => void;
}

export function PlaylistCard(props: PlaylistCardProps) {
  const {
    id,
    title,
    description,
    coverUrl,
    trackCount,
    isPublic = true,
    showPrivacy = true,
    className,
    onPlay,
  } = props;
  const handlePlayClick = (e: React.MouseEvent) => {
    if (onPlay) {
      e.preventDefault();
      e.stopPropagation();
      onPlay();
    }
  };

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        'group relative bg-[#0a0a0a] rounded-xl p-3 cursor-pointer border border-white/5 shadow-2xl overflow-hidden',
        className
      )}
    >
      <Link href={onPlay ? "#" : `/playlist/${id}`} scroll={!onPlay} className="block h-full flex flex-col" onClick={onPlay ? handlePlayClick : undefined}>
        {/* Cover Image Container */}
        <div className="relative aspect-square rounded-lg overflow-hidden mb-3.5 shadow-2xl bg-[#0d0d0d] flex items-center justify-center border border-white-[0.02]">
          {(coverUrl || (props as any).cover_url) && !(coverUrl || (props as any).cover_url).includes('unsplash.com/photo-1470225620780-dba8ba36b745') ? (
            <img
              src={coverUrl || (props as any).cover_url}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-[24px] bg-gradient-to-b from-white/[0.03] to-transparent flex items-center justify-center border border-white/[0.05] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                <Music className="w-8 h-8 text-[#222222] group-hover:text-[#444444] transition-colors" />
              </div>
            </div>
          )}

          {/* Premium Play Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-[0_8px_32px_rgba(255,255,255,0.1)] transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75"
              onClick={handlePlayClick}
            >
              <Play className="w-6 h-6 text-black ml-1" fill="currentColor" />
            </motion.div>
          </div>

          {/* Privacy Badge */}
          {showPrivacy && (
            <div className="absolute top-2 right-2 z-10">
              <div className={cn(
                "px-2 py-1 rounded-full backdrop-blur-md border flex items-center gap-1.5",
                isPublic
                  ? "bg-black/10 border-white/5 text-white/40"
                  : "bg-[#e85a20]/20 border-[#e85a20]/20 text-[#e85a20]"
              )}>
                {isPublic ? (
                  <Globe className="w-2.5 h-2.5" />
                ) : (
                  <Lock className="w-2.5 h-2.5" />
                )}
                <span className="text-[8px] font-black uppercase tracking-widest">
                  {isPublic ? 'Public' : 'Private'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-1.5 flex-1">
          <h3 className="font-black text-sm text-white line-clamp-1 tracking-tight group-hover:text-white transition-colors">
            {title}
          </h3>
          {description && (
            <p className="text-[11px] font-medium text-[#444444] line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
