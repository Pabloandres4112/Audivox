import { ExternalDownloadFormat } from '../store/useAppStore';

const AUDIUS_API_BASE = 'https://api.audius.co/v1';
const AUDIUS_APP_NAME = 'Audivox';

const AUDIO_FORMATS: ExternalDownloadFormat[] = ['mp3', 'm4a', 'wav'];

const normalizeFormat = (raw?: string | null): ExternalDownloadFormat => {
  const ext = (raw ?? '').toLowerCase().replace('.', '');
  if (AUDIO_FORMATS.includes(ext as ExternalDownloadFormat)) {
    return ext as ExternalDownloadFormat;
  }
  return 'mp3';
};

const pickArtwork = (artwork?: Record<string, string> | null) => {
  if (!artwork) return undefined;
  return artwork['480x480'] ?? artwork['150x150'] ?? artwork['1000x1000'];
};

export type AudiusTrackResult = {
  id: string;
  title: string;
  artistName: string;
  artworkUrl?: string;
  duration: number;
  genre?: string;
  streamUrl: string;
  originalFileName?: string;
  format: ExternalDownloadFormat;
  isDownloadable: boolean;
};

type RawTrack = {
  id?: string;
  track_id?: number;
  title?: string;
  duration?: number;
  genre?: string;
  is_streamable?: boolean;
  is_downloadable?: boolean;
  orig_filename?: string;
  artwork?: Record<string, string> | null;
  stream?: { url?: string | null } | null;
  user?: { name?: string } | null;
};

type AudiusListResponse = { data?: RawTrack[] };

const mapTrack = (track: RawTrack): AudiusTrackResult => ({
  id: String(track.id ?? track.track_id ?? track.title ?? Math.random()),
  title: track.title ?? 'Sin título',
  artistName: track.user?.name ?? 'Artista desconocido',
  artworkUrl: pickArtwork(track.artwork),
  duration: track.duration ?? 0,
  genre: track.genre ?? undefined,
  streamUrl: track.stream?.url ?? '',
  originalFileName: track.orig_filename ?? undefined,
  format: normalizeFormat(track.orig_filename?.split('.').pop()),
  isDownloadable: Boolean(track.is_downloadable),
});

export const audiusService = {
  // Buscar pistas por nombre o artista
  async searchTracks(query: string, limit = 8): Promise<AudiusTrackResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const params = new URLSearchParams({
      query: cleanQuery,
      limit: String(limit),
      app_name: AUDIUS_APP_NAME,
    });

    const res = await fetch(`${AUDIUS_API_BASE}/tracks/search?${params.toString()}`);
    if (!res.ok) throw new Error(`Audius no respondió (HTTP ${res.status}).`);

    const payload = (await res.json()) as AudiusListResponse;
    return (payload.data ?? [])
      .filter(t => t.is_streamable && t.is_downloadable && t.stream?.url && t.title)
      .map(mapTrack);
  },

  // Top tendencias globales (o por género)
  async getTrending(limit = 10, genre?: string): Promise<AudiusTrackResult[]> {
    const params = new URLSearchParams({
      limit: String(limit),
      app_name: AUDIUS_APP_NAME,
    });
    if (genre) params.set('genre', genre);

    const res = await fetch(`${AUDIUS_API_BASE}/tracks/trending?${params.toString()}`);
    if (!res.ok) throw new Error(`Audius trending no disponible (HTTP ${res.status}).`);

    const payload = (await res.json()) as AudiusListResponse;
    return (payload.data ?? [])
      .filter(t => t.is_streamable && t.stream?.url && t.title)
      .slice(0, limit)
      .map(mapTrack);
  },
};
