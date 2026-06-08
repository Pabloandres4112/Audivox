import { ExternalDownloadFormat } from '../store/useAppStore';
import { normalizeNetworkLimit, normalizeSearchQuery } from '../security/inputValidation';
import { assertAllowedRemoteUrl } from '../security/networkPolicy';

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

// Construye el URL de stream directo de Audius.
// Si la respuesta ya trae stream.url (CDN directo), lo usa; si no, construye
// el endpoint oficial que redirige (302) al CDN correcto.
const buildStreamUrl = (track: RawTrack): string => {
  if (track.stream?.url) return track.stream.url;
  const rawId = track.id ?? String(track.track_id ?? '');
  if (!rawId) return '';
  return `${AUDIUS_API_BASE}/tracks/${rawId}/stream?app_name=${AUDIUS_APP_NAME}`;
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
  id: String(track.id ?? track.track_id ?? ''),
  title: track.title ?? 'Sin título',
  artistName: track.user?.name ?? 'Artista desconocido',
  artworkUrl: pickArtwork(track.artwork),
  duration: track.duration ?? 0,
  genre: track.genre ?? undefined,
  streamUrl: buildStreamUrl(track),
  originalFileName: track.orig_filename ?? undefined,
  format: normalizeFormat(track.orig_filename?.split('.').pop()),
  isDownloadable: Boolean(track.is_downloadable),
});

// Tracks con ID y title válidos + streamable. No exigir is_downloadable
// (hay tracks legítimos que son streamable pero no descargables).
const isValidTrack = (t: RawTrack) =>
  t.is_streamable &&
  (t.id || t.track_id) &&
  t.title &&
  t.title.trim().length > 0;

export const audiusService = {
  // Buscar pistas por nombre o artista
  async searchTracks(query: string, limit = 20): Promise<AudiusTrackResult[]> {
    const cleanQuery = normalizeSearchQuery(query);
    if (!cleanQuery) return [];
    const safeLimit = normalizeNetworkLimit(limit, 20);

    const params = new URLSearchParams({
      query: cleanQuery,
      limit: String(safeLimit),
      app_name: AUDIUS_APP_NAME,
    });

    const endpoint = `${AUDIUS_API_BASE}/tracks/search?${params.toString()}`;
    assertAllowedRemoteUrl(endpoint);
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`Audius no respondió (HTTP ${res.status}).`);

    const payload = (await res.json()) as AudiusListResponse;
    return (payload.data ?? [])
      .filter(isValidTrack)
      .slice(0, safeLimit)
      .map(mapTrack)
      .filter(t => t.id && t.streamUrl);
  },

  // Top tendencias globales (o por género)
  async getTrending(limit = 15, genre?: string): Promise<AudiusTrackResult[]> {
    const safeLimit = normalizeNetworkLimit(limit, 15);
    const params = new URLSearchParams({
      limit: String(safeLimit),
      app_name: AUDIUS_APP_NAME,
    });
    if (genre) {
      const safeGenre = normalizeSearchQuery(genre, 1);
      if (safeGenre) params.set('genre', safeGenre);
    }

    const endpoint = `${AUDIUS_API_BASE}/tracks/trending?${params.toString()}`;
    assertAllowedRemoteUrl(endpoint);
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`Audius trending no disponible (HTTP ${res.status}).`);

    const payload = (await res.json()) as AudiusListResponse;
    return (payload.data ?? [])
      .filter(isValidTrack)
      .slice(0, safeLimit)
      .map(mapTrack)
      .filter(t => t.id && t.streamUrl);
  },
};
