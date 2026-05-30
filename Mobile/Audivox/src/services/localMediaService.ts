import { PermissionsAndroid, Platform } from 'react-native';
import RNFS, { ReadDirItem } from 'react-native-fs';
import { ExternalDownloadFormat } from '../store/useAppStore';

const AUDIO_EXT = ['.mp3', '.m4a', '.wav', '.aac', '.flac', '.ogg', '.opus'];
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

const hasExt = (name: string, exts: string[]) =>
  exts.some(ext => name.toLowerCase().endsWith(ext));

const toMediaItem = (entry: ReadDirItem) => ({
  name: entry.name,
  path: entry.path,
  size: Number(entry.size || 0),
  mtime: entry.mtime?.getTime() || Date.now(),
});

const sanitizeFilename = (raw: string) =>
  raw.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_').slice(0, 40);

const normalizeAudioExtension = (raw?: string | null) => {
  const ext = (raw ?? '').toLowerCase().replace('.', '');
  if (['mp3', 'm4a', 'wav', 'aac', 'flac', 'ogg', 'opus'].includes(ext)) {
    return ext;
  }
  return 'mp3';
};

export type LocalMediaItem = {
  name: string;
  path: string;
  size: number;
  mtime: number;
};

// Directorios del dispositivo donde buscar música
const DEVICE_AUDIO_DIRS = [
  RNFS.DownloadDirectoryPath,
  `${RNFS.ExternalStorageDirectoryPath}/Music`,
  `${RNFS.ExternalStorageDirectoryPath}/music`,
  `${RNFS.ExternalStorageDirectoryPath}/Download`,
];

// Instancias públicas de Piped (alternative YouTube frontend, sin auth)
// Si una falla, se intenta la siguiente
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://piped-api.garudalinux.org',
  'https://api.piped.yt',
  'https://pipedapi.adminforge.de',
];

const extractVideoId = (url: string): string | null =>
  url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? null;

