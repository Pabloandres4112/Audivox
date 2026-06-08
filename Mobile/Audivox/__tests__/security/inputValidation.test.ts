import {
  isValidEmail,
  normalizeNetworkLimit,
  normalizeSearchQuery,
  sanitizeEmailInput,
  sanitizeNameInput,
} from '../../src/security/inputValidation';

describe('inputValidation', () => {
  it('sanitizes names and removes unsafe characters', () => {
    expect(sanitizeNameInput('  P@blo<script>  ')).toBe('P@bloscript');
  });

  it('normalizes emails and validates format', () => {
    const email = sanitizeEmailInput('  USER@Example.COM ');
    expect(email).toBe('user@example.com');
    expect(isValidEmail(email)).toBe(true);
    expect(isValidEmail('bad@@mail')).toBe(false);
  });

  it('normalizes queries and limits', () => {
    expect(normalizeSearchQuery(' a ', 2)).toBe('');
    expect(normalizeSearchQuery('  hola mundo  ')).toBe('hola mundo');
    expect(normalizeNetworkLimit(999, 20, 1, 50)).toBe(50);
  });
});
