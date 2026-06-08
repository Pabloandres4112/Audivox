export const BLOCKED_HOST_KEYWORDS = [
  'pornhub',
  'xvideos',
  'xnxx',
  'redtube',
  'youporn',
  'tube8',
  'spankbang',
  'xhamster',
  'chaturbate',
  'onlyfans',
  'faphouse',
  'brazzers',
  'bangbros',
  'realitykings',
  'mofos',
  'naughtyamerica',
  'thepiratebay',
  'pirateproxy',
  '1337x.to',
  'rarbg',
  'kickasstorrents',
  'popads.net',
  'popcash.net',
  'propellerads.com',
  'adsterra.com',
  'trafficjunky',
  'juicyads',
  'exoclick',
  'ero-advertising',
  'plugrush',
  'trafficforce',
  'contentabc',
  'clickadu',
  'revcontent',
  'mgid.com',
  'zergnet',
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'adnxs.com',
];

export const WEBVIEW_ALLOWED_HOSTS = ['y2mate.nu', 'www.y2mate.nu', 'v3.y2mate.nu'];

export const WEBVIEW_CSP = [
  "default-src 'self' https: data: blob:;",
  "base-uri 'none';",
  "connect-src https://*.y2mate.nu https://y2mate.nu;",
  "frame-src https://*.y2mate.nu https://y2mate.nu;",
  "img-src 'self' https: data: blob:;",
  "media-src https: blob:;",
  "script-src 'self' https: 'unsafe-inline';",
  "style-src 'self' https: 'unsafe-inline';",
].join(' ');

const parseUrl = (value: string) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

export const isBlockedHostname = (hostname: string) => {
  const normalized = hostname.toLowerCase();
  return BLOCKED_HOST_KEYWORDS.some(keyword => normalized.includes(keyword));
};

export const isAllowedWebViewRequest = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (/^(about:|data:|blob:)/.test(normalized)) return true;
  const parsed = parseUrl(value);
  if (!parsed || parsed.protocol !== 'https:') return false;
  if (isBlockedHostname(parsed.hostname)) return false;
  return WEBVIEW_ALLOWED_HOSTS.some(
    host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
  );
};

export const assertAllowedRemoteUrl = (value: string) => {
  const parsed = parseUrl(value);
  if (!parsed || parsed.protocol !== 'https:') {
    throw new Error('La URL remota debe usar HTTPS.');
  }
  if (isBlockedHostname(parsed.hostname)) {
    throw new Error('La URL remota pertenece a un dominio bloqueado por la politica de seguridad.');
  }
  return parsed;
};
