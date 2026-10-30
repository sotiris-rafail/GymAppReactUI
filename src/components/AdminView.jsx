import { useEffect, useState } from 'react';
import { I18N } from '../i18n.js';
import { useGym, ADMIN_NAV_PAGES, adminUrl } from '../state.jsx';
import PlansPage from './admin/PlansPage.jsx';
import SchedulePage from './admin/SchedulePage.jsx';
import MembersPage from './admin/MembersPage.jsx';
import ClosedPage from './admin/ClosedPage.jsx';
import PromosPage from './admin/PromosPage.jsx';
import MarketingPage from './admin/MarketingPage.jsx';
import AnalyticsPage from './admin/AnalyticsPage.jsx';
import GymsPage from './admin/GymsPage.jsx';
import GymPicker from './GymPicker.jsx';
import SaveBar from './admin/SaveBar.jsx';

const T = (k, p) => I18N.t(k, p);

/* The admin shell: a side bar with one address per page (/admin/plans, ...), the current page, and the save bar.
   Each page lives in ./admin/. Unsaved drafts are kept when moving between pages. */
const ICONS = {
  plans: 'M3 7h18v10H3zM3 11h18M7 15h3',
  schedule: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  members: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a2.5 2.5 0 100-5M18 14c2 .4 3 2.4 3 4',
  promos: 'M3 11l9-7 9 7M5 10v10h14V10',
  marketing: 'M4 10v4h3l8 4V6L7 10zM18 9a4 4 0 010 6',
  analytics: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  closed: 'M12 3a9 9 0 100 18 9 9 0 000-18zM5.6 5.6l12.8 12.8',
  gyms: 'M2 9v6M5 7v10M19 7v10M22 9v6M5 12h14',
};
const Icon = ({ k }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[k]} /></svg>
);
const PAGES = { plans: PlansPage, schedule: SchedulePage, members: MembersPage, promos: PromosPage, marketing: MarketingPage, analytics: AnalyticsPage, closed: ClosedPage, gyms: GymsPage };

export default function AdminView() {
  const g = useGym();
  const Page = PAGES[g.page];
  /* the menu is a narrow icon rail; the hamburger opens it with labels. The choice is kept on this device. */
  const [open, setOpen] = useState(() => { try { return localStorage.getItem('foundry.nav') === 'open'; } catch (e) { return false; } });
  const toggleNav = () => setOpen((o) => { const n = !o; try { localStorage.setItem('foundry.nav', n ? 'open' : 'closed'); } catch (e) { /* only a convenience */ } return n; });
  useEffect(() => { g.refreshFeatures(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (url) => (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; // let "open in a new tab" work
    e.preventDefault();
    g.navigate(url);
  };
  return (
    <div className={'admin' + (open ? '' : ' rail')}>
      <nav className="sidenav" aria-label={T('a.nav')}>
        <div className="sidehead">
          <button type="button" className="burger" id="nav-toggle" aria-expanded={open} aria-label={T(open ? 'a.nav.collapse' : 'a.nav.expand')} onClick={toggleNav}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
        {ADMIN_NAV_PAGES.filter((k) => (k !== 'analytics' || g.features.analytics) && (k !== 'promos' || g.features.home) && (k !== 'gyms' || g.features.multiGym || g.gymCount > 1 || g.page === 'gyms')).map((k) => {
          const dirty = g.dirtyCount(k) > 0;
          return (
            <a key={k} className={'sidelink' + (dirty ? ' dirty' : '')} id={'tab-' + k} href={adminUrl(k)} onClick={go(adminUrl(k))}
              aria-current={k === g.page ? 'page' : undefined} data-tip={T('a.nav.' + k) + (dirty ? ' · ' + T('a.unsaved') : '')}><Icon k={k} /><span className="lbl">{T('a.nav.' + k)}</span></a>
          );
        })}
      </nav>
      <div className="admin-main">
        {g.page !== 'gyms' && <GymPicker admin />}
        <div className="page"><Page /></div>
        {g.page !== 'closed' && g.page !== 'marketing' && g.page !== 'analytics' && g.page !== 'gyms' && <SaveBar />}
      </div>
    </div>
  );
}
