import { useState } from 'react';
import { I18N } from '../i18n.js';
import { api } from '../api.js';
import { useGym } from '../state.jsx';
import { DEMO } from '../util.js';

const T = (k, p) => I18N.t(k, p);

function Field({ label, id, children }) {
  return <div className="field"><label htmlFor={id}>{label}</label>{children}</div>;
}

/* keyed by kind in Login, so switching member / admin / register starts with an empty form */
function LoginForm({ isAdmin, reg }) {
  const g = useGym();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const d = isAdmin ? DEMO.ADMIN : DEMO.MEMBER;

  const submit = (e) => {
    e.preventDefault();
    g.run(async () => {
      const em = email.trim();
      if (!em || !pw) { setErr(T('login.needBoth')); return; }
      let path, body, msg;
      if (isAdmin) { path = '/api/auth/login'; body = { email: em, password: pw, role: 'ADMIN' }; msg = T('login.welcomeAdmin'); }
      else if (reg) {
        if (!name.trim()) { setErr(T('login.needName')); return; }
        if (!/^\S+@\S+\.\S+$/.test(em)) { setErr(T('login.badEmail')); return; }
        if (pw.length < 6) { setErr(T('login.shortPw')); return; }
        path = '/api/auth/register'; body = { name: name.trim(), email: em, password: pw }; msg = T('login.created');
      } else { path = '/api/auth/login'; body = { email: em, password: pw, role: 'MEMBER' }; msg = T('login.welcome'); }
      let user;
      try { user = await api('POST', path, body); } catch (er) { setErr(er.message); return; }
      g.setRegistering(false);
      await g.enter(user, msg);
    });
  };

  return (
    <>
      <form className="form" id="login-form" noValidate onSubmit={submit}>
        {reg && <Field label={T('login.name')} id="login-name"><input type="text" id="login-name" autoComplete="name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /></Field>}
        <Field label={T('login.email')} id="login-email"><input type="email" id="login-email" autoComplete="username" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label={T('login.password')} id="login-password"><input type="password" id="login-password" autoComplete={reg ? 'new-password' : 'current-password'} maxLength={72} value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <p className="err" id="login-err" role="alert" hidden={!err}>{err}</p>
        <button className="btn" type="submit" id="login-submit">{reg ? T('login.create') : T('login.submit')}</button>
        {!isAdmin && <button type="button" className="linkbtn" id="toggle-reg" onClick={() => g.setRegistering(!reg)}>{reg ? T('login.toLogin') : T('login.toReg')}</button>}
      </form>
      <div className="hint">
        {T(isAdmin ? 'login.demoAdmin' : 'login.demoMember')} <code>{d.email}</code> / <code>{d.password}</code>{' '}
        <button type="button" className="linkbtn" id="demo-fill" style={{ display: 'inline' }}
          onClick={() => { setEmail(d.email); setPw(d.password); }}>{T('login.fill')}</button>
      </div>
    </>
  );
}

export default function Login() {
  const g = useGym();
  const isAdmin = g.loginRole === 'admin';
  const reg = !isAdmin && g.registering;
  const kind = isAdmin ? 'admin' : reg ? 'reg' : 'member';
  return (
    <div className="login">
      <div><h2>{T('login.' + kind + '.title')}</h2><p className="sub">{T('login.' + kind + '.sub')}</p></div>
      <div className="seg" role="group" aria-label={T('login.type')}>
        <button id="lr-member" aria-pressed={!isAdmin} onClick={() => { g.setLoginRole('member'); g.setRegistering(false); }}>{T('member')}</button>
        <button id="lr-admin" aria-pressed={isAdmin} onClick={() => { g.setLoginRole('admin'); g.setRegistering(false); }}>{T('admin')}</button>
      </div>
      <LoginForm key={kind} isAdmin={isAdmin} reg={reg} />
    </div>
  );
}
