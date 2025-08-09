import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Search, Home, 
  Library, Plus, Download, Shuffle, Repeat, Repeat1, MoreHorizontal, 
  Settings, User, ListMusic, Radio, Mic2, TrendingUp, Clock, 
  ChevronLeft, ChevronRight, ExternalLink, Share, Copy,
  Filter, SortDesc, Grid3X3, List, Menu, X
} from 'lucide-react';

interface Song {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: string;
  durationSeconds: number;
  cover: string;
  url: string;
  genre: string;
  year: number;
  plays: number;
  explicit?: boolean;
  featured?: boolean;
}

interface Artist {
  id: number;
  name: string;
  image: string;
  followers: number;
  verified: boolean;
  monthly_listeners: number;
}

interface Album {
  id: number;
  name: string;
  artist: string;
  year: number;
  cover: string;
  songs: Song[];
  genre: string;
}

interface Playlist {
  id: number;
  name: string;
  description: string;
  songs: Song[];
  cover: string;
  isPublic: boolean;
  followers: number;
  creator: string;
  createdAt: string;
  duration: string;
}

type RepeatMode = 'off' | 'all' | 'one';
type ViewMode = 'grid' | 'list';
type SortBy = 'title' | 'artist' | 'album' | 'duration' | 'plays' | 'recent';

