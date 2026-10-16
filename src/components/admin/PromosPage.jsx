import { useState } from 'react';
import { I18N } from '../../i18n.js';
import { useGym } from '../../state.jsx';
import { fileToDataUrl, safeImage, safeLink, instagramRef, isLive, TODAY_K, addDaysKey } from '../../util.js';
import Photo from '../Photo.jsx';
import PromoBoard from '../PromoBoard.jsx';
import { Field, NewTag, RemovedCard } from './fields.jsx';

const T = (k, p) => I18N.t(k, p);
const KINDS = ['PHOTO', 'INSTAGRAM', 'PROMO', 'CARD', 'TILE'];
const MAX_IMAGE = 1400000; // characters of the data URL; the server accepts up to 2,000,000

/* A picture chosen by upload or by web address. `field` is the item property, `names` the id parts the tests and labels use. */
function ImageField({ p, field, names, labels, set, children }) {
  const [err, setErr] = useState('');
  const [state, setState] = useState('ok');
  const value = p[field];
  const id = (n) => 'promo-' + n + '-' + p.id;
  const pick = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setErr('');
    if (!/^image\//.test(f.type)) { setErr(T('a.promo.notImage')); return; }
    try {
      const url = await fileToDataUrl(f);
      if (url.length > MAX_IMAGE) { setErr(T('a.promo.tooBig')); return; }
      set({ [field]: url });
    } catch (x) { setErr(T('a.promo.notImage')); }
  };
  const uploaded = value.startsWith('data:');
  const img = safeImage(value);
  return (
    <div className="promo-photo">
      {img && <Photo src={img} onState={setState} lazy={false} />}
      <div className="promo-photo-ctl">
        <span className="muted">{T(labels.title)}</span>
        <label className="btn ghost filebtn">
          {T('a.promo.upload')}
          <input type="file" accept="image/*" id={id(names.file)} onChange={pick} />
        </label>
        {!uploaded && (
          <div className="field grow">
            <label htmlFor={id(names.url)}>{T('a.promo.imageUrl')}</label>
            <input type="url" id={id(names.url)} placeholder="https://" maxLength={500} value={value} onChange={(e) => set({ [field]: e.target.value.trim() })} />
          </div>
        )}
        {value && <button className="btn ghost" id={id(names.remove)} onClick={() => set({ [field]: '' })}>{T('a.promo.removeImage')}</button>}
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      {img && state === 'failed' && <p className="err" id={id(names.err)} role="alert">{T('a.promo.photoFailed')}</p>}
      {value && !img && <p className="err" role="alert">{T('a.promo.photoBad')}</p>}
      {children}
    </div>
  );
}

/* Size field: a plain number, or empty for automatic */
function SizeInput({ id, label, max, value, onChange }) {
  return (
    <div className="field size-field">
      <label htmlFor={id}>{label}</label>
      <input type="number" id={id} min="1" max={max} step="1" inputMode="numeric" placeholder={T('a.promo.auto')} value={value || ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '') { onChange(0); return; }
          const n = Math.round(Number(v));
          if (isFinite(n)) onChange(Math.min(max, Math.max(1, n)));
        }} />
    </div>
  );
}

