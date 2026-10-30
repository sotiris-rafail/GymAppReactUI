import { useCallback, useEffect, useState } from 'react';
import { I18N } from '../../i18n.js';
import { useGym } from '../../state.jsx';
import { api } from '../../api.js';
import { Field } from './fields.jsx';
import { fmtDate } from '../../util.js';

const T = (k, p) => I18N.t(k, p);
const EMPTY = { subject: '', body: '', linkUrl: '', gymId: '' };
const toBody = (f) => ({ ...f, gymId: f.gymId === '' || f.gymId == null ? null : Number(f.gymId) });

/* One marketing email: a draft can be edited, sent or deleted; a sent one is a record with delivery counts. */
function Campaign({ c, status, busy, onSave, onSend, onDelete }) {
  const g = useGym();
  const multi = g.features.multiGym;
  const [f, setF] = useState({ subject: c.subject, body: c.body, linkUrl: c.linkUrl, gymId: c.gymId == null ? '' : c.gymId });
  const [aud, setAud] = useState(status.optedIn);
  useEffect(() => { // who this email would reach, for the chosen audience
    if (!multi || c.status === 'SENT') { setAud(status.optedIn); return undefined; }
    let alive = true;
    api('GET', '/api/admin/marketing/status?gymId=' + f.gymId).then((s) => { if (alive && s) setAud(s.optedIn); }).catch(() => {});
    return () => { alive = false; };
  }, [f.gymId, multi, status.optedIn]); // eslint-disable-line react-hooks/exhaustive-deps
  const [err, setErr] = useState('');
  const id = (n) => 'mk-' + n + '-' + c.id;
  if (c.status === 'SENT') {
    return (
      <div className="acard campaign sent" id={'campaign-' + c.id}>
        <div className="rmline">
          <b>{c.subject}</b>
          <span className="pill accent">{T('a.mk.sent')}</span>
        </div>
        <p className="muted small" id={id('when')}>{T('a.mk.sentOn', { date: fmtDate(c.sentAt), n: c.recipients })}</p>
        <p className="small" id={id('counts')}>
          {T('a.mk.delivered', { n: c.delivered })} · {T('a.mk.waiting', { n: c.waiting })} · {T('a.mk.failed', { n: c.failed })} · {T('a.mk.skipped', { n: c.skipped })}
        </p>
        <details><summary>{T('a.mk.showText')}</summary><pre className="campaign-text">{c.body}{c.linkUrl ? '\n\n' + c.linkUrl : ''}</pre></details>
      </div>
    );
  }
  const dirty = f.subject !== c.subject || f.body !== c.body || f.linkUrl !== c.linkUrl || String(f.gymId) !== String(c.gymId == null ? '' : c.gymId);
  const save = async () => { setErr(''); try { await onSave(c.id, toBody(f)); } catch (e) { setErr(e.message); } };
  const send = async () => {
    setErr('');
    if (dirty) { try { await onSave(c.id, f); } catch (e) { setErr(e.message); return; } }
    if (!window.confirm(T('a.mk.confirm', { n: aud }))) return;
    try { await onSend(c.id); } catch (e) { setErr(e.message); }
  };
  return (
    <div className="acard campaign" id={'campaign-' + c.id}>
      <div className="fields">
        <Field label={T('a.mk.subject')} id={id('subject')} wide>
          <input type="text" id={id('subject')} maxLength={150} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
        </Field>
        {multi && (
          <Field label={T('a.gym.audience')} id={id('gym')}>
            <select id={id('gym')} className="sel" value={String(f.gymId)} onChange={(e) => setF({ ...f, gymId: e.target.value })}>
              <option value="">{T('a.gym.allMembers')}</option>
              {g.gyms.map((x) => <option key={x.id} value={String(x.id)}>{x.name}</option>)}
            </select>
          </Field>
        )}
        <Field label={T('a.mk.body')} id={id('body')} wide>
          <textarea id={id('body')} rows={6} maxLength={3000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        </Field>
        <Field label={T('a.mk.link')} id={id('link')} wide>
          <input type="url" id={id('link')} maxLength={500} placeholder="https://" value={f.linkUrl} onChange={(e) => setF({ ...f, linkUrl: e.target.value.trim() })} />
        </Field>
      </div>
      <p className="err" id={id('err')} role="alert" hidden={!err}>{err}</p>
      <div className="promo-row">
        <span className="sbtns">
          <button className="btn ghost" id={id('save')} disabled={busy || !dirty} onClick={save}>{T('a.mk.saveDraft')}</button>
          <button className="btn" id={id('send')} disabled={busy || !status.mailEnabled || aud === 0 || !f.subject.trim() || !f.body.trim()} onClick={send}>{T('a.mk.send', { n: aud })}</button>
          <button className="btn danger" id={id('delete')} disabled={busy} onClick={() => onDelete(c.id)}>{T('a.remove')}</button>
        </span>
      </div>
    </div>
  );
}

/* Admin page: write a marketing email and send it to every member who turned on "Marketing emails". Saves straight away. */
export default function MarketingPage() {
  const g = useGym();
  const [list, setList] = useState([]);
  const [status, setStatus] = useState({ mailEnabled: true, optedIn: 0 });
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [l, s] = await Promise.all([api('GET', '/api/admin/marketing'), api('GET', '/api/admin/marketing/status')]);
    setList(l || []); setStatus(s || { mailEnabled: false, optedIn: 0 }); setLoaded(true);
  }, []);
  useEffect(() => { g.run(load); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* every action ends by reloading the list, so the delivery counts are always the server's */
  const act = async (fn) => {
    setBusy(true);
    try { await fn(); await load(); }
    finally { setBusy(false); }
  };
  const create = (e) => {
    e.preventDefault();
    setErr('');
    if (!f.subject.trim() || !f.body.trim()) { setErr(T('a.mk.needText')); return; }
    g.run(async () => {
      try { await act(() => api('POST', '/api/admin/marketing', toBody(f))); setF(EMPTY); g.toast(T('a.mk.draftSaved')); }
      catch (er) { if (er.status === 401) throw er; setErr(er.message); }
    });
  };
  const save = (id, body) => act(() => api('PUT', '/api/admin/marketing/' + id, body)).then(() => g.toast(T('a.mk.draftSaved')));
  const send = (id) => act(() => api('POST', '/api/admin/marketing/' + id + '/send')).then(() => g.toast(T('a.mk.queued')));
  const del = (id) => { if (window.confirm(T('a.mk.deleteConfirm'))) g.run(() => act(() => api('DELETE', '/api/admin/marketing/' + id))); };

  const drafts = list.filter((c) => c.status === 'DRAFT');
  const sentList = list.filter((c) => c.status === 'SENT');
  return (
    <section aria-label={T('a.mk.aria')}>
      <div className="sec-h"><div><h2>{T('a.mk.title')}</h2><p className="sub">{T('a.mk.sub')}</p></div></div>
      {loaded && !status.mailEnabled && <p className="err" id="mk-off" role="alert">{T('a.mk.off')}</p>}
      <p className="muted" id="mk-audience">{T('a.mk.audience', { n: status.optedIn })}</p>
      <form className="acard" id="mk-form" noValidate onSubmit={create}>
        <h3>{T('a.mk.new')}</h3>
        <div className="fields">
          <Field label={T('a.mk.subject')} id="mk-subject" wide>
            <input type="text" id="mk-subject" maxLength={150} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
          </Field>
          {g.features.multiGym && (
            <Field label={T('a.gym.audience')} id="mk-gym">
              <select id="mk-gym" className="sel" value={String(f.gymId)} onChange={(e) => setF({ ...f, gymId: e.target.value })}>
                <option value="">{T('a.gym.allMembers')}</option>
                {g.gyms.map((x) => <option key={x.id} value={String(x.id)}>{x.name}</option>)}
              </select>
            </Field>
          )}
          <Field label={T('a.mk.body')} id="mk-body" wide>
            <textarea id="mk-body" rows={6} maxLength={3000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
            <span className="muted small">{T('a.mk.bodyHint')}</span>
          </Field>
          <Field label={T('a.mk.link')} id="mk-link" wide>
            <input type="url" id="mk-link" maxLength={500} placeholder="https://" value={f.linkUrl} onChange={(e) => setF({ ...f, linkUrl: e.target.value.trim() })} />
          </Field>
        </div>
        <p className="err" id="mk-err" role="alert" hidden={!err}>{err}</p>
        <div><button className="btn" type="submit" id="mk-create" disabled={busy}>{T('a.mk.saveDraft')}</button></div>
      </form>
      <h3 className="mk-h">{T('a.mk.drafts')}</h3>
      <div className="stack" id="mk-drafts">
        {drafts.length === 0 && <p className="muted">{T('a.mk.noDrafts')}</p>}
        {drafts.map((c) => <Campaign key={c.id + ':' + c.subject + c.body + c.linkUrl} c={c} status={status} busy={busy} onSave={save} onSend={send} onDelete={del} />)}
      </div>
      <h3 className="mk-h">{T('a.mk.history')}</h3>
      <div className="stack" id="mk-history">
        {sentList.length === 0 && <p className="muted">{T('a.mk.noHistory')}</p>}
        {sentList.map((c) => <Campaign key={c.id} c={c} status={status} busy={busy} />)}
      </div>
      {sentList.length > 0 && <div><button className="btn ghost" id="mk-refresh" onClick={() => g.run(load)}>{T('a.mk.refresh')}</button></div>}
    </section>
  );
}
