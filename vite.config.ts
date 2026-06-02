import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devPort = Number(process.env.VITE_PORT || 5173);
const proxyPort = Number(process.env.VITE_PROXY_PORT || 3000);

export default defineConfig({
  plugins: [react()],
  server: {
    port: devPort,
    proxy: {
      '/socket.io': {
        target: `http://localhost:${proxyPort}`,
        ws: true
      },
      '/api': `http://localhost:${proxyPort}`
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
