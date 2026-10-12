import { I18N } from './i18n.js';
import { API_BASE } from './api.js';
import { useGym } from './state.jsx';
import { tSlot } from './util.js';
import { cfg } from './remote.js';
import Login from './components/Login.jsx';
import MemberView from './components/MemberView.jsx';
import AdminView from './components/AdminView.jsx';
import Modal from './components/Modal.jsx';

const T = (k, p) => I18N.t(k, p);

function Header() {
  const g = useGym();
  const dark = g.theme === 'dark';
  const themeLabel = T(dark ? 'theme.toLight' : 'theme.toDark');
  return (
    <header className="top">
      <div className="brand">{cfg.brand}<small>{T('tagline')}</small></div>
      <div className="who">
        {g.auth && (
          <>
            <span>{tSlot('signedInAs', {}, 'name', <b key="n">{g.isAdmin ? T('admin') : g.auth.name}</b>)}</span>
            <button className="btn ghost" id="logout" onClick={() => g.run(g.logout)}>{T('logout')}</button>
          </>
        )}
        <button className="btn ghost theme" id="theme" onClick={g.toggleTheme} aria-label={themeLabel} title={themeLabel}>
          {dark ? '☀' : '☾'}
        </button>
        <div className="seg langs" role="group" aria-label={T('language')}>
          {I18N.langs.map((l) => (
            <button key={l.code} id={'lang-' + l.code} lang={l.code} title={l.name}
              aria-pressed={I18N.lang === l.code} onClick={() => g.setLang(l.code)}>{l.label}</button>
          ))}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const g = useGym();
  let body;
  if (g.booting) body = <p className="muted status">{T('loading')}</p>;
  else if (g.fatalErr) body = <div className="note status">{T('fatal', { url: API_BASE, reason: g.fatalErr.message || T('networkError') })}</div>;
  else if (!g.auth) body = <Login />;
  else body = g.isAdmin ? <AdminView /> : <MemberView />;
  return (
    <>
      <Header />
      {cfg.banner && <div className="note" id="site-banner" role="status">{cfg.banner}</div>}
      {body}
      <footer className="foot"><span>{cfg.footer || T('footer', { url: API_BASE })}</span></footer>
      <Modal />
      <div className="toast-wrap">
        <div id="toast" className="toast" role="status" aria-live="polite" hidden={g.toastState.hidden}>{g.toastState.msg}</div>
      </div>
    </>
  );
}