export const localMediaService = {
  getAudivoxMusicDir: () => `${RNFS.DownloadDirectoryPath}/AudivoxMusic`,

  ensureAudivoxFolder: async () => {
    const path = localMediaService.getAudivoxMusicDir();
    if (!(await RNFS.exists(path))) await RNFS.mkdir(path);
    return path;
  },

  requestStoragePermissions: async () => {
    if (Platform.OS !== 'android') return { granted: true };
    const sdk = Number(Platform.Version);
    if (sdk >= 33) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      ]);
      const audioGranted =
        results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO] === 'granted';
      const imagesGranted =
        results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] === 'granted';
      return { granted: audioGranted || imagesGranted, audioGranted, imagesGranted };
    }
    const r = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    );
    const ok = r === 'granted';
    return { granted: ok, audioGranted: ok, imagesGranted: ok };
  },

  scanAudivoxFolder: async () => {
    const dir = await localMediaService.ensureAudivoxFolder();
    const entries = await RNFS.readDir(dir);
    const audio = entries
      .filter(e => e.isFile() && hasExt(e.name, AUDIO_EXT))
      .map(toMediaItem)
      .sort((a, b) => b.mtime - a.mtime);
    const images = entries
      .filter(e => e.isFile() && hasExt(e.name, IMAGE_EXT))
      .map(toMediaItem)
      .sort((a, b) => b.mtime - a.mtime);
    return { dir, audio, images, scannedAt: Date.now() };
  },

  // Escanea carpetas del dispositivo (Downloads, Music) + AudivoxMusic
  scanDeviceMusic: async (): Promise<LocalMediaItem[]> => {
    const all: LocalMediaItem[] = [];
    for (const dir of DEVICE_AUDIO_DIRS) {
      try {
        if (!(await RNFS.exists(dir))) continue;
        const entries = await RNFS.readDir(dir);
        entries
          .filter(e => e.isFile() && hasExt(e.name, AUDIO_EXT))
          .forEach(e => all.push(toMediaItem(e)));
      } catch {}
    }
    // AudivoxMusic
    try {
      const scan = await localMediaService.scanAudivoxFolder();
      all.push(...scan.audio);
    } catch {}

    // Deduplicar por path
    const seen = new Set<string>();
    return all
      .filter(item => !seen.has(item.path) && seen.add(item.path))
      .sort((a, b) => b.mtime - a.mtime);
  },

  downloadRemoteAudio: async (
    sourceUrl: string,
    title: string,
    preferredExt?: string,
    thumbnailUrl?: string,
    onProgress?: (pct: number) => void,
  ): Promise<{ audioPath: string; fileName: string; sizeLabel?: string }> => {
    const dir = await localMediaService.ensureAudivoxFolder();
    const ext = normalizeAudioExtension(preferredExt);
    const baseName = sanitizeFilename(title) || `track_${Date.now()}`;
    const fileName = `${baseName}.${ext}`;
    const audioPath = `${dir}/${fileName}`;

    onProgress?.(4);

    const download = RNFS.downloadFile({
      fromUrl: sourceUrl,
      toFile: audioPath,
      background: true,
      discretionary: true,
      progressInterval: 400,
      progress: r => {
        if (r.contentLength > 0) {
          const pct = 5 + Math.floor((r.bytesWritten / r.contentLength) * 90);
          onProgress?.(Math.min(95, pct));
        }
      },
    });

    const result = await download.promise;
    if (result.statusCode < 200 || result.statusCode >= 300) {
      await RNFS.unlink(audioPath).catch(() => {});
      throw new Error(`Descarga fallida (HTTP ${result.statusCode}).`);
    }

    const stat = await RNFS.stat(audioPath).catch(() => null);
    if (!stat || Number(stat.size) < 4096) {
      await RNFS.unlink(audioPath).catch(() => {});
      throw new Error('El archivo descargado no contiene audio válido.');
    }

    const sizeLabel = `${(Number(stat.size) / 1024 / 1024).toFixed(1)} MB`;

    if (thumbnailUrl) {
      const coverPath = `${dir}/${baseName}.jpg`;
      try {
        if (!(await RNFS.exists(coverPath))) {
          await RNFS.downloadFile({ fromUrl: thumbnailUrl, toFile: coverPath }).promise;
        }
      } catch {}
    }

    onProgress?.(100);
    return { audioPath, fileName, sizeLabel };
  },

  // ── Descarga YouTube vía Piped API (open-source, sin autenticación) ────────
  // Piped es un frontend alternativo de YouTube que devuelve URLs de stream directas.
  // Prueba múltiples instancias públicas hasta conseguir una que funcione.
  downloadYouTubeAudio: async (
    youtubeUrl: string,
    title: string,
    format: ExternalDownloadFormat,
    thumbnailUrl?: string,
    onProgress?: (pct: number) => void,
  ): Promise<{ audioPath: string; fileName: string; sizeLabel?: string }> => {
    const dir = await localMediaService.ensureAudivoxFolder();

    // 1. Extraer video ID
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) throw new Error('URL de YouTube inválida. No se encontró el video ID.');

    onProgress?.(2);

    // 2. Pedir streams a Piped API
    type PipedAudioStream = {
      url: string;
      mimeType: string;
      bitrate: number;
      quality?: string;
    };
    type PipedResponse = {
      audioStreams?: PipedAudioStream[];
      error?: string;
      message?: string;
    };

    let audioUrl: string | null = null;
    let audioMime = 'audio/mp4';
    let lastError = 'Todas las instancias de Piped fallaron.';

    for (const instance of PIPED_INSTANCES) {
      try {
        const res = await fetch(`${instance}/streams/${videoId}`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          lastError = `Piped HTTP ${res.status} en ${instance}`;
          continue;
        }
        const data: PipedResponse = await res.json();
        if (data.error || data.message) {
          lastError = data.error ?? data.message ?? 'Error Piped';
          continue;
        }

        const streams = (data.audioStreams ?? []).filter(s =>
          s.mimeType?.startsWith('audio/'),
        );
        if (streams.length === 0) { lastError = 'Sin streams de audio'; continue; }

        // Elegir el de mayor bitrate (mejor calidad)
        const best = streams.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
        audioUrl = best.url;
        audioMime = best.mimeType ?? 'audio/mp4';
        break;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }

    if (!audioUrl) {
      throw new Error(`No se pudo obtener el audio: ${lastError}`);
    }

    // 3. Determinar extensión real por mimeType
    const realExt = audioMime.includes('opus') ? 'opus'
      : audioMime.includes('webm') ? 'webm'
      : audioMime.includes('ogg') ? 'ogg'
      : 'm4a'; // mp4 container → .m4a

    const name = sanitizeFilename(title) || `track_${Date.now()}`;
    const audioPath = `${dir}/${name}.${realExt}`;

    onProgress?.(10);

    // 4. Descargar con progreso real
    const dlTask = RNFS.downloadFile({
      fromUrl: audioUrl,
      toFile: audioPath,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/91.0.4472.120',
        'Accept': '*/*',
        'Origin': 'https://piped.video',
        'Referer': 'https://piped.video/',
      },
      progressInterval: 500,
      progress: r => {
        if (r.contentLength > 0) {
          onProgress?.(10 + Math.floor((r.bytesWritten / r.contentLength) * 85));
        }
      },
    });

    const result = await dlTask.promise;

    if (result.statusCode < 200 || result.statusCode >= 300) {
      await RNFS.unlink(audioPath).catch(() => {});
      throw new Error(`Descarga fallida (HTTP ${result.statusCode}). Intenta otra URL.`);
    }

    // Verificar que el archivo tiene contenido real
    const stat = await RNFS.stat(audioPath).catch(() => null);
    if (!stat || Number(stat.size) < 4096) {
      await RNFS.unlink(audioPath).catch(() => {});
      throw new Error('El archivo descargado está vacío. Puede que la URL haya expirado.');
    }

    const sizeLabel = `${(Number(stat.size) / 1024 / 1024).toFixed(1)} MB`;
    onProgress?.(98);

    // 5. Guardar portada si viene thumbnail
    if (thumbnailUrl) {
      const coverPath = `${dir}/${name}.jpg`;
      try {
        if (!(await RNFS.exists(coverPath))) {
          await RNFS.downloadFile({ fromUrl: thumbnailUrl, toFile: coverPath }).promise;
        }
      } catch { /* no crítico */ }
    }

    onProgress?.(100);
    return { audioPath, fileName: `${name}.${realExt}`, sizeLabel };
  },
};
