import { useEffect } from 'react';
import { I18N } from '../../i18n.js';
import { useGym } from '../../state.jsx';
import { cfg } from '../../remote.js';
import { Field, Input, NewTag, RemovedCard } from './fields.jsx';

const T = (k, p) => I18N.t(k, p);

/* Admin page 1: subscription plans */
export default function PlansPage() {
  const g = useGym();
  useEffect(() => { g.refreshFeatures(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const off = !g.features.unlimitedPlans;
  const wasUnlimited = (id) => { const b = g.basePlans.find((x) => x.id === id); return !!(b && b.unlimited); };
  return (
    <section aria-label={T('a.plans.aria')}>
      <div className="sec-h"><div><h2>{T('a.plans.title')}</h2><p className="sub">{T('a.plans.sub')}</p></div></div>
      {off && <p className="note" id="unlimited-off">{T('a.plans.unlimitedOff')}</p>}
      <div className="stack">
        {g.plans.length === 0 && <p className="muted">{T('a.plans.none')}</p>}
        {g.plans.map((p) => p.removed ? <RemovedCard key={p.id} kind="plan" o={p} onUndo={() => g.undoPlan(p.id)} /> : (
          <div key={p.id} className={'acard' + (p.isNew ? ' isnew' : '')}>
            {p.isNew && <NewTag />}
            <div className="fields">
              <Field label={T('a.plan.name')} id={'plan-name-' + p.id} wide>
                <Input id={'plan-name-' + p.id} type="text" spec="s" maxLength={40} value={p.name} onValid={(v) => g.editPlan(p.id, { name: v })} />
              </Field>
              <Field label={T('a.plan.price')} id={'plan-price-' + p.id}>
                <div className="prefix"><span>{cfg.currency}</span>
                  <Input id={'plan-price-' + p.id} type="number" spec={{ min: 0, cents: true }} min="0" step="0.01" inputMode="decimal" value={p.price} onValid={(v) => g.editPlan(p.id, { price: v })} />
                </div>
              </Field>
              <Field label={T('a.plan.visits')} id={'plan-visits-' + p.id}>
                <Input id={'plan-visits-' + p.id} type="number" spec={{ min: 0, int: true }} min="0" max="99" step="1" inputMode="numeric" value={p.visits} disabled={p.unlimited} onValid={(v) => g.editPlan(p.id, { visits: v })} />
              </Field>
              {g.features.multiGym && (
                <Field label={T('a.gym.validAt')} id={'plan-gym-' + p.id}>
                  <select id={'plan-gym-' + p.id} className="sel" value={String(p.gymId)} onChange={(e) => g.editPlan(p.id, { gymId: e.target.value })}>
                    <option value="">{T('a.gym.all')}</option>
                    {g.gyms.map((x) => <option key={x.id} value={String(x.id)}>{x.name}</option>)}
                  </select>
                </Field>
              )}
              <div className="plan-unlimited">
                <label className="check" htmlFor={'plan-unlimited-' + p.id}>
                  <input type="checkbox" id={'plan-unlimited-' + p.id} checked={!!p.unlimited} disabled={off && !wasUnlimited(p.id)} onChange={(e) => g.editPlan(p.id, { unlimited: e.target.checked })} /> {T('a.plan.unlimited')}
                </label>
              </div>
              <div className="field end"><button className="btn danger" id={'del-plan-' + p.id} onClick={() => g.removePlan(p.id)}>{T('a.remove')}</button></div>
            </div>
          </div>
        ))}
        <button className="btn ghost add" id="add-plan" onClick={g.addPlan}>{T('a.plans.add')}</button>
      </div>
    </section>
  );
}

