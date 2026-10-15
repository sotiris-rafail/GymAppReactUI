import { useState } from 'react';
import { I18N } from '../../i18n.js';
import { useGym } from '../../state.jsx';
import { Field } from './fields.jsx';
import { TODAY_K, label, isSundayKey } from '../../util.js';

const T = (k, p) => I18N.t(k, p);

/* Admin page 5: days with no classes. Changes here are saved straight away (no Save changes step). */
export default function ClosedPage() {
  const g = useGym();
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const upcoming = g.closedDays.filter((c) => c.date >= TODAY_K);
  const past = g.closedDays.filter((c) => c.date < TODAY_K);

  const add = (e) => {
    e.preventDefault();
    if (!date) { setErr(T('a.closed.needDate')); return; }
    if (isSundayKey(date)) { setErr(T('a.closed.sunday')); return; }
    setErr('');
    g.run(async () => {
      try { await g.addClosed(date, reason.trim()); setDate(''); setReason(''); }
      catch (er) { if (er.status === 401) throw er; setErr(er.message); }
    });
  };
  const row = (c) => (
    <div className="mrow" key={c.date} id={'closed-' + c.date}>
      <span><b>{label(c.date)}</b>{c.reason ? ' · ' + c.reason : ''}</span>
      <button className="btn ghost" id={'unclose-' + c.date} onClick={() => g.run(() => g.removeClosed(c.date))}>{T('a.closed.reopen')}</button>
    </div>
  );
  return (
    <section aria-label={T('a.closed.aria')}>
      <div className="sec-h"><div><h2>{T('a.closed.title')}</h2><p className="sub">{T('a.closed.sub')}</p></div></div>
      <form className="acard" id="closed-form" noValidate onSubmit={add}>
        <div className="fields">
          <Field label={T('a.closed.date')} id="closed-date"><input type="date" id="closed-date" min={TODAY_K} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={T('a.closed.reason')} id="closed-reason" wide><input type="text" id="closed-reason" maxLength={80} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        </div>
        <p className="err" id="closed-err" role="alert" hidden={!err}>{err}</p>
        <div><button className="btn" type="submit" id="closed-add">{T('a.closed.add')}</button></div>
      </form>
      <p className="sub">{T('a.closed.sundays')}</p>
      <div className="mylist" id="closed-list">
        {upcoming.length === 0 && <p className="muted">{T('a.closed.none')}</p>}
        {upcoming.map(row)}
      </div>
      {past.length > 0 && <details className="past"><summary>{T('a.closed.past', { n: past.length })}</summary><div className="mylist">{past.map(row)}</div></details>}
    </section>
  );
}
