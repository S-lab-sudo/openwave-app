// Mock data for OpenWave music streaming app

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  thumbnail: string;
  youtubeUrl: string;
  audioUrl?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  trackCount: number;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  tracks: Track[];
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  playlistCount: number;
  followerCount: number;
}

// Sample cover images (using placeholder gradients as data URIs for demo)
const covers = [
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=400&fit=crop',
];

const artistImages = [
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop',
];

export const mockTracks: Track[] = [
  { id: '1', title: 'Midnight Dreams', artist: 'Luna Nova', album: 'Starlight Sessions', duration: 234, thumbnail: covers[0], youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { id: '2', title: 'Electric Sunrise', artist: 'The Voltage', album: 'Neon Nights', duration: 198, thumbnail: covers[1], youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { id: '3', title: 'Ocean Waves', artist: 'Coastal Drift', album: 'Seaside Stories', duration: 267, thumbnail: covers[2], youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { id: '4', title: 'City Lights', artist: 'Urban Echo', album: 'Metropolitan', duration: 211, thumbnail: covers[3], youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { id: '5', title: 'Mountain High', artist: 'Peak Collective', album: 'Summit', duration: 289, thumbnail: covers[4], youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { id: '6', title: 'Desert Storm', artist: 'Sandstone', album: 'Dune Tales', duration: 245, thumbnail: covers[5], youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { id: '7', title: 'Forest Path', artist: 'Woodland', album: 'Nature Sounds', duration: 312, thumbnail: covers[6], youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { id: '8', title: 'Neon Boulevard', artist: 'Synthwave Riders', album: 'Retro Future', duration: 223, thumbnail: covers[7], youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { id: '9', title: 'Cosmic Journey', artist: 'Stellar Dreams', album: 'Galaxy', duration: 278, thumbnail: covers[0], youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { id: '10', title: 'Rain on Glass', artist: 'Ambient Moods', album: 'Weather Patterns', duration: 356, thumbnail: covers[1], youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
];

export const featuredPlaylists: Playlist[] = [
  {
    id: 'featured-1',
    title: 'Today\'s Top Hits',
    description: 'The hottest tracks right now. Updated daily.',
    coverUrl: covers[0],
    trackCount: 50,
    isPublic: true,
    createdBy: 'OpenWave',
    createdAt: '2025-01-15',
    tracks: mockTracks.slice(0, 5),
  },
  {
    id: 'featured-2',
    title: 'Chill Vibes',
    description: 'Kick back and relax with these smooth tracks.',
    coverUrl: covers[1],
    trackCount: 42,
    isPublic: true,
    createdBy: 'OpenWave',
    createdAt: '2025-01-10',
    tracks: mockTracks.slice(2, 7),
  },
  {
    id: 'featured-3',
    title: 'Workout Energy',
    description: 'High-energy beats to power your workout.',
    coverUrl: covers[2],
    trackCount: 35,
    isPublic: true,
    createdBy: 'OpenWave',
    createdAt: '2025-01-08',
    tracks: mockTracks.slice(1, 6),
  },
  {
    id: 'featured-4',
    title: 'Focus Flow',
    description: 'Concentration-boosting instrumentals.',
    coverUrl: covers[3],
    trackCount: 28,
    isPublic: true,
    createdBy: 'OpenWave',
    createdAt: '2025-01-05',
    tracks: mockTracks.slice(3, 8),
  },
];

export const trendingPlaylists: Playlist[] = [
  {
    id: 'trending-1',
    title: 'Viral Hits 2025',
    description: 'Songs taking over the internet.',
    coverUrl: covers[4],
    trackCount: 45,
    isPublic: true,
    createdBy: 'OpenWave',
    createdAt: '2025-01-20',
    tracks: mockTracks.slice(0, 5),
  },
  {
    id: 'trending-2',
    title: 'Indie Discoveries',
    description: 'Fresh sounds from independent artists.',
    coverUrl: covers[5],
    trackCount: 38,
    isPublic: true,
    createdBy: 'OpenWave',
    createdAt: '2025-01-18',
    tracks: mockTracks.slice(2, 7),
  },
  {
    id: 'trending-3',
    title: 'Late Night Drive',
    description: 'Perfect soundtrack for night drives.',
    coverUrl: covers[6],
    trackCount: 32,
    isPublic: true,
    createdBy: 'OpenWave',
    createdAt: '2025-01-16',
    tracks: mockTracks.slice(1, 6),
  },
  {
    id: 'trending-4',
    title: 'Acoustic Sessions',
    description: 'Stripped-down and soulful.',
    coverUrl: covers[7],
    trackCount: 25,
    isPublic: true,
    createdBy: 'OpenWave',
    createdAt: '2025-01-14',
    tracks: mockTracks.slice(4, 9),
  },
];

export const userPlaylists: Playlist[] = [];

export const mockUser: User = {
  id: 'me',
  name: 'Alex Morgan',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
  bio: 'Music enthusiast. Always discovering new sounds.',
  playlistCount: 12,
  followerCount: 234,
};

export const genres = [
  'All',
  'Pop',
  'Rock',
  'Hip-Hop',
  'Electronic',
  'R&B',
  'Jazz',
  'Classical',
  'Country',
  'Indie',
];

export const downloadedTracks: (Track & { downloadedAt: string; fileSize: string })[] = [
  { ...mockTracks[0], downloadedAt: '2025-01-20', fileSize: '8.2 MB' },
  { ...mockTracks[2], downloadedAt: '2025-01-19', fileSize: '9.1 MB' },
  { ...mockTracks[4], downloadedAt: '2025-01-18', fileSize: '7.8 MB' },
  { ...mockTracks[6], downloadedAt: '2025-01-17', fileSize: '10.5 MB' },
];
