import { useState } from 'react';
import { I18N } from '../../i18n.js';
import { useGym } from '../../state.jsx';
import { TODAY, key, shortLabel } from '../../util.js';

const T = (k, p) => I18N.t(k, p);

/* Monday to Sunday of this week, and this calendar month, as the server works them out */
export function currentRanges() {
  const mon = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - ((TODAY.getDay() + 6) % 7));
  const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
  return { WEEK: shortLabel(key(mon)) + ' – ' + shortLabel(key(sun)), MONTH: I18N.month(TODAY.getMonth()) + ' ' + TODAY.getFullYear() };
}

/* How far ahead members may book. Saved straight away (it is not part of the page's Save changes step). */
export default function BookingWindow() {
  const g = useGym();
  const ranges = currentRanges();
  const [winPending, setWinPending] = useState('');
  const pickWindow = (m) => {
    setWinPending(m);
    g.run(() => g.changeWindow(m)).finally(() => setWinPending(''));
  };
  return (
    <div className="pcard period-box" id="booking-window">
      <h3>{T('a.window.title')}</h3>
      <p className="muted small">{T('a.window.sub')}</p>
      <div role="radiogroup" aria-label={T('a.window.title')}>
        {['ANY', 'WEEK', 'MONTH'].map((m) => (
          <label className="check period" key={m} htmlFor={'window-' + m.toLowerCase()}>
            <input type="radio" name="booking-window" id={'window-' + m.toLowerCase()} checked={(winPending || g.bookingWindow) === m} onChange={() => pickWindow(m)} />
            <span><b>{T('a.window.' + m)}</b> <span className="muted">{m === 'ANY' ? '' : '(' + ranges[m] + ')'}</span></span>
          </label>
        ))}
      </div>
    </div>
  );
}
