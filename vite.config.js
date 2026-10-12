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

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, host: true, proxy },
  preview: { port: 5173, strictPort: true, host: true, proxy },
});
