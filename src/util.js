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

/* Only web addresses and uploaded images are ever put into links or <img>, never javascript: and the like. */
import DOMPurify from 'dompurify';

/* Card text is HTML typed by the admin. It is cleaned before it is shown: no scripts, styles, forms or frames,
   no event handlers, and links open in a new tab. */
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') { node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener noreferrer'); }
});
export const cleanHtml = (html) => DOMPurify.sanitize(String(html || ''), {
  FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed', 'link', 'meta'],
  FORBID_ATTR: ['style'],
});

/* An Instagram post, reel or video address -> the part we can embed, or null */
export function instagramRef(u) {
  const m = /^https:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9._]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i.exec(u || '');
  return m ? { type: m[1].toLowerCase() === 'reels' ? 'reel' : m[1].toLowerCase(), code: m[2] } : null;
}

/* Shown on the home page: switched on and not past its hide-on date (hidden from that date on) */
export const isLive = (p) => p.active && (!p.hideOn || p.hideOn > TODAY_K);
export const addDaysKey = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return key(d); };

export const safeLink = (u) => (/^https?:\/\/\S+$/i.test(u || '') ? u : '');
export const safeImage = (u) => (/^(https?:\/\/\S+|data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+)$/i.test(u || '') ? u : '');

/* Reads a picked image file and shrinks it (longest side 1000 px, JPEG) so it stays small in the database. */
export function fileToDataUrl(file, maxSide = 1000) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('not an image')); };
    img.src = url;
  });
}


/* Sundays are always closed */
export const isSundayKey = (k) => parseKey(k).getDay() === 0;
