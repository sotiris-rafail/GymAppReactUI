import { I18N } from '../i18n.js';
import { useGym, ADMIN_NAV_PAGES, adminUrl } from '../state.jsx';
import PlansPage from './admin/PlansPage.jsx';
import SchedulePage from './admin/SchedulePage.jsx';
import MembersPage from './admin/MembersPage.jsx';
import ClosedPage from './admin/ClosedPage.jsx';
import PromosPage from './admin/PromosPage.jsx';
import SaveBar from './admin/SaveBar.jsx';

const T = (k, p) => I18N.t(k, p);

/* The admin shell: a side bar with one address per page (/admin/plans, ...), the current page, and the save bar.
   Each page lives in ./admin/. Unsaved drafts are kept when moving between pages. */
const PAGES = { plans: PlansPage, schedule: SchedulePage, members: MembersPage, promos: PromosPage, closed: ClosedPage };

export default function AdminView() {
  const g = useGym();
  const Page = PAGES[g.page];
  const go = (url) => (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; // let "open in a new tab" work
    e.preventDefault();
    g.navigate(url);
  };
  return (
    <div className="admin">
      <nav className="sidenav" aria-label={T('a.nav')}>
        {ADMIN_NAV_PAGES.map((k) => {
          const dirty = g.dirtyCount(k) > 0;
          return (
            <a key={k} className={'sidelink' + (dirty ? ' dirty' : '')} id={'tab-' + k} href={adminUrl(k)} onClick={go(adminUrl(k))}
              aria-current={k === g.page ? 'page' : undefined} title={dirty ? T('a.unsaved') : undefined}>{T('a.nav.' + k)}</a>
          );
        })}
      </nav>
      <div className="admin-main">
        <div className="page"><Page /></div>
        {g.page !== 'closed' && <SaveBar />}
      </div>
    </div>
  );
}
