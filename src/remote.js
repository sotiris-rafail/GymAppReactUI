/* Settings that come from the Foundry config server (public ones only, no login). */
import { setApiBase } from './api.js';

/* Defaults, used when the config server is not running or a setting is empty. */
export const cfg = { brand: 'Foundry', currency: '€', banner: '', footer: '', loaded: false };

/* Where the config server is. Set window.FOUNDRY_CONFIG_URL = '' in config.js to switch this off. */
const configured = window.FOUNDRY_CONFIG_URL;
export const CONFIG_URL = configured === '' ? '' : String(
  configured || (location.protocol + '//' + (location.hostname || 'localhost') + ':8888')
).replace(/\/+$/, '');

export function applyTitle() {
  document.title = document.title.replace(/^Foundry/, cfg.brand);
}

export async function loadRemoteConfig() {
  if (!CONFIG_URL) return false;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 2500);
  try {
    const res = await fetch(CONFIG_URL + '/public/config/ui', { headers: { Accept: 'application/json' }, signal: ctl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const p = (await res.json()).properties || {};
    if (p['brand.name']) cfg.brand = p['brand.name'];
    if (p['currency.symbol']) cfg.currency = p['currency.symbol'];
    cfg.banner = p['banner.text'] || '';
    cfg.footer = p['footer.text'] || '';
    // An address set by hand in config.js wins over the one in the config server.
    if (!window.FOUNDRY_API_BASE && p['api.base']) setApiBase(p['api.base']);
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
