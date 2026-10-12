import { I18N } from './i18n.js';
import { cfg } from './remote.js';

export const DEMO = {
  MEMBER: { email: 'alex@demo.gym', password: 'member123' },
  ADMIN: { email: 'admin@foundry.gym', password: 'admin123' },
};

export const p2 = (n) => String(n).padStart(2, '0');
export const key = (d) => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
export const parseKey = (k) => { const a = k.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); };
export const isoDay = (d) => d.getDay() || 7;
export function startOf(k, t) {
  const d = parseKey(k);
  const a = String(t || '00:00').split(':').map(Number);
  d.setHours(a[0] || 0, a[1] || 0, 0, 0);
  return d;
}
export const money = (n) => cfg.currency + (Number.isInteger(n) ? n : Number(n).toFixed(2));
export const label = (k) => { const d = parseKey(k); return I18N.dayFull(isoDay(d) - 1) + ' ' + d.getDate() + ' ' + I18N.monthOf(d.getMonth()); };
export const shortLabel = (k) => { const d = parseKey(k); return I18N.day(isoDay(d) - 1) + ' ' + d.getDate() + ' ' + I18N.monthShort(d.getMonth()); };
export const toneOf = (left, cap) => (left <= 0 ? 'bad' : (left <= 2 || left / cap <= 0.25) ? 'warn' : 'ok');
export const dayNames = () => [0, 1, 2, 3, 4, 5, 6].map((i) => I18N.day(i));
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const fmtDate = (iso) => new Date(iso).toLocaleDateString(I18N.lang === 'el' ? 'el-GR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const monthLabel = (k) => { const a = k.split('-'); return I18N.month(Number(a[1]) - 1) + ' ' + a[0]; };

export const TODAY = new Date();
export const TODAY_K = key(TODAY);

export function themeNow() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t) return t;
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; }
}
export function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('foundry.theme', t); } catch (e) { /* storage may be blocked */ }
}

/* A translation that has a slot for a React element: tSlot('signedInAs', {}, 'name', <b>..</b>) */
export function tSlot(k, params, slot, node) {
  const marker = '\u0000';
  const parts = I18N.t(k, { ...params, [slot]: marker }).split(marker);
  return [parts[0], node, parts.slice(1).join(marker)];
}
