import RNFS from 'react-native-fs';
import SoundPlayer from 'react-native-sound-player';
import { Song } from '../types/music';

const MIN_AUDIO_BYTES = 1024;
const LOCAL_AUDIO_EXTS = new Set(['mp3', 'm4a', 'wav', 'aac', 'flac', 'ogg', 'opus']);

class PlayerService {
  private currentUrl: string | null = null;
  private paused = false;

  // Decodifica el URI y usa una sola llamada stat (más rápido que exists + stat)
  private async isLocalFilePlayable(fileUri: string): Promise<boolean> {
    try {
      const path = decodeURI(fileUri.replace(/^file:\/\//, ''));
      const stat = await RNFS.stat(path);
      return Number(stat.size) >= MIN_AUDIO_BYTES;
    } catch {
      return false; // no existe o no tiene permisos
    }
  }

  // Asegura que la ruta local esté codificada como URI válido para Android MediaPlayer
  private toPlayableUri(url: string): string {
    if (!url.startsWith('file://')) return url;
    // Decodificar primero para evitar doble-encoding, luego re-codificar
    const rawPath = decodeURI(url.replace(/^file:\/\//, ''));
    return 'file://' + encodeURI(rawPath);
  }

  private getLocalFileParts(fileUri: string) {
    const rawPath = decodeURI(fileUri.replace(/^file:\/\//, ''));
    const fileName = rawPath.split('/').pop() ?? '';
    const dotIndex = fileName.lastIndexOf('.');
    const ext = dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
    const name = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;
    return { rawPath, fileName, name, ext };
  }

  private async ensureInternalPlayableCopy(fileUri: string) {
    const { rawPath, fileName, name, ext } = this.getLocalFileParts(fileUri);
    if (!name || !LOCAL_AUDIO_EXTS.has(ext)) {
      return null;
    }

    const internalPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
      const sourceStat = await RNFS.stat(rawPath);
      const internalExists = await RNFS.exists(internalPath);

      if (!internalExists) {
        await RNFS.copyFile(rawPath, internalPath);
      } else {
        const internalStat = await RNFS.stat(internalPath);
        if (Number(sourceStat.size) !== Number(internalStat.size)) {
          await RNFS.unlink(internalPath).catch(() => {});
          await RNFS.copyFile(rawPath, internalPath);
        }
      }

      return { name, ext, internalPath };
    } catch {
      return null;
    }
  }

  async play(song: Song): Promise<boolean> {
    const rawUrl = song.streamUrl;

    // Validar archivo local antes de intentar reproducir
    if (rawUrl.startsWith('file://')) {
      const playable = await this.isLocalFilePlayable(rawUrl);
      if (!playable) return false;
    }

    const targetUrl = this.toPlayableUri(rawUrl);

    try {
      // Resume si es el mismo track en pausa
      if (this.currentUrl === targetUrl && this.paused) {
        SoundPlayer.resume();
        this.paused = false;
        return true;
      }

      if (rawUrl.startsWith('file://')) {
        const localFile = await this.ensureInternalPlayableCopy(rawUrl);
        if (!localFile) {
          return false;
        }

        SoundPlayer.playSoundFile(localFile.name, localFile.ext);
        this.currentUrl = targetUrl;
        this.paused = false;
        return true;
      }

      // Para cualquier otro caso (nuevo track o re-play): reproducir directamente.
      // SoundPlayer.playUrl maneja internamente el stop del track anterior.
      SoundPlayer.playUrl(targetUrl);
      this.currentUrl = targetUrl;
      this.paused = false;
      return true;
    } catch {
      return false;
    }
  }

  // Mueve la posición de reproducción al segundo indicado.
  // Llamar solo desde interacción del usuario — el tick usa setState directo.
  seekTo(seconds: number): void {
    try {
      SoundPlayer.seek(seconds);
    } catch {
      // Versión de la librería sin soporte de seek — no hace nada
    }
  }

  async pause(): Promise<boolean> {
    if (!this.currentUrl) return true;
    try {
      SoundPlayer.pause();
      this.paused = true;
      return true;
    } catch {
      return false;
    }
  }

  stop(): void {
    try {
      SoundPlayer.stop();
    } catch {}
    this.currentUrl = null;
    this.paused = false;
  }
}

export const playerService = new PlayerService();
