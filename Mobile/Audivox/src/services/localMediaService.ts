import { PermissionsAndroid, Platform } from 'react-native';
import RNFS, { ReadDirItem } from 'react-native-fs';

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

const DEMO_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnR6f8AAAAASUVORK5CYII=';

export type LocalMediaItem = {
  name: string;
  path: string;
  size: number;
  mtime: number;
};

export const localMediaService = {
  getAudivoxMusicDir: () => `${RNFS.DownloadDirectoryPath}/AudivoxMusic`,

  ensureAudivoxFolder: async () => {
    const path = localMediaService.getAudivoxMusicDir();
    const exists = await RNFS.exists(path);
    if (!exists) {
      await RNFS.mkdir(path);
    }
    return path;
  },

  requestStoragePermissions: async () => {
    if (Platform.OS !== 'android') {
      return { granted: true };
    }

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
      return {
        granted: audioGranted || imagesGranted,
        audioGranted,
        imagesGranted,
      };
    }

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    );
    return {
      granted: result === PermissionsAndroid.RESULTS.GRANTED,
      audioGranted: result === PermissionsAndroid.RESULTS.GRANTED,
      imagesGranted: result === PermissionsAndroid.RESULTS.GRANTED,
    };
  },

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

    return {
      dir,
      audio,
      images,
      scannedAt: Date.now(),
    };
  },

  saveDemoDownloadedFile: async (
    title: string,
    format: 'mp3' | 'm4a' | 'mp4' | 'wav',
    sourceUrl: string,
    thumbnailUrl?: string,
  ) => {
    const dir = await localMediaService.ensureAudivoxFolder();
    const name = sanitizeFilename(title) || `track_${Date.now()}`;
    const audioPath = `${dir}/${name}.${format}`;
    const info = [
      'AUDIVOX DEMO FILE',
      `Title: ${title}`,
      `Format: ${format}`,
      `Source: ${sourceUrl}`,
      `CreatedAt: ${new Date().toISOString()}`,
    ].join('\n');

    await RNFS.writeFile(audioPath, info, 'utf8');

    const coverPath = `${dir}/${name}.jpg`;
    const coverExists = await RNFS.exists(coverPath);
    if (!coverExists) {
      if (thumbnailUrl) {
        try {
          const result = await RNFS.downloadFile({
            fromUrl: thumbnailUrl,
            toFile: coverPath,
          }).promise;

          if (result.statusCode < 200 || result.statusCode >= 300) {
            throw new Error('invalid image status code');
          }
        } catch {
          await RNFS.writeFile(coverPath, DEMO_PNG_BASE64, 'base64');
        }
      } else {
        await RNFS.writeFile(coverPath, DEMO_PNG_BASE64, 'base64');
      }
    }

    return { audioPath, coverPath };
  },
};
