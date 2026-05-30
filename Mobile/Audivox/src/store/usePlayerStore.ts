import { create } from 'zustand';
import { songs } from '../services/mockData';
import { playerService } from '../services/playerService';
import { Song } from '../types/music';
interface PlayerState {
  current?: Song;
  queue: Song[];
  isPlaying: boolean;
  progress: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  playSong: (song: Song) => Promise<void>;
  togglePlay: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (v: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}
export const usePlayerStore = create<PlayerState>((set, get) => ({
  current: songs[0],
  queue: songs,
  isPlaying: false,
  progress: 0,
  shuffle: false,
  repeat: 'off',
  playSong: async song => {
    await playerService.play(song);
    set({ current: song, isPlaying: true, progress: 0 });
  },
  togglePlay: async () => {
    const { isPlaying, current } = get();
    if (!current) return;
    if (isPlaying) await playerService.pause();
    else await playerService.play(current);
    set({ isPlaying: !isPlaying });
  },
  next: async () => {
    const { queue, current, shuffle, repeat } = get();
    if (!current) return;
    const i = queue.findIndex(s => s.id === current.id);
    const n = shuffle
      ? queue.length <= 1
        ? i
        : (() => {
            const randomIndexes = queue
              .map((_, index) => index)
              .filter(index => index !== i);
            return randomIndexes[
              Math.floor(Math.random() * randomIndexes.length)
            ];
          })()
      : i + 1 >= queue.length
      ? repeat === 'all'
        ? 0
        : i
      : i + 1;
    const song = queue[n];
    await playerService.play(song);
    set({ current: song, isPlaying: true, progress: 0 });
  },
  previous: async () => {
    const { queue, current } = get();
    if (!current) return;
    const i = queue.findIndex(s => s.id === current.id);
    const song = queue[i - 1] || queue[0];
    await playerService.play(song);
    set({ current: song, isPlaying: true, progress: 0 });
  },
  seek: v => set({ progress: v }),
  toggleShuffle: () => set(s => ({ shuffle: !s.shuffle })),
  toggleRepeat: () =>
    set(s => ({
      repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
    })),
}));
