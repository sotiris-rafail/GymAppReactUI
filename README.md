# Foundry gym calendar: React UI

The browser UI for the gym calendar, built with React 18 and Vite. It is a separate project from the backend and
talks to it over HTTP.

    foundry-gym-ui-react/
      index.html           page shell (Vite entry)
      vite.config.js       dev server on port 5173
      public/config.js     where the backend lives (copied as-is into the build)
      src/main.jsx         starts React
      src/App.jsx          header, footer, toast and which screen to show
      src/state.jsx        all app state and actions (login, bookings, admin drafts, save)
      src/api.js           fetch wrapper and the backend's data shapes
      src/remote.js        reads the public settings from the config server
      src/drafts.js        "what changed" between saved data and the admin's draft
      src/i18n.js          English and Greek texts
      src/styles.css       all styling (themes, Material look)
      src/components/      Login, MemberView, Modal
      src/components/AdminView.jsx   admin shell: tabs, current page, save bar
      src/components/admin/          one component per admin page:
                                       PlansPage, SchedulePage, MembersPage
                                       plus SaveBar and fields.jsx (shared inputs)

## Run it

1. Start the backend (from the `foundry-gym-backend` folder):

        mvn spring-boot:run

   It listens on http://localhost:8080.

2. Start the UI (from this folder, Node 18 or newer):

        npm install
        npm start

   `npm install` is needed once. `npm start` starts the Vite dev server with hot reload. Use `npm start` or
   `npm run dev`; a bare `npm run` only lists the scripts. Open http://localhost:5173.

3. To serve a production build instead:

        npm run build      # writes dist/
        npm run preview    # serves dist/ on http://localhost:5173

   `dist/` is plain static files, so any web server can host it.

Demo logins (created by the backend on its first start):

| Login  | Email               | Password    |
|--------|---------------------|-------------|
| Admin  | admin@foundry.gym   | admin123    |
| Member | alex@demo.gym       | member123   |

If the backend is not running, the page says so and shows the address it tried.

## Plans are assigned by the admin

Members only see their plan (name, price, visits and usage); they cannot choose or change it. The admin assigns,
replaces or removes a plan for each member in the Members section. A member has one plan, or none, at a time.
The backend enforces this: members have no endpoint to change a plan.

## Admin pages

The admin screen has three pages, each with its own address so Back, reload and bookmarks work:

* `#/plans`: subscription plans (name, price, visits per month).
* `#/schedule`: classes (max people, days) and the weekly timetable.
* `#/members`: assign each member's plan, a **History** button per member (every plan they have held with dates, and
  visits used in each month), and **Class attendance** for the current month: every class with who is booked on which
  date (sessions that have already happened show as attended).

## Saving on the admin pages

Edits on the Plans, Schedule and Members pages are drafts. Nothing is sent to the server until the admin presses **Save changes** at the bottom of that page. A dialog then lists every change (new, changed, removed) with **Cancel** and **Save**. **Discard changes** throws the page's draft away. A dot on a tab marks a page with unsaved changes, drafts survive switching between pages, and the browser warns before leaving or logging out with unsaved changes.

Saving sends one request per change, so it is not atomic. If one fails, the dialog stays open with the reason, the changes that did succeed are kept, and the rest remain as the draft. Plans that are new and unsaved cannot be assigned to members until they are saved.

## Languages

The EN / ΕΛ switch in the top right changes the whole page between English and Greek. The choice is
remembered in the browser; the first visit follows the browser language (Greek browsers start in Greek).
All texts live in `i18n.js`. To add a language, copy the `en` block there under a new code and add it to `LANGS`.
Error messages from the backend arrive in English; the common ones are translated in the `server` table of
`i18n.js`, any other message is shown as received. Plan and class names are whatever the admin typed.

## Themes

The look follows Material Design 3 (tonal colors, rounded buttons and cards, outlined text fields, segmented buttons, filter chips, snackbar, Roboto from Google Fonts with a system fallback). There is a light theme (white, yellow fills, black text and outlines) and a dark theme (black, white text, yellow accents). The first visit follows the system setting; the sun/moon
button in the header switches and remembers the choice. The colors are variables at the top of `styles.css`.

## Settings from the config server

Before the page starts, the UI reads its public settings from the Foundry config server
(`GET http://<this host>:8888/public/config/ui`, no login) and waits at most about 2.5 seconds for it. The `ui`
application in the console controls:

| Setting | Effect |
|---|---|
| `brand.name` | name in the header and browser tab (default `Foundry`) |
| `currency.symbol` | symbol in front of prices (default `€`) |
| `banner.text` | notice shown above every page (empty = none) |
| `footer.text` | replaces the footer line (empty = default) |
| `api.base` | address of the gym backend |

If the config server is not running, the UI works with the built-in defaults above and the backend address from
`public/config.js`. An address set by hand in `config.js` (`FOUNDRY_API_BASE`) wins over `api.base`. Point the UI at a
different config server with `window.FOUNDRY_CONFIG_URL`, or set it to `''` to ignore it. Changes in the console show up
the next time the page loads.

Because the browser calls the API with a login cookie, open the UI and the API on the same host name (`localhost` with
`localhost`). If `api.base` says `localhost` but you open the UI at `127.0.0.1`, the login will not stick.

## Changing addresses

By default the page calls its own address, and the UI server (`npm start`, `npm run dev`) forwards everything under
`/api` to the backend at `http://127.0.0.1:8080`. The backend can therefore stay private on the same machine (for
example on EC2: only port 5173 is open, 8080 is not). No CORS setting or cookie workaround is needed.

- Backend on another port or machine: `API_PROXY=http://127.0.0.1:9090 npm start`
- Call a backend directly instead (UI hosted elsewhere): uncomment `window.FOUNDRY_API_BASE = 'http://...'` in
  `public/config.js` (or `dist/config.js` after a build, no rebuild needed). The backend must then allow the UI's address
  in `GYM_CORS_ORIGINS`, and the UI and API should share a host name so the login cookie sticks.
- A `localhost` value of `api.base` from the config server is ignored when the page is opened from another host,
  because there `localhost` would mean the visitor's own computer.

## How the connection works

Every call goes to the backend with `credentials: 'include'`, so the login session cookie travels with it. The UI keeps
no data of its own: plans, classes, bookings and members all live in the backend database.
