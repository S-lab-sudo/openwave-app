import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Track {
    id: string;
    title: string;
    artist: string;
    album: string;
    description?: string;
    duration: number;
    thumbnail: string;
    youtubeUrl: string;
    isPlaylist?: boolean;
}

interface PlayerState {
    currentTrack: Track | null;
    isPlaying: boolean;
    isFullPlayerOpen: boolean;
    progress: number;
    volume: number;
    shuffle: boolean;
    repeat: 'off' | 'all' | 'one';
    queue: Track[];
    history: Track[];
    seekTo: number | null;
    activeCollection: { id: string; name: string } | null;

    setCurrentTrack: (track: Track | null) => void;
    setIsPlaying: (playing: boolean) => void;
    setIsFullPlayerOpen: (isOpen: boolean) => void;
    setProgress: (progress: number) => void;
    setSeekTo: (progress: number | null) => void;
    setVolume: (volume: number) => void;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    playTrack: (track: Track, context?: Track[], collection?: { id: string; name: string }) => void;
    pauseTrack: () => void;
    nextTrack: () => void;
    prevTrack: () => void;
    addToQueue: (track: Track) => void;
    setQueue: (tracks: Track[]) => void;
    setHistory: (tracks: Track[]) => void;
}

export const usePlayerStore = create<PlayerState>()(
    persist(
        (set, get) => ({
            currentTrack: null,
            isPlaying: false,
            isFullPlayerOpen: false,
            progress: 0,
            volume: 80,
            shuffle: false,
            repeat: 'off',
            queue: [],
            history: [],
            seekTo: null,
            activeCollection: null,

            setCurrentTrack: (track) => set({ currentTrack: track }),
            setIsPlaying: (isPlaying) => set({ isPlaying }),
            setIsFullPlayerOpen: (isFullPlayerOpen) => set({ isFullPlayerOpen }),
            setProgress: (progress) => set({ progress }),
            setSeekTo: (seekTo) => set({ seekTo }),
            setVolume: (volume) => set({ volume }),
            toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
            toggleRepeat: () => {
                const { repeat, queue } = get();
                const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];

                // If the user specifically wants simplified looping when not in a "playlist" (queue size <= 1)
                // We still support all 3 for flexibility, but the UI can hint.
                const currentModeIndex = modes.indexOf(repeat);
                const nextMode = modes[(currentModeIndex + 1) % modes.length];
                set({ repeat: nextMode });
            },
            playTrack: (track, context, collection) => {
                const { queue, history } = get();

                let activeTrack = { ...track };
                if (activeTrack.duration > 20000) {
                    activeTrack.duration = Math.floor(activeTrack.duration / 1000);
                }

                // Add to history (deduplicate and put at front)
                const newHistory = [activeTrack, ...history.filter(t => t.id !== activeTrack.id)].slice(0, 50);

                // FIRE AND FORGET: Sync to database
                const authState = (window as any).__USE_AUTH_STORE__?.getState() || {};
                // Note: In a real app we'd import useAuthStore, but for this context we use getState
                import('@/store/useAuthStore').then(m => {
                    const { user, guestId } = m.useAuthStore.getState();
                    fetch('/api/taste/log', {
                        method: 'POST',
                        body: JSON.stringify({
                            track: activeTrack,
                            userId: user?.id,
                            guestId: guestId
                        })
                    }).catch(err => console.error('History sync failed', err));
                });

                if (context && context.length > 0) {
                    // Seed the queue with the playlist context
                    set({
                        queue: context,
                        currentTrack: activeTrack,
                        isPlaying: true,
                        progress: 0,
                        history: newHistory,
                        activeCollection: collection || null
                    });
                } else {
                    const isInQueue = queue.some(t => t.id === track.id);
                    if (!isInQueue) {
                        set({ queue: [...queue, activeTrack] });
                    }
                    set({
                        currentTrack: activeTrack,
                        isPlaying: true,
                        progress: 0,
                        history: newHistory,
                        activeCollection: collection || get().activeCollection
                    });
                }
            },
            pauseTrack: () => set({ isPlaying: false }),
            nextTrack: () => {
                const { queue, currentTrack, repeat } = get();
                if (!currentTrack) return;

                // Handle Repeat One
                if (repeat === 'one') {
                    // Just reset the current track
                    set({ progress: 0, isPlaying: true, seekTo: 0 });
                    return;
                }

                if (queue.length === 0) return;

                const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
                if (currentIndex < queue.length - 1) {
                    const next = queue[currentIndex + 1];
                    set({ currentTrack: next, isPlaying: true, progress: 0 });
                } else if (repeat === 'all') {
                    const first = queue[0];
                    set({ currentTrack: first, isPlaying: true, progress: 0 });
                } else {
                    set({ isPlaying: false }); // End of queue
                }
            },
            prevTrack: () => {
                const { queue, currentTrack, repeat, progress } = get();
                if (!currentTrack) return;

                // If song is more than 3 seconds in, just restart it
                if (progress > 5) { // 5% of track usually > 3s
                    set({ progress: 0, seekTo: 0 });
                    return;
                }

                if (queue.length === 0) return;

                const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
                if (currentIndex > 0) {
                    const prev = queue[currentIndex - 1];
                    set({ currentTrack: prev, isPlaying: true, progress: 0 });
                } else if (repeat === 'all') {
                    const last = queue[queue.length - 1];
                    set({ currentTrack: last, isPlaying: true, progress: 0 });
                }
            },
            addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
            setQueue: (tracks) => set({ queue: tracks }),
            setHistory: (tracks) => set({ history: tracks }),
        }),
        {
            name: 'openwave-player-storage',
            partialize: (state) => ({
                volume: state.volume,
                queue: state.queue,
                history: state.history
            }),
        }
    )
);
