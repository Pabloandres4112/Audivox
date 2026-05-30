import { albums, artists, playlists, songs } from './mockData';
export const musicService = {
  home: () => ({
    trending: songs.slice(0, 4),
    recentlyPlayed: songs.slice(2),
    artists,
    playlists,
  }),
  search: (q: string) => {
    const s = q.trim().toLowerCase();
    if (!s) return { songs: [], artists: [], albums: [], playlists: [] };
    return {
      songs: songs.filter(x => x.title.toLowerCase().includes(s)),
      artists: artists.filter(x => x.name.toLowerCase().includes(s)),
      albums: albums.filter(x => x.title.toLowerCase().includes(s)),
      playlists: playlists.filter(x => x.title.toLowerCase().includes(s)),
    };
  },
  byArtist: (id: string) => songs.filter(s => s.artistId === id),
  byAlbum: (id: string) => songs.filter(s => s.albumId === id),
  byPlaylist: (id: string) => {
    const p = playlists.find(x => x.id === id);
    return songs.filter(s => p?.songIds.includes(s.id));
  },
};
