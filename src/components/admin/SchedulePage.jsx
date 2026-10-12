import { I18N } from '../../i18n.js';
import { useGym } from '../../state.jsx';
import { dayNames } from '../../util.js';
import { Field, Input, TimeField, NewTag, RemovedCard } from './fields.jsx';

const T = (k, p) => I18N.t(k, p);

function Board() {
  const g = useGym();
  return (
    <div className="board" id="board">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => {
        const list = g.classes.filter((c) => !c.removed && c.days.includes(i)).sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
        return (
          <div className="brow" key={i}>
            <div className="bday">{I18N.day(i - 1)}</div>
            <div className="bitems">
              {list.length ? list.map((c) => <span className="bitem" key={c.id}><b>{c.time}</b>{c.name || T('row.untitled')}<em>{T('a.board.max', { n: c.capacity })}</em></span>) : <span className="muted">{T('a.board.none')}</span>}
            </div>
          </div>
        );
      })}
    </div>
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
                    <button key={i} className="chip-btn" id={'chip-' + c.id + '-' + (i + 1)} aria-pressed={c.days.includes(i + 1)} onClick={() => g.toggleDay(c.id, i + 1)}>{n}</button>
                  ))}
                </div>
              </div>
              <div><button className="btn danger" id={'del-class-' + c.id} onClick={() => g.removeClass(c.id)}>{T('a.class.remove')}</button></div>
            </div>
          ))}
          <button className="btn ghost add" id="add-class" onClick={g.addClass}>{T('a.classes.add')}</button>
        </div>
      </section>
      <section aria-label={T('a.board.aria')}>
        <div className="sec-h"><div><h2>{T('a.board.title')}</h2><p className="sub">{T('a.board.sub')}</p></div></div>
        <Board />
      </section>
    </>
  );
}

