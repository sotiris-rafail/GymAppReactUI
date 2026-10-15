import { I18N } from '../i18n.js';
import { useGym } from '../state.jsx';
import { cfg } from '../remote.js';
import PromoBoard from './PromoBoard.jsx';
import { isLive } from '../util.js';

const T = (k, p) => I18N.t(k, p);

/* The public home page: what visitors see before they log in. */
export default function Home() {
  const g = useGym();
  const items = g.basePromos.filter(isLive);
  return (
    <div className="page home">
      <section className="hero" aria-label={cfg.brand}>
        <h1>{T('home.title')}</h1>
        <p className="sub">{T('home.sub')}</p>
      </section>
      <section aria-label={T('promo.news')}>
        <PromoBoard items={items} empty={T('home.empty')} />
      </section>
    </div>
  );
}
