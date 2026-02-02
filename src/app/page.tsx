'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, TrendingUp, Music, Heart, Zap, Disc, Loader2, ListPlus, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatDuration } from '@/lib/utils';
import { toast } from 'sonner';
import { SearchInput } from '@/components/ui/search-input';
import { PlaylistCard } from '@/components/playlist/PlaylistCard';
import { mockTracks } from '@/data/mockData';
import { useEffect, useState, useRef } from 'react';
import { getTrendingTracks, getDynamicEditorsPicks } from '@/lib/youtube';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { TrackRow } from '@/components/playlist/TrackRow';
import { useContentStore } from '@/store/useContentStore';
import { useSearchStore } from '@/store/useSearchStore';

export default function Home() {
  const router = useRouter();
  const { playTrack } = usePlayerStore();
  const { editorsPicks, setEditorsPicks, lastFetched, setLastFetched, likedPlaylists } = useContentStore();

  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [recommendedTracks, setRecommendedTracks] = useState<Track[]>([]);
  const [communityPlaylists, setCommunityPlaylists] = useState<any[]>([]);
  const [curatedPlaylists, setCuratedPlaylists] = useState<any[]>([]);
  const [visibleTracks, setVisibleTracks] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingCommunity, setIsFetchingCommunity] = useState(false);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [isRefreshingRecs, setIsRefreshingRecs] = useState(false);
  const { query: globalSearchQuery, setQuery: setGlobalSearchQuery } = useSearchStore();
  const [homeSearch, setHomeSearch] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const MOODS = [
    { name: 'Chill', query: 'Chill Lo-fi Vibes' },
    { name: 'Energetic', query: 'High Energy Pop Workout' },
    { name: 'Happy', query: 'Feel Good Summer Hits' },
    { name: 'Focus', query: 'Deep Focus Ambient Piano' },
    { name: 'Sad', query: 'Late Night Melancholy' },
    { name: 'Party', query: 'Global Party Anthems' },
    { name: 'Romance', query: 'Romantic Acoustic Ballads' },
    { name: 'Study', query: 'Academic Focus Lo-fi' },
    { name: 'Gym', query: 'Heavy Metal Gym Pump' },
    { name: 'Nature', query: 'Nature Sounds Ambient' },
    { name: 'Retro', query: '80s Synthwave Hits' },
    { name: 'Jazz', query: 'Smooth Midnight Jazz' },
  ];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    fetch('http://ip-api.com/json/')
      .then(res => res.json())
      .then(data => {
        if (data && data.country) {
          setUserCountry(data.country);
        }
      })
      .catch(() => console.log("Geolocation fallback to global"));
  }, []);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const fetchData = async () => {
      try {
        await Promise.allSettled([
          getTrendingTracks('US').then(tracks => setTrendingTracks(tracks)),
          fetchCommunityPlaylists(),
          refreshCuratedPlaylists()
        ]);
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchCommunityPlaylists = async () => {
    setIsFetchingCommunity(true);
    try {
      const res = await fetch('/api/community/playlists');
      const data = await res.json();
      setCommunityPlaylists(data.items || []);
    } catch (error) {
      console.error("Failed to fetch community playlists", error);
    } finally {
      setIsFetchingCommunity(false);
    }
  };

  const refreshCuratedPlaylists = async () => {
    try {
      const response = await fetch('/api/taste/playlists');
      const data = await response.json();
      setCuratedPlaylists(data.items || []);
    } catch (e) {
      console.error("Failed to fetch playlists", e);
    }
  };

  const refreshRecommendedTracks = async (moodQuery?: string) => {
    setIsRefreshingRecs(true);
    try {
      const localizedQuery = (userCountry && moodQuery) ? `${userCountry} ${moodQuery}` : moodQuery;
      const endpoint = localizedQuery ? `/api/search?q=${encodeURIComponent(localizedQuery)}` : '/api/search?q=Top Hits 2024';
      const response = await fetch(endpoint);
      const data = await response.json();
      setRecommendedTracks(data.items || []);
    } catch (error) {
      console.error("Failed to refresh recommendations", error);
    } finally {
      setIsRefreshingRecs(false);
    }
  };

  const handleMoodSelect = (mood: any) => {
    setSelectedMood(mood.name);
    refreshRecommendedTracks(mood.query);
  };

  const handleSearchSubmit = (value: string) => {
    if (value.trim()) {
      setGlobalSearchQuery(value.trim());
      router.push(`/search?q=${encodeURIComponent(value.trim())}`);
    }
  };

  const handleLoadMore = () => {
    setVisibleTracks(prev => Math.min(prev + 10, trendingTracks.length));
  };

  useEffect(() => {
    const handleHotRefresh = () => {
      console.log("Hot Refresh Triggered: Syncing Home Metadata...");
      setIsLoading(true);
      fetchCommunityPlaylists();
      refreshCuratedPlaylists();
      getTrendingTracks('US').then(tracks => {
        setTrendingTracks(tracks);
        setIsLoading(false);
      });
    };

    window.addEventListener('openwave-hot-refresh', handleHotRefresh);
    return () => window.removeEventListener('openwave-hot-refresh', handleHotRefresh);
  }, []);

  return (
    <div className="min-h-screen bg-[#070707]">
      <section className="relative h-[50vh] min-h-[400px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <motion.img
            src="https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1920&h=800"
            alt="Music background"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.4, scale: 1.05 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070707] via-[#070707]/60 to-transparent" />
        </div>

        <div className="container relative z-10 mx-auto px-8">
          <div className="max-w-3xl space-y-10">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="space-y-6">
              <h1 className="text-4xl lg:text-6xl font-black text-white leading-[1] tracking-tighter">
                Discover <br /><span className="text-[#e85a20]">Your Sound</span>
              </h1>
              <p className="text-base text-white/60 font-medium max-w-lg">Stream millions of songs, create playlists, and share your music journey.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="w-full"
            >
              <SearchInput
                placeholder="Search your favorite music..."
                value={homeSearch}
                onChange={setHomeSearch}
                onSubmit={handleSearchSubmit}
                hideIcon={true}
                className="shadow-3xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-8 py-20 space-y-32">
        {/* Most Favorite Playlists */}
        <section className="space-y-10">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white flex items-center gap-2.5 tracking-tight">
                <Heart className="w-6 h-6 text-white" fill="currentColor" /> Most Favorite Playlists
              </h2>
              <p className="text-[#444444] text-[9px] font-black uppercase tracking-[0.25em]">Voted by the OpenWave community</p>
            </div>
            <Button variant="ghost" onClick={fetchCommunityPlaylists} disabled={isFetchingCommunity} className="group">
              <RefreshCw className={`w-5 h-5 text-[#666666] group-hover:text-white transition-all ${isFetchingCommunity ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {communityPlaylists.length > 0 ? communityPlaylists.map((playlist, index) => (
              <motion.div key={playlist.id} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                <PlaylistCard id={playlist.id} title={playlist.title} description={playlist.description} coverUrl={playlist.coverUrl} isPublic={true} showPrivacy={false} trackCount={playlist.upvotes} />
              </motion.div>
            )) : <div className="col-span-full py-20 text-center text-[#222222]">No community favorites yet.</div>}
          </div>
        </section>

        {/* Recommendations Section */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white flex items-center gap-2.5 tracking-tight">
              <Sparkles className="w-6 h-6 text-white" fill="currentColor" /> Recommendations
            </h2>
            <p className="text-[#444444] text-[9px] font-black uppercase tracking-[0.25em]">Personalized for you</p>
          </div>
          <div className="py-20 border border-white/5 rounded-3xl bg-white/[0.01] flex items-center justify-center">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#222222] animate-pulse">Coming Soon......</p>
          </div>
        </section>

        {/* Global Top 50 */}
        <section className="space-y-10">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white flex items-center gap-2.5 tracking-tight"><Zap className="w-6 h-6 text-white" fill="currentColor" /> Global Top 50</h2>
            <p className="text-[#444444] text-[9px] font-black uppercase tracking-[0.25em]">Official Billboard & Spotify Chart Hits</p>
          </div>
          <div className="bg-[#111111] rounded-xl border border-white/5 overflow-hidden">
            {isLoading ? (
              <div className="p-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-8 h-8 text-[#e85a20] animate-spin" />
                <p className="text-[8px] font-black uppercase text-[#333333]">Synthesizing Billboard & Spotify Charts...</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-white/[0.01]">
                  {trendingTracks.slice(0, visibleTracks).map((track, index) => (
                    <TrackRow key={track.id} track={track} index={index} compact onPlay={() => playTrack(track, trendingTracks)} className="hover:bg-white/[0.02] py-3.5 px-6 transition-colors" />
                  ))}
                </div>
                <div className="flex justify-center border-t border-white/[0.02]">
                  <Button variant="ghost" onClick={handleLoadMore} className="w-full h-10 text-white/40 hover:text-white hover:bg-white/[0.02] text-[8px] font-black uppercase tracking-[0.3em] gap-3 rounded-none cursor-pointer transition-all duration-500">
                    <ListPlus className="w-3.5 h-3.5" /> Show More
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
