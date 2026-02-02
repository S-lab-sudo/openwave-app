'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home,
  Compass,
  Search,
  ListMusic,
  Download,
  Settings,
  User,
  Music,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/dashboard', icon: ListMusic, label: 'My Playlists' },
  { path: '/downloads', icon: Download, label: 'Downloads' },
  { path: '/profile/me', icon: User, label: 'Profile' },
];

import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { AuthModal } from './AuthModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      <aside
        className="hidden lg:flex flex-col w-sidebar bg-[#070707] fixed left-0 border-r border-white-[0.03] z-40"
        style={{ top: '10px', height: 'calc(100vh - 10px)' }}
      >
        {/* Logo Section */}
        <div className="flex items-center gap-3.5 px-6 py-6 transition-all duration-300">
          <div className="relative group cursor-pointer">
            <div className="relative w-[38px] h-[38px] rounded-[11px] bg-gradient-to-b from-white/[0.03] to-transparent flex items-center justify-center border border-white/[0.05] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all duration-500 group-hover:bg-white/[0.05]">
              <Music className="w-5 h-5 text-white transition-colors" strokeWidth={2.5} />
            </div>
          </div>
          <span className="text-lg font-black text-white tracking-[-0.04em]">OpenWave</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 mt-2 overflow-y-auto scrollbar-hide">
          <ul className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.path ||
                (item.path !== '/' && pathname?.startsWith(item.path));

              return (
                <li key={item.path} className="relative px-1">
                  <Link
                    href={item.path}
                    className={cn(
                      'flex items-center gap-4 px-4 py-2.5 rounded-lg transition-colors duration-200 relative group',
                      isActive
                        ? 'text-[#e85a20]'
                        : 'text-[#777777] hover:text-white hover:bg-white/[0.03]'
                    )}
                  >
                    {/* Jelly Active Background Pill */}
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-pill"
                        className="absolute inset-0 bg-[#121212] rounded-lg z-0 border border-white-[0.03]"
                        initial={false}
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 18,
                          mass: 0.8
                        }}
                      />
                    )}

                    {/* Jelly Vertical Indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-bar"
                        className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#e85a20] rounded-r-full shadow-[0_4px_12px_rgba(232,90,32,0.4)] z-10"
                        initial={false}
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 18,
                          mass: 0.8
                        }}
                      />
                    )}

                    <span className="relative z-10 flex items-center gap-4 w-full">
                      <item.icon
                        className={cn(
                          'w-[20px] h-[20px] transition-transform duration-300',
                          isActive ? 'text-[#e85a20]' : 'group-hover:text-white group-hover:scale-105'
                        )}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      <span className={cn(
                        "text-[14.5px] font-bold tracking-tight transition-colors duration-300",
                        isActive ? "text-[#e85a20]" : "group-hover:text-white"
                      )}>
                        {item.label}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

      </aside>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
