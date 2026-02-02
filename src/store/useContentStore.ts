import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track } from './usePlayerStore';

export interface DynamicPlaylist {
    id: string;
    title: string;
    description: string;
    coverUrl: string;
    tracks: Track[];
    isPublic: boolean;
}

interface ContentState {
    editorsPicks: DynamicPlaylist[];
    setEditorsPicks: (playlists: DynamicPlaylist[]) => void;
    userPlaylists: DynamicPlaylist[];
    addUserPlaylist: (playlist: DynamicPlaylist) => void;
    setUserPlaylists: (playlists: DynamicPlaylist[]) => void;
    updateUserPlaylist: (id: string, updates: Partial<DynamicPlaylist>) => void;
    deleteUserPlaylist: (id: string, userId?: string) => Promise<void>;

    lastFetched: number;
    setLastFetched: (timestamp: number) => void;

    likedPlaylists: DynamicPlaylist[];
    toggleLikePlaylist: (playlist: DynamicPlaylist) => void;

    pushToCloud: (userId: string) => Promise<void>;
    pullFromCloud: (userId: string) => Promise<void>;
    syncPlaylist: (userId: string, playlist: DynamicPlaylist) => Promise<void>;
    togglePrivacy: (playlistId: string) => void;
}

const deduplicateTracks = (tracks: Track[]): Track[] => {
    if (!tracks) return [];
    const seen = new Set();
    return tracks.filter(track => {
        if (seen.has(track.id)) return false;
        seen.add(track.id);
        return true;
    });
};

export const useContentStore = create<ContentState>()(
    persist(
        (set) => ({
            editorsPicks: [],
            setEditorsPicks: (playlists) => set({ editorsPicks: playlists }),
            userPlaylists: [],
            addUserPlaylist: (playlist: DynamicPlaylist) => set((state) => {
                const cleanedPlaylist = {
                    ...playlist,
                    tracks: deduplicateTracks(playlist.tracks)
                };

                // Prevent duplicate playlists
                const exists = state.userPlaylists.some(p => p.id === playlist.id);
                if (exists) return state;

                return {
                    userPlaylists: [cleanedPlaylist, ...state.userPlaylists]
                };
            }),
            setUserPlaylists: (playlists: DynamicPlaylist[]) => {
                // Deduplicate playlists
                const unique = playlists.reduce((acc: DynamicPlaylist[], curr) => {
                    const isDuplicate = acc.some(p => p.id === curr.id);
                    if (!isDuplicate) {
                        acc.push({
                            ...curr,
                            tracks: deduplicateTracks(curr.tracks)
                        });
                    }
                    return acc;
                }, []);
                set({ userPlaylists: unique });
            },
            updateUserPlaylist: (id, updates) => set((state) => ({
                userPlaylists: state.userPlaylists.map((p) => {
                    if (p.id === id) {
                        const mergedTracks = updates.tracks ? deduplicateTracks(updates.tracks) : p.tracks;
                        return {
                            ...p,
                            ...updates,
                            tracks: mergedTracks,
                        };
                    }
                    return p;
                }),
            })),
            deleteUserPlaylist: async (id, userId) => {
                set((state) => ({
                    userPlaylists: state.userPlaylists.filter((p) => p.id !== id)
                }));

                if (userId && id.length > 30) {
                    await fetch(`/api/user/playlists?id=${id}&userId=${userId}`, {
                        method: 'DELETE',
                    });
                }
            },
            lastFetched: 0,
            setLastFetched: (timestamp) => set({ lastFetched: timestamp }),

            likedPlaylists: [],

            toggleLikePlaylist: (playlist) => set((state) => {
                const isLiked = state.likedPlaylists.some(p => p.id === playlist.id);
                if (isLiked) {
                    return { likedPlaylists: state.likedPlaylists.filter(p => p.id !== playlist.id) };
                } else {
                    return { likedPlaylists: [playlist, ...state.likedPlaylists] };
                }
            }),

            pushToCloud: async (userId) => {
                const { userPlaylists } = useContentStore.getState();
                let hasChanges = false;
                const updatedPlaylists = [...userPlaylists];

                for (let i = 0; i < updatedPlaylists.length; i++) {
                    const playlist = updatedPlaylists[i];

                    // Skip if already synced (UUIDs are 36 chars)
                    if (playlist.id.length > 30 && !playlist.id.startsWith('user-')) continue;

                    try {
                        const response = await fetch('/api/user/playlists', {
                            method: 'POST',
                            body: JSON.stringify({ userId, playlist })
                        });
                        const result = await response.json();

                        if (result.success && result.id) {
                            updatedPlaylists[i] = { ...playlist, id: result.id };
                            hasChanges = true;
                        }
                    } catch (error) {
                        console.error('Individual Sync Failed:', error);
                    }
                }

                if (hasChanges) {
                    set({ userPlaylists: updatedPlaylists });
                }
            },

            pullFromCloud: async (userId) => {
                const response = await fetch(`/api/user/playlists?userId=${userId}`);
                const data = await response.json();
                if (data.items) {
                    set({ userPlaylists: data.items });
                }
            },

            syncPlaylist: async (userId, playlist) => {
                await fetch('/api/user/playlists', {
                    method: 'POST',
                    body: JSON.stringify({ userId, playlist })
                });
            },

            togglePrivacy: (playlistId) => set((state) => {
                const userPlaylists = state.userPlaylists.map(p =>
                    p.id === playlistId ? { ...p, isPublic: !p.isPublic } : p
                );
                return { userPlaylists };
            })
        }),
        {
            name: 'openwave-content-storage',
            partialize: (state) => ({
                userPlaylists: state.userPlaylists,
                likedPlaylists: state.likedPlaylists,
            }),
        }
    )
);
