/**
 * Audivox – YouTube Audio Proxy Worker
 *
 * Despliega esto GRATIS en Cloudflare Workers:
 *   1. Ve a https://dash.cloudflare.com → Workers & Pages → Create Worker
 *   2. Pega este archivo completo en el editor
 *   3. Clic en "Deploy"
 *   4. Copia la URL (algo como https://audivox-yt.TU-USUARIO.workers.dev)
 *   5. Pega esa URL en src/services/localMediaService.ts → AUDIVOX_WORKER_URL
 *
 * Cómo funciona:
 *   GET https://tu-worker.workers.dev/{videoId}
 *   → prueba varias instancias de Piped desde la red de Cloudflare
 *   → devuelve audioStreams[] con URLs directas de YouTube CDN
 */

/* eslint-env serviceworker */

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.yt',
  'https://pipedapi.adminforge.de',
  'https://piped-api.garudalinux.org',
  'https://pipedapi.darkness.services',
  'https://piped.syncpundit.io',
  'https://pipedapi.leptons.xyz',
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const videoId = url.pathname.split('/').filter(Boolean).pop() ?? '';

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return json({ error: 'videoId inválido' }, 400);
    }

    const errors = [];

    // Prueba todas las instancias en paralelo — gana la primera que responda
    const result = await Promise.any(
      PIPED_INSTANCES.map(async (inst) => {
        const r = await fetch(`${inst}/streams/${videoId}`, {
          headers: { Accept: 'application/json', 'User-Agent': 'Audivox/1.0' },
          signal: self.AbortSignal?.timeout?.(8000),
        });
        if (!r.ok) throw new Error(`${inst} HTTP ${r.status}`);
        const data = await r.json();
        if (!data.audioStreams?.length) throw new Error(`${inst} sin streams`);
        return data;
      })
    ).catch((e) => {
      errors.push(e.message ?? String(e));
      return null;
    });

    if (!result) {
      return json({ error: 'Todas las instancias de Piped fallaron', details: errors }, 503);
    }

    return json(result, 200);
  },
};

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
