import { normalizeNetworkLimit, normalizeSearchQuery } from '../security/inputValidation';
import { assertAllowedRemoteUrl } from '../security/networkPolicy';

// Deezer API pública — sin API key, sin registro.
// Docs: https://developers.deezer.com/api
// Uso personal y desarrollo. No publicar app comercial sin revisar ToS.

const BASE = 'https://api.deezer.com';

export type DeezerTrack = {
  id: number;
  title: string;
  duration: number;           // segundos
  preview: string;            // URL directa de 30s MP3 — siempre disponible gratis
  artist: { id: number; name: string; picture_small?: string };
  album: {
    id: number;
    title: string;
    cover_small?: string;
    cover_medium?: string;
  };
};

export type DeezerGenreEntry = {
  id: number;
  name: string;
  icon: string;
};

// Géneros Deezer verificados con sus IDs reales
export const DEEZER_GENRES: DeezerGenreEntry[] = [
  { id: 0,   name: 'Top Global',  icon: 'trending-up-outline' },
  { id: 132, name: 'Pop',         icon: 'musical-notes-outline' },
  { id: 152, name: 'Rock',        icon: 'flash-outline' },
  { id: 116, name: 'Hip-Hop',     icon: 'mic-outline' },
  { id: 106, name: 'Electrónica', icon: 'radio-outline' },
  { id: 165, name: 'R&B / Soul',  icon: 'heart-outline' },
  { id: 466, name: 'Reggaeton',   icon: 'sunny-outline' },
  { id: 144, name: 'Latin',       icon: 'earth-outline' },
  { id: 129, name: 'Jazz',        icon: 'cafe-outline' },
];

const safeFetch = async <T>(url: string): Promise<T | null> => {
  try {
    assertAllowedRemoteUrl(url);
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.error) return null;
    return json as T;
  } catch {
    return null;
  }
};

const validTrack = (t: DeezerTrack) =>
  t.id && t.title?.trim() && t.preview && t.artist?.name;

export const deezerService = {
  // Búsqueda de pistas — devuelve metadata rica + URL de preview de 30s
  async searchTracks(query: string, limit = 25): Promise<DeezerTrack[]> {
    const safeQuery = normalizeSearchQuery(query);
    if (!safeQuery) return [];
    const safeLimit = normalizeNetworkLimit(limit, 25);
    const data = await safeFetch<{ data?: DeezerTrack[] }>(
      `${BASE}/search?q=${encodeURIComponent(safeQuery)}&limit=${safeLimit}`,
    );
    if (!data?.data) throw new Error('No se obtuvieron resultados de Deezer.');
    return data.data.filter(validTrack);
  },

  // Chart global o por género (genreId = 0 → top global)
  async getChart(genreId = 0, limit = 25): Promise<DeezerTrack[]> {
    const safeLimit = normalizeNetworkLimit(limit, 25);
    const data = await safeFetch<{ data?: DeezerTrack[] }>(
      `${BASE}/chart/${genreId}/tracks?limit=${safeLimit}`,
    );
    return (data?.data ?? []).filter(validTrack);
  },
};
