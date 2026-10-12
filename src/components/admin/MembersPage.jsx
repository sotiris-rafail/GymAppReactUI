import { I18N } from '../../i18n.js';
import { useGym } from '../../state.jsx';
import { TODAY, startOf, shortLabel } from '../../util.js';

const T = (k, p) => I18N.t(k, p);
const TN = (k, n, p) => I18N.tn(k, n, p);

function Attendance() {
  const g = useGym();
  const now = new Date();
  if (!g.attendance.length) return <div className="mrow"><span className="muted">{T('a.classes.none')}</span></div>;
  return g.attendance.map((c) => {
    const people = {};
    c.sessions.forEach((x) => x.attendees.forEach((a) => { people[a.id] = 1; }));
    const nMembers = Object.keys(people).length;
    return (
      <details className="att" key={c.classId} open={!!g.openClasses[c.classId]} onToggle={(e) => g.toggleOpenClass(c.classId, e.currentTarget.open)}>
        <summary>
          <span><b>{c.name || T('row.untitled')}</b> <span className="muted">{c.startTime}{c.coach ? T('row.with', { coach: c.coach }) : ''}</span></span>
          <span className="muted">{TN('a.att.bookings', c.totalBookings)}, {TN('a.att.members', nMembers)}</span>
        </summary>
        <div className="abody">
          {c.sessions.length ? c.sessions.map((x) => {
            const past = startOf(x.date, c.startTime) < now;
            return (
              <div className="asess" key={x.date}>
                <div className="ahead"><b>{shortLabel(x.date)}</b> <span className="muted">{c.startTime}</span>
                  <span className={'pill ' + (past ? 'neutral' : 'accent')}>{T(past ? 'a.att.attended' : 'a.att.upcoming')}</span>
                  <span className="muted">{x.attendees.length} / {c.capacity}</span></div>
                <div className="names">{x.attendees.map((a) => <span className="name" key={a.id}>{a.name}</span>)}</div>
              </div>
            );
          }) : <p className="muted">{T('a.att.none')}</p>}
        </div>
      </details>
    );
  });
}

/* Admin page 3: members, their plans, and who attends which class this month */
export default function MembersPage() {
  const g = useGym();
  return (
    <>
      <section aria-label={T('a.members.aria')}>
        <div className="sec-h"><div><h2>{T('a.members.title')}</h2><p className="sub">{T('a.members.sub', { month: I18N.month(TODAY.getMonth()) })}</p></div></div>
        <div className="board" id="members-board">
          {!g.members.length && <div className="mrow"><span className="muted">{T('a.members.none')}</span></div>}
          {g.members.map((m) => {
            const changed = Object.prototype.hasOwnProperty.call(g.pending, m.id);
            const cur = changed ? g.pending[m.id] : m.planId;
            return (
              <div className="mrow" key={m.id}>
                <span><b>{m.name}</b> <span className="muted">{m.email}</span></span>
                <span className="massign">
                  <button className="btn ghost small" id={'hist-' + m.id} onClick={() => g.openHistory(m.id)}>{T('a.hist.btn')}</button>
                  {m.planName != null && <span className="muted">{T('a.members.visits', { used: m.visitsUsedThisMonth, total: m.visitsPerMonth })}</span>}
                  <select className={'plansel' + (changed ? ' changed' : '')} id={'mplan-' + m.id} value={cur == null ? '' : String(cur)}
                    aria-label={T('a.members.planFor', { name: m.name })}
                    onChange={(e) => g.choosePlan(m.id, e.target.value === '' ? null : Number(e.target.value))}>
                    <option value="">{T('a.members.noPlan')}</option>
                    {g.basePlans.map((p) => <option key={p.id} value={String(p.id)}>{p.name || T('plan.untitled')}</option>)}
                  </select>
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <section aria-label={T('a.att.title')}>
        <div className="sec-h"><div><h2>{T('a.att.title')} &middot; {I18N.month(TODAY.getMonth())} {TODAY.getFullYear()}</h2><p className="sub">{T('a.att.sub')}</p></div></div>
        <div className="board" id="attendance-board"><Attendance /></div>
      </section>
    </>
  );
}

