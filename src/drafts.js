/* What changed between the saved data (base) and the admin's draft. Pure functions, no React. */
import { I18N } from './i18n.js';
import { money } from './util.js';

const T = (k, p) => I18N.t(k, p);
const TN = (k, n, p) => I18N.tn(k, n, p);
const daysText = (a) => (a.length ? a.map((d) => I18N.day(d - 1)).join(', ') : T('chg.none'));
const cv = (v) => (v === '' || v == null ? T('chg.empty') : String(v));
const line = (label, from, to) => ({ label, from: String(from), to: String(to) });

export function planChanges(plans, base) {
  const out = [];
  plans.forEach((p) => {
    if (p.isNew) { out.push({ kind: 'add', title: p.name || T('plan.untitled'), lines: [{ text: money(p.price) + ' ' + T('plan.perMonth') + ', ' + TN('plan.visits', p.visits) }] }); return; }
    const b = base.find((x) => x.id === p.id); if (!b) return;
    if (p.removed) { out.push({ kind: 'remove', title: b.name || T('plan.untitled'), lines: [{ text: T('chg.planRemoved') }] }); return; }
    const l = [];
    if (p.name !== b.name) l.push(line(T('a.plan.name'), cv(b.name), cv(p.name)));
    if (p.price !== b.price) l.push(line(T('a.plan.price'), money(b.price), money(p.price)));
    if (p.visits !== b.visits) l.push(line(T('a.plan.visits'), b.visits, p.visits));
    if (l.length) out.push({ kind: 'edit', title: b.name || T('plan.untitled'), lines: l });
  });
  return out;
}

export function classChanges(classes, base) {
  const out = [];
  classes.forEach((c) => {
    if (c.isNew) { out.push({ kind: 'add', title: c.name || T('row.untitled'), lines: [{ text: c.time + ', ' + T('row.min', { n: c.duration }) + ', ' + T('a.class.max') + ' ' + c.capacity + ', ' + daysText(c.days) }] }); return; }
    const b = base.find((x) => x.id === c.id); if (!b) return;
    if (c.removed) { out.push({ kind: 'remove', title: b.name || T('row.untitled'), lines: [{ text: T('chg.classRemoved') }] }); return; }
    const l = [];
    if (c.name !== b.name) l.push(line(T('a.class.name'), cv(b.name), cv(c.name)));
    if (c.coach !== b.coach) l.push(line(T('a.class.coach'), cv(b.coach), cv(c.coach)));
    if (c.time !== b.time) l.push(line(T('a.class.time'), b.time, c.time));
    if (c.duration !== b.duration) l.push(line(T('a.class.length'), b.duration, c.duration));
    if (c.capacity !== b.capacity) l.push(line(T('a.class.max'), b.capacity, c.capacity));
    if (c.days.join() !== b.days.join()) l.push(line(T('a.class.repeats'), daysText(b.days), daysText(c.days)));
    if (l.length) out.push({ kind: 'edit', title: b.name || T('row.untitled'), lines: l });
  });
  return out;
}

export function memberChanges(members, pending, basePlans) {
  const name = (id) => { const p = basePlans.find((x) => x.id === id); return p ? (p.name || T('plan.untitled')) : T('a.members.noPlan'); };
  const out = [];
  members.forEach((m) => {
    if (!Object.prototype.hasOwnProperty.call(pending, m.id)) return;
    out.push({
      kind: 'edit', title: m.name,
      lines: [line(T('a.members.plan'), m.planId == null ? T('a.members.noPlan') : name(m.planId), pending[m.id] == null ? T('a.members.noPlan') : name(pending[m.id]))],
    });
  });
  return out;
}

const sizeText = (p) => (p.colSpan || p.rowSpan ? (p.colSpan || T('a.promo.auto')) + ' × ' + (p.rowSpan || T('a.promo.auto')) : T('a.promo.auto'));

