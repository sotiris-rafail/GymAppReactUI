import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { I18N } from './i18n.js';
import { api, normPlan, normClass, planBody, classBody, normPromo, promoBody } from './api.js';
import { changesFor, planDiffers, classDiffers, promoDiffers } from './drafts.js';
import { applyTitle } from './remote.js';
import { TODAY, TODAY_K, key, clone, themeNow, applyTheme, shortLabel } from './util.js';

export const ADMIN_PAGES = ['plans', 'schedule', 'members', 'promos'];
export const ADMIN_NAV_PAGES = ['plans', 'schedule', 'members', 'promos', 'closed'];
/* The closed-days page saves straight away, so it has no draft and is not in ADMIN_PAGES */
const ADMIN_NAV = [...ADMIN_PAGES, 'closed'];
const Ctx = createContext(null);
export const useGym = () => useContext(Ctx);

/* Each admin page has its own address: /admin/plans, /admin/schedule, /admin/members, /admin/home */
const ADMIN_SEG = { plans: 'plans', schedule: 'schedule', members: 'members', promos: 'home', closed: 'closed' };
export const adminUrl = (k) => '/admin/' + ADMIN_SEG[k];
const isAdminArea = (p) => /^\/admin(\/|$)/.test(p);
const adminKeyOf = (p) => {
  const m = /^\/admin(?:\/([^/]+))?\/?$/.exec(p);
  if (!m) return null;
  return ADMIN_NAV.find((k) => ADMIN_SEG[k] === m[1]) || 'plans';
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
  const [path, setPath] = useState(location.pathname); // the page address: / or /profile
  const [showLogin, setShowLogin] = useState(false); // visitors see the home page until they ask to log in

  /* data from the server */
  const [bookings, setBookings] = useState([]);
  const [sessions, setSessions] = useState({});
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [closedDays, setClosedDays] = useState([]); // [{date, reason}] closed by the admin; Sundays are always closed
  const [openClasses, setOpenClasses] = useState({});
  const [cal, setCal] = useState({ cy: TODAY.getFullYear(), cm: TODAY.getMonth(), sel: TODAY_K });

  /* admin drafts: base is what the server has, plans/classes are the draft, pending holds member plan changes */
  const [plans, setPlans] = useState([]);
  const [basePlans, setBasePlans] = useState([]);
  const [classes, setClasses] = useState([]);
  const [baseClasses, setBaseClasses] = useState([]);
  const [pending, setPending] = useState({});
  const [promos, setPromos] = useState([]);
  const [basePromos, setBasePromos] = useState([]);
  const [page, setPage] = useState(adminKeyOf(location.pathname) || 'plans');
  const focusReq = useRef(null);
  const [focusTick, setFocusTick] = useState(0);

  /* always-current copy for async code and event listeners */
  const R = useRef({});
  R.current = { auth, cal, page, plans, basePlans, classes, baseClasses, pending, members, modal, promos, basePromos };
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
  /* The admin loads every item (hidden ones too); everybody else gets the public list. */
  const loadPromos = useCallback(async (admin) => {
    const list = (await api('GET', admin ? '/api/admin/promos' : '/api/promos')) || [];
    const p = list.map(normPromo);
    setPromos(p); setBasePromos(clone(p));
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
  const loadClosed = useCallback(async () => { setClosedDays((await api('GET', '/api/closed-days')) || []); }, []);
  const loadMemberData = useCallback(async (cy, cm) => {
    const r = await Promise.all([api('GET', '/api/me/bookings'), loadSessions(cy, cm), loadClosed().catch(() => {})]);
    setBookings(r[0]);
  }, [loadSessions, loadClosed]);
  const loadMembers = useCallback(async () => { const m = await api('GET', '/api/admin/members'); setMembers(m); return m; }, []);
  const loadAttendance = useCallback(async () => { setAttendance(await api('GET', '/api/admin/attendance')); }, []);
  const loadAll = useCallback(async (user, cy, cm) => {
    await loadCatalog();
    await loadPromos(user.role === 'ADMIN').catch(() => {}); // the home page items never block a login
    await loadClosed().catch(() => {});
    if (user.role === 'MEMBER') await loadMemberData(cy, cm);
    else await Promise.all([loadMembers(), loadAttendance()]);
  }, [loadCatalog, loadPromos, loadClosed, loadMemberData, loadMembers, loadAttendance]);

  const clearData = useCallback(() => {
    setPlans([]); setBasePlans([]); setClasses([]); setBaseClasses([]); setPending({});
    setBookings([]); setSessions({}); setMembers([]); setAttendance([]); setPromos([]); setBasePromos([]); setClosedDays([]);
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
  const draft = { plans, basePlans, classes, baseClasses, pending, members, promos, basePromos };
  const changes = useMemo(() => ({
    plans: changesFor('plans', draft), schedule: changesFor('schedule', draft), members: changesFor('members', draft),
    promos: changesFor('promos', draft),
  }), [plans, basePlans, classes, baseClasses, pending, members, promos, basePromos, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirtyCount = (k) => (changes[k] || []).length;
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
    const id = focusReq.current;
    if (!id) return;
    focusReq.current = null; // use it once, right away, so later edits are never re-selected
    const el = document.getElementById(id);
    if (el) { el.focus(); if (el.select) el.select(); }
  }, [focusTick]);

  /* ---------- page address (/ and /profile) ---------- */
  const navigate = useCallback((to, replace) => {
    const here = location.pathname + location.hash;
    if (here !== to) window.history[replace ? 'replaceState' : 'pushState']({}, '', to);
    setPath(location.pathname);
    setModal(null); window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    const h = () => setPath(location.pathname);
    window.addEventListener('popstate', h);
    return () => window.removeEventListener('popstate', h);
  }, []);
  const onProfile = path.replace(/\/+$/, '') === '/profile';
  // Opening /profile or an admin address while logged out asks for the login first, then lands there
  const needsLogin = onProfile || isAdminArea(path);
  useEffect(() => { if (needsLogin && !booting && !auth && !fatalErr) setShowLogin(true); }, [needsLogin, booting, auth, fatalErr]);
  // Where each kind of person belongs: the admin is kept inside /admin/... (or /profile), a member never sees /admin
  useEffect(() => {
    if (booting || !auth) return;
    const k = adminKeyOf(path);
    if (auth.role === 'ADMIN') {
      if (k) {
        if (path.replace(/\/+$/, '') !== adminUrl(k)) { navigate(adminUrl(k), true); return; }
        if (k !== R.current.page) {
          setPage(k); setModal(null); window.scrollTo(0, 0);
          if (k === 'members') loadAttendance().catch(() => {});
        }
      } else if (path === '/') {
        navigate(adminUrl(R.current.page), true);
      }
    } else if (isAdminArea(path)) {
      navigate('/', true);
    }
  }, [auth, booting, path, navigate, loadAttendance]);

  /* ---------- boot ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let me = null;
        try { me = await api('GET', '/api/auth/me'); } catch (e) { if (e.status !== 401) throw e; }
        if (me) await loadAll(me, TODAY.getFullYear(), TODAY.getMonth());
        else await loadPromos(false).catch(() => {});
        if (alive) setAuth(me);
      } catch (e) {
        if (alive) { setAuth(null); setFatalErr(e || new Error('')); }
      }
      if (alive) setBooting(false);
    })();
    return () => { alive = false; };
  }, [loadAll, loadPromos]);
  useEffect(() => { if (!booting && !auth && !fatalErr) loadPromos(false).catch(() => {}); }, [auth, booting, fatalErr, loadPromos]);

  /* ---------- login / logout ---------- */
  const enter = useCallback(async (user, msg) => {
    const c = { cy: TODAY.getFullYear(), cm: TODAY.getMonth(), sel: TODAY_K };
    clearData();
    await loadAll(user, c.cy, c.cm);
    setCal(c); setAuth(user); setShowLogin(false);
    toast(msg);
  }, [clearData, loadAll, toast]);
  const logout = useCallback(async () => {
    if (R.current.auth && R.current.auth.role === 'ADMIN' && ADMIN_PAGES.some((k) => changesFor(k, R.current).length) &&
        !window.confirm(T('unsaved.leave'))) return;
    try { await api('POST', '/api/auth/logout'); } catch (e) { /* the session is gone either way */ }
    setModal(null); setAuth(null); clearData(); setLoginRole('member'); setRegistering(false); setShowLogin(false);
    if (location.pathname !== '/') navigate('/', true);
  }, [clearData, navigate]);

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
  const editPromo = (id, patch) => setPromos((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const addPromo = () => {
    const id = --tmpId.current;
    setPromos((l) => [...l, { id, kind: 'PROMO', title: T('a.promos.new'), body: '', content: '', hideOn: '', colSpan: 0, rowSpan: 0, bgColor: '', bgImage: '', image: '', link: '', active: true, bordered: true, showTitle: true, sortOrder: l.length, isNew: true }]);
    focusReq.current = 'promo-title-' + id; setFocusTick((n) => n + 1);
  };
  const removePromo = (id) => setPromos((l) => l.flatMap((p) => (p.id !== id ? [p] : p.isNew ? [] : [{ ...p, removed: true }])));
  const undoPromo = (id) => editPromo(id, { removed: false });
  /* Moves an item up (-1) or down (+1) among the items that are not removed. */
  const movePromo = (id, dir) => setPromos((l) => {
    const shown = l.filter((p) => !p.removed);
    const i = shown.findIndex((p) => p.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= shown.length) return l;
    const a = shown[i], b = shown[j];
    return l.map((p) => (p.id === a.id ? b : p.id === b.id ? a : p));
  });
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
    else if (pg === 'promos') setPromos(clone(R.current.basePromos));
    else setPending({});
  };
  /* Closed days are saved the moment the admin adds or removes one. */
  const addClosed = useCallback(async (date, reason) => {
    await api('POST', '/api/admin/closed-days', { date, reason: reason || '' });
    await loadClosed();
    toast(T('a.closed.added', { date: shortLabel(date) }));
  }, [loadClosed, toast]);
  const removeClosed = useCallback(async (date) => {
    await api('DELETE', '/api/admin/closed-days/' + date);
    await loadClosed();
    toast(T('a.closed.removed', { date: shortLabel(date) }));
  }, [loadClosed, toast]);
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
      promos: R.current.promos.slice(), basePromos: R.current.basePromos.slice(),
    };
    const sync = () => {
      setPlans(s.plans.slice()); setBasePlans(s.basePlans.slice());
      setClasses(s.classes.slice()); setBaseClasses(s.baseClasses.slice());
      setPending({ ...s.pending }); setMembers(s.members.slice());
      setPromos(s.promos.slice()); setBasePromos(s.basePromos.slice());
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
      } else if (m.page === 'promos') {
        // The saved order is the position in the list, among the items that stay.
        let pos = 0;
        s.promos = s.promos.map((p) => (p.removed ? p : { ...p, sortOrder: pos++ }));
        for (const p of s.promos.slice()) {
          if (p.isNew || p.removed) continue;
          const b = s.basePromos.find((x) => x.id === p.id);
          if (b && promoDiffers(p, b)) {
            await step(b.title, () => api('PUT', '/api/admin/promos/' + p.id, promoBody(p)));
            s.basePromos = s.basePromos.map((x) => (x.id === p.id ? clone(p) : x)); sync();
          }
        }
        for (const p of s.promos.slice()) {
          if (!p.isNew) continue;
          const made = await step(p.title, () => api('POST', '/api/admin/promos', promoBody(p)));
          const np = normPromo(made, p.sortOrder);
          s.promos = s.promos.map((x) => (x === p ? np : x)); s.basePromos = [...s.basePromos, clone(np)]; sync();
        }
        for (const p of s.promos.slice()) {
          if (!p.removed) continue;
          await step(p.title, () => api('DELETE', '/api/admin/promos/' + p.id));
          s.promos = s.promos.filter((x) => x.id !== p.id); s.basePromos = s.basePromos.filter((x) => x.id !== p.id); sync();
        }
        s.basePromos = s.basePromos.slice().sort((a, b) => a.sortOrder - b.sortOrder); sync();
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
    loginRole, setLoginRole, registering, setRegistering, showLogin, setShowLogin, path, onProfile, navigate,
    closedDays, addClosed, removeClosed,
    promos, basePromos, editPromo, addPromo, removePromo, undoPromo, movePromo,
    bookings, sessions, members, attendance, openClasses, toggleOpenClass, cal, pickDay,
    plans, basePlans, classes, baseClasses, pending, page, changes, dirtyCount, dirtyAny, isAdmin,
    run, enter, logout, shiftMonth, goToday, book, cancelBooking,
    editPlan, editClass, addPlan, addClass, removePlan, removeClass, undoPlan, undoClass, toggleDay, choosePlan,
    discard, openSave, openHistory, confirmSave, loadAttendance,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
