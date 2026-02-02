'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { FullPlayer } from '@/components/player/FullPlayer';
import { usePlayerStore } from '@/store/usePlayerStore';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const [hasMounted, setHasMounted] = useState(false);
  const pathname = usePathname();

  const router = useRouter();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();

        // 1. Dispatch a custom event for pages that have special refresh needs
        window.dispatchEvent(new CustomEvent('openwave-hot-refresh'));

        // 2. Trigger Next.js soft refresh (Refreshes server data without reload)
        router.refresh();

        toast.success("OpenWave Refreshed", {
          description: "Interface updated without interrupting your sound."
        });
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [router]);

  if (!hasMounted) {
    return (
      <div className="min-h-screen bg-[#070707]">
        <Sidebar aria-hidden="true" />
        <main className="lg:ml-sidebar min-h-screen relative overflow-hidden">
          {children}
        </main>
        <BottomNav aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707]">
      <Sidebar />

      <main
        className={cn(
          'lg:ml-sidebar min-h-screen relative flex flex-col',
          currentTrack ? 'pb-32 lg:pb-24' : 'pb-20 lg:pb-0'
        )}
      >
        <AnimatePresence mode="popLayout" initial={true}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={{
              opacity: 1,
              filter: 'blur(0px)',
              transition: {
                duration: 0.3,
                ease: "easeOut"
              }
            }}
            exit={{
              opacity: 0,
              filter: 'blur(10px)',
              transition: { duration: 0.2, ease: "easeIn" }
            }}
            className="w-full h-full flex-1 will-change-[opacity,filter]"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <MiniPlayer />
      <FullPlayer />
      <BottomNav />
    </div>
  );
}
