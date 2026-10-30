import { I18N } from './i18n.js';

/* Where the backend is. By default the page's own address: the UI server forwards /api to the backend
   (see vite.config.js). Set FOUNDRY_API_BASE in .env to call a backend directly instead. */
const clean = (v) => String(v).replace(/\/+$/, '');
export let API_BASE = clean(window.FOUNDRY_API_BASE || location.origin);
/* The config server may supply the address (see remote.js); importers see the new value (ES live binding). */
export function setApiBase(v) { API_BASE = clean(v); }

/* Several gyms: while the switch is on and a gym is chosen, the pages that belong to one gym ask for that gym. */
const gymCtx = { multi: false, id: null };
export function setGymCtx(multi, id) { gymCtx.multi = !!multi; gymCtx.id = id == null ? null : id; }
const SCOPED = /^\/api\/(plans|classes|sessions|closed-days|promos|admin\/(promos|classes|closed-days|closed-periods|attendance|analytics|marketing\/status))(\/|\?|$)/;
function scoped(path) {
  if (!gymCtx.multi || gymCtx.id == null || !SCOPED.test(path) || /[?&]gymId=/.test(path)) return path;
  return path + (path.indexOf('?') < 0 ? '?' : '&') + 'gymId=' + gymCtx.id;
}

export async function api(method, path, body) {
  path = scoped(path);
  const opt = { method, credentials: 'include', headers: { Accept: 'application/json' } };
  if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const res = await fetch(API_BASE + path, opt);
  const txt = res.status === 204 ? '' : await res.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch (e) { /* not JSON */ }
  if (!res.ok) {
    const err = new Error((data && data.message) || ('Request failed (' + res.status + ').'));
    err.status = res.status;
    if (data && data.message) err.message = I18N.server(data.message);
    throw err;
  }
  return data;
}

export const normPlan = (p) => ({ id: p.id, name: p.name, price: Number(p.price), visits: p.visitsPerMonth, unlimited: !!p.unlimited, gymId: p.gymId == null ? '' : p.gymId });
export const normClass = (c) => ({
  id: c.id, name: c.name, coach: c.coach || '', time: c.startTime, duration: c.durationMinutes,
  capacity: c.capacity, days: c.days.slice().sort((a, b) => a - b),
});
export const planBody = (p) => ({ gymId: p.gymId === '' || p.gymId == null ? null : Number(p.gymId), name: p.name, price: p.price, visitsPerMonth: p.unlimited ? 0 : p.visits, unlimited: !!p.unlimited });
export const classBody = (c) => ({
  name: c.name, coach: c.coach, startTime: c.time, durationMinutes: c.duration, capacity: c.capacity, days: c.days,
});

/* Home page items. sortOrder is the position in the list. */
export const normPromo = (p, i) => ({
  id: p.id, kind: p.kind, title: p.title || '', body: p.body || '', image: p.image || '', link: p.linkUrl || '', content: p.content || '', hideOn: p.hideOn || '', colSpan: p.colSpan || 0, rowSpan: p.rowSpan || 0, bgColor: p.bgColor || '', bgImage: p.bgImage || '', gymId: p.gymId == null ? '' : p.gymId, marketing: !!p.marketing, marketingSentAt: p.marketingSentAt || '', marketingRecipients: p.marketingRecipients || 0,
  active: p.active !== false, bordered: p.bordered !== false, showTitle: p.titleVisible !== false, sortOrder: typeof i === 'number' ? i : p.sortOrder,
});
export const promoBody = (p) => ({
  gymId: p.gymId === '' || p.gymId == null ? null : Number(p.gymId), kind: p.kind, title: p.title, body: p.body, image: p.image, linkUrl: p.link, content: p.kind === 'CARD' ? p.content : '', hideOn: p.hideOn || null, colSpan: p.colSpan || 0, rowSpan: p.rowSpan || 0, bgColor: /^#[0-9a-f]{6}$/i.test(p.bgColor) ? p.bgColor : '', bgImage: p.bgImage || '', marketing: !!p.marketing, sortOrder: p.sortOrder, active: p.active, bordered: p.bordered, titleVisible: p.showTitle,
});

