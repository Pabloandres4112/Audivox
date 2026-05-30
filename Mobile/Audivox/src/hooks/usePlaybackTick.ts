import { useEffect } from 'react';
import SoundPlayer from 'react-native-sound-player';
import { usePlayerStore } from '../store/usePlayerStore';

// Sincroniza progreso y duración reales desde SoundPlayer nativo.
// Reemplaza el contador falso que usaba current.duration = 0.
export const usePlaybackTick = () => {
  const currentId = usePlayerStore(s => s.current?.id);
  const isPlaying = usePlayerStore(s => s.isPlaying);

  useEffect(() => {
    if (!currentId || !isPlaying) return;

    // ── Evento: la canción terminó nativamente ──────────────────────────────
    const doneListener = SoundPlayer.addEventListener('FinishedPlaying', () => {
      const { repeat, next, seek } = usePlayerStore.getState();
      if (repeat === 'one') {
        // Reiniciar progreso y reproducir de nuevo
        seek(0);
        const current = usePlayerStore.getState().current;
        if (current) usePlayerStore.getState().playSong(current);
      } else {
        next();
      }
    });

    // ── Poll de progreso cada 500 ms ────────────────────────────────────────
    // Obtiene posición real del MediaPlayer nativo.
    const ticker = setInterval(async () => {
      try {
        const info = await SoundPlayer.getInfo();
        const { seek, setDuration } = usePlayerStore.getState();

        if (typeof info.currentTime === 'number' && info.currentTime >= 0) {
          seek(info.currentTime);
        }
        // Actualiza duración cuando SoundPlayer la tenga
        if (typeof info.duration === 'number' && info.duration > 0) {
          setDuration(info.duration);
        }
      } catch {
        // SoundPlayer aún no tiene info disponible (normal al inicio)
      }
    }, 500);

    return () => {
      clearInterval(ticker);
      doneListener.remove();
    };
  }, [currentId, isPlaying]);
};
