import { useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
export const usePlaybackTick = () => {
  const { current, isPlaying, progress, seek, next, repeat } = usePlayerStore();
  useEffect(() => {
    if (!current || !isPlaying) return;
    const t = setInterval(() => {
      const v = progress + 1;
      if (v >= current.duration) {
        if (repeat === 'one') {
          seek(0);
        } else {
          next();
        }
      } else seek(v);
    }, 1000);
    return () => clearInterval(t);
  }, [current, isPlaying, next, progress, repeat, seek]);
};
