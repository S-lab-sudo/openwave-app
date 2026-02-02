'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Play,
    Plus,
    Clock,
    Music,
    Trash2,
    ChevronDown,
    Pencil,
    Search,
    Loader2,
    Upload,
    Heart,
    Edit3,
    Share2,
    Globe,
    Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { useContentStore } from '@/store/useContentStore';
import { useAuthStore } from '@/store/useAuthStore';
import { featuredPlaylists, userPlaylists } from '@/data/mockData';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger
} from '@/components/ui/dialog';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerTrigger
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { formatDuration, cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Playlist {
    id: string;
    title: string;
    description: string;
    coverUrl: string;
    tracks: Track[];
    trackCount: number;
    isPublic?: boolean;
}

interface YouTubeSearchItem extends Track {
    playlist_title?: string;
}

export default function PlaylistView() {
    const { id } = useParams();
    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Sequencing Collection...");
    const [isAdding, setIsAdding] = useState(false);

    const [communityVotes, setCommunityVotes] = useState<number | null>(null);

    const { playTrack, currentTrack } = usePlayerStore();
    const {
        editorsPicks,
        userPlaylists: storedUserPlaylists,
        updateUserPlaylist,
        deleteUserPlaylist,
        syncPlaylist,
        setUserPlaylists,
        likedPlaylists,
        toggleLikePlaylist
    } = useContentStore(); // Access persist store
    const { user } = useAuthStore();

    const isLiked = likedPlaylists.some(p => p.id === id);
    const isOwned = storedUserPlaylists.some(p => p.id === id);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Track[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [newCoverUrl, setNewCoverUrl] = useState('');
    const [isEditingCover, setIsEditingCover] = useState(false);

    // Edit Info State
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [isEditingInfo, setIsEditingInfo] = useState(false);

    const calculateTotalDuration = (tracks: Track[]) => {
        const totalSeconds = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        if (hours > 0) {
            return `${hours} hr ${minutes} min`;
        }
        return `${minutes} min`;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewCoverUrl(reader.result as string);
                toast.success('Local image ready to update');
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0); // Force scroll to top on navigation

        const fetchDynamicPlaylist = async (playlistId: string) => {
            setIsLoading(true);
            setPlaylist(null); // Clear old data immediately

            const messages = [
                "Sequencing Collection...",
                "Matching frequency patterns...",
                "Decoding sonic metadata...",
                "Establishing high-fidelity stream...",
                "Synthesizing atmosphere..."
            ];

            let msgIndex = 0;
            const msgInterval = setInterval(() => {
                msgIndex = (msgIndex + 1) % messages.length;
                setLoadingMessage(messages[msgIndex]);
            }, 1000);

            try {
                const res = await fetch(`/api/search?type=playlist_tracks&q=${playlistId}`);
                const data = await res.json() as { items: YouTubeSearchItem[] };

                if (data.items && data.items.length > 0) {
                    // Search for any track that has the playlist_title field
                    const rawTitle = data.items.find((t) => t.playlist_title)?.playlist_title || "YouTube Collection";

                    // Simple cleaning for playlist titles
                    const metaTitle = rawTitle
                        .replace(/\s*\(?(?:official|playlist|full album|best of|mix|collection)\)?\s*/gi, ' ')
                        .replace(/\s*\|\s*.*/gi, '')
                        .trim();

                    // Priority: Use the first track's thumbnail as it's guaranteed to be high-res
                    const dynamicCover = data.items[0].thumbnail || '';

                    // Root Fix: Deduplicate and filter out Private/Deleted tracks
                    const uniqueTracks = Array.from(new Map(data.items.map((t) => [t.id, t])).values()) as Track[];
                    const filteredTracks = uniqueTracks.filter(t =>
                        !t.title?.toLowerCase().includes('[private') &&
                        !t.title?.toLowerCase().includes('[deleted')
                    );

                    const dynamic: Playlist = {
                        id: playlistId,
                        title: metaTitle,
                        description: `Shared collection with ${filteredTracks.length} frequencies`,
                        coverUrl: dynamicCover,
                        tracks: filteredTracks,
                        trackCount: filteredTracks.length
                    };
                    setPlaylist(dynamic);
                    setEditTitle(dynamic.title);
                } else {
                    toast.error("Collection is unavailable or empty");
                }
            } catch (error) {
                console.error("Failed to fetch dynamic playlist", error);
                toast.error("Signal lost while fetching collection");
            } finally {
                clearInterval(msgInterval);
                setIsLoading(false);
            }
        };

        // 1. Search in Dynamic Editors Picks (Priority)
        let found = editorsPicks.find(p => p.id === id) as Playlist | undefined;

        // 2. Search in Stored User Playlists
        if (!found) {
            found = storedUserPlaylists.find(p => p.id === id) as unknown as Playlist;
        }

        // 3. Search in Static/Mock Playlists (Fallback)
        if (!found) {
            const allPlaylists = [...featuredPlaylists, ...userPlaylists];
            found = allPlaylists.find(p => p.id === id) as unknown as Playlist;
        }

        if (found) {
            setPlaylist(found);
            setEditTitle(found.title);
            setEditDesc(found.description || '');
        } else if (id && id.toString().startsWith('PL')) {
            fetchDynamicPlaylist(id as string);
        } else {
            setPlaylist(null); // No fallback to featured[0], show nothing or handle error
        }
    }, [id, editorsPicks, storedUserPlaylists]);

    useEffect(() => {
        if (playlist && playlist.tracks) {
            // Clean: Deduplicate and filter out Private/Deleted tracks
            const uniqueTracks = Array.from(new Map(playlist.tracks.map((t: Track) => [t.id, t])).values()) as Track[];
            const filteredTracks = uniqueTracks.filter(t =>
                !t.title?.toLowerCase().includes('[private') &&
                !t.title?.toLowerCase().includes('[deleted')
            );

            if (filteredTracks.length !== playlist.tracks.length) {
                const updated = {
                    ...playlist,
                    tracks: filteredTracks,
                    trackCount: filteredTracks.length
                };
                setPlaylist(updated);
                if (playlist.id.startsWith('user-')) {
                    updateUserPlaylist(playlist.id, { tracks: filteredTracks });
                }
            }
        }
    }, [playlist?.id, playlist?.tracks?.length]);

    useEffect(() => {
        if (!id) return;
        const fetchCommunityStats = async () => {
            try {
                const res = await fetch(`/api/community/playlists?id=${id}`);
                const data = await res.json() as { item?: { upvote_count: number } };
                if (data.item) {
                    setCommunityVotes(data.item.upvote_count);
                }
            } catch (err) {
                console.error("Failed to fetch stats", err);
            }
        };
        fetchCommunityStats();
    }, [id]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                performSearch();
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const performSearch = async () => {
        setIsSearching(true);
        try {
            const { searchYouTubeTracks } = await import('@/lib/youtube');
            const results = await searchYouTubeTracks(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error('Search failed', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        performSearch();
    };

    const handleAddTrackById = async (track: Track) => {
        if (!playlist) return;
        setIsAdding(true);
        try {
            // Duplicate Check
            const isDuplicate = playlist.tracks?.some((t: Track) => t.id === track.id);
            if (isDuplicate) {
                toast.error('This track is already in your playlist');
                return;
            }

            const updatedTracks = [...(playlist.tracks || []), track];
            const updatedPlaylist = {
                ...playlist,
                tracks: updatedTracks,
                trackCount: updatedTracks.length
            };

            setPlaylist(updatedPlaylist);

            if (playlist.id.startsWith('user-')) {
                updateUserPlaylist(playlist.id, { tracks: updatedTracks });
            }

            toast.success('Track added to playlist');
        } catch (error) {
            toast.error('Failed to add track');
        } finally {
            setIsAdding(false);
        }
    };

    const handleToggleLike = async () => {
        if (!playlist) return;

        const currentlyLiked = isLiked;
        // Optimization: UI reflex
        toggleLikePlaylist(playlist as any);

        // Senior Engineer Move: Optimistic Counter Update
        if (communityVotes !== null) {
            setCommunityVotes(prev => (currentlyLiked ? Math.max(0, (prev || 0) - 1) : (prev || 0) + 1));
        }

        if (!currentlyLiked) {
            try {
                // Inform community leaderboard (Upvote)
                await fetch('/api/community/upvote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(playlist)
                });
                toast.success('Added to community favorites!');
            } catch (e) {
                console.error("Failed to sync upvote", e);
            }
        } else {
            try {
                // Remove from community leaderboard (Downvote)
                await fetch('/api/community/downvote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(playlist)
                });
                toast.success('Removed from favorites');
            } catch (e) {
                console.error("Failed to sync downvote", e);
            }
        }
    };

    const handleUpdateCover = () => {
        if (!newCoverUrl.trim() || !playlist) return;

        const updatedPlaylist = { ...playlist, coverUrl: newCoverUrl };
        setPlaylist(updatedPlaylist);

        if (playlist.id.startsWith('user-')) {
            updateUserPlaylist(playlist.id, { coverUrl: newCoverUrl });
        }

        toast.success('Cover updated');
        setNewCoverUrl('');
        setIsEditingCover(false);
    };

    const handleRemoveTrack = (trackId: string) => {
        if (!playlist) return;
        const updatedTracks = playlist.tracks.filter((t: Track) => t.id !== trackId);
        const updatedPlaylist = { ...playlist, tracks: updatedTracks, trackCount: updatedTracks.length };
        setPlaylist(updatedPlaylist);

        if (playlist.id.startsWith('user-')) {
            updateUserPlaylist(playlist.id, { tracks: updatedTracks });
        }

        toast.success('Track removed from playlist');
    };

    const handleUpdateInfo = () => {
        if (!editTitle.trim() || !playlist) return;

        const updatedPlaylist = { ...playlist, title: editTitle, description: editDesc };
        setPlaylist(updatedPlaylist);

        if (isOwned) {
            updateUserPlaylist(playlist.id, { title: editTitle, description: editDesc });

            // Senior Engineer Move: Immediate Cloud Sync
            if (user) {
                syncPlaylist(user.id, updatedPlaylist as any);
            }

            toast.success('Playlist updated');
        }
        setIsEditingInfo(false);
    };

    const handleDeletePlaylist = async () => {
        if (!isOwned || !playlist) return;

        await deleteUserPlaylist(playlist.id, user?.id);

        toast.success('Playlist deleted');
        window.location.replace('/dashboard');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center space-y-8 bg-[#070707]">
                <div className="flex items-end gap-1.5 h-12">
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{ height: [10, 48, 10] }}
                            transition={{
                                repeat: Infinity,
                                duration: 0.8,
                                delay: i * 0.1,
                                ease: "easeInOut"
                            }}
                            className="w-1.5 bg-[#e85a20] rounded-full shadow-[0_0_20px_rgba(232,90,32,0.4)]"
                        />
                    ))}
                </div>
                <div className="space-y-1 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/90 animate-pulse">{loadingMessage}</p>
                    <p className="text-[9px] font-bold text-[#333333] uppercase tracking-widest">OpenWave Neural Sync Active</p>
                </div>
            </div>
        );
    }

    if (!playlist) return null;

    return (
        <div className="min-h-screen pb-32">
            {/* Header */}
            <div className="relative h-[35vh] min-h-[280px] flex items-end pb-8 overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center blur-3xl opacity-10 scale-110"
                    style={{ backgroundImage: `url(${playlist.coverUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070707] to-transparent" />

                <div className="container mx-auto px-8 relative z-10 flex items-end gap-8 w-full">
                    {/* Back Button */}
                    <div className="absolute -top-12 left-0 z-20">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full w-9 h-9 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white border border-white/10 transition-colors cursor-pointer"
                            onClick={() => window.history.back()}
                        >
                            <ChevronDown className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Action Bar - Senior Engineer Edition */}
                    {isOwned && (
                        <div className="absolute top-0 right-0 z-30 flex flex-col items-end gap-3 p-4">
                            {/* Edit Action */}
                            <div className="flex justify-end">
                                <Dialog open={isEditingInfo} onOpenChange={setIsEditingInfo}>
                                    <DialogTrigger asChild>
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="h-11 w-11 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-xl flex items-center justify-center text-white opacity-40 hover:opacity-100 transition-all duration-300 cursor-pointer"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </motion.button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-black border border-white/10 text-white rounded-[24px]">
                                        <DialogHeader>
                                            <DialogTitle className="text-lg font-black">Edit Details</DialogTitle>
                                            <DialogDescription className="text-[10px] text-[#555555]">Update your collection identity.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-[#333333]">Title</label>
                                                <Input
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    className="bg-[#0a0a0a] border-white/5 focus:border-white/10 h-10 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-[#333333]">Description</label>
                                                <Input
                                                    value={editDesc}
                                                    onChange={(e) => setEditDesc(e.target.value)}
                                                    className="bg-[#0a0a0a] border-white/5 focus:border-white/10 h-10 text-sm"
                                                />
                                            </div>
                                            <Button onClick={handleUpdateInfo} className="w-full bg-[#f0f0f0] text-black hover:bg-white rounded-full font-black uppercase text-[9px] tracking-widest h-10 mt-2">
                                                Save Changes
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {/* Share Action */}
                            <div className="flex justify-end">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        toast.success('Link copied to clipboard');
                                    }}
                                    className="h-11 w-11 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-xl flex items-center justify-center text-white opacity-40 hover:opacity-100 transition-all duration-300 cursor-pointer"
                                >
                                    <Share2 className="w-4 h-4" />
                                </motion.button>
                            </div>

                            {/* Delete Action */}
                            <div className="flex justify-end">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleDeletePlaylist}
                                    className="h-11 w-11 rounded-2xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 backdrop-blur-xl flex items-center justify-center text-red-500 opacity-40 hover:opacity-100 transition-all duration-300 cursor-pointer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </motion.button>
                            </div>
                        </div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative w-40 h-40 md:w-52 md:h-52 rounded-xl overflow-hidden shadow-2xl flex-shrink-0 group/cover bg-gradient-to-br from-[#1a1a1a] to-black border border-white/5 flex items-center justify-center"
                    >
                        {playlist.coverUrl && !playlist.coverUrl.includes('unsplash.com/photo-1470225620780-dba8ba36b745') ? (
                            <img src={playlist.coverUrl} alt={playlist.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center justify-center">
                                <div className="w-24 h-24 rounded-[32px] bg-gradient-to-b from-white/[0.03] to-transparent flex items-center justify-center border border-white/[0.05] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                                    <Music className="w-12 h-12 text-[#1a1a1a] group-hover:text-[#2a2a2a] transition-colors" />
                                </div>
                            </div>
                        )}

                        {/* Edit Cover Overlay */}
                        {isOwned && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-end justify-end p-4">
                                <Dialog open={isEditingCover} onOpenChange={setIsEditingCover}>
                                    <DialogTrigger asChild>
                                        <button className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center border border-white/10 text-white transition-all transform hover:scale-110 cursor-pointer">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-black border border-white/10 text-white rounded-[24px]">
                                        <DialogHeader>
                                            <DialogTitle className="text-xl font-black">Edit Cover</DialogTitle>
                                            <DialogDescription className="text-xs text-[#555555]">Update your playlist cover image.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-6 py-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-[#333333]">Via URL</label>
                                                <Input
                                                    placeholder="https://images.unsplash.com/..."
                                                    value={newCoverUrl}
                                                    onChange={(e) => setNewCoverUrl(e.target.value)}
                                                    className="bg-[#0a0a0a] border-white/5 focus:border-white/10 h-11 font-medium"
                                                />
                                            </div>

                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div>
                                                <div className="relative flex justify-center text-[8px] uppercase font-black text-[#222222]"><span className="bg-black px-2">OR</span></div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-[#333333]">Upload Local File</label>
                                                <div className="group relative h-24 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center hover:border-white/20 transition-all cursor-pointer">
                                                    <Upload className="w-5 h-5 text-[#333333] group-hover:text-white mb-2" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-[#222222] group-hover:text-[#444444]">Choose File</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleFileChange}
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                    />
                                                </div>
                                            </div>

                                            <Button
                                                onClick={handleUpdateCover}
                                                disabled={!newCoverUrl}
                                                className="w-full bg-[#f0f0f0] text-black hover:bg-white rounded-full font-black uppercase text-[10px] tracking-widest h-11 mt-4"
                                            >
                                                Update Cover
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        )}
                    </motion.div>

                    <div className="relative flex-1 space-y-3 pb-1">
                        <motion.h1
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="text-3xl md:text-5xl font-bold text-white leading-none"
                        >
                            {playlist.title}
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.2 }}
                            className="text-[#666666] text-xs font-medium max-w-xl leading-relaxed line-clamp-2"
                        >
                            {playlist.description}
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.3 }}
                            className="flex items-center gap-3 text-[10px] font-bold text-[#444444]"
                        >
                            <span>{playlist.tracks?.length || 0} tracks</span>
                            <span className="w-1 h-1 rounded-full bg-[#1a1a1a]" />
                            <span>{calculateTotalDuration(playlist.tracks || [])}</span>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3, duration: 0.2 }}
                            className="pt-2"
                        >
                            <div className="flex items-center gap-3">
                                <Button
                                    size="sm"
                                    onClick={() => playlist.tracks?.[0] && playTrack(playlist.tracks[0], playlist.tracks, { id: playlist.id, name: playlist.title })}
                                    className="bg-zinc-800 hover:bg-zinc-400 hover:text-black text-white rounded-full px-8 h-10 font-black uppercase tracking-widest text-[10px] shadow-lg transition-all duration-300 active:scale-95 border border-white/5 cursor-pointer group"
                                >
                                    <Play className="w-4 h-4 mr-2 group-hover:fill-black" fill="currentColor" />
                                    Play Mix
                                </Button>

                                {isOwned ? (
                                    <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 p-1 px-1.5 rounded-full">
                                        <div className="flex items-center gap-1.5 px-0.5">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={handleToggleLike}
                                                className={cn(
                                                    "rounded-full w-8 h-8 p-0 border border-white/5 transition-all cursor-pointer",
                                                    isLiked ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "bg-white/5 text-[#444444] hover:text-white"
                                                )}
                                            >
                                                <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                                            </Button>

                                            {communityVotes !== null && communityVotes > 0 && (
                                                <span className={cn(
                                                    "text-[10px] font-black tabular-nums pr-1 animate-in fade-in slide-in-from-left-2 duration-300",
                                                    isLiked ? "text-white" : "text-[#e85a20]"
                                                )}>
                                                    {communityVotes}
                                                </span>
                                            )}
                                        </div>

                                        <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

                                        <div
                                            onClick={() => {
                                                const newPrivacy = !playlist.isPublic;
                                                const updated = { ...playlist, isPublic: newPrivacy };
                                                setPlaylist(updated);
                                                updateUserPlaylist(playlist.id, { isPublic: newPrivacy });

                                                // Senior Engineer Move: Immediate Cloud Persistence
                                                if (user) {
                                                    syncPlaylist(user.id, updated as any);
                                                }

                                                // Sync with community leaderboard if it exists there
                                                fetch('/api/community/sync', {
                                                    method: 'POST',
                                                    body: JSON.stringify({
                                                        id: playlist.id,
                                                        isPublic: newPrivacy,
                                                        title: playlist.title,
                                                        description: playlist.description,
                                                        coverUrl: playlist.coverUrl
                                                    })
                                                }).catch(err => console.error("Community sync failed", err));

                                                toast.success(`Mix set to ${newPrivacy ? 'Public' : 'Private'}`);
                                            }}
                                            className={cn(
                                                "flex items-center gap-2 pr-2.5 pl-1.5 py-1 rounded-lg transition-all cursor-pointer hover:bg-white/5 active:scale-95"
                                            )}
                                        >
                                            <div className={cn(
                                                "flex items-center justify-center transition-all duration-500",
                                                playlist.isPublic ? "text-[#e85a20]" : "text-white/40"
                                            )}>
                                                {playlist.isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[#666666]">
                                                {playlist.isPublic ? 'Public' : 'Private'}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleToggleLike}
                                        className={cn(
                                            "rounded-full px-4 h-10 border border-white/5 transition-all cursor-pointer flex items-center gap-2",
                                            isLiked ? "bg-white text-black border-white shadow-[0_0_25px_rgba(255,255,255,0.2)]" : "bg-white/5 text-[#444444] hover:text-white"
                                        )}
                                    >
                                        <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                                        {communityVotes !== null && communityVotes > 0 && (
                                            <span className="text-[11px] font-black tabular-nums">
                                                {communityVotes}
                                            </span>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Track List */}
            <div className="py-10">
                <div className="container mx-auto px-8">
                    <div className="grid grid-cols-[40px_1fr_auto] gap-4 px-6 py-3 text-[11px] font-bold text-[#444444] border-b border-white/5 mb-6">
                        <span>#</span>
                        <span>Title</span>
                        <span className="flex justify-end"><Clock className="w-4 h-4" /></span>
                    </div>

                    <div className="space-y-1">
                        {playlist.tracks && playlist.tracks.length > 0 ? (
                            playlist.tracks.map((track, index) => (
                                <motion.div
                                    key={track.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group grid grid-cols-[40px_1fr_auto] gap-4 px-6 py-4 rounded-2xl hover:bg-white/[0.03] transition-all items-center cursor-pointer border border-transparent hover:border-white/5"
                                    onClick={() => playTrack(track, playlist.tracks, { id: playlist.id, name: playlist.title })}
                                >
                                    <div className="text-xs font-black text-[#222222] group-hover:text-[#e85a20] transition-colors">
                                        {(index + 1).toString().padStart(2, '0')}
                                    </div>

                                    <div className="flex items-center gap-5 min-w-0">
                                        <div className="relative flex-shrink-0">
                                            <img src={track.thumbnail || undefined} className="w-12 h-12 rounded-xl object-cover shadow-xl" alt="" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                                <Play className="w-5 h-5 text-white" fill="currentColor" />
                                            </div>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-white line-clamp-1 mb-0.5">{track.title}</p>
                                            <p className="text-[11px] font-medium text-[#666666]">{track.artist}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <span className="text-[11px] font-black tracking-widest text-[#333333] group-hover:text-white transition-colors">
                                            {track.duration ? formatDuration(track.duration) : '--:--'}
                                        </span>
                                        {!playlist.id.startsWith('dynamic') && !playlist.id.startsWith('trending') && isOwned && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveTrack(track.id);
                                                }}
                                                className="p-2 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all cursor-pointer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="py-32 text-center">
                                <Music className="w-12 h-12 text-[#111111] mx-auto mb-6" />
                                <p className="text-xs font-bold text-[#444444]">This collection is empty</p>
                            </div>
                        )}
                    </div>
                </div>
            </div >

            {/* Sticky Add Music Button (Bottom Drawer) */}
            {
                isOwned && (
                    <div className={cn(
                        "fixed left-0 right-0 z-[100] transition-all duration-500 pointer-events-auto",
                        currentTrack ? "bottom-28" : "bottom-12"
                    )}>
                        <div className="container mx-auto px-8 flex justify-center">
                            <Drawer>
                                <DrawerTrigger asChild>
                                    <Button
                                        className="h-12 px-8 bg-white text-black hover:bg-[#e85a20] hover:text-white rounded-full font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-orange-950/20 group transition-all duration-500 active:scale-95 cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4 mr-3 group-hover:rotate-90 transition-transform duration-500" />
                                        Expand Collection
                                    </Button>
                                </DrawerTrigger>
                                <DrawerContent className="bg-[#0a0a0a] border-white/5 h-[80vh]">
                                    <div className="mx-auto w-full max-w-2xl px-8 py-10 space-y-10">
                                        <DrawerHeader className="p-0 text-left space-y-2">
                                            <DrawerTitle className="text-2xl font-black text-white">Neural Search</DrawerTitle>
                                            <DrawerDescription className="text-[10px] font-black uppercase tracking-[0.3em] text-[#333333]">Query the OpenWave global music index</DrawerDescription>
                                        </DrawerHeader>

                                        <form onSubmit={handleSearchSubmit} className="relative group">
                                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#222222] group-focus-within:text-[#e85a20] transition-colors" />
                                            <Input
                                                placeholder="Artist, track, or ambiance..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="h-16 pl-14 bg-white/[0.02] border-white/5 rounded-2xl text-lg font-bold placeholder:text-[#1a1a1a] focus:ring-0 focus:border-[#e85a20]/30 transition-all shadow-2xl"
                                                autoFocus
                                            />
                                        </form>

                                        <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-4 subtle-scrollbar">
                                            {isSearching ? (
                                                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                                                    <Loader2 className="w-8 h-8 text-[#e85a20] animate-spin" />
                                                    <p className="text-[8px] font-black uppercase text-[#333333]">Querying neural nodes...</p>
                                                </div>
                                            ) : searchResults.length > 0 ? (
                                                searchResults.map((track, index) => (
                                                    <motion.div
                                                        key={track.id}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.03 }}
                                                        className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] transition-all group"
                                                    >
                                                        <div className="flex items-center gap-4 min-w-0">
                                                            <img src={track.thumbnail || undefined} className="w-12 h-12 rounded-xl object-cover shadow-lg" alt="" />
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-sm text-white truncate">{track.title}</p>
                                                                <p className="text-[10px] font-medium text-[#444444] truncate">{track.artist}</p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            disabled={isAdding}
                                                            onClick={() => handleAddTrackById(track)}
                                                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white hover:text-black transition-all cursor-pointer p-0"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </Button>
                                                    </motion.div>
                                                ))
                                            ) : searchQuery ? (
                                                <div className="py-20 text-center text-[#222222]">No frequencies found matching that query.</div>
                                            ) : (
                                                <div className="py-20 flex flex-col items-center justify-center gap-4 text-[#1a1a1a]">
                                                    <Search className="w-8 h-8 opacity-20" />
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-20">Awaiting Search Input</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </DrawerContent>
                            </Drawer>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
