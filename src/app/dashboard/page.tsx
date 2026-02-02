'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ListMusic, Music, Globe, Lock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlaylistCard } from '@/components/playlist/PlaylistCard';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useContentStore } from '@/store/useContentStore';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Dashboard() {
    const { userPlaylists, addUserPlaylist } = useContentStore();
    const { user } = useAuthStore();
    const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
    const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isPublic, setIsPublic] = useState(true);
    const [isPending, startTransition] = useTransition();

    const handleCreatePlaylist = () => {
        startTransition(async () => {
            const newPlaylist = {
                id: `user-${Date.now()}`,
                title: newPlaylistTitle.trim() || 'Untitled Playlist',
                description: newPlaylistDesc || 'Personal Collection',
                coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop',
                tracks: [],
                isPublic: isPublic,
            };

            addUserPlaylist(newPlaylist);
            setNewPlaylistTitle('');
            setNewPlaylistDesc('');
            setIsPublic(true);
            setIsOpen(false);
            toast.success('Collection Synthesized');
        });
    };

    return (
        <div className="container mx-auto px-8 py-10 space-y-12">
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1"
            >
                <div className="space-y-1">
                    <motion.h1
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.2 }}
                        className="text-2xl font-bold text-white flex items-center gap-3"
                    >
                        <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-lg">
                            <ListMusic className="w-4 h-4 text-[#e85a20]" />
                        </div>
                        My Playlists
                    </motion.h1>
                </div>
            </motion.header>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                {userPlaylists.map((playlist, index) => (
                    <motion.div
                        key={playlist.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <PlaylistCard
                            id={playlist.id}
                            title={playlist.title}
                            description={playlist.description}
                            coverUrl={playlist.coverUrl}
                            isPublic={playlist.isPublic}
                        />
                    </motion.div>
                ))}

                {/* Create Playlist Card Trigger */}
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <motion.div
                            whileHover={{ y: -8, backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.1)' }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative bg-[#0a0a0a] rounded-xl p-3 cursor-pointer border border-white/5 shadow-2xl overflow-hidden flex flex-col h-full min-h-[250px] transition-all duration-300"
                        >
                            <div className="relative aspect-square rounded-lg overflow-hidden mb-3.5 bg-[#0d0d0d] flex items-center justify-center border border-dashed border-white/10 group-hover:border-[#e85a20]/40 transition-colors">
                                <div className="flex flex-col items-center justify-center gap-4">
                                    <div className="w-16 h-16 rounded-[24px] bg-white/[0.03] flex items-center justify-center border border-white/[0.05] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] group-hover:bg-[#e85a20]/10 group-hover:border-[#e85a20]/20 transition-all duration-500">
                                        <Plus className="w-8 h-8 text-[#222222] group-hover:text-[#e85a20] transition-all duration-500" strokeWidth={1.5} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#333333] group-hover:text-[#e85a20] transition-colors">Add New</span>
                                </div>
                            </div>

                            <div className="space-y-1.5 flex-1">
                                <h3 className="font-black text-sm text-[#444444] group-hover:text-white transition-colors">
                                    Create Playlist
                                </h3>
                                <p className="text-[11px] font-medium text-[#222222] group-hover:text-[#666666] line-clamp-2 leading-relaxed transition-colors">
                                    Start building your music world.
                                </p>
                            </div>
                        </motion.div>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-[520px] bg-[#050505] border border-white/[0.08] text-white rounded-[40px] p-0 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-3xl focus:outline-none">
                        <div className="relative h-44 w-full overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#111111] via-[#050505] to-[#050505]" />
                            <div className="absolute top-[-50%] left-[-10%] w-[120%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] blur-3xl" />

                            <div className="absolute -bottom-10 left-10 flex items-end gap-6 group/preview">
                                <div className="w-32 h-32 rounded-[24px] bg-[#080808] border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden relative">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={newPlaylistTitle ? 'filled' : 'empty'}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className="absolute inset-0 flex items-center justify-center"
                                        >
                                            <Music className={cn("w-12 h-12 transition-colors duration-500", newPlaylistTitle ? "text-[#e85a20]" : "text-[#111111]")} />
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                                <div className="pb-12 space-y-1">
                                    <motion.h2
                                        layout
                                        className="text-3xl font-black tracking-tighter leading-none max-w-[300px] truncate"
                                    >
                                        {newPlaylistTitle || 'Untitled Playlist'}
                                    </motion.h2>
                                    <motion.p
                                        layout
                                        className="text-[11px] font-bold text-[#444444] uppercase tracking-widest truncate max-w-[280px]"
                                    >
                                        {newPlaylistDesc || 'Description Pending...'}
                                    </motion.p>
                                </div>
                            </div>
                        </div>

                        <div className="px-10 pb-12 pt-6 space-y-10">
                            <div className="grid gap-8">
                                <div className="space-y-3 group/field">
                                    <div className="flex justify-between items-center px-1">
                                        <Label htmlFor="name" className="text-[9px] font-black uppercase tracking-[0.3em] text-[#333333] group-focus-within/field:text-white/60 transition-colors">Playlist Name</Label>
                                    </div>
                                    <Input
                                        id="name"
                                        placeholder="Enter name..."
                                        value={newPlaylistTitle}
                                        onChange={(e) => setNewPlaylistTitle(e.target.value)}
                                        className="bg-[#080808] border-white/[0.04] focus:border-white/10 h-14 rounded-2xl text-white placeholder:text-[#1a1a1a] px-6 text-sm font-bold transition-all focus-visible:ring-1 focus-visible:ring-white/5 focus-visible:ring-offset-0 cursor-text"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="desc" className="text-[9px] font-black uppercase tracking-[0.3em] text-[#333333] px-1">Description</Label>
                                    <Input
                                        id="desc"
                                        placeholder="Add a short description..."
                                        value={newPlaylistDesc}
                                        onChange={(e) => setNewPlaylistDesc(e.target.value)}
                                        className="bg-[#080808] border-white/[0.04] focus:border-white/10 h-14 rounded-2xl text-white placeholder:text-[#1a1a1a] px-6 text-sm font-bold transition-all focus-visible:ring-0 focus-visible:ring-offset-0 cursor-text"
                                    />
                                </div>

                                {/* Premium Privacy Toggle Card */}
                                <div
                                    onClick={() => setIsPublic(!isPublic)}
                                    className="px-5 py-4 bg-[#080808] border border-white/[0.02] rounded-[24px] flex items-center justify-between group/toggle hover:border-white/[0.08] transition-all cursor-pointer select-none active:scale-[0.99]"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                                            isPublic ? "bg-white/[0.02] text-[#444444]" : "bg-white/5 text-white"
                                        )}>
                                            {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#cccccc] mb-0.5">{isPublic ? 'Public' : 'Private'}</p>
                                            <p className="text-[8px] font-bold text-[#333333] group-hover/toggle:text-[#555555] transition-colors">{isPublic ? 'Everyone can listen' : 'Only you can see this'}</p>
                                        </div>
                                    </div>

                                    <div className={cn(
                                        "w-10 h-5 rounded-full border border-white/5 flex items-center px-0.5 transition-colors duration-500",
                                        isPublic ? "bg-[#111111]" : "bg-white"
                                    )}>
                                        <motion.div
                                            animate={{ x: isPublic ? 0 : 20 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            className={cn(
                                                "w-3.5 h-3.5 rounded-full",
                                                isPublic ? "bg-[#333333]" : "bg-black"
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            <motion.button
                                disabled={isPending}
                                onClick={handleCreatePlaylist}
                                whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.08)' }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full h-12 bg-white/[0.05] text-zinc-300 border border-white/[0.08] rounded-full font-black uppercase tracking-[0.2em] text-[10px] transition-all cursor-pointer flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed group/btn hover:text-white"
                            >
                                {isPending ? (
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full" />
                                    </motion.div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        Create Playlist
                                        <Check className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 transition-all translate-x-1 group-hover:translate-x-0" />
                                    </div>
                                )}
                            </motion.button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
