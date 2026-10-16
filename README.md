# Foundry gym calendar: React UI

The browser UI for the gym calendar, built with React 18 and Vite. It is a separate project from the backend and
talks to it over HTTP.

    foundry-gym-ui-react/
      index.html           page shell (Vite entry)
      vite.config.js       dev server on port 5173; reads .env and serves /config.js from it
      .env.example         ALL settings of the UI: copy to .env (there is no config.js)
      src/main.jsx         starts React
      src/App.jsx          header, footer, toast and which screen to show
      src/state.jsx        all app state and actions (login, bookings, admin drafts, save)
      src/api.js           fetch wrapper and the backend's data shapes
      src/remote.js        reads the settings from this server's /_config/ui
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

The admin screen has a side bar with five pages, each with its own path so Back, reload and bookmarks work
(`/admin` alone goes to `/admin/plans`; members who open an admin path are sent to `/`; visitors who are not logged
in get the login form and land on the page they asked for):

* `/admin/plans`: subscription plans (name, price, visits per month).
* `/admin/schedule`: classes (max people, days) and the timetable, which can be shown by **Week** or **Month** (previous/next/today buttons; closed days are marked; the choice is remembered in the browser).
* `/admin/members`: assign each member's plan, a **History** button per member (every plan they have held with dates, and
  visits used in each month), and **Class attendance** for the current month: every class with who is booked on which
  date (sessions that have already happened show as attended).
* `/admin/home`: the home page items (photos, Instagram posts, offers and announcement cards).
* `/admin/closed`: days with no classes, and closing a whole week or month (see below).

When the site is served by a static host, the host must return `index.html` for unknown paths such as `/admin/plans`
(`vite dev` and `vite preview` already do).

## Closed days

Sundays are always closed: the calendar shows them struck out, no classes are offered and the Sunday chip is disabled
when editing a class. On `/admin/closed` the admin can also close any other date (holiday, maintenance) with an optional
reason, and open it again. This page saves immediately (no **Save changes** step). Members see closed days hatched on the
calendar with the reason, and the backend refuses to book them. Bookings that already exist on a date that is closed later are kept.

## Saving on the admin pages

Edits on the Plans, Schedule, Members and Home page pages are drafts. Nothing is sent to the server until the admin presses **Save changes** at the bottom of that page. A dialog then lists every change (new, changed, removed) with **Cancel** and **Save**. **Discard changes** throws the page's draft away. A dot next to a side bar link marks a page with unsaved changes, drafts survive switching between pages, and the browser warns before leaving or logging out with unsaved changes.

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

Only a verified application may read settings from the config server, and a browser cannot be one (whatever it knows,
every visitor knows). So the **UI server** (the process started by `npm start` / `npm run dev`) does it:

1. it trades its client id and secret for a short-lived token (`POST /auth/token` on the config server),
2. it reads `GET /config/ui` with `Authorization: Bearer <token>`,
3. it hands the result to the page at `/_config/ui`. The page, which waits at most about 2.5 seconds for it, never sees
   the client secret or the token.

