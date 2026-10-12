import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The UI runs on 5173 (the backend allows that origin by default). strictPort makes it fail loudly
// instead of silently moving to another port the backend would reject.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, host: true },
  preview: { port: 5173, strictPort: true, host: true },
});
