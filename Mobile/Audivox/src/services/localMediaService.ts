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

// Cloudflare Worker que proxea Piped API — despliega cloudflare-worker/yt-proxy.js
// y pega aquí la URL (ej: https://audivox-yt.TU-USUARIO.workers.dev)
const AUDIVOX_WORKER_URL = '';

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

  // Elimina cualquier archivo local por ruta completa (archivos escaneados del dispositivo).
  deleteLocalFile: async (filePath: string): Promise<void> => {
    if (await RNFS.exists(filePath)) await RNFS.unlink(filePath);
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

  // ─── Descarga de YouTube — múltiples métodos en paralelo ───────────────
  // M1: YouTube InnerTube API (4 clientes distintos) — APIs oficiales de YouTube
  // M2: cobalt.tools (servicio dedicado, mantenido activamente)
  // M3: Invidious (instancias comunitarias de respaldo)
  // Todo en paralelo — gana el primero que responda correctamente.
  downloadViaPiped: async (
    youtubeUrl: string,
    onProgress?: (pct: number) => void,
  ): Promise<DownloadRemoteAudioResult & { title: string }> => {

    // Invidious — instancias con mejor historial de uptime (2025-2026)
    const INV = [
      'https://invidious.privacydev.net',
      'https://inv.nadeko.net',
      'https://yt.artemislena.eu',
      'https://invidious.io.lol',
      'https://iv.datura.network',
      'https://invidious.protokolla.fi',
      'https://inv.vern.cc',
    ];

    // Piped — frontend alternativo de YouTube, muy activo y con buena disponibilidad
    const PIPED = [
      'https://pipedapi.kavin.rocks',
      'https://api.piped.yt',
      'https://pipedapi.adminforge.de',
      'https://pipedapi.darkness.services',
      'https://piped-api.garudalinux.org',
    ];

    const extractId = (url: string): string | null =>
      url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? null;

    const videoId = extractId(youtubeUrl.trim());
    if (!videoId) throw new Error('URL de YouTube inválida. Copia el link completo del video.');

    onProgress?.(3);

    const HDRS = {
      Accept: 'application/json',
      'Accept-Language': 'es-419,es;q=0.9',
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    };
    const TIMEOUT = 9000;

    type InvFmt = { url?: string; type?: string; container?: string; bitrate?: number };
    type InvData = { title?: string; adaptiveFormats?: InvFmt[] };
    type PipedStream = { url: string; mimeType?: string; bitrate?: number; quality?: string };
    type PipedData = { title?: string; audioStreams?: PipedStream[]; error?: string; message?: string };
    type Hit = { audioUrl: string; title: string };

    // Obtiene el primer resultado válido ejecutando todas las tareas en paralelo
    const raceFirst = (tasks: Array<() => Promise<Hit | null>>): Promise<Hit | null> =>
      new Promise(resolve => {
        let remaining = tasks.length;
        let done = false;
        tasks.forEach(t =>
          t()
            .then(r => {
              remaining--;
              if (r && !done) { done = true; resolve(r); }
              else if (remaining === 0 && !done) resolve(null);
            })
            .catch(() => {
              remaining--;
              if (remaining === 0 && !done) resolve(null);
            }),
        );
      });

    const TAG = '[YT-DL]';

    const fetchJson = async <T>(url: string, label: string): Promise<T | null> => {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), TIMEOUT);
      const t0 = Date.now();
      try {
        console.log(`${TAG} → ${label}`);
        const res = await fetch(url, { headers: HDRS, signal: ctrl.signal });
        if (!res.ok) {
          console.warn(`${TAG} ✗ ${label} HTTP ${res.status} (${Date.now() - t0}ms)`);
          return null;
        }
        const j = await res.json();
        if (typeof j !== 'object' || j === null) {
          console.warn(`${TAG} ✗ ${label} respuesta no-JSON (${Date.now() - t0}ms)`);
          return null;
        }
        console.log(`${TAG} ✓ ${label} OK (${Date.now() - t0}ms)`);
        return j as T;
      } catch (e) {
        const reason = (e instanceof Error && e.name === 'AbortError') ? 'timeout' : String(e);
        console.warn(`${TAG} ✗ ${label} ERROR: ${reason} (${Date.now() - t0}ms)`);
        return null;
      } finally {
        clearTimeout(id);
      }
    };

    // ── M1: YouTube InnerTube API — múltiples clientes en paralelo ───────
    // Cada "cliente" es una identidad diferente que YouTube acepta.
    // Se prueban en paralelo — el primero con streams directos (sin cipher) gana.
    // El API key es el de la app oficial de YouTube y está en el APK público.
    const tryYtClient = async (
      name: string,
      apiKey: string,
      clientName: string,
      clientVersion: string,
      extraClient: Record<string, unknown> = {},
      extraHeaders: Record<string, string> = {},
    ): Promise<Hit | null> => {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 12000);
      const t0 = Date.now();
      try {
        console.log(`${TAG} → YouTube/${name}`);
        const res = await fetch(
          `https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Origin': 'https://www.youtube.com',
              ...extraHeaders,
            },
            body: JSON.stringify({
              videoId,
              context: { client: { clientName, clientVersion, hl: 'es', gl: 'CO', ...extraClient } },
              racyCheckOk: true,
              contentCheckOk: true,
            }),
            signal: ctrl.signal,
          },
        );
        if (!res.ok) {
          console.warn(`${TAG} ✗ YouTube/${name} HTTP ${res.status} (${Date.now() - t0}ms)`);
          return null;
        }
        const data = await res.json();
        if (data.playabilityStatus?.status !== 'OK') {
          console.warn(`${TAG} ✗ YouTube/${name} playability=${data.playabilityStatus?.status}`);
          return null;
        }
        const allFmts: any[] = data.streamingData?.adaptiveFormats ?? [];
        // Solo streams con URL directa — los cifrados (signatureCipher) no se pueden usar sin JS
        const direct = allFmts.filter(f => f.mimeType?.startsWith('audio/') && f.url && !f.signatureCipher);
        console.log(`${TAG} YouTube/${name}: ${direct.length} streams directos (${Date.now() - t0}ms)`);
        if (!direct.length) {
          console.warn(`${TAG} ✗ YouTube/${name}: cifrado, no se puede usar sin decriptor`);
          return null;
        }
        const m4a = direct.find((f: any) => f.itag === 140 || f.mimeType?.includes('audio/mp4'));
        const chosen = m4a ?? direct.sort((a: any, b: any) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
        const ytTitle = data.videoDetails?.title ?? `yt_${videoId}`;
        console.log(`${TAG} ✓ YouTube/${name} → itag=${chosen.itag} ${chosen.bitrate}bps`);
        return { audioUrl: chosen.url, title: ytTitle };
      } catch (e) {
        const r = e instanceof Error && e.name === 'AbortError' ? 'timeout' : String(e);
        console.warn(`${TAG} ✗ YouTube/${name} ERROR: ${r} (${Date.now() - t0}ms)`);
        return null;
      } finally { clearTimeout(tid); }
    };

    // 6 clientes YouTube en paralelo — versiones actualizadas 2025
    const ytTasks = [
      // ANDROID_TESTSUITE — cliente de pruebas, frecuentemente retorna streams sin cifrar
      () => tryYtClient('ANDROID_TEST', 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8', 'ANDROID_TESTSUITE', '1.9',
        { androidSdkVersion: 30 },
        { 'User-Agent': 'com.google.android.youtube/1.9 (Linux; U; Android 11) gzip', 'X-YouTube-Client-Name': '30' }),
      // ANDROID — app oficial YouTube
      () => tryYtClient('ANDROID', 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8', 'ANDROID', '19.29.34',
        { androidSdkVersion: 34 },
        { 'User-Agent': 'com.google.android.youtube/19.29.34 (Linux; U; Android 14) gzip', 'X-YouTube-Client-Name': '3' }),
      // IOS — cliente iOS de YouTube
      () => tryYtClient('IOS', 'AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc', 'IOS', '19.29.1',
        { deviceMake: 'Apple', deviceModel: 'iPhone16,2', osName: 'iPhone', osVersion: '17.5.1.21F90' },
        { 'User-Agent': 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X)', 'X-YouTube-Client-Name': '5' }),
      // TV_SIMPLY_EMBEDDED — cliente TV embebido, sin restricciones de cifrado frecuentemente
      () => tryYtClient('TV_EMBEDDED', 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8', 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', '2.0',
        {}, { 'X-YouTube-Client-Name': '85' }),
      // TV — cliente para Smart TV
      () => tryYtClient('TV', 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8', 'TVHTML5', '7.20220325',
        {}, { 'X-YouTube-Client-Name': '7' }),
      // ANDROID_MUSIC — app YouTube Music
      () => tryYtClient('MUSIC', 'AIzaSyC9XL3ZjWddXya6X74dJoCTL-NKMD3G5eQ', 'ANDROID_MUSIC', '5.28.1',
        { androidSdkVersion: 30 },
        { 'User-Agent': 'com.google.android.apps.youtube.music/5.28.1 (Linux; U; Android 11) gzip', 'X-YouTube-Client-Name': '21' }),
    ];

    const pickAudio = (formats: InvFmt[], source: string): string | null => {
      const valid = formats.filter(f => f.url && (f.type?.startsWith('audio/') || f.container));
      console.log(`${TAG} formatos de audio en ${source}: ${valid.length}`);
      valid.forEach(f => console.log(`  · ${f.container ?? f.type} ${f.bitrate ?? '?'}bps`));
      const m4a = valid.find(f => f.container === 'm4a' || f.type?.includes('audio/mp4'));
      const chosen = m4a ?? valid.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
      if (chosen?.url) console.log(`${TAG} formato elegido: ${chosen.container ?? chosen.type}`);
      return chosen?.url ?? null;
    };

    // ── Título desde YouTube oEmbed (oficial, muy confiable) ──────────────
    const getTitle = async (): Promise<string> => {
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
          { headers: { Accept: 'application/json' } },
        );
        if (!res.ok) return `yt_${videoId}`;
        const d = await res.json();
        if (d.title) console.log(`${TAG} título oEmbed: "${d.title}"`);
        return d.title ?? `yt_${videoId}`;
      } catch { return `yt_${videoId}`; }
    };

    // ── M2: cobalt.tools — formato corregido, múltiples variantes ────────
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const tryCobaltInstance = async (
      endpoint: string,
      body: Record<string, unknown>,
      label: string,
    ): Promise<Hit | null> => {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), 15000);
      const t0 = Date.now();
      try {
        console.log(`${TAG} → ${label}`);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          console.warn(`${TAG} ✗ ${label} HTTP ${res.status} (${Date.now() - t0}ms)`);
          return null;
        }
        const d = await res.json();
        console.log(`${TAG} ${label} status="${d.status}" (${Date.now() - t0}ms)`);
        const url = d.url ?? d.audio ?? null;
        if (url && ['redirect', 'tunnel', 'stream'].includes(d.status ?? '')) {
          console.log(`${TAG} ✓ ${label} OK`);
          return { audioUrl: url, title: `yt_${videoId}` };
        }
        console.warn(`${TAG} ✗ ${label}: sin URL (status=${d.status}, error=${d.error?.code})`);
        return null;
      } catch (e) {
        const r = e instanceof Error && e.name === 'AbortError' ? 'timeout' : String(e);
        console.warn(`${TAG} ✗ ${label} ERROR: ${r} (${Date.now() - t0}ms)`);
        return null;
      } finally { clearTimeout(id); }
    };

    const cobaltTasks = [
      // Solo URL — request mínimo
      () => tryCobaltInstance('https://api.cobalt.tools/', { url: ytUrl }, 'cobalt/v10-minimal'),
      // Modo audio explícito con mp3 (el más compatible entre versiones de cobalt)
      () => tryCobaltInstance('https://api.cobalt.tools/', { url: ytUrl, downloadMode: 'audio', audioFormat: 'mp3', audioBitrate: '128' }, 'cobalt/v10-mp3'),
      // Instancia comunitaria alternativa
      () => tryCobaltInstance('https://cobalt.tools/', { url: ytUrl, downloadMode: 'audio' }, 'cobalt/main-audio'),
    ];

    // ── M0: Cloudflare Worker (proxy propio — más confiable que acceso directo) ─
    const tryWorker = async (): Promise<Hit | null> => {
      if (!AUDIVOX_WORKER_URL) return null;
      const d = await fetchJson<PipedData>(`${AUDIVOX_WORKER_URL}/${videoId}`, 'CF-Worker');
      if (!d || d.error || !d.audioStreams?.length) return null;
      const m4a = d.audioStreams.find(s => s.mimeType?.includes('audio/mp4'));
      const chosen = m4a ?? [...d.audioStreams].sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
      return chosen?.url ? { audioUrl: chosen.url, title: d.title ?? `yt_${videoId}` } : null;
    };
    const workerTasks = AUDIVOX_WORKER_URL ? [tryWorker] : [];

    // ── M3: Piped — frontend alternativo de YouTube con buena disponibilidad ─
    const tryPiped = async (baseUrl: string): Promise<Hit | null> => {
      const host = baseUrl.replace('https://', '');
      const d = await fetchJson<PipedData>(`${baseUrl}/streams/${videoId}`, `Piped(${host})`);
      if (!d || d.error || !d.audioStreams?.length) return null;
      const m4a = d.audioStreams.find(s => s.mimeType?.includes('audio/mp4'));
      const chosen = m4a ?? [...d.audioStreams].sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
      return chosen?.url ? { audioUrl: chosen.url, title: d.title ?? `yt_${videoId}` } : null;
    };
    const pipedTasks = PIPED.map(inst => () => tryPiped(inst));

    // ── M4: Invidious ──────────────────────────────────────────────────────
    const invTasks = INV.map(inst => async (): Promise<Hit | null> => {
      const host = inst.replace('https://', '');
      const d = await fetchJson<InvData>(
        `${inst}/api/v1/videos/${videoId}?fields=title,adaptiveFormats`,
        `Invidious(${host})`,
      );
      const url = d ? pickAudio(d.adaptiveFormats ?? [], host) : null;
      return url ? { audioUrl: url, title: d?.title ?? `yt_${videoId}` } : null;
    });

    onProgress?.(6);

    console.log(
      `${TAG} videoId=${videoId} → ${workerTasks.length} Worker + ${ytTasks.length} YT-clientes + ${cobaltTasks.length} cobalt + ${pipedTasks.length} Piped + ${INV.length} Invidious`,
    );
    const raceStart = Date.now();

    // Todos los métodos al mismo tiempo — gana el primero
    const [title, hit] = await Promise.all([
      getTitle(),
      raceFirst([...workerTasks, ...ytTasks, ...cobaltTasks, ...pipedTasks, ...invTasks]),
    ]);

    if (!hit) {
      console.error(`${TAG} TODOS los servidores fallaron tras ${Date.now() - raceStart}ms`);
      throw new Error(
        'No se pudo obtener el audio del video.\n' +
        'Todos los servidores de extracción están caídos en este momento.\n' +
        'Intenta de nuevo en unos minutos.',
      );
    }

    // Usa el título de oEmbed si lo tenemos (más preciso que el de Invidious/Piped)
    const finalTitle = (title && title !== `yt_${videoId}`) ? title : hit.title;

    console.log(`${TAG} ✓ audio obtenido en ${Date.now() - raceStart}ms`);
    console.log(`${TAG} título: "${finalTitle}"`);
    console.log(`${TAG} URL: ${hit.audioUrl.slice(0, 90)}...`);
    onProgress?.(10);

    console.log(`${TAG} iniciando descarga del archivo...`);
    const result = await localMediaService.downloadRemoteAudio(
      hit.audioUrl,
      finalTitle,
      'm4a',
      undefined,
      p => {
        onProgress?.(10 + Math.floor(p * 0.88));
        if (p % 20 === 0) console.log(`${TAG} descarga: ${p}%`);
      },
    );

    console.log(`${TAG} ✅ descarga completa → ${result.fileName} (${result.sizeLabel})`);
    return { ...result, title: finalTitle };
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
