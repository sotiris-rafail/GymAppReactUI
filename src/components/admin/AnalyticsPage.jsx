import { useCallback, useEffect, useMemo, useState } from 'react';
import { I18N } from '../../i18n.js';
import { useGym } from '../../state.jsx';
import { api } from '../../api.js';
import { key, parseKey, shortLabel, money, TODAY, TODAY_K, fmtDate } from '../../util.js';
import { Field } from './fields.jsx';

const T = (k, p) => I18N.t(k, p);
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return key(d); };
const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
const PRESETS = ['w4', 'w12', 'year', 'custom'];
const presetRange = (p) => (p === 'w4' ? [addDays(TODAY_K, -27), TODAY_K] : p === 'year' ? [TODAY.getFullYear() + '-01-01', TODAY_K] : [addDays(TODAY_K, -83), TODAY_K]);

/* ---- small building blocks ------------------------------------------------------------------------------------ */

function Spark({ values }) {
  if (!values || values.length < 2) return null;
  const W = 96, H = 28, mn = Math.min(...values), mx = Math.max(...values);
  const X = (i) => 2 + (W - 8) * i / (values.length - 1);
  const Y = (v) => H - 4 - (H - 8) * (v - mn) / ((mx - mn) || 1);
  const last = values.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="spark" aria-hidden="true">
      <polyline points={values.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')} fill="none" stroke="var(--c-gray)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={X(last)} cy={Y(values[last])} r="4" fill="var(--c-blue)" stroke="var(--surface)" strokeWidth="2" />
    </svg>
  );
}

/* the change against the previous period: arrow + number + (named) what it is compared with */
function Delta({ change, unit, none }) {
  if (change == null) return <span className="t-sub">{none}</span>;
  if (change === 0) return <span className="t-sub">{T('an.same')}</span>;
  const up = change > 0;
  return <span className={'delta ' + (up ? 'ok' : 'bad')}>{up ? '▲' : '▼'} {Math.abs(change)}{unit}</span>;
}

function Tile({ id, label, value, extra, change, unit, none, sub, spark, hero }) {
  return (
    <div className={'pcard tile' + (hero ? ' hero' : '')} id={id}>
      <div className="t-label">{label}</div>
      <div className="t-value">{value}{extra && <span className="of"> {extra}</span>}</div>
      <div className="t-row"><Delta change={change} unit={unit} none={none} /><span className="t-sub">{sub}</span></div>
      <Spark values={spark} />
    </div>
  );
}

function Card({ id, title, sub, action, children }) {
  return (
    <div className="pcard card" id={id}>
      <div className="card-h"><div><h3>{title}</h3>{sub && <p className="sub2">{sub}</p>}</div>{action}</div>
      {children}
    </div>
  );
}

function HBars({ rows }) {
  const mx = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div className={'hbar' + (r.muted ? ' none' : '')} key={r.name}>
          <span className="hb-name">{r.name}</span>
          <span className="hb-track"><span className="hb-fill" style={{ width: (r.value / mx * 100).toFixed(1) + '%' }} /></span>
          <b className="hb-val">{r.label ?? r.value}</b>
          <span className={'hb-sub' + (r.low ? ' low' : '')}>{r.sub}</span>
        </div>
      ))}
    </div>
  );
}

