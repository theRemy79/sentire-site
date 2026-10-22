const HTTPS = value => {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || ['localhost','127.0.0.1','[::1]'].includes(url.hostname)) throw Error('Public links must be HTTPS URLs without credentials, query strings, or fragments.');
  return url.href;
};
export function configuration(raw, {local = false} = {}) {
  const originURL = HTTPS(raw.origin);
  if (originURL && new URL(originURL).pathname !== '/') throw Error('origin must not contain a path.');
  const origin = originURL ? new URL(originURL).origin : '';
  const checkoutUrl = HTTPS(raw.checkoutUrl);
  const linuxDownloadUrl = HTTPS(raw.linuxDownloadUrl);
  const windowsDownloadUrl = HTTPS(raw.windowsDownloadUrl);
  if (checkoutUrl && !origin) throw Error('Configure the real site origin before enabling checkout.');
  return {origin, price: 29, currency: 'USD', checkoutMode: local ? 'local-test' : checkoutUrl ? 'live' : 'upcoming',
    checkoutUrl: local ? '/checkout' : checkoutUrl, linuxDownloadUrl, windowsDownloadUrl};
}
