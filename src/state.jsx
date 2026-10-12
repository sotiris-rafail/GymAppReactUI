import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { I18N } from './i18n.js';
import { api, normPlan, normClass, planBody, classBody } from './api.js';
import { changesFor, planDiffers, classDiffers } from './drafts.js';
import { applyTitle } from './remote.js';
import { TODAY, TODAY_K, key, clone, themeNow, applyTheme, shortLabel } from './util.js';

export const ADMIN_PAGES = ['plans', 'schedule', 'members'];
const Ctx = createContext(null);
export const useGym = () => useContext(Ctx);

const pageFromHash = () => {
  const k = String(location.hash || '').replace(/^#\/?/, '');
  return ADMIN_PAGES.includes(k) ? k : 'plans';
};
const T = (k, p) => I18N.t(k, p);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export function GymProvider({ children }) {
  /* app */
  const [lang, setLangState] = useState(I18N.lang);
  const [theme, setThemeState] = useState(themeNow());
  const [auth, setAuth] = useState(null); // {id,name,email,role:'MEMBER'|'ADMIN',planId}
  const [booting, setBooting] = useState(true);
  const [fatalErr, setFatalErr] = useState(null);
  const [toastState, setToastState] = useState({ msg: '', hidden: true });
  const [modal, setModal] = useState(null);
  const [loginRole, setLoginRole] = useState('member');
  const [registering, setRegistering] = useState(false);

  /* data from the server */
  const [bookings, setBookings] = useState([]);
  const [sessions, setSessions] = useState({});
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [openClasses, setOpenClasses] = useState({});
  const [cal, setCal] = useState({ cy: TODAY.getFullYear(), cm: TODAY.getMonth(), sel: TODAY_K });

  /* admin drafts: base is what the server has, plans/classes are the draft, pending holds member plan changes */
  const [plans, setPlans] = useState([]);
  const [basePlans, setBasePlans] = useState([]);
  const [classes, setClasses] = useState([]);
  const [baseClasses, setBaseClasses] = useState([]);
  const [pending, setPending] = useState({});
  const [page, setPage] = useState(pageFromHash());
  const focusReq = useRef(null);
  const [focusTick, setFocusTick] = useState(0);

  /* always-current copy for async code and event listeners */
  const R = useRef({});
  R.current = { auth, cal, page, plans, basePlans, classes, baseClasses, pending, members, modal };
  const busy = useRef(false);
  const sessionReq = useRef(0);
  const tmpId = useRef(0);
  const toastTimer = useRef(null);

  const toast = useCallback((msg) => {
    setToastState({ msg, hidden: false });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastState((s) => ({ ...s, hidden: true })), 3600);
  }, []);

  /* ---------- loading ---------- */
  const loadCatalog = useCallback(async () => {
    const r = await Promise.all([api('GET', '/api/plans'), api('GET', '/api/classes')]);
    const p = r[0].map(normPlan), c = r[1].map(normClass);
    setPlans(p); setBasePlans(clone(p)); setClasses(c); setBaseClasses(clone(c));
  }, []);
  const loadSessions = useCallback(async (cy, cm) => {
    const tok = ++sessionReq.current;
    const first = new Date(cy, cm, 1), last = new Date(cy, cm + 1, 0);
    const list = await api('GET', '/api/sessions?from=' + key(first) + '&to=' + key(last));
    if (tok !== sessionReq.current) return;
    const map = {};
    list.forEach((s) => { (map[s.date] = map[s.date] || []).push(s); });
    setSessions(map);
  }, []);
  const loadMemberData = useCallback(async (cy, cm) => {
    const r = await Promise.all([api('GET', '/api/me/bookings'), loadSessions(cy, cm)]);
    setBookings(r[0]);
  }, [loadSessions]);
  const loadMembers = useCallback(async () => { const m = await api('GET', '/api/admin/members'); setMembers(m); return m; }, []);
  const loadAttendance = useCallback(async () => { setAttendance(await api('GET', '/api/admin/attendance')); }, []);
  const loadAll = useCallback(async (user, cy, cm) => {
    await loadCatalog();
    if (user.role === 'MEMBER') await loadMemberData(cy, cm);
    else await Promise.all([loadMembers(), loadAttendance()]);
  }, [loadCatalog, loadMemberData, loadMembers, loadAttendance]);

  const clearData = useCallback(() => {
    setPlans([]); setBasePlans([]); setClasses([]); setBaseClasses([]); setPending({});
    setBookings([]); setSessions({}); setMembers([]); setAttendance([]);
  }, []);

  /* ---------- errors and busy guard ---------- */
  const handleAuthError = useCallback((e) => {
    if (e && e.status === 401 && R.current.auth) {
      setAuth(null); clearData(); setModal(null);
      toast(T('sessionEnded'));
      return true;
    }
    return false;
  }, [clearData, toast]);
  const run = useCallback(async (fn) => {
    if (busy.current) return;
    busy.current = true;
    try { await fn(); }
    catch (e) { if (!handleAuthError(e)) toast((e && e.message) || T('wrong')); }
    finally { busy.current = false; }
  }, [handleAuthError, toast]);

  /* ---------- derived: unsaved changes ---------- */
  const draft = { plans, basePlans, classes, baseClasses, pending, members };
  const changes = useMemo(() => ({
    plans: changesFor('plans', draft), schedule: changesFor('schedule', draft), members: changesFor('members', draft),
  }), [plans, basePlans, classes, baseClasses, pending, members, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirtyCount = (k) => changes[k].length;
  const dirtyAny = ADMIN_PAGES.some((k) => changes[k].length > 0);
  const isAdmin = !!(auth && auth.role === 'ADMIN');

  /* ---------- app-level effects ---------- */
  useEffect(() => { document.body.classList.toggle('is-admin', isAdmin && !booting && !fatalErr); }, [isAdmin, booting, fatalErr]);
  useEffect(() => {
    const h = (e) => { if (isAdmin && dirtyAny) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [isAdmin, dirtyAny]);
  useEffect(() => {
    const h = () => {
      const k = pageFromHash();
      if (k !== R.current.page) {
        setPage(k); setModal(null); window.scrollTo(0, 0);
        const a = R.current.auth;
        if (k === 'members' && a && a.role === 'ADMIN') loadAttendance().catch(() => {});
      }
    };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, [loadAttendance]);
  useEffect(() => {
    const id = focusReq.current;
    if (!id) return;
    focusReq.current = null; // use it once, right away, so later edits are never re-selected
    const el = document.getElementById(id);
    if (el) { el.focus(); if (el.select) el.select(); }
  }, [focusTick]);

  /* ---------- boot ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let me = null;
        try { me = await api('GET', '/api/auth/me'); } catch (e) { if (e.status !== 401) throw e; }
        if (me) await loadAll(me, TODAY.getFullYear(), TODAY.getMonth());
        if (alive) setAuth(me);
      } catch (e) {
        if (alive) { setAuth(null); setFatalErr(e || new Error('')); }
      }
      if (alive) { setPage(pageFromHash()); setBooting(false); }
    })();
    return () => { alive = false; };
  }, [loadAll]);

  /* ---------- login / logout ---------- */
  const enter = useCallback(async (user, msg) => {
    const c = { cy: TODAY.getFullYear(), cm: TODAY.getMonth(), sel: TODAY_K };
    clearData();
    await loadAll(user, c.cy, c.cm);
    setCal(c); setAuth(user); setPage(pageFromHash());
    toast(msg);
  }, [clearData, loadAll, toast]);
  const logout = useCallback(async () => {
    if (R.current.auth && R.current.auth.role === 'ADMIN' && ADMIN_PAGES.some((k) => changesFor(k, R.current).length) &&
        !window.confirm(T('unsaved.leave'))) return;
    try { await api('POST', '/api/auth/logout'); } catch (e) { /* the session is gone either way */ }
    setModal(null); setAuth(null); clearData(); setLoginRole('member'); setRegistering(false);
  }, [clearData]);

  /* ---------- member actions ---------- */
  const shiftMonth = useCallback(async (n) => {
    const { cy, cm } = R.current.cal;
    const d = new Date(cy, cm + n, 1);
    const ny = d.getFullYear(), nm = d.getMonth();
    const sel = (ny === TODAY.getFullYear() && nm === TODAY.getMonth()) ? TODAY_K : key(d);
    await loadSessions(ny, nm);
    setCal({ cy: ny, cm: nm, sel });
  }, [loadSessions]);
  const goToday = useCallback(async () => {
    const c = { cy: TODAY.getFullYear(), cm: TODAY.getMonth(), sel: TODAY_K };
    await loadSessions(c.cy, c.cm); setCal(c);
  }, [loadSessions]);
  const pickDay = useCallback((k) => setCal((c) => ({ ...c, sel: k })), []);
  const book = useCallback(async (classId, k, s) => {
    const { cy, cm } = R.current.cal;
    try { await api('POST', '/api/bookings', { classId, date: k }); }
    catch (e) { if (e.status === 401) throw e; await loadMemberData(cy, cm); throw e; }
    await loadMemberData(cy, cm);
    toast(T('toast.booked', { what: (s ? s.name + ', ' : '') + shortLabel(k) + (s ? ' ' + T('at') + ' ' + s.startTime : '') }));
  }, [loadMemberData, toast]);
  const cancelBooking = useCallback(async (id) => {
    await api('DELETE', '/api/bookings/' + id);
    const { cy, cm } = R.current.cal;
    await loadMemberData(cy, cm);
    toast(T('toast.cancelled'));
  }, [loadMemberData, toast]);

  /* ---------- admin: editing drafts ---------- */
  const editPlan = (id, patch) => setPlans((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const editClass = (id, patch) => setClasses((l) => l.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const addPlan = () => {
    const id = --tmpId.current;
    setPlans((l) => [...l, { id, name: T('a.plans.new'), price: 39, visits: 6, isNew: true }]);
    focusReq.current = 'plan-name-' + id; setFocusTick((n) => n + 1);
  };
  const addClass = () => {
    const id = --tmpId.current;
    setClasses((l) => [...l, { id, name: T('a.classes.new'), coach: '', time: '18:00', duration: 45, capacity: 10, days: [1], isNew: true }]);
    focusReq.current = 'class-name-' + id; setFocusTick((n) => n + 1);
  };
  const removePlan = (id) => setPlans((l) => l.flatMap((p) => (p.id !== id ? [p] : p.isNew ? [] : [{ ...p, removed: true }])));
  const removeClass = (id) => setClasses((l) => l.flatMap((c) => (c.id !== id ? [c] : c.isNew ? [] : [{ ...c, removed: true }])));
  const undoPlan = (id) => editPlan(id, { removed: false });
  const undoClass = (id) => editClass(id, { removed: false });
  const toggleDay = (id, day) => setClasses((l) => l.map((c) => {
    if (c.id !== id) return c;
    const days = c.days.includes(day) ? c.days.filter((d) => d !== day) : [...c.days, day];
    return { ...c, days: days.sort((a, b) => a - b) };
  }));
  const choosePlan = (memberId, v) => {
    const m = R.current.members.find((x) => x.id === memberId);
    setPending((p) => {
      const n = { ...p };
      if (m && m.planId === v) delete n[memberId]; else n[memberId] = v;
      return n;
    });
  };
  const discard = () => {
    const pg = R.current.page;
    if (!dirtyCount(pg)) return;
    if (!window.confirm(T('a.discard.confirm'))) return;
    if (pg === 'plans') setPlans(clone(R.current.basePlans));
    else if (pg === 'schedule') setClasses(clone(R.current.baseClasses));
    else setPending({});
  };
  const toggleOpenClass = (cid, open) => setOpenClasses((o) => ({ ...o, [cid]: open ? 1 : 0 }));

  /* ---------- admin: save dialog ---------- */
  const openSave = () => {
    const pg = R.current.page;
    const ch = changesFor(pg, R.current);
    if (!ch.length) return;
    setModal({ type: 'save', page: pg, changes: ch, saving: false, error: '' });
  };
  const openHistory = async (id) => {
    const m = R.current.members.find((x) => x.id === id);
    setModal({ type: 'history', id, name: m ? m.name : '', data: null, error: '' });
    try {
      const data = await api('GET', '/api/admin/members/' + id + '/history');
      setModal((cur) => (cur && cur.type === 'history' && cur.id === id ? { ...cur, data } : cur));
    } catch (e) {
      if (handleAuthError(e)) return;
      setModal((cur) => (cur && cur.type === 'history' && cur.id === id ? { ...cur, error: e.message || T('wrong') } : cur));
    }
  };
  const closeModal = () => {
    const m = R.current.modal;
    if (!m || m.saving) return;
    setModal(null); // Modal.jsx returns focus to the button that opened it
  };

  /* One request per change. Each success is copied into base, so a failure half-way leaves an accurate draft. */
  const confirmSave = async () => {
    const m = R.current.modal;
    if (!m || m.type !== 'save' || m.saving) return;
    setModal({ ...m, saving: true, error: '' });
    const s = {
      plans: R.current.plans.slice(), basePlans: R.current.basePlans.slice(),
      classes: R.current.classes.slice(), baseClasses: R.current.baseClasses.slice(),
      pending: { ...R.current.pending }, members: R.current.members.slice(),
    };
    const sync = () => {
      setPlans(s.plans.slice()); setBasePlans(s.basePlans.slice());
      setClasses(s.classes.slice()); setBaseClasses(s.baseClasses.slice());
      setPending({ ...s.pending }); setMembers(s.members.slice());
    };
    const step = async (name, fn) => {
      try { return await fn(); }
      catch (e) { if (e && e.status === 401) throw e; throw new Error((name ? name + ': ' : '') + ((e && e.message) || T('wrong'))); }
    };
    try {
      if (m.page === 'plans') {
        for (const p of s.plans.slice()) {
          if (p.isNew || p.removed) continue;
          const b = s.basePlans.find((x) => x.id === p.id);
          if (b && planDiffers(p, b)) {
            await step(b.name, () => api('PUT', '/api/admin/plans/' + p.id, planBody(p)));
            s.basePlans = s.basePlans.map((x) => (x.id === p.id ? clone(p) : x)); sync();
          }
        }
        for (const p of s.plans.slice()) {
          if (!p.isNew) continue;
          const made = await step(p.name, () => api('POST', '/api/admin/plans', planBody(p)));
          const np = normPlan(made);
          s.plans = s.plans.map((x) => (x === p ? np : x)); s.basePlans = [...s.basePlans, clone(np)]; sync();
        }
        let gone = false;
        for (const p of s.plans.slice()) {
          if (!p.removed) continue;
          await step(p.name, () => api('DELETE', '/api/admin/plans/' + p.id));
          s.plans = s.plans.filter((x) => x.id !== p.id); s.basePlans = s.basePlans.filter((x) => x.id !== p.id);
          Object.keys(s.pending).forEach((k) => { if (s.pending[k] === p.id) delete s.pending[k]; });
          gone = true; sync();
        }
        if (gone) { s.members = await loadMembers(); sync(); }
      } else if (m.page === 'schedule') {
        for (const c of s.classes.slice()) {
          if (c.isNew || c.removed) continue;
          const b = s.baseClasses.find((x) => x.id === c.id);
          if (b && classDiffers(c, b)) {
            await step(b.name, () => api('PUT', '/api/admin/classes/' + c.id, classBody(c)));
            s.baseClasses = s.baseClasses.map((x) => (x.id === c.id ? clone(c) : x)); sync();
          }
        }
        for (const c of s.classes.slice()) {
          if (!c.isNew) continue;
          const made = await step(c.name, () => api('POST', '/api/admin/classes', classBody(c)));
          const nc = normClass(made);
          s.classes = s.classes.map((x) => (x === c ? nc : x)); s.baseClasses = [...s.baseClasses, clone(nc)]; sync();
        }
        for (const c of s.classes.slice()) {
          if (!c.removed) continue;
          await step(c.name, () => api('DELETE', '/api/admin/classes/' + c.id));
          s.classes = s.classes.filter((x) => x.id !== c.id); s.baseClasses = s.baseClasses.filter((x) => x.id !== c.id); sync();
        }
        s.members = await api('GET', '/api/admin/members'); sync();
        await loadAttendance();
      } else {
        for (const idStr of Object.keys(s.pending)) {
          const id = Number(idStr), mem = s.members.find((x) => x.id === id);
          const res = await step(mem ? mem.name : '', () => api('PUT', '/api/admin/members/' + id + '/plan', { planId: s.pending[id] }));
          s.members = s.members.map((x) => (x.id === id ? res : x)); delete s.pending[id]; sync();
        }
      }
      setModal(null);
      toast(T('a.save.done'));
    } catch (e) {
      sync();
      if (handleAuthError(e)) return;
      setModal((cur) => (cur && cur.type === 'save'
        ? { ...cur, saving: false, changes: changesFor(m.page, s), error: T('a.save.failed', { why: e.message }) }
        : cur));
    }
  };

  /* ---------- language and theme ---------- */
  const setLang = (code) => { I18N.set(code); applyTitle(); setLangState(code); };
  const toggleTheme = () => { const n = themeNow() === 'dark' ? 'light' : 'dark'; applyTheme(n); setThemeState(n); };

  const value = {
    lang, theme, setLang, toggleTheme,
    auth, booting, fatalErr, toastState, toast, modal, setModal, closeModal,
    loginRole, setLoginRole, registering, setRegistering,
    bookings, sessions, members, attendance, openClasses, toggleOpenClass, cal, pickDay,
    plans, basePlans, classes, baseClasses, pending, page, changes, dirtyCount, dirtyAny, isAdmin,
    run, enter, logout, shiftMonth, goToday, book, cancelBooking,
    editPlan, editClass, addPlan, addClass, removePlan, removeClass, undoPlan, undoClass, toggleDay, choosePlan,
    discard, openSave, openHistory, confirmSave, loadAttendance,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
