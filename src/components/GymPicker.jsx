import { I18N } from '../i18n.js';
import { useGym } from '../state.jsx';

const T = (k, p) => I18N.t(k, p);

/* Choose a gym. Only shown while several gyms are in use. Members only see gyms that take bookings. */
export default function GymPicker({ admin, inline }) {
  const g = useGym();
  const list = g.gyms.filter((x) => (admin ? x.status !== 'ARCHIVED' : x.status === 'ACTIVE' || x.id === g.gymId));
  if (!g.features.multiGym || list.length < 2) return null;
  return (
    <div className={'gympick' + (inline ? ' inline' : '')} role="group" aria-label={T('gym.pick')} id="gym-picker">
      <span className="gp-label">{T('gym.pick')}</span>
      {list.map((x) => (
        <button key={x.id} type="button" id={'gym-pick-' + x.id} className={'gp-btn' + (x.id === g.gymId ? ' on' : '')}
          aria-pressed={x.id === g.gymId} onClick={() => g.run(() => g.setGym(x.id))}>
          {x.name}{x.status === 'CLOSING' ? ' · ' + T('gym.status.CLOSING') : ''}
        </button>
      ))}
    </div>
  );
}
