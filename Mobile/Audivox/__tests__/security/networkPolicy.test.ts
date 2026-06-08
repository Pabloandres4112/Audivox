import {
  assertAllowedRemoteUrl,
  isAllowedWebViewRequest,
  isBlockedHostname,
} from '../../src/security/networkPolicy';

describe('networkPolicy', () => {
  it('blocks known ad hosts', () => {
    expect(isBlockedHostname('ads.doubleclick.net')).toBe(true);
    expect(isBlockedHostname('api.deezer.com')).toBe(false);
  });

  it('allows only trusted https webview requests', () => {
    expect(isAllowedWebViewRequest('https://v3.y2mate.nu/es/')).toBe(true);
    expect(isAllowedWebViewRequest('https://ads.doubleclick.net/banner')).toBe(false);
    expect(isAllowedWebViewRequest('http://v3.y2mate.nu/es/')).toBe(false);
  });

  it('rejects unsafe remote urls', () => {
    expect(() => assertAllowedRemoteUrl('https://api.deezer.com/chart')).not.toThrow();
    expect(() => assertAllowedRemoteUrl('http://api.deezer.com/chart')).toThrow();
  });
});
