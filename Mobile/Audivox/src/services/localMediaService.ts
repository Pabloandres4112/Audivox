import { PermissionsAndroid, Platform } from 'react-native';
import RNFS, { ReadDirItem } from 'react-native-fs';
import { ExternalDownloadFormat } from '../store/useAppStore';

const AUDIO_EXT = ['.mp3', '.m4a', '.wav', '.aac', '.flac', '.ogg', '.opus', '.webm'];
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

  // WebM: cabecera EBML → bytes 0x1A 0x45 0xDF 0xA3
  if (chunk.charCodeAt(0) === 0x1A && chunk.charCodeAt(1) === 0x45) return 'webm';

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

  // Elimina un archivo descargado de la carpeta AudivoxMusic (uso personal).
  // La eliminación falla silenciosamente si el archivo no existe.
  unlinkDownloadedFile: async (fileName: string): Promise<void> => {
    try {
      const path = `${localMediaService.getAudivoxMusicDir()}/${fileName}`;
      if (await RNFS.exists(path)) await RNFS.unlink(path);
      // También intenta eliminar la portada si existe
      const base = fileName.replace(/\.[^.]+$/, '');
      const coverPath = `${localMediaService.getAudivoxMusicDir()}/${base}.jpg`;
      if (await RNFS.exists(coverPath)) await RNFS.unlink(coverPath).catch(() => {});
    } catch {
      // Falla silenciosa: el archivo puede no existir o estar en uso
    }
  },

  // ─── Descarga vía Invidious/Piped (uso personal, sin backend) ────────────
  // Estrategia de 2 niveles:
  //   1. Invidious → resuelve la URL directa de CDN de Google (sin Cloudflare).
  //   2. Piped (instancias sin Cloudflare) como fallback.
  // Solo para uso personal en tu propio dispositivo.
  downloadViaPiped: async (
    youtubeUrl: string,
    onProgress?: (pct: number) => void,
  ): Promise<DownloadRemoteAudioResult & { title: string }> => {
    // Instancias Invidious — no usan Cloudflare, devuelven URLs directas de Google CDN
    const INVIDIOUS_INSTANCES = [
      'https://invidious.fdn.fr',
      'https://yt.artemislena.eu',
      'https://invidious.privacydev.net',
      'https://inv.riverside.rocks',
      'https://invidious.nerdvpn.de',
      'https://invidious.slipfox.xyz',
    ];

    // Instancias Piped sin Cloudflare (evitar kavin.rocks, api.piped.yt)
    const PIPED_INSTANCES = [
      'https://pipedapi.eu.projectsegfau.lt',
      'https://pipedapi.in.projectsegfau.lt',
      'https://pipedapi.tokhmi.xyz',
      'https://piped-api.garudalinux.org',
      'https://pipedapi.adminforge.de',
    ];

    const extractVideoId = (url: string): string | null =>
      url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? null;

    const videoId = extractVideoId(youtubeUrl.trim());
    if (!videoId) throw new Error('URL de YouTube inválida. No se encontró el video ID.');

    onProgress?.(2);

    const BROWSER_HEADERS = {
      'Accept': 'application/json',
      'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    };

    type InvFormat = {
      url?: string;
      type?: string;
      container?: string;
      itag?: string;
      bitrate?: number;
    };
    type InvData = { title?: string; adaptiveFormats?: InvFormat[] };

    type PipedStream = { url: string; mimeType: string; bitrate: number };
    type PipedData = {
      title?: string;
      audioStreams?: PipedStream[];
      error?: string;
      message?: string;
    };

    let audioUrl: string | null = null;
    let audioTitle = `yt_${videoId}`;
    let lastError = 'Todos los servidores fallaron.';

    const fetchJson = async <T>(url: string, timeoutMs = 10_000): Promise<T | null> => {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(url, { headers: BROWSER_HEADERS, signal: ctrl.signal });
        if (!res.ok) return null;
        return (await res.json()) as T;
      } catch {
        return null;
      } finally {
        clearTimeout(id);
      }
    };

    // ── Nivel 1: Invidious (URLs directas de Google CDN — máxima compatibilidad) ──
    for (const instance of INVIDIOUS_INSTANCES) {
      const data = await fetchJson<InvData>(
        `${instance}/api/v1/videos/${videoId}?fields=title,adaptiveFormats`,
      );
      if (!data) continue;

      const formats = (data.adaptiveFormats ?? []).filter(
        f => f.url && (f.type?.startsWith('audio/') || f.container),
      );

      // Preferir m4a (itag 140/141) — compatible con Android MediaPlayer sin codecs externos
      const m4a = formats.find(
        f => f.container === 'm4a' || f.type?.includes('audio/mp4'),
      );
      const chosen = m4a ?? formats[0];

      if (chosen?.url) {
        audioUrl = chosen.url;
        if (data.title) audioTitle = data.title;
        lastError = '';
        break;
      }
      lastError = `Invidious ${instance}: sin formatos de audio`;
    }

    // ── Nivel 2: Piped (sin Cloudflare) ──────────────────────────────────────
    if (!audioUrl) {
      for (const instance of PIPED_INSTANCES) {
        const data = await fetchJson<PipedData>(`${instance}/streams/${videoId}`);
        if (!data) continue;
        if (data.error || data.message) {
          lastError = data.error ?? data.message ?? 'Piped error';
          continue;
        }

        const streams = (data.audioStreams ?? []).filter(s => s.mimeType?.startsWith('audio/'));
        if (!streams.length) { lastError = `Piped ${instance}: sin streams`; continue; }

        const m4aStreams = streams.filter(
          s => s.mimeType.includes('mp4') || s.mimeType.includes('m4a'),
        );
        const best =
          m4aStreams.length > 0
            ? m4aStreams.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0]
            : streams.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];

        audioUrl = best.url;
        if (data.title) audioTitle = data.title;
        lastError = '';
        break;
      }
    }

    if (!audioUrl) {
      throw new Error(
        `No se pudo obtener el audio. ${lastError}\n` +
          'Verifica tu conexión o intenta más tarde.',
      );
    }

    onProgress?.(10);

    const result = await localMediaService.downloadRemoteAudio(
      audioUrl,
      audioTitle,
      'm4a',
      undefined,
      p => onProgress?.(10 + Math.floor(p * 0.88)),
    );

    return { ...result, title: audioTitle };
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
