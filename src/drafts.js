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

export function changesFor(page, d) {
  if (page === 'plans') return planChanges(d.plans, d.basePlans);
  if (page === 'schedule') return classChanges(d.classes, d.baseClasses);
  if (page === 'members') return memberChanges(d.members, d.pending, d.basePlans);
  return [];
}

export const planDiffers = (p, b) => p.name !== b.name || p.price !== b.price || p.visits !== b.visits;
export const classDiffers = (c, b) =>
  c.name !== b.name || c.coach !== b.coach || c.time !== b.time || c.duration !== b.duration ||
  c.capacity !== b.capacity || c.days.join() !== b.days.join();
