'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Search as SearchIcon, Music, Zap, Loader2, ListPlus } from 'lucide-react';
import { SearchInput } from '@/components/ui/search-input';
import { TrackRow } from '@/components/playlist/TrackRow';
import { Button } from '@/components/ui/button';
import { Track, usePlayerStore } from '@/store/usePlayerStore';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useSearchStore } from '@/store/useSearchStore';

const FILTER_CHIPS = [
    { label: 'Playlist', suffix: 'playlist' },
    { label: 'Song', suffix: '' },
    { label: 'Karaoke', suffix: 'karaoke' },
];

function SearchContent() {
    const searchParams = useSearchParams();
    const urlQuery = searchParams.get('q') || '';

    const {
        query: baseQuery,
        filter: activeFilter,
        results,
        cache,
        setQuery: setBaseQuery,
        setFilter: setActiveFilter,
        setResults,
        addToCache
    } = useSearchStore();

    const [isLoading, setIsLoading] = useState(false);
    const [visibleCount, setVisibleCount] = useState(5);

    const { playTrack, setQueue } = usePlayerStore();

    const handlePlayWithArtistContext = async (track: Track) => {
        // 1. Play immediately with existing results as fallback context
        playTrack(track, results);

        // 2. Background Discovery: Fetch tracks purely from this artist/channel
        try {
            const artistQuery = track.artist;
            if (!artistQuery || artistQuery === 'Various Artists') return;

            const response = await fetch(`/api/search?q=${encodeURIComponent(artistQuery)}`);
            const data = await response.json();
            const artistTracks = data.items || [];

            if (artistTracks.length > 1) {
                // Premium Queue Synthesis: Current track followed by artist-specific tracks
                const filtered = artistTracks.filter((t: Track) => t.id !== track.id);
                setQueue([track, ...filtered]);
            }
        } catch (error) {
            console.error('Artist context discovery failed:', error);
        }
    };

    useEffect(() => {
        if (urlQuery) {
            console.log("Search Page: URL Query received:", urlQuery);
            setBaseQuery(urlQuery);
            executeSearch(urlQuery, activeFilter);
        } else if (baseQuery && results.length === 0) {
            // Fallback for direct navigation if query is in store
            console.log("Search Page: Fallback to Store Query:", baseQuery);
            executeSearch(baseQuery, activeFilter);
        }
    }, [urlQuery, activeFilter]); // Added activeFilter to deps to ensure re-search on filter change from store

    const executeSearch = async (query: string, filterLabel: string) => {
        if (!query.trim()) return;

        const cacheKey = `${query.toLowerCase()}:${filterLabel}`;

        // Fresh search: clear previous results and show loading immediately
        if (!cache[cacheKey]) {
            setResults([]);
            setIsLoading(true);
        }

        // INSTANT CACHE HIT: Skip API call if we've already seen this exact search in this mode
        if (cache[cacheKey]) {
            setActiveFilter(filterLabel);
            setResults(cache[cacheKey]);
            setVisibleCount(5);
            return;
        }

        const isPlaylist = filterLabel === 'Playlist';
        const suffix = isPlaylist ? '' : (FILTER_CHIPS.find(f => f.label === filterLabel)?.suffix || '');
        const finalQuery = suffix ? `${query} ${suffix}` : query;

        setActiveFilter(filterLabel);
        setVisibleCount(5);

        try {
            const endpoint = isPlaylist ? `/api/search?type=playlist&q=${encodeURIComponent(finalQuery)}` : `/api/search?q=${encodeURIComponent(finalQuery)}`;
            const response = await fetch(endpoint);
            const data = await response.json();
            const items = data.items || [];

            setResults(items);
            addToCache(cacheKey, items);
        } catch (error) {
            console.error('Search failed:', error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchSubmit = (searchTerm: string) => {
        setBaseQuery(searchTerm);
        executeSearch(searchTerm, activeFilter); // Use currently active filter
    };

    const handleFilterClick = (filterLabel: string) => {
        if (!baseQuery) return;
        executeSearch(baseQuery, filterLabel);
    };

    const handleShowMore = () => {
        setVisibleCount(prev => prev + 5);
    };

    return (
        <div className="container mx-auto px-8 py-10 space-y-10">
            <motion.header
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-6"
            >
                <div className="space-y-2">
                    <motion.h1
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.2 }}
                        className="text-3xl font-black text-white flex items-center gap-3"
                    >
                        <SearchIcon className="w-8 h-8 text-[#ff6b35]" />
                        Search
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                        className="text-[#888888] text-base font-medium"
                    >
                        Find your favorite tracks, artists, and high-quality playlists.
                    </motion.p>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="w-full"
                >
                    <SearchInput
                        placeholder="Search for tracks, artists, or playlists..."
                        value={baseQuery}
                        onChange={setBaseQuery}
                        onSubmit={handleSearchSubmit}
                        activeFilter={activeFilter}
                        onFilterChange={handleFilterClick}
                        filters={FILTER_CHIPS}
                        className="shadow-2xl w-full"
                        autoFocus={true}
                        fullWidth={true}
                    />
                </motion.div>
            </motion.header>



            <div className="flex items-center justify-between border-b border-white/[0.03] pb-6">
                <p className="text-sm font-bold text-[#444444] flex items-center gap-2">
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin text-[#ff6b35]" />}
                    {isLoading
                        ? 'Searching OpenWave...'
                        : results.length > 0
                            ? `Found ${results.length} results for "${baseQuery}"`
                            : baseQuery
                                ? 'No results found'
                                : 'Ready to search'
                    }
                </p>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-20 rounded-[20px] bg-white/[0.02] animate-pulse" />
                        ))}
                    </div>
                ) : results.length > 0 ? (
                    <>
                        <div className="grid gap-1">
                            {results.slice(0, visibleCount).map((track, index) => (
                                <TrackRow
                                    key={track.id}
                                    track={track}
                                    index={index}
                                    onPlay={() => handlePlayWithArtistContext(track)}
                                    className="bg-transparent border-none rounded-2xl hover:bg-white/[0.03] py-5 px-4 transition-all"
                                />
                            ))}
                        </div>

                        {visibleCount < results.length && (
                            <div className="flex justify-center pt-8">
                                <Button
                                    variant="outline"
                                    onClick={handleShowMore}
                                    className="rounded-full px-8 h-12 border-white/10 hover:bg-white/5 text-[11px] font-bold gap-2 bg-transparent text-[#888888] hover:text-white transition-all"
                                >
                                    <ListPlus className="w-4 h-4" />
                                    Show 5 more
                                </Button>
                            </div>
                        )}
                    </>
                ) : !baseQuery && (
                    <div className="flex flex-col items-center justify-center py-32 text-center opacity-30">
                        <div className="w-20 h-20 rounded-[30px] bg-white/5 flex items-center justify-center mb-6">
                            <Zap className="w-8 h-8 text-[#ff6b35]" />
                        </div>
                        <p className="text-sm font-black uppercase tracking-widest">Type something to begin your journey</p>
                    </div>
                )}

                {!isLoading && baseQuery && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 text-center opacity-30">
                        <div className="w-20 h-20 rounded-[30px] bg-white/5 flex items-center justify-center mb-6">
                            <Music className="w-8 h-8 text-[#ff6b35]" />
                        </div>
                        <p className="text-sm font-black uppercase tracking-widest">No tracks found for "{baseQuery}"</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="container mx-auto px-8 py-32 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-[#ff6b35] border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-[#888888] font-bold text-xs uppercase tracking-widest">Initializing search...</p>
            </div>
        }>
            <SearchContent />
        </Suspense>
    );
}
