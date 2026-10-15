import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The UI runs on 5173. strictPort makes it fail loudly instead of silently moving to another port.
// Requests to /api are forwarded to the backend from this server, so the browser only ever talks to
// the UI's own address and the backend can stay on 127.0.0.1:8080 (not open to the internet).
// Set API_PROXY to forward somewhere else, e.g. API_PROXY=http://127.0.0.1:9090 npm start
const target = process.env.API_PROXY || 'http://127.0.0.1:8080';
const proxy = {
  '/api': {
    target,
    changeOrigin: true,
    // The request really comes from the UI server, so drop the browser's Origin (the backend's CORS check
    // would otherwise reject the EC2 address).
    configure: (p) => p.on('proxyReq', (req) => req.removeHeader('origin')),
  },
};

/* The UI's settings (name, currency, banner, footer) come from the config server, but only a verified application may
   read them. The browser is not one: anything it knows, every visitor knows. So this server, which can keep a secret,
   trades its client id and secret for a short-lived token, reads /config/ui with it, and hands the (non-secret)
   result to the page at /_config/ui. The browser never sees the client secret or the token.
   Settings: FOUNDRY_CONFIG_URL (default http://localhost:8888), CONFIG_CLIENT_ID (ui), CONFIG_CLIENT_SECRET (ui-secret). */
function configRelay() {
  const base = (process.env.FOUNDRY_CONFIG_URL || 'http://localhost:8888').replace(/\/+$/, '');
  const clientId = process.env.CONFIG_CLIENT_ID;
  const clientSecret = process.env.CONFIG_CLIENT_SECRET;
  let token = null;
  let expires = 0;

  async function getToken(force) {
    if (!force && token && Date.now() < expires - 30000) return token;
    const r = await fetch(base + '/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
      signal: AbortSignal.timeout(2500),
    });
    if (!r.ok) throw new Error('the config server refused the client id and secret (HTTP ' + r.status + ')');
    const j = await r.json();
    token = j.accessToken;
    expires = Date.now() + (Number(j.expiresIn) || 60) * 1000;
    return token;
  }

  async function read(search, force) {
    const t = await getToken(force);
    return fetch(base + '/config/ui' + search, {
      headers: { Accept: 'application/json', Authorization: 'Bearer ' + t },
      signal: AbortSignal.timeout(2500),
    });
  }

  async function handler(req, res, next) {
    if (req.method !== 'GET' || !req.url.startsWith('/_config/ui')) return next();
    const search = new URL(req.url, 'http://x').search;
    try {
      let r = await read(search, false);
      if (r.status === 401) r = await read(search, true); // the token may have ended or the server restarted
      if (!r.ok) throw new Error('the config server answered HTTP ' + r.status);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache');
      res.end(await r.text());
    } catch (e) {
      console.warn('[config] ' + e.message);
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'The config server is not available.' }));
    }
  }

  return {
    name: 'foundry-config-relay',
    configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); },
  };
}

export default defineConfig({
  plugins: [react(), configRelay()],
  server: { port: 5173, strictPort: true, host: true, proxy },
  preview: { port: 5173, strictPort: true, host: true, proxy },
});
