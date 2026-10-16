import { I18N } from '../i18n.js';
import { useGym } from '../state.jsx';
import PromoBoard from './PromoBoard.jsx';
import { p2, money, startOf, label, shortLabel, toneOf, dayNames, parseKey, TODAY_K, isSundayKey, isLive, inBookingWindow } from '../util.js';

const T = (k, p) => I18N.t(k, p);
const TN = (k, n, p) => I18N.tn(k, n, p);

function Plan({ plan }) {
  return plan ? (
    <div className="plan-pick on" id="my-plan">
      <span className="pp-name">{plan.name || T('plan.untitled')}</span>
      <span className="pp-price"><b>{money(plan.price)}</b> {T('plan.perMonth')}</span>
      <span className="pp-visits">{TN('plan.visits', plan.visits)}</span>
      <span className="pill accent">{T('plan.yours')}</span>
    </div>
  ) : <p className="muted" id="no-plan">{T('plan.none')}</p>;
}

function Meter({ plan, mine, att, bk, cy, cm }) {
  if (!plan) return <div className="usage"><span className="muted">{T('plan.pickToStart')}</span></div>;
  const total = plan.visits, left = Math.max(0, total - mine.length);
  let bar = null;
  if (total > 0 && total <= 40) {
    bar = <div className="punch" aria-hidden="true">{Array.from({ length: total }, (_, i) => <i key={i} className={i < att ? 'att' : i < att + bk ? 'bk' : ''} />)}</div>;
  } else if (total > 40) {
    const aw = Math.min(100, att / total * 100), bw = Math.min(100 - aw, bk / total * 100);
    bar = <div className="bar" aria-hidden="true"><span className="a" style={{ width: aw + '%' }} /><span className="b" style={{ width: bw + '%' }} /></div>;
  }
  return (
    <div className="usage">
      <div className="usage-h"><strong>{I18N.month(cm)} {cy}</strong><span>{T('plan.used', { used: mine.length, total, left })}</span></div>
      {bar}
      <div className="legend">
        <span><i className="sw att" />{T('plan.attended', { n: att })}</span>
        <span><i className="sw bk" />{T('plan.booked', { n: bk })}</span>
        <span><i className="sw" />{T('plan.left', { n: left })}</span>
      </div>
    </div>
  );
}

/* null when open; otherwise the reason text: Sundays are always closed, other dates are closed by the admin */
function closedInfo(list, k, mode) {
  if (isSundayKey(k)) return T('cal.sunday');
  if (!inBookingWindow(k, mode)) return T('cal.outside.' + mode);
  const c = list.find((x) => x.date === k);
  return c ? (c.reason || T('cal.closed')) : null;
}

