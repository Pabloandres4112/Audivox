import { Album, Artist, Playlist, Song } from '../types/music';
export const artists: Artist[] = [
  {
    id: 'a1',
    name: 'Neon Atlas',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400',
    monthlyListeners: 3800000,
  },
  {
    id: 'a2',
    name: 'Luma Tide',
    image: 'https://images.unsplash.com/photo-1521335629791-ce4aec67dd47?w=400',
    monthlyListeners: 2100000,
  },
  {
    id: 'a3',
    name: 'Aria Vale',
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400',
    monthlyListeners: 1700000,
  },
];
export const albums: Album[] = [
  {
    id: 'al1',
    title: 'Midnight Frequency',
    artistId: 'a1',
    year: 2025,
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500',
  },
  {
    id: 'al2',
    title: 'Silver Echoes',
    artistId: 'a2',
    year: 2024,
    cover: 'https://images.unsplash.com/photo-1445985543470-41fba5c3144a?w=500',
  },
  {
    id: 'al3',
    title: 'Afterglow Theory',
    artistId: 'a3',
    year: 2026,
    cover: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500',
  },
];
export const songs: Song[] = [
  {
    id: 's1',
    title: 'Pulse Drift',
    artistId: 'a1',
    albumId: 'al1',
    duration: 210,
    artwork: albums[0].cover,
    streamUrl: 'https://example.com/1.mp3',
  },
  {
    id: 's2',
    title: 'Chromatic Nights',
    artistId: 'a1',
    albumId: 'al1',
    duration: 198,
    artwork: albums[0].cover,
    streamUrl: 'https://example.com/2.mp3',
  },
  {
    id: 's3',
    title: 'Low Tide Signals',
    artistId: 'a2',
    albumId: 'al2',
    duration: 186,
    artwork: albums[1].cover,
    streamUrl: 'https://example.com/3.mp3',
  },
  {
    id: 's4',
    title: 'Motion in Blue',
    artistId: 'a2',
    albumId: 'al2',
    duration: 228,
    artwork: albums[1].cover,
    streamUrl: 'https://example.com/4.mp3',
  },
  {
    id: 's5',
    title: 'Glass Satellites',
    artistId: 'a3',
    albumId: 'al3',
    duration: 204,
    artwork: albums[2].cover,
    streamUrl: 'https://example.com/5.mp3',
  },
  {
    id: 's6',
    title: 'Velvet Orbit',
    artistId: 'a3',
    albumId: 'al3',
    duration: 221,
    artwork: albums[2].cover,
    streamUrl: 'https://example.com/6.mp3',
  },
];
export const playlists: Playlist[] = [
  {
    id: 'p1',
    title: 'Night Drive',
    description: 'For late city rides',
    cover: albums[0].cover,
    songIds: ['s1', 's2', 's4'],
  },
  {
    id: 'p2',
    title: 'Focus Flow',
    description: 'Deep mellow loops',
    cover: albums[1].cover,
    songIds: ['s3', 's5', 's6'],
  },
];
