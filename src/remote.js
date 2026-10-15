/* Settings that come from the config server (public ones only, no login). */
import { setApiBase } from './api.js';
import { I18N } from './i18n.js';

/* Defaults, used when the config server is not running or a setting is empty. */
export const cfg = { brand: 'Gym', currency: '€', banner: '', footer: '', loaded: false };

/* The page asks its own server for the settings (/_config/ui). That server holds the client secret, gets a token from the
   config server and reads the settings with it, so the browser never has to be trusted with a credential.
   Set window.FOUNDRY_CONFIG_URL = '' in config.js to switch this off. */
const configured = window.FOUNDRY_CONFIG_URL;
export const CONFIG_URL = configured === '' ? '' : '/_config/ui';

export function applyTitle() {
  I18N.setBrand(cfg.brand);
}

export async function loadRemoteConfig() {
  if (!CONFIG_URL) return false;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 2500);
  try {
    const res = await fetch(CONFIG_URL, { headers: { Accept: 'application/json' }, signal: ctl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const p = (await res.json()).properties || {};
    if (p['brand.name'] && String(p['brand.name']).trim()) cfg.brand = String(p['brand.name']).trim();
    if (p['currency.symbol'] && String(p['currency.symbol']).trim()) cfg.currency = String(p['currency.symbol']).trim();
    cfg.banner = p['banner.text'] || '';
    cfg.footer = p['footer.text'] || '';
    // An address set by hand in config.js wins over the one in the config server.
    // A localhost address means the visitor's own machine, so it is ignored when the page is opened from another host.
    const base = p['api.base'];
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(base || '');
    const pageLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname);
    if (!window.FOUNDRY_API_BASE && base && (!isLocal || pageLocal)) setApiBase(base);
    cfg.loaded = true;
    applyTitle();
    return true;
  } catch (e) {
    console.warn('Config server not available, using built-in defaults:', e && e.message);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
