import { useState } from 'react';
import { I18N } from '../../i18n.js';
import { useGym } from '../../state.jsx';
import { dayNames, key, isoDay, isSundayKey, TODAY_K } from '../../util.js';
import { Field, Input, TimeField, NewTag, RemovedCard } from './fields.jsx';

const T = (k, p) => I18N.t(k, p);

const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7));
const readView = () => { try { return localStorage.getItem('foundry.schedView') === 'month' ? 'month' : 'week'; } catch (e) { return 'week'; } };

/* Classes that run on one date, from the draft (so the admin sees edits before saving). Null when the gym is closed. */
function dayInfo(g, d) {
  const k = key(d);
  const closed = isSundayKey(k) ? T('cal.sunday') : (g.closedDays.find((c) => c.date === k) ? (g.closedDays.find((c) => c.date === k).reason || T('cal.closed')) : null);
  const list = closed ? [] : g.classes.filter((c) => !c.removed && c.days.includes(isoDay(d))).sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  return { k, closed, list };
}

const Items = ({ list }) => list.map((c) => <span className="bitem" key={c.id}><b>{c.time}</b>{c.name || T('row.untitled')}<em>{T('a.board.max', { n: c.capacity })}</em></span>);

function Board({ view, anchor }) {
  const g = useGym();
  if (view === 'week') {
    const mon = mondayOf(anchor);
    return (
      <div className="board" id="board">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const d = addDays(mon, i), info = dayInfo(g, d);
          return (
            <div className={'brow' + (info.closed ? ' closed' : '')} key={i} id={'brow-' + info.k}>
              <div className="bday">{I18N.day(i)}<small>{d.getDate()} {I18N.monthShort(d.getMonth())}</small></div>
              <div className="bitems">
                {info.closed ? <span className="muted">{info.closed}</span>
                  : info.list.length ? <Items list={info.list} /> : <span className="muted">{T('a.board.none')}</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  const y = anchor.getFullYear(), m = anchor.getMonth();
  const first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7, dim = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(<span key={'b' + i} className="mblank" />);
  for (let n = 1; n <= dim; n++) {
    const info = dayInfo(g, new Date(y, m, n));
    cells.push(
      <div key={n} id={'mcell-' + info.k} className={'mcell' + (info.closed ? ' closed' : '') + (info.k === TODAY_K ? ' today' : '')}>
        <span className="mn">{n}</span>
        {info.closed ? <span className="mclosed">{info.closed}</span>
          : info.list.map((c) => <span className="mitem" key={c.id}><b>{c.time}</b> {c.name || T('row.untitled')}</span>)}
      </div>
    );
  }
  return (
    <div className="board mboard" id="board">
      <div className="mgrid">{dayNames().map((x, i) => <div key={i} className="wd">{x}</div>)}{cells}</div>
    </div>
  );
}

function Timetable() {
  const [view, setView] = useState(readView);
  const [anchor, setAnchor] = useState(() => new Date());
  const pick = (v) => { setView(v); try { localStorage.setItem('foundry.schedView', v); } catch (e) { /* optional */ } };
  const step = (n) => setAnchor((a) => (view === 'week' ? addDays(a, 7 * n) : new Date(a.getFullYear(), a.getMonth() + n, 1)));
  const mon = mondayOf(anchor), sun = addDays(mon, 6);
  const title = view === 'week'
    ? mon.getDate() + ' ' + I18N.monthShort(mon.getMonth()) + ' – ' + sun.getDate() + ' ' + I18N.monthShort(sun.getMonth()) + ' ' + sun.getFullYear()
    : I18N.month(anchor.getMonth()) + ' ' + anchor.getFullYear();
  return (
    <section aria-label={T('a.board.aria')}>
      <div className="sec-h"><div><h2>{T('a.board.title')}</h2><p className="sub">{T('a.board.sub')}</p></div></div>
      <div className="bar-row">
        <div className="seg" role="group" aria-label={T('a.board.view')}>
          <button id="view-week" aria-pressed={view === 'week'} onClick={() => pick('week')}>{T('a.board.week')}</button>
          <button id="view-month" aria-pressed={view === 'month'} onClick={() => pick('month')}>{T('a.board.month')}</button>
        </div>
        <div className="cal-nav">
          <button className="btn ghost" id="sched-prev" aria-label={T('a.board.prev')} onClick={() => step(-1)}>&lsaquo;</button>
          <strong id="sched-title" aria-live="polite">{title}</strong>
          <button className="btn ghost" id="sched-today" onClick={() => setAnchor(new Date())}>{T('cal.today')}</button>
          <button className="btn ghost" id="sched-next" aria-label={T('a.board.next')} onClick={() => step(1)}>&rsaquo;</button>
        </div>
      </div>
      <Board view={view} anchor={anchor} />
    </section>
  );
}

/* Admin page 2: classes and the weekly timetable */
export default function SchedulePage() {
  const g = useGym();
  return (
    <>
      <section aria-label={T('a.classes.aria')}>
        <div className="sec-h"><div><h2>{T('a.classes.title')}</h2><p className="sub">{T('a.classes.sub')}</p></div></div>
        <div className="stack">
          {g.classes.length === 0 && <p className="muted">{T('a.classes.none')}</p>}
          {g.classes.map((c) => c.removed ? <RemovedCard key={c.id} kind="class" o={c} onUndo={() => g.undoClass(c.id)} /> : (
            <div key={c.id} className={'acard' + (c.isNew ? ' isnew' : '')}>
              {c.isNew && <NewTag />}
              <div className="fields">
                <Field label={T('a.class.name')} id={'class-name-' + c.id} wide>
                  <Input id={'class-name-' + c.id} type="text" spec="s" maxLength={40} value={c.name} onValid={(v) => g.editClass(c.id, { name: v })} />
                </Field>
                <Field label={T('a.class.coach')} id={'class-coach-' + c.id}>
                  <Input id={'class-coach-' + c.id} type="text" spec="s" maxLength={40} value={c.coach} onValid={(v) => g.editClass(c.id, { coach: v })} />
                </Field>
                <Field label={T('a.class.time')} id={'class-time-' + c.id}>
                  <TimeField id={'class-time-' + c.id} value={c.time} onValid={(v) => g.editClass(c.id, { time: v })} />
                </Field>
                <Field label={T('a.class.length')} id={'class-duration-' + c.id}>
                  <Input id={'class-duration-' + c.id} type="number" spec={{ min: 5, int: true }} min="5" max="240" step="5" inputMode="numeric" value={c.duration} onValid={(v) => g.editClass(c.id, { duration: v })} />
                </Field>
                <Field label={T('a.class.max')} id={'class-capacity-' + c.id}>
                  <Input id={'class-capacity-' + c.id} type="number" spec={{ min: 1, int: true }} min="1" max="200" step="1" inputMode="numeric" value={c.capacity} onValid={(v) => g.editClass(c.id, { capacity: v })} />
                </Field>
              </div>
              <div>
                <div className="lab" style={{ marginBottom: 6 }}>{T('a.class.repeats')}</div>
                <div className="chips">
                  {dayNames().map((n, i) => (
                    i === 6
                    ? <button key={i} className="chip-btn" id={'chip-' + c.id + '-7'} aria-pressed="false" disabled title={T('a.class.sunday')}>{n}</button>
                    : <button key={i} className="chip-btn" id={'chip-' + c.id + '-' + (i + 1)} aria-pressed={c.days.includes(i + 1)} onClick={() => g.toggleDay(c.id, i + 1)}>{n}</button>
                  ))}
                </div>
              </div>
              <div><button className="btn danger" id={'del-class-' + c.id} onClick={() => g.removeClass(c.id)}>{T('a.class.remove')}</button></div>
            </div>
          ))}
          <button className="btn ghost add" id="add-class" onClick={g.addClass}>{T('a.classes.add')}</button>
        </div>
      </section>
      <Timetable />
    </>
  );
}