function ColorField({ p, set, id }) {
  const has = !!p.bgColor;
  return (
    <div className="color-field">
      <input type="color" id={id('bgcolor')} aria-label={T('a.promo.bgColor')} value={has ? p.bgColor : '#ffffff'} onChange={(e) => set({ bgColor: e.target.value })} />
      <input type="text" id={id('bgcolortext')} className="hex" aria-label={T('a.promo.bgColor')} placeholder="#rrggbb" maxLength={7} value={p.bgColor}
        onChange={(e) => { const v = e.target.value.trim(); if (v === '' || /^#?[0-9a-fA-F]{0,6}$/.test(v)) set({ bgColor: v && v[0] !== '#' ? '#' + v : v }); }} />
      {has && <button type="button" className="btn ghost" id={id('nobgcolor')} onClick={() => set({ bgColor: '' })}>{T('a.promo.noBgColor')}</button>}
      {has && !/^#[0-9a-fA-F]{6}$/.test(p.bgColor) && <span className="err" id={id('bgcolorbad')}>{T('a.promo.bgColorBad')}</span>}
    </div>
  );
}

function PromoEditor({ p, index, count }) {
  const g = useGym();
  const set = (patch) => g.editPromo(p.id, patch);
  const id = (n) => 'promo-' + n + '-' + p.id;
  return (
    <div className={'acard' + (p.isNew ? ' isnew' : '')}>
      {p.isNew && <NewTag />}
      <div className="fields">
        <Field label={T('a.promo.kind')} id={id('kind')}>
          <select id={id('kind')} className="sel" value={p.kind} onChange={(e) => set({ kind: e.target.value })}>
            {KINDS.map((k) => <option key={k} value={k}>{T('promo.kind.' + k)}</option>)}
          </select>
        </Field>
        <Field label={T('a.promo.title')} id={id('title')} wide>
          <input type="text" id={id('title')} maxLength={80} value={p.title} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label={T('a.promo.body')} id={id('body')} wide>
          <textarea id={id('body')} rows={3} maxLength={500} value={p.body} onChange={(e) => set({ body: e.target.value })} />
        </Field>
        {p.kind === 'CARD' && (
          <Field label={T('a.promo.content')} id={id('content')} wide>
            <textarea id={id('content')} rows={7} maxLength={20000} spellCheck="false" value={p.content} onChange={(e) => set({ content: e.target.value })} />
            <span className="muted small">{T('a.promo.contentHint')}</span>
          </Field>
        )}
        <Field label={T('a.promo.link')} id={id('link')} wide>
          <input type="url" id={id('link')} maxLength={500} placeholder="https://" value={p.link} onChange={(e) => set({ link: e.target.value.trim() })} />
          {p.kind === 'TILE' && <span className={safeLink(p.link) ? 'muted small' : 'err small'} id={id('tile-hint')}>{T('a.promo.tileHint')}</span>}
        </Field>
      </div>
      {p.kind !== 'TILE' && <ImageField p={p} field="image" set={set} labels={{ title: 'a.promo.image' }} names={{ file: 'file', url: 'image', remove: 'noimg', err: 'photo-err' }}>
        {p.kind === 'INSTAGRAM' && <p className="muted small">{T('a.promo.igHint')}</p>}
        {p.kind === 'INSTAGRAM' && safeLink(p.link) && !instagramRef(p.link) && <p className="err" id={id('ig-bad')} role="alert">{T('a.promo.igBad')}</p>}
      </ImageField>}
      <div className="fields">
        <Field label={T('a.promo.bgColor')} id={id('bgcolortext')}><ColorField p={p} set={set} id={id} /></Field>
      </div>
      <ImageField p={p} field="bgImage" set={set} labels={{ title: 'a.promo.bgImage' }} names={{ file: 'bgfile', url: 'bgimage', remove: 'nobgimg', err: 'bgphoto-err' }} />
      <div className="fields">
        <Field label={T('a.promo.hideOn')} id={id('hideon')}>
          <div className="promo-limit">
            <input type="date" id={id('hideon')} min={TODAY_K} value={p.hideOn} onChange={(e) => set({ hideOn: e.target.value })} />
            {[[3, 'a.promo.d3'], [7, 'a.promo.d7'], [30, 'a.promo.d30']].map(([n, t]) => (
              <button type="button" key={n} className="btn ghost" id={id('hide' + n)} onClick={() => set({ hideOn: addDaysKey(n) })}>{T(t)}</button>
            ))}
            {p.hideOn && <button type="button" className="btn ghost" id={id('hideclear')} onClick={() => set({ hideOn: '' })}>{T('a.promo.noLimitBtn')}</button>}
          </div>
          <span className="muted small" id={id('hidenote')}>
            {!p.hideOn ? T('a.promo.hideNone') : p.hideOn <= TODAY_K ? T('a.promo.expired') : T('a.promo.hideNote', { date: p.hideOn })}
          </span>
        </Field>
        <Field label={T('a.promo.size')} id={id('cols')}>
          <div className="promo-size">
            <SizeInput id={id('cols')} label={T('a.promo.width')} max={4} value={p.colSpan} onChange={(v) => set({ colSpan: v })} />
            <SizeInput id={id('rows')} label={T('a.promo.height')} max={8} value={p.rowSpan} onChange={(v) => set({ rowSpan: v })} />
          </div>
          <span className="muted small">{T('a.promo.sizeHint')}</span>
        </Field>
      </div>
      <div className="promo-row">
        <label className="check">
          <input type="checkbox" id={id('active')} checked={p.active} onChange={(e) => set({ active: e.target.checked })} /> {T('a.promo.active')}
        </label>
        <label className="check">
          <input type="checkbox" id={id('showtitle')} checked={p.showTitle} onChange={(e) => set({ showTitle: e.target.checked })} /> {T('a.promo.showTitle')}
        </label>
        <label className="check">
          <input type="checkbox" id={id('bordered')} checked={p.bordered} onChange={(e) => set({ bordered: e.target.checked })} /> {T('a.promo.bordered')}
        </label>
        <span className="sbtns">
          <button className="btn ghost" id={id('up')} disabled={index === 0} onClick={() => g.movePromo(p.id, -1)} aria-label={T('a.promo.up')} title={T('a.promo.up')}>↑</button>
          <button className="btn ghost" id={id('down')} disabled={index === count - 1} onClick={() => g.movePromo(p.id, 1)} aria-label={T('a.promo.down')} title={T('a.promo.down')}>↓</button>
          <button className="btn danger" id={'del-promo-' + p.id} onClick={() => g.removePromo(p.id)}>{T('a.remove')}</button>
        </span>
      </div>
    </div>
  );
}

/* Admin page 4: what the public home page shows */
export default function PromosPage() {
  const g = useGym();
  const shown = g.promos.filter((p) => !p.removed);
  return (
    <section aria-label={T('a.promos.aria')}>
      <div className="sec-h"><div><h2>{T('a.promos.title')}</h2><p className="sub">{T('a.promos.sub')}</p></div></div>
      <div className="stack">
        {g.promos.length === 0 && <p className="muted">{T('a.promos.none')}</p>}
        {g.promos.map((p) => {
          if (p.removed) return <RemovedCard key={p.id} kind="promo" o={{ ...p, name: p.title }} onUndo={() => g.undoPromo(p.id)} />;
          return <PromoEditor key={p.id} p={p} index={shown.indexOf(p)} count={shown.length} />;
        })}
        <button className="btn ghost add" id="add-promo" onClick={g.addPromo}>{T('a.promos.add')}</button>
      </div>
      <div className="sec-h preview-h"><div><h2>{T('a.promos.preview')}</h2></div></div>
      <PromoBoard items={shown.filter(isLive)} empty={T('home.empty')} />
    </section>
  );
}
