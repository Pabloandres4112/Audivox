import { PermissionsAndroid, Platform } from 'react-native';
import RNFS, { ReadDirItem } from 'react-native-fs';
import { ExternalDownloadFormat } from '../store/useAppStore';

const AUDIO_EXT = ['.mp3', '.m4a', '.wav', '.aac', '.flac', '.ogg', '.opus'];
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

const MIN_AUDIO_BYTES = 64 * 1024;
const MIN_CONTENT_LENGTH_BYTES = 32 * 1024;
const MIN_AVG_BYTES_PER_SECOND = 2500;

const AUDIO_CONTENT_TYPE_RE = /audio\/|video\/mp4|application\/octet-stream|binary\/octet-stream/i;
const INVALID_CONTENT_TYPE_RE = /text\/html|application\/json|text\/plain|application\/xml/i;

const YOUTUBE_URL_RE = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{6,}/i;

// Configura aqui tu endpoint propio de conversion. Ejemplo:
// https://tu-backend.com/api/youtube/convert
const YOUTUBE_CONVERTER_ENDPOINT = '';

const hasExt = (name: string, exts: string[]) =>
  exts.some(ext => name.toLowerCase().endsWith(ext));

const toMediaItem = (entry: ReadDirItem) => ({
  name: entry.name,
  path: entry.path,
  size: Number(entry.size || 0),
  mtime: entry.mtime?.getTime() || Date.now(),
});

const sanitizeFilename = (raw: string) =>
  raw.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_').slice(0, 60);

const normalizeAudioExtension = (raw?: string | null) => {
  const ext = (raw ?? '').toLowerCase().replace('.', '');
  if (['mp3', 'm4a', 'wav', 'aac', 'flac', 'ogg', 'opus'].includes(ext)) {
    return ext;
  }
  return 'mp3';
};

const ensureHttpUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const normalizeHeaders = (headers?: Record<string, string | number>) => {
  const output: Record<string, string> = {};
  Object.entries(headers ?? {}).forEach(([k, v]) => {
    output[k.toLowerCase()] = String(v);
  });
  return output;
};

const detectAudioFormatFromHeader = (headerChunk: string): string | null => {
  const chunk = headerChunk || '';

  if (chunk.startsWith('ID3')) return 'mp3';
  if (chunk.startsWith('RIFF') && chunk.includes('WAVE')) return 'wav';
  if (chunk.startsWith('OggS')) return 'ogg';
  if (chunk.startsWith('fLaC')) return 'flac';

  const ftypIndex = chunk.indexOf('ftyp');
  if (ftypIndex >= 0 && ftypIndex <= 8) return 'm4a';

  return null;
};

const looksLikeTextPayload = (headerChunk: string) => {
  const trimmed = headerChunk.trimStart().toLowerCase();
  if (!trimmed) return false;
  return (
    trimmed.startsWith('<!doctype html') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('{"error"') ||
    trimmed.startsWith('{"message"') ||
    trimmed.startsWith('{"status"')
  );
};

export type LocalMediaItem = {
  name: string;
  path: string;
  size: number;
  mtime: number;
};

export type DownloadRemoteAudioOptions = {
  expectedDurationSec?: number;
};

export type DownloadRemoteAudioResult = {
  audioPath: string;
  fileName: string;
  sizeLabel?: string;
  contentType?: string;
  contentLength?: number;
  detectedFormat?: string;
};

