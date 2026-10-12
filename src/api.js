import { I18N } from './i18n.js';

/* Where the Spring Boot backend lives. Set window.FOUNDRY_API_BASE in public/config.js to change it. */
const clean = (v) => String(v).replace(/\/+$/, '');
export let API_BASE = clean(window.FOUNDRY_API_BASE || (location.protocol + '//' + (location.hostname || 'localhost') + ':8080'));
/* The config server may supply the address (see remote.js); importers see the new value (ES live binding). */
export function setApiBase(v) { API_BASE = clean(v); }

export async function api(method, path, body) {
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

export const normPlan = (p) => ({ id: p.id, name: p.name, price: Number(p.price), visits: p.visitsPerMonth });
export const normClass = (c) => ({
  id: c.id, name: c.name, coach: c.coach || '', time: c.startTime, duration: c.durationMinutes,
  capacity: c.capacity, days: c.days.slice().sort((a, b) => a - b),
});
export const planBody = (p) => ({ name: p.name, price: p.price, visitsPerMonth: p.visits });
export const classBody = (c) => ({
  name: c.name, coach: c.coach, startTime: c.time, durationMinutes: c.duration, capacity: c.capacity, days: c.days,
});
