import { I18N } from '../../i18n.js';
import { useGym } from '../../state.jsx';

const T = (k, p) => I18N.t(k, p);
const TN = (k, n, p) => I18N.tn(k, n, p);

export default function SaveBar() {
  const g = useGym();
  const n = g.dirtyCount(g.page);
  return (
    <div className="savebar" id="savebar">
      <span className={n ? '' : 'muted'} aria-live="polite">{n ? <b>{TN('a.savebar.n', n)}</b> : T('a.savebar.none')}</span>
      <span className="sbtns">
        <button className="btn ghost" id="discard-page" disabled={!n} onClick={g.discard}>{T('a.discard')}</button>
        <button className="btn" id="save-page" disabled={!n} onClick={g.openSave}>{T('a.save')}</button>
      </span>
    </div>
  );
}

