import RNFS from 'react-native-fs';
import SoundPlayer from 'react-native-sound-player';
import { Song } from '../types/music';

const MIN_AUDIO_BYTES = 1024;

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
