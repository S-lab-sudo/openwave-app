import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track } from './usePlayerStore';

interface SearchState {
    query: string;
    filter: string;
    results: Track[];
    cache: Record<string, Track[]>;

    setQuery: (query: string) => void;
    setFilter: (filter: string) => void;
    setResults: (results: Track[]) => void;
    addToCache: (key: string, items: Track[]) => void;
    clearSearch: () => void;
}

export const useSearchStore = create<SearchState>()(
    persist(
        (set) => ({
            query: '',
            filter: 'Playlist',
            results: [],
            cache: {},

            setQuery: (query) => set({ query }),
            setFilter: (filter) => set({ filter }),
            setResults: (results) => set({ results }),
            addToCache: (key, items) => set((state) => ({
                cache: { ...state.cache, [key]: items }
            })),
            clearSearch: () => set({ query: '', results: [] }),
        }),
        {
            name: 'openwave-search-storage',
            partialize: (state) => ({ cache: state.cache, query: state.query, filter: state.filter, results: state.results }),
        }
    )
);