const SpotifyClone: React.FC = () => {
  // Sample Artists
  const [artists] = useState<Artist[]>([
    { id: 1, name: "Queen", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop", followers: 45000000, verified: true, monthly_listeners: 82000000 },
    { id: 2, name: "The Beatles", image: "https://images.unsplash.com/photo-1571974599782-87624638275c?w=300&h=300&fit=crop", followers: 32000000, verified: true, monthly_listeners: 65000000 },
    { id: 3, name: "Led Zeppelin", image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=300&h=300&fit=crop", followers: 28000000, verified: true, monthly_listeners: 48000000 }
  ]);

  // Enhanced Sample Songs
  const [songs] = useState<Song[]>([
    {
      id: 1, title: "Bohemian Rhapsody", artist: "Queen", album: "A Night at the Opera", 
      duration: "5:55", durationSeconds: 355, cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop", 
      url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", genre: "Rock", year: 1975, plays: 1200000000, featured: true
    },
    {
      id: 2, title: "Hotel California", artist: "Eagles", album: "Hotel California", 
      duration: "6:30", durationSeconds: 390, cover: "https://images.unsplash.com/photo-1571974599782-87624638275c?w=300&h=300&fit=crop", 
      url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", genre: "Rock", year: 1976, plays: 980000000
    },
    {
      id: 3, title: "Stairway to Heaven", artist: "Led Zeppelin", album: "Led Zeppelin IV", 
      duration: "8:02", durationSeconds: 482, cover: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=300&h=300&fit=crop", 
      url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", genre: "Rock", year: 1971, plays: 1500000000, featured: true
    },
    {
      id: 4, title: "Imagine", artist: "John Lennon", album: "Imagine", 
      duration: "3:07", durationSeconds: 187, cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop", 
      url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", genre: "Pop", year: 1971, plays: 800000000
    },
    {
      id: 5, title: "Sweet Child O' Mine", artist: "Guns N' Roses", album: "Appetite for Destruction", 
      duration: "5:03", durationSeconds: 303, cover: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=300&h=300&fit=crop", 
      url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", genre: "Rock", year: 1987, plays: 650000000, explicit: true
    },
    {
      id: 6, title: "Billie Jean", artist: "Michael Jackson", album: "Thriller", 
      duration: "4:54", durationSeconds: 294, cover: "https://images.unsplash.com/photo-1571974599782-87624638275c?w=300&h=300&fit=crop", 
      url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", genre: "Pop", year: 1982, plays: 1100000000
    }
  ]);

  // Enhanced Playlists
  const [playlists, setPlaylists] = useState<Playlist[]>([
    {
      id: 1, name: "Rock Legends", description: "The greatest rock anthems of all time",
      cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
      songs: songs.slice(0, 4), isPublic: true, followers: 1250000, creator: "Spotify",
      createdAt: "2024-01-15", duration: "22 min"
    },
    {
      id: 2, name: "Daily Mix 1", description: "Your favorite songs mixed with new discoveries",
      cover: "https://images.unsplash.com/photo-1571974599782-87624638275c?w=300&h=300&fit=crop",
      songs: [songs[1], songs[3], songs[5]], isPublic: false, followers: 0, creator: "Made for you",
      createdAt: "2024-08-09", duration: "14 min"
    },
    {
      id: 3, name: "Discover Weekly", description: "Your weekly mixtape of fresh music",
      cover: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=300&h=300&fit=crop",
      songs: songs.slice(2), isPublic: false, followers: 0, creator: "Made for you",
      createdAt: "2024-08-05", duration: "18 min"
    }
  ]);

  // Player State
  const [currentSong, setCurrentSong] = useState<Song | null>(songs[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [queue, setQueue] = useState<Song[]>([]);
  const [history, setHistory] = useState<Song[]>([]);

  // UI State
  const [activeView, setActiveView] = useState('home');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [likedSongs, setLikedSongs] = useState<Set<number>>(new Set([1, 3]));
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('title');
  const [showQueue, setShowQueue] = useState(false);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>(songs.slice(0, 3));
  const [isFullscreen, setIsFullscreen] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Audio Effects
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleSongEnd);

    audio.volume = isMuted ? 0 : volume;

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleSongEnd);
    };
  }, [volume, isMuted]);

  const handleSongEnd = useCallback(() => {
    if (repeat === 'one') {
      audioRef.current?.play();
      return;
    }
    
    if (queue.length > 0) {
      const nextSong = queue[0];
      setQueue(prev => prev.slice(1));
      playSong(nextSong);
    } else if (repeat === 'all') {
      playNext();
    } else {
      setIsPlaying(false);
    }
  }, [repeat, queue]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (queue.length > 0) {
      const nextSong = queue[0];
      setQueue(prev => prev.slice(1));
      playSong(nextSong);
      return;
    }

    const currentIndex = songs.findIndex(song => song.id === currentSong?.id);
    let nextIndex;
    
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * songs.length);
    } else {
      nextIndex = (currentIndex + 1) % songs.length;
    }
    
    const nextSong = songs[nextIndex];
    playSong(nextSong);
  };

  const playPrevious = () => {
    if (history.length > 0) {
      const prevSong = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      playSong(prevSong);
      return;
    }

    const currentIndex = songs.findIndex(song => song.id === currentSong?.id);
    const prevSong = songs[(currentIndex - 1 + songs.length) % songs.length];
    playSong(prevSong);
  };

  const playSong = (song: Song) => {
    if (currentSong && currentSong.id !== song.id) {
      setHistory(prev => [...prev, currentSong]);
    }
    
    setCurrentSong(song);
    setIsPlaying(true);
    
    // Add to recently played
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(s => s.id !== song.id);
      return [song, ...filtered].slice(0, 10);
    });
  };

  const addToQueue = (song: Song) => {
    setQueue(prev => [...prev, song]);
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const toggleLike = (songId: number) => {
    const newLiked = new Set(likedSongs);
    if (newLiked.has(songId)) {
      newLiked.delete(songId);
    } else {
      newLiked.add(songId);
    }
    setLikedSongs(newLiked);
  };

  const toggleRepeat = () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeat);
    setRepeat(modes[(currentIndex + 1) % modes.length]);
  };

  const seekTo = (percentage: number) => {
    const audio = audioRef.current;
    if (audio && duration) {
      const newTime = (percentage / 100) * duration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const setVolumeLevel = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(false);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const getSortedSongs = (songList: Song[]) => {
    const sorted = [...songList];
    switch (sortBy) {
      case 'title': return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'artist': return sorted.sort((a, b) => a.artist.localeCompare(b.artist));
      case 'album': return sorted.sort((a, b) => a.album.localeCompare(b.album));
      case 'duration': return sorted.sort((a, b) => b.durationSeconds - a.durationSeconds);
      case 'plays': return sorted.sort((a, b) => b.plays - a.plays);
      case 'recent': return recentlyPlayed.filter(song => songList.includes(song));
      default: return sorted;
    }
  };

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.album.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Enhanced Home View
  const renderHome = () => (
    <div className="space-y-8">
      {/* Welcome Section */}
      <section className="relative">
        <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-lg p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {new Date().getHours() < 12 ? 'Buenos días' : 
                 new Date().getHours() < 18 ? 'Buenas tardes' : 'Buenas noches'}
              </h1>
              <p className="text-blue-200">¿Qué quieres escuchar hoy?</p>
            </div>
            <div className="flex space-x-2">
              <button className="bg-white bg-opacity-20 backdrop-blur-sm text-white px-4 py-2 rounded-full hover:bg-opacity-30 transition-all">
                <Settings className="h-4 w-4 inline mr-2" />
                Configuración
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">Acceso rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentlyPlayed.slice(0, 6).map(song => (
            <div
              key={song.id}
              className="bg-gray-800 bg-opacity-50 rounded-lg p-3 hover:bg-opacity-70 transition-all cursor-pointer group flex items-center space-x-4"
              onClick={() => playSong(song)}
            >
              <img src={song.cover} alt={song.album} className="w-16 h-16 rounded-md" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{song.title}</p>
                <p className="text-gray-400 text-sm truncate">{song.artist}</p>
              </div>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-green-500 p-2 rounded-full hover:scale-105">
                <Play className="h-4 w-4 text-black fill-current" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Playlists */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Hechas para ti</h2>
          <button className="text-gray-400 hover:text-white text-sm font-medium">Mostrar todo</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {playlists.map(playlist => (
            <div
              key={playlist.id}
              className="bg-gray-900 bg-opacity-40 p-4 rounded-lg hover:bg-opacity-60 transition-all cursor-pointer group"
              onClick={() => {
                setSelectedPlaylist(playlist);
                setActiveView('playlist');
              }}
            >
              <div className="relative mb-4">
                <img src={playlist.cover} alt={playlist.name} className="w-full aspect-square object-cover rounded-md" />
                <button className="absolute bottom-2 right-2 bg-green-500 p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-105">
                  <Play className="h-4 w-4 text-black fill-current" />
                </button>
              </div>
              <h3 className="font-semibold text-white mb-1 truncate">{playlist.name}</h3>
              <p className="text-gray-400 text-sm line-clamp-2">{playlist.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Top Artists */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Artistas populares</h2>
          <button className="text-gray-400 hover:text-white text-sm font-medium">Mostrar todo</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {artists.map(artist => (
            <div
              key={artist.id}
              className="bg-gray-900 bg-opacity-40 p-4 rounded-lg hover:bg-opacity-60 transition-all cursor-pointer group"
            >
              <div className="relative mb-4">
                <img src={artist.image} alt={artist.name} className="w-full aspect-square object-cover rounded-full" />
                <button className="absolute bottom-2 right-2 bg-green-500 p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-105">
                  <Play className="h-4 w-4 text-black fill-current" />
                </button>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-white mb-1 flex items-center justify-center">
                  {artist.name}
                  {artist.verified && (
                    <div className="ml-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </h3>
                <p className="text-gray-400 text-sm">{formatNumber(artist.monthly_listeners)} oyentes mensuales</p>
                <span className="inline-block bg-gray-700 text-white text-xs px-2 py-1 rounded-full mt-2">Artista</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  // Enhanced Search View
  const renderSearch = () => (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="¿Qué quieres escuchar?"
          className="w-full bg-gray-800 text-white pl-12 pr-4 py-4 rounded-full focus:outline-none focus:ring-2 focus:ring-white text-lg"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {!searchQuery ? (
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">Navegar por categorías</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {['Rock', 'Pop', 'Jazz', 'Clásica', 'Electrónica', 'Hip Hop', 'Country', 'Reggae'].map((genre, index) => (
                <div
                  key={genre}
                  className={`p-4 rounded-lg cursor-pointer relative overflow-hidden h-24 flex items-end`}
                  style={{
                    background: `linear-gradient(135deg, ${[
                      '#ff6b6b, #4ecdc4', '#45b7d1, #96ceb4', '#feca57, #ff9ff3',
                      '#54a0ff, #5f27cd', '#00d2d3, #ff9f43', '#6c5ce7, #a29bfe',
                      '#fd79a8, #fdcb6e', '#74b9ff, #0984e3'
                    ][index % 8]})`
                  }}
                >
                  <h3 className="font-bold text-white text-lg">{genre}</h3>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Search Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="bg-gray-800 text-white text-sm px-3 py-1 rounded border border-gray-700 focus:outline-none focus:border-white"
              >
                <option value="title">Título</option>
                <option value="artist">Artista</option>
                <option value="album">Álbum</option>
                <option value="duration">Duración</option>
                <option value="plays">Reproducciones</option>
              </select>
            </div>
            <div className="flex bg-gray-800 rounded border border-gray-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Results */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">
              Resultados para "{searchQuery}" ({filteredSongs.length} canciones)
            </h2>
            
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {getSortedSongs(filteredSongs).map(song => (
                  <div
                    key={song.id}
                    className="bg-gray-900 bg-opacity-40 p-4 rounded-lg hover:bg-opacity-60 transition-all cursor-pointer group"
                    onClick={() => playSong(song)}
                  >
                    <div className="relative mb-3">
                      <img src={song.cover} alt={song.album} className="w-full aspect-square object-cover rounded-md" />
                      <button className="absolute bottom-2 right-2 bg-green-500 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-105">
                        <Play className="h-3 w-3 text-black fill-current" />
                      </button>
                    </div>
                    <h3 className="font-medium text-white truncate">{song.title}</h3>
                    <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                    <div className="flex items-center mt-1 space-x-2">
                      {song.explicit && <span className="text-gray-400 text-xs bg-gray-700 px-1 rounded">E</span>}
                      <span className="text-gray-500 text-xs">{formatNumber(song.plays)} reproducciones</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {getSortedSongs(filteredSongs).map((song, index) => (
                  <div
                    key={song.id}
                    className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-800 transition-all cursor-pointer group"
                    onClick={() => playSong(song)}
                  >
                    <div className="w-8 text-center">
                      <span className="text-gray-400 text-sm group-hover:hidden">{index + 1}</span>
                      <button className="hidden group-hover:block text-white">
                        <Play className="h-4 w-4" />
                      </button>
                    </div>
                    <img src={song.cover} alt={song.album} className="w-12 h-12 rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate flex items-center">
                        {song.title}
                        {song.explicit && <span className="ml-2 text-gray-400 text-xs bg-gray-700 px-1 rounded">E</span>}
                      </p>
                      <p className="text-gray-400 text-sm truncate">{song.artist} • {song.album}</p>
                    </div>
                    <div className="hidden md:block text-gray-400 text-sm">
                      {formatNumber(song.plays)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(song.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Heart className={`h-4 w-4 ${likedSongs.has(song.id) ? 'text-green-500 fill-current' : 'text-gray-400 hover:text-white'}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToQueue(song);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <span className="text-gray-400 text-sm w-12 text-right">{song.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Enhanced Library View
  const renderLibrary = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">Tu biblioteca</h2>
        <div className="flex space-x-2">
          <button className="text-gray-400 hover:text-white p-2">
            <Search className="h-5 w-5" />
          </button>
          <button className="text-gray-400 hover:text-white p-2">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex space-x-2 mb-4">
        <button className="bg-green-500 text-black px-4 py-2 rounded-full text-sm font-medium">
          Todo
        </button>
        <button className="bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-700">
          Playlists
        </button>
        <button className="bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-700">
          Artistas
        </button>
        <button className="bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-700">
          Álbumes
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-800 transition-all cursor-pointer">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-md flex items-center justify-center">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-white">Canciones que te gustan</p>
            <p className="text-gray-400 text-sm">{likedSongs.size} canciones</p>
          </div>
          <button className="text-gray-400 hover:text-white">
            <Download className="h-5 w-5" />
          </button>
        </div>

        {playlists.map(playlist => (
          <div 
            key={playlist.id} 
            className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-800 transition-all cursor-pointer"
            onClick={() => {
              setSelectedPlaylist(playlist);
              setActiveView('playlist');
            }}
          >
            <img src={playlist.cover} alt={playlist.name} className="w-12 h-12 rounded-md" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{playlist.name}</p>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">
                  {playlist.isPublic ? 'Pública' : 'Privada'} • {playlist.creator}
                </span>
                {playlist.followers > 0 && (
                  <span className="text-gray-400 text-sm">• {formatNumber(playlist.followers)} seguidores</span>
                )}
              </div>
            </div>
            <button className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Download className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // Playlist Detail View
  const renderPlaylistDetail = () => {
    if (!selectedPlaylist) return null;

    const totalDuration = selectedPlaylist.songs.reduce((acc, song) => acc + song.durationSeconds, 0);
    const totalMinutes = Math.floor(totalDuration / 60);
    const totalHours = Math.floor(totalMinutes / 60);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-4">
          <button 
            onClick={() => setActiveView('library')}
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Playlist Header */}
        <div className="flex items-end space-x-6 bg-gradient-to-b from-gray-800 to-gray-900 p-8 rounded-t-lg">
          <img 
            src={selectedPlaylist.cover} 
            alt={selectedPlaylist.name} 
            className="w-60 h-60 shadow-2xl rounded-md"
          />
          <div className="flex-1 space-y-4">
            <p className="text-gray-300 text-sm font-medium uppercase tracking-wider">Playlist</p>
            <h1 className="text-6xl font-bold text-white mb-4">{selectedPlaylist.name}</h1>
            <p className="text-gray-300 text-lg">{selectedPlaylist.description}</p>
            <div className="flex items-center space-x-2 text-gray-300">
              <span className="font-medium">{selectedPlaylist.creator}</span>
              <span>•</span>
              <span>{selectedPlaylist.songs.length} canciones</span>
              <span>•</span>
              <span>
                {totalHours > 0 ? `${totalHours} h ` : ''}
                {totalMinutes % 60} min aproximadamente
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-6 px-8 pb-4">
          <button 
            onClick={() => playSong(selectedPlaylist.songs[0])}
            className="bg-green-500 hover:bg-green-400 text-black p-4 rounded-full transition-all hover:scale-105"
          >
            <Play className="h-6 w-6 fill-current" />
          </button>
          <button className="text-gray-400 hover:text-white">
            <Heart className="h-8 w-8" />
          </button>
          <button className="text-gray-400 hover:text-white">
            <Download className="h-8 w-8" />
          </button>
          <button className="text-gray-400 hover:text-white">
            <MoreHorizontal className="h-8 w-8" />
          </button>
        </div>

        {/* Songs List */}
        <div className="px-8">
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-gray-400 text-sm border-b border-gray-800 mb-4">
            <div className="col-span-1">#</div>
            <div className="col-span-5">TÍTULO</div>
            <div className="col-span-3 hidden md:block">ÁLBUM</div>
            <div className="col-span-2 hidden lg:block">FECHA AGREGADA</div>
            <div className="col-span-1">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-1">
            {selectedPlaylist.songs.map((song, index) => (
              <div
                key={song.id}
                className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-lg hover:bg-gray-800 transition-all cursor-pointer group ${
                  currentSong?.id === song.id ? 'bg-gray-800' : ''
                }`}
                onClick={() => playSong(song)}
              >
                <div className="col-span-1 flex items-center">
                  {currentSong?.id === song.id && isPlaying ? (
                    <div className="text-green-500">
                      <div className="flex space-x-1">
                        <div className="w-1 h-4 bg-green-500 rounded animate-pulse"></div>
                        <div className="w-1 h-4 bg-green-500 rounded animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-1 h-4 bg-green-500 rounded animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-gray-400 text-sm group-hover:hidden">{index + 1}</span>
                      <button className="hidden group-hover:block text-white">
                        <Play className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>

                <div className="col-span-5 flex items-center space-x-3 min-w-0">
                  <img src={song.cover} alt={song.album} className="w-10 h-10 rounded" />
                  <div className="min-w-0">
                    <p className={`font-medium truncate ${
                      currentSong?.id === song.id ? 'text-green-500' : 'text-white'
                    }`}>
                      {song.title}
                    </p>
                    <div className="flex items-center space-x-1">
                      {song.explicit && <span className="text-gray-400 text-xs bg-gray-700 px-1 rounded">E</span>}
                      <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                    </div>
                  </div>
                </div>

                <div className="col-span-3 hidden md:flex items-center">
                  <p className="text-gray-400 text-sm truncate hover:text-white hover:underline cursor-pointer">
                    {song.album}
                  </p>
                </div>

                <div className="col-span-2 hidden lg:flex items-center">
                  <p className="text-gray-400 text-sm">hace 2 días</p>
                </div>

                <div className="col-span-1 flex items-center justify-between">
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(song.id);
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <Heart className={`h-4 w-4 ${likedSongs.has(song.id) ? 'text-green-500 fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToQueue(song);
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-gray-400 text-sm">{song.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Queue Sidebar
  const renderQueue = () => (
    <div className="w-80 bg-gray-900 border-l border-gray-800 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">Cola de reproducción</h3>
        <button 
          onClick={() => setShowQueue(false)}
          className="text-gray-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Now Playing */}
        {currentSong && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Reproduciendo ahora</h4>
            <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
              <img src={currentSong.cover} alt={currentSong.album} className="w-12 h-12 rounded" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-green-500 truncate">{currentSong.title}</p>
                <p className="text-gray-400 text-sm truncate">{currentSong.artist}</p>
              </div>
            </div>
          </div>
        )}

        {/* Queue */}
        {queue.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Siguiente</h4>
            <div className="space-y-2">
              {queue.map((song, index) => (
                <div key={`queue-${song.id}-${index}`} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-800 transition-colors group">
                  <img src={song.cover} alt={song.album} className="w-10 h-10 rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{song.title}</p>
                    <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                  </div>
                  <button
                    onClick={() => removeFromQueue(index)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Reproducidas recientemente</h4>
            <div className="space-y-2">
              {history.slice(-5).reverse().map((song, index) => (
                <div key={`history-${song.id}-${index}`} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer" onClick={() => playSong(song)}>
                  <img src={song.cover} alt={song.album} className="w-10 h-10 rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{song.title}</p>
                    <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-black p-6 flex flex-col space-y-8 border-r border-gray-900">
          {/* Logo */}
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="font-bold text-black text-lg">S</span>
            </div>
            <span className="font-bold text-xl">Spotify</span>
          </div>

          {/* Navigation */}
          <div className="space-y-2">
            <button
              onClick={() => {
                setActiveView('home');
                setSelectedPlaylist(null);
              }}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all ${
                activeView === 'home' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}
            >
              <Home className="h-6 w-6" />
              <span className="font-medium">Inicio</span>
            </button>

            <button
              onClick={() => {
                setActiveView('search');
                setSelectedPlaylist(null);
              }}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all ${
                activeView === 'search' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}
            >
              <Search className="h-6 w-6" />
              <span className="font-medium">Buscar</span>
            </button>

            <button
              onClick={() => {
                setActiveView('library');
                setSelectedPlaylist(null);
              }}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all ${
                activeView === 'library' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}
            >
              <Library className="h-6 w-6" />
              <span className="font-medium">Tu biblioteca</span>
            </button>
          </div>

          {/* Quick Playlists */}
          <div className="flex-1 space-y-2 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm font-medium">Playlists recientes</span>
              <button className="text-gray-400 hover:text-white">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {playlists.slice(0, 3).map(playlist => (
              <button
                key={playlist.id}
                onClick={() => {
                  setSelectedPlaylist(playlist);
                  setActiveView('playlist');
                }}
                className="flex items-center space-x-3 w-full p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-900 transition-all text-left"
              >
                <img src={playlist.cover} alt={playlist.name} className="w-8 h-8 rounded" />
                <span className="truncate text-sm">{playlist.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex">
          {/* Main Content */}
          <div className="flex-1 bg-gradient-to-b from-gray-900 via-gray-900 to-black overflow-y-auto">
            {/* Top Navigation */}
            <div className="sticky top-0 bg-gray-900 bg-opacity-90 backdrop-blur-sm border-b border-gray-800 p-4 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => window.history.back()}
                      className="bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70 transition-all"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => window.history.forward()}
                      className="bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70 transition-all"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setShowQueue(!showQueue)}
                    className={`p-2 rounded-full transition-all ${
                      showQueue ? 'bg-green-500 text-black' : 'bg-black bg-opacity-50 hover:bg-opacity-70'
                    }`}
                  >
                    <ListMusic className="h-5 w-5" />
                  </button>
                  <div className="flex items-center space-x-2 bg-black bg-opacity-50 rounded-full px-4 py-2">
                    <User className="h-5 w-5" />
                    <span className="text-sm font-medium">Usuario</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Page Content */}
            <div className="p-8">
              {activeView === 'home' && renderHome()}
              {activeView === 'search' && renderSearch()}
              {activeView === 'library' && renderLibrary()}
              {activeView === 'playlist' && renderPlaylistDetail()}
            </div>
          </div>

          {/* Queue Sidebar */}
          {showQueue && renderQueue()}
        </div>
      </div>

      {/* Enhanced Player */}
      <div className="bg-gray-900 border-t border-gray-800 p-4 relative">
        <div className="flex items-center justify-between max-w-full mx-auto">
          {/* Current Song Info */}
          <div className="flex items-center space-x-4 flex-1 min-w-0 max-w-sm">
            {currentSong && (
              <>
                <div className="relative group">
                  <img 
                    src={currentSong.cover} 
                    alt={currentSong.album} 
                    className="w-14 h-14 rounded-md cursor-pointer transition-transform hover:scale-105" 
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ExternalLink className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white truncate hover:underline cursor-pointer">{currentSong.title}</p>
                  <p className="text-gray-400 text-sm truncate hover:underline hover:text-white cursor-pointer">{currentSong.artist}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => currentSong && toggleLike(currentSong.id)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <Heart
                      className={`h-5 w-5 ${currentSong && likedSongs.has(currentSong.id) ? 'text-green-500 fill-current' : ''}`}
                    />
                  </button>
                  <button className="text-gray-400 hover:text-white transition-colors">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Player Controls */}
          <div className="flex flex-col items-center space-y-3 flex-1 max-w-2xl">
            {/* Control Buttons */}
            <div className="flex items-center space-x-6">
              <button 
                onClick={() => setShuffle(!shuffle)}
                className={`transition-colors ${shuffle ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
              >
                <Shuffle className="h-5 w-5" />
              </button>
              
              <button 
                onClick={playPrevious} 
                className="text-gray-400 hover:text-white transition-colors"
              >
                <SkipBack className="h-6 w-6" />
              </button>
              
              <button
                onClick={togglePlay}
                className="bg-white text-black rounded-full p-3 hover:scale-110 transition-transform shadow-lg"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
              </button>
              
              <button 
                onClick={playNext} 
                className="text-gray-400 hover:text-white transition-colors"
              >
                <SkipForward className="h-6 w-6" />
              </button>
              
              <button 
                onClick={toggleRepeat}
                className={`transition-colors ${repeat !== 'off' ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
              >
                {repeat === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center space-x-3 w-full">
              <span className="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
              <div 
                className="flex-1 bg-gray-600 rounded-full h-1 cursor-pointer group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                  seekTo(percentage);
                }}
              >
                <div
                  className="bg-white h-1 rounded-full transition-all group-hover:bg-green-500 relative"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className="text-xs text-gray-400 w-10">{currentSong?.duration || '0:00'}</span>
            </div>
          </div>

          {/* Volume & Additional Controls */}
          <div className="flex items-center space-x-4 flex-1 justify-end max-w-sm">
            <button 
              onClick={() => setShowQueue(!showQueue)}
              className={`transition-colors ${showQueue ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
            >
              <ListMusic className="h-5 w-5" />
            </button>
            
            <button className="text-gray-400 hover:text-white transition-colors">
              <Mic2 className="h-5 w-5" />
            </button>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              
              <div 
                className="w-24 bg-gray-600 rounded-full h-1 cursor-pointer group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percentage = (e.clientX - rect.left) / rect.width;
                  setVolumeLevel(percentage);
                }}
              >
                <div
                  className="bg-white h-1 rounded-full transition-all group-hover:bg-green-500 relative"
                  style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
            
            <button className="text-gray-400 hover:text-white transition-colors">
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Hidden Audio Element */}
        {currentSong && (
          <audio
            ref={audioRef}
            src={currentSong.url}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            preload="metadata"
          />
        )}
      </div>

      {/* Fullscreen Player Modal */}
      {isFullscreen && currentSong && (
        <div className="fixed inset-0 bg-black bg-opacity-95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="max-w-4xl w-full p-8 text-center">
            <div className="flex justify-end mb-8">
              <button 
                onClick={() => setIsFullscreen(false)}
                className="text-gray-400 hover:text-white p-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-8">
              <img 
                src={currentSong.cover} 
                alt={currentSong.album} 
                className="w-80 h-80 mx-auto rounded-lg shadow-2xl"
              />
              
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{currentSong.title}</h1>
                <p className="text-2xl text-gray-300">{currentSong.artist}</p>
              </div>
              
              {/* Large Progress Bar */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4 text-lg">
                  <span className="text-gray-400">{formatTime(currentTime)}</span>
                  <div 
                    className="flex-1 bg-gray-600 rounded-full h-2 cursor-pointer group"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                      seekTo(percentage);
                    }}
                  >
                    <div
                      className="bg-white h-2 rounded-full transition-all group-hover:bg-green-500 relative"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    >
                      <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                    </div>
                  </div>
                  <span className="text-gray-400">{currentSong?.duration || '0:00'}</span>
                </div>
                
                {/* Large Control Buttons */}
                <div className="flex items-center justify-center space-x-8">
                  <button 
                    onClick={() => setShuffle(!shuffle)}
                    className={`transition-colors p-2 ${shuffle ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Shuffle className="h-7 w-7" />
                  </button>
                  
                  <button 
                    onClick={playPrevious} 
                    className="text-gray-400 hover:text-white transition-colors p-2"
                  >
                    <SkipBack className="h-8 w-8" />
                  </button>
                  
                  <button
                    onClick={togglePlay}
                    className="bg-white text-black rounded-full p-4 hover:scale-110 transition-transform shadow-lg"
                  >
                    {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
                  </button>
                  
                  <button 
                    onClick={playNext} 
                    className="text-gray-400 hover:text-white transition-colors p-2"
                  >
                    <SkipForward className="h-8 w-8" />
                  </button>
                  
                  <button 
                    onClick={toggleRepeat}
                    className={`transition-colors p-2 ${repeat !== 'off' ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
                  >
                    {repeat === 'one' ? <Repeat1 className="h-7 w-7" /> : <Repeat className="h-7 w-7" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpotifyClone;