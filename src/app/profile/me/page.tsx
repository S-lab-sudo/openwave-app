'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Grid, List, Heart, Clock, Zap, Bell, Music, User, HelpCircle, LogOut, ChevronRight, Share2, ShieldCheck, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlaylistCard } from '@/components/playlist/PlaylistCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/store/useAuthStore';
import { useContentStore } from '@/store/useContentStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from '@/components/playlist/TrackRow';

export default function ProfilePage() {
    const { user, guestId } = useAuthStore();
    const { likedPlaylists, userPlaylists } = useContentStore();
    const { history, playTrack } = usePlayerStore();
    const [activeTab, setActiveTab] = useState('liked');
    const [prevTab, setPrevTab] = useState('liked');

    const displayName = user?.user_metadata?.full_name || 'Listener';
    const isGuest = !user;

    const tabsOrder = ['liked', 'history', 'settings'];
    const direction = tabsOrder.indexOf(activeTab) > tabsOrder.indexOf(prevTab) ? 1 : -1;

    const handleTabChange = (value: string) => {
        setPrevTab(activeTab);
        setActiveTab(value);
    };

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 20 : -20,
            opacity: 0,
            filter: 'blur(10px)'
        }),
        center: {
            x: 0,
            opacity: 1,
            filter: 'blur(0px)'
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 20 : -20,
            opacity: 0,
            filter: 'blur(10px)'
        })
    };

    return (
        <div className="container mx-auto px-8 py-10 animate-in fade-in duration-700">
            {/* Refined Muted Profile Header */}
            <header className="relative mb-12">
                <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b35]/5 via-transparent to-transparent opacity-30 blur-[100px] rounded-full -translate-x-1/4 -translate-y-1/4" />

                <div className="relative z-10 flex flex-row items-center gap-10 py-4">
                    {/* Icon - Left */}
                    <div className="relative group p-1 rounded-[32px] bg-white/[0.03] shadow-xl flex-shrink-0">
                        <div className="w-24 h-24 rounded-[28px] bg-[#0a0a0a] border border-white/[0.05] flex items-center justify-center transition-all duration-700 group-hover:bg-[#111111]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white/10 group-hover:text-[#ff6b35]/40 transition-all duration-500">
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
                    </div>

                    {/* Details - Right */}
                    <div className="flex-1 flex flex-col gap-6">
                        <h1 className="text-2xl font-black text-white/90 leading-none">
                            {displayName}
                        </h1>

                        <div className="flex items-center gap-16">
                            <div className="flex flex-col items-start min-w-[70px]">
                                <p className="text-2xl font-black text-white/60">{userPlaylists.length}</p>
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#222222]">Playlists</p>
                            </div>
                            <div className="flex flex-col items-start min-w-[70px]">
                                <p className="text-2xl font-black text-white/60">{likedPlaylists.length}</p>
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#222222]">Favorites</p>
                            </div>
                            <div className="flex flex-col items-start min-w-[70px]">
                                <p className="text-2xl font-black text-white/60">{history.length}</p>
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#222222]">History</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Compact Profile Content Body */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-12 overflow-hidden">
                <div className="flex justify-start border-b border-white/[0.02] relative">
                    <TabsList className="bg-transparent h-auto p-0 gap-10 pb-0 relative">
                        {tabsOrder.map((tab) => (
                            <TabsTrigger
                                key={tab}
                                value={tab}
                                className="relative bg-transparent p-0 pb-6 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-white rounded-none text-[13px] font-bold capitalize text-white/30 transition-all hover:text-white/60 group cursor-pointer"
                            >
                                <span className="relative z-10">{tab}</span>
                                {activeTab === tab && (
                                    <motion.div
                                        layoutId="profile-underline"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff6b35] z-0"
                                        initial={false}
                                        transition={{
                                            type: "spring",
                                            stiffness: 400,
                                            damping: 30,
                                            mass: 1,
                                            bounce: 0.2
                                        }}
                                    />
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <div className="w-full relative min-h-[400px]">
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={activeTab}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: "spring", stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 },
                                filter: { duration: 0.2 }
                            }}
                            className="w-full"
                        >
                            {activeTab === 'liked' && (
                                <div className="outline-none focus:ring-0">
                                    {likedPlaylists.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                            {likedPlaylists.map((playlist) => (
                                                <PlaylistCard key={playlist.id} {...playlist} showPrivacy={false} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-24 text-center border border-white/5 rounded-[32px] bg-white/[0.01] gap-4">
                                            <Heart className="w-8 h-8 text-[#111111]" fill="currentColor" />
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#222222]">Void of Favorites</p>
                                                <p className="text-[8px] text-[#1a1a1a] font-medium max-w-[160px]">Pin your favorite sonic worlds here.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="outline-none focus:ring-0">
                                    {history.length > 0 ? (
                                        <div className="bg-[#0a0a0a] rounded-xl border border-white/5 overflow-hidden divide-y divide-white/[0.01]">
                                            {history.slice(0, 20).map((track, index) => (
                                                <TrackRow key={`${track.id}-${index}`} track={track} index={index} onPlay={() => playTrack(track, history)} className="hover:bg-white/[0.01] py-3 px-6" compact />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-24 text-center border border-white/5 rounded-2xl bg-white/[0.01] gap-4">
                                            <Clock className="w-8 h-8 text-[#111111]" />
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#222222]">Memory Empty</p>
                                                <p className="text-[8px] text-[#1a1a1a] font-medium max-w-[160px]">Listening patterns emerge here.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'settings' && (
                                <div className="outline-none focus:ring-0">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        {/* Account Identity */}
                                        <section className="space-y-4">
                                            <div className="flex items-center gap-3 px-2">
                                                <User className="w-3.5 h-3.5 text-[#ff6b35]/60" />
                                                <h2 className="text-[8px] font-black uppercase tracking-[0.3em] text-[#333333]">Identity</h2>
                                            </div>
                                            <div className="bg-[#0a0a0a] border border-white/5 rounded-[24px] p-6 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-[#222222] mb-1">Display Name</p>
                                                        <p className="font-bold text-white/70 text-base">{displayName}</p>
                                                    </div>
                                                    <button className="text-[8px] font-black uppercase tracking-widest text-[#444444] hover:text-white/60 transition-colors">Edit</button>
                                                </div>
                                                <div className="h-[1px] bg-white/[0.02]" />
                                                <div>
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-[#222222] mb-1">Internal Reference</p>
                                                    <p className="font-mono text-[10px] text-[#333333] bg-white/[0.01] p-2.5 rounded-lg border border-white/[0.02] inline-block">
                                                        {isGuest ? 'GUEST_PROFILE_SECURED' : 'IDENTITY_MASKED'}
                                                    </p>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Preferences */}
                                        <section className="space-y-4">
                                            <div className="flex items-center gap-3 px-2">
                                                <Zap className="w-3.5 h-3.5 text-[#ff6b35]/60" />
                                                <h2 className="text-[8px] font-black uppercase tracking-[0.3em] text-[#333333]">System</h2>
                                            </div>
                                            <div className="bg-[#0a0a0a] border border-white/5 rounded-[24px] divide-y divide-white/[0.02] overflow-hidden">
                                                <div className="p-6 flex items-center justify-between group">
                                                    <div className="space-y-0.5">
                                                        <p className="font-bold text-white/70 text-sm">Enhanced Audio</p>
                                                        <p className="text-[10px] text-[#333333]">Hi-Fi streaming active.</p>
                                                    </div>
                                                    <Switch defaultChecked className="scale-75 data-[state=checked]:bg-[#ff6b35]/60" />
                                                </div>
                                                <div className="p-6 flex items-center justify-between group">
                                                    <div className="space-y-0.5">
                                                        <p className="font-bold text-white/70 text-sm">Gapless Engine</p>
                                                        <p className="text-[10px] text-[#333333]">Fluid sonic transitions.</p>
                                                    </div>
                                                    <Switch defaultChecked className="scale-75 data-[state=checked]:bg-[#ff6b35]/60" />
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                    <div className="mt-10 p-6 bg-destructive/[0.01] border border-destructive/[0.05] rounded-[24px] flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <p className="font-black text-destructive/40 text-[8px] uppercase tracking-widest">Termination</p>
                                            <p className="text-[10px] text-destructive/20 font-medium">Disconnect profile session.</p>
                                        </div>
                                        <Button variant="ghost" className="text-destructive/50 hover:bg-destructive/5 text-[8px] font-black uppercase tracking-widest border border-destructive/10 rounded-full px-6 h-9">
                                            <LogOut className="w-3 h-3 mr-2" /> End Session
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </Tabs>

            <footer className="mt-20 pt-10 border-t border-white/[0.01] text-center pb-12">
                <p className="text-[8px] text-[#111111] font-black tracking-[0.3em] uppercase opacity-40">OpenWave Build v1.0.5</p>
            </footer>
        </div>
    );
}

function TabsTriggerIndicator() {
    return (
        <motion.div
            layoutId="profile-tab-indicator"
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff6b35] opacity-0 group-data-[state=active]:opacity-100"
            transition={{
                type: "spring",
                stiffness: 500,
                damping: 40
            }}
        />
    );
}
