import { useEffect, useLayoutEffect, useRef } from 'react';
import { I18N } from '../i18n.js';
import { useGym } from '../state.jsx';
import { money, fmtDate, monthLabel } from '../util.js';

const T = (k, p) => I18N.t(k, p);
const TN = (k, n, p) => I18N.tn(k, n, p);

function ChangeLine({ l }) {
  if (l.text != null) return <li>{l.text}</li>;
  return <li><span className="muted">{l.label}:</span> {l.from} &rarr; <b>{l.to}</b></li>;
}

function SaveDialog({ m }) {
  const g = useGym();
  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="save-title">
      <h2 id="save-title">{T('a.save.title')}</h2>
      <p className="sub">{T('a.save.sub')}</p>
      <div className="dbody">
        {m.changes.length ? m.changes.map((c, i) => (
          <div className="chg" key={i}>
            <div className="chead"><span className={'pill ' + (c.kind === 'remove' ? 'bad' : c.kind === 'add' ? 'accent' : 'neutral')}>{T('chg.' + c.kind)}</span> <b>{c.title}</b></div>
            {c.lines.length > 0 && <ul>{c.lines.map((l, j) => <ChangeLine key={j} l={l} />)}</ul>}
          </div>
        )) : <p className="muted">{T('a.savebar.none')}</p>}
        {m.error && <p className="err" role="alert">{m.error}</p>}
      </div>
      <div className="dactions">
        <button className="btn ghost" id="save-cancel" data-autofocus disabled={m.saving} onClick={g.closeModal}>{T('a.save.cancel')}</button>
        <button className="btn" id="save-confirm" disabled={m.saving || !m.changes.length} onClick={g.confirmSave}>{T(m.saving ? 'a.save.saving' : 'a.save.confirm')}</button>
      </div>
    </div>
  );
}

function HistoryDialog({ m }) {
  const g = useGym();
  const d = m.data;
  let body;
  if (m.error) body = <p className="err">{m.error}</p>;
  else if (!d) body = <p className="muted">{T('loading')}</p>;
  else body = (
    <>
      <h3>{T('a.hist.plans')}</h3>
      {d.plans.length ? (
        <ul className="hlist">
          {d.plans.map((p, i) => (
            <li className="hrow" key={i}>
              <span><b>{p.planName}</b> <span className="muted">{money(Number(p.price))} {T('plan.perMonth')}, {p.unlimited ? T('plan.unlimited') : TN('plan.visits', p.visitsPerMonth)}</span></span>
              <span className="hdates">{fmtDate(p.from)} &ndash; {!p.to ? <span className="pill accent">{T('a.hist.active')}</span> : fmtDate(p.to)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="muted">{T('a.hist.none')}</p>}
      <h3>{T('a.hist.months')}</h3>
      <ul className="hlist">
        {d.months.map((x) => (
          <li className="hrow" key={x.month}>
            <span><b>{monthLabel(x.month)}</b> <span className="muted">{x.planName != null ? x.planName : T('a.hist.noPlanMonth')}</span></span>
            <span className="hv">{x.unlimited ? T('a.hist.usedUnlimited', { used: x.visits }) : x.visitsPerMonth != null ? T('a.hist.usedOf', { used: x.visits, total: x.visitsPerMonth }) : TN('a.hist.visitsUsed', x.visits)}</span>
          </li>
        ))}
      </ul>
    </>
  );
  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="hist-title">
      <h2 id="hist-title">{T('a.hist.title', { name: m.name })}</h2>
      <div className="dbody">{body}</div>
      <div className="dactions"><button className="btn" id="hist-close" data-autofocus onClick={g.closeModal}>{T('a.hist.close')}</button></div>
    </div>
  );
}

export default function Modal() {
  const g = useGym();
  const m = g.modal;
  const root = useRef(null);
  const close = g.closeModal;
  const last = useRef(null); // the dialog that was open, so focus can go back to the button that opened it

  /* when a dialog closes, put focus back on the button that opened it (right after the DOM updates) */
  useLayoutEffect(() => {
    if (m) { last.current = m; return; }
    const prev = last.current;
    last.current = null;
    if (!prev) return;
    const b = document.getElementById(prev.type === 'save' ? 'save-page' : 'hist-' + prev.id);
    if (b && !b.disabled) b.focus({ preventScroll: true });
  }, [m]);

  /* focus the first button when a dialog opens (or its type changes), and keep Tab inside it */
  useEffect(() => {
    if (!m || !root.current) return;
    const c = root.current.querySelector('[data-autofocus]:not([disabled])') || root.current.querySelector('button:not([disabled])');
    if (c) c.focus({ preventScroll: true });
  }, [m && m.type]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!m) return undefined;
    const h = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') {
        const bs = Array.from(document.querySelectorAll('#modal-root button:not([disabled])'));
        e.preventDefault();
        if (!bs.length) return;
        let i = bs.indexOf(document.activeElement);
        i = e.shiftKey ? (i <= 0 ? bs.length - 1 : i - 1) : (i + 1) % bs.length;
        bs[i].focus();
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [m, close]);

  return (
    <div id="modal-root" ref={root}>
      {m && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          {m.type === 'save' ? <SaveDialog m={m} /> : <HistoryDialog m={m} />}
        </div>
      )}
    </div>
  );
}
