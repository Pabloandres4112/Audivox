// Invidious — frontend open-source de YouTube sin Cloudflare.
// Se usa para RESOLVER el audio completo de una canción:
//   Deezer (metadata) + Invidious (stream URL de Google CDN) → SoundPlayer
//
// Estrategia: todos los servidores se consultan EN PARALELO.
// El primero que responda correctamente gana. Si todos fallan → null.

// Instancias activas (mayo 2026). Se eliminaron:
//   inv.riverside.rocks  → cerrado, redirige a trentwiles.com/blog
//   invidious.fdn.fr     → caído
//   yt.artemislena.eu    → caído
//   invidious.slipfox.xyz → caído
const INSTANCES = [
  'https://iv.datura.network',
  'https://vid.puffyan.us',
  'https://invidious.nerdvpn.de',
  'https://invidious.lunar.icu',
  'https://yt.drgnz.club',
  'https://invidious.privacydev.net',
  'https://invidious.protokolla.fi',
  'https://inv.nadeko.net',
  'https://invidious.io',
];

const TIMEOUT_MS = 7000;

const HEADERS = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
};

type InvSearchResult = {
  videoId: string;
  title: string;
  lengthSeconds?: number;
  videoThumbnails?: { url: string; quality: string }[];
};

type InvAdaptiveFormat = {
  url?: string;
  type?: string;
  container?: string;
  bitrate?: number;
};

type InvVideoDetail = {
  adaptiveFormats?: InvAdaptiveFormat[];
};

// Fetch con timeout por instancia
const fetchJson = async <T>(url: string): Promise<T | null> => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    if (!res.ok) return null;
    const json = await res.json();
    // Si la respuesta es HTML (instancia caída/redirigida), descartar
    if (typeof json !== 'object' || json === null) return null;
    return json as T;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
};

// Lanza todas las tareas en PARALELO y devuelve el primer resultado no-null.
// Tiempo total de espera = timeout de 1 instancia (no N × timeout).
const raceFirst = <T>(tasks: Array<() => Promise<T | null>>): Promise<T | null> =>
  new Promise(resolve => {
    if (tasks.length === 0) { resolve(null); return; }
    let remaining = tasks.length;
    let resolved = false;

    tasks.forEach(task =>
      task()
        .then(result => {
          remaining--;
          if (result !== null && !resolved) {
            resolved = true;
            resolve(result);
          } else if (remaining === 0 && !resolved) {
            resolve(null);
          }
        })
        .catch(() => {
          remaining--;
          if (remaining === 0 && !resolved) resolve(null);
        }),
    );
  });

export type ResolvedAudio = {
  videoId: string;
  title: string;
  audioUrl: string;
  durationSec?: number;
  thumbnailUrl?: string;
};

export const invidiousService = {
  // Busca "{query}" en YouTube vía Invidious y devuelve el stream de audio (m4a).
  // Todos los servidores se consultan en paralelo — máximo TIMEOUT_MS de espera.
  // Devuelve null si todos fallan (sin lanzar excepción).
  async resolveAudio(query: string): Promise<ResolvedAudio | null> {
    const encoded = encodeURIComponent(query);

    // Paso 1: buscar el video en todos los servidores en paralelo
    type SearchHit = { instance: string; videoId: string; title: string; durationSec?: number; thumbnailUrl?: string };

    const searchResult = await raceFirst<SearchHit>(
      INSTANCES.map(instance => async () => {
        const results = await fetchJson<InvSearchResult[]>(
          `${instance}/api/v1/search?q=${encoded}&type=video&sort_by=relevance&page=1`,
        );
        if (!results?.length) return null;
        const top = results[0];
        return {
          instance,
          videoId: top.videoId,
          title: top.title,
          durationSec: top.lengthSeconds,
          thumbnailUrl: top.videoThumbnails?.find(t => t.quality === 'medium')?.url,
        };
      }),
    );

    if (!searchResult) return null;

    // Paso 2: obtener streams del video en todos los servidores en paralelo
    type StreamHit = { audioUrl: string };

    const streamResult = await raceFirst<StreamHit>(
      INSTANCES.map(instance => async () => {
        const detail = await fetchJson<InvVideoDetail>(
          `${instance}/api/v1/videos/${searchResult.videoId}?fields=adaptiveFormats`,
        );
        const formats = (detail?.adaptiveFormats ?? []).filter(
          f => f.url && (f.type?.startsWith('audio/') || f.container),
        );
        if (!formats.length) return null;

        // Preferir m4a — máxima compatibilidad con Android MediaPlayer
        const m4a = formats.find(f => f.container === 'm4a' || f.type?.includes('audio/mp4'));
        const chosen = m4a ?? formats.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
        return chosen?.url ? { audioUrl: chosen.url } : null;
      }),
    );

    if (!streamResult) return null;

    return {
      videoId: searchResult.videoId,
      title: searchResult.title,
      audioUrl: streamResult.audioUrl,
      durationSec: searchResult.durationSec,
      thumbnailUrl: searchResult.thumbnailUrl,
    };
  },
};