Set these where the UI server runs (defaults in brackets):

    FOUNDRY_CONFIG_URL=http://localhost:8888      (address of the config server)
    CONFIG_CLIENT_ID=ui  CONFIG_CLIENT_SECRET=ui-secret     (must match a client in the config server's cfg.clients)

All of the UI's settings are in one file named `.env` next to `package.json` (copy `.env.example`). There is no
`config.js`: the UI server reads `.env` and answers the page's `/config.js` request itself with the two non-secret page
settings, so the client secret never reaches a browser. Order of precedence: real environment variables, then `.env`,
then the built-in defaults. Restart the UI server after editing `.env`. The settings are `FOUNDRY_CONFIG_URL`,
`CONFIG_CLIENT_ID`, `CONFIG_CLIENT_SECRET`, `API_PROXY`, `FOUNDRY_API_BASE` and `FOUNDRY_CONFIG_ENABLED`. Because the
settings are read by the UI server, run the UI with `npm start` or `npm run preview`; a build served as plain static files
has no server to read `.env` and uses the defaults.
For example: `CONFIG_CLIENT_SECRET=... npm start`. If this is wrong or the config server is down the page still loads with
the built-in defaults, and the UI server prints a `[config]` warning. A UI that is only served as static files (no UI
server) cannot read settings and always uses the defaults. The `ui` settings are the ones the config server marks
non-secret; they are public by nature, so never put a secret in the `ui` application. The settings are:

| Setting | Effect |
|---|---|
| `brand.name` | name in the header and browser tab (default `Gym`, also used when the setting is empty or the config server is not running). It is used in the header, the browser tab, the welcome heading and the connection messages |
| `currency.symbol` | symbol in front of prices (default `€`) |
| `banner.text` | notice shown above every page (empty = none) |
| `footer.text` | replaces the footer line (empty = default) |
| `api.base` | address of the gym backend |

If the config server is not running, the UI works with the built-in defaults above and the backend address from
`FOUNDRY_API_BASE` from `.env`. An address set by hand there wins over `api.base`. Set
`FOUNDRY_CONFIG_ENABLED=false` in `.env` to ignore the config server. Changes in the console show up
the next time the page loads.

Because the browser calls the API with a login cookie, open the UI and the API on the same host name (`localhost` with
`localhost`). If `api.base` says `localhost` but you open the UI at `127.0.0.1`, the login will not stick.

## Changing addresses

By default the page calls its own address, and the UI server (`npm start`, `npm run dev`) forwards everything under
`/api` to the backend at `http://127.0.0.1:8080`. The backend can therefore stay private on the same machine (for
example on EC2: only port 5173 is open, 8080 is not). No CORS setting or cookie workaround is needed.

- Backend on another port or machine: `API_PROXY=http://127.0.0.1:9090 npm start`
- Call a backend directly instead (UI hosted elsewhere): set `FOUNDRY_API_BASE=http://...` in `.env` and restart the UI
  server. The backend must then allow the UI's address in `GYM_CORS_ORIGINS`, and the UI and API should share a host name so the login cookie sticks.
- A `localhost` value of `api.base` from the config server is ignored when the page is opened from another host,
  because there `localhost` would mean the visitor's own computer.

## How the connection works

Every call goes to the backend with `credentials: 'include'`, so the login session cookie travels with it. The UI keeps
no data of its own: plans, classes, bookings and members all live in the backend database.

## Home page and admin "Home page" items

Visitors who are not logged in see a home page with the items the admin manages (photos, Instagram posts and offers).
A "Log in / Sign up" button in the top bar (just before the theme switch) opens the login and sign up form as an overlay on top of the home page (close it with Cancel, Escape or a click outside; there is no dimmed backdrop); logging out returns to the home page. Logged-in
members see the same items under "News and offers" at the bottom of their page.

The admin edits them on the fourth admin page, "Home page", with the same save button and confirm dialog as the other
pages. Each item has a type, title, text, optional link, optional photo (upload, shrunk in the browser, or a web
address), a "Show on the home page" switch and up/down buttons for the order. Instagram does not allow other sites to
show a post photo directly, so for an Instagram item upload the photo and paste the post link.
The backend needs the new `promo` table (Liquibase applies it on start-up) and the `/api/promos` endpoints, so deploy
the new `foundry-gym-backend.zip` together with this UI.

The home page is laid out as a bento grid: tiles of different sizes (every sixth tile is large, every third a wide one,
by position in the list, so the order you set decides the layout). Each tile has a "Draw a border around it" switch;
tiles without a border get a soft filled background instead.

Tiles do not show their type (Photo, Instagram, Offer); the type only decides the link button text. Each tile also has a
"Show the title" switch. A hidden title is still used as the photo's description for screen readers.

## Profile page (/profile)

Logged-in members (and the admin) have a "Profile" link in the top bar that opens `/profile`: name, email, account type
and current plan, read only, plus a form to change the password (current password, new password, repeat). Nothing else
can be changed by the person: the name and email are fixed and the plan is assigned by the admin. Opening `/profile`
while logged out shows the login overlay first and lands on the profile afterwards. The page needs the backend's
`PUT /api/auth/password`, so deploy the new `foundry-gym-backend.zip` with it. The UI server answers `/profile` with the
app (a single-page app), so reloading on that address works with `npm start` / `npm run dev`; a static host must be set
up to serve `index.html` for unknown paths.


## Announcement cards

On `/admin/home`, choose the type **Announcement card** for an item. It has a photo, a title, a short description and a
card text that may contain simple HTML. On the home page the photo fills the card (cropped), the card lifts with a shadow
on hover (or keyboard focus), and clicking or pressing Enter opens it: the whole photo (not cropped), title, description
and the HTML text. Esc, the Close button or a click outside closes it. The HTML is cleaned with DOMPurify before it is
shown (scripts, styles, forms, frames and event handlers are removed; links open in a new tab). Run `npm install` after
updating, since DOMPurify is a new dependency.

## Preferences (profile page)

Members see a **Preferences** section on `/profile` with four switches, all off by default and saved as soon as they are
turned on or off: marketing emails, new plans, plan almost used up (2 visits remain this month) and a visits-left reminder
(after the 21st of the month, if visits are still left). Admins do not see the section. The app only stores the choices;
sending the emails is a separate job that has to read them from the backend (`/api/me/preferences`).

## Photos from a web address

Pictures are requested without a Referer header (many sites refuse to show their images to pages on other addresses), and
a picture that cannot be loaded shows a "Photo unavailable" box. On the home page admin page a red message explains what
to do. The address must be the direct address of an image file, not a web page (for example an Instagram post or Google
Images page). If the site still blocks it, download the picture and upload it instead.

## Instagram posts

For an item of type **Instagram**, paste the address of a public post or reel from the gym's profile (for example
`https://www.instagram.com/p/AbC123/` or `https://www.instagram.com/reel/AbC123/`) into the link field. Visitors then see
the post itself, using Instagram's own embed (photos, carousels, and videos that play on the page), sized to fit, with a
**View on Instagram** button under it. Without such an address the item stays a simple tile (photo, text, link). The embed
loads from instagram.com, so visitors' browsers contact Instagram and an ad blocker may hide it. The post must be public.

