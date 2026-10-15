// Where the Spring Boot backend is running.
// Leave this commented out: the UI server forwards /api to the backend on 127.0.0.1:8080 (change with API_PROXY).
// Only set it to call a backend directly, e.g. when the UI is hosted somewhere else.
//
 window.FOUNDRY_API_BASE = 'http://localhost:8080';

// The config server supplies the name, currency, banner, footer and (unless set above) the backend address. The page
// does not talk to it directly: the UI server fetches them with a token it gets from the config server (see
// vite.config.js and the README: FOUNDRY_CONFIG_URL, CONFIG_CLIENT_ID, CONFIG_CLIENT_SECRET). Set this to '' to ignore
// the config server completely and use the built-in defaults.
//
 window.FOUNDRY_CONFIG_URL = 'http://localhost:8888';
