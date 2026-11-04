import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api y /ws se redirigen al backend local (robot-backend en :4100).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4100',
      '/ws': { target: 'ws://localhost:4100', ws: true },
    },
  },
});