## Tile size and date limit (home page items)

Every item on `/admin/home` has a **Size** (width 1 to 4 columns, height 1 to 3 rows, or automatic) and an optional
**Hide on** date. From that date on the item is no longer shown on the home page (the backend stops returning it too),
so "hide on today + 7 days" means it shows for exactly 7 days. The buttons **3 days**, **1 week** and **1 month** fill in
the date. Expired items stay in the admin list (marked as expired) so they can be given a new date. On small screens the
width is capped to the columns that fit; Instagram posts keep the height of the post.

## Number sizes and backgrounds (home page items)

The tile **Size** is typed as numbers: width 1 to 4 columns and height 1 to 8 rows (values outside the range snap to the
nearest one; leave a box empty for automatic). Each item can also have a **Background colour** (colour picker or `#rrggbb`;
the text turns black or white to stay readable) and a **Background picture** behind the whole tile (upload or web address;
a dark fade keeps the text readable). The photo at the top of a tile and the background picture are independent.

## Closing the current week or month

At the top of `/admin/closed` two check boxes, **Close the current week** (Monday to Sunday) and **Close the current month**,
stop members booking any class in that period. They save immediately, show the period they apply to, and un-ticking one opens
bookings again. Members see those days as closed on their calendar. Bookings that already exist are kept. The period is
fixed when you tick the box (it does not roll over): next week or month starts open.

## Booking window

At the top of `/admin/schedule` (the Schedule page) the admin picks how far ahead members may book: **any day** (the normal booking limit, the
default), **current week only** (Monday to Sunday) or **current month only**. It saves immediately (it is not part of the page's Save changes) and the page shows the
dates each option covers. Members see days outside the window as unavailable on their calendar, with an explanation, and the
backend refuses to book them. The window is relative to today, so it moves on by itself when the week or month changes.

## Link tiles

On the Home page admin page, the type **Link tile** adds a tile that is one big link. Give it a link (required; the editor
warns while it is empty and the backend answers 400) and a background colour and/or background picture. The title and text
are optional and sit on the background; the tile lifts with a shadow on hover and opens the link in a new tab. Width,
height, date limit and the other options work as for any item.

## Tile grid

The home page grid has 4 equal columns on desktop and tablet (windows 560 px wide or more) and 2 columns on phones.
A row is one square cell high, so a 1×1 tile is a true square and a 2×2 tile is a larger square. Four 1×1 tiles fill one
row; two 2×2 tiles fill the next two rows side by side. On a phone the 1×1 tiles pair up and a 2×2 tile is full width.
Items left on automatic size keep the automatic layout (phones: full width).

## Unlimited plans

On the Plans admin page each plan has an **Unlimited visits** tick box. Ticked, the Visits per month field is greyed out
and the plan has no visit limit. Members on it see "Unlimited visits" on their plan, a monthly counter without a bar or a
"left" figure, and are never blocked by "No visits left". The Members page and a member's history show "N visits,
unlimited". Plans that were already there stay limited. A member's history keeps the plan as it was when it was assigned,
so ticking the box on a plan someone already holds does not rewrite their past (assign the plan again to record it).
