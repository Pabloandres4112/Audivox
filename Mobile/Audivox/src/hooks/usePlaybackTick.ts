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
      const { repeat, next, playSong, current: cur } = usePlayerStore.getState();
      if (repeat === 'one' && cur) {
        // Reiniciar sin seek nativo — simplemente vuelve a reproducir desde el inicio
        usePlayerStore.setState({ progress: 0 });
        playSong(cur);
      } else {
        next();
      }
    });

    // ── Poll de progreso cada 500 ms ────────────────────────────────────────
    // Usa setState directo para NO disparar el seek nativo del usuario.
    // seek() del store llama playerService.seekTo() — eso es solo para el usuario.
    const ticker = setInterval(async () => {
      try {
        const info = await SoundPlayer.getInfo();

        if (typeof info.currentTime === 'number' && info.currentTime >= 0) {
          usePlayerStore.setState({ progress: info.currentTime });
        }
        if (typeof info.duration === 'number' && info.duration > 0) {
          usePlayerStore.setState({ duration: info.duration });
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