function Calendar() {
  const g = useGym();
  const { cy, cm, sel } = g.cal;
  const first = new Date(cy, cm, 1), offset = (first.getDay() + 6) % 7, dim = new Date(cy, cm + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(<span key={'b' + i} className="blank" />);
  for (let d = 1; d <= dim; d++) {
    const k = cy + '-' + p2(cm + 1) + '-' + p2(d);
    const ss = g.sessions[k] || [];
    const mineDay = ss.some((s) => s.mine);
    const closed = closedInfo(g.closedDays, k, g.bookingWindow);
    const cls = ['cell'];
    if (closed) cls.push('closed');
    if (k < TODAY_K) cls.push('past');
    if (k === TODAY_K) cls.push('today');
    if (k === sel) cls.push('sel');
    if (mineDay) cls.push('mine');
    const lbl = label(k) + ', ' + (closed ? T('cal.closed') : TN('cal.cls', ss.length)) + (mineDay ? ', ' + T('cal.youBooked') : '');
    cells.push(
      <button key={k} className={cls.join(' ')} id={'day-' + k} aria-label={lbl} aria-pressed={k === sel}
        onClick={() => {
          g.pickDay(k);
          try {
            if (window.matchMedia('(max-width:860px)').matches) {
              const calm = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
              setTimeout(() => { const p = document.getElementById('day-panel'); if (p) p.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' }); }, 0);
            }
          } catch (err) { /* scrolling is a nicety */ }
        }}>
        <span className="n">{d}</span>
        <span className="dots">{ss.map((s, i) => <span key={i} className={'dot ' + toneOf(s.capacity - s.booked, s.capacity)} />)}</span>
      </button>
    );
  }
  return (
    <section className="panel" aria-label={T('cal.aria')}>
      <div className="cal-h">
        <h2>{I18N.month(cm)} {cy}</h2>
        <div className="cal-nav">
          <button className="btn ghost" id="nav-prev" aria-label={T('cal.prev')} onClick={() => g.run(() => g.shiftMonth(-1))}>&lsaquo;</button>
          <button className="btn ghost" id="nav-today" onClick={() => g.run(g.goToday)}>{T('cal.today')}</button>
          <button className="btn ghost" id="nav-next" aria-label={T('cal.next')} onClick={() => g.run(() => g.shiftMonth(1))}>&rsaquo;</button>
        </div>
      </div>
      <div className="grid7">{dayNames().map((x, i) => <div key={i} className="wd">{x}</div>)}{cells}</div>
      <div className="legend cal-legend">
        <span><i className="sw ok" />{T('cal.open')}</span><span><i className="sw warn" />{T('cal.few')}</span>
        <span><i className="sw bad" />{T('cal.full')}</span><span><i className="sw mine" />{T('cal.mine')}</span>
        <span><i className="sw closed" />{T('cal.closed')}</span>
      </div>
    </section>
  );
}

function SessionRow({ s, plan, used }) {
  const g = useGym();
  const past = startOf(s.date, s.startTime) < new Date();
  const left = Math.max(0, s.capacity - s.booked);
  const tone = toneOf(left, s.capacity);
  const id = 'act-' + s.classId + '-' + s.date;
  let action;
  if (s.mine && past) action = <span className="pill neutral">{T('row.attended')}</span>;
  else if (s.mine) action = <><span className="pill accent">{T('row.booked')}</span><button className="btn ghost" id={id} onClick={() => g.run(() => g.cancelBooking(s.bookingId))}>{T('row.cancel')}</button></>;
  else if (past) action = <span className="muted">{T('row.ended')}</span>;
  else if (!plan) action = <button className="btn" id={id} disabled>{T('row.choosePlan')}</button>;
  else if (left === 0) action = <button className="btn" id={id} disabled>{T('row.full')}</button>;
  else if (used >= plan.visits) action = <button className="btn" id={id} disabled>{T('row.noVisits')}</button>;
  else action = <button className="btn" id={id} onClick={() => g.run(() => g.book(s.classId, s.date, s))}>{T('row.book')}</button>;
  return (
    <div className="row">
      <div className="rtime">{s.startTime}</div>
      <div>
        <div className="rname">{s.name || T('row.untitled')}</div>
        <div className="rmeta">{T('row.min', { n: s.durationMinutes })}{s.coach ? T('row.with', { coach: s.coach }) : ''}</div>
        <div className="cap">
          <span className="capbar"><span className={tone} style={{ width: Math.min(100, s.booked / s.capacity * 100) + '%' }} /></span>
          <span>{TN('row.cap', left, { booked: s.booked, cap: s.capacity, left })}</span>
          {left === 0 && <span className="pill bad">{T('row.full')}</span>}
        </div>
      </div>
      <div className="act">{action}</div>
    </div>
  );
}

function DayPanel({ plan }) {
  const g = useGym();
  const sel = g.cal.sel;
  const ss = g.sessions[sel] || [];
  const prefix = sel.slice(0, 7);
  const used = g.bookings.filter((b) => b.date.indexOf(prefix) === 0).length;
  const closed = closedInfo(g.closedDays, sel, g.bookingWindow);
  const blocked = !closed && plan && used >= plan.visits && sel >= TODAY_K;
  return (
    <section className="panel" id="day-panel" aria-label={T('day.aria')}>
      <div className="day-h"><h2>{label(sel)}</h2><p className="sub">{closed ? T('cal.closed') : ss.length ? TN('cal.cls', ss.length) : T('day.none')}</p></div>
      {blocked && <p className="note">{T('day.blocked', { n: plan.visits, plan: plan.name || T('day.yourPlan'), month: I18N.month(parseKey(sel).getMonth()) })}</p>}
      {closed ? <p className="empty" id="day-closed">{(isSundayKey(sel) ? T('day.closedSunday') : !inBookingWindow(sel, g.bookingWindow) ? T('day.outside.' + g.bookingWindow) : T('day.closed', { why: closed }))}</p> : !ss.length ? <p className="empty">{T('day.pick')}</p> : ss.map((s) => <SessionRow key={s.classId + s.date} s={s} plan={plan} used={used} />)}
    </section>
  );
}

function Upcoming() {
  const g = useGym();
  const now = new Date();
  const list = g.bookings.filter((b) => startOf(b.date, b.startTime) >= now);
  return (
    <section className="panel" aria-label={T('up.aria')}>
      <div className="sec-h"><h2>{T('up.title')}</h2></div>
      {list.length ? (
        <div className="mylist">
          {list.map((b) => (
            <div className="mrow" key={b.id}>
              <span><b>{shortLabel(b.date)}, {b.startTime}</b> {b.className || T('row.untitled')}</span>
              <button className="btn ghost" id={'up-' + b.id} onClick={() => g.run(() => g.cancelBooking(b.id))}>{T('row.cancel')}</button>
            </div>
          ))}
        </div>
      ) : <p className="muted">{T('up.none')}</p>}
      {list.length > 0 && <p className="sub">{T('up.hint')}</p>}
    </section>
  );
}

export default function MemberView() {
  const g = useGym();
  const plan = g.plans.find((p) => p.id === g.auth.planId) || null;
  const { cy, cm } = g.cal;
  const prefix = cy + '-' + p2(cm + 1);
  const mine = g.bookings.filter((b) => b.date.indexOf(prefix) === 0);
  const now = new Date();
  const att = mine.filter((b) => startOf(b.date, b.startTime) < now).length;
  return (
    <div className="page">
      <section aria-label={T('plan.section')}>
        <div className="sec-h"><div><h2>{T('plan.section')}</h2><p className="sub">{T('plan.sub')}</p></div></div>
        <div className="plans single"><Plan plan={plan} /></div>
        <Meter plan={plan} mine={mine} att={att} bk={mine.length - att} cy={cy} cm={cm} />
      </section>
      <div className="main"><Calendar /><DayPanel plan={plan} /></div>
      <Upcoming />
      {g.basePromos.some(isLive) && (
        <section aria-label={T('promo.news')}>
          <div className="sec-h"><div><h2>{T('promo.news')}</h2></div></div>
          <PromoBoard items={g.basePromos.filter(isLive)} />
        </section>
      )}
    </div>
  );
}
