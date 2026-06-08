const CONTROL_CHARS_RE = new RegExp('[\\u0000-\\u001F\\u007F]', 'g');
const MULTI_SPACE_RE = /\s+/g;
const SAFE_TEXT_RE = /[^a-zA-ZÀ-ÿ0-9@._\- ']/g;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const normalizeText = (value: string, maxLength: number) =>
  value
    .replace(CONTROL_CHARS_RE, ' ')
    .replace(MULTI_SPACE_RE, ' ')
    .trim()
    .slice(0, maxLength);

export const sanitizeDisplayText = (value: string, maxLength = 120) =>
  normalizeText(value, maxLength);

export const sanitizeNameInput = (value: string, fallback = 'Listener') => {
  const sanitized = normalizeText(value, 60).replace(SAFE_TEXT_RE, '');
  return sanitized || fallback;
};

export const sanitizeEmailInput = (value: string) =>
  normalizeText(value.toLowerCase(), 120);

export const isValidEmail = (value: string) => !value || EMAIL_RE.test(value);

export const normalizeSearchQuery = (value: string, minLength = 2) => {
  const sanitized = normalizeText(value, 80);
  return sanitized.length >= minLength ? sanitized : '';
};

export const normalizeNetworkLimit = (
  value: number,
  fallback: number,
  min = 1,
  max = 50,
) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
};