// Directorios del dispositivo donde buscar musica
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
    try {
      const scan = await localMediaService.scanAudivoxFolder();
      all.push(...scan.audio);
    } catch {}

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
    options?: DownloadRemoteAudioOptions,
  ): Promise<DownloadRemoteAudioResult> => {
    if (!ensureHttpUrl(sourceUrl)) {
      throw new Error('URL invalida: la fuente de audio debe usar http o https.');
    }

    const dir = await localMediaService.ensureAudivoxFolder();
    const ext = normalizeAudioExtension(preferredExt);
    const baseName = sanitizeFilename(title) || `track_${Date.now()}`;
    const tempPath = `${dir}/${baseName}.part`;

    onProgress?.(3);

    let beginStatusCode = 0;
    let beginContentLength = 0;
    let beginContentType = '';
    let beginError: string | null = null;

    const download = RNFS.downloadFile({
      fromUrl: sourceUrl,
      toFile: tempPath,
      background: true,
      discretionary: true,
      connectionTimeout: 15000,
      readTimeout: 45000,
      progressInterval: 400,
      begin: res => {
        beginStatusCode = Number(res.statusCode || 0);
        beginContentLength = Number(res.contentLength || 0);
        const headers = normalizeHeaders(res.headers as Record<string, string>);
        beginContentType = headers['content-type'] ?? '';

        if (beginStatusCode < 200 || beginStatusCode >= 300) {
          beginError = `Stream no compatible (HTTP ${beginStatusCode}).`;
          RNFS.stopDownload(res.jobId);
          return;
        }

        if (beginContentType && INVALID_CONTENT_TYPE_RE.test(beginContentType)) {
          beginError = `Respuesta invalida: content-type ${beginContentType}.`;
          RNFS.stopDownload(res.jobId);
          return;
        }

        if (beginContentType && !AUDIO_CONTENT_TYPE_RE.test(beginContentType)) {
          beginError = `Stream no compatible: content-type ${beginContentType}.`;
          RNFS.stopDownload(res.jobId);
          return;
        }

        if (beginContentLength > 0 && beginContentLength < MIN_CONTENT_LENGTH_BYTES) {
          beginError = 'Archivo demasiado pequeno para ser audio valido.';
          RNFS.stopDownload(res.jobId);
        }
      },
      progress: r => {
        if (r.contentLength > 0) {
          const pct = 5 + Math.floor((r.bytesWritten / r.contentLength) * 90);
          onProgress?.(Math.min(95, pct));
        }
      },
    });

    const result = await download.promise.catch(() => {
      throw new Error(beginError ?? 'Descarga interrumpida o stream no compatible.');
    });

    if (beginError) {
      await RNFS.unlink(tempPath).catch(() => {});
      throw new Error(beginError);
    }

    if (result.statusCode < 200 || result.statusCode >= 300) {
      await RNFS.unlink(tempPath).catch(() => {});
      throw new Error(`Descarga fallida (HTTP ${result.statusCode}).`);
    }

    const stat = await RNFS.stat(tempPath).catch(() => null);
    const sizeInBytes = Number(stat?.size || 0);

    if (!stat || sizeInBytes < MIN_AUDIO_BYTES) {
      await RNFS.unlink(tempPath).catch(() => {});
      throw new Error('Archivo corrupto: bytes insuficientes para audio valido.');
    }

    if (beginContentLength > 0 && sizeInBytes < beginContentLength * 0.9) {
      await RNFS.unlink(tempPath).catch(() => {});
      throw new Error('Archivo truncado: la descarga termino incompleta.');
    }

    if (options?.expectedDurationSec && options.expectedDurationSec > 20) {
      const avgBytesPerSecond = sizeInBytes / options.expectedDurationSec;
      if (avgBytesPerSecond < MIN_AVG_BYTES_PER_SECOND) {
        await RNFS.unlink(tempPath).catch(() => {});
        throw new Error(
          'Archivo inconsistente con la duracion esperada. Posible stream parcial o conversion fallida.',
        );
      }
    }

    const headerChunk = await RNFS.read(tempPath, 64, 0, 'ascii').catch(() => '');
    if (!headerChunk) {
      await RNFS.unlink(tempPath).catch(() => {});
      throw new Error('No se pudo leer el archivo descargado para validar su formato.');
    }

    if (looksLikeTextPayload(headerChunk)) {
      await RNFS.unlink(tempPath).catch(() => {});
      throw new Error('Respuesta invalida: se recibio texto/HTML en lugar de audio.');
    }

    const detectedFormat = detectAudioFormatFromHeader(headerChunk);
    if (!detectedFormat) {
      await RNFS.unlink(tempPath).catch(() => {});
      throw new Error('Formato no reconocido: el stream no corresponde a audio soportado.');
    }

    const finalExt = detectedFormat || ext;
    const finalFileName = `${baseName}.${finalExt}`;
    const finalPath = `${dir}/${finalFileName}`;

    if (await RNFS.exists(finalPath)) {
      await RNFS.unlink(finalPath).catch(() => {});
    }
    await RNFS.moveFile(tempPath, finalPath);

    if (thumbnailUrl && ensureHttpUrl(thumbnailUrl)) {
      const coverPath = `${dir}/${baseName}.jpg`;
      try {
        if (!(await RNFS.exists(coverPath))) {
          await RNFS.downloadFile({ fromUrl: thumbnailUrl, toFile: coverPath }).promise;
        }
      } catch {}
    }

    onProgress?.(100);

    const sizeLabel = `${(sizeInBytes / 1024 / 1024).toFixed(1)} MB`;
    return {
      audioPath: finalPath,
      fileName: finalFileName,
      sizeLabel,
      contentType: beginContentType || undefined,
      contentLength: beginContentLength || undefined,
      detectedFormat,
    };
  },

  // Cliente preparado para arquitectura correcta de YouTube:
  // app movil -> backend propio (conversion legal y controlada) -> URL de audio final
  downloadYouTubeAudio: async (
    youtubeUrl: string,
    title: string,
    format: ExternalDownloadFormat,
    thumbnailUrl?: string,
    onProgress?: (pct: number) => void,
  ): Promise<DownloadRemoteAudioResult> => {
    const cleanUrl = youtubeUrl.trim();

    if (!YOUTUBE_URL_RE.test(cleanUrl)) {
      throw new Error('URL invalida de YouTube.');
    }

    if (!YOUTUBE_CONVERTER_ENDPOINT) {
      throw new Error(
        'YouTube requiere backend de conversion. Configura YOUTUBE_CONVERTER_ENDPOINT y consume ese servicio.',
      );
    }

    const response = await fetch(YOUTUBE_CONVERTER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl, format }),
    });

    if (!response.ok) {
      throw new Error(`Conversion fallida en backend (HTTP ${response.status}).`);
    }

    const payload = (await response.json()) as {
      audioUrl?: string;
      title?: string;
      thumbnailUrl?: string;
      fileExt?: string;
      durationSec?: number;
      error?: string;
    };

    if (payload.error) {
      throw new Error(`Conversion fallida: ${payload.error}`);
    }

    if (!payload.audioUrl || !ensureHttpUrl(payload.audioUrl)) {
      throw new Error('Backend invalido: no devolvio una URL de audio valida.');
    }

    return localMediaService.downloadRemoteAudio(
      payload.audioUrl,
      payload.title ?? title,
      payload.fileExt ?? format,
      payload.thumbnailUrl ?? thumbnailUrl,
      onProgress,
      { expectedDurationSec: payload.durationSec },
    );
  },
};
