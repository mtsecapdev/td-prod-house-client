import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
// The API runs on its own port; the app calls it as /api on the same origin, so the session cookie is first-party.
// In production the web server in front of both does the same forwarding.
const api = {
  '/api': {
    target: process.env.API_TARGET || 'http://localhost:3000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: api },
  preview: { proxy: api },
});
