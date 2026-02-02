'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home,
  Compass,
  Search,
  ListMusic,
  Play,
  Settings,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/dashboard', icon: ListMusic, label: 'Library' },
  { path: '/profile/me', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-2xl border-t border-white/5 z-50 pb-safe"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <ul className="flex items-center justify-around h-16 px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.path ||
            (item.path !== '/' && pathname?.startsWith(item.path));

          return (
            <li key={item.path} className="flex-1">
              <Link
                href={item.path}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-1.5 transition-all relative',
                  isActive ? 'text-[#ff6b35]' : 'text-[#888888]'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-glow"
                    className="absolute -top-1 w-8 h-1 bg-[#ff6b35] rounded-full shadow-[0_2px_8px_rgba(255,107,53,0.5)]"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <item.icon
                  className={cn(
                    'w-5 h-5 transition-all duration-300',
                    isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,107,53,0.3)]' : 'opacity-70'
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="text-[9px] font-bold tracking-tight uppercase">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
