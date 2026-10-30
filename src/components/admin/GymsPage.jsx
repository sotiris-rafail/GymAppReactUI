import { useCallback, useEffect, useState } from 'react';
import { I18N } from '../../i18n.js';
import { api } from '../../api.js';
import { useGym } from '../../state.jsx';
import { Field } from './fields.jsx';

const T = (k, p) => I18N.t(k, p);
const EMPTY = { name: '', address: '', timeZone: '' };

/* Admin page: gyms. Changes are saved straight away. Needs "several gyms" switched on; the list and the switch-off check
   are always there so the owner can tidy up after switching it off. */
export default function GymsPage() {
  const g = useGym();
  const on = g.features.multiGym;
  const [list, setList] = useState([]);
  const [check, setCheck] = useState(null);
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const r = await Promise.all([api('GET', '/api/admin/gyms'), api('GET', '/api/admin/gyms/switch-off-check')]);
    setList(r[0]); setCheck(r[1]);
  }, []);
  useEffect(() => { g.refreshFeatures(); g.run(load); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const act = (fn, msg) => g.run(async () => {
    try { await fn(); } catch (e) { if (e.status === 401) throw e; setErr(e.message); await load(); return; }
    setErr(''); await load(); await g.refreshGyms(); if (msg) g.toast(msg);
  });
  const add = () => act(async () => { await api('POST', '/api/admin/gyms', f); setF(EMPTY); }, T('gym.added'));
  const status = (x, s) => act(() => api('PUT', '/api/admin/gyms/' + x.id + '/status', { status: s }), T('gym.saved'));
  const makeDefault = (x) => act(() => api('PUT', '/api/admin/gyms/' + x.id + '/default'), T('gym.saved'));
  const moveMembers = (x) => act(() => api('POST', '/api/admin/gyms/' + x.id + '/move-members-to-default'), T('gym.saved'));
  const sharePlans = (x) => act(() => api('POST', '/api/admin/gyms/' + x.id + '/share-plans'), T('gym.saved'));
  const elsewhere = check ? check.gyms : [];
  return (
    <section aria-label={T('gym.aria')}>
      <div className="sec-h"><div><h2>{T('gym.title')}</h2><p className="sub">{T('gym.sub')}</p></div></div>
      {!on && <p className="note" id="gyms-off">{T('gym.off')}</p>}
      {err && <p className="note" id="gym-err" role="alert">{err}</p>}
      <div className="stack">
        {list.map((x) => (
          <div key={x.id} className="acard gymcard" id={'gym-' + x.id}>
            <div className="gym-h">
              <b>{x.name}</b>
              {x.isDefault && <span className="pill accent">{T('gym.default')}</span>}
              <span className={'pill ' + (x.status === 'ACTIVE' ? 'ok' : x.status === 'CLOSING' ? 'warn' : 'neutral')}>{T('gym.status.' + x.status)}</span>
              <span className="muted">{x.address}{x.timeZone ? ' · ' + x.timeZone : ''}</span>
            </div>
            <p className="sub">{T('gym.counts', { classes: x.classes, members: x.members, bookings: x.bookingsToCome })}</p>
            {on && (
              <div className="gym-actions">
                {!x.isDefault && x.status === 'ACTIVE' && <button className="btn ghost small" id={'gym-default-' + x.id} onClick={() => makeDefault(x)}>{T('gym.makeDefault')}</button>}
                {!x.isDefault && x.status === 'ACTIVE' && <button className="btn ghost small" id={'gym-close-' + x.id} onClick={() => status(x, 'CLOSING')}>{T('gym.stop')}</button>}
                {x.status === 'CLOSING' && <button className="btn ghost small" id={'gym-reopen-' + x.id} onClick={() => status(x, 'ACTIVE')}>{T('gym.reopen')}</button>}
                {x.status === 'CLOSING' && <button className="btn ghost small" id={'gym-archive-' + x.id} onClick={() => status(x, 'ARCHIVED')}>{T('gym.archive')}</button>}
                {x.status === 'ARCHIVED' && <button className="btn ghost small" id={'gym-restore-' + x.id} onClick={() => status(x, 'ACTIVE')}>{T('gym.restore')}</button>}
              </div>
            )}
          </div>
        ))}
        {on && (
          <div className="acard" id="gym-add">
            <div className="fields">
              <Field label={T('gym.name')} id="gym-new-name" wide><input id="gym-new-name" type="text" maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
              <Field label={T('gym.address')} id="gym-new-address" wide><input id="gym-new-address" type="text" maxLength={160} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
              <Field label={T('gym.zone')} id="gym-new-zone"><input id="gym-new-zone" type="text" maxLength={40} placeholder="Europe/Athens" value={f.timeZone} onChange={(e) => setF({ ...f, timeZone: e.target.value })} /></Field>
              <div className="field end"><button className="btn" id="gym-add-btn" disabled={!f.name.trim()} onClick={add}>{T('gym.add')}</button></div>
            </div>
          </div>
        )}
      </div>
      {check && (
        <div className="acard" id="switch-off-check">
          <h3>{T('gym.check.title')}</h3>
          <p className="sub">{T('gym.check.sub', { name: check.defaultGymName })}</p>
          {check.tidy ? <p id="check-tidy"><span className="pill ok">{T('gym.check.tidy')}</span></p> : (
            <div className="stack">
              {elsewhere.filter((o) => o.classes || o.members || o.bookingsToCome || o.plans || o.items).map((o) => (
                <div key={o.id} className="mrow" id={'check-' + o.id}>
                  <span><b>{o.name}</b> <span className="muted">{T('gym.check.row', { members: o.members, bookings: o.bookingsToCome, plans: o.plans, items: o.items })}</span></span>
                  <span className="massign">
                    {o.members > 0 && <button className="btn ghost small" id={'check-move-' + o.id} onClick={() => moveMembers(o)}>{T('gym.check.move')}</button>}
                    {o.plans > 0 && <button className="btn ghost small" id={'check-share-' + o.id} onClick={() => sharePlans(o)}>{T('gym.check.share')}</button>}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="sub">{T('gym.check.note')}</p>
        </div>
      )}
    </section>
  );
}
