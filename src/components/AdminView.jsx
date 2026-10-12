import { I18N } from '../i18n.js';
import { useGym, ADMIN_PAGES } from '../state.jsx';
import PlansPage from './admin/PlansPage.jsx';
import SchedulePage from './admin/SchedulePage.jsx';
import MembersPage from './admin/MembersPage.jsx';
import SaveBar from './admin/SaveBar.jsx';

const T = (k, p) => I18N.t(k, p);

/* The admin shell: tabs, the current page, and the save bar. Each page lives in ./admin/. */
const PAGES = { plans: PlansPage, schedule: SchedulePage, members: MembersPage };

export default function AdminView() {
  const g = useGym();
  const Page = PAGES[g.page];
  return (
    <>
      <nav className="tabs" aria-label={T('a.nav')}>
        {ADMIN_PAGES.map((k) => {
          const dirty = g.dirtyCount(k) > 0;
          return <a key={k} className={'tab' + (dirty ? ' dirty' : '')} id={'tab-' + k} href={'#/' + k}
            aria-current={k === g.page ? 'page' : undefined} title={dirty ? T('a.unsaved') : undefined}>{T('a.nav.' + k)}</a>;
        })}
      </nav>
      <div className="page"><Page /></div>
      <SaveBar />
    </>
  );
}
