import { useEffect, useState } from 'react';
import { I18N } from '../../i18n.js';

const T = (k, p) => I18N.t(k, p);

/* Input that keeps what the admin is typing, even while it is not a valid value yet.
   Valid values go to the draft immediately; on leaving the field it snaps back to the draft's value. */
export function Input({ id, type, value, onValid, spec, ...rest }) {
  const [txt, setTxt] = useState(String(value));
  const parse = (s) => {
    if (spec === 's') return s;
    if (spec === 'time') return /^\d\d:\d\d$/.test(s) ? s : undefined;
    let v = parseFloat(s);
    if (!isFinite(v) || v < spec.min) return undefined;
    if (spec.int) v = Math.round(v);
    if (spec.cents) v = Math.round(v * 100) / 100;
    return v;
  };
  useEffect(() => { if (parse(txt) !== value) setTxt(String(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <input id={id} type={type} value={txt} {...rest}
      onChange={(e) => { setTxt(e.target.value); const v = parse(e.target.value); if (v !== undefined) onValid(v); }}
      onBlur={() => setTxt(String(value))} />
  );
}

/* 24-hour time picker built from two selects, so it never shows AM/PM whatever the browser language is. */
export function TimeField({ id, value, onValid }) {
  const [h, m] = String(value).split(':');
  const two = (n) => String(n).padStart(2, '0');
  const hours = Array.from({ length: 24 }, (_, i) => two(i));
  const mins = Array.from({ length: 60 }, (_, i) => two(i));
  return (
    <div className="timesel">
      <select id={id} aria-label={T('a.class.time')} value={h} onChange={(e) => onValid(e.target.value + ':' + m)}>
        {hours.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span aria-hidden="true">:</span>
      <select id={id + '-min'} aria-label={T('a.class.time')} value={m} onChange={(e) => onValid(h + ':' + e.target.value)}>
        {mins.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </div>
  );
}

export function Field({ label, id, wide, children }) {
  return <div className={'field ' + (wide ? 'wide' : '')}><label htmlFor={id}>{label}</label>{children}</div>;
}

export function RemovedCard({ kind, o, onUndo }) {
  return (
    <div className="acard removed">
      <div className="rmline">
        <span><span className="pill bad">{T('chg.remove')}</span> <b className="struck">{o.name || T(kind === 'plan' ? 'plan.untitled' : 'row.untitled')}</b></span>
        <button className="btn ghost" id={'undo-' + kind + '-' + o.id} onClick={onUndo}>{T('a.undo')}</button>
      </div>
    </div>
  );
}

export const NewTag = () => <span className="pill accent newtag">{T('chg.add')}</span>;