function TableView({ head, rows }) {
  return (
    <table className="an-table">
      <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}

/* ---- charts ---------------------------------------------------------------------------------------------------- */

function LineChart({ series, bucket }) {
  const [hi, setHi] = useState(null);
  const W = 600, H = 240, L = 40, R = 30, Tp = 18, B = 30;
  const n = series.length;
  const top = Math.max(10, ...series.map((p) => p.bookings));
  const step = top <= 50 ? 10 : top <= 100 ? 25 : top <= 200 ? 50 : Math.pow(10, Math.floor(Math.log10(top))) / 2 * (top > 500 ? 2 : 1);
  const ymax = Math.ceil(top / step) * step;
  const X = (i) => (n < 2 ? L + (W - L - R) / 2 : L + (W - L - R) * i / (n - 1));
  const Y = (v) => Tp + (H - Tp - B) * (1 - v / ymax);
  const ticks = []; for (let t = 0; t <= ymax; t += step) ticks.push(t);
  const every = Math.max(1, Math.ceil(n / 6));
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * W;
    setHi(Math.max(0, Math.min(n - 1, Math.round((x - L) / ((W - L - R) / Math.max(1, n - 1))))));
  };
  const pts = series.map((p, i) => X(i).toFixed(1) + ',' + Y(p.bookings).toFixed(1)).join(' ');
  const area = n > 1 ? `M${X(0)},${Y(0)} ` + series.map((p, i) => `L${X(i).toFixed(1)},${Y(p.bookings).toFixed(1)}`).join(' ') + ` L${X(n - 1)},${Y(0)} Z` : '';
  const last = series[n - 1];
  const hp = hi != null ? series[hi] : null;
  const tipX = hp ? Math.min(Math.max(X(hi) - 69, 2), W - 142) : 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={T('an.line.aria', { first: series[0].bookings, last: last.bookings })} onMouseMove={move} onMouseLeave={() => setHi(null)}>
      {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} className="grid" /><text x={L - 8} y={Y(t) + 4} textAnchor="end" className="tick">{t}</text></g>)}
      {series.map((p, i) => i % every === 0 && <text key={p.date} x={X(i)} y={H - 8} textAnchor="middle" className="tick">{shortLabel(p.date).replace(/^\S+ /, '')}</text>)}
      {area && <path d={area} fill="var(--c-blue)" opacity=".10" />}
      <polyline points={pts} fill="none" stroke="var(--c-blue)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={X(n - 1)} cy={Y(last.bookings)} r="5" fill="var(--c-blue)" stroke="var(--surface)" strokeWidth="2" />
      {!hp && <text x={X(n - 1)} y={Y(last.bookings) - 12} textAnchor="end" className="endlbl">{last.bookings}</text>}
      {hp && <g>
        <line x1={X(hi)} x2={X(hi)} y1={Tp} y2={H - B} className="cross" />
        <circle cx={X(hi)} cy={Y(hp.bookings)} r="5" fill="var(--c-blue)" stroke="var(--surface)" strokeWidth="2" />
        <g className="tip" transform={`translate(${tipX},${Math.max(2, Y(hp.bookings) - 64)})`}>
          <rect width="140" height="52" rx="8" />
          <text x="12" y="20" className="tt1">{bucket === 'week' ? T('an.weekOf', { date: shortLabel(hp.date) }) : shortLabel(hp.date)}</text>
          <text x="12" y="40" className="tt2"><tspan className="tv">{hp.bookings}</tspan> {T('an.bookingsLc')}</text>
        </g>
      </g>}
    </svg>
  );
}

function Heatmap({ heat }) {
  const used = heat.map((r) => r.reduce((a, b) => a + b, 0));
  const hoursUsed = []; for (let h = 0; h < 24; h++) if (heat.some((r) => r[h] > 0)) hoursUsed.push(h);
  const h0 = hoursUsed.length ? Math.min(...hoursUsed, 8) : 6;
  const h1 = hoursUsed.length ? Math.max(...hoursUsed, 18) : 20;
  const hours = []; for (let h = h0; h <= h1; h++) hours.push(h);
  const rows = [0, 1, 2, 3, 4, 5, 6].filter((d) => d < 6 || used[d] > 0);
  let mx = 0, peak = null;
  rows.forEach((d) => hours.forEach((h) => { if (heat[d][h] > mx) { mx = heat[d][h]; peak = [d, h]; } }));
  const W = 620, L = 44, Tp = 8, cw = (W - L - 4) / hours.length, ch = 30, H = Tp + rows.length * (ch + 2) + 26;
  const level = (v) => (v <= 0 ? -1 : Math.min(5, Math.floor(v / mx * 6 - 1e-9)));
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={peak ? T('an.heat.aria', { day: I18N.dayFull(peak[0]), hour: String(peak[1]).padStart(2, '0') + ':00' }) : T('an.heat.none')}>
        {rows.map((d, r) => (
          <g key={d}>
            <text x={L - 10} y={Tp + r * (ch + 2) + ch / 2 + 4} textAnchor="end" className="tick">{I18N.day(d)}</text>
            {hours.map((h, k) => {
              const lv = level(heat[d][h]);
              return <rect key={h} x={L + k * cw + 1} y={Tp + r * (ch + 2)} width={cw - 2} height={ch} rx="4" fill={lv < 0 ? 'var(--surface-2)' : `var(--h${lv})`}><title>{I18N.dayFull(d)} {String(h).padStart(2, '0')}:00 — {heat[d][h]}</title></rect>;
            })}
          </g>
        ))}
        {hours.map((h, k) => h % 2 === 0 && <text key={h} x={L + k * cw + cw / 2} y={Tp + rows.length * (ch + 2) + 16} textAnchor="middle" className="tick">{String(h).padStart(2, '0')}</text>)}
        {peak && (() => { const r = rows.indexOf(peak[0]), k = hours.indexOf(peak[1]); return <rect x={L + k * cw + 1} y={Tp + r * (ch + 2)} width={cw - 2} height={ch} rx="4" fill="none" stroke="var(--ink)" strokeWidth="2" />; })()}
      </svg>
      <div className="rampleg"><span>{T('an.fewer')}</span><span className="ramp"><i style={{ background: 'var(--surface-2)' }} />{[0, 1, 2, 3, 4, 5].map((i) => <i key={i} style={{ background: `var(--h${i})` }} />)}</span><span>{T('an.more')}</span></div>
      {peak && <p className="insight" id="an-peak">{T('an.peak', { day: I18N.dayFull(peak[0]), hour: String(peak[1]).padStart(2, '0') + ':00' })}</p>}
    </>
  );
}

