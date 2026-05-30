import { create } from 'zustand';
import { playerService } from '../services/playerService';
import { Song } from '../types/music';

interface PlayerState {
  current?: Song;
  queue: Song[];
  isPlaying: boolean;
  progress: number;
  duration: number;      // duración real de SoundPlayer (no current.duration)
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  playSong: (song: Song) => Promise<boolean>;
  addToQueue: (song: Song) => void;
  togglePlay: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (v: number) => void;
  setDuration: (d: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  current: undefined,
  queue: [],
  isPlaying: false,
  progress: 0,
  duration: 0,
  shuffle: false,
  repeat: 'off',

  playSong: async (song: Song): Promise<boolean> => {
    const ok = await playerService.play(song);
    if (ok) {
      set(s => ({
        current: song,
        isPlaying: true,
        progress: 0,
        duration: 0, // se actualiza en usePlaybackTick via SoundPlayer.getInfo()
        queue: s.queue.find(q => q.id === song.id)
          ? s.queue
          : [song, ...s.queue],
      }));
    }
    return ok;
  },

  addToQueue: (song: Song) =>
    set(s => ({
      queue: s.queue.find(q => q.id === song.id) ? s.queue : [...s.queue, song],
    })),

  togglePlay: async () => {
    const { isPlaying, current } = get();
    if (!current) return;
    if (isPlaying) {
      const ok = await playerService.pause();
      if (ok) set({ isPlaying: false });
    } else {
      const ok = await playerService.play(current);
      if (ok) set({ isPlaying: true });
    }
  },

  next: async () => {
    const { queue, current, shuffle, repeat } = get();
    if (!current || queue.length === 0) return;
    const i = queue.findIndex(s => s.id === current.id);
    const n = shuffle
      ? (() => {
          const rest = queue.map((_, idx) => idx).filter(idx => idx !== i);
          return rest.length > 0 ? rest[Math.floor(Math.random() * rest.length)] : i;
        })()
      : i + 1 >= queue.length
      ? repeat === 'all' ? 0 : i
      : i + 1;
    const song = queue[n];
    const ok = await playerService.play(song);
    if (ok) set({ current: song, isPlaying: true, progress: 0, duration: 0 });
  },

  previous: async () => {
    const { queue, current } = get();
    if (!current || queue.length === 0) return;
    const i = queue.findIndex(s => s.id === current.id);
    const song = queue[Math.max(0, i - 1)];
    const ok = await playerService.play(song);
    if (ok) set({ current: song, isPlaying: true, progress: 0, duration: 0 });
  },

  seek: (v: number) => set({ progress: v }),
  setDuration: (d: number) => set({ duration: d }),
  toggleShuffle: () => set(s => ({ shuffle: !s.shuffle })),
  toggleRepeat: () =>
    set(s => ({
      repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
    })),
}));
