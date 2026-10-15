import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { I18N } from '../i18n.js';
import Photo from './Photo.jsx';
import { safeImage, safeLink, cleanHtml, instagramRef } from '../util.js';

const T = (k, p) => I18N.t(k, p);

/* The admin's background colour / picture for a tile. A colour gets black or white text, whichever reads better;
   a picture gets a dark fade and white text. */
function look(p) {
  const out = { cls: '', style: {} };
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(p.bgColor || '');
  if (m) {
    const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    out.cls += ' has-bgc';
    out.style.backgroundColor = p.bgColor;
    out.style.color = lum > 0.4 ? '#111111' : '#ffffff';
  }
  const bi = safeImage(p.bgImage);
  if (bi) {
    out.cls += ' has-bgi';
    out.style.backgroundImage = 'url(' + JSON.stringify(bi) + ')';
    out.style.color = '#ffffff';
  }
  return out;
}

/* class + inline style for a tile: its size and its background */
function tileProps(p, embed) {
  const sz = sizing(p, embed), lk = embed ? { cls: '', style: {} } : look(p);
  return { cls: sz.cls + lk.cls, style: { ...(sz.style || {}), ...lk.style } };
}

/* The admin's chosen tile size (0 = automatic). Instagram embeds are as tall as the post, so only their width counts. */
function sizing(p, embed) {
  const c = p.colSpan || 0, r = embed ? 0 : (p.rowSpan || 0);
  return {
    cls: (c ? ' sized-c' : '') + (r ? ' sized-r' : ''),
    style: c || r ? { ...(c ? { '--cs': c } : {}), ...(r ? { '--rs': r } : {}) } : undefined,
  };
}

/* The opened announcement: the whole photo (not cropped), title, description and the HTML text. */
function CardDialog({ p, onClose, opener }) {
  const root = useRef(null);
  const img = safeImage(p.image);
  const link = safeLink(p.link);
  useEffect(() => {
    const prev = document.activeElement;
    const close = root.current && root.current.querySelector('[data-autofocus]');
    if (close) close.focus({ preventScroll: true });
    const h = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } else if (e.key === 'Tab') { e.preventDefault(); if (close) close.focus(); } };
    document.addEventListener('keydown', h);
    return () => { document.removeEventListener('keydown', h); const o = opener.current || prev; if (o && o.focus) o.focus({ preventScroll: true }); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(
    <div className="scrim" id="card-scrim" ref={root} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog card-dialog" role="dialog" aria-modal="true" aria-labelledby="card-title">
        <div className="card-scroll">
          {img && <Photo className="card-full" src={img} alt={p.title} lazy={false} />}
          <h2 id="card-title">{p.title}</h2>
          {p.body && <p className="card-desc">{p.body}</p>}
          {p.content && <div className="card-html" id="card-html" dangerouslySetInnerHTML={{ __html: cleanHtml(p.content) }} />}
          {link && <a className="btn ghost promo-link" href={link} target="_blank" rel="noopener noreferrer">{T('promo.open')}</a>}
        </div>
        <div className="dactions"><button className="btn" id="card-close" data-autofocus onClick={onClose}>{T('promo.close')}</button></div>
      </div>
    </div>,
    document.body
  );
}

/* An announcement card: the photo fills the card (cropped), it lifts with a shadow on hover and opens on click. */
function AnnouncementCard({ p, sz }) {
  const [open, setOpen] = useState(false);
  const opener = useRef(null);
  const img = safeImage(p.image);
  const go = () => setOpen(true);
  return (
    <>
      <article ref={opener} className={'promo promo-card' + sz.cls + (p.bordered ? '' : ' nob')} style={sz.style} data-kind="CARD" role="button" tabIndex={0}
        aria-haspopup="dialog" aria-label={p.title} onClick={go}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }}>
        {img && <Photo className="promo-img" src={img} />}
        {(p.showTitle || p.body) && <div className="promo-body">
          {p.showTitle && <h3>{p.title}</h3>}
          {p.body && <p className="clamp">{p.body}</p>}
        </div>}
      </article>
      {open && <CardDialog p={p} opener={opener} onClose={() => setOpen(false)} />}
    </>
  );
}

/* An Instagram post or reel shown as the post itself (photos, carousels and videos play right here).
   Instagram's own embed does the drawing; it tells us how tall it is so the frame fits exactly. */
function InstagramEmbed({ p, post: r, link, sz }) {
  const frame = useRef(null);
  const [h, setH] = useState(620);
  useEffect(() => {
    const on = (e) => {
      if (!/^https:\/\/(www\.)?instagram\.com$/.test(e.origin) || !frame.current || e.source !== frame.current.contentWindow) return;
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        const height = d && d.type === 'MEASURE' && d.details && Number(d.details.height);
        if (height > 100 && height < 2500) setH(Math.ceil(height));
      } catch (err) { /* not a measurement */ }
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, []);
  return (
    <article className={'promo promo-instagram promo-ig-embed' + sz.cls + (p.bordered ? '' : ' nob')} style={sz.style} data-kind="INSTAGRAM">
      {p.showTitle && p.title && <div className="promo-body"><h3>{p.title}</h3></div>}
      <iframe ref={frame} className="ig-frame" title={p.title || 'Instagram'} loading="lazy" allowFullScreen scrolling="no"
        style={{ height: h }} src={'https://www.instagram.com/' + r.type + '/' + r.code + '/embed/captioned/'}
        referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; fullscreen; picture-in-picture" />
      <div className="promo-body"><a className="btn ghost promo-link" href={link} target="_blank" rel="noopener noreferrer">{T('promo.openIg')}</a></div>
    </article>
  );
}

/* One home page item: an optional photo, a type badge, a title, some text and an optional link. */
function PromoCard({ p }) {
  if (p.kind === 'CARD') return <AnnouncementCard p={p} sz={tileProps(p)} />;
  const img = safeImage(p.image);
  const link = safeLink(p.link);
  const ig = p.kind === 'INSTAGRAM' && instagramRef(link);
  if (ig) return <InstagramEmbed p={p} post={ig} link={link} sz={tileProps(p, true)} />;
  return (
    <article className={'promo promo-' + p.kind.toLowerCase() + tileProps(p).cls + (p.bordered ? '' : ' nob')} style={tileProps(p).style} data-kind={p.kind}>
      {img && <Photo className="promo-img" src={img} alt={p.title} />}
      {(p.showTitle || p.body || link) && <div className="promo-body">
        {p.showTitle && <h3>{p.title}</h3>}
        {p.body && <p>{p.body}</p>}
        {link && <a className="btn ghost promo-link" href={link} target="_blank" rel="noopener noreferrer">{T(p.kind === 'INSTAGRAM' ? 'promo.openIg' : 'promo.open')}</a>}
      </div>}
    </article>
  );
}

/* The grid of items. Renders nothing when there are none and no empty text was asked for. */
export default function PromoBoard({ items, empty }) {
  if (!items.length) return empty ? <p className="muted" id="promo-empty">{empty}</p> : null;
  return <div className="promos" id="promo-board">{items.map((p) => <PromoCard key={p.id} p={p} />)}</div>;
}
