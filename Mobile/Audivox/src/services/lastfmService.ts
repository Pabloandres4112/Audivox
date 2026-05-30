// Last.fm API — metadatos, recomendaciones, biografías, tags de género.
// Requiere API key gratuita: https://www.last.fm/api/account/create (2 minutos)
// NO provee audio — solo información editorial.

// ← Pega aquí tu API key de Last.fm después de registrarte
const LASTFM_API_KEY = '';

const BASE = 'https://ws.audioscrobbler.com/2.0';

export type LastFmTrack = {
  name: string;
  artist: string | { name: string };
  url: string;
  duration?: string;
  image?: { '#text': string; size: 'small' | 'medium' | 'large' | 'extralarge' }[];
};

export type LastFmArtistInfo = {
  name: string;
  bio?: { summary: string; content: string };
  tags?: { tag: { name: string; url: string }[] };
  stats?: { listeners: string; playcount: string };
  image?: { '#text': string; size: string }[];
};

const lfFetch = async <T>(params: Record<string, string>): Promise<T | null> => {
  if (!LASTFM_API_KEY) return null;
  try {
    const qs = new URLSearchParams({ ...params, api_key: LASTFM_API_KEY, format: 'json' });
    const res = await fetch(`${BASE}/?${qs.toString()}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.error) return null;
    return json as T;
  } catch {
    return null;
  }
};

export const lastfmService = {
  isConfigured: () => Boolean(LASTFM_API_KEY),

  // Busca pistas (solo metadatos, sin audio)
  async searchTracks(query: string, limit = 20): Promise<LastFmTrack[]> {
    const data = await lfFetch<{
      results?: { trackmatches?: { track?: LastFmTrack[] } };
    }>({ method: 'track.search', track: query, limit: String(limit) });
    return data?.results?.trackmatches?.track ?? [];
  },

  // Info detallada de artista incluyendo biografía y tags de género
  async getArtistInfo(artist: string): Promise<LastFmArtistInfo | null> {
    const data = await lfFetch<{ artist?: LastFmArtistInfo }>({
      method: 'artist.getInfo',
      artist,
      autocorrect: '1',
    });
    return data?.artist ?? null;
  },

  // Pistas similares a la que se está reproduciendo (para "siguiente recomendado")
  async getSimilarTracks(artist: string, track: string, limit = 10): Promise<LastFmTrack[]> {
    const data = await lfFetch<{ similartracks?: { track?: LastFmTrack[] } }>({
      method: 'track.getSimilar',
      artist,
      track,
      limit: String(limit),
      autocorrect: '1',
    });
    return data?.similartracks?.track ?? [];
  },

  // Top global de Last.fm — alternativa a chart de Deezer
  async getTopTracks(limit = 25): Promise<LastFmTrack[]> {
    const data = await lfFetch<{ tracks?: { track?: LastFmTrack[] } }>({
      method: 'chart.getTopTracks',
      limit: String(limit),
    });
    return data?.tracks?.track ?? [];
  },
};
