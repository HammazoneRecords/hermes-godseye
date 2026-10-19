import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import cesium from 'vite-plugin-cesium';

// Vite 7 + React 19 + Cesium 1.139.
// Port 5173 (per Phase 2 Cockpit Plan §5.4 — vanilla JS dashboard stays on :4173).
export default defineConfig({
  plugins: [react(), cesium()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Forward SSE / snapshot calls to the bridge so dev mode works against
      // the same backend as production.
      '/api': {
        target: 'http://127.0.0.1:8765',
        changeOrigin: true,
        ws: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    // Tell Cesium which asset base to use
    CESIUM_BASE_URL: JSON.stringify('/cesium/'),
  },
});
