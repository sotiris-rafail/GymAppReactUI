import { useEffect, useRef } from 'react';
import { I18N } from '../i18n.js';
import { useGym } from '../state.jsx';
import Login from './Login.jsx';

const T = (k, p) => I18N.t(k, p);

/* The login / sign up form as an overlay on top of the home page. */
export default function LoginModal() {
  const g = useGym();
  const root = useRef(null);
  const close = () => g.setShowLogin(false);

  /* focus the first field on open; give focus back to the button that opened it on close */
  useEffect(() => {
    const first = root.current && root.current.querySelector('input');
    if (first) first.focus({ preventScroll: true });
    return () => {
      const b = document.getElementById('open-login');
      if (b) b.focus({ preventScroll: true });
    };
  }, []);

  /* A click on the page outside the dialog closes it, except in the top bar so the language and theme stay usable */
  useEffect(() => {
    const h = (e) => {
      const t = e.target;
      if (root.current && !root.current.contains(t) && !(t.closest && (t.closest('header.top') || t.closest('#open-login')))) close();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  /* Escape closes; Tab stays inside the dialog */
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab' || !root.current) return;
      const els = Array.from(root.current.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]'));
      if (!els.length) return;
      const i = els.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? els.length - 1 : i - 1) : (i === els.length - 1 ? 0 : i + 1);
      e.preventDefault();
      els[next].focus();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="scrim plain" id="login-scrim">
      <div className="dialog login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-title" ref={root}>
        <Login />
        <div className="dactions"><button className="btn ghost" id="login-close" onClick={close}>{T('login.cancel')}</button></div>
      </div>
    </div>
  );
}
