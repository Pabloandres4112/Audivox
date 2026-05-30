import { PermissionsAndroid, Platform } from 'react-native';
import RNFS, { ReadDirItem } from 'react-native-fs';
import { ExternalDownloadFormat } from '../store/useAppStore';

const AUDIO_EXT = ['.mp3', '.m4a', '.wav', '.aac', '.flac', '.ogg'];
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

const hasExt = (name: string, exts: string[]) => {
  const lower = name.toLowerCase();
  return exts.some(ext => lower.endsWith(ext));
};

const toMediaItem = (entry: ReadDirItem) => ({
  name: entry.name,
  path: entry.path,
  size: Number(entry.size || 0),
  mtime: entry.mtime?.getTime() || Date.now(),
});

const sanitizeFilename = (raw: string) =>
  raw
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 40);

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

export const localMediaService = {
  getAudivoxMusicDir: () => `${RNFS.DownloadDirectoryPath}/AudivoxMusic`,

  ensureAudivoxFolder: async () => {
    const path = localMediaService.getAudivoxMusicDir();
    const exists = await RNFS.exists(path);
    if (!exists) await RNFS.mkdir(path);
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
        results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const imagesGranted =
        results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] ===
        PermissionsAndroid.RESULTS.GRANTED;
      return { granted: audioGranted || imagesGranted, audioGranted, imagesGranted };
    }

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    );
    const ok = result === PermissionsAndroid.RESULTS.GRANTED;
    return { granted: ok, audioGranted: ok, imagesGranted: ok };
  },

  // Escanea SOLO la carpeta AudivoxMusic
  scanAudivoxFolder: async () => {
    const dir = await localMediaService.ensureAudivoxFolder();
    const entries = await RNFS.readDir(dir);

    const audio: LocalMediaItem[] = entries
      .filter(item => item.isFile() && hasExt(item.name, AUDIO_EXT))
      .map(toMediaItem)
      .sort((a, b) => b.mtime - a.mtime);

    const images: LocalMediaItem[] = entries
      .filter(item => item.isFile() && hasExt(item.name, IMAGE_EXT))
      .map(toMediaItem)
      .sort((a, b) => b.mtime - a.mtime);

    return { dir, audio, images, scannedAt: Date.now() };
  },

  // Escanea carpetas del dispositivo en busca de audio (Downloads, Music, etc.)
  scanDeviceMusic: async (): Promise<LocalMediaItem[]> => {
    const all: LocalMediaItem[] = [];

    for (const dir of DEVICE_AUDIO_DIRS) {
      try {
        const exists = await RNFS.exists(dir);
        if (!exists) continue;
        const entries = await RNFS.readDir(dir);
        const audio = entries
          .filter(e => e.isFile() && hasExt(e.name, AUDIO_EXT))
          .map(toMediaItem);
        all.push(...audio);
      } catch {
        // directorio sin acceso, continuar
      }
    }

    // También incluir los de AudivoxMusic
    try {
      const scan = await localMediaService.scanAudivoxFolder();
      all.push(...scan.audio);
    } catch {}

    // Deduplicar por path y ordenar por más reciente
    const seen = new Set<string>();
    return all
      .filter(item => {
        if (seen.has(item.path)) return false;
        seen.add(item.path);
        return true;
      })
      .sort((a, b) => b.mtime - a.mtime);
  },

  // ── Descarga real de YouTube vía cobalt.tools ─────────────────────────────
  // cobalt.tools es una API pública gratuita para extraer audio de YouTube.
  // Si está caída o rate-limited, la descarga falla con error claro (sin Kalimba).
  downloadYouTubeAudio: async (
    youtubeUrl: string,
    title: string,
    format: ExternalDownloadFormat,
    thumbnailUrl?: string,
    onProgress?: (pct: number) => void,
  ): Promise<{ audioPath: string; fileName: string; sizeLabel?: string }> => {
    const dir = await localMediaService.ensureAudivoxFolder();
    const name = sanitizeFilename(title) || `track_${Date.now()}`;
    const audioFormat = format === 'mp4' ? 'mp3' : format;
    const audioPath = `${dir}/${name}.${audioFormat}`;

    // 1. Pedir URL de descarga a cobalt.tools
    let downloadUrl: string | null = null;
    let cobaltError = 'API no disponible';

    try {
      const res = await fetch('https://api.cobalt.tools/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          url: youtubeUrl,
          downloadMode: 'audio',
          audioFormat,
          audioBitrate: '128',
          filenameStyle: 'basic',
        }),
      });

      if (!res.ok) {
        cobaltError = `cobalt HTTP ${res.status}`;
      } else {
        const data = (await res.json()) as {
          status?: string;
          url?: string;
          error?: { code?: string };
        };

        if (data.url && ['tunnel', 'redirect', 'stream'].includes(data.status ?? '')) {
          downloadUrl = data.url;
        } else if (data.error?.code) {
          cobaltError = `cobalt: ${data.error.code}`;
        } else if (data.status === 'error') {
          cobaltError = 'cobalt: error desconocido';
        }
      }
    } catch (e) {
      cobaltError = e instanceof Error ? e.message : 'Sin conexión a la API';
    }

    if (!downloadUrl) {
      throw new Error(
        `No se pudo obtener audio de YouTube (${cobaltError}). ` +
          'Se requiere backend propio para descarga real.',
      );
    }

    // 2. Descargar el audio con progreso real
    onProgress?.(2);

    const dlTask = RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: audioPath,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Audivox/1.0)' },
      progressInterval: 500,
      progress: (r) => {
        if (r.contentLength > 0) {
          onProgress?.(Math.floor((r.bytesWritten / r.contentLength) * 95));
        }
      },
    });

    const result = await dlTask.promise;

    if (result.statusCode < 200 || result.statusCode >= 300) {
      await RNFS.unlink(audioPath).catch(() => {});
      throw new Error(`Descarga fallida (HTTP ${result.statusCode})`);
    }

    // Verificar que el archivo tiene contenido real
    const stat = await RNFS.stat(audioPath).catch(() => null);
    if (!stat || Number(stat.size) < 1024) {
      await RNFS.unlink(audioPath).catch(() => {});
      throw new Error('El archivo descargado está vacío o es inválido.');
    }

    const sizeMB = (Number(stat.size) / 1024 / 1024).toFixed(1) + ' MB';
    onProgress?.(98);

    // 3. Guardar portada si viene thumbnail
    if (thumbnailUrl) {
      const coverPath = `${dir}/${name}.jpg`;
      try {
        if (!(await RNFS.exists(coverPath))) {
          await RNFS.downloadFile({ fromUrl: thumbnailUrl, toFile: coverPath }).promise;
        }
      } catch { /* no crítico */ }
    }

    onProgress?.(100);
    return { audioPath, fileName: `${name}.${audioFormat}`, sizeLabel: sizeMB };
  },
};