function Columns({ buckets }) {
  const W = 420, H = 210, L = 30, R = 8, Tp = 24, B = 40;
  const top = Math.max(5, ...buckets.map((b) => b.members));
  const mx = Math.ceil(top / 10) * 10;
  const slot = (W - L - R) / buckets.length, bw = 24;
  const Y = (v) => Tp + (H - Tp - B) * (1 - v / mx);
  const labels = ['an.u0', 'an.u1', 'an.u2', 'an.u3', 'an.u4', 'an.u5'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={T('an.usage.aria', { n: buckets[0].members })}>
      {[0, mx / 2, mx].map((t) => <g key={t}><line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} className="grid" /><text x={L - 8} y={Y(t) + 4} textAnchor="end" className="tick">{t}</text></g>)}
      {buckets.map((b, i) => {
        const x = L + i * slot + (slot - bw) / 2, y = Y(b.members), base = Y(0);
        const d = b.members > 0 ? `M${x},${base} V${y + 4} Q${x},${y} ${x + 4},${y} H${x + bw - 4} Q${x + bw},${y} ${x + bw},${y + 4} V${base} Z` : '';
        return (
          <g key={i}>
            {d && <path d={d} fill={i === 0 ? 'var(--c-blue)' : 'var(--c-gray)'}><title>{T(labels[i])}: {b.members}</title></path>}
            <text x={x + bw / 2} y={y - 6} textAnchor="middle" className={i === 0 ? 'valb' : 'val'}>{b.members}</text>
            <text x={x + bw / 2} y={H - 16} textAnchor="middle" className="tick">{T(labels[i])}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---- the page --------------------------------------------------------------------------------------------------- */

const csvCell = (v) => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
function toCsv(r) {
  const rows = [[T('an.bookings'), r.bookings.value], [T('an.csv.period'), r.from + ' - ' + r.to], [], [T('an.csv.date'), T('an.bookings')]];
  r.series.forEach((p) => rows.push([p.date, p.bookings]));
  rows.push([], [T('an.classes'), T('an.bookings'), T('an.fillRate') + ' %']);
  r.topClasses.forEach((c) => rows.push([c.name, c.bookings, c.fillPct ?? '']));
  rows.push([], [T('an.plans'), T('an.members'), T('an.monthly')]);
  r.planRows.forEach((p) => rows.push([p.name, p.members, p.monthly]));
  rows.push([T('an.noPlan'), r.noPlan, 0]);
  return rows.map((x) => x.map(csvCell).join(',')).join('\n');
}

export default function AnalyticsPage() {
  const g = useGym();
  const [preset, setPreset] = useState('w12');
  const [range, setRange] = useState(presetRange('w12'));
  const [custom, setCustom] = useState({ from: addDays(TODAY_K, -83), to: '' });
  const [err, setErr] = useState('');
  const [data, setData] = useState(null);
  const [tables, setTables] = useState({ line: false, heat: false });

  const load = useCallback(async (from, to) => {
    try { setData(await api('GET', '/api/admin/analytics?from=' + from + '&to=' + to)); setErr(''); }
    catch (e) {
      if (e.status === 401) throw e;
      if (e.status === 404) { setData(null); g.refreshFeatures(); return; } // switched off in the config server
      setErr(e.message);
    }
  }, []);
  const on = g.features.analytics;
  useEffect(() => { if (on) g.run(() => load(range[0], range[1])); }, [range, on, g.gymId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (p) => {
    setPreset(p);
    if (p !== 'custom') { setErr(''); setRange(presetRange(p)); }
  };
  const apply = () => {
    const to = custom.to || TODAY_K;
    if (!custom.from) return setErr(T('an.err.from'));
    if (custom.from > to) return setErr(T('an.err.order'));
    if (to > TODAY_K) return setErr(T('an.err.future'));
    if (daysBetween(custom.from, to) >= 366) return setErr(T('an.err.long'));
    setErr('');
    setRange([custom.from, to]);
  };
  const download = () => {
    const blob = new Blob(['﻿' + toCsv(data)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'analytics-' + data.from + '-to-' + data.to + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const r = data;
  const vs = r ? T('an.vsPrev') : '';
  const classRows = useMemo(() => (r ? r.topClasses.map((c) => ({ name: c.name, value: c.bookings, sub: c.fillPct == null ? '' : T('an.full', { n: c.fillPct }), low: c.fillPct != null && c.fillPct < r.lowFillPct })) : []), [r]);
  const empties = r ? r.topClasses.filter((c) => c.fillPct != null && c.fillPct < (r ? r.lowFillPct : 65) && r.topClasses.length > 1).sort((a, b) => a.fillPct - b.fillPct).slice(0, 2) : [];

  if (!on) {
    return (
      <section aria-label={T('an.aria')}>
        <div className="sec-h"><div><h2>{T('an.title')}</h2></div></div>
        <p className="err" id="an-off" role="alert">{T('an.off')}</p>
      </section>
    );
  }
  return (
    <section aria-label={T('an.aria')}>
      <div className="sec-h"><div><h2>{T('an.title')}</h2><p className="sub">{T('an.sub')}</p></div></div>
      <div className="an-bar">
        <div className="seg" role="group" aria-label={T('an.period')} id="an-presets">
          {PRESETS.map((p) => <button key={p} id={'an-' + p} aria-pressed={preset === p} onClick={() => pick(p)}>{T('an.p.' + p)}</button>)}
        </div>
        {preset === 'custom' && (
          <div className="range" id="an-range">
            <Field label={T('an.from')} id="an-from"><input type="date" id="an-from" max={TODAY_K} value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></Field>
            <span className="dash">–</span>
            <Field label={T('an.to')} id="an-to"><input type="date" id="an-to" max={TODAY_K} value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /><small>{T('an.toHint')}</small></Field>
            <button className="btn mini" id="an-apply" onClick={apply}>{T('an.apply')}</button>
          </div>
        )}
        <button className="btn ghost mini" id="an-csv" disabled={!r} onClick={download}>{T('an.csv')}</button>
      </div>
      <p className="err" id="an-err" role="alert" hidden={!err}>{err}</p>
      {r && <p className="muted small" id="an-range-now">{T('an.showing', { from: fmtDate(r.from), to: fmtDate(r.to), pfrom: fmtDate(r.previousFrom), pto: fmtDate(r.previousTo) })}</p>}
      {!r && !err && <p className="muted">{T('an.loading')}</p>}
      {r && (<>
        {r.multiGym && r.gymRows.length > 0 && (
          <Card id="an-c-gyms" title={T('an.gyms')} sub={T('an.gymsSub')}>
            <TableView head={[T('an.gym'), T('an.members'), T('an.bookings'), T('an.fillRate')]} rows={r.gymRows.map((x) => [x.name + (x.id === r.gymId ? ' •' : ''), x.members, x.bookings, x.fillPct == null ? '–' : x.fillPct + '%'])} />
          </Card>
        )}
        <section className="kpis">
          <Tile id="an-k-bookings" hero label={T('an.bookings')} value={r.bookings.value.toLocaleString()} change={r.bookings.change} unit="%" none={T('an.noBefore')} sub={vs} spark={r.bookings.spark} />
          <Tile id="an-k-fill" label={T('an.fillRate')} value={r.fill.value + '%'} change={r.fill.change} unit={' ' + T('an.pts')} none={T('an.noBefore')} sub={T('an.seatsBooked')} spark={r.fill.spark} />
          <Tile id="an-k-plan" label={T('an.withPlan')} value={r.withPlan.value} extra={T('an.ofMembers', { n: r.totalMembers })} change={r.withPlan.change} unit="" none="" sub={vs} spark={r.withPlan.spark} />
          <Tile id="an-k-usage" label={T('an.usage')} value={r.usage.value + '%'} change={r.usage.change} unit={' ' + T('an.pts')} none={T('an.noBefore')} sub={T('an.usageSub')} />
        </section>

        <section className="grid2">
          <Card id="an-c-line" title={T('an.perBucket.' + r.bucket)} sub={T('an.perBucketSub')}
            action={<button className="btn ghost mini" id="an-line-table" aria-pressed={tables.line} onClick={() => setTables({ ...tables, line: !tables.line })}>{tables.line ? T('an.chartView') : T('an.tableView')}</button>}>
            {r.bookings.value === 0 ? <p className="muted" id="an-line-empty">{T('an.nothing')}</p>
              : tables.line ? <TableView head={[T('an.csv.date'), T('an.bookings')]} rows={r.series.map((p) => [shortLabel(p.date), p.bookings])} />
              : <LineChart series={r.series} bucket={r.bucket} />}
          </Card>
          <Card id="an-c-classes" title={T('an.classes')} sub={T('an.classesSub')}>
            {classRows.length === 0 ? <p className="muted">{T('an.nothing')}</p> : <HBars rows={classRows} />}
            {empties.length > 0 && <p className="insight" id="an-empty-classes">{T('an.emptiest', { list: empties.map((c) => c.name + ' (' + c.fillPct + '%)').join(', ') })}</p>}
          </Card>
        </section>

        <section className="grid2 wide-left">
          <Card id="an-c-heat" title={T('an.when')} sub={T('an.whenSub')}
            action={<button className="btn ghost mini" id="an-heat-table" aria-pressed={tables.heat} onClick={() => setTables({ ...tables, heat: !tables.heat })}>{tables.heat ? T('an.chartView') : T('an.tableView')}</button>}>
            {r.bookings.value === 0 ? <p className="muted">{T('an.nothing')}</p>
              : tables.heat ? <TableView head={[T('an.day'), T('an.hour'), T('an.bookings')]} rows={r.heatmap.flatMap((row, d) => row.map((v, h) => [v, d, h]).filter((x) => x[0] > 0).map(([v, d2, h]) => [I18N.dayFull(d2), String(h).padStart(2, '0') + ':00', v]))} />
              : <Heatmap heat={r.heatmap} />}
          </Card>
          <Card id="an-c-plans" title={T('an.byPlan')} sub={T('an.byPlanSub')}>
            <HBars rows={[...r.planRows.map((p) => ({ name: p.name, value: p.members, sub: money(p.monthly) + T('an.perMonth') })), { name: T('an.noPlan'), value: r.noPlan, sub: T('an.notComing'), muted: true }]} />
            <p className="insight" id="an-plans-note">{T('an.plansNote', { total: r.totalMembers, with: r.totalMembers - r.noPlan, without: r.noPlan, income: money(r.monthlyIncome) })}</p>
          </Card>
        </section>

        <h3 className="mk-h">{T('an.now')}</h3>
        <section className="grid2 even">
          <Card id="an-c-usage" title={T('an.usageTitle')} sub={T('an.usageTitleSub')}>
            <Columns buckets={r.usageBuckets} />
            <p className="insight" id="an-unused">{T('an.unused', { n: r.unusedMembers })}</p>
          </Card>
          <Card id="an-c-follow" title={T('an.follow')} sub={T('an.followSub', { n: r.followUpDays })}>
            <div id="an-follow-list">
              {r.followUp.length === 0 && <p className="muted">{T('an.followNone')}</p>}
              {r.followUp.map((f) => <div className="mrow" key={f.name + f.plan}><span><b>{f.name}</b> <span className="muted">· {f.plan}</span></span><span className="muted">{f.daysAgo == null ? T('an.never') : T('an.daysAgo', { n: f.daysAgo })}</span></div>)}
            </div>
            {r.followUpTotal > r.followUp.length && <p className="muted small" id="an-follow-more">{T('an.followMore', { n: r.followUpTotal - r.followUp.length })}</p>}
          </Card>
        </section>
        <section className="grid2 even">
          <Card id="an-c-optin" title={T('an.optin')} sub={T('an.optinSub')}>
            <HBars rows={r.optIns.map((o) => ({ name: T('pref.' + o.key), value: o.pct, label: o.pct + '%', sub: '' }))} />
          </Card>
          <Card id="an-c-camp" title={T('an.campaigns')} sub={T('an.campaignsSub')}
            action={<button className="btn ghost mini" id="an-open-mk" onClick={() => g.navigate('/admin/marketing')}>{T('an.openMk')}</button>}>
            {r.campaigns.length === 0 && <p className="muted">{T('a.mk.noHistory')}</p>}
            {r.campaigns.map((c) => <div className="mrow" key={c.sentAt + c.subject}><span><b>{c.subject}</b> <span className="muted">· {fmtDate(c.sentAt)}</span></span><span className="muted">{T('an.sentFailed', { sent: c.delivered, failed: c.failed })}</span></div>)}
          </Card>
        </section>
      </>)}
    </section>
  );
}