export function promoChanges(promos, base) {
  const out = [];
  const kind = (k) => T('promo.kind.' + k);
  const yn = (v) => T(v ? 'chg.yes' : 'chg.no');
  promos.forEach((p) => {
    if (p.isNew) { out.push({ kind: 'add', title: p.title || T('promo.untitled'), lines: [{ text: kind(p.kind) + (p.image ? ', ' + T('chg.photo') : '') + (p.active ? '' : ', ' + T('a.promo.hidden')) }] }); return; }
    const b = base.find((x) => x.id === p.id); if (!b) return;
    if (p.removed) { out.push({ kind: 'remove', title: b.title || T('promo.untitled'), lines: [{ text: T('chg.promoRemoved') }] }); return; }
    const l = [];
    if (p.kind !== b.kind) l.push(line(T('a.promo.kind'), kind(b.kind), kind(p.kind)));
    if (p.title !== b.title) l.push(line(T('a.promo.title'), cv(b.title), cv(p.title)));
    if (p.body !== b.body) l.push(line(T('a.promo.body'), cv(b.body), cv(p.body)));
    if (p.link !== b.link) l.push(line(T('a.promo.link'), cv(b.link), cv(p.link)));
    if (p.content !== b.content) l.push({ text: T('chg.contentChanged') });
    if (p.hideOn !== b.hideOn) l.push(line(T('a.promo.hideOn'), b.hideOn || T('a.promo.noLimit'), p.hideOn || T('a.promo.noLimit')));
    if (p.bgColor !== b.bgColor) l.push(line(T('a.promo.bgColor'), b.bgColor || T('a.promo.auto'), p.bgColor || T('a.promo.auto')));
    if (p.bgImage !== b.bgImage) l.push({ text: T(!p.bgImage ? 'chg.bgRemoved' : b.bgImage ? 'chg.bgChanged' : 'chg.bgAdded') });
    if (p.colSpan !== b.colSpan || p.rowSpan !== b.rowSpan) l.push(line(T('a.promo.size'), sizeText(b), sizeText(p)));
    if (p.image !== b.image) l.push({ text: T(!p.image ? 'chg.photoRemoved' : b.image ? 'chg.photoChanged' : 'chg.photoAdded') });
    if (p.showTitle !== b.showTitle) l.push(line(T('a.promo.showTitle'), yn(b.showTitle), yn(p.showTitle)));
    if (p.bordered !== b.bordered) l.push(line(T('a.promo.bordered'), yn(b.bordered), yn(p.bordered)));
    if (p.active !== b.active) l.push(line(T('a.promo.active'), yn(b.active), yn(p.active)));
    if (l.length) out.push({ kind: 'edit', title: b.title || T('promo.untitled'), lines: l });
  });
  // The order of the items that stay (new and removed ones are listed above)
  const kept = promos.filter((p) => !p.isNew && !p.removed).map((p) => p.id);
  const was = base.filter((b) => kept.includes(b.id)).map((b) => b.id);
  if (kept.join() !== was.join()) {
    out.push({ kind: 'edit', title: T('a.promos.order'), lines: [{ text: kept.map((id) => (base.find((b) => b.id === id).title || T('promo.untitled'))).join(' > ') }] });
  }
  return out;
}

export function changesFor(page, d) {
  if (page === 'promos') return promoChanges(d.promos, d.basePromos);
  if (page === 'plans') return planChanges(d.plans, d.basePlans);
  if (page === 'schedule') return classChanges(d.classes, d.baseClasses);
  if (page === 'members') return memberChanges(d.members, d.pending, d.basePlans);
  return [];
}

export const planDiffers = (p, b) => p.name !== b.name || p.price !== b.price || p.visits !== b.visits;
export const classDiffers = (c, b) =>
  c.name !== b.name || c.coach !== b.coach || c.time !== b.time || c.duration !== b.duration ||
  c.capacity !== b.capacity || c.days.join() !== b.days.join();
export const promoDiffers = (p, b) =>
  p.kind !== b.kind || p.title !== b.title || p.body !== b.body || p.image !== b.image || p.link !== b.link || p.content !== b.content || p.hideOn !== b.hideOn || p.colSpan !== b.colSpan || p.rowSpan !== b.rowSpan || p.bgColor !== b.bgColor || p.bgImage !== b.bgImage ||
  p.active !== b.active || p.bordered !== b.bordered || p.showTitle !== b.showTitle || p.sortOrder !== b.sortOrder;
