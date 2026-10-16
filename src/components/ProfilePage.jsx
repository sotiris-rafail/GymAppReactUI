import { useEffect, useState } from 'react';
import { I18N } from '../i18n.js';
import { api } from '../api.js';
import { useGym, adminUrl } from '../state.jsx';
import { money } from '../util.js';

const T = (k, p) => I18N.t(k, p);
const TN = (k, n, p) => I18N.tn(k, n, p);

function Row({ label, children, id }) {
  return <div className="prow"><dt>{label}</dt><dd id={id}>{children}</dd></div>;
}

function Field({ label, id, children }) {
  return <div className="field"><label htmlFor={id}>{label}</label>{children}</div>;
}

/* The only thing a person can change about themselves is their password. */
function PasswordForm() {
  const g = useGym();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    setErr('');
    if (!cur || !next || !again) { setErr(T('profile.pw.needAll')); return; }
    if (next.length < 6) { setErr(T('profile.pw.short')); return; }
    if (next !== again) { setErr(T('profile.pw.mismatch')); return; }
    if (next === cur) { setErr(T('profile.pw.same')); return; }
    g.run(async () => {
      try { await api('PUT', '/api/auth/password', { currentPassword: cur, newPassword: next }); }
      catch (er) { if (er.status === 401) throw er; setErr(er.message); return; }
      setCur(''); setNext(''); setAgain('');
      g.toast(T('profile.pw.done'));
    });
  };

  return (
    <form className="form" id="pw-form" noValidate onSubmit={submit}>
      <Field label={T('profile.pw.current')} id="pw-current">
        <input type="password" id="pw-current" autoComplete="current-password" maxLength={72} value={cur} onChange={(e) => setCur(e.target.value)} />
      </Field>
      <Field label={T('profile.pw.new')} id="pw-new">
        <input type="password" id="pw-new" autoComplete="new-password" maxLength={72} value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
      <Field label={T('profile.pw.confirm')} id="pw-again">
        <input type="password" id="pw-again" autoComplete="new-password" maxLength={72} value={again} onChange={(e) => setAgain(e.target.value)} />
      </Field>
      <p className="err" id="pw-err" role="alert" hidden={!err}>{err}</p>
      <button className="btn" type="submit" id="pw-submit">{T('profile.pw.submit')}</button>
    </form>
  );
}

const PREFS = [
  ['marketing', 'pref.marketing'],
  ['newPlans', 'pref.newPlans'],
  ['planEnding', 'pref.planEnding'],
  ['visitsReminder', 'pref.visitsReminder'],
];

/* The member's email choices. Each switch is saved the moment it is turned on or off. */
function Preferences() {
  const g = useGym();
  const [prefs, setPrefs] = useState(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    api('GET', '/api/me/preferences').then((p) => { if (live) setPrefs(p); }).catch((e) => { if (live) setErr(e.message); });
    return () => { live = false; };
  }, []);

  const flip = (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); setErr(''); setSaving(true);
    g.run(async () => {
      try { setPrefs(await api('PUT', '/api/me/preferences', next)); g.toast(T('pref.saved')); }
      catch (er) { if (er.status === 401) throw er; setPrefs(prefs); setErr(er.message); }
      finally { setSaving(false); }
    });
  };

  return (
    <section aria-labelledby="pref-title" className="pref-section">
      <div className="sec-h"><div><h2 id="pref-title">{T('pref.title')}</h2><p className="sub">{T('pref.sub')}</p></div></div>
      <div className="pcard prefs" id="prefs">
        {PREFS.map(([k, t]) => (
          <label className="pref" key={k} htmlFor={'pref-' + k}>
            <span className="pref-text"><b>{T(t)}</b><span className="muted">{T(t + '.d')}</span></span>
            <input type="checkbox" role="switch" className="switch" id={'pref-' + k} checked={!!(prefs && prefs[k])} disabled={!prefs || saving} onChange={() => flip(k)} />
          </label>
        ))}
      </div>
      <p className="err" id="pref-err" role="alert" hidden={!err}>{err}</p>
    </section>
  );
}

/* The page at /profile */
export default function ProfilePage() {
  const g = useGym();
  const u = g.auth;
  const plan = g.plans.find((p) => p.id === u.planId) || null;
  const back = g.isAdmin ? adminUrl(g.page) : '/';
  return (
    <div className="page profile">
      <div>
        <button className="btn ghost" id="profile-back" onClick={() => g.navigate(back)}>&larr; {T('profile.back')}</button>
      </div>
      <section aria-labelledby="profile-title">
        <div className="sec-h"><div><h2 id="profile-title">{T('profile.title')}</h2><p className="sub">{T('profile.sub')}</p></div></div>
        <dl className="pcard" id="profile-details" aria-label={T('profile.details')}>
          <Row label={T('profile.name')} id="profile-name">{u.name}</Row>
          <Row label={T('profile.email')} id="profile-email">{u.email}</Row>
          <Row label={T('profile.type')} id="profile-type">{T(g.isAdmin ? 'admin' : 'member')}</Row>
          {!g.isAdmin && (
            <Row label={T('profile.plan')} id="profile-plan">
              {plan
                ? <><b>{plan.name || T('plan.untitled')}</b> <span className="muted">{T('profile.planLine', { price: money(plan.price), visits: plan.unlimited ? T('plan.unlimited') : TN('plan.visits', plan.visits) })}</span></>
                : <span className="muted">{T('profile.noPlan')}</span>}
            </Row>
          )}
        </dl>
        <p className="muted small">{T('profile.locked')}</p>
      </section>
      {!g.isAdmin && <Preferences />}
      <section aria-labelledby="pw-title" className="pw-section">
        <div className="sec-h"><div><h2 id="pw-title">{T('profile.pw.title')}</h2></div></div>
        <PasswordForm />
      </section>
    </div>
  );
}
